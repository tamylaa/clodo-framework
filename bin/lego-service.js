#!/usr/bin/env node

/**
 * Lego Framework - Unified Three-Tier Service Management CLI
 *
 * This tool provides a conversational interface for complete service lifecycle management
 * combining service creation, initialization, and deployment preparation.
 *
 * Three-Tier Architecture:
 * 1. Core Input Collection (6 required inputs)
 * 2. Smart Confirmations (15 derived values)
 * 3. Automated Generation (67 configurations + service manifest)
 */

import { Command } from 'commander';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';
import { InputCollector } from '../src/service-management/InputCollector.js';

const program = new Command();

program
  .name('lego-service')
  .description('Unified conversational CLI for Lego Framework service lifecycle management')
  .version('1.0.0');

// Main interactive command
program
  .command('create')
  .description('Create a new Lego service with conversational setup')
  .option('-n, --non-interactive', 'Run in non-interactive mode with all required parameters')
  .option('--service-name <name>', 'Service name (required in non-interactive mode)')
  .option('--service-type <type>', 'Service type: data-service, auth-service, content-service, api-gateway, generic', 'generic')
  .option('--domain-name <domain>', 'Domain name (required in non-interactive mode)')
  .option('--cloudflare-token <token>', 'Cloudflare API token (required in non-interactive mode)')
  .option('--cloudflare-account-id <id>', 'Cloudflare account ID (required in non-interactive mode)')
  .option('--cloudflare-zone-id <id>', 'Cloudflare zone ID (required in non-interactive mode)')
  .option('--environment <env>', 'Target environment: development, staging, production', 'development')
  .option('--output-path <path>', 'Output directory for generated service', '.')
  .option('--template-path <path>', 'Path to service templates', './templates')
  .action(async (options) => {
    try {
      const orchestrator = new ServiceOrchestrator({
        interactive: !options.nonInteractive,
        outputPath: options.outputPath,
        templatePath: options.templatePath
      });

      if (options.nonInteractive) {
        // Validate required parameters for non-interactive mode
        const required = ['serviceName', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId'];
        const missing = required.filter(key => !options[key]);

        if (missing.length > 0) {
          console.error(chalk.red(`Missing required parameters: ${missing.join(', ')}`));
          console.error(chalk.yellow('Use --help for parameter details'));
          process.exit(1);
        }

        // Convert CLI options to core inputs
        const coreInputs = {
          serviceName: options.serviceName,
          serviceType: options.serviceType,
          domainName: options.domainName,
          cloudflareToken: options.cloudflareToken,
          cloudflareAccountId: options.cloudflareAccountId,
          cloudflareZoneId: options.cloudflareZoneId,
          environment: options.environment
        };

        await orchestrator.runNonInteractive(coreInputs);
      } else {
        await orchestrator.runInteractive();
      }

      console.log(chalk.green('\n✓ Service creation completed successfully!'));
      console.log(chalk.cyan('Next steps:'));
      console.log(chalk.white('  1. cd into your new service directory'));
      console.log(chalk.white('  2. Run npm install'));
      console.log(chalk.white('  3. Configure additional settings in src/config/domains.js'));
      console.log(chalk.white('  4. Run npm run deploy to deploy to Cloudflare'));

    } catch (error) {
      console.error(chalk.red(`\n✗ Service creation failed: ${error.message}`));
      if (error.details) {
        console.error(chalk.yellow(`Details: ${error.details}`));
      }
      process.exit(1);
    }
  });

// Legacy command aliases for backward compatibility
program
  .command('create-service')
  .description('Legacy alias for create command')
  .action(async (options) => {
    console.log(chalk.yellow('This command is deprecated. Use "lego-service create" instead.'));
    const createCommand = program.commands.find(cmd => cmd.name() === 'create');
    if (createCommand && createCommand._actionHandler) {
      await createCommand._actionHandler(options || {});
    }
  });

program
  .command('init-service')
  .description('Legacy alias for create command')
  .action(async (options) => {
    console.log(chalk.yellow('This command is deprecated. Use "lego-service create" instead.'));
    const createCommand = program.commands.find(cmd => cmd.name() === 'create');
    if (createCommand && createCommand._actionHandler) {
      await createCommand._actionHandler(options || {});
    }
  });

// List available service types
program
  .command('list-types')
  .description('List available service types and their features')
  .action(() => {
    console.log(chalk.cyan('Available Lego Framework Service Types:'));
    console.log('');

    const types = {
      'data-service': ['Authentication', 'Authorization', 'File Storage', 'Search', 'Filtering', 'Pagination'],
      'auth-service': ['Authentication', 'Authorization', 'User Profiles', 'Email Notifications', 'Magic Link Auth'],
      'content-service': ['File Storage', 'Search', 'Filtering', 'Pagination', 'Caching'],
      'api-gateway': ['Authentication', 'Authorization', 'Rate Limiting', 'Caching', 'Monitoring'],
      'generic': ['Logging', 'Monitoring', 'Error Reporting']
    };

    Object.entries(types).forEach(([type, features]) => {
      console.log(chalk.green(`  ${type}`));
      features.forEach(feature => {
        console.log(chalk.white(`    • ${feature}`));
      });
      console.log('');
    });
  });

// Validate service configuration
program
  .command('validate <service-path>')
  .description('Validate an existing service configuration')
  .action(async (servicePath) => {
    try {
      const orchestrator = new ServiceOrchestrator();
      const result = await orchestrator.validateService(servicePath);

      if (result.valid) {
        console.log(chalk.green('✓ Service configuration is valid'));
      } else {
        console.log(chalk.red('✗ Service configuration has issues:'));
        result.issues.forEach(issue => {
          console.log(chalk.yellow(`  • ${issue}`));
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Validation failed: ${error.message}`));
      process.exit(1);
    }
  });

// Update existing service
program
  .command('update [service-path]')
  .description('Update an existing service configuration')
  .option('-i, --interactive', 'Run in interactive mode to select what to update')
  .option('--domain-name <domain>', 'Update domain name')
  .option('--cloudflare-token <token>', 'Update Cloudflare API token')
  .option('--cloudflare-account-id <id>', 'Update Cloudflare account ID')
  .option('--cloudflare-zone-id <id>', 'Update Cloudflare zone ID')
  .option('--environment <env>', 'Update target environment: development, staging, production')
  .option('--add-feature <feature>', 'Add a feature flag')
  .option('--remove-feature <feature>', 'Remove a feature flag')
  .option('--regenerate-configs', 'Regenerate all configuration files')
  .option('--fix-errors', 'Attempt to fix common configuration errors')
  .action(async (servicePath, options) => {
    try {
      const orchestrator = new ServiceOrchestrator();

      // Auto-detect service path if not provided
      if (!servicePath) {
        servicePath = await orchestrator.detectServicePath();
        if (!servicePath) {
          console.error(chalk.red('No service path provided and could not auto-detect service directory'));
          console.log(chalk.white('Please run this command from within a service directory or specify the path'));
          process.exit(1);
        }
        console.log(chalk.cyan(`Auto-detected service at: ${servicePath}`));
      }

      // Validate it's a service directory
      const isValid = await orchestrator.validateService(servicePath);
      if (!isValid.valid) {
        console.log(chalk.yellow('⚠️  Service has configuration issues. Use --fix-errors to attempt automatic fixes.'));
        if (!options.fixErrors) {
          console.log(chalk.white('Issues found:'));
          isValid.issues.forEach(issue => {
            console.log(chalk.yellow(`  • ${issue}`));
          });
          process.exit(1);
        }
      }

      if (options.interactive) {
        await orchestrator.runInteractiveUpdate(servicePath);
      } else {
        await orchestrator.runNonInteractiveUpdate(servicePath, options);
      }

      console.log(chalk.green('\n✓ Service update completed successfully!'));

    } catch (error) {
      console.error(chalk.red(`\n✗ Service update failed: ${error.message}`));
      if (error.details) {
        console.error(chalk.yellow(`Details: ${error.details}`));
      }
      if (error.recovery) {
        console.log(chalk.cyan('\n💡 Recovery suggestions:'));
        error.recovery.forEach(suggestion => {
          console.log(chalk.white(`  • ${suggestion}`));
        });
      }
      process.exit(1);
    }
  });

// Diagnose service issues
program
  .command('diagnose [service-path]')
  .description('Diagnose and report issues with an existing service')
  .option('--deep-scan', 'Perform deep analysis including dependencies and deployment readiness')
  .option('--export-report <file>', 'Export diagnostic report to file')
  .action(async (servicePath, options) => {
    try {
      const orchestrator = new ServiceOrchestrator();

      // Auto-detect service path if not provided
      if (!servicePath) {
        servicePath = await orchestrator.detectServicePath();
        if (!servicePath) {
          console.error(chalk.red('No service path provided and could not auto-detect service directory'));
          process.exit(1);
        }
      }

      console.log(chalk.cyan('🔍 Diagnosing service...'));
      const diagnosis = await orchestrator.diagnoseService(servicePath, options);

      // Display results
      console.log(chalk.cyan('\n📋 Diagnostic Report'));
      console.log(chalk.white(`Service: ${diagnosis.serviceName || 'Unknown'}`));
      console.log(chalk.white(`Path: ${servicePath}`));

      if (diagnosis.errors.length > 0) {
        console.log(chalk.red('\n❌ Critical Errors:'));
        diagnosis.errors.forEach(error => {
          console.log(chalk.red(`  • ${error.message}`));
          if (error.location) {
            console.log(chalk.gray(`    Location: ${error.location}`));
          }
          if (error.suggestion) {
            console.log(chalk.cyan(`    💡 ${error.suggestion}`));
          }
        });
      }

      if (diagnosis.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        diagnosis.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning.message}`));
          if (warning.suggestion) {
            console.log(chalk.cyan(`    💡 ${warning.suggestion}`));
          }
        });
      }

      if (diagnosis.recommendations.length > 0) {
        console.log(chalk.cyan('\n💡 Recommendations:'));
        diagnosis.recommendations.forEach(rec => {
          console.log(chalk.white(`  • ${rec}`));
        });
      }

      // Export report if requested
      if (options.exportReport) {
        await orchestrator.exportDiagnosticReport(diagnosis, options.exportReport);
        console.log(chalk.green(`\n📄 Report exported to: ${options.exportReport}`));
      }

      // Exit with error code if critical issues found
      if (diagnosis.errors.length > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`Diagnosis failed: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();