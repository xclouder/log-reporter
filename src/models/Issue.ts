/**
 * Represents an issue found in log files
 */
import { v4 as uuidv4 } from 'uuid';
import { EIssueDetectorState } from '../issue_detecter/IssueDetector';

export enum EIssueType {
    Error,
    Exception,
    Crash
}

export class Issue {
    id: string;
    type: EIssueType;
    message?: string;
    rawLogs?: string[];
    stackTrace?: string[];
    context: string[];
    source?: string;
    severity: string; // For backward compatibility

    /**
     * Create a new Issue
     * @param {IssueData} data - Issue data
     */
    constructor(type: EIssueType = EIssueType.Error, message?: string) {
        this.id = uuidv4(); // Generate a unique ID
        this.type = type;
        this.message = message || '';
        this.stackTrace = [];
        this.rawLogs = [];
        this.context = [];
        this.source = '';
        this.severity = this.getSeverityFromType(type); // Map EIssueType to severity string
    }
    
    /**
     * Map issue type to severity string
     * @param {EIssueType} type - Issue type
     * @returns {string} Severity string
     */
    private getSeverityFromType(type: EIssueType): string {
        switch(type) {
            case EIssueType.Crash:
                return 'critical';
            case EIssueType.Exception:
                return 'high';
            case EIssueType.Error:
            default:
                return 'medium';
        }
    }

    public addLogLine(line: string): void {
        this.rawLogs!.push(line);
    }

    public addStacktraceLine(stacktrace: string): void {
        this.stackTrace!.push(stacktrace);
    }

    /**
     * Convert issue to string representation
     * @returns {string} String representation of the issue
     */
    toString(): string {
        return `[${this.severity.toUpperCase()}] ${EIssueType[this.type]}: ${this.message || 'No message'} ${this.source ? `(${this.source})` : ''} ${this.stackTrace ? '(Has stack trace)' : ''}`;
    }
}
