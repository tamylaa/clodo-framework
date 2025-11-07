/**
 * Deploy Command - Smart minimal input deployment with service detection
 * 
 * Input Strategy: SMART MINIMAL WITH DOMAIN ROUTING
 * - Detects Clodo services OR legacy services (wrangler.toml)
 * - Supports multiple manifest locations
 * - Uses DomainRouter for intelligent domain selection
 * - Gathers credentials smartly: env vars → flags → interactive collection with auto-fetch
 * - Validates token and fetches account ID & zone ID from Cloudflare
 * - REFACTORED (Task 3.2): Integrates with MultiDomainOrchestrator for full deployment orchestration
 * - REFACTORED (UX): Modularized with helper functions for better maintainability
 */

import chalk from 'chalk';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { ManifestLoader } from '../../lib/shared/config/manifest-loader.js';
import { CloudflareServiceValidator } from '../../lib/shared/config/cloudflare-service-validator.js';
import { DeploymentCredentialCollector } from '../../lib/shared/deployment/credential-collector.js';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigLoader } from '../../lib/shared/utils/config-loader.js';
import { DomainRouter } from '../../lib/shared/routing/domain-router.js';
import { MultiDomainOrchestrator } from '../../src/orchestration/multi-domain-orchestrator.js';

// Import modular helpers
import { detectExistingResources, displayDeploymentPlan } from './helpers/resource-detection.js';
import { confirmDeployment, displayDeploymentResults, displayNextSteps } from './helpers/deployment-ui.js';
import { runPostDeploymentVerification } from './helpers/deployment-verification.js';
import { handleDeploymentError } from './helpers/error-recovery.js';

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
    .option('--all-domains', 'Deploy to all configured domains (ignores --domain flag)')
    .option('--dry-run', 'Simulate deployment without making changes')
    .option('-y, --yes', 'Skip confirmation prompts (for CI/CD)')
    .option('--service-path <path>', 'Path to service directory', '.')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (options) => {
      try {
        const output = new (await import('../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
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

        // Substitute environment variables in config
        configFileData = configLoader.substituteEnvironmentVariables(configFileData);

        // Merge config file defaults with CLI options (CLI takes precedence)
        const mergedOptions = configLoader.merge(configFileData, options);

        output.info('🚀 Clodo Service Deployment');

        // Step 1: Load and validate service configuration
        const servicePath = resolve(mergedOptions.servicePath || '.');
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
        console.log(chalk.blue(`ℹ️  Configuration loaded from: ${serviceConfig.foundAt}`));

        // Step 2: Smart credential gathering with interactive collection
        // Uses DeploymentCredentialCollector which:
        // - Checks flags and env vars first
        // - Prompts for API token if needed
        // - Validates token and auto-fetches account ID & zone ID
        // - Caches credentials for future use
        const credentialCollector = new DeploymentCredentialCollector({
          servicePath: servicePath,
          quiet: mergedOptions.quiet
        });

        let credentials;
        try {
          credentials = await credentialCollector.collectCredentials({
            token: mergedOptions.token,
            accountId: mergedOptions.accountId,
            zoneId: mergedOptions.zoneId
          });
        } finally {
          credentialCollector.cleanup();
        }

        // Step 3: Initialize DomainRouter for intelligent domain selection
        // REFACTORED (Task 3.2): Use DomainRouter for domain detection and selection
        console.log(chalk.cyan('\n🗺️  Detecting available domains...\n'));

        const router = new DomainRouter({
          environment: mergedOptions.environment || 'production',
          verbose: options.verbose,
          configPath: options.configPath,
          disableOrchestrator: false, // We'll use the orchestrator for deployment
          orchestratorOptions: {
            dryRun: options.dryRun || false,
            cloudflareToken: credentials.token,
            cloudflareAccountId: credentials.accountId
          }
        });

        // Detect domains from manifest
        let detectedDomains = [];
        const manifest = serviceConfig.manifest;
        const config = manifest.deployment || manifest.configuration || {};
        const domainsConfig = config.domains || [];
        
        if (Array.isArray(domainsConfig) && domainsConfig.length > 0) {
          // Handle both array of strings and array of objects
          detectedDomains = domainsConfig.map(d => {
            if (typeof d === 'string') return d;
            if (typeof d === 'object' && d.name) return d.name;
            return null;
          }).filter(d => d !== null);
        }

        // If no domains in manifest but we have a selected zone from credentials, use that
        if (detectedDomains.length === 0 && credentials.zoneName) {
          detectedDomains = [credentials.zoneName];
          if (!options.quiet) {
            console.log(chalk.blue(`ℹ️  Using selected Cloudflare domain: ${credentials.zoneName}`));
          }
        }

        // If still no domains and it's a detected CF service, use default
        if (detectedDomains.length === 0 && manifest._source === 'cloudflare-service-detected') {
          // For detected CF services, use default
          detectedDomains = ['workers.cloudflare.com'];
          if (!options.quiet) {
            console.log(chalk.blue(`ℹ️  No custom domains configured, using default: workers.cloudflare.com`));
          }
        } else if (detectedDomains.length > 0 && !options.quiet && !credentials.zoneName) {
          console.log(chalk.blue(`ℹ️  Found ${detectedDomains.length} configured domain(s) in manifest`));
        }

        // Domain selection: check CLI flag first, then prompt user
        let selectedDomain = mergedOptions.domain;
        
        if (selectedDomain && !options.quiet) {
          console.log(chalk.blue(`ℹ️  Using domain from --domain flag: ${selectedDomain}`));
        }

        if (!selectedDomain && detectedDomains.length > 0) {
          if (detectedDomains.length === 1) {
            // Only one domain, use it directly
            selectedDomain = detectedDomains[0];
            if (!options.quiet) {
              console.log(chalk.green(`✓ Auto-selected only available domain: ${selectedDomain}`));
            }
          } else {
            // Multiple domains available - let user choose
            console.log(chalk.cyan('📍 Available domains:'));
            detectedDomains.forEach((d, i) => {
              console.log(chalk.white(`  ${i + 1}) ${d}`));
            });
            
            // If running interactively, prompt user
            if (process.stdin.isTTY) {
              const { createPromptModule } = await import('inquirer');
              const prompt = createPromptModule();
              
              const response = await prompt([
                {
                  type: 'list',
                  name: 'selectedDomain',
                  message: 'Select domain to deploy to:',
                  choices: detectedDomains,
                  default: detectedDomains[0]
                }
              ]);
              
              selectedDomain = response.selectedDomain;
            } else {
              // Non-interactive mode: use first domain
              selectedDomain = detectedDomains[0];
              console.log(chalk.yellow(`⚠️  Non-interactive mode: using first domain: ${selectedDomain}`));
            }
          }
        }

        if (!selectedDomain) {
          if (!options.quiet) {
            console.error(chalk.yellow('⚠️  No domain configured for deployment'));
            console.error(chalk.gray('For Clodo services: add deployment.domains in clodo-service-manifest.json'));
            console.error(chalk.gray('For detected CF services: define routes in wrangler.toml'));
          }
          process.exit(1);
        }

        // Step 4: Validate domain configuration
        console.log(chalk.cyan('\n🔍 Validating domain configuration...\n'));

        const validation = router.validateConfiguration({
          domains: [selectedDomain],
          environment: mergedOptions.environment || 'production'
        });

        if (!validation.valid) {
          console.error(chalk.red('❌ Configuration validation failed:'));
          validation.errors.forEach(err => {
            console.error(chalk.yellow(`  • ${err}`));
          });
          process.exit(1);
        }

        if (validation.warnings && validation.warnings.length > 0) {
          console.log(chalk.yellow('⚠️  Configuration warnings:'));
          validation.warnings.forEach(warn => {
            console.log(chalk.gray(`  • ${warn}`));
          });
        }

        // Extract service metadata
        const serviceName = manifest.serviceName || 'unknown-service';
        const serviceType = manifest.serviceType || 'generic';

        // Step 5: Detect existing resources and display deployment plan
        const { existingWorker, existingDatabases, resourceDetectionFailed } = 
          await detectExistingResources(serviceName, manifest, credentials, output, options.verbose);

        displayDeploymentPlan({
          serviceName,
          serviceType,
          selectedDomain,
          environment: mergedOptions.environment,
          credentials,
          dryRun: options.dryRun,
          existingWorker,
          existingDatabases,
          resourceDetectionFailed,
          manifest
        });

        // Step 6: Get user confirmation
        const confirmed = await confirmDeployment(options);
        if (!confirmed) {
          process.exit(0);
        }

        // Step 5: Initialize MultiDomainOrchestrator for deployment
        // REFACTORED (Task 3.2): Direct orchestrator integration instead of external deployer
        console.log(chalk.cyan('\n⚙️  Initializing orchestration system...\n'));

        // Determine wrangler config path based on selected domain/zone
        // For multi-customer deployments, use customer-specific config if available
        let wranglerConfigPath;
        const configDir = join(servicePath, 'config');
        
        // Map domain to config file (customize this mapping for your setup)
        if (selectedDomain === 'clodo.dev' || credentials.cloudflareSettings?.zoneName === 'clodo.dev') {
          // Use config/wrangler.toml for clodo.dev domain
          const clodoConfigPath = join(configDir, 'wrangler.toml');
          if (existsSync(clodoConfigPath)) {
            wranglerConfigPath = clodoConfigPath;
            console.log(chalk.green(`✓ Using clodo.dev config: ${clodoConfigPath}`));
          }
        }
        // Add more domain mappings as needed:
        // else if (selectedDomain === 'customer2.com') {
        //   wranglerConfigPath = path.join(configDir, 'customers', 'customer2-wrangler.toml');
        // }
        
        // If no specific config found, use default (root wrangler.toml)
        if (!wranglerConfigPath) {
          console.log(chalk.yellow(`ℹ Using default wrangler.toml from service root`));
        }

        const orchestrator = new MultiDomainOrchestrator({
          domains: [selectedDomain],
          environment: mergedOptions.environment || 'production',
          dryRun: options.dryRun || false,
          skipTests: false,
          parallelDeployments: 1, // Single domain in this flow
          servicePath: servicePath,
          serviceName: serviceName, // Pass service name for custom domain construction
          wranglerConfigPath: wranglerConfigPath, // Pass custom config path if found
          // Use cloudflareSettings object for complete zone-specific configuration
          cloudflareSettings: credentials.cloudflareSettings,
          enablePersistence: !options.dryRun,
          rollbackEnabled: !options.dryRun,
          verbose: options.verbose
        });

        try {
          await orchestrator.initialize();
        } catch (err) {
          console.error(chalk.red('❌ Failed to initialize orchestrator'));
          console.error(chalk.yellow(`Error: ${err.message}`));
          if (process.env.DEBUG) {
            console.error(chalk.gray(err.stack));
          }
          process.exit(1);
        }

        // Step 7: Execute deployment via orchestrator
        console.log(chalk.cyan('🚀 Starting deployment via orchestrator...\n'));

        let result;
        try {
          result = await orchestrator.deploySingleDomain(selectedDomain, {
            manifest: manifest,
            credentials: credentials,
            dryRun: options.dryRun,
            environment: mergedOptions.environment || 'production'
          });
        } catch (deployError) {
          await handleDeploymentError(deployError, command, options);
        }

        // Step 8: Display deployment results
        displayDeploymentResults({
          result,
          serviceName,
          serviceType,
          selectedDomain,
          environment: mergedOptions.environment
        });

        // Step 9: Run post-deployment verification and health check
        await runPostDeploymentVerification(serviceName, result, credentials, {
          ...options,
          serviceName,
          customDomain: selectedDomain !== 'workers.cloudflare.com' ? selectedDomain : null
        });

        // Step 10: Display next steps
        displayNextSteps({
          result,
          selectedDomain,
          serviceName,
          dryRun: options.dryRun
        });

        if (process.env.DEBUG && result.details) {
          console.log(chalk.gray('📋 Full Result:'));
          console.log(chalk.gray(JSON.stringify(result, null, 2)));
        }

      } catch (error) {
        console.error(chalk.red(`\n❌ Deployment failed: ${error.message}`));

        if (error.message.includes('credentials') || error.message.includes('auth')) {
          console.error(chalk.yellow('\n💡 Credential Issue:'));
          console.error(chalk.white('  Check your API token, account ID, and zone ID'));
          console.error(chalk.white('  Visit: https://dash.cloudflare.com/profile/api-tokens'));
        }

        if (error.message.includes('domain') || error.message.includes('zone')) {
          console.error(chalk.yellow('\n💡 Domain Issue:'));
          console.error(chalk.white('  Verify domain exists in Cloudflare'));
          console.error(chalk.white('  Check API token has zone:read permissions'));
        }

        if (error.message.includes('orchestration') || error.message.includes('initialization')) {
          console.error(chalk.yellow('\n💡 Orchestration Issue:'));
          console.error(chalk.white('  Check MultiDomainOrchestrator configuration'));
          console.error(chalk.white('  Verify all modular components loaded correctly'));
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
