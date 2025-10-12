#!/usr/bin/env node

/**
 * Customer Configuration Management CLI
 * Manages multi-environment, multi-customer configuration structure
 * Integrates with Clodo Framework domain and feature flag systems
 */

import { CustomerConfigCLI } from '../../../dist/config/CustomerConfigCLI.js';
import { resolve } from 'path';

// Parse command line arguments
const argv = process.argv.slice(2);
let configDir = null;
let command = null;
let args = [];

// Extract --config-dir parameter if present
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--config-dir' && i + 1 < argv.length) {
    configDir = resolve(argv[i + 1]);
    i++; // Skip the next argument (the path)
  } else if (!command) {
    command = argv[i];
  } else {
    args.push(argv[i]);
  }
}

// Default to current working directory if not specified
if (!configDir) {
  configDir = resolve(process.cwd(), 'config');
}

async function main() {
  const cli = new CustomerConfigCLI({ configDir });
  await cli.initialize();

  try {
    switch (command) {
      case 'create-customer':
        const [customerName, domain] = args;
        const result = await cli.createCustomer(customerName, domain);
        if (result.success) {
          console.log(`\n🎉 Customer ${customerName} configuration created successfully!`);
          console.log(`\n📋 Customer Details:`);
          console.log(`   Name: ${result.customer.name}`);
          console.log(`   Domain: ${result.customer.domain || 'Not specified'}`);
          console.log(`   Config Path: ${result.customer.configPath}`);
          console.log(`   Environments: ${result.customer.environments.join(', ')}`);
          console.log(`\n📋 Next steps:`);
          console.log(`1. Review generated configs in: config/customers/${customerName}/`);
          console.log(`2. Update domain-specific URLs if needed`);
          console.log(`3. Generate production secrets: npm run security:generate-key ${customerName}`);
          console.log(`4. Set production secrets: wrangler secret put KEY_NAME --env production`);
        } else {
          console.error(`❌ Failed to create customer: ${result.error}`);
          process.exit(1);
        }
        break;

      case 'validate':
        const validateResult = await cli.validateConfigurations();
        if (validateResult.valid) {
          console.log('✅ All customer configurations are valid');
        } else {
          console.log('❌ Configuration validation failed');
          validateResult.errors.forEach(error => console.log(`   - ${error}`));
          process.exit(1);
        }
        break;

      case 'show':
        const [customerNameShow, environment] = args;
        const showResult = cli.showConfiguration(customerNameShow, environment);
        if (showResult.success) {
          console.log(`🔍 Effective configuration: ${customerNameShow}/${environment}\n`);
          if (showResult.config.variables?.base) {
            console.log('📋 Base variables:');
            Object.entries(showResult.config.variables.base).slice(0, 10).forEach(([key, value]) => {
              console.log(`   ${key}=${value}`);
            });
            if (Object.keys(showResult.config.variables.base).length > 10) {
              console.log('   ...');
            }
            console.log('');
          }
          if (showResult.config.variables?.customer) {
            console.log(`📋 Customer ${environment} variables:`);
            Object.entries(showResult.config.variables.customer).slice(0, 15).forEach(([key, value]) => {
              console.log(`   ${key}=${value}`);
            });
            if (Object.keys(showResult.config.variables.customer).length > 15) {
              console.log('   ...');
            }
            console.log('');
          }
          if (showResult.config.features && Object.keys(showResult.config.features).length > 0) {
            console.log('🚩 Customer features:');
            Object.entries(showResult.config.features).forEach(([feature, enabled]) => {
              console.log(`   ${feature}: ${enabled ? '✅' : '❌'}`);
            });
          }
        } else {
          console.error(`❌ Failed to show configuration: ${showResult.error}`);
          process.exit(1);
        }
        break;

      case 'deploy-command':
        const [customerNameDeploy, environmentDeploy] = args;
        const deployResult = cli.getDeployCommand(customerNameDeploy, environmentDeploy);
        if (deployResult.success) {
          console.log(`📋 Deploy command for ${customerNameDeploy}/${environmentDeploy}:`);
          console.log(`   ${deployResult.command}`);
          console.log(`\n💡 Ensure customer config is loaded: ${deployResult.configPath}`);
        } else {
          console.error(`❌ Failed to get deploy command: ${deployResult.error}`);
          process.exit(1);
        }
        break;

      case 'list':
        const listResult = cli.listCustomers();
        if (listResult.success && listResult.customers.length > 0) {
          console.log('📋 Configured customers:\n');
          listResult.customers.forEach(customer => {
            console.log(`🏢 ${customer.name}`);
            console.log(`   Domain: ${customer.customerDomain || customer.domain || 'Not configured'}`);
            console.log(`   Account ID: ${customer.accountId ? `${customer.accountId.substring(0, 8)}...${customer.accountId.substring(24)}` : 'Not configured'}`);
            console.log(`   Zone ID: ${customer.zoneId ? `${customer.zoneId.substring(0, 8)}...` : 'Not configured'}`);
            if (customer.databaseId) {
              console.log(`   Database: ${customer.databaseName || 'Unnamed'} (${customer.databaseId.substring(0, 8)}...)`);
            }
            console.log(`   Secrets: ${customer.hasSecrets ? '✅ Managed via wrangler secret commands' : '❌ Not configured'}`);
            console.log(`   Environments: ${customer.environments.join(', ')}`);
            console.log(`   Config Path: config/customers/${customer.name}/`);
            console.log('');
          });
        } else if (listResult.success) {
          console.log('📋 No customers configured');
          console.log('\n💡 Tip: Run "clodo-customer-config create-customer <name>" to create your first customer');
        } else {
          console.error(`❌ Failed to list customers: ${listResult.error}`);
          process.exit(1);
        }
        break;

      default:
        console.log('Customer Configuration Management Tool\n');
        console.log('Usage:');
        console.log('  clodo-customer-config [--config-dir <path>] <command> [args]\n');
        console.log('Options:');
        console.log('  --config-dir <path>  - Path to config directory (default: ./config)\n');
        console.log('Available commands:');
        console.log('  create-customer <name> [domain]  - Create new customer config from template');
        console.log('  validate                         - Validate configuration structure');
        console.log('  show <customer> <environment>    - Show effective configuration');
        console.log('  deploy-command <customer> <env>  - Get deployment command');
        console.log('  list                             - List all configured customers');
        console.log('\nExamples:');
        console.log('  clodo-customer-config create-customer acmecorp acmecorp.com');
        console.log('  clodo-customer-config validate');
        console.log('  clodo-customer-config show acmecorp production');
        console.log('  clodo-customer-config list');
        console.log('  clodo-customer-config --config-dir /path/to/service/config validate');
        console.log('\nIntegration:');
        console.log('  This tool integrates with Clodo Framework domain and feature flag systems.');
        console.log('  Customer configurations are automatically registered as domains.');
        console.log('  When run from a service directory, it uses ./config by default.');
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});