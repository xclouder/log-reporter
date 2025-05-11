/**
 * Log Reporter - Main Entry Point
 * A tool for log analysis, problem resolution, and report generation
 */
const path = require('path');
const fs = require('fs-extra');

const LogScanner = require('./src/LogScanner');
const ProblemResolver = require('./src/ProblemResolver');
const ReportGenerator = require('./src/ReportGenerator');
const ConfigManager = require('./src/utils/ConfigManager');

/**
 * Main function to run the log reporter
 * @param {Object} options - Command line options
 */
async function main(options) {
    try {
        console.log('Log Reporter - Starting analysis...');
        
        // Load configuration
        const configPath = options.config || path.join(__dirname, 'config.json');
        const configManager = new ConfigManager(configPath);
        const config = await configManager.loadConfig();
        
        // Initialize components
        const logScanner = new LogScanner(configManager.getLogScannerConfig());
        const problemResolver = new ProblemResolver(configManager.getProblemResolverConfig());
        const reportGenerator = new ReportGenerator(configManager.getReportGeneratorConfig());
        
        // Scan logs
        let issues = [];
        if (options.logFile) {
            console.log(`Scanning log file: ${options.logFile}`);
            issues = await logScanner.scanLogFile(options.logFile);
        } else if (options.logDir) {
            console.log(`Scanning log directory: ${options.logDir}`);
            issues = await logScanner.scanLogDirectory(options.logDir);
        } else if (options.logContent) {
            console.log('Scanning provided log content');
            issues = logScanner.scanLogContent(options.logContent);
        } else {
            console.error('No log source provided. Use --logFile, --logDir, or --logContent');
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
            const open = require('open');
            await open(reportPath);
        }
        
        console.log('Log Reporter - Analysis complete');
    } catch (error) {
        console.error('Error running Log Reporter:', error);
        process.exit(1);
    }
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        logFile: null,
        logDir: null,
        logContent: null,
        config: null,
        open: false
    };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--logFile' && i + 1 < args.length) {
            options.logFile = args[++i];
        } else if (arg === '--logDir' && i + 1 < args.length) {
            options.logDir = args[++i];
        } else if (arg === '--logContent' && i + 1 < args.length) {
            options.logContent = args[++i];
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
function showHelp() {
    console.log(`
Log Reporter - A tool for log analysis and problem resolution

Usage:
  node index.js [options]

Options:
  --logFile <path>      Path to a log file to analyze
  --logDir <path>       Path to a directory containing log files
  --logContent <text>   Raw log content to analyze
  --config <path>       Path to configuration file (default: ./config.json)
  --open                Open the generated report in default browser
  --help                Show this help message

Examples:
  node index.js --logFile ./logs/app.log
  node index.js --logDir ./logs --config ./custom-config.json
  node index.js --logContent "$(cat ./logs/app.log)" --open
`);
}

// Run if called directly
if (require.main === module) {
    const options = parseArgs();
    
    // Show help if no options provided
    if (!options.logFile && !options.logDir && !options.logContent) {
        showHelp();
        process.exit(1);
    }
    
    main(options).catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

// Export for use as a module
module.exports = {
    LogScanner,
    ProblemResolver,
    ReportGenerator,
    ConfigManager,
    main
};
