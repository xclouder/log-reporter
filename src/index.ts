/**
 * Log Reporter - Main Entry Point
 * A tool for log analysis, problem resolution, and report generation
 */
import path from 'path';
import fs from 'fs-extra';

import { LogScanner } from './LogScanner';
import { ProblemResolver } from './ProblemResolver';
import { ReportGenerator } from './ReportGenerator';
import { ConfigManager } from './utils/ConfigManager';
import { Issue } from './models/Issue';
import { Solution } from './models/Solution';

interface CommandOptions {
    logFile?: string;
    config?: string;
    open: boolean;
}

/**
 * Main function to run the log reporter
 * @param {CommandOptions} options - Command line options
 */
async function main(options: CommandOptions): Promise<void> {
    try {
        console.log('Log Reporter - Starting analysis...');

        // Load configuration
        const configPath = options.config || path.join(__dirname, '..', 'config.json');
        const configManager = new ConfigManager(configPath);
        const config = await configManager.loadConfig();

        // Initialize components
        const logScanner = new LogScanner(configManager.getLogScannerConfig());
        const problemResolver = new ProblemResolver(configManager.getProblemResolverConfig());
        const reportGenerator = new ReportGenerator(configManager.getReportGeneratorConfig());

        // Scan logs
        let issues: Issue[] = [];
        if (options.logFile) {
            console.log(`Scanning log file: ${options.logFile}`);
            issues = await logScanner.scanLogFile(options.logFile);
        } else {
            console.error('No log file provided. Use --logFile');
            process.exit(1);
        }

        console.log(`Found ${issues.length} issues in logs`);

        if (issues.length === 0) {
            console.log('No issues found. Exiting.');
            return;
        }

        // Resolve issues
        console.log('Resolving issues...');
        const solutions = await problemResolver.batchResolveIssues(issues);
        console.log(`Generated ${solutions.length} solutions`);

        // Generate report
        console.log('Generating report...');
        const reportPath = await reportGenerator.generateReport(issues, solutions);
        console.log(`Report generated: ${reportPath}`);

        // Open report if requested
        if (options.open) {
            const open = await import('open');
            await open.default(reportPath);
        }

        console.log('Log Reporter - Analysis complete');
    } catch (error) {
        console.error('Error running Log Reporter:', error);
        process.exit(1);
    }
}

/**
 * Parse command line arguments
 * @returns {CommandOptions} Parsed options
 */
function parseArgs(): CommandOptions {
    const args = process.argv.slice(2);
    const options: CommandOptions = {
        logFile: undefined,
        config: undefined,
        open: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--logFile' && i + 1 < args.length) {
            options.logFile = args[++i];
        } else if (arg === '--config' && i + 1 < args.length) {
            options.config = args[++i];
        } else if (arg === '--open') {
            options.open = true;
        } else if (arg === '--help') {
            showHelp();
            process.exit(0);
        }
    }

    return options;
}

/**
 * Show help message
 */
function showHelp(): void {
    console.log(`
Log Reporter - A tool for log analysis and problem resolution

Usage:
  node dist/index.js [options]

Options:
  --logFile <path>      Path to a log file to analyze
  --config <path>       Path to configuration file (default: ./config.json)
  --open                Open the generated report in default browser
  --help                Show this help message

Examples:
  node dist/index.js --logFile ./logs/app.log
  node dist/index.js --logFile ./logs/app.log --config ./custom-config.json
  node dist/index.js --logFile ./logs/app.log --open
`);
}

// Run if called directly
if (require.main === module) {
    const options = parseArgs();

    // Show help if no log file provided
    if (!options.logFile) {
        showHelp();
        process.exit(1);
    }

    main(options).catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

// Export for use as a module
export {
    LogScanner,
    ProblemResolver,
    ReportGenerator,
    ConfigManager,
    main
};
