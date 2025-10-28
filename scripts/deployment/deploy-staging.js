#!/usr/bin/env node

/**
 * Staging Deployment Script
 *
 * This script sets up staging environment variables and deploys to staging.
 * Make sure to copy .env.staging.example to .env.staging and fill in your credentials.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

const ENV_FILE = '.env.staging';
const CONFIG_FILE = 'config/staging-deployment.json';

console.log(chalk.blue('🚀 Starting Staging Deployment...\n'));

// Check if staging environment file exists
if (!existsSync(ENV_FILE)) {
  console.error(chalk.red(`❌ Error: ${ENV_FILE} not found!`));
  console.log(chalk.yellow('Please copy .env.staging.example to .env.staging and fill in your credentials.'));
  process.exit(1);
}

// Load environment variables from staging file
try {
  const envContent = readFileSync(ENV_FILE, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
      }
    }
  });

  // Set environment variables
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  console.log(chalk.green('✅ Staging environment variables loaded'));

} catch (error) {
  console.error(chalk.red('❌ Error loading staging environment variables:'), error.message);
  process.exit(1);
}

// Validate required environment variables
const requiredVars = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(chalk.red('❌ Missing required environment variables:'), missingVars.join(', '));
  process.exit(1);
}

console.log(chalk.green('✅ All required credentials present'));

// Check if config file exists
if (!existsSync(CONFIG_FILE)) {
  console.error(chalk.red(`❌ Error: ${CONFIG_FILE} not found!`));
  process.exit(1);
}

console.log(chalk.green('✅ Staging deployment configuration found'));

// Run deployment with dry-run first
console.log(chalk.yellow('\n🔍 Running dry-run deployment first...'));

try {
  const dryRunCommand = `npx clodo-service deploy --config-file ${CONFIG_FILE} --environment staging --dry-run --verbose`;
  console.log(chalk.gray(`Executing: ${dryRunCommand}`));

  execSync(dryRunCommand, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  console.log(chalk.green('✅ Dry-run completed successfully'));

} catch (error) {
  console.error(chalk.red('❌ Dry-run failed:'), error.message);
  console.log(chalk.yellow('Please fix the issues above before proceeding with actual deployment.'));
  process.exit(1);
}

// Ask for confirmation before actual deployment
console.log(chalk.yellow('\n⚠️  Dry-run successful! Ready for actual deployment.'));
console.log(chalk.cyan('This will deploy to staging environment. Continue? (y/N): '));

// For automated deployment, we'll proceed automatically
console.log(chalk.blue('🚀 Proceeding with staging deployment...\n'));

try {
  const deployCommand = `npx clodo-service deploy --config-file ${CONFIG_FILE} --environment staging --verbose`;
  console.log(chalk.gray(`Executing: ${deployCommand}`));

  execSync(deployCommand, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  console.log(chalk.green('\n🎉 Staging deployment completed successfully!'));
  console.log(chalk.cyan('\n📋 Next steps:'));
  console.log(chalk.white('  1. Verify staging deployment at: https://staging.example.com'));
  console.log(chalk.white('  2. Check monitoring dashboard'));
  console.log(chalk.white('  3. Run integration tests against staging'));
  console.log(chalk.white('  4. If successful, proceed to production deployment'));

} catch (error) {
  console.error(chalk.red('\n❌ Staging deployment failed:'), error.message);
  console.log(chalk.yellow('Check the error details above and try again.'));
  process.exit(1);
}