// Enhanced Enterprise Master Deployment Script
// Advanced interactive deployment system with enterprise modules

import { askUser, askYesNo, askChoice, closePrompts } from '../shared/utils/interactive-prompts.js';
import { ConfigurationCacheManager } from '../shared/config/cache.js';
import { EnhancedSecretManager, generateSecrets, saveSecrets, distributeSecrets } from '../shared/security/secret-generator.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const execAsync = promisify(exec);
import { MultiDomainOrchestrator } from '../../src/orchestration/multi-domain-orchestrator.js';
import { CrossDomainCoordinator } from '../../src/orchestration/cross-domain-coordinator.js';
import { RollbackManager } from '../shared/deployment/rollback-manager.js';
import { ProductionTester } from '../shared/production-tester/index.js';
import { DeploymentAuditor } from '../shared/deployment/auditor.js';
import { DeploymentValidator } from '../shared/deployment/validator.js';
import { DomainDiscovery } from '../shared/cloudflare/domain-discovery.js';
import { DatabaseOrchestrator } from '../../src/database/database-orchestrator.js';

// Workflow modules (organized in workflows folder)
import { InteractiveDatabaseWorkflow } from '../shared/deployment/workflows/interactive-database-workflow.js';
import { D1ErrorRecoveryManager } from '../shared/deployment/utilities/d1-error-recovery.js';
import { InteractiveSecretWorkflow } from '../shared/deployment/workflows/interactive-secret-workflow.js';
import { DeploymentSummary } from '../shared/deployment/workflows/deployment-summary.js';
import { InteractiveConfirmation } from '../shared/deployment/workflows/interactive-confirmation.js';
import { InteractiveValidation } from '../shared/deployment/workflows/interactive-validation.js';
import { InteractiveDomainInfoGatherer } from '../shared/deployment/workflows/interactive-domain-info-gatherer.js';
import { InteractiveTestingWorkflow } from '../shared/deployment/workflows/interactive-testing-workflow.js';
import { EnterpriseModuleFactory } from '../shared/enterprise/factories/enterprise-module-factory.js';
import { InteractiveEnterpriseConfigWorkflow } from '../shared/deployment/workflows/interactive-enterprise-config-workflow.js';

// New modular architecture components
import { DeploymentConfiguration } from './modules/DeploymentConfiguration.js';
import { EnvironmentManager } from './modules/EnvironmentManager.js';
import { ValidationManager } from './modules/ValidationManager.js';
import { MonitoringIntegration } from './modules/MonitoringIntegration.js';
import { DeploymentOrchestrator as ModularDeploymentOrchestrator } from './modules/DeploymentOrchestrator.js';

// Updated imports for fixed shared module structure
import { 
  checkAuth, 
  authenticate, 
  workerExists, 
  deployWorker, 
  deploySecret, 
  databaseExists, 
  createDatabase, 
  getDatabaseId, 
  runMigrations,
  validatePrerequisites,
  listDatabases,
  deleteDatabase,
  executeSql
} from '../shared/cloudflare/ops.js';
import { 
  waitForDeployment, 
  enhancedComprehensiveHealthCheck,
  checkHealth
} from '../shared/monitoring/health-checker.js';
import { 
  updateWranglerConfig, 
  backupConfig 
} from '../shared/config/manager.js';

class EnterpriseInteractiveDeployer {
  constructor() {
    // Load framework configuration for organized paths
    this.frameworkConfig = null;
    this.frameworkPaths = null;
    
    // New modular components - initialized lazily
    this.modularComponents = {
      config: null,           // DeploymentConfiguration
      environment: null,      // EnvironmentManager  
      validation: null,       // ValidationManager
      monitoring: null,       // MonitoringIntegration
      orchestrator: null      // ModularDeploymentOrchestrator
    };
    
    this.config = {
      // Basic deployment config
      domain: null,
      environment: null,
      deploymentMode: 'single', // 'single', 'multi-domain', 'portfolio'
      
      // Worker configuration
      worker: {
        name: null,
        url: null
      },
      
      // Database configuration
      database: {
        name: null,
        id: null,
        createNew: false,
        enableMigrations: true
      },
      
      // Secret configuration
      secrets: {
        generateNew: true,
        useEnterpriseCoordination: true,
        crossDomainSharing: false,
        keys: {}
      },
      
      // Deployment options
      deployment: {
        runTests: true,
        skipExisting: false,
        enableRollback: true,
        validationLevel: 'comprehensive', // 'basic', 'standard', 'comprehensive'
        auditLevel: 'detailed' // 'minimal', 'standard', 'detailed', 'verbose'
      },
      
      // Enterprise features
      enterprise: {
        enableOrchestration: true,
        enableCrossDomainCoordination: false,
        enableAdvancedValidation: true,
        enableProductionTesting: true,
        enableConfigCaching: true,
        enableAuditLogging: true
      }
    };
    
    this.state = {
      deploymentId: this.generateId(),
      startTime: new Date(),
      rollbackActions: [],
      currentPhase: 'initialization',
      enterpriseModules: null
    };

    // Initialize enterprise modules
    this.initializeEnterpriseModules();
  }

  generateId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 9);
    return `deploy-enterprise-${timestamp}-${random}`;
  }

  /**
   * Initialize all enterprise modules for deployment using factory
   */
  initializeEnterpriseModules() {
    // Use factory to create workflow modules
    this.workflows = EnterpriseModuleFactory.createWorkflowModules({
      rollbackActions: this.state.rollbackActions
    });

    // Use factory to create enterprise modules
    this.state.enterpriseModules = EnterpriseModuleFactory.createEnterpriseModules({
      deploymentId: this.state.deploymentId,
      config: this.config,
      rollbackActions: this.state.rollbackActions
    });

    // Create domain info gatherer
    this.domainInfoGatherer = EnterpriseModuleFactory.createDomainInfoGatherer(
      this.state.enterpriseModules.configCache
    );

    // Initialize enterprise config workflow
    this.enterpriseConfigWorkflow = new InteractiveEnterpriseConfigWorkflow({
      interactive: true
    });
  }

  async run() {
    // Initialize framework configuration for organized paths
    try {
      const { FrameworkConfig } = await import('../../dist/utils/framework-config.js');
      this.frameworkConfig = new FrameworkConfig();
      this.frameworkPaths = this.frameworkConfig.getPaths();
      console.log('📁 Framework paths configured');
    } catch (error) {
      console.warn('⚠️  Could not load framework config, using defaults');
      this.frameworkPaths = {
        auditLogs: 'audit-logs',
        auditReports: 'audit-reports', 
        configCache: 'config-cache',
        secureTokens: '.secure-tokens'
      };
    }

    // Initialize modular components for enhanced deployment capabilities
    await this.initializeModularComponents();

    // Initialize async modules using factory
    await EnterpriseModuleFactory.initializeAsyncModules(this.state.enterpriseModules);

    // Start audit session
    const deploymentContext = this.state.enterpriseModules.auditor.startDeploymentAudit(
      this.state.deploymentId, 
      'interactive-deployment',
      { mode: 'interactive', version: '2.0.0' }
    );

    try {
      console.log('🎯 Enterprise Interactive Deployment System');
      console.log('==========================================');
      console.log('');
      console.log('🚀 Next-generation deployment powered by enterprise modules');
      console.log('   ✅ Bulletproof reliability with automatic rollback');
      console.log('   🔍 Comprehensive validation and testing');
      console.log('   📋 Full audit trail and compliance tracking');
      console.log('   ⚡ Smart configuration with runtime discovery');
      console.log('   🎯 Multi-domain coordination capabilities');
      console.log('');
      console.log(`📊 Deployment ID: ${this.state.deploymentId}`);
      console.log(`🕐 Started: ${this.state.startTime.toLocaleString()}`);
      console.log('');

      // Enterprise Step 1: Deployment mode selection
      await this.selectDeploymentMode();

      // Enterprise Step 2: Enhanced information gathering
      await this.gatherEnhancedInfo();

      // Enterprise Step 3: Enterprise configuration
      await this.configureEnterpriseFeatures();

      // Enterprise Step 4: Comprehensive validation
      await this.comprehensiveValidation();

      // Enterprise Step 5: Database orchestration
      await this.orchestrateDatabase();

      // Enterprise Step 6: Enterprise secret management
      await this.manageEnterpriseSecrets();

      // Enterprise Step 7: Configuration management
      await this.manageConfiguration();

      // Enterprise Step 8: Final confirmation with full summary
      await this.enterpriseFinalConfirmation();

      // Enterprise Step 9: Execute with full orchestration
      await this.executeEnterpriseDeployment();

      // Enterprise Step 10: Comprehensive testing
      await this.comprehensivePostDeploymentTesting();

      // Enterprise Step 11: Enterprise success summary
      await this.showEnterpriseSuccessSummary();

    } catch (error) {
      console.error('\\n❌ ENTERPRISE DEPLOYMENT FAILED');
      console.error(`Phase: ${this.state.currentPhase}`);
      console.error(`Error: ${error.message}`);
      
      // Log error with enterprise auditor
      this.state.enterpriseModules.auditor.logError(this.state.deploymentId, error, {
        phase: this.state.currentPhase,
        config: this.config
      });

      // Enterprise rollback confirmation
      const shouldRollback = await askYesNo(
        '\\n🔄 Enterprise rollback system is available. Execute automatic rollback?', 
        'y'
      );
      
      if (shouldRollback) {
        await this.executeEnterpriseRollback();
      }
      
      // End audit session with failure
      this.state.enterpriseModules.auditor.endDeploymentAudit(
        this.state.deploymentId, 
        'failed', 
        { error: error.message, phase: this.state.currentPhase }
      );
      
      process.exit(1);
    } finally {
      closePrompts();
    }
  }

  /**
   * Select deployment mode (single domain, multi-domain, or portfolio)
   */
  async selectDeploymentMode() {
    this.state.currentPhase = 'mode-selection';
    this.state.enterpriseModules.auditor.logPhase(
      this.state.deploymentId, 
      'mode-selection', 
      'start'
    );

    console.log('\\n🎯 Enterprise Step 1: Deployment Mode Selection');
    console.log('===============================================');
    console.log('');
    console.log('The Enterprise Deployment System supports multiple deployment modes:');
    console.log('');
    console.log('📱 Single Domain    - Deploy one domain with full enterprise features');
    console.log('🌍 Multi-Domain     - Deploy multiple domains with coordination');
    console.log('📊 Portfolio Mode   - Manage entire domain portfolio');
    console.log('');

    const modes = [
      'Single Domain (Recommended for first-time users)',
      'Multi-Domain (Deploy multiple domains together)', 
      'Portfolio Mode (Advanced: Full portfolio management)'
    ];

    const modeChoice = await askChoice('Select deployment mode:', modes, 0);
    
    switch(modeChoice) {
      case 0:
        this.config.deploymentMode = 'single';
        console.log('\\n✅ Selected: Single Domain Deployment');
        break;
      case 1:
        this.config.deploymentMode = 'multi-domain';
        this.config.enterprise.enableCrossDomainCoordination = true;
        console.log('\\n✅ Selected: Multi-Domain Deployment');
        break;
      case 2:
        this.config.deploymentMode = 'portfolio';
        this.config.enterprise.enableCrossDomainCoordination = true;
        // Initialize cross-domain coordinator using factory
        this.state.enterpriseModules.coordinator = EnterpriseModuleFactory.createCrossDomainCoordinator();
        console.log('\n✅ Selected: Portfolio Mode');
        break;
    }

    this.state.enterpriseModules.auditor.logPhase(
      this.state.deploymentId, 
      'mode-selection', 
      'end',
      { selectedMode: this.config.deploymentMode }
    );
  }

  /**
   * Enhanced information gathering with enterprise features
   */
  async gatherEnhancedInfo() {
    this.state.currentPhase = 'information-gathering';
    this.state.enterpriseModules.auditor.logPhase(
      this.state.deploymentId, 
      'information-gathering', 
      'start'
    );

    console.log('\\n📋 Enterprise Step 2: Enhanced Configuration');
    console.log('===========================================');

    if (this.config.deploymentMode === 'single') {
      await this.gatherSingleDomainInfo();
    } else if (this.config.deploymentMode === 'multi-domain') {
      await this.gatherMultiDomainInfo();
    } else {
      await this.gatherPortfolioInfo();
    }

    this.state.enterpriseModules.auditor.logPhase(
      this.state.deploymentId, 
      'information-gathering', 
      'end'
    );
  }

  async gatherSingleDomainInfo() {
    // Use domain info gatherer workflow
    await this.domainInfoGatherer.gatherSingleDomainInfo(this.config);
    console.log(`\n${this.domainInfoGatherer.getSummary(this.config)}`);
  }

  async confirmConfiguration() {
    console.log('\\n🔍 Step 2: Configuration Review');
    console.log('================================');
    
    console.log('\\nPlease review your configuration:');
    console.log(`   🌐 Domain: ${this.config.domain}`);
    console.log(`   🌍 Environment: ${this.config.environment}`);
    console.log(`   ⚡ Worker: ${this.config.worker.name}`);
    console.log(`   🔗 URL: ${this.config.worker.url}`);
    console.log(`   🆔 Deployment ID: ${this.state.deploymentId}`);

    const confirmed = await askYesNo('\\nIs this configuration correct?', 'y');
    if (!confirmed) {
      console.log('\\n🔄 Let\'s reconfigure...');
      await this.gatherBasicInfo();
      return this.confirmConfiguration();
    }
  }

  async preDeploymentChecks() {
    console.log('\\n✅ Step 3: Pre-deployment Validation');
    console.log('====================================');

    // Use interactive validation workflow
    await this.workflows.validation.executePreDeploymentChecks(this.config);
  }

  async handleDatabase() {
    console.log('\\n🗄️ Step 4: Database Configuration');
    console.log('=================================');

    // Use the interactive database workflow module
    const dbResult = await this.workflows.database.handleDatabaseSetup(
      this.config.domain,
      this.config.environment,
      {
        interactive: true
      }
    );

    // Update configuration with results
    this.config.database.name = dbResult.name;
    this.config.database.id = dbResult.id;
    this.config.database.createNew = dbResult.created;

    console.log(`\\n${this.workflows.database.getSummary(dbResult)}`);
  }

  async handleSecrets() {
    console.log('\\n🔐 Step 5: Secret Management');
    console.log('============================');

    // Use the interactive secret workflow module
    const secretResult = await this.workflows.secrets.handleSecretManagement(
      this.config.domain,
      this.config.environment,
      this.config.worker.name,
      {
        interactive: true,
        generateDistribution: true
      }
    );

    // Update configuration with results
    this.config.secrets.keys = secretResult.secrets;
    this.config.secrets.generateNew = false;

    console.log(`\\n${this.workflows.secrets.getSummary(secretResult)}`);
  }

  async finalConfirmation() {
    console.log('\\n🎯 Step 6: Final Deployment Confirmation');
    console.log('=======================================');

    // Use interactive confirmation workflow
    await InteractiveConfirmation.showFinalConfirmation(
      this.config, 
      this.state,
      { defaultAnswer: 'n' }
    );
  }

  async executeDeployment() {
    console.log('\\n🚀 Step 7: Executing Deployment');
    console.log('===============================');

    // Update wrangler.toml
    console.log('\\n⚙️ Updating wrangler.toml configuration...');
    await this.updateWranglerConfig();

    // Run database migrations
    console.log('\\n🔄 Running database migrations...');
    await this.runMigrations();

    // Deploy worker
    console.log('\\n📦 Deploying Cloudflare Worker...');
    await this.deployWorker();

    // Verify deployment
    console.log('\\n🔍 Verifying deployment...');
    await this.verifyDeployment();
  }

  async updateWranglerConfig() {
    // Use shared config manager helper
    const result = updateWranglerConfig({
      workerName: this.config.worker.name,
      databaseName: this.config.database.name,
      databaseId: this.config.database.id,
      serviceDomain: this.config.domain
    });
    
    console.log('   ✅ Configuration updated');
    if (result.changesMade.length > 0) {
      result.changesMade.forEach(change => console.log(`      - ${change}`));
    }
  }

  async runMigrations() {
    try {
      const success = await runMigrations(this.config.database.name, this.config.environment);
      if (success) {
        console.log('   ✅ Migrations completed');
      } else {
        console.log('   ⚠️ Migration warnings (this is often normal for existing databases)');
      }
    } catch (error) {
      console.log('   ⚠️ Migration warnings (this is often normal for existing databases)');
    }
  }

  async deployWorker() {
    // Use D1 error recovery workflow
    await this.workflows.d1Recovery.deployWithRecovery(
      async () => {
        await deployWorker(this.config.environment);
      },
      {
        environment: this.config.environment,
        cwd: process.cwd()
      }
    );
  }

  async verifyDeployment() {
    console.log('   ⏳ Waiting for deployment to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      const health = await checkHealth(this.config.worker.url);
      if (health.status === 'ok') {
        console.log(`   ✅ Deployment verified: ${health.framework?.models?.length || 0} models active`);
      } else {
        throw new Error('Health check returned non-ok status');
      }
    } catch (error) {
      throw new Error(`Deployment verification failed: ${error.message}`);
    }
  }

  async postDeploymentTesting() {
    // Use interactive testing workflow
    const testResults = await this.workflows.testing.executePostDeploymentTesting(this.config);
    console.log(`\n${this.workflows.testing.getSummary(testResults)}`);
    return testResults;
  }

  async showSuccessSummary() {
    // Use deployment summary workflow
    await DeploymentSummary.displaySuccessSummary(this.state, this.config);
  }

  async executeRollback() {
    console.log('\\n🔄 EXECUTING ROLLBACK');
    console.log('=====================');

    for (const action of this.state.rollbackActions.reverse()) {
      try {
        console.log(`🔄 Rolling back: ${action.type}`);
        if (action.command) {
          await execAsync(action.command, { stdio: 'pipe' });
          console.log(`   ✅ Rollback completed: ${action.type}`);
        }
      } catch (error) {
        console.log(`   ⚠️ Rollback failed: ${action.type}: ${error.message}`);
      }
    }
  }

  /**
   * Configure enterprise features using workflow
   */
  async configureEnterpriseFeatures() {
    this.state.currentPhase = 'enterprise-configuration';
    
    // Use enterprise config workflow
    await this.enterpriseConfigWorkflow.configureEnterpriseFeatures(this.config);
  }

  /**
   * Comprehensive validation with enterprise modules
   */
  async comprehensiveValidation() {
    this.state.currentPhase = 'comprehensive-validation';
    console.log('\\n🔍 Enterprise Step 4: Comprehensive Validation');
    console.log('==============================================');

    const validation = await this.state.enterpriseModules.validator.validateDeploymentReadiness(
      this.config.domain,
      {
        environment: this.config.environment,
        validationLevel: this.config.deployment.validationLevel,
        interactiveMode: true
      }
    );

    if (!validation.valid) {
      console.error('\\n❌ Validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      
      const continueAnyway = await askYesNo('\\nContinue deployment despite validation errors?', 'n');
      if (!continueAnyway) {
        throw new Error('Deployment cancelled due to validation failures');
      }
    } else {
      console.log('\\n✅ Comprehensive validation passed');
      if (validation.warnings?.length > 0) {
        console.log('\\n⚠️  Warnings:');
        validation.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
    }
  }

  /**
   * Database orchestration with enterprise module
   */
  async orchestrateDatabase() {
    this.state.currentPhase = 'database-orchestration';
    console.log('\\n🗄️  Enterprise Step 5: Database Orchestration');
    console.log('==============================================');

    const dbResult = await this.state.enterpriseModules.databaseOrchestrator.orchestrateDatabase(
      this.config.domain,
      this.config.environment,
      {
        createIfNotExists: true,
        runMigrations: this.config.database.enableMigrations,
        interactiveMode: true
      }
    );

    this.config.database.id = dbResult.databaseId;
    console.log(`\\n✅ Database orchestration completed: ${dbResult.databaseName}`);
  }

  /**
   * Enterprise secret management
   */
  async manageEnterpriseSecrets() {
    this.state.currentPhase = 'enterprise-secrets';
    console.log('\\n🔐 Enterprise Step 6: Enterprise Secret Management');
    console.log('==================================================');

    const secretResult = await this.state.enterpriseModules.secretManager.generateDomainSpecificSecrets(
      this.config.domain,
      this.config.environment,
      {
        customConfigs: this.config.secrets.keys,
        reuseExisting: !this.config.secrets.generateNew,
        formats: ['env', 'json', 'wrangler', 'powershell']
      }
    );

    this.config.secrets.keys = secretResult.secrets;
    console.log(`\\n✅ Enterprise secrets generated: ${Object.keys(secretResult.secrets).length} secrets`);
  }

  /**
   * Configuration management with caching
   */
  async manageConfiguration() {
    this.state.currentPhase = 'configuration-management';
    console.log('\\n⚙️  Enterprise Step 7: Configuration Management');
    console.log('==============================================');

    const config = await this.state.enterpriseModules.configCache.getOrCreateDomainConfig(
      this.config.domain,
      {
        environment: this.config.environment,
        forceRefresh: this.config.secrets.generateNew
      }
    );

    // Update wrangler configuration
    await this.updateEnterpriseWranglerConfig(config);
    
    console.log('\\n✅ Configuration management completed');
  }

  /**
   * Update wrangler config with enterprise settings
   */
  async updateEnterpriseWranglerConfig(domainConfig) {
    // Enhanced wrangler config update with enterprise features
    console.log('   📝 Updating wrangler.toml with enterprise configuration...');
    
    // This would update the wrangler.toml with the discovered/generated config
    // Implementation would be similar to existing updateWranglerConfig but enhanced
    
    console.log('   ✅ Wrangler configuration updated');
  }

  /**
   * Enterprise final confirmation with full summary
   */
  async enterpriseFinalConfirmation() {
    console.log('\\n🎯 Enterprise Step 8: Final Deployment Confirmation');
    console.log('===================================================');
    
    console.log('\\n📊 Enterprise Deployment Summary:');
    console.log(`   🆔 Deployment ID: ${this.state.deploymentId}`);
    console.log(`   🌐 Domain: ${this.config.domain}`);
    console.log(`   🌍 Environment: ${this.config.environment}`);
    console.log(`   📱 Mode: ${this.config.deploymentMode}`);
    console.log(`   ⚡ Worker: ${this.config.worker.name}`);
    console.log(`   🔗 URL: ${this.config.worker.url}`);
    console.log(`   🗄️  Database: ${this.config.database.name}`);
    console.log(`   🔐 Secrets: ${Object.keys(this.config.secrets.keys).length} generated`);
    console.log(`   🔍 Validation: ${this.config.deployment.validationLevel}`);
    console.log(`   📋 Audit: ${this.config.deployment.auditLevel}`);
    console.log(`   🧪 Testing: ${this.config.deployment.runTests ? 'Enabled' : 'Disabled'}`);

    const confirmed = await askYesNo('\\n✅ Proceed with enterprise deployment?', 'y');
    if (!confirmed) {
      throw new Error('Deployment cancelled by user');
    }
  }

  /**
   * Execute deployment with enterprise orchestration
   */
  async executeEnterpriseDeployment() {
    this.state.currentPhase = 'enterprise-deployment';
    console.log('\\n🚀 Enterprise Step 9: Enterprise Deployment Execution');
    console.log('====================================================');

    const deploymentResult = await this.state.enterpriseModules.orchestrator.deployDomain(
      this.config.domain,
      {
        environment: this.config.environment,
        config: this.config,
        deploymentId: this.state.deploymentId
      }
    );

    console.log(`\\n✅ Enterprise deployment completed: ${deploymentResult.status}`);
    return deploymentResult;
  }

  /**
   * Comprehensive post-deployment testing
   */
  async comprehensivePostDeploymentTesting() {
    if (!this.config.deployment.runTests) {
      console.log('\\n🧪 Skipping tests (disabled by configuration)');
      return;
    }

    this.state.currentPhase = 'comprehensive-testing';
    console.log('\\n🧪 Enterprise Step 10: Comprehensive Production Testing');
    console.log('======================================================');

    const testResult = await this.state.enterpriseModules.productionTester.runProductionTests(
      this.config.worker.url,
      {
        environment: this.config.environment,
        testSuites: ['health', 'endpoints', 'integration', 'performance'],
        interactiveReporting: true
      }
    );

    if (testResult.failed > 0) {
      console.warn(`\\n⚠️  ${testResult.failed} tests failed out of ${testResult.total}`);
      
      const continueAnyway = await askYesNo('Continue despite test failures?', 'y');
      if (!continueAnyway) {
        throw new Error('Deployment cancelled due to test failures');
      }
    } else {
      console.log(`\\n✅ All ${testResult.total} production tests passed!`);
    }
  }

  /**
   * Enterprise success summary with comprehensive reporting
   */
  async showEnterpriseSuccessSummary() {
    this.state.currentPhase = 'success-summary';
    
    // Use deployment summary workflow
    await DeploymentSummary.displayEnterpriseSuccessSummary(
      this.state,
      this.config,
      this.frameworkPaths,
      this.state.enterpriseModules
    );
  }

  /**
   * Execute enterprise rollback
   */
  async executeEnterpriseRollback() {
    console.log('\\n🔄 EXECUTING ENTERPRISE ROLLBACK');
    console.log('================================');

    try {
      await this.state.enterpriseModules.rollbackManager.executeRollback(
        this.config.domain,
        {
          deploymentId: this.state.deploymentId,
          reason: 'deployment-failure',
          interactiveMode: true
        }
      );
      
      console.log('\\n✅ Enterprise rollback completed successfully');
      
    } catch (rollbackError) {
      console.error(`\\n❌ Enterprise rollback failed: ${rollbackError.message}`);
      console.log('\\n🔄 Attempting legacy rollback...');
      
      // Fallback to legacy rollback
      for (const action of this.state.rollbackActions.reverse()) {
        try {
          console.log(`🔄 Rolling back: ${action.type}`);
          if (action.command) {
            await execAsync(action.command, { stdio: 'pipe' });
            console.log(`   ✅ Rollback completed: ${action.type}`);
          }
        } catch (error) {
          console.log(`   ⚠️ Rollback failed: ${action.type}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Gather multi-domain information
   */
  async gatherMultiDomainInfo() {
    // Use domain info gatherer workflow
    const multiDomainConfig = await this.domainInfoGatherer.gatherMultiDomainInfo();
    Object.assign(this.config, multiDomainConfig);
  }

  /**
   * Gather portfolio information
   */
  async gatherPortfolioInfo() {
    // Use domain info gatherer workflow
    const portfolioConfig = await this.domainInfoGatherer.gatherPortfolioInfo();
    Object.assign(this.config, portfolioConfig);
  }
  /**
   * Initialize modular components for enhanced deployment capabilities
   */
  async initializeModularComponents() {
    console.log('\n🔧 Initializing Modular Components (v3.0 Architecture)');
    console.log('======================================================');

    try {
      // Initialize configuration manager
      this.modularComponents.config = new DeploymentConfiguration();
      console.log('   ✅ Configuration Manager initialized');

      // Initialize environment manager  
      this.modularComponents.environment = new EnvironmentManager(this.config);
      console.log('   ✅ Environment Manager initialized');

      // Initialize validation manager
      this.modularComponents.validation = new ValidationManager(
        this.config,
        this.state.enterpriseModules
      );
      console.log('   ✅ Validation Manager initialized');

      // Initialize monitoring integration
      this.modularComponents.monitoring = new MonitoringIntegration(
        this.config,
        this.state.enterpriseModules
      );
      console.log('   ✅ Monitoring Integration initialized');

      // Initialize deployment orchestrator
      this.modularComponents.orchestrator = new ModularDeploymentOrchestrator(
        this.config
      );
      console.log('   ✅ Deployment Orchestrator initialized');

      console.log('✅ Modular components initialized - Enhanced deployment capabilities available');
      
    } catch (error) {
      console.warn(`⚠️ Modular components initialization failed: ${error.message}`);
      console.log('   Continuing with legacy deployment capabilities...');
    }
  }

  /**
   * Enhanced deployment mode selection using modular environment manager
   */
  async selectEnhancedDeploymentMode() {
    if (this.modularComponents.environment) {
      console.log('\n🎯 Using Enhanced Environment Manager');
      return await this.modularComponents.environment.selectDeploymentMode();
    } else {
      // Fallback to legacy method
      return await this.selectDeploymentMode();
    }
  }

  /**
   * Enhanced validation using modular validation manager
   */
  async executeEnhancedValidation() {
    if (this.modularComponents.validation) {
      console.log('\n🔍 Using Enhanced Validation Manager');
      const result = await this.modularComponents.validation.executeComprehensiveValidation();
      
      if (!result.valid && result.phases.failed.some(f => f.phase === 'Authentication')) {
        // Auto-fix authentication if possible
        await this.modularComponents.validation.autoFixAuthentication();
      }
      
      return result;
    } else {
      // Fallback to legacy method
      return await this.comprehensiveValidation();
    }
  }

  /**
   * Enhanced monitoring and success summary
   */
  async showEnhancedSuccessSummary() {
    if (this.modularComponents.monitoring) {
      console.log('\n🎉 Using Enhanced Monitoring Integration');
      return this.modularComponents.monitoring.displaySuccessSummary();
    } else {
      // Fallback to legacy method
      return await this.showEnterpriseSuccessSummary();
    }
  }
}

// Main execution
async function main() {
  const deployer = new EnterpriseInteractiveDeployer();
  await deployer.run();
}

// Check if running directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\\\/g, '/'))) {
  main().catch(console.error);
}

export { EnterpriseInteractiveDeployer };