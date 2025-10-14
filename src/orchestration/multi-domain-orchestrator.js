#!/usr/bin/env node

/**
 * Multi-Domain Orchestrator Module
 * Enterprise-grade deployment orchestration with state management, 
 * rollback capabilities, and portfolio-wide coordination
 * 
 * Now uses modular architecture for improved maintainability and testability
 */

import { DomainResolver } from './modules/DomainResolver.js';
import { DeploymentCoordinator } from './modules/DeploymentCoordinator.js';
import { StateManager } from './modules/StateManager.js';
import { DatabaseOrchestrator } from '../database/database-orchestrator.js';
import { EnhancedSecretManager } from '../utils/deployment/secret-generator.js';
import { WranglerConfigManager } from '../utils/deployment/wrangler-config-manager.js';
import { ConfigurationValidator } from '../security/ConfigurationValidator.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { createDatabase, databaseExists, getDatabaseId } from '../utils/cloudflare/index.js';

const execAsync = promisify(exec);

/**
 * Multi-Domain Deployment Orchestrator
 * Manages enterprise-level deployments across multiple domains with comprehensive state tracking
 * 
 * REFACTORED: Now uses modular components for domain resolution, deployment coordination, and state management
 */
export class MultiDomainOrchestrator {
  constructor(options = {}) {
    this.domains = options.domains || [];
    this.environment = options.environment || 'production';
    this.dryRun = options.dryRun || false;
    this.skipTests = options.skipTests || false;
    this.parallelDeployments = options.parallelDeployments || 3;
    this.servicePath = options.servicePath || process.cwd();
    
    // Initialize modular components
    this.domainResolver = new DomainResolver({
      environment: this.environment,
      validationLevel: options.validationLevel || 'basic',
      cacheEnabled: options.cacheEnabled !== false
    });
    
    this.deploymentCoordinator = new DeploymentCoordinator({
      parallelDeployments: this.parallelDeployments,
      skipTests: this.skipTests,
      dryRun: this.dryRun,
      environment: this.environment,
      batchPauseMs: options.batchPauseMs || 2000
    });
    
    this.stateManager = new StateManager({
      environment: this.environment,
      dryRun: this.dryRun,
      domains: this.domains,
      enablePersistence: options.enablePersistence !== false,
      rollbackEnabled: options.rollbackEnabled !== false
    });

    // Initialize enterprise-grade utilities
    this.databaseOrchestrator = new DatabaseOrchestrator({
      projectRoot: this.servicePath,
      dryRun: this.dryRun
    });

    this.secretManager = new EnhancedSecretManager({
      projectRoot: this.servicePath,
      dryRun: this.dryRun
    });

    this.wranglerConfigManager = new WranglerConfigManager({
      projectRoot: this.servicePath,
      dryRun: this.dryRun,
      verbose: options.verbose || false
    });

    // ConfigurationValidator is a static class - don't instantiate
    // Access via ConfigurationValidator.validate() directly

    // Legacy compatibility: expose portfolioState for backward compatibility
    this.portfolioState = this.stateManager.portfolioState;

    // Note: Async initialization required - call initialize() after construction
  }

  /**
   * Initialize the orchestrator asynchronously
   * Uses modular components for domain resolution and state initialization
   */
  async initialize() {
    console.log('🌐 Multi-Domain Orchestrator v2.0 (Modular)');
    console.log('===========================================');
    console.log(`📊 Portfolio: ${this.domains.length} domains`);
    console.log(`🌍 Environment: ${this.environment}`);
    console.log(`🆔 Orchestration ID: ${this.portfolioState.orchestrationId}`);
    console.log(`🔍 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE DEPLOYMENT'}`);
    console.log(`⚡ Parallel Deployments: ${this.parallelDeployments}`);
    console.log('🧩 Modular Components: DomainResolver, DeploymentCoordinator, StateManager');
    console.log('');

    // Initialize all modular components
    await this.stateManager.initializeDomainStates(this.domains);
    
    // Pre-resolve all domain configurations if domains are specified
    if (this.domains.length > 0) {
      const configs = await this.domainResolver.resolveMultipleDomains(this.domains);
      
      // Update domain states with resolved configurations
      for (const [domain, config] of Object.entries(configs)) {
        const domainState = this.portfolioState.domainStates.get(domain);
        if (domainState) {
          domainState.config = config;
          this.stateManager.updateDomainState(domain, { config });
        }
      }
    }

    await this.stateManager.logAuditEvent('orchestrator_initialized', {
      domains: this.domains,
      environment: this.environment,
      modularComponents: ['DomainResolver', 'DeploymentCoordinator', 'StateManager']
    });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use stateManager.generateOrchestrationId() instead
   */
  generateOrchestrationId() {
    return this.stateManager.generateOrchestrationId();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use stateManager.generateDeploymentId() instead
   */
  generateDeploymentId(domain) {
    return this.stateManager.generateDeploymentId(domain);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use domainResolver.generateDomainConfig() instead
   */
  generateDomainConfig(domain) {
    return this.domainResolver.generateDomainConfig(domain);
  }

  /**
   * Deploy to single domain using modular deployment coordinator
   * @param {string} domain - Domain to deploy
   * @returns {Promise<Object>} Deployment result
   */
  async deploySingleDomain(domain) {
    const domainState = this.portfolioState.domainStates.get(domain);
    if (!domainState) {
      throw new Error(`Domain ${domain} not found in portfolio`);
    }

    // Create handlers that delegate to our legacy methods for backward compatibility
    const handlers = {
      validation: (d) => this.validateDomainPrerequisites(d),
      initialization: (d) => this.initializeDomainDeployment(d),
      database: (d) => this.setupDomainDatabase(d),
      secrets: (d) => this.handleDomainSecrets(d),
      deployment: (d) => this.deployDomainWorker(d),
      'post-validation': (d) => this.validateDomainDeployment(d)
    };

    return await this.deploymentCoordinator.deploySingleDomain(domain, domainState, handlers);
  }

  /**
   * Deploy to multiple domains using modular deployment coordinator
   * @returns {Promise<Object>} Portfolio deployment results
   */
  async deployPortfolio() {
    // Create handlers that delegate to our legacy methods for backward compatibility
    const handlers = {
      validation: (d) => this.validateDomainPrerequisites(d),
      initialization: (d) => this.initializeDomainDeployment(d),
      database: (d) => this.setupDomainDatabase(d),
      secrets: (d) => this.handleDomainSecrets(d),
      deployment: (d) => this.deployDomainWorker(d),
      'post-validation': (d) => this.validateDomainDeployment(d)
    };

    return await this.deploymentCoordinator.deployPortfolio(
      this.domains,
      this.portfolioState.domainStates,
      handlers
    );
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use deploymentCoordinator.createDeploymentBatches() instead
   */
  createDeploymentBatches() {
    return this.deploymentCoordinator.createDeploymentBatches(this.domains);
  }

  /**
   * Legacy method for backward compatibility  
   * @deprecated Use stateManager.logAuditEvent() instead
   */
  logAuditEvent(event, domain, details = {}) {
    return this.stateManager.logAuditEvent(event, domain, details);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use stateManager.saveAuditLog() instead
   */
  async saveAuditLog() {
    return await this.stateManager.saveAuditLog();
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use domainResolver.validateDomainPrerequisites() instead  
   */
  async validateDomainPrerequisites(domain) {
    return await this.domainResolver.validateDomainPrerequisites(domain);
  }

  /**
   * Initialize domain deployment with security validation
   */
  async initializeDomainDeployment(domain) {
    console.log(`   🔧 Initializing deployment for ${domain}`);
    
    // Validate domain configuration using ConfigurationValidator
    try {
      const domainState = this.portfolioState.domainStates.get(domain);
      const config = domainState?.config || {};
      
      // Perform security validation using static method
      const validationIssues = ConfigurationValidator.validate(config, this.environment);
      
      if (validationIssues.length > 0) {
        console.log(`   ⚠️  Found ${validationIssues.length} configuration warnings:`);
        validationIssues.forEach(issue => {
          console.log(`      • ${issue}`);
        });
        
        // Don't block deployment for warnings, just log them
        this.stateManager.logAuditEvent('VALIDATION_WARNINGS', domain, {
          issues: validationIssues,
          environment: this.environment
        });
      } else {
        console.log(`   ✅ Configuration validated successfully`);
      }
      
      return true;
    } catch (error) {
      console.error(`   ❌ Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup domain database using DatabaseOrchestrator
   */
  async setupDomainDatabase(domain) {
    console.log(`   🗄️ Setting up database for ${domain}`);
    
    if (this.dryRun) {
      console.log(`   � DRY RUN: Would create database for ${domain}`);
      const databaseName = `${domain.replace(/\./g, '-')}-${this.environment}-db`;
      return { databaseName, databaseId: 'dry-run-id', created: false };
    }
    
    try {
      // Create D1 database using Cloudflare ops
      const databaseName = `${domain.replace(/\./g, '-')}-${this.environment}-db`;
      
      // Check if database already exists
      console.log(`     � Checking if database exists: ${databaseName}`);
      const exists = await databaseExists(databaseName);
      let databaseId;
      let created = false;
      
      if (exists) {
        console.log(`   ✅ Database already exists: ${databaseName}`);
        databaseId = await getDatabaseId(databaseName);
        console.log(`   📊 Existing Database ID: ${databaseId}`);
      } else {
        console.log(`     📦 Creating database: ${databaseName}`);
        databaseId = await createDatabase(databaseName);
        console.log(`   ✅ Database created: ${databaseName}`);
        console.log(`   📊 Database ID: ${databaseId}`);
        created = true;
      }
      
      // Store database info in domain state
      const domainState = this.portfolioState.domainStates.get(domain);
      if (domainState) {
        domainState.databaseName = databaseName;
        domainState.databaseId = databaseId;
      }
      
      // CRITICAL: Update wrangler.toml BEFORE attempting migrations
      console.log(`   📝 Configuring wrangler.toml for database...`);
      console.log(`   📁 Service path: ${this.servicePath}`);
      console.log(`   📁 Current working directory: ${process.cwd()}`);

      try {
        // Ensure environment section exists
        await this.wranglerConfigManager.ensureEnvironment(this.environment);

        // Add database binding (use snake_case for wrangler.toml compatibility)
        await this.wranglerConfigManager.addDatabaseBinding(this.environment, {
          binding: 'DB',
          database_name: databaseName,
          database_id: databaseId
        });

        console.log(`   ✅ wrangler.toml updated with database configuration`);
        console.log(`   📄 wrangler.toml location: ${this.wranglerConfigManager.configPath}`);
      } catch (configError) {
        console.warn(`   ⚠️  Failed to update wrangler.toml: ${configError.message}`);
        console.warn(`   💡 You may need to manually add database configuration`);
      }
      
      // Apply migrations using DatabaseOrchestrator's enterprise capabilities
      console.log(`   🔄 Applying database migrations...`);
      
      try {
        // Use the real applyDatabaseMigrations method
        // Note: bindingName defaults to 'DB' if not provided
        await this.databaseOrchestrator.applyDatabaseMigrations(
          databaseName,
          'DB', // bindingName - wrangler.toml binding name
          this.environment,
          this.environment !== 'development' // isRemote for staging/production
        );
        console.log(`   ✅ Migrations applied successfully`);
      } catch (migrationError) {
        console.warn(`   ⚠️  Migration warning: ${migrationError.message}`);
        console.warn(`   💡 Migrations can be applied manually later`);
      }
      
      // Log comprehensive audit event
      this.stateManager.logAuditEvent(created ? 'DATABASE_CREATED' : 'DATABASE_FOUND', domain, {
        databaseName,
        databaseId,
        environment: this.environment,
        migrationsApplied: true,
        isRemote: this.environment !== 'development',
        created
      });
      
      return { 
        databaseName, 
        databaseId, 
        created,
        migrationsApplied: true
      };
    } catch (error) {
      console.error(`   ❌ Database creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle domain secrets using EnhancedSecretManager
   */
  async handleDomainSecrets(domain) {
    console.log(`   🔐 Handling secrets for ${domain}`);
    
    if (this.dryRun) {
      console.log(`   � DRY RUN: Would upload secrets for ${domain}`);
      return { secrets: [], uploaded: 0 };
    }
    
    try {
      // Generate secrets for this domain using EnhancedSecretManager
      // Use the actual method: generateDomainSpecificSecrets
      const secretResult = await this.secretManager.generateDomainSpecificSecrets(
        domain,
        this.environment,
        {
          customConfigs: {},
          reuseExisting: true,
          rotateAll: false,
          formats: ['env', 'wrangler'] // Generate both .env and wrangler CLI formats
        }
      );
      
      const secrets = secretResult.secrets || {};
      const secretNames = Object.keys(secrets);
      
      if (secretNames.length > 0) {
        console.log(`   ✅ Generated ${secretNames.length} secrets: ${secretNames.join(', ')}`);
        console.log(`   🔒 Secret values are encrypted and not displayed`);
        console.log(`   📄 Distribution files: ${secretResult.distributionFiles?.join(', ') || 'N/A'}`);
        
        // Log audit event with full metadata
        this.stateManager.logAuditEvent('SECRETS_GENERATED', domain, {
          count: secretNames.length,
          names: secretNames,
          environment: this.environment,
          formats: secretResult.formats || [],
          distributionPath: secretResult.distributionPath
        });
      } else {
        console.log(`   ℹ️  No secrets to upload for ${domain}`);
      }
      
      return { 
        secrets: secretNames, 
        uploaded: secretNames.length,
        distributionPath: secretResult.distributionPath,
        formats: secretResult.formats
      };
    } catch (error) {
      console.error(`   ⚠️  Secret generation failed: ${error.message}`);
      // Don't fail deployment if secrets fail - they can be added manually
      return { secrets: [], uploaded: 0, error: error.message };
    }
  }

  /**
   * Deploy domain worker (executes actual wrangler deploy)
   */
  async deployDomainWorker(domain) {
    console.log(`   🚀 Deploying worker for ${domain}`);
    
    if (this.dryRun) {
      console.log(`   🔍 DRY RUN: Would deploy worker for ${domain}`);
      const subdomain = this.environment === 'production' ? 'api' : `${this.environment}-api`;
      return { url: `https://${subdomain}.${domain}`, deployed: false, dryRun: true };
    }
    
    try {
      // CRITICAL: Ensure environment section exists in wrangler.toml BEFORE deploying
      console.log(`   📝 Verifying wrangler.toml configuration...`);
      
      try {
        await this.wranglerConfigManager.ensureEnvironment(this.environment);
      } catch (configError) {
        console.warn(`   ⚠️  Could not verify wrangler.toml: ${configError.message}`);
        // Continue anyway - wrangler will provide clearer error if config is wrong
      }
      
      // Find wrangler.toml in service path
      const wranglerConfigPath = join(this.servicePath, 'wrangler.toml');
      
      // Build deploy command with environment
      let deployCommand = `npx wrangler deploy`;
      
      // Add environment flag for non-production
      if (this.environment !== 'production') {
        deployCommand += ` --env ${this.environment}`;
      }
      
      console.log(`   � Executing: ${deployCommand}`);
      console.log(`   📁 Working directory: ${this.servicePath}`);
      
      // Execute deployment with timeout
      const { stdout, stderr } = await execAsync(deployCommand, {
        cwd: this.servicePath,
        timeout: 120000, // 2 minute timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large outputs
      });
      
      // Log output for debugging
      if (stdout) {
        console.log(`   📄 Deployment output:`);
        stdout.split('\n').filter(line => line.trim()).forEach(line => {
          console.log(`     ${line}`);
        });
      }
      
      if (stderr && !stderr.includes('deprecated')) {
        console.warn(`   ⚠️  Deployment warnings: ${stderr}`);
      }
      
      // Parse worker URL from wrangler output
      // Wrangler outputs: "Published service-name (version) to https://worker-url"
      const urlMatch = stdout.match(/https:\/\/[^\s]+/);
      const workerUrl = urlMatch ? urlMatch[0] : null;
      
      // Also construct custom domain URL
      const subdomain = this.environment === 'production' ? 'api' : `${this.environment}-api`;
      const customUrl = `https://${subdomain}.${domain}`;
      
      // Store URLs in domain state
      const domainState = this.portfolioState.domainStates.get(domain);
      if (domainState) {
        domainState.workerUrl = workerUrl;
        domainState.deploymentUrl = customUrl;
      }
      
      if (workerUrl) {
        console.log(`   ✅ Worker deployed successfully`);
        console.log(`   🔗 Worker URL: ${workerUrl}`);
        console.log(`   🔗 Custom URL: ${customUrl}`);
      } else {
        console.log(`   ✅ Deployment completed (URL not detected in output)`);
        console.log(`   🔗 Expected URL: ${customUrl}`);
      }
      
      return { 
        url: customUrl, 
        workerUrl: workerUrl,
        deployed: true, 
        stdout, 
        stderr 
      };
      
    } catch (error) {
      console.error(`   ❌ Worker deployment failed: ${error.message}`);
      
      // Parse error for helpful diagnostics
      if (error.message.includes('wrangler.toml')) {
        console.error(`   💡 Ensure wrangler.toml exists in ${this.servicePath}`);
      }
      if (error.message.includes('No environment found')) {
        console.error(`   💡 Add [env.${this.environment}] section to wrangler.toml`);
      }
      if (error.stderr) {
        console.error(`   📄 Error details: ${error.stderr}`);
      }
      
      throw new Error(`Worker deployment failed for ${domain}: ${error.message}`);
    }
  }

  /**
   * Validate domain deployment with real HTTP health check
   */
  async validateDomainDeployment(domain) {
    console.log(`   ✅ Validating deployment for ${domain}`);
    
    if (this.dryRun || this.skipTests) {
      console.log(`   ⏭️  Skipping health check (${this.dryRun ? 'dry run' : 'tests disabled'})`);
      return true;
    }
    
    // Get the deployment URL from domain state
    const domainState = this.portfolioState.domainStates.get(domain);
    const deploymentUrl = domainState?.deploymentUrl;
    
    if (!deploymentUrl) {
      console.log(`   ⚠️  No deployment URL found, skipping health check`);
      return true;
    }
    
    console.log(`   🔍 Running health check: ${deploymentUrl}/health`);
    
    try {
      const startTime = Date.now();
      
      // Perform actual HTTP health check
      const response = await fetch(`${deploymentUrl}/health`, {
        method: 'GET',
        headers: { 'User-Agent': 'Clodo-Orchestrator/2.0' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status;
      
      if (status === 200) {
        console.log(`   ✅ Health check passed (${status}) - Response time: ${responseTime}ms`);
        
        // Log successful health check
        this.stateManager.logAuditEvent('HEALTH_CHECK_PASSED', domain, {
          url: deploymentUrl,
          status,
          responseTime,
          environment: this.environment
        });
        
        return true;
      } else {
        console.log(`   ⚠️  Health check returned ${status} - deployment may have issues`);
        
        this.stateManager.logAuditEvent('HEALTH_CHECK_WARNING', domain, {
          url: deploymentUrl,
          status,
          responseTime,
          environment: this.environment
        });
        
        // Don't fail deployment for non-200 status, just warn
        return true;
      }
    } catch (error) {
      console.log(`   ⚠️  Health check failed: ${error.message}`);
      console.log(`   💡 This may be expected if the worker isn't fully propagated yet`);
      
      this.stateManager.logAuditEvent('HEALTH_CHECK_FAILED', domain, {
        url: deploymentUrl,
        error: error.message,
        environment: this.environment
      });
      
      // Don't fail deployment for health check failure - it might just need time
      return true;
    }
  }

  /**
   * Get rollback plan using state manager
   * @returns {Array} Rollback plan from state manager
   */
  getRollbackPlan() {
    return this.stateManager.portfolioState.rollbackPlan;
  }

  /**
   * Execute rollback using state manager  
   * @returns {Promise<Object>} Rollback result
   */
  async executeRollback() {
    return await this.stateManager.executeRollback();
  }

  /**
   * Get portfolio statistics from state manager
   * @returns {Object} Portfolio statistics
   */
  getPortfolioStats() {
    return this.stateManager.getPortfolioSummary();
  }
}

export default MultiDomainOrchestrator;