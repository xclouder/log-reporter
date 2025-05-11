/**
 * Manages configuration for the log reporter components
 */
import fs from 'fs-extra';
import path from 'path';

export interface LLMConfig {
    key: string;
    endpoint?: string;
}

export interface Config {
    sourceDir: string | null;
    logPatterns?: Record<string, string[]>;
    stackTracePatterns?: string[];
    llm?: Record<string, LLMConfig>;
    reportTemplate?: string;
    outputDir?: string;
}

export interface ScannerConfig {
    logPatterns: Record<string, string[]>;
    stackTracePatterns: string[];
}

export interface ResolverConfig {
    sourceDir: string | null;
    llm: Record<string, LLMConfig>;
}

export interface ReportConfig {
    templatePath: string;
    outputDir: string;
}

export class ConfigManager {
    private configPath: string;
    private config: Config | null;

    /**
     * Create a new ConfigManager
     * @param {string} configPath - Path to the configuration file
     */
    constructor(configPath: string) {
        this.configPath = configPath;
        this.config = null;
    }

    /**
     * Load configuration from file
     * @returns {Promise<Config>} The loaded configuration
     */
    async loadConfig(): Promise<Config> {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            return this.config!;
        } catch (error) {
            console.error(`Error loading config from ${this.configPath}:`, error);
            // Create default config if file doesn't exist
            this.config = this.getDefaultConfig();
            return this.config;
        }
    }

    /**
     * Get default configuration
     * @returns {Config} Default configuration
     */
    getDefaultConfig(): Config {
        return {
            sourceDir: null,
            logPatterns: {
                error: ["ERROR", "Exception", "FATAL"],
                warning: ["WARN", "WARNING"]
            },
            stackTracePatterns: [
                "at\\s+([\\w$.]+)\\s\\((.+?):(\\d+):(\\d+)\\)",
                "([\\w$.]+)\\s\\((.+?):(\\d+):(\\d+)\\)"
            ],
            llm: {
                "deepseek-r1": {
                    key: "",
                    endpoint: "https://api.deepseek.com/v1"
                }
            },
            reportTemplate: path.join(__dirname, "../templates/report.html"),
            outputDir: "./reports"
        };
    }

    /**
     * Get LogScanner configuration
     * @returns {ScannerConfig} LogScanner configuration
     */
    getLogScannerConfig(): ScannerConfig {
        if (!this.config) {
            throw new Error("Config not loaded. Call loadConfig() first.");
        }
        
        return {
            logPatterns: this.config.logPatterns || {},
            stackTracePatterns: this.config.stackTracePatterns || []
        };
    }

    /**
     * Get ProblemResolver configuration
     * @returns {ResolverConfig} ProblemResolver configuration
     */
    getProblemResolverConfig(): ResolverConfig {
        if (!this.config) {
            throw new Error("Config not loaded. Call loadConfig() first.");
        }
        
        return {
            sourceDir: this.config.sourceDir,
            llm: this.config.llm || {}
        };
    }

    /**
     * Get ReportGenerator configuration
     * @returns {ReportConfig} ReportGenerator configuration
     */
    getReportGeneratorConfig(): ReportConfig {
        if (!this.config) {
            throw new Error("Config not loaded. Call loadConfig() first.");
        }
        
        return {
            templatePath: this.config.reportTemplate || path.join(__dirname, "../templates/report.html"),
            outputDir: this.config.outputDir || "./reports"
        };
    }

    /**
     * Save the current configuration to file
     * @returns {Promise<void>}
     */
    async saveConfig(): Promise<void> {
        if (!this.config) {
            throw new Error("Config not loaded. Call loadConfig() first.");
        }
        
        try {
            await fs.writeFile(
                this.configPath, 
                JSON.stringify(this.config, null, 4), 
                'utf8'
            );
        } catch (error) {
            console.error(`Error saving config to ${this.configPath}:`, error);
            throw error;
        }
    }
}
