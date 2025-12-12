import chalk from 'chalk';
import path from 'path';
import { ServiceOrchestrator, ServiceConfigManager } from '@tamyla/clodo-framework';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';

export function registerDiagnoseCommand(program) {
  const command = program
    .command('diagnose [service-path]')
    .description('Diagnose and report issues with an existing service')
    .option('--deep-scan', 'Perform deep analysis including dependencies and deployment readiness')
    .option('--export-report <file>', 'Export diagnostic report to file')
    .option('--fix-suggestions', 'Include suggested fixes for issues')
    .option('--show-config-sources', 'Display all configuration sources and merged result')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (servicePath, options) => {
      try {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
        const configManager = new ServiceConfigManager({
          verbose: options.verbose,
          quiet: options.quiet,
          json: options.json,
          showSources: options.showConfigSources
        });

        const orchestrator = new ServiceOrchestrator();

        // Validate service path with better error handling
        try {
          servicePath = await configManager.validateServicePath(servicePath, orchestrator);
        } catch (error) {
          output.error(error.message);
          if (error.suggestions) {
            output.info('Suggestions:');
            output.list(error.suggestions);
          }
          process.exit(1);
        }

        // Load and merge all configurations
        const mergedOptions = await configManager.loadServiceConfig(servicePath, options, {
          deepScan: false,
          exportReport: null,
          fixSuggestions: false
        });

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
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Diagnosis failed: ${error.message}`);
        process.exit(1);
      }
    });
}
