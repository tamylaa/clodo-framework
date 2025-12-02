#!/usr/bin/env node

/**
 * Simple CLI - Simplified interface for Clodo Framework
 *
 * A streamlined CLI that provides easy access to core framework functionality
 * using the unified simple API with sensible defaults.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Clodo } from '../src/simple-api.js';

// Create program instance
const program = new Command();

program
  .name('clodo')
  .description('Simple CLI for Clodo Framework - streamlined service management')
  .version('1.0.0');

/**
 * Create command - Simple service creation
 */
program
  .command('create <name>')
  .description('Create a new service with minimal configuration')
  .option('-t, --type <type>', 'Service type', 'generic')
  .option('-d, --domain <domain>', 'Domain name', 'example.com')
  .option('-e, --env <env>', 'Environment', 'development')
  .option('-o, --output <path>', 'Output directory', '.')
  .option('--token <token>', 'Cloudflare API token')
  .option('--account-id <id>', 'Cloudflare account ID')
  .option('--zone-id <id>', 'Cloudflare zone ID')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`🚀 Creating service: ${name}`));

      const result = await Clodo.createService({
        name,
        type: options.type,
        domain: options.domain,
        environment: options.env,
        outputPath: options.output,
        credentials: {
          token: options.token,
          accountId: options.accountId,
          zoneId: options.zoneId
        }
      });

      console.log(chalk.green(`✅ ${result.message}`));
      console.log(chalk.white(`📁 Created in: ${result.outputPath}`));

    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Deploy command - Simple service deployment
 */
program
  .command('deploy')
  .description('Deploy a service with smart configuration detection')
  .option('-p, --path <path>', 'Service directory path', '.')
  .option('-e, --env <env>', 'Target environment', 'production')
  .option('-d, --domain <domain>', 'Specific domain to deploy to')
  .option('--dry-run', 'Simulate deployment without changes')
  .option('--token <token>', 'Cloudflare API token')
  .option('--account-id <id>', 'Cloudflare account ID')
  .option('--zone-id <id>', 'Cloudflare zone ID')
  .action(async (options) => {
    try {
      console.log(chalk.cyan(`🚀 Deploying service...`));

      const result = await Clodo.deploy({
        servicePath: options.path,
        environment: options.env,
        domain: options.domain,
        dryRun: options.dryRun,
        credentials: {
          token: options.token,
          accountId: options.accountId,
          zoneId: options.zoneId
        }
      });

      console.log(chalk.green(`✅ ${result.message}`));
      if (result.deployedDomains) {
        console.log(chalk.white(`🌐 Deployed to: ${result.deployedDomains.join(', ')}`));
      }

    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Validate command - Simple service validation
 */
program
  .command('validate')
  .description('Validate a service configuration')
  .option('-p, --path <path>', 'Service directory path', '.')
  .option('-r, --report', 'Export validation report')
  .action(async (options) => {
    try {
      console.log(chalk.cyan(`🔍 Validating service...`));

      const result = await Clodo.validate({
        servicePath: options.path,
        exportReport: options.report
      });

      if (result.success) {
        console.log(chalk.green(`✅ ${result.message}`));
      } else {
        console.log(chalk.yellow(`⚠️  ${result.message}`));
        if (result.issues && result.issues.length > 0) {
          console.log(chalk.white('Issues found:'));
          result.issues.forEach((issue, index) => {
            console.log(chalk.white(`  ${index + 1}. ${issue}`));
          });
        }
      }

    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Info command - Show framework information
 */
program
  .command('info')
  .description('Show framework information')
  .action(() => {
    const info = Clodo.getInfo();
    console.log(chalk.cyan(`${info.name} v${info.version}`));
    console.log(chalk.white(info.description));
    console.log(chalk.white('\nFeatures:'));
    info.features.forEach(feature => {
      console.log(chalk.white(`  • ${feature}`));
    });
  });

// Parse command line arguments
program.parse();