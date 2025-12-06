import chalk from 'chalk';
import { Clodo } from '@tamyla/clodo-framework';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigLoader } from '../../lib/shared/utils/config-loader.js';
import { InteractiveDeploymentCoordinator } from '../../lib/shared/deployment/workflows/interactive-deployment-coordinator.js';

export function registerDeployCommand(program) {
  const command = program
    .command('deploy')
    .description('Deploy a Clodo service with interactive configuration and validation')
    // Cloudflare-specific options
    .option('--token <token>', 'Cloudflare API token (or set CLOUDFLARE_API_TOKEN env var)')
    .option('--account-id <id>', 'Cloudflare account ID (or set CLOUDFLARE_ACCOUNT_ID env var)')
    .option('--zone-id <id>', 'Cloudflare zone ID (or set CLOUDFLARE_ZONE_ID env var)')
    .option('--domain <domain>', 'Specific domain to deploy to')
    .option('--service-name <name>', 'Service name for URL generation (e.g., data-service, auth-service)', 'data-service')
    .option('--environment <env>', 'Target environment (development, staging, production)', 'production')
    .option('--development', 'Deploy to development environment (shorthand for --environment development)')
    .option('--staging', 'Deploy to staging environment (shorthand for --environment staging)')
    .option('--production', 'Deploy to production environment (shorthand for --environment production)')
    .option('--dry-run', 'Simulate deployment without making changes')
    .option('-y, --yes', 'Skip confirmation prompts (for CI/CD)')
    .option('--service-path <path>', 'Path to service directory', '.')
    .option('--check-prereqs', 'Check deployment prerequisites before starting')
    .option('--check-auth', 'Check Wrangler authentication status')
    .option('--check-network', 'Check network connectivity to Cloudflare')

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

        // Determine if interactive mode should be enabled
        const interactive = !mergedOptions.nonInteractive && !mergedOptions.yes;

        if (interactive) {
          console.log(chalk.cyan('\n🚀 Interactive Clodo Service Deployment'));
          console.log(chalk.gray('═'.repeat(60)));
          console.log(chalk.white('Welcome to the interactive deployment wizard!\n'));

          // Use the interactive deployment coordinator
          const coordinator = new InteractiveDeploymentCoordinator({
            servicePath: mergedOptions.servicePath || '.',
            environment: mergedOptions.environment || 'production',
            domain: mergedOptions.domain,
            serviceName: mergedOptions.serviceName,
            dryRun: mergedOptions.dryRun || false,
            credentials: {
              token: mergedOptions.token,
              accountId: mergedOptions.accountId,
              zoneId: mergedOptions.zoneId
            },
            checkPrereqs: mergedOptions.checkPrereqs,
            checkAuth: mergedOptions.checkAuth,
            checkNetwork: mergedOptions.checkNetwork,
            verbose: mergedOptions.verbose,
            quiet: mergedOptions.quiet,
            json: mergedOptions.json
          });

          const result = await coordinator.runInteractiveDeployment();

          if (result.success) {
            output.success(result.message);
            if (result.deployedDomains && result.deployedDomains.length > 0) {
              output.info(`Deployed to domains: ${result.deployedDomains.join(', ')}`);
            }
          } else {
            output.error('Interactive deployment failed');
            process.exit(1);
          }
        } else {
          // Use simple API for deployment (non-interactive/CI mode)
          const result = await Clodo.deploy({
            servicePath: mergedOptions.servicePath || '.',
            environment: mergedOptions.environment || 'production',
            domain: mergedOptions.domain,
            serviceName: mergedOptions.serviceName,
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
        }

      } catch (error) {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Deployment failed: ${error.message}`);
        process.exit(1);
      }
    });
}