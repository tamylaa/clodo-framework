import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigLoader } from '../../lib/shared/utils/config-loader.js';

export function registerDiagnoseCommand(program) {
  const command = program
    .command('diagnose [service-path]')
    .description('Diagnose and report issues with an existing service')
    .option('--deep-scan', 'Perform deep analysis including dependencies and deployment readiness')
    .option('--export-report <file>', 'Export diagnostic report to file')
    .option('--fix-suggestions', 'Include suggested fixes for issues')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (servicePath, options) => {
      try {
        const output = new (await import('../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
        const configLoader = new ConfigLoader({ verbose: options.verbose, quiet: options.quiet, json: options.json });

        // Load config from file if specified
        let configFileData = {};
        if (options.configFile) {
          configFileData = configLoader.loadSafe(options.configFile, {});
          if (options.verbose && !options.quiet) {
            output.info(`Loaded configuration from: ${options.configFile}`);
          }
        }

        // Merge config file defaults with CLI options (CLI takes precedence)
        const mergedOptions = configLoader.merge(configFileData, options);

        const orchestrator = new ServiceOrchestrator();

        // Auto-detect service path if not provided
        if (!servicePath) {
          servicePath = await orchestrator.detectServicePath();
          if (!servicePath) {
            output.error('No service path provided and could not auto-detect service directory');
            process.exit(1);
          }
        }

        output.info('🔍 Diagnosing service...');
        const diagnosis = await orchestrator.diagnoseService(servicePath, mergedOptions);

        // Display results
        output.section('Diagnostic Report');
        output.list([
          `Service: ${diagnosis.serviceName || 'Unknown'}`,
          `Path: ${servicePath}`
        ]);

        if (diagnosis.errors.length > 0) {
          output.warning('❌ Critical Errors:');
          diagnosis.errors.forEach(error => {
            let msg = `• ${error.message}`;
            if (error.location) msg += ` (Location: ${error.location})`;
            if (error.suggestion) msg += ` 💡 ${error.suggestion}`;
            output.warning(msg);
          });
        }

        if (diagnosis.warnings.length > 0) {
          output.warning('⚠️  Warnings:');
          diagnosis.warnings.forEach(warning => {
            let msg = `• ${warning.message}`;
            if (warning.suggestion) msg += ` 💡 ${warning.suggestion}`;
            output.warning(msg);
          });
        }

        if (diagnosis.recommendations.length > 0) {
          output.info('💡 Recommendations:');
          output.list(diagnosis.recommendations);
        }

        // Export report if requested
        if (mergedOptions.exportReport) {
          await orchestrator.exportDiagnosticReport(diagnosis, mergedOptions.exportReport);
          output.success(`📄 Report exported to: ${mergedOptions.exportReport}`);
        }

        // Exit with error code if critical issues found
        if (diagnosis.errors.length > 0) {
          process.exit(1);
        }

      } catch (error) {
        const output = new (await import('../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Diagnosis failed: ${error.message}`);
        process.exit(1);
      }
    });
}
