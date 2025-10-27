/**
 * Create Command - Create a new Clodo service with conversational setup
 * 
 * Input Strategy: FULL three-tier collection (88 fields)
 * Uses ServiceOrchestrator to collect all required information interactively
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../dist/service-management/ServiceOrchestrator.js';

export function registerCreateCommand(program) {
  program
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
    .action(async (options) => {
      try {
        const orchestrator = new ServiceOrchestrator({
          interactive: !options.nonInteractive,
          outputPath: options.outputPath,
          templatePath: options.templatePath
        });

        if (options.nonInteractive) {
          // Validate required parameters for non-interactive mode
          const required = ['serviceName', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId'];
          const missing = required.filter(key => !options[key]);

          if (missing.length > 0) {
            console.error(chalk.red(`Missing required parameters: ${missing.join(', ')}`));
            console.error(chalk.yellow('Use --help for parameter details'));
            process.exit(1);
          }

          // Convert CLI options to core inputs
          const coreInputs = {
            serviceName: options.serviceName,
            serviceType: options.serviceType,
            domainName: options.domainName,
            cloudflareToken: options.cloudflareToken,
            cloudflareAccountId: options.cloudflareAccountId,
            cloudflareZoneId: options.cloudflareZoneId,
            environment: options.environment
          };

          await orchestrator.runNonInteractive(coreInputs);
        } else {
          await orchestrator.runInteractive();
        }

        console.log(chalk.green('\n✓ Service creation completed successfully!'));
        console.log(chalk.cyan('Next steps:'));
        console.log(chalk.white('  1. cd into your new service directory'));
        console.log(chalk.white('  2. Run npm install'));
        console.log(chalk.white('  3. Configure additional settings in src/config/domains.js'));
        console.log(chalk.white('  4. Run npm run deploy to deploy to Cloudflare'));

      } catch (error) {
        console.error(chalk.red(`\n✗ Service creation failed: ${error.message}`));
        if (error.details) {
          console.error(chalk.yellow(`Details: ${error.details}`));
        }
        process.exit(1);
      }
    });
}
