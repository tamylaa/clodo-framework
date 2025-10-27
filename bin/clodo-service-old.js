#!/usr/bin/env node

/**
 * Clodo Framework - Unified Three-Tier Service Management CLI
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
import { join } from 'path';
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';
import { InputCollector } from '../src/service-management/InputCollector.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const program = new Command();

program
  .name('clodo-service')
  .description('Unified conversational CLI for Clodo Framework service lifecycle management')
  .version('1.0.0');

// Helper function to load JSON configuration file
function loadJsonConfig(configPath) {
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

// Simple progress indicator for deployment steps
function showProgress(message, duration = 2000) {
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

// Early validation function to check prerequisites before deployment
async function validateDeploymentPrerequisites(coreInputs, options) {
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
    const { existsSync } = await import('fs');
    if (!existsSync(options.servicePath)) {
      issues.push(`Service path does not exist: ${options.servicePath}`);
    }
  }
  
  // Check for wrangler.toml if not dry run
  if (!options.dryRun) {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
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

// Main interactive command
program
  .command('create')
  .description('Create a new Clodo service with conversational setup')
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
    console.log(chalk.yellow('This command is deprecated. Use "clodo-service create" instead.'));
    const createCommand = program.commands.find(cmd => cmd.name() === 'create');
    if (createCommand && createCommand._actionHandler) {
      await createCommand._actionHandler(options || {});
    }
  });

program
  .command('init-service')
  .description('Legacy alias for create command')
  .action(async (options) => {
    console.log(chalk.yellow('This command is deprecated. Use "clodo-service create" instead.'));
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
    console.log(chalk.cyan('Available Clodo Framework Service Types:'));
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

// Show usage statistics and plan information
/*
program
  .command('usage')
  .description('Show usage statistics and subscription information')
  .action(() => {
    const stats = usageTracker.getUsageStats();
    const license = usageTracker.getLicense();
    const plan = usageTracker.isPaidUser() ? 'Paid' : 'Free';

    console.log(chalk.cyan('\n📊 Clodo Framework Usage Statistics'));
    console.log('='.repeat(50));

    if (license && (license.plan === 'founder' || license.plan === 'admin')) {
      console.log(chalk.magenta(`👑 Plan: ${license.plan.charAt(0).toUpperCase() + license.plan.slice(1)} (Unlimited)`));
      console.log(chalk.magenta(`👤 User: ${license.userName} <${license.userEmail}>`));
    } else {
      console.log(chalk.white(`Plan: ${plan}`));
    }

    console.log(chalk.white(`Services Created: ${stats.currentUsage}${stats.limit !== -1 ? `/${stats.limit}` : ''}`));
    console.log(chalk.white(`Environments: ${stats.environments.join(', ')}`));
    console.log(chalk.white(`Premium Features: ${stats.premiumFeatures ? '✅' : '❌'}`));

    if (stats.daysUntilExpiry && stats.daysUntilExpiry < 36500) { // Not showing expiry for founder licenses
      console.log(chalk.white(`Days Until Expiry: ${stats.daysUntilExpiry}`));
    } else if (license && (license.plan === 'founder' || license.plan === 'admin')) {
      console.log(chalk.magenta(`⏰ Status: Never Expires`));
    }

    if (!usageTracker.isPaidUser()) {
      console.log(chalk.yellow('\n🚀 Upgrade to unlock unlimited usage!'));
      console.log(chalk.white('Visit: https://clodo-framework.com/pricing'));
    } else if (license && (license.plan === 'founder' || license.plan === 'admin')) {
      console.log(chalk.magenta('\n🎉 You have unlimited founder access!'));
      console.log(chalk.white('Thank you for building Clodo Framework!'));
    }

    console.log('');
  });
*/

// Upgrade to paid plan (simulated for now)
/*
program
  .command('upgrade')
  .description('Upgrade to a paid plan')
  .option('--plan <plan>', 'Plan type: monthly, annual, lifetime', 'monthly')
  .option('--simulate', 'Simulate upgrade without actual payment')
  .action((options) => {
    if (options.simulate) {
      // Simulate license activation
      const license = usageTracker.activateLicense(options.plan, 'simulated');
      console.log(chalk.green('\n🎉 Successfully upgraded to Clodo Framework!'));
      console.log('='.repeat(50));
      console.log(chalk.white(`Plan: ${options.plan.charAt(0).toUpperCase() + options.plan.slice(1)}`));
      console.log(chalk.white(`License ID: ${license.id}`));
      console.log(chalk.white(`Expires: ${new Date(license.expiry).toLocaleDateString()}`));
      console.log(chalk.green('\n✅ You now have unlimited access to all features!'));
      console.log(chalk.cyan('Run "clodo-service usage" to see your new limits.'));
    } else {
      console.log(chalk.cyan('\n🚀 Ready to upgrade to Clodo Framework?'));
      console.log('='.repeat(50));
      console.log(chalk.white('Choose your plan:'));
      console.log(chalk.white('• Monthly: $19/month'));
      console.log(chalk.white('• Annual: $189/year (save 17%)'));
      console.log(chalk.white('• Lifetime: $999 (one-time payment)'));
      console.log('');
      console.log(chalk.yellow('For testing, use: clodo-service upgrade --simulate --plan annual'));
      console.log(chalk.cyan('Real payments coming soon at: https://clodo-framework.com/pricing'));
    }
    console.log('');
  });
*/

// Generate founder license (for framework builder and selected team)
/*
program
  .command('generate-founder-license')
  .description('Generate unlimited founder license (admin only)')
  .option('--email <email>', 'User email address', 'founder@clodo-framework.com')
  .option('--name <name>', 'User display name', 'Framework Builder')
  .option('--admin', 'Generate admin license instead of founder')
  .action((options) => {
    try {
      let license;
      if (options.admin) {
        license = usageTracker.generateAdminLicense(options.email, options.name);
        console.log(chalk.green('\n🔑 Admin License Generated Successfully!'));
        console.log('='.repeat(50));
        console.log(chalk.white(`License Type: Admin (Unlimited Access)`));
      } else {
        license = usageTracker.generateFounderLicense(options.email, options.name);
        console.log(chalk.green('\n👑 Founder License Generated Successfully!'));
        console.log('='.repeat(50));
        console.log(chalk.white(`License Type: Founder (Unlimited Access)`));
      }

      console.log(chalk.white(`License ID: ${license.id}`));
      console.log(chalk.white(`User: ${license.userName} <${license.userEmail}>`));
      console.log(chalk.white(`Generated: ${new Date(license.generated).toLocaleString()}`));
      console.log(chalk.green('\n✅ Unlimited access granted - never expires!'));
      console.log(chalk.cyan('Run "clodo-service usage" to verify your access.'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error generating license: ${error.message}`));
      process.exit(1);
    }
    console.log('');
  });
*/

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

// Professional Edition: assess command (from clodo-orchestration)
program
  .command('assess [service-path]')
  .description('Run intelligent capability assessment (requires @tamyla/clodo-orchestration)')
  .option('--export <file>', 'Export assessment results to JSON file')
  .option('--domain <domain>', 'Domain name for assessment')
  .option('--service-type <type>', 'Service type for assessment')
  .option('--token <token>', 'Cloudflare API token')
  .action(async (servicePath, options) => {
    try {
      // Try to load professional orchestration package
      let orchestrationModule;
      try {
        orchestrationModule = await import('@tamyla/clodo-orchestration');
      } catch (err) {
        console.error(chalk.red('❌ clodo-orchestration package not found'));
        console.error(chalk.yellow('💡 Install with: npm install @tamyla/clodo-orchestration'));
        process.exit(1);
      }

      const { 
        CapabilityAssessmentEngine, 
        ServiceAutoDiscovery,
        runAssessmentWorkflow 
      } = orchestrationModule;

      const targetPath = servicePath || process.cwd();
      console.log(chalk.cyan('\n🧠 Professional Capability Assessment'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white(`Service Path: ${targetPath}`));
      
      if (options.domain) {
        console.log(chalk.white(`Domain: ${options.domain}`));
      }
      if (options.serviceType) {
        console.log(chalk.white(`Service Type: ${options.serviceType}`));
      }
      console.log(chalk.gray('─'.repeat(60)));

      // Use the assessment workflow
      const assessment = await runAssessmentWorkflow({
        servicePath: targetPath,
        domain: options.domain,
        serviceType: options.serviceType,
        token: options.token || process.env.CLOUDFLARE_API_TOKEN
      });

      // Display results
      console.log(chalk.cyan('\n✅ Assessment Results'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white(`Service Type: ${assessment.mergedInputs?.serviceType || assessment.serviceType || 'Not determined'}`));
      console.log(chalk.white(`Confidence: ${assessment.confidence}%`));
      
      if (assessment.gapAnalysis?.missing) {
        console.log(chalk.white(`Missing Capabilities: ${assessment.gapAnalysis.missing.length}`));
        if (assessment.gapAnalysis.missing.length > 0) {
          console.log(chalk.yellow('\n⚠️  Missing:'));
          assessment.gapAnalysis.missing.forEach(gap => {
            console.log(chalk.yellow(`   • ${gap.capability}: ${gap.reason || 'Not available'}`));
          });
        }
      }

      console.log(chalk.gray('─'.repeat(60)));

      // Export results if requested
      if (options.export) {
        require('fs').writeFileSync(options.export, JSON.stringify(assessment, null, 2));
        console.log(chalk.green(`\n📄 Results exported to: ${options.export}`));
      }

    } catch (error) {
      console.error(chalk.red(`Assessment failed: ${error.message}`));
      if (process.env.DEBUG) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Deploy command - using existing InputCollector + CustomerConfigLoader (reusable pattern)
program
  .command('deploy')
  .description('Deploy service using three-tier input architecture')
  .option('-c, --customer <name>', 'Customer name')
  .option('-e, --env <environment>', 'Target environment (development, staging, production)')
  .option('-i, --interactive', 'Interactive mode (review confirmations)', true)
  .option('--non-interactive', 'Non-interactive mode (use stored config)')
  .option('--config-file <file>', 'Load configuration from JSON file')
  .option('--defaults', 'Use default values where possible (non-interactive)')
  .option('--quiet', 'Quiet mode - minimal output for CI/CD')
  .option('--json-output', 'Output results as JSON for scripting')
  .option('--dry-run', 'Simulate deployment without making changes')
  .option('--domain <domain>', 'Domain name (overrides stored config)')
  .option('--service-path <path>', 'Path to service directory', '.')
  .action(async (options) => {
    try {
      // Use existing reusable components
      const { InputCollector } = await import('../dist/service-management/InputCollector.js');
      const { UnifiedConfigManager } = await import('../dist/utils/config/unified-config-manager.js');
      const { ConfirmationHandler } = await import('../dist/service-management/handlers/ConfirmationHandler.js');
      const { MultiDomainOrchestrator } = await import('../dist/orchestration/multi-domain-orchestrator.js');
      
      console.log(chalk.cyan('\n🚀 Clodo Framework Deployment'));
      console.log(chalk.white('Using Three-Tier Input Architecture\n'));
      
      const isInteractive = options.interactive && !options.nonInteractive && !options.configFile && !options.defaults;
      const isQuiet = options.quiet;
      const jsonOutput = options.jsonOutput;
      const configManager = new UnifiedConfigManager({
        configDir: join(process.cwd(), 'config', 'customers')
      });
      const inputCollector = new InputCollector({ interactive: isInteractive });
      const confirmationHandler = new ConfirmationHandler({ interactive: isInteractive });
      
      let coreInputs = {};
      let source = 'interactive';
      
      // Interactive mode: run full three-tier input collection
      if (isInteractive) {
          const collectionResult = await inputCollector.collect();
          coreInputs = collectionResult.flatInputs;
          
          // The three-tier collection already included confirmations
          // Skip the separate confirmation step since it was done in collect()
        } else {
          // Non-interactive mode: load from config file or stored config
          
          // Load from JSON config file if specified
          if (options.configFile) {
            coreInputs = loadJsonConfig(options.configFile);
            source = 'config-file';
          } else if (options.customer && options.env) {
            // Check UnifiedConfigManager for existing config
            if (configManager.configExists(options.customer, options.env)) {
              console.log(chalk.green(`✅ Found existing configuration for ${options.customer}/${options.env}\n`));
              configManager.displayCustomerConfig(options.customer, options.env);
              
              // Non-interactive: auto-load the config
              const storedConfig = configManager.loadCustomerConfig(options.customer, options.env);
              if (storedConfig) {
                coreInputs = storedConfig;
                source = 'stored-config';
              }
            } else {
              console.log(chalk.yellow(`⚠️  No configuration found for ${options.customer}/${options.env}`));
              console.log(chalk.white('Collecting inputs interactively...\n'));
            }
          } else {
            console.log(chalk.yellow('⚠️  Customer and environment not specified'));
            console.log(chalk.white('Use --customer and --env options, or run in interactive mode'));
            process.exit(1);
          }
          
          // Collect inputs if we don't have them from stored config
          if (!coreInputs.cloudflareAccountId) {
            console.log(chalk.cyan('📊 Tier 1: Core Input Collection\n'));
            
            // Collect basic info with smart customer selection
            let customer = options.customer;
            if (!customer) {
              const customers = configManager.listCustomers();
              if (customers.length > 0) {
                const selection = await inputCollector.question('Select customer (enter number or name): ');
                
                // Try to parse as number first
                const num = parseInt(selection);
                if (!isNaN(num) && num >= 1 && num <= customers.length) {
                  customer = customers[num - 1];
                  console.log(chalk.green(`✓ Selected: ${customer}\n`));
                } else if (customers.includes(selection)) {
                  customer = selection;
                  console.log(chalk.green(`✓ Selected: ${customer}\n`));
                } else {
                  // New customer name
                  customer = selection;
                  console.log(chalk.yellow(`⚠️  Creating new customer: ${customer}\n`));
                }
              } else {
                customer = await inputCollector.question('Customer name: ');
              }
            }
            const environment = options.env || await inputCollector.collectEnvironment();
            const serviceName = await inputCollector.collectServiceName();
            const serviceType = await inputCollector.collectServiceType();
            
            // Collect Cloudflare token
            const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN || await inputCollector.collectCloudflareToken();
            
            // Use CloudflareAPI for automatic domain discovery
            console.log(chalk.cyan('⏳ Fetching Cloudflare configuration...'));
            const cloudflareConfig = await inputCollector.collectCloudflareConfigWithDiscovery(
              cloudflareToken,
              options.domain
            );
            
            // Combine all inputs
            coreInputs = {
              customer,
              environment,
              serviceName,
              serviceType,
              domainName: cloudflareConfig.domainName,
              cloudflareToken,
              cloudflareAccountId: cloudflareConfig.accountId,
              cloudflareZoneId: cloudflareConfig.zoneId
            };
            
            source = 'interactive';
          }
          
          // Allow domain override
          if (options.domain) {
            coreInputs.domainName = options.domain;
          }
          
          // Early validation before proceeding
          const isValid = await validateDeploymentPrerequisites(coreInputs, options);
          if (!isValid) {
            console.log(chalk.red('\n❌ Deployment cancelled due to validation errors.'));
            console.log(chalk.cyan('💡 Fix the issues above and try again.'));
            process.exit(1);
          }
          
          // Tier 2: Generate smart confirmations using existing ConfirmationHandler
          // Skip if interactive mode (confirmations already done in three-tier collection)
          const confirmations = isInteractive 
            ? {} // Confirmations already collected in interactive mode
            : await confirmationHandler.generateAndConfirm(coreInputs);
          
          // Show deployment summary
          console.log(chalk.cyan('\n📊 Deployment Summary'));
          console.log(chalk.gray('─'.repeat(60)));
          
          console.log(chalk.white(`Source:        ${source}`));
          console.log(chalk.white(`Customer:      ${coreInputs.customer}`));
          console.log(chalk.white(`Environment:   ${coreInputs.environment}`));
          console.log(chalk.white(`Domain:        ${coreInputs.domainName}`));
          console.log(chalk.white(`Account ID:    ${coreInputs.cloudflareAccountId ? coreInputs.cloudflareAccountId.substring(0, 8) + '...' : 'N/A'}`));
          console.log(chalk.white(`Zone ID:       ${coreInputs.cloudflareZoneId ? coreInputs.cloudflareZoneId.substring(0, 8) + '...' : 'N/A'}`));
          
          if (confirmations.workerName) {
            console.log(chalk.white(`Worker:        ${confirmations.workerName}`));
          }
          if (confirmations.databaseName) {
            console.log(chalk.white(`Database:      ${confirmations.databaseName}`));
          }
          
          console.log(chalk.gray('─'.repeat(60)));
          
          if (options.dryRun) {
            console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
          }
          
          // Tier 3: Execute deployment
          console.log(chalk.cyan('\n⚙️  Tier 3: Automated Deployment\n'));
          
          // OPTIONAL: Try to load professional orchestration package if available
          let professionalOrchestration = null;
          try {
            const { runAssessmentWorkflow } = await import('@tamyla/clodo-orchestration');
            professionalOrchestration = { runAssessmentWorkflow };
            console.log(chalk.cyan('📊 Professional Edition (clodo-orchestration) detected'));
          } catch (err) {
            // clodo-orchestration not installed, continue with standard assessment
            if (process.env.DEBUG) {
              console.log(chalk.gray(`   ℹ️  clodo-orchestration not available: ${err.message}`));
            }
          }
          
          // INTEGRATION: Add intelligent service discovery and assessment
          console.log(chalk.cyan('🧠 Performing Intelligent Service Assessment...'));
          const { CapabilityAssessmentEngine } = await import('../dist/service-management/CapabilityAssessmentEngine.js');
          const assessor = new CapabilityAssessmentEngine(options.servicePath || process.cwd());
          
          try {
            const assessment = await assessor.assessCapabilities({
              serviceName: coreInputs.serviceName,
              serviceType: coreInputs.serviceType,
              environment: coreInputs.environment,
              domainName: coreInputs.domainName
            });
            
            // Display assessment results
            console.log(chalk.green('✅ Assessment Complete'));
            console.log(chalk.white(`   Service Type: ${assessment.mergedInputs.serviceType || 'Not determined'}`));
            console.log(chalk.white(`   Confidence: ${assessment.confidence}%`));
            console.log(chalk.white(`   Missing Capabilities: ${assessment.gapAnalysis.missing.length}`));
            
            // Show any blocking issues
            const blockingIssues = assessment.gapAnalysis.missing.filter(gap => gap.priority === 'blocked');
            if (blockingIssues.length > 0) {
              console.log(chalk.yellow('\n⚠️  Permission-limited capabilities detected:'));
              blockingIssues.forEach(issue => {
                console.log(chalk.yellow(`   - ${issue.capability}: ${issue.reason}`));
              });
            }
            
            console.log('');
            
          } catch (assessmentError) {
            console.log(chalk.yellow('⚠️  Assessment failed, proceeding with deployment:'), assessmentError.message);
            console.log('');
          }
          
          const orchestrator = new MultiDomainOrchestrator({
            domains: [coreInputs.domainName],
            environment: coreInputs.environment,
            dryRun: options.dryRun,
            servicePath: options.servicePath,
            cloudflareToken: coreInputs.cloudflareToken,
            cloudflareAccountId: coreInputs.cloudflareAccountId
          });
          
          // Show progress for initialization
          await showProgress('Initializing deployment orchestrator', 1500);
          await orchestrator.initialize();
          
          console.log(chalk.cyan('🚀 Starting deployment...\n'));
          
          // Show progress during deployment
          const deployPromise = orchestrator.deploySingleDomain(coreInputs.domainName, {
            ...coreInputs,
            ...confirmations,
            servicePath: options.servicePath
          });
          
          // Show deployment progress
          const progressMessages = [
            'Preparing deployment configuration',
            'Setting up Cloudflare resources', 
            'Deploying worker script',
            'Configuring database connections',
            'Setting up domain routing',
            'Running final health checks'
          ];
          
          let progressIndex = 0;
          const progressInterval = setInterval(() => {
            if (progressIndex < progressMessages.length) {
              console.log(chalk.gray(`   ${progressMessages[progressIndex]}`));
              progressIndex++;
            }
          }, 2000);
          
          const result = await deployPromise;
          clearInterval(progressInterval);
          
          // Fill in remaining progress messages quickly
          while (progressIndex < progressMessages.length) {
            console.log(chalk.gray(`   ${progressMessages[progressIndex]}`));
            progressIndex++;
          }
          
          // Display results with cleaner formatting
          console.log(chalk.green('\n✅ Deployment Completed Successfully!'));
          console.log(chalk.gray('─'.repeat(60)));
          
          // Show key information prominently
          if (result.url || confirmations.deploymentUrl) {
            console.log(chalk.white(`🌐 Service URL:    ${chalk.bold(result.url || confirmations.deploymentUrl)}`));
          }
          
          console.log(chalk.white(`👤 Customer:      ${coreInputs.customer}`));
          console.log(chalk.white(`🏭 Environment:   ${coreInputs.environment}`));
          console.log(chalk.white(`🔧 Worker:        ${confirmations.workerName || 'N/A'}`));
          
          if (result.health) {
            const healthStatus = result.health.toLowerCase().includes('ok') || result.health.toLowerCase().includes('healthy') 
              ? chalk.green('✅ Healthy') 
              : chalk.yellow('⚠️ Check required');
            console.log(chalk.white(`💚 Health:        ${healthStatus}`));
          }
          
          console.log(chalk.gray('─'.repeat(60)));
          
          // Save deployment configuration for future reuse
          try {
            console.log(chalk.cyan('\n💾 Saving deployment configuration...'));
            
            const configFile = await configManager.saveCustomerConfig(
              coreInputs.customer,
              coreInputs.environment,
              {
                coreInputs,
                confirmations,
                result
              }
            );
            
            console.log(chalk.green('   ✅ Configuration saved for future deployments'));
            console.log(chalk.gray(`   📄 File: ${configFile}`));
          } catch (saveError) {
            console.log(chalk.yellow(`   ⚠️  Could not save configuration: ${saveError.message}`));
            console.log(chalk.gray('   Deployment succeeded, but you may need to re-enter values next time.'));
          }
          
          console.log(chalk.cyan('\n📋 Next Steps:'));
          console.log(chalk.white(`   • Test deployment: curl ${result.url || confirmations.deploymentUrl}/health`));
          console.log(chalk.white(`   • Monitor logs: wrangler tail ${confirmations.workerName}`));
          console.log(chalk.white(`   • View dashboard: https://dash.cloudflare.com`));
        }
        
    } catch (error) {
      console.error(chalk.red(`\n❌ Deployment failed: ${error.message}`));
      
      // Show helpful context based on error type
      if (error.message.includes('timeout')) {
        console.log(chalk.yellow('\n💡 Troubleshooting Tips:'));
        console.log(chalk.white('  • Use non-interactive mode: npx clodo-service deploy --customer=NAME --env=ENV --non-interactive'));
        console.log(chalk.white('  • Set DEBUG=1 for detailed logs: DEBUG=1 npx clodo-service deploy'));
        console.log(chalk.white('  • Check your terminal supports readline'));
      } else if (error.message.includes('domain')) {
        console.log(chalk.yellow('\n💡 Domain Issues:'));
        console.log(chalk.white('  • Verify domain exists in Cloudflare dashboard'));
        console.log(chalk.white('  • Check API token has zone:read permissions'));
        console.log(chalk.white('  • Try specifying domain: --domain=example.com'));
      } else if (error.message.includes('readline')) {
        console.log(chalk.yellow('\n💡 Terminal Issues:'));
        console.log(chalk.white('  • Try a different terminal (cmd, bash, powershell)'));
        console.log(chalk.white('  • Use --non-interactive with config file'));
      }
      
      if (process.env.DEBUG) {
        console.error(chalk.gray('\nFull Stack Trace:'));
        console.error(chalk.gray(error.stack));
      } else {
        console.log(chalk.gray('\nRun with DEBUG=1 for full stack trace'));
      }
      
      process.exit(1);
    }
  });

// Utility function to redact sensitive information from logs
function redactSensitiveInfo(text) {
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

program.parse();