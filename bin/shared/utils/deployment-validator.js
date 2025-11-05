/**
 * Deployment Validator Utility
 * Pre-deployment validation and prerequisite checking
 * Extracted from clodo-service-old.js for modular reuse
 */

import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Validate deployment prerequisites before proceeding
 * @param {Object} coreInputs - Core deployment inputs
 * @param {Object} options - Deployment options
 * @returns {Promise<boolean>} True if all prerequisites are valid
 */
export async function validateDeploymentPrerequisites(coreInputs, options) {
  const issues = [];

  console.log(chalk.cyan('\n🔍 Pre-deployment Validation'));
  console.log(chalk.gray('─'.repeat(40)));

  // Check required fields
  if (!coreInputs.customer) {
    issues.push('Customer name is required');
  }
  if (!coreInputs.environment) {
    issues.push('Environment is required');
  }
  if (!coreInputs.domainName) {
    issues.push('Domain name is required');
  }
  if (!coreInputs.cloudflareToken) {
    issues.push('Cloudflare API token is required');
  }

  // Check Cloudflare token format (basic validation)
  if (coreInputs.cloudflareToken && !coreInputs.cloudflareToken.startsWith('CLOUDFLARE_API_TOKEN=')) {
    if (coreInputs.cloudflareToken.length < 40) {
      issues.push('Cloudflare API token appears to be invalid (too short)');
    }
  }

  // Check if service path exists
  if (options.servicePath && options.servicePath !== '.') {
    if (!existsSync(options.servicePath)) {
      issues.push(`Service path does not exist: ${options.servicePath}`);
    }
  }

  // Check for wrangler.toml if not dry run
  if (!options.dryRun) {
    const wranglerPath = join(options.servicePath || '.', 'wrangler.toml');
    if (!existsSync(wranglerPath)) {
      issues.push('wrangler.toml not found in service directory');
    }
  }

  // Report issues
  if (issues.length > 0) {
    console.log(chalk.red('\n❌ Validation Failed:'));
    issues.forEach(issue => {
      console.log(chalk.red(`   • ${issue}`));
    });
    console.log(chalk.gray('\n─'.repeat(40)));
    return false;
  }

  console.log(chalk.green('✅ All prerequisites validated'));
  console.log(chalk.gray('─'.repeat(40)));
  return true;
}

/**
 * Validate basic deployment inputs
 * @param {Object} inputs - Input object to validate
 * @param {Array<string>} requiredFields - Required field names
 * @returns {Object} Validation result { valid, errors }
 */
export function validateDeploymentInputs(inputs, requiredFields = ['customer', 'environment', 'domainName', 'cloudflareToken']) {
  const result = {
    valid: true,
    errors: []
  };

  // Handle null/undefined inputs
  if (!inputs) {
    result.errors.push('Input object is required');
    result.valid = false;
    return result;
  }

  requiredFields.forEach(field => {
    if (!inputs[field]) {
      result.errors.push(`${field} is required`);
      result.valid = false;
    }
  });

  return result;
}