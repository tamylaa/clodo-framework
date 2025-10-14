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
import { ServiceOrchestrator } from '../dist/service-management/ServiceOrchestrator.js';
import { InputCollector } from '../dist/service-management/InputCollector.js';

const program = new Command();

program
  .name('clodo-service')
  .description('Unified conversational CLI for Clodo Framework service lifecycle management')
  .version('1.0.0');

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

// Deploy command - using existing InputCollector + CustomerConfigLoader (reusable pattern)
program
  .command('deploy')
  .description('Deploy service using three-tier input architecture')
  .option('-c, --customer <name>', 'Customer name')
  .option('-e, --env <environment>', 'Target environment (development, staging, production)')
  .option('-i, --interactive', 'Interactive mode (review confirmations)', true)
  .option('--non-interactive', 'Non-interactive mode (use stored config)')
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
      
      const isInteractive = options.interactive && !options.nonInteractive;
      const configManager = new UnifiedConfigManager({
        configDir: join(process.cwd(), 'config', 'customers')
      });
      const inputCollector = new InputCollector({ interactive: isInteractive });
      const confirmationHandler = new ConfirmationHandler({ interactive: isInteractive });
      
      let coreInputs = {};
      let source = 'interactive';
      
      try {
        // Try UnifiedConfigManager to load existing config
        let storedConfig = null;
        
        if (options.customer && options.env) {
          // Check UnifiedConfigManager for existing config
          if (configManager.configExists(options.customer, options.env)) {
            console.log(chalk.green(`✅ Found existing configuration for ${options.customer}/${options.env}\n`));
            configManager.displayCustomerConfig(options.customer, options.env);
            
            if (!isInteractive) {
              // Non-interactive: auto-load the config
              storedConfig = configManager.loadCustomerConfig(options.customer, options.env);
              if (storedConfig) {
                coreInputs = storedConfig;
                source = 'stored-config';
              }
            } else {
              // Interactive: ask if they want to use it
              const useExisting = await inputCollector.question('\n   💡 Use existing configuration? (Y/n): ');
              
              if (useExisting.toLowerCase() !== 'n') {
                storedConfig = configManager.loadCustomerConfig(options.customer, options.env);
                if (storedConfig) {
                  coreInputs = storedConfig;
                  source = 'stored-config';
                }
              } else {
                console.log(chalk.white('\n   📝 Collecting new configuration...\n'));
              }
            }
          } else {
            console.log(chalk.yellow(`⚠️  No configuration found for ${options.customer}/${options.env}`));
            console.log(chalk.white('Collecting inputs interactively...\n'));
          }
          
          // Use stored config if we found it and haven't collected inputs yet
          if (storedConfig && !coreInputs.cloudflareAccountId) {
            coreInputs = storedConfig;
            source = 'stored-config';
            console.log(chalk.green('\n✅ Using stored configuration\n'));
          }
        } else if (!options.customer) {
          // Show available customers to help user
          const customers = configManager.listCustomers();
          if (customers.length > 0) {
            console.log(chalk.cyan('💡 Configured customers:'));
            customers.forEach((customer, index) => {
              console.log(chalk.white(`   ${index + 1}. ${customer}`));
            });
            console.log('');
          }
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
        
        // Tier 2: Generate smart confirmations using existing ConfirmationHandler
        // Note: ConfirmationEngine prints its own header
        const confirmations = await confirmationHandler.generateAndConfirm(coreInputs);
        
        // Show deployment summary
        console.log(chalk.cyan('\n📊 Deployment Summary'));
        console.log(chalk.gray('─'.repeat(60)));
        
        console.log(chalk.white(`Source:        ${source}`));
        console.log(chalk.white(`Customer:      ${coreInputs.customer}`));
        console.log(chalk.white(`Environment:   ${coreInputs.environment}`));
        console.log(chalk.white(`Domain:        ${coreInputs.domainName}`));
        console.log(chalk.white(`Account ID:    ${coreInputs.cloudflareAccountId?.substring(0, 8)}...`));
        console.log(chalk.white(`Zone ID:       ${coreInputs.cloudflareZoneId?.substring(0, 8)}...`));
        
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
        
        const orchestrator = new MultiDomainOrchestrator({
          domains: [coreInputs.domainName],
          environment: coreInputs.environment,
          dryRun: options.dryRun,
          servicePath: options.servicePath
        });
        
        await orchestrator.initialize();
        
        console.log(chalk.cyan('🚀 Starting deployment...\n'));
        
        const result = await orchestrator.deploySingleDomain(coreInputs.domainName, {
          ...coreInputs,
          ...confirmations,
          servicePath: options.servicePath
        });
        
        // Display results
        console.log(chalk.green('\n✅ Deployment Completed Successfully!'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(`   Worker:   ${confirmations.workerName || 'N/A'}`));
        console.log(chalk.white(`   URL:      ${result.url || confirmations.deploymentUrl || 'N/A'}`));
        console.log(chalk.white(`   Status:   ${result.status || 'deployed'}`));
        
        if (result.health) {
          console.log(chalk.white(`   Health:   ${result.health}`));
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
          
          console.log(chalk.green('   ✅ Configuration saved successfully!'));
          console.log(chalk.gray(`   📄 File: ${configFile}`));
          console.log(chalk.white('   💡 Next deployment will automatically load these settings'));
        } catch (saveError) {
          console.log(chalk.yellow(`   ⚠️  Could not save configuration: ${saveError.message}`));
          console.log(chalk.gray('   Deployment succeeded, but you may need to re-enter values next time.'));
        }
        
        console.log(chalk.cyan('\n📋 Next Steps:'));
        console.log(chalk.white(`   • Test deployment: curl ${result.url || confirmations.deploymentUrl}/health`));
        console.log(chalk.white(`   • Monitor logs: wrangler tail ${confirmations.workerName}`));
        console.log(chalk.white(`   • View dashboard: https://dash.cloudflare.com`));
        
      } finally {
        inputCollector.close();
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

program.parse();