import chalk from 'chalk';
import { Clodo, ConfigLoader, InteractiveDeploymentCoordinator, OutputFormatter } from '@tamyla/clodo-framework';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigSchemaValidator } from '../../src/validation/ConfigSchemaValidator.js';

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
    .option('--skip-doctor', 'Skip preflight doctor checks')
    .option('--doctor-strict', 'Fail deployment if doctor finds warnings (default: fail only on errors)')

  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (options) => {
      try {
        const output = new OutputFormatter(options);
        const configLoader = new ConfigLoader({ verbose: options.verbose, quiet: options.quiet, json: options.json });

        // Handle shorthand environment flags
        if (options.development) {
          options.environment = 'development';
        } else if (options.staging) {
          options.environment = 'staging';
        } else if (options.production) {
          options.environment = 'production';
        }

        // Load config from file if specified (with schema validation)
        let configFileData = {};
        if (options.configFile) {
          configFileData = configLoader.loadSafe(options.configFile, {});
          // Validate against deploy schema
          const schemaValidator = new ConfigSchemaValidator({ verbose: options.verbose });
          const validation = schemaValidator.validateConfig(configFileData, 'deploy');
          if (!validation.valid && options.verbose) {
            output.warning(`Config file has ${validation.errors.length} schema validation issue(s):`);
            for (const err of validation.errors) {
              output.warning(`  ${err.field}: ${err.message}`);
            }
          }
          if (validation.warnings.length > 0 && options.verbose) {
            for (const warn of validation.warnings) {
              output.info(`  ⚠ ${warn.field}: ${warn.message}`);
            }
          }
          if (options.verbose && !options.quiet) {
            output.info(`Loaded configuration from: ${options.configFile}`);
          }
        }

        // Merge config file defaults with CLI options (CLI takes precedence)
        const mergedOptions = configLoader.merge(configFileData, options);

        // Run doctor preflight checks (unless skipped)
        if (!mergedOptions.skipDoctor) {
          const { ValidationHandler } = await import('../../src/service-management/handlers/ValidationHandler.js');
          const doctor = new ValidationHandler();

          if (!mergedOptions.quiet) {
            output.info('🔍 Running preflight doctor checks...');
          }

          const doctorResults = await doctor.runDoctor({
            servicePath: mergedOptions.servicePath || '.',
            strict: mergedOptions.doctorStrict || false,
            json: false // Always use human-readable for deploy context
          });

          if (doctorResults.exitCode !== 0) {
            output.error('❌ Preflight checks failed!');
            output.error(`Found ${doctorResults.summary.errors} errors and ${doctorResults.summary.warnings} warnings`);

            // Show details of failed checks
            doctorResults.checks.forEach(check => {
              if (check.status !== 'passed') {
                const color = check.severity === 'error' ? 'red' : check.severity === 'warning' ? 'yellow' : 'gray';
                console.log(chalk[color](`  ${check.name}: ${check.message}`));
                check.details.forEach(detail => {
                  console.log(chalk.gray(`    ${detail}`));
                });
              }
            });

            if (doctorResults.fixSuggestions.length > 0) {
              output.info('\n💡 Fix suggestions:');
              doctorResults.fixSuggestions.forEach(suggestion => {
                output.log(chalk.blue(`  • ${suggestion}`));
              });
            }

            output.info('\nTo skip these checks, use --skip-doctor');
            output.info('To run checks manually, use: clodo doctor');

            process.exit(1);
          } else if (!mergedOptions.quiet) {
            output.success(`✅ Preflight checks passed (${doctorResults.summary.passed}/${doctorResults.summary.total})`);
          }
        }

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
        const output = new OutputFormatter(options || {});
        output.error(`Deployment failed: ${error.message}`);
        process.exit(1);
      }
    });
}