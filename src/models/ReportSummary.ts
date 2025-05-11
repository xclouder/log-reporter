/**
 * Represents a summary of issues and solutions for reporting
 */
import { Issue, EIssueType } from './Issue';
import { Solution } from './Solution';

export interface ReportSummaryData {
    totalIssues: number;
    resolvedIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
}

export class ReportSummary {
    totalIssues: number;
    resolvedIssues: number;
    issuesByType: Map<string, number>;
    issuesBySeverity: Map<string, number>;

    /**
     * Create a new ReportSummary
     */
    constructor() {
        this.totalIssues = 0;
        this.resolvedIssues = 0;
        this.issuesByType = new Map<string, number>();
        this.issuesBySeverity = new Map<string, number>();
    }

    /**
     * Add issue statistics to the summary
     * @param {Issue[]} issues - List of issues to summarize
     * @param {Solution[]} solutions - List of solutions
     */
    addStatistics(issues: Issue[], solutions: Solution[]): void {
        this.totalIssues = issues.length;
        this.resolvedIssues = solutions.length;
        
        // Count issues by type
        issues.forEach(issue => {
            const typeKey = EIssueType[issue.type];
            const count = this.issuesByType.get(typeKey) || 0;
            this.issuesByType.set(typeKey, count + 1);
            
            const sevCount = this.issuesBySeverity.get(issue.severity) || 0;
            this.issuesBySeverity.set(issue.severity, sevCount + 1);
        });
    }

    /**
     * Convert Maps to objects for JSON serialization
     * @returns {ReportSummaryData} JSON-serializable summary
     */
    toJSON(): ReportSummaryData {
        return {
            totalIssues: this.totalIssues,
            resolvedIssues: this.resolvedIssues,
            issuesByType: Object.fromEntries(this.issuesByType),
            issuesBySeverity: Object.fromEntries(this.issuesBySeverity)
        };
    }
}
