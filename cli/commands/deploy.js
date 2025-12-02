import chalk from 'chalk';
import { Clodo } from '../../src/simple-api.js';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigLoader } from '../../lib/shared/utils/config-loader.js';

export function registerDeployCommand(program) {
  const command = program
    .command('deploy')
    .description('Deploy a Clodo service with smart credential handling and domain selection')
    // Cloudflare-specific options
    .option('--token <token>', 'Cloudflare API token')
    .option('--account-id <id>', 'Cloudflare account ID')
    .option('--zone-id <id>', 'Cloudflare zone ID')
    .option('--domain <domain>', 'Specific domain to deploy to (otherwise prompted if multiple exist)')
    .option('--environment <env>', 'Target environment (development, staging, production)', 'production')
    .option('--development', 'Deploy to development environment (shorthand for --environment development)')
    .option('--staging', 'Deploy to staging environment (shorthand for --environment staging)')
    .option('--production', 'Deploy to production environment (shorthand for --environment production)')
    .option('--dry-run', 'Simulate deployment without making changes')
    .option('-y, --yes', 'Skip confirmation prompts (for CI/CD)')
    .option('--service-path <path>', 'Path to service directory', '.')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (options) => {
      try {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
        const configLoader = new ConfigLoader({ verbose: options.verbose, quiet: options.quiet, json: options.json });

        // Handle shorthand environment flags
        if (options.development) {
          options.environment = 'development';
        } else if (options.staging) {
          options.environment = 'staging';
        } else if (options.production) {
          options.environment = 'production';
        }

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

        // Use simple API for deployment
        const result = await Clodo.deploy({
          servicePath: mergedOptions.servicePath || '.',
          environment: mergedOptions.environment || 'production',
          domain: mergedOptions.domain,
          dryRun: mergedOptions.dryRun || false,
          credentials: {
            token: mergedOptions.token,
            accountId: mergedOptions.accountId,
            zoneId: mergedOptions.zoneId
          }
        });

        if (result.success) {
          output.success(result.message);
          if (result.deployedDomains && result.deployedDomains.length > 0) {
            output.info(`Deployed to domains: ${result.deployedDomains.join(', ')}`);
          }
        } else {
          output.error('Deployment failed');
          process.exit(1);
        }

      } catch (error) {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Deployment failed: ${error.message}`);
        process.exit(1);
      }
    });
}
