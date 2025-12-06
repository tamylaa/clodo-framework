/**
 * Update Command - Update an existing service configuration
 */

import chalk from 'chalk';
import path from 'path';
import { ServiceOrchestrator, StandardOptions, ServiceConfigManager } from '@tamyla/clodo-framework';

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
    .option('--show-config-sources', 'Display all configuration sources and merged result')
    .option('--force', 'Skip confirmation prompts')
  
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

        // Auto-detect service path if not provided
        if (!servicePath) {
          servicePath = await orchestrator.detectServicePath();
          if (!servicePath) {
            output.error('No service path provided and could not auto-detect service directory');
            process.exit(1);
          }
        }

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
          interactive: false,
          domainName: null,
          cloudflareToken: null,
          cloudflareAccountId: null,
          cloudflareZoneId: null,
          environment: null,
          addFeature: null,
          removeFeature: null,
          regenerateConfigs: false,
          fixErrors: false,
          preview: false,
          force: false
        });
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
        const isValid = await orchestrator.validateService(servicePath, { customConfig: mergedOptions });
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
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
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
