/**
 * Validate Command - Validate an existing service configuration
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';

export function registerValidateCommand(program) {
  program
    .command('validate <service-path>')
    .description('Validate an existing service configuration')
    .action(async (servicePath) => {
      try {
        const orchestrator = new ServiceOrchestrator();
        const result = await orchestrator.validateService(servicePath);

        if (result.valid) {
          console.log(chalk.green('✓ Service configuration is valid'));
        } else {
          console.log(chalk.red('✗ Service configuration has issues:'));
          result.issues.forEach(issue => {
            console.log(chalk.yellow(`  • ${issue}`));
          });
          process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red(`Validation failed: ${error.message}`));
        process.exit(1);
      }
    });
}
