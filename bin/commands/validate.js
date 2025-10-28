/**
 * Validate Command - Validate an existing service configuration
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';
import { StandardOptions } from '../shared/utils/cli-options.js';
import { ConfigLoader } from '../shared/utils/config-loader.js';

export function registerValidateCommand(program) {
  const command = program
    .command('validate <service-path>')
    .description('Validate an existing service configuration')
    .option('--deep-scan', 'Run comprehensive validation checks')
    .option('--export-report <file>', 'Export validation report to JSON file')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (servicePath, options) => {
      try {
        const output = new (await import('../shared/utils/output-formatter.js')).OutputFormatter(options);
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
        const result = await orchestrator.validateService(servicePath, {
          deepScan: mergedOptions.deepScan,
          exportReport: mergedOptions.exportReport
        });

        if (result.valid) {
          output.success('Service configuration is valid');
        } else {
          output.error('Service configuration has issues:');
          output.list(result.issues || []);
          process.exit(1);
        }
      } catch (error) {
        const output = new (await import('../shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Validation failed: ${error.message}`);
        process.exit(1);
      }
    });
}
