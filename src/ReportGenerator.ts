/**
 * Generates HTML reports for issues and solutions
 */
import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import { Issue } from './models/Issue';
import { Solution } from './models/Solution';
import { ReportSummary } from './models/ReportSummary';
import { ReportConfig } from './utils/ConfigManager';

interface IssueWithSolution {
    issue: Issue;
    solution: Solution | null;
}

export class ReportGenerator {
    private templatePath: string;
    private outputDir: string;

    /**
     * Create a new ReportGenerator
     * @param {ReportConfig} config - Report generator configuration
     */
    constructor(config: ReportConfig) {
        this.templatePath = config.templatePath;
        this.outputDir = config.outputDir;
    }
    
    /**
     * Generate a report for issues and solutions
     * @param {Issue[]} issues - List of issues
     * @param {Solution[]} solutions - List of solutions
     * @returns {Promise<string>} Path to the generated report
     */
    async generateReport(issues: Issue[], solutions: Solution[]): Promise<string> {
        try {
            // Create output directory if it doesn't exist
            await fs.ensureDir(this.outputDir);
            
            // Generate report summary
            const summary = this.generateSummary(issues, solutions);
            
            // Map solutions to issues
            const issuesWithSolutions: IssueWithSolution[] = issues.map(issue => {
                const solution = solutions.find(s => issue.id && s.issueId === issue.id) || null;
                return { issue, solution };
            });
            
            // Check if template exists, if not use default
            let templateContent: string;
            try {
                templateContent = await fs.readFile(this.templatePath, 'utf8');
            } catch (error) {
                console.warn(`Template not found at ${this.templatePath}, using default template.`);
                templateContent = this.getDefaultTemplate();
            }
            
            // Render template
            const reportHtml = ejs.render(templateContent, {
                title: 'Log Analysis Report',
                timestamp: new Date().toISOString(),
                summary: summary.toJSON(),
                issues: issuesWithSolutions
            });
            
            // Write report to file
            const reportPath = path.join(this.outputDir, `report-${Date.now()}.html`);
            await fs.writeFile(reportPath, reportHtml, 'utf8');
            
            return reportPath;
        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }
    
    /**
     * Generate a summary of issues and solutions
     * @param {Issue[]} issues - List of issues
     * @param {Solution[]} solutions - List of solutions
     * @returns {ReportSummary} Report summary
     */
    generateSummary(issues: Issue[], solutions: Solution[]): ReportSummary {
        const summary = new ReportSummary();
        summary.addStatistics(issues, solutions);
        return summary;
    }
    
    /**
     * Get default HTML template for reports
     * @returns {string} Default template content
     */
    getDefaultTemplate(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .summary {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .summary-item {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #3498db;
        }
        .issue {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .issue-header {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .issue-type {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .error { background-color: #f8d7da; color: #721c24; }
        .warning { background-color: #fff3cd; color: #856404; }
        .info { background-color: #d1ecf1; color: #0c5460; }
        .solution {
            background-color: #f0fff4;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
            border-left: 4px solid #2ecc71;
        }
        .code {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: monospace;
            white-space: pre;
            margin: 15px 0;
            border: 1px solid #eee;
        }
        .confidence {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            background-color: #e9ecef;
            color: #495057;
        }
        .references {
            margin-top: 15px;
            font-size: 0.9em;
        }
        .references ul {
            padding-left: 20px;
        }
        .stack-trace {
            font-family: monospace;
            white-space: pre-wrap;
            font-size: 0.9em;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            border: 1px solid #eee;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1><%= title %></h1>
        <p>Generated on <%= new Date(timestamp).toLocaleString() %></p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <h3>Total Issues</h3>
                <p><%= summary.totalIssues %></p>
            </div>
            <div class="summary-item">
                <h3>Resolved Issues</h3>
                <p><%= summary.resolvedIssues %></p>
            </div>
        </div>

        <h3>Issues by Type</h3>
        <div class="summary-grid">
            <% Object.entries(summary.issuesByType).forEach(([type, count]) => { %>
                <div class="summary-item">
                    <h4><%= type %></h4>
                    <p><%= count %></p>
                </div>
            <% }); %>
        </div>

        <h3>Issues by Severity</h3>
        <div class="summary-grid">
            <% Object.entries(summary.issuesBySeverity).forEach(([severity, count]) => { %>
                <div class="summary-item">
                    <h4><%= severity %></h4>
                    <p><%= count %></p>
                </div>
            <% }); %>
        </div>
    </div>

    <h2>Issues and Solutions</h2>
    
    <% issues.forEach(({issue, solution}) => { %>
        <div class="issue">
            <div class="issue-header">
                <h3><%= issue.message.substring(0, 100) %><%= issue.message.length > 100 ? '...' : '' %></h3>
                <span class="issue-type <%= issue.type %>"><%= issue.type %></span>
            </div>
            
            <p><strong>Severity:</strong> <%= issue.severity %></p>
            <p><strong>Source:</strong> <%= issue.source %><%= issue.lineNumber ? ':' + issue.lineNumber : '' %></p>
            <p><strong>Timestamp:</strong> <%= new Date(issue.timestamp).toLocaleString() %></p>
            
            <% if (issue.stackTrace) { %>
                <div>
                    <strong>Stack Trace:</strong>
                    <div class="stack-trace"><%= issue.stackTrace %></div>
                </div>
            <% } %>
            
            <% if (solution) { %>
                <div class="solution">
                    <h4>Solution <span class="confidence">Confidence: <%= Math.round(solution.confidence * 100) %>%</span></h4>
                    <p><%= solution.recommendation %></p>
                    
                    <% if (solution.codeSnippet) { %>
                        <div class="code"><%= solution.codeSnippet %></div>
                    <% } %>
                    
                    <% if (solution.references && solution.references.length > 0) { %>
                        <div class="references">
                            <strong>References:</strong>
                            <ul>
                                <% solution.references.forEach(ref => { %>
                                    <li><%= ref %></li>
                                <% }); %>
                            </ul>
                        </div>
                    <% } %>
                </div>
            <% } else { %>
                <div class="solution">
                    <h4>No solution available</h4>
                </div>
            <% } %>
        </div>
    <% }); %>
</body>
</html>`;
    }
}
