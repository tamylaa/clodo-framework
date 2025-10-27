/**
 * Update Command - Update an existing service configuration
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';

export function registerUpdateCommand(program) {
  program
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
    .action(async (servicePath, options) => {
      try {
        const orchestrator = new ServiceOrchestrator();

        // Auto-detect service path if not provided
        if (!servicePath) {
          servicePath = await orchestrator.detectServicePath();
          if (!servicePath) {
            console.error(chalk.red('No service path provided and could not auto-detect service directory'));
            console.log(chalk.white('Please run this command from within a service directory or specify the path'));
            process.exit(1);
          }
          console.log(chalk.cyan(`Auto-detected service at: ${servicePath}`));
        }

        // Validate it's a service directory
        const isValid = await orchestrator.validateService(servicePath);
        if (!isValid.valid) {
          console.log(chalk.yellow('⚠️  Service has configuration issues. Use --fix-errors to attempt automatic fixes.'));
          if (!options.fixErrors) {
            console.log(chalk.white('Issues found:'));
            isValid.issues.forEach(issue => {
              console.log(chalk.yellow(`  • ${issue}`));
            });
            process.exit(1);
          }
        }

        if (options.interactive) {
          await orchestrator.runInteractiveUpdate(servicePath);
        } else {
          await orchestrator.runNonInteractiveUpdate(servicePath, options);
        }

        console.log(chalk.green('\n✓ Service update completed successfully!'));

      } catch (error) {
        console.error(chalk.red(`\n✗ Service update failed: ${error.message}`));
        if (error.details) {
          console.error(chalk.yellow(`Details: ${error.details}`));
        }
        if (error.recovery) {
          console.log(chalk.cyan('\n💡 Recovery suggestions:'));
          error.recovery.forEach(suggestion => {
            console.log(chalk.white(`  • ${suggestion}`));
          });
        }
        process.exit(1);
      }
    });
}
