#!/usr/bin/env node

/**
 * Cross-platform deployment helper
 * 
 * Handles npm config variables properly across Windows, Linux, and Mac.
 * PowerShell doesn't expand $npm_config_customer, so we use process.env instead.
 * 
 * Usage:
 *   npm run deploy:dev --customer=wetechfounders
 *   npm run deploy:staging --customer=wetechfounders
 *   npm run deploy:prod --customer=wetechfounders
 * 
 * Or use the framework CLI directly:
 *   npx clodo-service deploy --customer=wetechfounders --env=development
 */

import { execSync } from 'child_process';

const environment = process.argv[2] || 'development';
const customer = process.env.npm_config_customer;

if (!customer) {
  console.error('❌ Error: Customer name required');
  console.error('');
  console.error('Usage:');
  console.error('  npm run deploy:dev --customer=wetechfounders');
  console.error('  npm run deploy:staging --customer=greatidude');
  console.error('  npm run deploy:prod --customer=tamyla');
  console.error('');
  console.error('Or use the framework CLI directly:');
  console.error('  npx clodo-service deploy --customer=wetechfounders --env=development');
  process.exit(1);
}

console.log(`🚀 Deploying ${customer} to ${environment}...`);

try {
  // Use framework CLI (clodo-service has more features than clodo-security)
  execSync(`npx clodo-service deploy --customer=${customer} --env=${environment}`, {
    stdio: 'inherit'
  });
} catch (error) {
  process.exit(error.status || 1);
}
