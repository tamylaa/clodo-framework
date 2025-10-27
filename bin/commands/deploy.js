/**
 * Deploy Command - Smart minimal input deployment with service detection
 * 
 * Input Strategy: SMART MINIMAL
 * - Detects Clodo services OR legacy services (wrangler.toml)
 * - Supports multiple manifest locations
 * - Gathers credentials smartly: env vars → flags → fail with helpful message
 * - Integrates with modular-enterprise-deploy.js for clean CLI-based deployment
 */

import chalk from 'chalk';
import { resolve } from 'path';
import { ManifestLoader } from '../shared/config/manifest-loader.js';
import { CloudflareServiceValidator } from '../shared/config/cloudflare-service-validator.js';

export function registerDeployCommand(program) {
  program
    .command('deploy')
    .description('Deploy a Clodo service with smart credential handling')
    .option('--token <token>', 'Cloudflare API token')
    .option('--account-id <id>', 'Cloudflare account ID')
    .option('--zone-id <id>', 'Cloudflare zone ID')
    .option('--dry-run', 'Simulate deployment without making changes')
    .option('--quiet', 'Quiet mode - minimal output')
    .option('--service-path <path>', 'Path to service directory', '.')
    .action(async (options) => {
      try {
        console.log(chalk.cyan('\n🚀 Clodo Service Deployment\n'));

        // Step 1: Load and validate service configuration
        const servicePath = resolve(options.servicePath);
        const serviceConfig = await ManifestLoader.loadAndValidateCloudflareService(servicePath);

        if (!serviceConfig.manifest) {
          if (serviceConfig.error === 'NOT_A_CLOUDFLARE_SERVICE') {
            ManifestLoader.printNotCloudflareServiceError(servicePath);
          } else if (serviceConfig.error === 'CLOUDFLARE_SERVICE_INVALID') {
            ManifestLoader.printValidationErrors(serviceConfig.validationResult);
          }
          process.exit(1);
        }

        // Print service info and validation results
        if (serviceConfig.validationResult) {
          CloudflareServiceValidator.printValidationReport(serviceConfig.validationResult.validation);
        }
        ManifestLoader.printManifestInfo(serviceConfig.manifest);
        console.log(chalk.gray(`Configuration loaded from: ${serviceConfig.foundAt}\n`));

        // Step 2: Smart credential gathering
        // Priority: flags → environment variables → fail with helpful message
        const credentials = {
          token: options.token || process.env.CLOUDFLARE_API_TOKEN,
          accountId: options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID,
          zoneId: options.zoneId || process.env.CLOUDFLARE_ZONE_ID
        };

        // Check for missing credentials
        const missing = [];
        if (!credentials.token) missing.push('CLOUDFLARE_API_TOKEN');
        if (!credentials.accountId) missing.push('CLOUDFLARE_ACCOUNT_ID');
        if (!credentials.zoneId) missing.push('CLOUDFLARE_ZONE_ID');

        if (missing.length > 0) {
          console.error(chalk.red('❌ Missing required Cloudflare credentials\n'));
          console.error(chalk.white('Please provide via:'));
          console.error(chalk.cyan('  Environment Variables:'));
          missing.forEach(key => {
            console.error(chalk.white(`    export ${key}=<your-${key.toLowerCase()}>`));
          });
          console.error(chalk.cyan('\n  Command Flags:'));
          if (missing.includes('CLOUDFLARE_API_TOKEN')) {
            console.error(chalk.white('    --token <token>'));
          }
          if (missing.includes('CLOUDFLARE_ACCOUNT_ID')) {
            console.error(chalk.white('    --account-id <id>'));
          }
          if (missing.includes('CLOUDFLARE_ZONE_ID')) {
            console.error(chalk.white('    --zone-id <id>'));
          }
          console.error(chalk.cyan('\n  Example:'));
          console.error(chalk.white('    npx clodo-service deploy --token abc123 --account-id xyz789 --zone-id def456'));
          console.error(chalk.white('    OR'));
          console.error(chalk.white('    export CLOUDFLARE_API_TOKEN=abc123'));
          console.error(chalk.white('    export CLOUDFLARE_ACCOUNT_ID=xyz789'));
          console.error(chalk.white('    export CLOUDFLARE_ZONE_ID=def456'));
          console.error(chalk.white('    npx clodo-service deploy\n'));
          process.exit(1);
        }

        // Step 3: Extract configuration from manifest
        const manifest = serviceConfig.manifest;
        const config = manifest.deployment || manifest.configuration || {};
        const domains = config.domains || [];

        if (domains.length === 0) {
          console.error(chalk.red('❌ No domains configured in service manifest'));
          console.error(chalk.yellow('Add domain configuration to: clodo-service-manifest.json'));
          process.exit(1);
        }

        console.log(chalk.cyan('📋 Deployment Plan:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.white(`Service:  ${serviceName}`));
        console.log(chalk.white(`Type:     ${serviceType}`));
        console.log(chalk.white(`Domain:   ${domain}`));
        console.log(chalk.white(`Account:  ${credentials.accountId.substring(0, 8)}...`));
        console.log(chalk.white(`Zone:     ${credentials.zoneId.substring(0, 8)}...`));
        console.log(chalk.gray('─'.repeat(50)));

        if (options.dryRun) {
          console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
        }

        // Step 4: Load and call modular deployer
        console.log(chalk.cyan('\n⚙️  Initializing deployment system...\n'));

        let ModularEnterpriseDeployer;
        try {
          const module = await import('../../deployment/modular-enterprise-deploy.js');
          ModularEnterpriseDeployer = module.ModularEnterpriseDeployer || module.default;
        } catch (err) {
          console.error(chalk.red('❌ Failed to load deployment system'));
          console.error(chalk.yellow(`Error: ${err.message}`));
          if (process.env.DEBUG) {
            console.error(chalk.gray(err.stack));
          }
          process.exit(1);
        }

        if (!ModularEnterpriseDeployer) {
          console.error(chalk.red('❌ ModularEnterpriseDeployer not found in deployment module'));
          process.exit(1);
        }

        // Create deployer instance with gathered credentials
        const deployer = new ModularEnterpriseDeployer({
          apiToken: credentials.token,
          accountId: credentials.accountId,
          zoneId: credentials.zoneId,
          domain: domain,
          dryRun: options.dryRun,
          quiet: options.quiet,
          servicePath: servicePath,
          serviceName: serviceName,
          serviceType: serviceType
        });

        // Run deployment
        console.log(chalk.cyan('🚀 Starting deployment...\n'));

        const result = await deployer.run({
          manifest: manifest,
          credentials: credentials,
          dryRun: options.dryRun
        });

        // Display results
        console.log(chalk.green('\n✅ Deployment Completed Successfully!\n'));
        console.log(chalk.gray('─'.repeat(50)));

        if (result.url) {
          console.log(chalk.white(`🌐 Service URL: ${chalk.bold(result.url)}`));
        }

        console.log(chalk.white(`📦 Service: ${serviceName}`));
        console.log(chalk.white(`🔧 Type: ${serviceType}`));
        console.log(chalk.white(`🌍 Domain: ${domain}`));

        if (result.workerId) {
          console.log(chalk.white(`👤 Worker ID: ${result.workerId}`));
        }

        if (result.status) {
          const statusColor = result.status.toLowerCase().includes('success') 
            ? chalk.green 
            : chalk.yellow;
          console.log(chalk.white(`📊 Status: ${statusColor(result.status)}`));
        }

        console.log(chalk.gray('─'.repeat(50)));

        // Next steps
        if (!options.dryRun) {
          console.log(chalk.cyan('\n💡 Next Steps:'));
          console.log(chalk.white('  • Test deployment: curl ' + (result.url || `https://${domain}`)));
          console.log(chalk.white('  • View logs: wrangler tail ' + serviceName));
          console.log(chalk.white('  • Monitor: https://dash.cloudflare.com'));
        }

        if (process.env.DEBUG && result.details) {
          console.log(chalk.gray('\n📋 Full Result:'));
          console.log(chalk.gray(JSON.stringify(result, null, 2)));
        }

      } catch (error) {
        console.error(chalk.red(`\n❌ Deployment failed: ${error.message}`));

        if (error.message.includes('credentials') || error.message.includes('auth')) {
          console.error(chalk.yellow('\n💡 Credential Issue:'));
          console.error(chalk.white('  Check your API token, account ID, and zone ID'));
          console.error(chalk.white('  Visit: https://dash.cloudflare.com/profile/api-tokens'));
        }

        if (error.message.includes('domain')) {
          console.error(chalk.yellow('\n💡 Domain Issue:'));
          console.error(chalk.white('  Verify domain exists in Cloudflare'));
          console.error(chalk.white('  Check API token has zone:read permissions'));
        }

        if (process.env.DEBUG) {
          console.error(chalk.gray('\nFull Stack Trace:'));
          console.error(chalk.gray(error.stack));
        } else {
          console.error(chalk.gray('Run with DEBUG=1 for full stack trace'));
        }

        process.exit(1);
      }
    });
}
