#!/usr/bin/env node

/**
 * Clodo Framework - Service Initializer
 *
 * Initializes a new service with auto-generated configurations,
 * eliminating the need for manual wrangler.toml and domains.js setup.
 *
 * This solves the workflow order problem by making configuration
 * generation the first step, not a prerequisite.
 */

import { program } from 'commander';
import { ServiceInitializer } from '../../src/service-management/ServiceInitializer.js';

const SERVICE_TYPES = ['generic', 'data-service', 'auth-service', 'content-service', 'api-gateway'];

class ServiceInitializerCLI {
  constructor() {
    this.setupCLI();
  }

  setupCLI() {
    program
      .name('clodo-init-service')
      .description('Initialize a Clodo Framework service with auto-generated configurations')
      .version('1.0.0')
      .argument('<service-name>', 'Name of the service to initialize')
      .option('-t, --type <type>', 'Service type', 'generic')
      .option('-d, --domains <domains>', 'Comma-separated list of domains (can include account info)')
      .option('-e, --env <environment>', 'Target environment', 'development')
      .option('--api-token <token>', 'Cloudflare API token for domain discovery')
      .option('--account-id <id>', 'Default Cloudflare account ID')
      .option('--zone-id <id>', 'Default Cloudflare zone ID')
      .option('-o, --output <path>', 'Output directory (services will be created in a services/ subdirectory)', process.cwd())
      .option('-f, --force', 'Overwrite existing service directory')
      .option('--dry-run', 'Show what would be created without creating files')
      .option('--multi-domain', 'Generate configurations for multiple domains')
      .action((serviceName, options) => {
        this.initializeService(serviceName, options);
      });

    program.on('--help', () => {
      console.log('\nExamples:');
      console.log('  clodo-init-service my-api --type api-gateway --domains "api.example.com,staging.example.com"');
      console.log('  clodo-init-service data-service --type data-service --api-token $CF_TOKEN');
      console.log('  clodo-init-service my-service --env production --account-id $CF_ACCOUNT_ID');
      console.log('\nServices are created in: ./services/{service-name}/');
      console.log('\nEnvironment Variables:');
      console.log('  CLOUDFLARE_API_TOKEN    - API token for domain discovery');
      console.log('  CLOUDFLARE_ACCOUNT_ID   - Account ID for configurations');
      console.log('  CLOUDFLARE_ZONE_ID      - Zone ID for domain configurations');
    });
  }

  async initializeService(serviceName, options) {
    try {
      console.log('🚀 Clodo Framework - Service Initializer');
      console.log('=' .repeat(50));
      console.log('📦 Using Clodo Framework ServiceInitializer module');
      console.log('');

      const initializer = new ServiceInitializer();
      const result = await initializer.initializeService(serviceName, {
        type: options.type,
        domains: options.domains,
        env: options.env,
        apiToken: options.apiToken,
        accountId: options.accountId,
        zoneId: options.zoneId,
        output: options.output,
        force: options.force,
        dryRun: options.dryRun
      });

      if (result.success) {
        if (result.dryRun) {
          console.log('📋 Dry run - would create the following:');
          const configs = Array.isArray(result.configs) ? result.configs : [result.configs];
          console.log('Files:', configs.filter(Boolean).join(', '));
          return;
        }

        console.log('\n✅ Service initialized successfully!');
        console.log('\n📝 Next steps:');
        console.log(`   cd services/${serviceName}`);
        console.log('   npm install');
        console.log('   npm run dev    # Start development server');
        console.log('   npm run deploy # Deploy to Cloudflare');
      } else {
        console.error('\n❌ Initialization failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Unexpected error:', error.message);
      process.exit(1);
    }
  }
}

// Run the CLI
const cli = new ServiceInitializerCLI();
program.parse();