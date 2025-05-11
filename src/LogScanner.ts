/**
 * Scans log files to identify issues
 */
import fs from 'fs-extra';
import path from 'path';
import { Issue, EIssueType } from './models/Issue';
import { ScannerConfig } from './utils/ConfigManager';
import { EIssueDetectorState, IIssueDetector, PuertsExceptionDetector } from './issue_detecter/IssueDetector';

export class LogScanner {

    private issueDetectors: IIssueDetector[];
    private activatedIssueDetector: IIssueDetector | null;

    /**
     * Create a new LogScanner
     * @param {ScannerConfig} config - Scanner configuration
     */
    constructor(config: ScannerConfig) {

        this.issueDetectors = [
            new PuertsExceptionDetector()
        ]
        this.activatedIssueDetector = null;
    }

    /**
     * Scan a log file for issues
     * @param {string} filePath - Path to the log file
     * @returns {Promise<Issue[]>} List of identified issues
     */
    async scanLogFile(filePath: string): Promise<Issue[]> {
        try {
            // Normalize the file path to handle Windows paths properly
            const normalizedPath = path.normalize(filePath);
            console.log(`Reading file: ${normalizedPath}`);

            // Check if file exists before trying to read it
            if (!await fs.pathExists(normalizedPath)) {
                console.error(`File does not exist: ${normalizedPath}`);
                return [];
            }

            // Read file content
            const content = await fs.readFile(normalizedPath, 'utf8');
            const issues = this.scanLogContent(content);

            // Add source file information
            issues.forEach(issue => {
                if (issue) {
                    issue.source = normalizedPath;
                }
            });

            return issues;
        } catch (error) {
            console.error(`Error scanning log file ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Scan a directory of log files
     * @param {string} dirPath - Path to the directory
     * @returns {Promise<Issue[]>} List of identified issues
     */
    async scanLogDirectory(dirPath: string): Promise<Issue[]> {
        try {
            const files = await fs.readdir(dirPath);
            const logFiles = files.filter(file => file.endsWith('.log'));

            const allIssues: Issue[] = [];
            for (const file of logFiles) {
                const filePath = path.join(dirPath, file);
                const issues = await this.scanLogFile(filePath);
                allIssues.push(...issues);
            }

            return allIssues;
        } catch (error) {
            console.error(`Error scanning log directory ${dirPath}:`, error);
            return [];
        }
    }

    /**
     * Scan log content for issues
     * @param {string} content - Log content to scan
     * @returns {Issue[]} List of identified issues
     */
    scanLogContent(content: string): Issue[] {
        const lines = content.split('\n');
        const issues: Issue[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (this.activatedIssueDetector) {

                const state = this.activatedIssueDetector.receiveLine(line);

                switch (state) {
                    case EIssueDetectorState.Activated: {
                        continue;
                    }
                    case EIssueDetectorState.Finished: {
                        const issue = this.activatedIssueDetector!.pickIssue();
                        issues.push(issue);
                        this.activatedIssueDetector = null;

                        i--;
                        continue;
                    }
                }
            }
            else {
                for (const detector of this.issueDetectors) {
                    const state = detector.receiveLine(line);

                    if (state === EIssueDetectorState.Activated) {
                        if (this.activatedIssueDetector != null) {
                            console.error("activatedIssueDetector should be null!")
                        }
                        this.activatedIssueDetector = detector;
                        // console.log(`selected detector:${detector.constructor.name}`);
                        break;
                    }
                }
                
            }

        }

        return issues;
    }



}
