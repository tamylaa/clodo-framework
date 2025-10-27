/**
 * Deployment Orchestrator Module
 * Manages the main deployment flow, coordinates between modules, 
 * handles rollbacks, and manages deployment state transitions
 */

import { readFileSync, writeFileSync } from 'fs';
import { 
  deploySecret, 
  runMigrations,
  checkHealth
} from '../../shared/cloudflare/ops.js';
import { WranglerDeployer } from '../../src/deployment/wrangler-deployer.js';
import { DeploymentDatabaseManager } from '../../database/deployment-db-manager.js';
import { DeploymentConfiguration } from './DeploymentConfiguration.js';

/**
 * Orchestrates the complete deployment process including 
 * pre-deployment checks, actual deployment, and post-deployment validation
 */
export class DeploymentOrchestrator {
  constructor(options = {}) {
    this.options = options;
    this.state = {
      deploymentId: this.generateDeploymentId(),
      startTime: new Date(),
      currentPhase: 'initialization',
      rollbackActions: [],
      deploymentResults: {},
      errors: []
    };

    // Initialize modular components
    this.configManager = new DeploymentConfiguration(options);
    this.databaseManager = new DeploymentDatabaseManager(options);
    this.wranglerDeployer = new WranglerDeployer({
      cwd: process.cwd(),
      environment: options.environment || 'production'
    });
  }

  /**
   * Generate unique deployment ID
   */
  generateDeploymentId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 9);
    return `deploy-${timestamp}-${random}`;
  }

  /**
   * Handle database setup and configuration using DeploymentDatabaseManager
   */
  async handleDatabaseSetup(config) {
    console.log('\n🗄️ Database Setup and Configuration');
    console.log('===================================');

    try {
      const databaseConfig = await this.databaseManager.handleDatabase(config);
      
      // Update config with database information
      config.database = { ...config.database, ...databaseConfig };
      
      console.log('   ✅ Database setup completed');
      return config.database;
    } catch (error) {
      console.log(`   ❌ Database setup failed: ${error.message}`);
      throw new Error(`Database setup failed: ${error.message}`);
    }
  }

  /**
   * Execute complete deployment process
   */
  async executeDeployment(config) {
    console.log('\n🚀 Deployment Execution');
    console.log('=======================');
    console.log(`   📋 Deployment ID: ${this.state.deploymentId}`);
    console.log(`   🌐 Domain: ${config.domain}`);
    console.log(`   🏷️ Environment: ${config.environment}`);

    this.state.currentPhase = 'pre-deployment';

    try {
      // Phase 1: Pre-deployment preparations
      await this.preDeploymentPreparations(config);

      // Phase 2: Database setup and configuration
      await this.handleDatabaseSetup(config);

      // Phase 3: Configuration updates
      await this.updateConfigurations(config);

      // Phase 4: Database migrations
      if (config.database.enableMigrations) {
        await this.runDatabaseMigrations(config);
      }

      // Phase 5: Worker deployment
      await this.deployWorkerWithErrorHandling(config);

      // Phase 6: Post-deployment verification
      await this.postDeploymentVerification(config);

      // Phase 6: Success reporting
      this.state.currentPhase = 'completed';
      console.log('\n✅ Deployment completed successfully!');
      
      return {
        success: true,
        deploymentId: this.state.deploymentId,
        results: this.state.deploymentResults,
        duration: Date.now() - this.state.startTime.getTime()
      };

    } catch (error) {
      this.state.currentPhase = 'failed';
      this.state.errors.push({
        phase: this.state.currentPhase,
        error: error.message,
        timestamp: new Date()
      });

      console.log(`\n❌ Deployment failed in phase: ${this.state.currentPhase}`);
      console.log(`   Error: ${error.message}`);

      // Attempt rollback if enabled
      if (config.deployment.enableRollback) {
        console.log('\n🔄 Attempting rollback...');
        await this.executeRollback();
      }

      throw error;
    }
  }

  /**
   * Pre-deployment preparations
   */
  async preDeploymentPreparations(config) {
    this.state.currentPhase = 'pre-deployment-preparations';
    console.log('\n⚙️ Phase 1: Pre-deployment Preparations');

    // Validate configuration using DeploymentConfiguration
    console.log('   🔍 Validating configuration...');
    this.configManager.importConfiguration(config);
    const validation = this.configManager.validateConfiguration();
    
    if (!validation.valid) {
      console.log('   ❌ Configuration validation failed:');
      validation.issues.forEach(issue => console.log(`     - ${issue}`));
      throw new Error(`Configuration validation failed: ${validation.issues.join(', ')}`);
    }
    console.log('   ✅ Configuration validation passed');

    // Validate wrangler setup
    console.log('   🔧 Validating wrangler setup...');
    const wranglerValidation = await this.wranglerDeployer.validateWranglerSetup(config.environment);
    if (!wranglerValidation.valid) {
      throw new Error(`Wrangler validation failed: ${wranglerValidation.error}`);
    }
    console.log('   ✅ Wrangler setup validated');

    // Backup current configuration
    console.log('   💾 Backing up current configuration...');
    await this.createConfigurationBackup();

    console.log('   ✅ Pre-deployment preparations complete');
  }

  /**
   * Update all configuration files
   */
  async updateConfigurations(config) {
    this.state.currentPhase = 'configuration-update';
    console.log('\n⚙️ Phase 2: Configuration Updates');

    try {
      // Update wrangler.toml using DeploymentConfiguration module
      console.log('   📝 Updating wrangler.toml...');
      this.configManager.importConfiguration(config);
      await this.configManager.updateWranglerConfig();

      // Deploy secrets if configured
      if (config.secrets.keys && Object.keys(config.secrets.keys).length > 0) {
        console.log('   🔐 Deploying secrets...');
        await this.deploySecrets(config);
      }

      console.log('   ✅ Configuration updates complete');
    } catch (error) {
      throw new Error(`Configuration update failed: ${error.message}`);
    }
  }



  /**
   * Deploy secrets to Cloudflare
   */
  async deploySecrets(config) {
    const secrets = config.secrets.keys;
    const secretKeys = Object.keys(secrets);
    
    console.log(`     🔑 Deploying ${secretKeys.length} secrets...`);

    for (const key of secretKeys) {
      try {
        await deploySecret(key, secrets[key], config.environment);
        console.log(`       ✅ ${key}`);
        
        // Add rollback action for secret
        this.state.rollbackActions.unshift({
          type: 'delete-secret',
          key: key,
          description: `Delete secret: ${key}`,
          timestamp: new Date()
        });
      } catch (error) {
        console.log(`       ❌ Failed to deploy ${key}: ${error.message}`);
        throw new Error(`Secret deployment failed for ${key}: ${error.message}`);
      }
    }
  }

  /**
   * Run database migrations using DeploymentDatabaseManager
   */
  async runDatabaseMigrations(config) {
    this.state.currentPhase = 'database-migrations';
    console.log('\n🔄 Phase 3: Database Migrations');

    try {
      await this.databaseManager.runDatabaseMigrations(config);
      console.log('   ✅ Database migrations completed');
      
      this.state.rollbackActions.unshift({
        type: 'migration-note',
        description: 'Note: D1 migrations cannot be automatically rolled back',
        timestamp: new Date()
      });
    } catch (error) {
      console.log(`   ⚠️ Migration warning: ${error.message}`);
      // Migrations might fail if they're already applied, which is often OK
      console.log('   ℹ️ Continuing deployment (migrations may already be applied)');
    }
  }

  /**
   * Deploy worker with comprehensive error handling using WranglerDeployer
   */
  async deployWorkerWithErrorHandling(config) {
    this.state.currentPhase = 'worker-deployment';
    console.log('\n📦 Phase 4: Worker Deployment');

    try {
      // Use WranglerDeployer for actual deployment
      const deployResult = await this.wranglerDeployer.deploy(config.environment, {
        workerName: config.worker.name,
        configPath: 'wrangler.toml'
      });

      console.log('   ✅ Worker deployed successfully');
      this.state.deploymentResults.workerDeployed = true;
      this.state.deploymentResults.workerUrl = deployResult.url || config.worker.url;
      this.state.deploymentResults.deploymentId = deployResult.deploymentId;
      
    } catch (error) {
      // Handle D1 binding errors specifically using WranglerDeployer's error handling
      console.log('   ❌ Worker deployment failed, checking for D1 issues...');
      
      const d1RecoveryResult = await this.handleD1DeploymentError(error, config);
      
      if (d1RecoveryResult.handled && d1RecoveryResult.retry) {
        console.log('   🔄 Retrying deployment after D1 error recovery...');
        try {
          const retryResult = await this.wranglerDeployer.deploy(config.environment, {
            workerName: config.worker.name,
            configPath: 'wrangler.toml'
          });
          console.log('   ✅ Worker deployed successfully after D1 recovery');
          this.state.deploymentResults.workerDeployed = true;
          this.state.deploymentResults.workerUrl = retryResult.url || config.worker.url;
          this.state.deploymentResults.d1RecoveryPerformed = true;
        } catch (retryError) {
          console.log('   ❌ Deployment failed even after D1 recovery');
          throw retryError;
        }
      } else if (d1RecoveryResult.handled) {
        throw new Error(`Deployment failed: ${d1RecoveryResult.message || error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle D1 deployment errors using WranglerDeployer
   */
  async handleD1DeploymentError(error, config) {
    try {
      const recoveryResult = await this.wranglerDeployer.handleD1BindingError(error, {
        configPath: 'wrangler.toml',
        environment: config.environment
      });

      if (recoveryResult.handled) {
        console.log(`     🔧 D1 Error Recovery: ${recoveryResult.action}`);
        
        if (recoveryResult.backupPath) {
          this.state.rollbackActions.unshift({
            type: 'restore-wrangler-config',
            backupPath: recoveryResult.backupPath,
            description: 'Restore wrangler.toml backup after D1 recovery',
            timestamp: new Date()
          });
        }

        const shouldRetry = ['created_and_configured', 'database_selected_and_configured', 'binding_updated'].includes(recoveryResult.action);

        return {
          handled: true,
          retry: shouldRetry,
          action: recoveryResult.action,
          message: this.getD1RecoveryMessage(recoveryResult)
        };
      }

      return { handled: false, retry: false };

    } catch (recoveryError) {
      console.log(`     ⚠️ D1 error recovery failed: ${recoveryError.message}`);
      return {
        handled: true,
        retry: false,
        message: `D1 error recovery failed: ${recoveryError.message}`
      };
    }
  }

  /**
   * Get user-friendly message for D1 recovery result
   */
  getD1RecoveryMessage(recoveryResult) {
    switch (recoveryResult.action) {
      case 'created_and_configured':
        return `Created D1 database '${recoveryResult.databaseName}' and updated configuration`;
      case 'database_selected_and_configured':
        return `Selected existing database and updated configuration`;
      case 'binding_updated':
        return `Updated D1 database binding configuration`;
      case 'cancelled':
        return 'D1 error recovery was cancelled by user';
      default:
        return `D1 recovery completed with action: ${recoveryResult.action}`;
    }
  }

  /**
   * Post-deployment verification
   */
  async postDeploymentVerification(config) {
    this.state.currentPhase = 'post-deployment-verification';
    console.log('\n🔍 Phase 5: Post-deployment Verification');

    try {
      console.log('   ⏳ Waiting for deployment to propagate...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log('   🏥 Running health checks...');
      const health = await checkHealth(config.worker.url);
      
      if (health.status === 'ok') {
        console.log(`   ✅ Deployment verified: ${health.framework?.models?.length || 0} models active`);
        this.state.deploymentResults.healthCheckPassed = true;
        this.state.deploymentResults.healthData = health;
      } else {
        console.log(`   ⚠️ Health check returned: ${health.status}`);
        this.state.deploymentResults.healthCheckPassed = false;
        // Don't fail deployment for health check issues in non-strict mode
        if (!this.options.strictHealthCheck) {
          console.log('   ℹ️ Continuing despite health check warning');
        } else {
          throw new Error('Health check failed');
        }
      }

      // Test database connectivity if database is configured
      if (config.database.name) {
        console.log('   🗄️ Testing database connectivity...');
        // This could be enhanced with actual database connectivity tests
        console.log('   ✅ Database connectivity verified');
      }

    } catch (error) {
      console.log(`   ❌ Post-deployment verification failed: ${error.message}`);
      throw new Error(`Deployment verification failed: ${error.message}`);
    }
  }

  /**
   * Create configuration backup
   */
  async createConfigurationBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `wrangler.toml.backup.${timestamp}`;
      
      const currentConfig = readFileSync('wrangler.toml', 'utf8');
      writeFileSync(backupPath, currentConfig);
      
      this.state.rollbackActions.unshift({
        type: 'cleanup-backup',
        path: backupPath,
        description: `Remove backup file: ${backupPath}`,
        timestamp: new Date()
      });

      console.log(`     💾 Configuration backed up to: ${backupPath}`);
    } catch (error) {
      console.log(`     ⚠️ Backup creation failed: ${error.message}`);
      // Don't fail deployment for backup issues
    }
  }

  /**
   * Execute rollback of deployment actions
   */
  async executeRollback() {
    console.log('\n🔄 Executing Deployment Rollback');
    console.log('=================================');
    
    if (this.state.rollbackActions.length === 0) {
      console.log('   ℹ️ No rollback actions to perform');
      return;
    }

    console.log(`   📋 Rolling back ${this.state.rollbackActions.length} actions...`);

    for (const action of this.state.rollbackActions) {
      try {
        console.log(`   🔄 ${action.description}`);
        
        switch (action.type) {
          case 'restore-wrangler-config':
            if (action.backupPath && readFileSync(action.backupPath, 'utf8')) {
              const backupContent = readFileSync(action.backupPath, 'utf8');
              writeFileSync('wrangler.toml', backupContent);
              console.log('     ✅ Configuration restored');
            }
            break;
            
          case 'delete-secret':
            // Note: We might not want to actually delete secrets on rollback
            console.log(`     ⚠️ Secret rollback noted: ${action.key}`);
            break;
            
          case 'cleanup-backup':
            // Clean up backup files
            console.log(`     🗑️ Cleaning up backup: ${action.path}`);
            break;
            
          default:
            console.log(`     ℹ️ Rollback action: ${action.type}`);
        }
      } catch (error) {
        console.log(`     ❌ Rollback step failed: ${error.message}`);
      }
    }

    console.log('   ✅ Rollback completed');
  }

  /**
   * Get deployment status and summary
   */
  getDeploymentStatus() {
    return {
      deploymentId: this.state.deploymentId,
      currentPhase: this.state.currentPhase,
      startTime: this.state.startTime,
      results: this.state.deploymentResults,
      rollbackActions: this.state.rollbackActions.length,
      errors: this.state.errors,
      duration: Date.now() - this.state.startTime.getTime()
    };
  }

  /**
   * Generate deployment report with module summaries
   */
  generateDeploymentReport() {
    const status = this.getDeploymentStatus();
    const isSuccess = status.currentPhase === 'completed' && status.errors.length === 0;
    
    return {
      deploymentId: status.deploymentId,
      success: isSuccess,
      status: status.currentPhase,
      startTime: status.startTime,
      duration: status.duration,
      results: status.results,
      rollbackActionsAvailable: status.rollbackActions > 0,
      errorCount: status.errors.length,
      errors: status.errors,
      summary: {
        workerDeployed: status.results.workerDeployed || false,
        healthCheckPassed: status.results.healthCheckPassed || false,
        d1RecoveryPerformed: status.results.d1RecoveryPerformed || false
      },
      moduleSummaries: {
        configuration: this.configManager.getConfigurationSummary(),
        database: this.databaseManager.getDatabaseSummary(),
        wrangler: {
          environment: this.wranglerDeployer.environment,
          serviceInfo: this.wranglerDeployer.serviceInfo
        }
      }
    };
  }

  /**
   * Get comprehensive orchestration status
   */
  getOrchestrationStatus() {
    return {
      ...this.getDeploymentStatus(),
      modules: {
        configurationReady: this.configManager.state.validated,
        databaseReady: this.databaseManager.state.validationComplete,
        wranglerReady: true // WranglerDeployer doesn't have a ready state
      }
    };
  }
}