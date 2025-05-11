/**
 * Client for interacting with Large Language Models
 */
import axios, { AxiosInstance } from 'axios';
import { Issue, EIssueType } from '../models/Issue';
import { SourceInfo } from './SourceCodeFinder';

export interface LLMClientConfig {
    apiKey: string;
    endpoint?: string;
    model?: string;
}

export interface LLMResponse {
    recommendation: string;
    codeSnippet: string;
    references: string[];
}

export class LLMClient {
    private apiKey: string;
    private endpoint: string;
    private model: string;
    private client: AxiosInstance;

    /**
     * Create a new LLMClient
     * @param {LLMClientConfig} config - LLM configuration
     */
    constructor(config: LLMClientConfig) {
        this.apiKey = config.apiKey;
        this.endpoint = config.endpoint || 'https://api.deepseek.com/v1';
        this.model = config.model || 'deepseek-coder';
        
        // Create axios instance with default headers
        this.client = axios.create({
            baseURL: this.endpoint,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        });
    }

    /**
     * Generate a solution for an issue using the LLM
     * @param {Issue} issue - The issue to generate a solution for
     * @param {SourceInfo[] | null} sourceCode - Source code information
     * @returns {Promise<string>} Generated solution text
     */
    async generateSolution(issue: Issue, sourceCode: SourceInfo[] | null): Promise<string> {
        if (!this.apiKey) {
            console.warn('No API key provided for LLM. Using mock response.');
            return this.generateMockSolution(issue);
        }

        try {
            // Create prompt based on issue and source code
            const prompt = this.createPrompt(issue, sourceCode);
            
            // Call LLM API
            const response = await this.client.post('/chat/completions', {
                model: this.model,
                messages: [
                    { role: 'system', content: 'You are an expert software developer helping to diagnose and fix issues found in application logs.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });
            
            // Extract and return the generated solution
            if (response.data && 
                response.data.choices && 
                response.data.choices.length > 0 &&
                response.data.choices[0].message) {
                return response.data.choices[0].message.content;
            }
            
            throw new Error('Unexpected response format from LLM API');
        } catch (error) {
            console.error('Error generating solution with LLM:', error);
            
            // Fallback to mock solution
            return this.generateMockSolution(issue);
        }
    }

    /**
     * Create a prompt for the LLM based on the issue and source code
     * @param {Issue} issue - The issue to create a prompt for
     * @param {SourceInfo[] | null} sourceCode - Source code information
     * @returns {string} Prompt text
     */
    createPrompt(issue: Issue, sourceCode: SourceInfo[] | null): string {
        let prompt = `I need help fixing the following issue found in logs:\n\n`;
        prompt += `Issue Type: ${issue.type}\n`;
        prompt += `Issue Type: ${EIssueType[issue.type]}\n`;
        prompt += `Message: ${issue.message}\n\n`;
        
        if (issue.stackTrace && issue.stackTrace.length > 0) {
            prompt += `Stack Trace:\n${issue.stackTrace.join('\n')}\n\n`;
        }
        
        if (issue.context && issue.context.length > 0) {
            prompt += `Log Context:\n${issue.context.join('\n')}\n\n`;
        }
        
        if (sourceCode) {
            prompt += `I found the following relevant source code:\n\n`;
            
            sourceCode.forEach((src, index) => {
                prompt += `Source File ${index + 1}: ${src.file}\n`;
                if (src.lineNumber) {
                    prompt += `Line Number: ${src.lineNumber}\n`;
                }
                if (src.codeSnippet) {
                    prompt += `Code Snippet:\n\`\`\`\n${src.codeSnippet}\n\`\`\`\n\n`;
                }
            });
        }
        
        prompt += `Please provide:\n`;
        prompt += `1. A clear explanation of what's causing this issue\n`;
        prompt += `2. A specific code fix or solution\n`;
        prompt += `3. Any additional recommendations to prevent this issue in the future\n`;
        
        return prompt;
    }

    /**
     * Generate a mock solution when LLM is unavailable
     * @param {Issue} issue - The issue to generate a mock solution for
     * @returns {string} Mock solution text
     */
    generateMockSolution(issue: Issue): string {
        const solutions: Record<string, string> = {
            error: 'This error typically occurs due to improper error handling. Consider adding try-catch blocks around the problematic code and implementing proper logging and recovery mechanisms.',
            warning: 'This warning indicates a potential issue that might lead to errors in the future. Review the code to ensure proper validation and error handling.',
            info: 'This information log suggests a potential optimization opportunity. Consider reviewing the code for performance improvements.'
        };
        
        return solutions[issue.type] || 
            'Without access to an LLM, I cannot provide a detailed analysis. Please configure an LLM API key for better results.';
    }

    /**
     * Parse solution text into structured components
     * @param {string} solutionText - Raw solution text from LLM
     * @returns {LLMResponse} Parsed solution components
     */
    parseSolution(solutionText: string): LLMResponse {
        // Initialize with defaults
        let recommendation = solutionText;
        let codeSnippet = '';
        const references: string[] = [];
        
        // Extract code snippet between code blocks
        const codeBlockRegex = /```(?:[\w]*)\n([\s\S]*?)```/g;
        const codeBlocks = [...solutionText.matchAll(codeBlockRegex)];
        
        if (codeBlocks.length > 0) {
            codeSnippet = codeBlocks.map(match => match[1]).join('\n\n');
            
            // Remove code blocks from recommendation
            recommendation = solutionText.replace(codeBlockRegex, '');
        }
        
        // Extract references/links
        const linkRegex = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
        const links = [...solutionText.matchAll(linkRegex)];
        
        if (links.length > 0) {
            links.forEach(match => {
                references.push(`${match[1]}: ${match[2]}`);
            });
        }
        
        return {
            recommendation: recommendation.trim(),
            codeSnippet: codeSnippet.trim(),
            references
        };
    }
}
