/**
 * Resolves issues by finding source code and generating solutions
 */
import { Issue } from './models/Issue';
import { Solution, SolutionData } from './models/Solution';
import { SourceCodeFinder } from './utils/SourceCodeFinder';
import { LLMClient } from './utils/LLMClient';
import { ResolverConfig } from './utils/ConfigManager';

export class ProblemResolver {
    private sourceCodeFinder: SourceCodeFinder;
    private llmClient: LLMClient;
    private solutions: Map<string, Solution>;

    /**
     * Create a new ProblemResolver
     * @param {ResolverConfig} config - Resolver configuration
     */
    constructor(config: ResolverConfig) {
        this.solutions = new Map<string, Solution>();
        
        // Initialize source code finder
        this.sourceCodeFinder = new SourceCodeFinder({
            sourceRoots: config.sourceDir ? [config.sourceDir] : [],
            fileExtensions: ['.js', '.ts', '.jsx', '.tsx', '.java', '.py', '.c', '.cpp', '.cs']
        });
        
        // Initialize LLM client
        const llmConfig = config.llm && config.llm['deepseek-r1'] ? config.llm['deepseek-r1'] : { key: '', endpoint: '' };
        this.llmClient = new LLMClient({
            apiKey: llmConfig.key || '',
            endpoint: llmConfig.endpoint || 'https://api.deepseek.com/v1',
            model: 'deepseek-coder'
        });
    }
    
    /**
     * Resolve an issue by finding source code and generating a solution
     * @param {Issue} issue - The issue to resolve
     * @returns {Promise<Solution>} The generated solution
     */
    async resolveIssue(issue: Issue): Promise<Solution> {
        try {
            // Check if we already have a solution for this issue
            if (issue.id && this.solutions.has(issue.id)) {
                return this.solutions.get(issue.id)!;
            }
            
            // Find relevant source code
            const sourceCode = await this.sourceCodeFinder.findRelevantCode(issue);
            
            // Generate solution using LLM
            const solutionText = await this.llmClient.generateSolution(issue, sourceCode);
            
            // Parse solution text to extract code snippet and references
            const { recommendation, codeSnippet, references } = this.llmClient.parseSolution(solutionText);
            
            // Create solution object
            const solutionData: SolutionData = {
                issueId: issue.id || '',
                recommendation,
                codeSnippet,
                confidence: 0.8,
                references
            };
            
            const solution = new Solution(solutionData);
            
            // Store solution
            this.solutions.set(issue.id || '', solution);
            
            return solution;
        } catch (error) {
            console.error(`Error resolving issue:`, error);
            
            // Create a fallback solution
            const fallbackSolution = new Solution({
                issueId: issue.id || '',
                recommendation: 'Could not generate a solution due to an error.',
                confidence: 0.1
            });
            
            this.solutions.set(issue.id || '', fallbackSolution);
            
            return fallbackSolution;
        }
    }
    
    /**
     * Resolve multiple issues in batch
     * @param {Issue[]} issues - List of issues to resolve
     * @returns {Promise<Solution[]>} List of solutions
     */
    async batchResolveIssues(issues: Issue[]): Promise<Solution[]> {
        const solutions: Solution[] = [];
        
        for (const issue of issues) {
            const solution = await this.resolveIssue(issue);
            solutions.push(solution);
        }
        
        return solutions;
    }
    
    /**
     * Get all generated solutions
     * @returns {Solution[]} List of all solutions
     */
    getSolutions(): Solution[] {
        return Array.from(this.solutions.values());
    }
}
