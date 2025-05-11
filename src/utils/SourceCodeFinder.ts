/**
 * Finds source code related to issues in logs
 */
import fs from 'fs-extra';
import path from 'path';
import { Issue } from '../models/Issue';

export interface SourceFinderConfig {
    sourceRoots: string[];
    fileExtensions?: string[];
}

export interface SourceInfo {
    file: string;
    lineNumber?: number;
    codeSnippet?: string;
    fullContent?: string;
    matchedKeywords?: string[];
}

export class SourceCodeFinder {
    private sourceRoots: string[];
    private fileExtensions: string[];

    /**
     * Create a new SourceCodeFinder
     * @param {SourceFinderConfig} config - Source finder configuration
     */
    constructor(config: SourceFinderConfig) {
        this.sourceRoots = config.sourceRoots || [];
        this.fileExtensions = config.fileExtensions || ['.js', '.ts', '.jsx', '.tsx', '.java', '.py', '.c', '.cpp', '.cs'];
    }

    /**
     * Find source code based on stack trace
     * @param {string} stackTrace - Stack trace from the log
     * @returns {Promise<SourceInfo[] | null>} Source code information
     */
    async findSourceForStackTrace(stackTrace: string[]): Promise<SourceInfo[] | null> {
        if (!stackTrace || stackTrace.length === 0) {
            return null;
        }

        const sourceInfo: SourceInfo[] = [];

        // Process each line in the stack trace array
        for (const stackLine of stackTrace) {
            // Skip empty lines
            if (!stackLine || stackLine.trim() === '') {
                continue;
            }

            // Extract file paths and line numbers from stack trace line
            const fileMatches = stackLine.match(/\(([^:]+):(\d+):(\d+)\)/g) || [];
            
            // If no matches in this format, try another common stack trace format
            if (fileMatches.length === 0) {
                const altMatches = stackLine.match(/at\s+([\w$.]+)\s+\((.+?):(\d+):(\d+)\)/g) || [];
                for (const altMatch of altMatches) {
                    const parts = altMatch.match(/at\s+([\w$.]+)\s+\((.+?):(\d+):(\d+)\)/);
                    if (parts && parts.length >= 5) {
                        const functionName = parts[1];
                        const filePath = parts[2];
                        const lineNumber = parseInt(parts[3], 10);
                        
                        // Try to find the file in source roots
                        const sourceFile = await this.findFile(filePath);
                        if (sourceFile) {
                            try {
                                const content = await fs.readFile(sourceFile, 'utf8');
                                const lines = content.split('\n');
                                
                                // Get context around the line
                                const startLine = Math.max(0, lineNumber - 5);
                                const endLine = Math.min(lines.length - 1, lineNumber + 5);
                                const codeSnippet = lines.slice(startLine, endLine + 1).join('\n');
                                
                                sourceInfo.push({
                                    file: sourceFile,
                                    lineNumber,
                                    codeSnippet,
                                    fullContent: content,
                                    matchedKeywords: [functionName]
                                });
                            } catch (error) {
                                console.error(`Error reading source file ${sourceFile}:`, error);
                            }
                        }
                    }
                }
            }
            
            // Process standard format matches
            for (const match of fileMatches) {
                const parts = match.match(/\(([^:]+):(\d+):(\d+)\)/);
                if (parts && parts.length >= 4) {
                    const filePath = parts[1];
                    const lineNumber = parseInt(parts[2], 10);
                    
                    // Try to find the file in source roots
                    const sourceFile = await this.findFile(filePath);
                    if (sourceFile) {
                        try {
                            const content = await fs.readFile(sourceFile, 'utf8');
                            const lines = content.split('\n');
                            
                            // Get context around the line
                            const startLine = Math.max(0, lineNumber - 5);
                            const endLine = Math.min(lines.length - 1, lineNumber + 5);
                            const codeSnippet = lines.slice(startLine, endLine + 1).join('\n');
                            
                            sourceInfo.push({
                                file: sourceFile,
                                lineNumber,
                                codeSnippet,
                                fullContent: content
                            });
                        } catch (error) {
                            console.error(`Error reading source file ${sourceFile}:`, error);
                        }
                    }
                }
            }
        }

        return sourceInfo.length > 0 ? sourceInfo : null;
    }

    /**
     * Find relevant code for an issue
     * @param {Issue} issue - The issue to find code for
     * @returns {Promise<SourceInfo[] | null>} Source code information
     */
    async findRelevantCode(issue: Issue): Promise<SourceInfo[] | null> {
        // First try stack trace if available
        if (issue.stackTrace && issue.stackTrace.length > 0) {
            const stackTraceSource = await this.findSourceForStackTrace(issue.stackTrace);
            if (stackTraceSource) {
                return stackTraceSource;
            }
        }

        // If no stack trace or no source found, try to find by keywords in the message
        const keywords = issue.message ? this.extractKeywords(issue.message) : [];
        if (keywords.length > 0) {
            return await this.findFilesByKeywords(keywords);
        }

        return null;
    }

    /**
     * Find a source file based on a path from a stack trace
     * @param {string} filePath - Path from stack trace
     * @returns {Promise<string|null>} Full path to the source file or null if not found
     */
    async findFile(filePath: string): Promise<string | null> {
        // If it's an absolute path and exists, return it
        if (path.isAbsolute(filePath) && await this.fileExists(filePath)) {
            return filePath;
        }

        // Try to find in source roots
        const fileName = path.basename(filePath);
        
        for (const root of this.sourceRoots) {
            // Try direct match first
            const directPath = path.join(root, filePath);
            if (await this.fileExists(directPath)) {
                return directPath;
            }

            // Try to find by filename
            const foundPath = await this.findFileInDirectory(root, fileName);
            if (foundPath) {
                return foundPath;
            }
        }

        return null;
    }

    /**
     * Check if a file exists
     * @param {string} filePath - Path to check
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            const stats = await fs.stat(filePath);
            return stats.isFile();
        } catch (error) {
            return false;
        }
    }

    /**
     * Find a file in a directory by name
     * @param {string} directory - Directory to search
     * @param {string} fileName - File name to find
     * @returns {Promise<string|null>} Full path to the file or null if not found
     */
    async findFileInDirectory(directory: string, fileName: string): Promise<string | null> {
        try {
            const files = await fs.readdir(directory, { withFileTypes: true });
            
            for (const file of files) {
                const fullPath = path.join(directory, file.name);
                
                if (file.isDirectory()) {
                    const found = await this.findFileInDirectory(fullPath, fileName);
                    if (found) {
                        return found;
                    }
                } else if (file.name === fileName) {
                    return fullPath;
                }
            }
        } catch (error) {
            console.error(`Error searching directory ${directory}:`, error);
        }
        
        return null;
    }

    /**
     * Extract keywords from an issue message
     * @param {string} message - Issue message
     * @returns {string[]} List of keywords
     */
    extractKeywords(message: string): string[] {
        // Remove common words and punctuation
        const cleaned = message.replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .toLowerCase();
        
        const words = cleaned.split(' ');
        
        // Filter out common words and short words
        const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of'];
        return words.filter(word => 
            word.length > 3 && !commonWords.includes(word)
        );
    }

    /**
     * Find files by keywords
     * @param {string[]} keywords - Keywords to search for
     * @returns {Promise<SourceInfo[]>} List of source information
     */
    async findFilesByKeywords(keywords: string[]): Promise<SourceInfo[]> {
        const results: SourceInfo[] = [];
        
        for (const root of this.sourceRoots) {
            await this.searchDirectoryForKeywords(root, keywords, results);
        }
        
        return results.length > 0 ? results : [];
    }

    /**
     * Search a directory for files containing keywords
     * @param {string} directory - Directory to search
     * @param {string[]} keywords - Keywords to search for
     * @param {SourceInfo[]} results - Results array to populate
     * @returns {Promise<void>}
     */
    async searchDirectoryForKeywords(directory: string, keywords: string[], results: SourceInfo[]): Promise<void> {
        try {
            const files = await fs.readdir(directory, { withFileTypes: true });
            
            for (const file of files) {
                const fullPath = path.join(directory, file.name);
                
                if (file.isDirectory()) {
                    await this.searchDirectoryForKeywords(fullPath, keywords, results);
                } else {
                    const ext = path.extname(file.name);
                    if (this.fileExtensions.includes(ext)) {
                        try {
                            const content = await fs.readFile(fullPath, 'utf8');
                            
                            // Check if any keyword is in the content
                            const matchedKeywords = keywords.filter(keyword => 
                                content.toLowerCase().includes(keyword.toLowerCase())
                            );
                            
                            if (matchedKeywords.length > 0) {
                                results.push({
                                    file: fullPath,
                                    matchedKeywords,
                                    fullContent: content
                                });
                                
                                // Limit the number of results
                                if (results.length >= 5) {
                                    return;
                                }
                            }
                        } catch (error) {
                            console.error(`Error reading file ${fullPath}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error searching directory ${directory}:`, error);
        }
    }
}
