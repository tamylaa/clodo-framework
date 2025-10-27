/**
 * Deploy Command - Smart minimal input deployment with service detection
 * 
 * Input Strategy: SMART MINIMAL
 * - Detects Clodo services OR legacy services (wrangler.toml)
 * - Supports multiple manifest locations
 * - Gathers credentials smartly: env vars → flags → interactive collection with auto-fetch
 * - Validates token and fetches account ID & zone ID from Cloudflare
 * - Integrates with modular-enterprise-deploy.js for clean CLI-based deployment
 */

import chalk from 'chalk';
import { resolve } from 'path';
import { ManifestLoader } from '../shared/config/manifest-loader.js';
import { CloudflareServiceValidator } from '../shared/config/cloudflare-service-validator.js';
import { DeploymentCredentialCollector } from '../shared/deployment/credential-collector.js';

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
            // Pass false because we're validating a detected service, not a Clodo manifest
            ManifestLoader.printValidationErrors(serviceConfig.validationResult, false);
          }
          process.exit(1);
        }

        // Print service info and validation results
        if (serviceConfig.validationResult) {
          CloudflareServiceValidator.printValidationReport(serviceConfig.validationResult.validation);
        }
        ManifestLoader.printManifestInfo(serviceConfig.manifest);
        console.log(chalk.gray(`Configuration loaded from: ${serviceConfig.foundAt}\n`));

        // Step 2: Smart credential gathering with interactive collection
        // Uses DeploymentCredentialCollector which:
        // - Checks flags and env vars first
        // - Prompts for API token if needed
        // - Validates token and auto-fetches account ID & zone ID
        // - Caches credentials for future use
        const credentialCollector = new DeploymentCredentialCollector({
          servicePath: servicePath,
          quiet: options.quiet
        });

        let credentials;
        try {
          credentials = await credentialCollector.collectCredentials({
            token: options.token,
            accountId: options.accountId,
            zoneId: options.zoneId
          });
        } finally {
          credentialCollector.cleanup();
        }

        // Step 3: Extract configuration from manifest
        const manifest = serviceConfig.manifest;
        const config = manifest.deployment || manifest.configuration || {};
        
        // Extract service metadata
        const serviceName = manifest.serviceName || 'unknown-service';
        const serviceType = manifest.serviceType || 'generic';
        
        // For detected Cloudflare services, domain comes from wrangler.toml or environment
        // For Clodo services, use first domain if available
        let domain = null;
        const domains = config.domains || [];
        
        if (domains.length > 0) {
          // Clodo service with multiple domains
          domain = domains[0].name || domains[0];
        } else if (manifest._source === 'cloudflare-service-detected') {
          // Detected CF service - get domain from route or config
          // For now, use a placeholder since we don't have explicit domain routing in detected services
          domain = 'workers.cloudflare.com';
          console.log(chalk.gray('Note: Using Cloudflare Workers default domain (add routes in wrangler.toml for custom domains)'));
        }

        if (!domain && !options.quiet) {
          console.error(chalk.yellow('⚠️  No domain configured for deployment'));
          console.error(chalk.gray('For Clodo services: add deployment.domains in clodo-service-manifest.json'));
          console.error(chalk.gray('For detected CF services: define routes in wrangler.toml'));
        }

        console.log(chalk.cyan('📋 Deployment Plan:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(chalk.white(`Service:  ${serviceName}`));
        console.log(chalk.white(`Type:     ${serviceType}`));
        if (domain) {
          console.log(chalk.white(`Domain:   ${domain}`));
        }
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
