#!/usr/bin/env node

/**
 * Customer Configuration Management CLI
 * Manages multi-environment, multi-customer configuration structure
 * Integrates with Lego Framework domain and feature flag systems
 */

import { CustomerConfigurationManager } from '../../../src/config/customers.js';

const command = process.argv[2];
const args = process.argv.slice(3);

const customerManager = new CustomerConfigurationManager();

async function main() {
  try {
    // Load existing customers from filesystem
    await customerManager.loadExistingCustomers();

    switch (command) {
      case 'create-customer':
        await handleCreateCustomer(args);
        break;

      case 'validate':
        await handleValidate();
        break;

      case 'show':
        await handleShow(args);
        break;

      case 'deploy-command':
        await handleDeployCommand(args);
        break;

      case 'list':
        await handleList();
        break;

      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleCreateCustomer(args) {
  const [customerName, domain] = args;

  if (!customerName) {
    console.error('Usage: customer-config create-customer <customer-name> [domain]');
    process.exit(1);
  }

  console.log(`🏗️ Creating customer configuration: ${customerName}`);

  // Pass framework mode flag to skip strict validation
  const customerInfo = await customerManager.createCustomer(customerName, domain, {
    skipValidation: true,
    isFrameworkMode: true
  });

  console.log(`\n🎉 Customer ${customerName} configuration created successfully!`);
  console.log(`\n📋 Customer Details:`);
  console.log(`   Name: ${customerInfo.name}`);
  console.log(`   Domain: ${customerInfo.domain || 'Not specified'}`);
  console.log(`   Config Path: ${customerInfo.configPath}`);
  console.log(`   Environments: ${customerInfo.environments.join(', ')}`);

  console.log(`\n📋 Next steps:`);
  console.log(`1. Review generated configs in: config/customers/${customerName}/`);
  console.log(`2. Update domain-specific URLs if needed`);
  console.log(`3. Generate production secrets: npm run security:generate-key ${customerName}`);
  console.log(`4. Set production secrets: wrangler secret put KEY_NAME --env production`);
}

async function handleValidate() {
  console.log('🔍 Validating customer configuration structure...\n');

  const result = await customerManager.validateConfigs();

  if (result.valid) {
    console.log('✅ All customer configurations are valid');
  } else {
    console.log('❌ Configuration validation failed');
    result.errors.forEach(error => console.log(`   - ${error}`));
    process.exit(1);
  }
}

async function handleShow(args) {
  const [customerName, environment] = args;

  if (!customerName || !environment) {
    console.error('Usage: customer-config show <customer> <environment>');
    process.exit(1);
  }

  const config = customerManager.showConfig(customerName, environment);

  console.log(`🔍 Effective configuration: ${customerName}/${environment}\n`);

  if (config.variables.base) {
    console.log('📋 Base variables:');
    Object.entries(config.variables.base).slice(0, 10).forEach(([key, value]) => {
      console.log(`   ${key}=${value}`);
    });
    if (Object.keys(config.variables.base).length > 10) {
      console.log('   ...');
    }
    console.log('');
  }

  if (config.variables.customer) {
    console.log(`📋 Customer ${environment} variables:`);
    Object.entries(config.variables.customer).slice(0, 15).forEach(([key, value]) => {
      console.log(`   ${key}=${value}`);
    });
    if (Object.keys(config.variables.customer).length > 15) {
      console.log('   ...');
    }
    console.log('');
  }

  if (config.features && Object.keys(config.features).length > 0) {
    console.log('🚩 Customer features:');
    Object.entries(config.features).forEach(([feature, enabled]) => {
      console.log(`   ${feature}: ${enabled ? '✅' : '❌'}`);
    });
  }
}

async function handleDeployCommand(args) {
  const [customerName, environment] = args;

  if (!customerName || !environment) {
    console.error('Usage: customer-config deploy-command <customer> <environment>');
    process.exit(1);
  }

  const deployInfo = customerManager.getDeployCommand(customerName, environment);

  console.log(`📋 Deploy command for ${customerName}/${environment}:`);
  console.log(`   ${deployInfo.command}`);
  console.log(`\n💡 Ensure customer config is loaded: ${deployInfo.configPath}`);
}

async function handleList() {
  const customers = customerManager.listCustomers();

  if (customers.length === 0) {
    console.log('📋 No customers configured');
    return;
  }

  console.log('📋 Configured customers:\n');

  customers.forEach(customer => {
    console.log(`🏢 ${customer.name}`);
    console.log(`   Domain: ${customer.domain || 'Not specified'}`);
    console.log(`   Environments: ${customer.environments.join(', ')}`);
    console.log(`   Created: ${customer.createdAt}`);
    console.log(`   Config: config/customers/${customer.name}/`);
    console.log('');
  });
}

function showHelp() {
  console.log('Customer Configuration Management Tool\n');
  console.log('Available commands:');
  console.log('  create-customer <name> [domain]  - Create new customer config from template');
  console.log('  validate                         - Validate configuration structure');
  console.log('  show <customer> <environment>    - Show effective configuration');
  console.log('  deploy-command <customer> <env>  - Get deployment command');
  console.log('  list                             - List all configured customers');
  console.log('\nExamples:');
  console.log('  customer-config create-customer acmecorp acmecorp.com');
  console.log('  customer-config validate');
  console.log('  customer-config show acmecorp production');
  console.log('  customer-config list');
  console.log('\nIntegration:');
  console.log('  This tool integrates with Lego Framework domain and feature flag systems.');
  console.log('  Customer configurations are automatically registered as domains.');
}

main().catch(error => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});