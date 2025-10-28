/**
 * Update Command - Update an existing service configuration
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';
import { StandardOptions } from '../shared/utils/cli-options.js';
import { ConfigLoader } from '../shared/utils/config-loader.js';

export function registerUpdateCommand(program) {
  const command = program
    .command('update [service-path]')
    .description('Update an existing service configuration')
    .option('-i, --interactive', 'Run in interactive mode to select what to update')
    .option('--domain-name <domain>', 'Update domain name')
    .option('--cloudflare-token <token>', 'Update Cloudflare API token')
    .option('--cloudflare-account-id <id>', 'Update Cloudflare account ID')
    .option('--cloudflare-zone-id <id>', 'Update Cloudflare zone ID')
    .option('--environment <env>', 'Update target environment: development, staging, production')
    .option('--add-feature <feature>', 'Add a feature flag')
    .option('--remove-feature <feature>', 'Remove a feature flag')
    .option('--regenerate-configs', 'Regenerate all configuration files')
    .option('--fix-errors', 'Attempt to fix common configuration errors')
    .option('--preview', 'Show what would be changed without applying')
    .option('--force', 'Skip confirmation prompts')
  
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

        // Auto-detect service path if not provided
        if (!servicePath) {
          servicePath = await orchestrator.detectServicePath();
          if (!servicePath) {
            output.error('No service path provided and could not auto-detect service directory');
            output.info('Please run this command from within a service directory or specify the path');
            process.exit(1);
          }
          output.info(`Auto-detected service at: ${servicePath}`);
        }

        // Validate it's a service directory
        const isValid = await orchestrator.validateService(servicePath);
        if (!isValid.valid) {
          output.warning('Service has configuration issues. Use --fix-errors to attempt automatic fixes.');
          if (!mergedOptions.fixErrors) {
            output.info('Issues found:');
            output.list(isValid.issues || []);
            process.exit(1);
          }
        }

        if (mergedOptions.interactive) {
          await orchestrator.runInteractiveUpdate(servicePath);
        } else {
          await orchestrator.runNonInteractiveUpdate(servicePath, mergedOptions);
        }

        output.success('Service update completed successfully!');

      } catch (error) {
        const output = new (await import('../shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Service update failed: ${error.message}`);
        if (error.details) {
          output.warning(`Details: ${error.details}`);
        }
        if (error.recovery) {
          output.info('Recovery suggestions:');
          output.list(error.recovery);
        }
        process.exit(1);
      }
    });
}
