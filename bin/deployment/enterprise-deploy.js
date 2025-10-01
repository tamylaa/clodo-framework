#!/usr/bin/env node

/**
 * Enterprise Deployment CLI
 * 
 * Advanced command-line deployment system powered by enterprise modules.
 * Provides comprehensive deployment options, portfolio management, and automation.
 * 
 * Enterprise Features:
 * - Command-line driven deployment with rich options
 * - Multi-domain and portfolio deployment capabilities  
 * - Automated configuration discovery and generation
 * - Advanced validation and testing pipelines
 * - Rollback and recovery management
 * - Comprehensive audit and reporting
 * - CI/CD integration support
 * - Batch operations and automation
 * - Performance monitoring and analytics
 * - Compliance and security features
 * 
 * @version 2.0.0 - Enterprise Edition
 */

import { program } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Enterprise module imports - organized shared modules
import { MultiDomainOrchestrator } from '../shared/deployment/multi-domain-orchestrator.js';
import { RollbackManager } from '../shared/deployment/rollback-manager.js';
import { ProductionTester } from '../shared/production-tester/index.js';
import { DeploymentValidator } from '../shared/deployment/validator.js';
import { DomainDiscovery } from '../shared/cloudflare/domain-discovery.js';
import { DatabaseOrchestrator } from '../shared/database/orchestrator.js';
import { EnhancedSecretManager } from '../shared/security/secret-generator.js';
import { DeploymentAuditor } from '../shared/deployment/auditor.js';
import { ConfigurationCacheManager } from '../shared/config/cache.js';
import { CrossDomainCoordinator } from '../shared/deployment/cross-domain-coordinator.js';
import { askChoice, askUser, closePrompts } from '../shared/utils/interactive-prompts.js';
import { CloudflareDomainManager } from '../shared/cloudflare/domain-manager.js';

class EnterpriseDeploymentCLI {
  constructor() {
    this.version = '2.0.0';
    this.modules = {};
    this.globalConfig = this.loadGlobalConfig();
  }

  /**
   * Initialize the CLI asynchronously
   */
  async initialize() {
    await this.initializeModules();
    this.setupCommands();
  }

  /**
   * Ensure modules are initialized (lazy initialization)
   */
  async ensureInitialized() {
    if (!this.modules || Object.keys(this.modules).length === 0) {
      await this.initializeModules();
    }
  }

  /**
   * Load global configuration
   */
  loadGlobalConfig() {
    const configPath = join(process.cwd(), 'enterprise-deploy.config.json');
    
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Failed to load config file, using defaults');
      }
    }

    return {
      defaultEnvironment: 'production',
      validationLevel: 'comprehensive',
      auditLevel: 'detailed',
      enableRollback: true,
      enableTesting: true,
      maxConcurrentDeployments: 3,
      deploymentTimeout: 1800000, // 30 minutes
      outputFormat: 'enhanced' // 'minimal', 'standard', 'enhanced'
    };
  }

  /**
   * Initialize enterprise modules
   */
  async initializeModules() {
    const domainDiscovery = new DomainDiscovery({
      enableCaching: true
    });
    domainDiscovery.initializeDiscovery();

    this.modules = {
      orchestrator: new MultiDomainOrchestrator({
        maxConcurrentDeployments: this.globalConfig.maxConcurrentDeployments,
        timeout: this.globalConfig.deploymentTimeout
      }),
      validator: new DeploymentValidator({
        validationLevel: this.globalConfig.validationLevel
      }),
      rollbackManager: new RollbackManager({
        autoRollbackEnabled: this.globalConfig.enableRollback
      }),
      domainDiscovery,
      databaseOrchestrator: new DatabaseOrchestrator({
        enableSafeMode: true
      }),
      secretManager: new EnhancedSecretManager({
        crossDomainCoordination: true
      }),
      productionTester: new ProductionTester({
        comprehensiveTests: this.globalConfig.enableTesting
      }),
      auditor: new DeploymentAuditor({
        auditLevel: this.globalConfig.auditLevel
      }),
      configCache: new ConfigurationCacheManager({
        enableRuntimeDiscovery: true
      }),
      coordinator: new CrossDomainCoordinator({
        portfolioName: 'enterprise-cli-portfolio'
      })
    };

    // Initialize async components
    await this.modules.orchestrator.initialize();
    await this.modules.rollbackManager.initialize();
    await this.modules.configCache.initialize();
  }

  /**
   * Setup CLI commands
   */
  setupCommands() {
    program
      .name('enterprise-deploy')
      .description('Enterprise Deployment System - Advanced deployment and portfolio management')
      .version(this.version);

    // Single domain deployment
    program
      .command('deploy [domain]')
      .description('Deploy a single domain with enterprise features')
      .option('-e, --env <environment>', 'deployment environment', this.globalConfig.defaultEnvironment)
      .option('-v, --validation <level>', 'validation level (basic|standard|comprehensive)', this.globalConfig.validationLevel)
      .option('-a, --audit <level>', 'audit level (minimal|standard|detailed|verbose)', this.globalConfig.auditLevel)
      .option('-i, --interactive', 'interactive mode - select domain from available options')
      .option('--no-tests', 'skip production testing')
      .option('--no-rollback', 'disable automatic rollback')
      .option('--dry-run', 'simulate deployment without changes')
      .option('--force', 'force deployment even if validation fails')
      .option('--config <file>', 'custom configuration file')
      .action(async (domain, options) => {
        try {
          await this.ensureInitialized();
          if (options.interactive && !domain) {
            domain = await this.selectDomainInteractively();
          }
          if (!domain) {
            console.error('❌ Domain is required. Use --interactive to select from available domains, or provide domain as argument.');
            process.exit(1);
          }
          await this.deploySingleDomain(domain, options);
          process.exit(0);
        } catch (error) {
          console.error('❌ Deployment failed:', error.message);
          process.exit(1);
        }
      });

    // Multi-domain deployment
    program
      .command('deploy-multi <domains...>')
      .description('Deploy multiple domains with coordination')
      .option('-e, --env <environment>', 'deployment environment', this.globalConfig.defaultEnvironment)
      .option('-b, --batch-size <size>', 'batch size for parallel deployments', '3')
      .option('--coordination', 'enable cross-domain coordination')
      .option('--shared-secrets', 'enable shared secret management')
      .option('--dependency-order', 'resolve and use dependency ordering')
      .option('--dry-run', 'simulate deployment without changes')
      .action(async (domains, options) => {
        try {
          await this.deployMultiDomain(domains, options);
          process.exit(0);
        } catch (error) {
          console.error('❌ Multi-domain deployment failed:', error.message);
          process.exit(1);
        }
      });

    // Portfolio deployment
    program
      .command('deploy-portfolio')
      .description('Deploy entire domain portfolio')
      .option('-e, --env <environment>', 'deployment environment', this.globalConfig.defaultEnvironment)
      .option('-f, --filter <pattern>', 'filter domains by pattern')
      .option('--exclude <pattern>', 'exclude domains matching pattern')
      .option('--health-check', 'run health checks before deployment')
      .option('--rollback-threshold <percent>', 'rollback threshold (0-1)', '0.8')
      .option('--dry-run', 'simulate deployment without changes')
      .action(async (options) => {
        try {
          await this.deployPortfolio(options);
          process.exit(0);
        } catch (error) {
          console.error('❌ Portfolio deployment failed:', error.message);
          process.exit(1);
        }
      });

    // Discovery commands
    program
      .command('discover <domain>')
      .description('Discover domain configuration from Cloudflare')
      .option('--token <token>', 'Cloudflare API token')
      .option('--cache', 'cache discovered configuration')
      .option('--update-config', 'update domains.js with discovery results')
      .action(async (domain, options) => {
        try {
          await this.discoverDomain(domain, options);
          process.exit(0);
        } catch (error) {
          console.error('❌ Domain discovery failed:', error.message);
          process.exit(1);
        }
      });

    program
      .command('discover-portfolio')
      .description('Discover entire portfolio configuration')
      .option('--token <token>', 'Cloudflare API token')
      .option('--update-all', 'update all domain configurations')
      .action((options) => this.discoverPortfolio(options));

    // Validation commands
    program
      .command('validate <domain>')
      .description('Validate domain deployment readiness')
      .option('-e, --env <environment>', 'environment to validate', this.globalConfig.defaultEnvironment)
      .option('-l, --level <level>', 'validation level', this.globalConfig.validationLevel)
      .option('--fix', 'attempt to fix validation issues')
      .action((domain, options) => this.validateDomain(domain, options));

    program
      .command('validate-portfolio')
      .description('Validate entire portfolio deployment readiness')
      .option('-e, --env <environment>', 'environment to validate', this.globalConfig.defaultEnvironment)
      .option('--cross-domain', 'include cross-domain compatibility checks')
      .option('--report <format>', 'generate validation report (json|html|csv)', 'json')
      .action((options) => this.validatePortfolio(options));

    // Testing commands
    program
      .command('test <domain>')
      .description('Run production tests for domain')
      .option('--url <url>', 'custom URL to test')
      .option('--suites <suites>', 'test suites to run (comma-separated)', 'health,endpoints,integration')
      .option('--timeout <ms>', 'test timeout in milliseconds', '30000')
      .option('--report <format>', 'test report format (json|html|junit)', 'json')
      .action((domain, options) => this.testDomain(domain, options));

    program
      .command('test-portfolio')
      .description('Run production tests for entire portfolio')
      .option('--parallel', 'run tests in parallel')
      .option('--threshold <percent>', 'success threshold (0-1)', '0.9')
      .option('--report <format>', 'test report format', 'html')
      .action((options) => this.testPortfolio(options));

    // Database commands
    program
      .command('db-migrate <domain>')
      .description('Run database migrations for domain')
      .option('-e, --env <environment>', 'environment', this.globalConfig.defaultEnvironment)
      .option('--create-db', 'create database if it doesn\'t exist')
      .option('--dry-run', 'show migrations without executing')
      .action((domain, options) => this.migrateDomain(domain, options));

    program
      .command('db-migrate-all')
      .description('Run database migrations for all domains')
      .option('-e, --env <environment>', 'environment', this.globalConfig.defaultEnvironment)
      .option('--parallel', 'run migrations in parallel')
      .option('--safe-mode', 'enable extra safety checks')
      .action((options) => this.migrateAll(options));

    // Secret management commands
    program
      .command('secrets-generate <domain>')
      .description('Generate secrets for domain')
      .option('-e, --env <environment>', 'environment', this.globalConfig.defaultEnvironment)
      .option('--formats <formats>', 'output formats (comma-separated)', 'env,json,wrangler')
      .option('--coordinate', 'coordinate with other domains')
      .option('--deploy', 'deploy secrets to Cloudflare')
      .action((domain, options) => this.generateSecrets(domain, options));

    program
      .command('secrets-coordinate <domains...>')
      .description('Coordinate secrets across multiple domains')
      .option('-e, --env <environment>', 'environment', this.globalConfig.defaultEnvironment)
      .option('--sync-critical', 'sync critical secrets across domains')
      .option('--deploy', 'deploy coordinated secrets')
      .action((domains, options) => this.coordinateSecrets(domains, options));

    // Rollback commands
    program
      .command('rollback <domain>')
      .description('Rollback domain deployment')
      .option('--deployment-id <id>', 'specific deployment ID to rollback')
      .option('--reason <reason>', 'rollback reason for audit')
      .option('--force', 'force rollback without confirmation')
      .action((domain, options) => this.rollbackDomain(domain, options));

    program
      .command('rollback-portfolio')
      .description('Rollback portfolio deployment')
      .option('--coordination-id <id>', 'coordination ID to rollback')
      .option('--partial', 'allow partial rollback')
      .action((options) => this.rollbackPortfolio(options));

    // Monitoring commands
    program
      .command('monitor')
      .description('Monitor portfolio health')
      .option('--interval <ms>', 'monitoring interval', '300000')
      .option('--alert-webhook <url>', 'webhook for alerts')
      .option('--continuous', 'run continuous monitoring')
      .action((options) => this.monitorPortfolio(options));

    program
      .command('status [domain]')
      .description('Get deployment status')
      .option('--detailed', 'show detailed status')
      .option('--format <format>', 'output format (table|json|yaml)', 'table')
      .action((domain, options) => this.getStatus(domain, options));

    // Audit commands
    program
      .command('audit <domain>')
      .description('Generate audit report for domain')
      .option('--deployment-id <id>', 'specific deployment ID')
      .option('--format <format>', 'report format (json|html|csv)', 'html')
      .option('--period <days>', 'audit period in days', '30')
      .action((domain, options) => this.auditDomain(domain, options));

    program
      .command('audit-portfolio')
      .description('Generate portfolio audit report')
      .option('--format <format>', 'report format', 'html')
      .option('--compliance', 'include compliance report')
      .action((options) => this.auditPortfolio(options));

    // Configuration commands
    program
      .command('config-cache <domain>')
      .description('Manage configuration cache for domain')
      .option('--clear', 'clear cached configuration')
      .option('--refresh', 'refresh cached configuration')
      .option('--show', 'show cached configuration')
      .action((domain, options) => this.manageConfigCache(domain, options));

    // Utility commands
    program
      .command('list-domains')
      .description('List all discovered domains')
      .option('--format <format>', 'output format (table|json|yaml)', 'table')
      .action(async (options) => {
        try {
          await this.ensureInitialized();
          await this.listDomains(options);
          process.exit(0);
        } catch (error) {
          console.error('❌ List domains failed:', error.message);
          process.exit(1);
        }
      });

    program
      .command('cleanup')
      .description('Clean up old deployments and logs')
      .option('--days <days>', 'retention period in days', '90')
      .option('--force', 'force cleanup without confirmation')
      .action((options) => this.cleanupDeployments(options));

    // Global options
    program
      .option('--verbose', 'verbose output')
      .option('--quiet', 'quiet mode - minimal output')
      .option('--no-color', 'disable colored output')
      .option('--output <format>', 'global output format override');
  }

  /**
   * Deploy single domain
   */
  async deploySingleDomain(domain, options) {
    try {
      this.logOutput(`🚀 Enterprise deployment: ${domain}`, 'info');
      
      // Step 1: Comprehensive Cloudflare Domain Verification
      const domainManager = new CloudflareDomainManager();
      let domainVerification;
      
      try {
        this.logOutput('🔍 Verifying domain with Cloudflare...', 'info');
        domainVerification = await domainManager.verifyDomainWorkflow(domain);
        
        if (domainVerification.action === 'choose_different') {
          // User wants to choose different domain
          domain = await this.selectDomainInteractively();
          this.logOutput(`🚀 Enterprise deployment: ${domain}`, 'info');
          // Re-verify the new domain
          domainVerification = await domainManager.verifyDomainWorkflow(domain);
        }
        
        // Log domain verification results
        this.logOutput(`✅ Domain verification complete:`, 'success');
        this.logOutput(`   📊 Status: ${domainVerification.domainStatus}`, 'info');
        this.logOutput(`   🎯 Action: ${domainVerification.recommendedAction}`, 'info');
        if (domainVerification.existingServices?.length > 0) {
          this.logOutput(`   📋 Existing services: ${domainVerification.existingServices.length}`, 'info');
        }
        
      } catch (error) {
        if (error.message.includes('DEPLOYMENT_CANCELLED') || error.message.includes('authentication required')) {
          this.logOutput(`❌ ${error.message}`, 'error');
          return;
        }
        // Continue with deployment even if verification fails
        this.logOutput(`⚠️ Domain verification failed: ${error.message}`, 'warn');
        this.logOutput('🔄 Continuing with deployment...', 'info');
        domainVerification = { domainStatus: 'unknown', recommendedAction: 'deploy' };
      }
      
      // Interactive confirmation (unless force is enabled)
      if (!options.force) {
        const originalDomain = domain;
        let domainSelected = false;
        
        while (!domainSelected) {
          const confirm = await askChoice(
            `\nReady to deploy ${domain}?`,
            ['Yes, proceed with deployment', 'Choose different domain', 'Cancel deployment'],
            0
          );
          
          if (confirm === 0) {
            // Yes, proceed
            domainSelected = true;
          } else if (confirm === 1) {
            // Choose different domain
            const availableDomains = await this.discoverAvailableDomains();
            
            if (availableDomains.length <= 1) {
              // No other domains available
              const createNew = await askChoice(
                'No other domains available. What would you like to do?',
                ['Create a new service', 'Go back to deployment options', 'Cancel deployment'],
                0
              );
              
              if (createNew === 0) {
                // Create new service
                let serviceName;
                let validServiceName = false;
                
                while (!validServiceName) {
                  serviceName = await askUser('Enter service name (lowercase letters, numbers, hyphens only):');
                  if (!serviceName || serviceName.trim() === '') {
                    this.logOutput('❌ Service name is required', 'error');
                    continue;
                  }
                  
                  // Validate service name format
                  if (!/^[a-z0-9-]+$/.test(serviceName.trim())) {
                    this.logOutput('❌ Service name must contain only lowercase letters, numbers, and hyphens', 'error');
                    this.logOutput('💡 Example: data-service, user-auth, content-api', 'info');
                    continue;
                  }
                  
                  validServiceName = true;
                  serviceName = serviceName.trim();
                }
                
                try {
                  this.logOutput(`🏗️ Creating new service: ${serviceName}`, 'info');
                  
                  // Also ask for domain name
                  const domainName = await askUser('Enter domain name for this service (e.g., api.example.com):');
                  if (!domainName || domainName.trim() === '') {
                    this.logOutput('❌ Domain name is required', 'error');
                    continue;
                  }
                  
                  // Run service initialization using spawn with absolute path
                  const { spawn } = await import('child_process');
                  const initScriptPath = join(process.cwd(), 'bin', 'service-management', 'init-service.js');
                  
                  const initProcess = spawn('node', [
                    initScriptPath,
                    serviceName,
                    '--domains', domainName,
                    '--output', process.cwd()
                  ], {
                    stdio: 'inherit',
                    cwd: process.cwd()
                  });
                  
                  await new Promise((resolve, reject) => {
                    initProcess.on('close', (code) => {
                      if (code === 0) {
                        resolve();
                      } else {
                        reject(new Error(`Service initialization failed with code ${code}`));
                      }
                    });
                    initProcess.on('error', reject);
                  });
                  
                  this.logOutput(`✅ Service ${serviceName} created successfully!`, 'success');
                  
                  // Re-discover domains now that we have a new service
                  this.logOutput('🔄 Re-discovering available domains...', 'info');
                  const updatedDomains = await this.discoverAvailableDomains();
                  
                  if (updatedDomains.length > 0) {
                    domain = await this.selectDomainInteractively();
                    this.logOutput(`🚀 Enterprise deployment: ${domain}`, 'info');
                  } else {
                    this.logOutput('❌ No domains found after service creation', 'error');
                    return;
                  }
                  
                } catch (error) {
                  this.logOutput(`❌ Failed to create service: ${error.message}`, 'error');
                  continue;
                }
              } else if (createNew === 1) {
                // Go back - continue the loop
                continue;
              } else {
                // Cancel
                this.logOutput('❌ Deployment cancelled by user', 'warn');
                return;
              }
            } else {
              // Multiple domains available, let user choose
              domain = await this.selectDomainInteractively();
              this.logOutput(`🚀 Enterprise deployment: ${domain}`, 'info');
            }
          } else {
            // Cancel
            this.logOutput('❌ Deployment cancelled by user', 'warn');
            return;
          }
        }
      }
      
      const deploymentId = this.generateDeploymentId();
      const auditor = this.modules.auditor;
      
      // Start audit session
      const deploymentContext = auditor.startDeploymentAudit(deploymentId, domain, {
        environment: options.env,
        cliMode: true,
        options
      });

      // Validation phase
      if (!options.force) {
        this.logOutput('🔍 Running validation...', 'info');
        const validation = await this.modules.validator.validateDeployment(domain, {
          environment: options.env,
          validationLevel: options.validation,
          deploymentType: domainVerification.domainStatus, // 'available', 'update', etc.
          skipEndpointCheck: domainVerification.domainStatus === 'available'
        });

        if (validation.overall !== 'passed') {
          this.logOutput('❌ Validation failed:', 'error');
          validation.errors.forEach(error => this.logOutput(`   - ${error.message}`, 'error'));
          
          if (!options.force) {
            process.exit(1);
          }
        }
      }

      // Execute deployment - Create domain-specific orchestrator
      const domainOrchestrator = new MultiDomainOrchestrator({
        domains: [domain],
        environment: options.env,
        dryRun: options.dryRun,
        parallelDeployments: 1,
        enableRollback: options.rollback !== false
      });
      
      await domainOrchestrator.initialize();
      const deploymentResult = await domainOrchestrator.deploySingleDomain(domain);

      // Run tests if enabled
      if (options.tests !== false && deploymentResult.url) {
        this.logOutput('🧪 Running production tests...', 'info');
        this.logOutput('⏳ Waiting for deployment to propagate...', 'info');
        
        // Wait for deployment to propagate (especially important for new services)
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        
        const deploymentUrl = deploymentResult.url;
        const testResult = await this.modules.productionTester.runFullTestSuite(
          options.env
        );

        if (testResult.failed > 0) {
          this.logOutput(`⚠️  ${testResult.failed}/${testResult.total} tests failed`, 'warn');
          this.logOutput('💡 Note: Some test failures may be expected for new deployments during DNS propagation', 'info');
        } else {
          this.logOutput(`✅ All ${testResult.total} tests passed`, 'success');
        }
      } else if (options.tests !== false && !deploymentResult.url) {
        this.logOutput('⏭️ Skipping tests - no deployment URL available', 'warn');
      }

      // End audit session
      auditor.endDeploymentAudit(deploymentId, 'success', {
        url: deploymentResult.url,
        duration: deploymentResult.duration
      });

      this.logOutput(`✅ Deployment successful: ${deploymentResult.url}`, 'success');
      
      if (this.globalConfig.outputFormat !== 'minimal') {
        console.log('\\n📊 Deployment Summary:');
        console.log(`   🆔 ID: ${deploymentId}`);
        console.log(`   🌐 Domain: ${domain}`);
        console.log(`   🌍 Environment: ${options.env}`);
        console.log(`   🔗 URL: ${deploymentResult.url}`);
        console.log(`   ⏱️  Duration: ${deploymentResult.duration}s`);
      }

    } catch (error) {
      this.logOutput(`❌ Deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Deploy multiple domains
   */
  async deployMultiDomain(domains, options) {
    try {
      this.logOutput(`🌍 Multi-domain deployment: ${domains.length} domains`, 'info');
      
      const coordinationResult = await this.modules.coordinator.coordinateMultiDomainDeployment(
        domains,
        {
          environment: options.env,
          batchSize: parseInt(options.batchSize),
          enableCoordination: options.coordination,
          sharedSecrets: options.sharedSecrets,
          resolveDependencies: options.dependencyOrder,
          dryRun: options.dryRun
        }
      );

      this.logOutput(`✅ Multi-domain deployment completed`, 'success');
      console.log(`   ✅ Successful: ${coordinationResult.results.successful.length}`);
      console.log(`   ❌ Failed: ${coordinationResult.results.failed.length}`);

    } catch (error) {
      this.logOutput(`❌ Multi-domain deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Deploy portfolio
   */
  async deployPortfolio(options) {
    try {
      this.logOutput('📊 Portfolio deployment', 'info');
      
      // Discover portfolio first
      const portfolio = await this.modules.coordinator.discoverPortfolio();
      
      let domains = portfolio.domains.map(d => d.name || d.domain);
      
      // Apply filters
      if (options.filter) {
        const filterRegex = new RegExp(options.filter);
        domains = domains.filter(domain => filterRegex.test(domain));
      }
      
      if (options.exclude) {
        const excludeRegex = new RegExp(options.exclude);
        domains = domains.filter(domain => !excludeRegex.test(domain));
      }

      this.logOutput(`📋 Deploying ${domains.length} domains from portfolio`, 'info');

      // Health check if requested
      if (options.healthCheck) {
        this.logOutput('❤️  Running pre-deployment health checks...', 'info');
        const healthResults = await this.modules.coordinator.monitorPortfolioHealth();
        this.logOutput(`📊 Health: ${healthResults.summary.healthy}/${healthResults.summary.total} healthy`, 'info');
      }

      // Execute portfolio deployment
      const result = await this.modules.coordinator.coordinateMultiDomainDeployment(domains, {
        environment: options.env,
        rollbackThreshold: parseFloat(options.rollbackThreshold),
        dryRun: options.dryRun
      });

      this.logOutput('✅ Portfolio deployment completed', 'success');
      
    } catch (error) {
      this.logOutput(`❌ Portfolio deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Discover domain configuration
   */
  async discoverDomain(domain, options) {
    try {
      this.logOutput(`🔍 Discovering configuration for: ${domain}`, 'info');
      
      const discoveredConfig = await this.modules.domainDiscovery.discoverDomainConfig(domain, {
        cloudflareToken: options.token,
        useCache: options.cache,
        updateDomainsJs: options.updateConfig
      });

      this.logOutput('✅ Discovery completed', 'success');
      
      if (this.globalConfig.outputFormat !== 'minimal') {
        console.log('\\n📋 Discovered Configuration:');
        console.log(JSON.stringify(discoveredConfig, null, 2));
      }
      
    } catch (error) {
      this.logOutput(`❌ Discovery failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Validate domain
   */
  async validateDomain(domain, options) {
    try {
      this.logOutput(`🔍 Validating: ${domain}`, 'info');
      
      const validation = await this.modules.validator.validateDeploymentReadiness(domain, {
        environment: options.env,
        validationLevel: options.level
      });

      if (validation.valid) {
        this.logOutput('✅ Validation passed', 'success');
      } else {
        this.logOutput('❌ Validation failed:', 'error');
        validation.errors.forEach(error => this.logOutput(`   - ${error}`, 'error'));
        
        if (validation.warnings?.length > 0) {
          this.logOutput('⚠️  Warnings:', 'warn');
          validation.warnings.forEach(warning => this.logOutput(`   - ${warning}`, 'warn'));
        }
        
        process.exit(1);
      }
      
    } catch (error) {
      this.logOutput(`❌ Validation error: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Test domain
   */
  async testDomain(domain, options) {
    try {
      this.logOutput(`🧪 Testing: ${domain}`, 'info');
      
      const url = options.url || this.getDomainUrl(domain);
      const testSuites = options.suites.split(',');
      
      const testResult = await this.modules.productionTester.runFullTestSuite(
        options.env || 'production'
      );

      if (testResult.failed === 0) {
        this.logOutput(`✅ All ${testResult.total} tests passed`, 'success');
      } else {
        this.logOutput(`❌ ${testResult.failed}/${testResult.total} tests failed`, 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.logOutput(`❌ Testing failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Generate secrets for domain
   */
  async generateSecrets(domain, options) {
    try {
      this.logOutput(`🔐 Generating secrets for: ${domain}`, 'info');
      
      const formats = options.formats.split(',');
      
      const secretResult = await this.modules.secretManager.generateDomainSpecificSecrets(
        domain,
        options.env,
        {
          formats,
          coordinate: options.coordinate,
          deployToCloudflare: options.deploy
        }
      );

      this.logOutput(`✅ Generated ${Object.keys(secretResult.secrets).length} secrets`, 'success');
      
      if (this.globalConfig.outputFormat !== 'minimal') {
        console.log('\\n🔑 Generated Secrets:');
        Object.keys(secretResult.secrets).forEach(key => {
          console.log(`   - ${key}: ${secretResult.secrets[key].substring(0, 8)}...`);
        });
      }
      
    } catch (error) {
      this.logOutput(`❌ Secret generation failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Monitor portfolio health
   */
  async monitorPortfolio(options) {
    try {
      this.logOutput('📊 Starting portfolio monitoring...', 'info');
      
      if (options.continuous) {
        const interval = parseInt(options.interval);
        
        const runHealthCheck = async () => {
          const healthResults = await this.modules.coordinator.monitorPortfolioHealth();
          
          this.logOutput(
            `📊 Health: ${healthResults.summary.healthy}/${healthResults.summary.total} healthy`, 
            'info'
          );
          
          if (healthResults.summary.unhealthy > 0 && options.alertWebhook) {
            // Send alert (implementation would send to webhook)
            this.logOutput(`🚨 Alert: ${healthResults.summary.unhealthy} domains unhealthy`, 'warn');
          }
        };

        // Initial check
        await runHealthCheck();
        
        // Continuous monitoring
        setInterval(runHealthCheck, interval);
        
        this.logOutput(`🔄 Continuous monitoring enabled (interval: ${interval}ms)`, 'info');
        
      } else {
        // One-time health check
        const healthResults = await this.modules.coordinator.monitorPortfolioHealth();
        
        this.logOutput('✅ Portfolio health check completed', 'success');
        console.log(`   📊 Total: ${healthResults.summary.total}`);
        console.log(`   ✅ Healthy: ${healthResults.summary.healthy}`);
        console.log(`   ❌ Unhealthy: ${healthResults.summary.unhealthy}`);
        console.log(`   🔥 Errors: ${healthResults.summary.errors}`);
      }
      
    } catch (error) {
      this.logOutput(`❌ Monitoring failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Get domain URL for testing
   */
  getDomainUrl(domain) {
    // Generate standard URL pattern
    const domainKey = domain.replace(/\\./g, '');
    return `https://${domainKey}-data-service.tamylatrading.workers.dev`;
  }

  /**
   * Generate deployment ID
   */
  generateDeploymentId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `cli_${timestamp}_${random}`;
  }

  /**
   * Log output with different levels
   */
  logOutput(message, level = 'info') {
    if (program.opts().quiet && level !== 'error') return;
    
    const colors = {
      info: '\\x1b[36m',    // Cyan
      success: '\\x1b[32m', // Green  
      warn: '\\x1b[33m',    // Yellow
      error: '\\x1b[31m',   // Red
      reset: '\\x1b[0m'     // Reset
    };
    
    const useColor = !program.opts().noColor;
    const colorCode = useColor ? (colors[level] || colors.info) : '';
    const resetCode = useColor ? colors.reset : '';
    
    console.log(`${colorCode}${message}${resetCode}`);
  }

  /**
   * Placeholder implementations for remaining methods
   */
  async discoverPortfolio(options) {
    this.logOutput('🔍 Portfolio discovery not yet implemented', 'warn');
  }

  async validatePortfolio(options) {
    this.logOutput('🔍 Portfolio validation not yet implemented', 'warn');  
  }

  async testPortfolio(options) {
    this.logOutput('🧪 Portfolio testing not yet implemented', 'warn');
  }

  async migrateDomain(domain, options) {
    this.logOutput(`🗄️ Database migration for ${domain} not yet implemented`, 'warn');
  }

  async migrateAll(options) {
    this.logOutput('🗄️ Bulk database migration not yet implemented', 'warn');
  }

  async coordinateSecrets(domains, options) {
    this.logOutput(`🔐 Secret coordination for ${domains.length} domains not yet implemented`, 'warn');
  }

  async rollbackDomain(domain, options) {
    this.logOutput(`🔄 Domain rollback for ${domain} not yet implemented`, 'warn');
  }

  async rollbackPortfolio(options) {
    this.logOutput('🔄 Portfolio rollback not yet implemented', 'warn');
  }

  async getStatus(domain, options) {
    this.logOutput(`📊 Status check for ${domain || 'portfolio'} not yet implemented`, 'warn');
  }

  async auditDomain(domain, options) {
    this.logOutput(`📋 Audit report for ${domain} not yet implemented`, 'warn');
  }

  async auditPortfolio(options) {
    this.logOutput('📋 Portfolio audit not yet implemented', 'warn');
  }

  async manageConfigCache(domain, options) {
    this.logOutput(`⚙️ Config cache management for ${domain} not yet implemented`, 'warn');
  }

  async listDomains(options) {
    this.logOutput('📋 Discovering available domains...', 'info');
    
    const domains = await this.discoverAvailableDomains();
    
    if (domains.length === 0) {
      this.logOutput('❌ No domains found in services directory', 'error');
      this.logOutput('💡 Create a service first using: node bin/service-management/init-service.js', 'info');
      return;
    }
    
    if (options.format === 'json') {
      console.log(JSON.stringify({ domains, count: domains.length }, null, 2));
    } else if (options.format === 'yaml') {
      console.log('domains:');
      domains.forEach(domain => console.log(`  - ${domain}`));
      console.log(`count: ${domains.length}`);
    } else {
      // Table format (default)
      this.logOutput(`📋 Found ${domains.length} domain(s):`, 'success');
      console.log('');
      console.log('┌─────────────────────────────────────┐');
      console.log('│ Domain                              │');
      console.log('├─────────────────────────────────────┤');
      domains.forEach(domain => {
        console.log(`│ ${domain.padEnd(35)} │`);
      });
      console.log('└─────────────────────────────────────┘');
    }
  }

  /**
   * Discover available domains from services directory
   */
  async discoverAvailableDomains() {
    const domains = new Set();
    
    try {
      const servicesPath = join(process.cwd(), 'services');
      const fs = await import('fs/promises');
      
      // Check if services directory exists
      try {
        await fs.access(servicesPath);
      } catch {
        this.logOutput('⚠️ No services directory found', 'warn');
        return [];
      }
      
      // Read service directories
      const serviceDirs = await fs.readdir(servicesPath, { withFileTypes: true });
      
      for (const dir of serviceDirs) {
        if (!dir.isDirectory()) continue;
        
        const servicePath = join(servicesPath, dir.name);
        const wranglerPath = join(servicePath, 'wrangler.toml');
        
        try {
          // Check if wrangler.toml exists
          await fs.access(wranglerPath);
          
          // Read and parse wrangler.toml
          const content = await fs.readFile(wranglerPath, 'utf-8');
          const domainMatch = content.match(/DOMAIN_NAME\s*=\s*["']([^"']+)["']/);
          
          if (domainMatch) {
            domains.add(domainMatch[1]);
          }
        } catch {
          // Skip services without wrangler.toml or domain config
          continue;
        }
      }
      
    } catch (error) {
      this.logOutput(`❌ Error discovering domains: ${error.message}`, 'error');
    }
    
    return Array.from(domains).sort();
  }

  /**
   * Interactively select a domain from available options
   */
  async selectDomainInteractively() {
    this.logOutput('🔍 Discovering available domains...', 'info');
    
    const domains = await this.discoverAvailableDomains();
    
    if (domains.length === 0) {
      this.logOutput('❌ No domains found in services. Please create a service first or specify domain manually.', 'error');
      process.exit(1);
    }
    
    if (domains.length === 1) {
      const domain = domains[0];
      this.logOutput(`✅ Only one domain found: ${domain}`, 'success');
      return domain;
    }
    
    this.logOutput(`📋 Found ${domains.length} available domains:`, 'info');
    domains.forEach((domain, index) => {
      console.log(`   ${index + 1}. ${domain}`);
    });
    
    const choice = await askChoice('Select a domain to deploy:', domains);
    const selectedDomain = domains[choice];
    
    this.logOutput(`✅ Selected domain: ${selectedDomain}`, 'success');
    return selectedDomain;
  }

  async cleanupDeployments(options) {
    this.logOutput('🧹 Deployment cleanup not yet implemented', 'warn');
  }
}

// Initialize and run CLI
const cli = new EnterpriseDeploymentCLI();

// Set up commands first (before heavy module initialization)
cli.setupCommands();

// Parse command line arguments
program.parse();

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { EnterpriseDeploymentCLI };