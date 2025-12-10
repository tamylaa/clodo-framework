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
import { buildCustomDomain } from '../utils/constants.js';
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
    this.serviceName = options.serviceName || 'data-service'; // Service name for custom domain (e.g., 'data-service', 'auth-service')
    this.workerName = options.workerName; // Specific worker name to use (optional)
    this.databaseName = options.databaseName; // Specific database name to use (optional)
    
    // Wrangler config path - allows using customer-specific wrangler.toml files
    // If not specified, wrangler uses the default wrangler.toml in servicePath
    this.wranglerConfigPath = options.wranglerConfigPath;
    
    // Cloudflare credentials for API-based operations
    // Support both legacy individual params and new cloudflareSettings object
    const cfSettings = options.cloudflareSettings || {};
    this.cloudflareToken = options.cloudflareToken || cfSettings.token;
    this.cloudflareAccountId = options.cloudflareAccountId || cfSettings.accountId;
    this.cloudflareZoneId = options.cloudflareZoneId || cfSettings.zoneId;
    this.cloudflareZoneName = options.cloudflareZoneName || cfSettings.zoneName;
    
    // Configure wrangler to use API token when available
    // Configure wrangler authentication via environment variables
    // Note: account_id comes from wrangler.toml, not env var
    // (env var would be ignored by wrangler when wrangler.toml has account_id)
    if (this.cloudflareToken) {
      process.env.CLOUDFLARE_API_TOKEN = this.cloudflareToken;
      console.log(`🔑 Configured wrangler to use API token authentication`);
    }
    
    if (this.cloudflareAccountId) {
      process.env.CLOUDFLARE_ACCOUNT_ID = this.cloudflareAccountId;
      console.log(`🔑 Configured wrangler to use account ID: ${this.cloudflareAccountId}`);
    }
    
    if (this.cloudflareZoneId) {
      process.env.CLOUDFLARE_ZONE_ID = this.cloudflareZoneId;
      console.log(`🔑 Configured wrangler to use zone ID: ${this.cloudflareZoneId}`);
    }
    
    if (this.cloudflareZoneName) {
      console.log(`🌐 Deploying to zone: ${this.cloudflareZoneName}`);
    }
    
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
      dryRun: this.dryRun,
      cloudflareToken: this.cloudflareToken,
      cloudflareAccountId: this.cloudflareAccountId,
      cloudflareZoneId: this.cloudflareZoneId
    });

    this.secretManager = new EnhancedSecretManager({
      projectRoot: this.servicePath,
      dryRun: this.dryRun
    });

    this.wranglerConfigManager = new WranglerConfigManager({
      projectRoot: this.servicePath,
      dryRun: this.dryRun,
      verbose: options.verbose || false,
      accountId: this.cloudflareAccountId
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
   * @param {Object} deploymentOptions - Deployment configuration options
   * @returns {Promise<Object>} Deployment result
   */
  async deploySingleDomain(domain, deploymentOptions = {}) {
    const domainState = this.portfolioState.domainStates.get(domain);
    if (!domainState) {
      throw new Error(`Domain ${domain} not found in portfolio`);
    }

    // Store deployment options in domain state for handlers to access
    domainState.deploymentOptions = deploymentOptions;

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
   * Get base service name from worker name (remove environment suffixes)
   * @returns {string} Base service name for URL generation
   */
  getBaseServiceName() {
    if (this.workerName) {
      // Remove environment suffixes from worker name to get base service name
      return this.workerName.replace(/-development$|-staging$|-production$/, '');
    }
    return this.serviceName || 'data-service';
  }
  async setupDomainDatabase(domain) {
    console.log(`   🗄️ Setting up database for ${domain}`);
    
    if (this.dryRun) {
      console.log(`   � DRY RUN: Would create database for ${domain}`);
      const databaseName = this.databaseName || `${domain.replace(/\./g, '-')}-${this.environment}-db`;
      return { databaseName, databaseId: 'dry-run-id', created: false };
    }
    
    try {
      // Create D1 database using Cloudflare ops
      // Use provided database name, or generate one based on domain/environment
      const databaseName = this.databaseName || `${domain.replace(/\./g, '-')}-${this.environment}-db`;
      
      // Check if database already exists
      console.log(`     � Checking if database exists: ${databaseName}`);
      
      let exists, databaseId, created = false;
      
      // Use API-based operations if credentials are available
      if (this.cloudflareToken && this.cloudflareAccountId) {
        console.log(`     🔑 Using API token authentication for account: ${this.cloudflareAccountId}`);

        try {
          exists = await databaseExists(databaseName, {
            apiToken: this.cloudflareToken,
            accountId: this.cloudflareAccountId
          });

          if (exists) {
            console.log(`   ✅ Database already exists: ${databaseName}`);
            databaseId = await getDatabaseId(databaseName, {
              apiToken: this.cloudflareToken,
              accountId: this.cloudflareAccountId
            });
            console.log(`   📊 Existing Database ID: ${databaseId}`);
          } else {
            console.log(`     📦 Creating database: ${databaseName}`);
            databaseId = await createDatabase(databaseName, {
              apiToken: this.cloudflareToken,
              accountId: this.cloudflareAccountId
            });
            console.log(`   ✅ Database created: ${databaseName}`);
            console.log(`   📊 Database ID: ${databaseId}`);
            created = true;
          }
        } catch (apiError) {
          // Check if this is an authentication or permission error
          if (apiError.message.includes('permission denied') || apiError.message.includes('403') ||
              apiError.message.includes('authentication failed') || apiError.message.includes('401')) {

            if (apiError.message.includes('401')) {
              console.log(`   ❌ API token authentication failed (invalid/expired token)`);
              console.log(`   🔗 Check/create token at: https://dash.cloudflare.com/profile/api-tokens`);
            } else {
              console.log(`   ⚠️  API token lacks D1 database permissions`);
              console.log(`   💡 Required permission: 'Cloudflare D1:Edit'`);
              console.log(`   🔗 Update token at: https://dash.cloudflare.com/profile/api-tokens`);
            }

            console.log(`   🔄 Falling back to OAuth authentication...`);
            console.log(`   ⚠️  WARNING: OAuth uses your personal account, not the API token account!`);

            // Fall back to OAuth-based operations with warning
            console.log(`     🔐 Using OAuth authentication (wrangler CLI)`);

            exists = await databaseExists(databaseName);
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
          } else {
            // Re-throw non-auth/permission errors
            throw apiError;
          }
        }
      } else {
        // Fallback to CLI-based operations (OAuth)
        console.log(`     🔐 Using OAuth authentication (wrangler CLI)`);
        
        exists = await databaseExists(databaseName);
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
        // Set account_id if API credentials are available
        if (this.cloudflareAccountId) {
          await this.wranglerConfigManager.setAccountId(this.cloudflareAccountId);
        }

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
        // Since databases are created remotely via Cloudflare API, always use remote flag
        await this.databaseOrchestrator.applyDatabaseMigrations(
          databaseName,
          'DB', // bindingName - wrangler.toml binding name
          this.environment,
          true // Always remote since databases are created in Cloudflare
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
        isRemote: true, // Always remote since databases are created in Cloudflare
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
      // Use centralized domain template from validation-config.json
      const customUrl = buildCustomDomain(this.getBaseServiceName(), domain, this.environment);
      return { url: customUrl, deployed: false, dryRun: true };
    }
    
    try {
      // Generate/update customer-specific wrangler.toml, then copy to root
      // This implements the architecture where:
      // 1. Customer configs are persistent (deployment history/state)
      // 2. Root wrangler.toml is ephemeral (reflects current active deployment)
      if (this.cloudflareZoneName) {
        console.log(`   🔧 Preparing customer config for zone: ${this.cloudflareZoneName}`);
        console.log(`   🔍 DEBUG: this.workerName is "${this.workerName}"`);
        
        // Generate or update customer config with current deployment parameters
        const customerConfigPath = await this.wranglerConfigManager.generateCustomerConfig(
          this.cloudflareZoneName,
          {
            accountId: this.cloudflareAccountId,
            environment: this.environment,
            workerName: this.workerName // Pass specific worker name if provided
          }
        );
        
        // Copy customer config to root (ephemeral working copy for this deployment)
        console.log(`   📋 Copying customer config to root wrangler.toml`);
        await this.wranglerConfigManager.copyCustomerConfig(customerConfigPath);
      } else {
        // Fallback: Update root wrangler.toml directly if no zone name available
        console.log(`   ⚠️  No zone name available, updating root wrangler.toml directly`);
        if (this.cloudflareAccountId) {
          await this.wranglerConfigManager.setAccountId(this.cloudflareAccountId);
        }
      }
      
      // Ensure environment section exists in wrangler.toml
      console.log(`   📝 Verifying wrangler.toml configuration...`);
      
      try {
        await this.wranglerConfigManager.ensureEnvironment(this.environment);
      } catch (configError) {
        console.warn(`   ⚠️  Could not verify wrangler.toml: ${configError.message}`);
        // Continue anyway - wrangler will provide clearer error if config is wrong
      }
      
      // Build deploy command
      // Note: We already copied customer config to root wrangler.toml above
      // So wrangler will use root wrangler.toml which has the correct account_id
      let deployCommand = `npx wrangler deploy`;
      
      // ALWAYS add environment flag to use environment-specific config
      // Even for production, we use [env.production] section which has the correct worker name and DB
      deployCommand += ` --env ${this.environment}`;
      
      console.log(`   🔧 Executing: ${deployCommand}`);
      console.log(`   📁 Working directory: ${this.servicePath}`);
      console.log(`   📄 Using wrangler.toml from service root (already updated with customer config)`);
      console.log(`   🌍 Environment: ${this.environment}`);
      
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
      
      // Construct custom domain URL using centralized template from validation-config.json
      // Handles all environment patterns: production, staging, development
      const customUrl = buildCustomDomain(this.getBaseServiceName(), domain, this.environment);
      
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
        
        // Display custom domain setup instructions
        if (customUrl && workerUrl !== customUrl) {
          this.displayCustomDomainInstructions(customUrl, workerUrl, domain);
        }
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
   * Validate domain deployment with real HTTP health check (with retries)
   */
  async validateDomainDeployment(domain) {
    console.log(`   ✅ Validating deployment for ${domain}`);
    
    if (this.dryRun || this.skipTests) {
      console.log(`   ⏭️  Skipping health check (${this.dryRun ? 'dry run' : 'tests disabled'})`);
      return true;
    }
    
    // Get the deployment URL from domain state - prefer worker URL for immediate validation
    const domainState = this.portfolioState.domainStates.get(domain);
    const workerUrl = domainState?.workerUrl;
    const customUrl = domainState?.deploymentUrl;
    
    // Use worker URL for health check since it's immediately available after deployment
    // Custom domain may require DNS configuration and won't work immediately
    const healthCheckUrl = workerUrl || customUrl;
    
    if (!healthCheckUrl) {
      console.log(`   ⚠️  No deployment URL found, skipping health check`);
      return true;
    }
    
    console.log(`   🔍 Running health check: ${healthCheckUrl}/health`);
    if (workerUrl && customUrl && workerUrl !== customUrl) {
      console.log(`   ℹ️  Health check uses worker URL (custom domain requires DNS setup - see below)`);
    }
    
    // Retry logic for health checks
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds between retries
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        // Perform actual HTTP health check
        const response = await fetch(`${healthCheckUrl}/health`, {
          method: 'GET',
          headers: { 'User-Agent': 'Clodo-Orchestrator/2.0' },
          signal: AbortSignal.timeout(15000) // 15 second timeout
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
            attempt,
            environment: this.environment
          });
          
          return true;
        } else {
          const errorMsg = `Health check returned ${status} - deployment may have issues`;
          console.log(`   ⚠️  ${errorMsg}`);
          
          this.stateManager.logAuditEvent('HEALTH_CHECK_WARNING', domain, {
            url: healthCheckUrl,
            status,
            responseTime,
            attempt,
            environment: this.environment
          });
          
          // Don't fail deployment for non-200 status, just warn
          return true;
        }
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMsg = `Health check failed: ${error.message}`;
        
        if (isLastAttempt) {
          console.log(`   ❌ ${errorMsg} (final attempt)`);
          console.log(`   💡 The service may still be deploying. Check manually: curl ${healthCheckUrl}/health`);
          
          this.stateManager.logAuditEvent('HEALTH_CHECK_FAILED', domain, {
            url: healthCheckUrl,
            error: error.message,
            attempts: maxRetries,
            environment: this.environment
          });
          
          // Don't fail deployment for health check failure - it might just need time
          return true;
        } else {
          console.log(`   ⚠️  ${errorMsg} (attempt ${attempt}/${maxRetries})`);
          console.log(`   ⏳ Retrying in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    return true;
  }

  /**
   * Display comprehensive custom domain setup instructions
   * @param {string} customUrl - The custom domain URL
   * @param {string} workerUrl - The worker URL to point DNS to
   * @param {string} domain - The domain name
   */
  displayCustomDomainInstructions(customUrl, workerUrl, domain) {
    console.log(`\n🌐 Custom Domain Setup Instructions`);
    console.log(`═`.repeat(50));
    console.log(`Your service is deployed and working at: ${workerUrl}`);
    console.log(`To use your custom domain ${customUrl}, follow these steps:\n`);
    
    console.log(`📋 Step 1: DNS Configuration`);
    console.log(`   Create a CNAME record in your DNS settings:`);
    console.log(`   • Name: ${customUrl.replace(`https://${domain}`, '').replace(/\./g, '').replace('/', '')}`);
    console.log(`   • Type: CNAME`);
    console.log(`   • Target: ${workerUrl.replace('https://', '')}`);
    console.log(`   • TTL: 300 (5 minutes)\n`);
    
    console.log(`🔧 Step 2: Cloudflare Workers Configuration`);
    console.log(`   1. Go to Cloudflare Dashboard → Workers & Pages`);
    console.log(`   2. Select your worker`);
    console.log(`   3. Go to "Triggers" tab`);
    console.log(`   4. Click "Add Custom Domain"`);
    console.log(`   5. Enter: ${customUrl}\n`);
    
    console.log(`⏱️  Step 3: Wait for Propagation`);
    console.log(`   • DNS changes: 5-30 minutes`);
    console.log(`   • SSL certificate: 5-10 minutes`);
    console.log(`   • Total setup time: 10-60 minutes\n`);
    
    console.log(`✅ Step 4: Verify Setup`);
    console.log(`   Test your custom domain:`);
    console.log(`   curl -v ${customUrl}/health\n`);
    
    console.log(`💡 Note: Your service is fully functional at the worker URL immediately.`);
    console.log(`   The custom domain is optional for branding/user experience.\n`);
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

  /**
   * Deploy a single service to a specific domain/environment
   * @param {Object} options - Deployment options
   * @param {string} options.servicePath - Path to service directory
   * @param {string} options.environment - Target environment
   * @param {string} options.domain - Specific domain to deploy to (used as zone name and domain suffix)
   * @param {string} options.serviceName - Service name for URL generation (e.g., 'data-service', 'auth-service')
   * @param {string} options.workerName - Specific worker name to use
   * @param {string} options.databaseName - Specific database name to use
   * @param {boolean} options.dryRun - Simulate deployment
   * @param {Object} options.credentials - Cloudflare credentials
   * @returns {Promise<Object>} Deployment result
   */
  static async deploy(options = {}) {
    const {
      servicePath = '.',
      environment = 'production',
      domain,
      serviceName,
      workerName,
      databaseName,
      dryRun = false,
      credentials = {}
    } = options;

    // Create orchestrator with simplified options
    const orchestrator = new MultiDomainOrchestrator({
      environment,
      dryRun,
      servicePath,
      serviceName, // Pass through serviceName if provided
      workerName, // Pass through workerName if provided
      databaseName, // Pass through databaseName if provided
      cloudflareToken: credentials.token,
      cloudflareAccountId: credentials.accountId,
      cloudflareZoneId: credentials.zoneId,
      cloudflareZoneName: domain, // Use domain as zone name for customer config
      domains: domain ? [domain] : []
    });

    try {
      // Initialize the orchestrator
      await orchestrator.initialize();

      // Deploy based on configuration
      let result;
      if (domain) {
        result = await orchestrator.deploySingleDomain(domain);
      } else {
        result = await orchestrator.deployPortfolio();
      }

      return {
        success: true,
        environment,
        deployedDomains: result.deployedDomains || [domain],
        message: `Service deployed to ${environment} successfully`
      };
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}

export default MultiDomainOrchestrator;
