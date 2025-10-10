#!/usr/bin/env node

/**
 * Refactored Enterprise Interactive Deployer
 * 
 * Modular deployment system using focused components for maintainability and reusability.
 * Leverages new modular architecture with specialized managers for each deployment aspect.
 * 
 * Modular Components:
 * - DeploymentConfiguration: Configuration management and setup
 * - EnvironmentManager: Environment and domain orchestration
 * - ValidationManager: Comprehensive validation orchestration
 * - MonitoringIntegration: Health checking and performance monitoring
 * - DeploymentOrchestrator: Main deployment flow coordination
 * 
 * Features:
 * - Clean separation of concerns with focused modules
 * - Interactive deployment flow with comprehensive validation
 * - Enterprise module integration support
 * - Comprehensive monitoring and reporting
 * - Rollback and recovery capabilities
 * - Multi-domain and portfolio management support
 * 
 * @version 3.0.0 - Modular Architecture Edition
 */

import { askYesNo, closePrompts, startProgress } from '../shared/utils/interactive-utils.js';

// Modular architecture components
import { DeploymentConfiguration } from './modules/DeploymentConfiguration.js';
import { EnvironmentManager } from './modules/EnvironmentManager.js';
import { ValidationManager } from './modules/ValidationManager.js';
import { MonitoringIntegration } from './modules/MonitoringIntegration.js';
import { DeploymentOrchestrator } from './modules/DeploymentOrchestrator.js';

// Enterprise modules (optional)
import { MultiDomainOrchestrator } from '../../src/orchestration/multi-domain-orchestrator.js';
import { CrossDomainCoordinator } from '../../src/orchestration/cross-domain-coordinator.js';
import { DeploymentValidator } from '../shared/deployment/validator.js';
import { DatabaseOrchestrator } from '../../src/database/database-orchestrator.js';
import { EnhancedSecretManager } from '../shared/security/secret-generator.js';
import { ProductionTester } from '../shared/production-tester/index.js';
import { DeploymentAuditor } from '../shared/deployment/auditor.js';
import { RollbackManager } from '../shared/deployment/rollback-manager.js';

/**
 * Refactored Enterprise Interactive Deployer using modular architecture
 */
export class ModularEnterpriseDeployer {
  constructor() {
    this.version = '3.0.0';
    this.deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Core modular components
    this.components = {
      config: null,           // DeploymentConfiguration
      environment: null,      // EnvironmentManager  
      validation: null,       // ValidationManager
      monitoring: null,       // MonitoringIntegration
      orchestrator: null      // DeploymentOrchestrator
    };

    // Enterprise modules (optional)
    this.enterpriseModules = {};
    
    // Deployment state
    this.deploymentState = {
      currentPhase: 'initialization',
      startTime: null,
      config: {},
      errors: [],
      warnings: []
    };
  }

  /**
   * Main deployment execution flow
   */
  async run() {
    try {
      console.log('\\n🚀 Modular Enterprise Deployment System v3.0.0');
      console.log('================================================');
      console.log('Advanced modular architecture with focused components');
      console.log(`Deployment ID: ${this.deploymentId}`);

      // Initialize core components
      await this.initializeComponents();

      // Initialize enterprise modules if needed
      await this.initializeEnterpriseModules();

      // Start deployment monitoring
      this.components.monitoring.startDeploymentMonitoring(this.deploymentId);
      
      // Execute deployment phases using modular components
      await this.executeModularDeploymentFlow();

      // Display success summary
      this.components.monitoring.displaySuccessSummary();

      console.log('\\n🎉 Modular deployment completed successfully!');
      
    } catch (error) {
      console.error(`\\n❌ Deployment failed: ${error.message}`);
      
      // Attempt rollback if available
      if (this.enterpriseModules.rollbackManager) {
        const shouldRollback = await askYesNo('Attempt automatic rollback?', 'y');
        if (shouldRollback) {
          await this.executeRollback(error);
        }
      }
      
      process.exit(1);
    } finally {
      // Cleanup resources
      await this.cleanup();
    }
  }

  /**
   * Initialize core modular components
   */
  async initializeComponents() {
    console.log('\\n🔧 Initializing Modular Components');
    console.log('====================================');

    // Initialize configuration manager
    this.components.config = new DeploymentConfiguration();
    console.log('   ✅ Configuration Manager initialized');

    // Initialize environment manager  
    this.components.environment = new EnvironmentManager(this.deploymentState.config);
    console.log('   ✅ Environment Manager initialized');

    // Initialize validation manager
    this.components.validation = new ValidationManager(
      this.deploymentState.config,
      this.enterpriseModules
    );
    console.log('   ✅ Validation Manager initialized');

    // Initialize monitoring integration
    this.components.monitoring = new MonitoringIntegration(
      this.deploymentState.config,
      this.enterpriseModules
    );
    console.log('   ✅ Monitoring Integration initialized');

    // Initialize deployment orchestrator
    this.components.orchestrator = new DeploymentOrchestrator(
      this.deploymentState.config
    );
    console.log('   ✅ Deployment Orchestrator initialized');

    console.log('\\n✅ All modular components initialized successfully');
  }

  /**
   * Initialize enterprise modules for advanced features
   */
  async initializeEnterpriseModules() {
    console.log('\\n🏢 Initializing Enterprise Modules');
    console.log('====================================');

    try {
      // Initialize enterprise modules
      this.enterpriseModules = {
        validator: new DeploymentValidator({
          validationLevel: 'comprehensive'
        }),
        databaseOrchestrator: new DatabaseOrchestrator({
          enableSafeMode: true
        }),
        secretManager: new EnhancedSecretManager({
          crossDomainCoordination: false
        }),
        productionTester: new ProductionTester({
          comprehensiveTests: true
        }),
        auditor: new DeploymentAuditor({
          auditLevel: 'detailed'
        }),
        rollbackManager: new RollbackManager({
          autoRollbackEnabled: true
        })
      };

      // Initialize auditing for this deployment
      this.enterpriseModules.auditor.initializeAudit(
        this.deploymentId,
        'modular-interactive-deployment'
      );

      console.log('   ✅ Enterprise validation and testing modules loaded');
      console.log('   ✅ Enterprise database and security modules loaded');
      console.log('   ✅ Enterprise audit and rollback modules loaded');

      // Update validation manager with enterprise modules
      this.components.validation = new ValidationManager(
        this.deploymentState.config,
        this.enterpriseModules
      );

      // Update monitoring integration with enterprise modules  
      this.components.monitoring = new MonitoringIntegration(
        this.deploymentState.config,
        this.enterpriseModules
      );

      console.log('\\n✅ Enterprise modules initialized successfully');
      
    } catch (error) {
      console.warn(`\\n⚠️ Enterprise modules initialization failed: ${error.message}`);
      console.log('   Continuing with standard deployment capabilities...');
    }
  }

  /**
   * Execute modular deployment flow with enhanced progress tracking
   */
  async executeModularDeploymentFlow() {
    this.deploymentState.startTime = new Date();

    // Initialize progress tracking for 6 phases
    const progressTracker = startProgress(6, 'Starting Enhanced Modular Deployment');

    // Phase 1: Environment and Mode Selection
    progressTracker.nextStep('Environment Setup and Mode Selection');
    await this.executeEnvironmentSetup();

    // Phase 2: Configuration Management  
    progressTracker.nextStep('Configuration Generation and Management');
    await this.executeConfigurationSetup();

    // Phase 3: Comprehensive Validation
    progressTracker.nextStep('Comprehensive Validation Suite');
    await this.executeValidationPhase();

    // Phase 4: Pre-deployment Preparation
    progressTracker.nextStep('Pre-deployment Preparation');
    await this.executePreDeploymentPhase();

    // Phase 5: Main Deployment Execution
    progressTracker.nextStep('Main Deployment Execution');
    await this.executeMainDeployment();

    // Phase 6: Post-deployment Testing and Monitoring
    progressTracker.nextStep('Post-deployment Testing and Monitoring');
    await this.executePostDeploymentPhase();

    console.log('\\n✅ All deployment phases completed successfully!');
  }

  /**
   * Phase 1: Environment Setup using EnvironmentManager
   */
  async executeEnvironmentSetup() {
    this.components.monitoring.recordPhase('environment-setup', 'start');
    
    console.log('\\n🌍 Phase 1: Environment Setup');
    console.log('==============================');

    // Select deployment mode
    const deploymentMode = await this.components.environment.selectDeploymentMode();
    this.deploymentState.config.deploymentMode = deploymentMode;

    // Initialize environment-specific components
    await this.components.environment.initializeEnvironment();

    // Gather environment configuration
    const envConfig = await this.components.environment.gatherEnvironmentConfiguration();
    Object.assign(this.deploymentState.config, envConfig);

    this.components.monitoring.recordPhase('environment-setup', 'end', {
      deploymentMode,
      environment: this.deploymentState.config.environment,
      domain: this.deploymentState.config.domain
    });

    console.log(`\\n✅ Environment setup completed - ${deploymentMode} mode`);
  }

  /**
   * Phase 2: Configuration Setup using DeploymentConfiguration
   */
  async executeConfigurationSetup() {
    this.components.monitoring.recordPhase('configuration-setup', 'start');
    
    console.log('\\n⚙️ Phase 2: Configuration Setup');
    console.log('=================================');

    // Generate deployment configuration
    const config = await this.components.config.generateDeploymentConfiguration(
      this.deploymentState.config.domain,
      this.deploymentState.config.environment,
      {
        deploymentMode: this.deploymentState.config.deploymentMode,
        interactiveMode: true
      }
    );

    // Merge configuration
    this.deploymentState.config = { ...this.deploymentState.config, ...config };

    // Update all components with final configuration
    this.updateComponentsWithConfig();

    this.components.monitoring.recordPhase('configuration-setup', 'end', {
      configKeys: Object.keys(config).length
    });

    console.log('\\n✅ Configuration setup completed');
  }

  /**
   * Phase 3: Validation using ValidationManager
   */
  async executeValidationPhase() {
    this.components.monitoring.recordPhase('validation', 'start');
    
    console.log('\\n🔍 Phase 3: Comprehensive Validation');
    console.log('=====================================');

    // Execute comprehensive validation
    const validationResult = await this.components.validation.executeComprehensiveValidation();

    if (!validationResult.valid) {
      // Attempt auto-fix for common issues
      if (validationResult.phases.failed.some(f => f.phase === 'Authentication')) {
        const fixed = await this.components.validation.autoFixAuthentication();
        if (fixed) {
          console.log('   ✅ Authentication issue auto-fixed');
        }
      }

      // Re-validate after fixes
      const revalidationResult = await this.components.validation.executeComprehensiveValidation();
      
      if (!revalidationResult.valid) {
        const continueAnyway = await askYesNo('\\nContinue deployment despite validation errors?', 'n');
        if (!continueAnyway) {
          throw new Error('Deployment cancelled due to validation failures');
        }
      }
    }

    this.components.monitoring.recordPhase('validation', 'end', {
      validationResult: validationResult.valid,
      errors: validationResult.phases.failed.length,
      warnings: validationResult.phases.warnings.length
    });

    console.log('\\n✅ Validation phase completed');
  }

  /**
   * Phase 4: Pre-deployment Preparation  
   */
  async executePreDeploymentPhase() {
    this.components.monitoring.recordPhase('pre-deployment', 'start');
    
    console.log('\\n🚀 Phase 4: Pre-deployment Preparation');
    console.log('=======================================');

    // Prepare deployment using orchestrator
    await this.components.orchestrator.prepareDeployment(
      this.deploymentState.config.domain,
      this.deploymentState.config.environment,
      {
        validateConfiguration: true,
        setupDatabase: true,
        generateSecrets: true
      }
    );

    this.components.monitoring.recordPhase('pre-deployment', 'end');

    console.log('\\n✅ Pre-deployment preparation completed');
  }

  /**
   * Phase 5: Main Deployment Execution
   */
  async executeMainDeployment() {
    this.components.monitoring.recordPhase('deployment', 'start');
    
    console.log('\\n🚀 Phase 5: Main Deployment Execution');
    console.log('======================================');

    // Execute deployment using orchestrator
    const deploymentResult = await this.components.orchestrator.executeDeployment(
      this.deploymentState.config.domain,
      this.deploymentState.config.environment,
      {
        enableRollback: true,
        runValidation: true,
        interactiveMode: true
      }
    );

    if (!deploymentResult.success) {
      throw new Error(`Deployment failed: ${deploymentResult.error}`);
    }

    // Update config with deployment results
    this.deploymentState.config.worker = deploymentResult.worker;
    this.deploymentState.config.database = deploymentResult.database;

    this.components.monitoring.recordPhase('deployment', 'end', {
      workerUrl: deploymentResult.worker?.url,
      databaseId: deploymentResult.database?.id
    });

    console.log('\\n✅ Main deployment execution completed');
  }

  /**
   * Phase 6: Post-deployment Testing and Monitoring
   */
  async executePostDeploymentPhase() {
    this.components.monitoring.recordPhase('post-deployment', 'start');
    
    console.log('\\n🧪 Phase 6: Post-deployment Testing');
    console.log('====================================');

    // Execute health validation
    await this.components.monitoring.executeHealthValidation();

    // Execute comprehensive testing
    if (this.enterpriseModules.productionTester) {
      await this.components.monitoring.executeEnterpriseComprehensiveTesting();
    } else {
      await this.components.monitoring.executePostDeploymentTesting();
    }

    this.components.monitoring.recordPhase('post-deployment', 'end');

    console.log('\\n✅ Post-deployment testing completed');
  }

  /**
   * Update all components with final configuration
   */
  updateComponentsWithConfig() {
    // Update environment manager
    this.components.environment.config = this.deploymentState.config;

    // Update validation manager
    this.components.validation.config = this.deploymentState.config;

    // Update monitoring integration
    this.components.monitoring.config = this.deploymentState.config;

    // Update deployment orchestrator
    this.components.orchestrator.config = this.deploymentState.config;
  }

  /**
   * Execute rollback in case of deployment failure
   */
  async executeRollback(error) {
    console.log('\\n🔄 Initiating Rollback Process');
    console.log('===============================');

    try {
      const rollbackResult = await this.enterpriseModules.rollbackManager.executeRollback(
        this.deploymentId,
        {
          reason: error.message,
          interactiveMode: true
        }
      );

      if (rollbackResult.success) {
        console.log('\\n✅ Rollback completed successfully');
      } else {
        console.error(`\\n❌ Rollback failed: ${rollbackResult.error}`);
      }
    } catch (rollbackError) {
      console.error(`\\n❌ Rollback process failed: ${rollbackError.message}`);
    }
  }

  /**
   * Cleanup resources and close connections
   */
  async cleanup() {
    console.log('\\n🧹 Cleaning up resources...');

    try {
      // Cleanup modular components
      if (this.components.environment) {
        await this.components.environment.cleanup();
      }

      if (this.components.monitoring) {
        this.components.monitoring.cleanup();
      }

      // Cleanup enterprise modules
      if (this.enterpriseModules.rollbackManager) {
        await this.enterpriseModules.rollbackManager.cleanup();
      }

      // Close interactive prompts
      closePrompts();

      console.log('   ✅ Cleanup completed');
    } catch (error) {
      console.warn(`   ⚠️ Cleanup warning: ${error.message}`);
    }
  }
}

/**
 * Main execution entry point
 */
async function main() {
  const deployer = new ModularEnterpriseDeployer();
  await deployer.run();
}

// Execute if running directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\\\/g, '/'))) {
  main().catch(console.error);
}

export { ModularEnterpriseDeployer };