/**
 * Validate Command - Validate an existing service configuration
 */

import chalk from 'chalk';
import path from 'path';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ServiceConfigManager } from '../../lib/shared/utils/service-config-manager.js';

export function registerValidateCommand(program) {
  const command = program
    .command('validate <service-path>')
    .description('Validate an existing service configuration')
    .option('--deep-scan', 'Run comprehensive validation checks')
    .option('--export-report <file>', 'Export validation report to JSON file')
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
          exportReport: null
        });

        const result = await orchestrator.validateService(servicePath, {
          deepScan: mergedOptions.deepScan,
          exportReport: mergedOptions.exportReport,
          customConfig: mergedOptions.validation // Pass custom validation config
        });

        if (result.valid) {
          output.success('Service configuration is valid');
        } else {
          output.error('Service configuration has issues:');
          output.list(result.issues || []);
          process.exit(1);
        }

        // Report export success if requested
        if (mergedOptions.exportReport) {
          output.success(`📄 Report exported to: ${mergedOptions.exportReport}`);
        }
      } catch (error) {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Validation failed: ${error.message}`);
        process.exit(1);
      }
    });
}
