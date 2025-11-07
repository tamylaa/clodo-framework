/**
 * Create Command - Create a new Clodo service with conversational setup
 * 
 * Input Strategy: FULL three-tier collection (88 fields)
 * Uses ServiceOrchestrator to collect all required information interactively
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigLoader } from '../../lib/shared/utils/config-loader.js';

export function registerCreateCommand(program) {
  const command = program
    .command('create')
    .description('Create a new Clodo service with conversational setup')
    .option('-n, --non-interactive', 'Run in non-interactive mode with all required parameters')
    .option('--service-name <name>', 'Service name (required in non-interactive mode)')
    .option('--service-type <type>', 'Service type: data-service, auth-service, content-service, api-gateway, generic', 'generic')
    .option('--domain-name <domain>', 'Domain name (required in non-interactive mode)')
    .option('--cloudflare-token <token>', 'Cloudflare API token (required in non-interactive mode)')
    .option('--cloudflare-account-id <id>', 'Cloudflare account ID (required in non-interactive mode)')
    .option('--cloudflare-zone-id <id>', 'Cloudflare zone ID (required in non-interactive mode)')
    .option('--environment <env>', 'Target environment: development, staging, production', 'development')
    .option('--output-path <path>', 'Output directory for generated service', '.')
    .option('--template-path <path>', 'Path to service templates', './templates')
    .option('--force', 'Skip confirmation prompts')
    .option('--validate', 'Validate service after creation')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (options) => {
      try {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
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

        const orchestrator = new ServiceOrchestrator({
          interactive: !mergedOptions.nonInteractive,
          outputPath: mergedOptions.outputPath,
          templatePath: mergedOptions.templatePath
        });

        if (mergedOptions.nonInteractive) {
          // Validate required parameters for non-interactive mode
          const required = ['serviceName', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId'];
          const missing = required.filter(key => !mergedOptions[key]);

          if (missing.length > 0) {
            output.error(`Missing required parameters: ${missing.join(', ')}`);
            output.info('Use --help for parameter details');
            process.exit(1);
          }

          // Convert merged options to core inputs
          const coreInputs = {
            serviceName: mergedOptions.serviceName,
            serviceType: mergedOptions.serviceType,
            domainName: mergedOptions.domainName,
            cloudflareToken: mergedOptions.cloudflareToken,
            cloudflareAccountId: mergedOptions.cloudflareAccountId,
            cloudflareZoneId: mergedOptions.cloudflareZoneId,
            environment: mergedOptions.environment
          };

          await orchestrator.runNonInteractive(coreInputs);
        } else {
          await orchestrator.runInteractive();
        }

        output.success('Service creation completed successfully!');
        output.section('Next steps');
        output.list([
          'cd into your new service directory',
          'Run npm install',
          'Configure additional settings in src/config/domains.js',
          'Run npm run deploy to deploy to Cloudflare'
        ]);

      } catch (error) {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Service creation failed: ${error.message}`);
        if (error.details) {
          output.warning(`Details: ${error.details}`);
        }
        process.exit(1);
      }
    });
}
