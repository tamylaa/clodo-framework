/**
 * CLI Helpers - Shared utilities for all commands
 */

import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Load JSON configuration file
 */
export function loadJsonConfig(configPath) {
  try {
    const fullPath = resolve(configPath);
    if (!existsSync(fullPath)) {
      throw new Error(`Configuration file not found: ${fullPath}`);
    }

    const content = readFileSync(fullPath, 'utf8');
    const config = JSON.parse(content);

    // Validate required fields
    const required = ['customer', 'environment', 'domainName', 'cloudflareToken'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required configuration fields: ${missing.join(', ')}`);
    }

    console.log(chalk.green(`✅ Loaded configuration from: ${fullPath}`));
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Show progress indicator for deployment steps
 */
export function showProgress(message, duration = 2000) {
  return new Promise(resolve => {
    process.stdout.write(chalk.cyan(`⏳ ${message}...`));
    
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(spinner[i])} ${message}...`);
      i = (i + 1) % spinner.length;
    }, 100);
    
    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✅')} ${message}... Done!\n`);
      resolve();
    }, duration);
  });
}

/**
 * Early validation function to check prerequisites before deployment
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
 * Redact sensitive information from logs
 */
export function redactSensitiveInfo(text) {
  if (typeof text !== 'string') return text;
  
  // Patterns to redact
  const patterns = [
    // Cloudflare API tokens
    [/(CLOUDFLARE_API_TOKEN=?)(\w{20,})/gi, '$1[REDACTED]'],
    // Generic API tokens/keys
    [/(api[_-]?token|api[_-]?key|auth[_-]?token)["']?[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, '$1: [REDACTED]'],
    // Passwords
    [/(password|passwd|pwd)["']?[:=]\s*["']?([^"'\s]{3,})["']?/gi, '$1: [REDACTED]'],
    // Secrets
    [/(secret|key)["']?[:=]\s*["']?([a-zA-Z0-9_-]{10,})["']?/gi, '$1: [REDACTED]'],
    // Account IDs (partial redaction)
    [/(account[_-]?id|zone[_-]?id)["']?[:=]\s*["']?([a-zA-Z0-9]{8})([a-zA-Z0-9]{24,})["']?/gi, '$1: $2[REDACTED]']
  ];
  
  let redacted = text;
  patterns.forEach(([pattern, replacement]) => {
    redacted = redacted.replace(pattern, replacement);
  });
  
  return redacted;
}
