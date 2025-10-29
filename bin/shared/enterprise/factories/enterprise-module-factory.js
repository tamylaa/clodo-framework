// Enterprise Module Factory
// Centralized factory for creating and initializing all enterprise deployment modules

import { MultiDomainOrchestrator } from '../../../../src/orchestration/multi-domain-orchestrator.js';
import { CrossDomainCoordinator } from '../../../../src/orchestration/cross-domain-coordinator.js';
import { RollbackManager } from '../rollback-manager.js';
import { ProductionTester } from '../../production-tester/index.js';
import { DeploymentAuditor } from '../../deployment/auditor.js';
import { DeploymentValidator } from '../../deployment/validator.js';
import { DomainDiscovery } from '../../cloudflare/domain-discovery.js';
import { DatabaseOrchestrator } from '../../../../src/database/database-orchestrator.js';
import { EnhancedSecretManager } from '../../security/secret-generator.js';
import { ConfigurationCacheManager } from '../../config/cache.js';
import { InteractiveDatabaseWorkflow } from '../../deployment/workflows/interactive-database-workflow.js';
import { D1ErrorRecoveryManager } from '../../deployment/utilities/d1-error-recovery.js';
import { InteractiveSecretWorkflow } from '../../deployment/workflows/interactive-secret-workflow.js';
import { InteractiveValidation } from '../../deployment/workflows/interactive-validation.js';
import { InteractiveTestingWorkflow } from '../../deployment/workflows/interactive-testing-workflow.js';
import { InteractiveDomainInfoGatherer } from '../../deployment/workflows/interactive-domain-info-gatherer.js';

/**
 * Factory for creating and initializing enterprise deployment modules
 */
export class EnterpriseModuleFactory {
  /**
   * Create all interactive workflow modules
   * 
   * @param {Object} options - Factory options
   * @param {Array} options.rollbackActions - Shared rollback actions array
   * @returns {Object} Initialized workflow modules
   */
  static createWorkflowModules({ rollbackActions }) {
    return {
      database: new InteractiveDatabaseWorkflow({
        rollbackActions
      }),
      
      secrets: new InteractiveSecretWorkflow({
        rollbackActions
      }),
      
      d1Recovery: new D1ErrorRecoveryManager({
        rollbackActions
      }),

      validation: new InteractiveValidation({
        interactive: true
      }),

      testing: new InteractiveTestingWorkflow({
        interactive: true
      })
    };
  }

  /**
   * Create all enterprise modules
   * 
   * @param {Object} options - Factory options
   * @param {string} options.deploymentId - Unique deployment identifier
   * @param {Object} options.config - Deployment configuration
   * @param {Array} options.rollbackActions - Shared rollback actions array
   * @returns {Object} Initialized enterprise modules
   */
  static createEnterpriseModules({ deploymentId, config, rollbackActions }) {
    return {
      orchestrator: new MultiDomainOrchestrator({
        enableInteractiveMode: true,
        deploymentId
      }),

      validator: new DeploymentValidator({
        validationLevel: config?.deployment?.validationLevel || 'comprehensive',
        interactiveMode: true
      }),

      rollbackManager: new RollbackManager({
        autoRollbackEnabled: config?.deployment?.enableRollback ?? true,
        interactiveConfirmation: true
      }),

      domainDiscovery: new DomainDiscovery({
        enableInteractiveConfig: true,
        cacheDiscoveredConfigs: true
      }),

      databaseOrchestrator: new DatabaseOrchestrator({
        enableSafeMode: true,
        requireConfirmation: true
      }),

      secretManager: new EnhancedSecretManager({
        interactiveMode: true,
        crossDomainCoordination: config?.secrets?.crossDomainSharing || false
      }),

      productionTester: new ProductionTester({
        interactiveReporting: true,
        comprehensiveTests: config?.deployment?.runTests ?? true
      }),

      auditor: new DeploymentAuditor({
        auditLevel: config?.deployment?.auditLevel || 'detailed',
        interactiveMode: true
      }),

      configCache: new ConfigurationCacheManager({
        enableInteractiveDiscovery: true,
        autoCache: true
      }),

      coordinator: null // Will be initialized if multi-domain mode is selected
    };
  }

  /**
   * Create domain info gatherer (requires config cache from enterprise modules)
   * 
   * @param {Object} configCache - Configuration cache manager instance
   * @returns {Object} Initialized domain info gatherer
   */
  static createDomainInfoGatherer(configCache) {
    return new InteractiveDomainInfoGatherer({
      configCache,
      interactive: true
    });
  }

  /**
   * Create cross-domain coordinator for portfolio mode
   * 
   * @param {Object} options - Coordinator options
   * @param {string} options.portfolioName - Portfolio name
   * @returns {Object} Initialized cross-domain coordinator
   */
  static createCrossDomainCoordinator({ portfolioName = 'interactive-portfolio' } = {}) {
    return new CrossDomainCoordinator({
      portfolioName,
      enableContinuousMonitoring: true
    });
  }

  /**
   * Initialize all async enterprise modules
   * 
   * @param {Object} enterpriseModules - Enterprise modules to initialize
   * @returns {Promise<void>}
   */
  static async initializeAsyncModules(enterpriseModules) {
    const initTasks = [
      enterpriseModules.orchestrator.initialize(),
      enterpriseModules.auditor.initialize(),
      enterpriseModules.rollbackManager.initialize(),
      enterpriseModules.productionTester.initialize(),
      enterpriseModules.configCache.initialize()
    ];

    if (enterpriseModules.coordinator) {
      initTasks.push(enterpriseModules.coordinator.initialize());
    }

    await Promise.all(initTasks);
  }

  /**
   * Complete factory method - creates and initializes all modules
   * 
   * @param {Object} options - Complete initialization options
   * @param {string} options.deploymentId - Unique deployment identifier
   * @param {Object} options.config - Deployment configuration
   * @param {Array} options.rollbackActions - Shared rollback actions array
   * @param {boolean} options.portfolioMode - Whether to enable portfolio mode
   * @returns {Promise<Object>} All initialized modules
   */
  static async createAllModules({ 
    deploymentId, 
    config, 
    rollbackActions, 
    portfolioMode = false 
  }) {
    console.log('🚀 Initializing Enterprise Deployment System...');

    // Create workflow modules
    const workflows = this.createWorkflowModules({ rollbackActions });

    // Create enterprise modules
    const enterpriseModules = this.createEnterpriseModules({ 
      deploymentId, 
      config, 
      rollbackActions 
    });

    // Create domain info gatherer
    const domainInfoGatherer = this.createDomainInfoGatherer(
      enterpriseModules.configCache
    );

    // Create coordinator if portfolio mode
    if (portfolioMode) {
      enterpriseModules.coordinator = this.createCrossDomainCoordinator();
    }

    // Initialize async modules
    await this.initializeAsyncModules(enterpriseModules);

    console.log('✅ Enterprise modules initialized');

    return {
      workflows,
      enterpriseModules,
      domainInfoGatherer
    };
  }
}
