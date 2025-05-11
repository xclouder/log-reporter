/**
 * Represents a solution for an identified issue
 */

export interface SolutionData {
    issueId: string;
    recommendation: string;
    codeSnippet?: string;
    confidence?: number;
    references?: string[];
}

export class Solution {
    issueId: string;
    recommendation: string;
    codeSnippet: string;
    confidence: number;
    references: string[];

    /**
     * Create a new Solution
     * @param {SolutionData} data - Solution data
     */
    constructor(data: SolutionData) {
        this.issueId = data.issueId;
        this.recommendation = data.recommendation;
        this.codeSnippet = data.codeSnippet || '';
        this.confidence = data.confidence || 0.5;
        this.references = data.references || [];
    }
}
