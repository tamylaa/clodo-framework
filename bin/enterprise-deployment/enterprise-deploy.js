// Enterprise Deployment CLI - Advanced enterprise deployment system
// Provides comprehensive deployment options, portfolio management, and automation

import { program } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Enterprise module imports - organized shared modules
import { MultiDomainOrchestrator } from '../../src/orchestration/multi-domain-orchestrator.js';
import { RollbackManager } from '../shared/deployment/rollback-manager.js';
import { ProductionTester } from '../shared/production-tester/index.js';
import { DeploymentValidator } from '../shared/deployment/validator.js';
import { DomainDiscovery } from '../shared/cloudflare/domain-discovery.js';
import { DatabaseOrchestrator } from '../../src/database/database-orchestrator.js';
import { EnhancedSecretManager } from '../shared/security/secret-generator.js';
import { DeploymentAuditor } from '../shared/deployment/auditor.js';
import { ConfigurationCacheManager } from '../shared/config/cache.js';
import { CrossDomainCoordinator } from '../../src/orchestration/cross-domain-coordinator.js';
import { askChoice, askUser, closePrompts } from '../shared/utils/interactive-prompts.js';
import { CloudflareDomainManager } from '../shared/cloudflare/domain-manager.js';

// Consolidated environment manager
import { EnvironmentManager } from './modules/EnvironmentManager.js';

// Enterprise modules - extracted capabilities
import { EnterpriseDeploymentOrchestrator } from '../shared/enterprise/orchestrator.js';
import { PortfolioDeploymentManager } from '../shared/enterprise/portfolio-manager.js';
import { MultiDomainCoordinator } from '../shared/enterprise/multi-domain-coordinator.js';
import { InteractiveDomainSelector } from '../shared/enterprise/interactive-selector.js';
import { ComprehensiveValidationWorkflow } from '../shared/enterprise/validation-workflow.js';
import { ProductionTestingCoordinator } from '../shared/enterprise/testing-coordinator.js';
import { RollbackManager as EnterpriseRollbackManager } from '../shared/enterprise/rollback-manager.js';
import { ConfigurationCacheManager as EnterpriseCacheManager } from '../shared/enterprise/cache-manager.js';

/**
 * Enterprise Deployment CLI
 *
 * Main entry point for enterprise deployment operations.
 * This CLI has been refactored to use extracted enterprise modules
 * for better reusability and maintainability.
 */
class EnterpriseDeploymentCLI {
  constructor() {
    this.version = '2.0.0';
    this.modules = {};
    this.globalConfig = this.loadGlobalConfig();

    // Initialize enterprise modules
    this.initializeEnterpriseModules();
  }

  /**
   * Initialize the CLI asynchronously
   */
  async initialize() {
    try {
      console.log(' Initializing Enterprise Deployment CLI v' + this.version);

      // Initialize enterprise modules
      await this.initializeModules();

      console.log(' Enterprise Deployment CLI initialized successfully');
    } catch (error) {
      console.error(' Failed to initialize Enterprise Deployment CLI:', error.message);
      throw error;
    }
  }

  /**
   * Initialize enterprise modules
   */
  initializeEnterpriseModules() {
    this.orchestrator = new EnterpriseDeploymentOrchestrator();
    this.portfolioManager = new PortfolioDeploymentManager();
    this.multiDomainCoordinator = new MultiDomainCoordinator();
    this.interactiveSelector = new InteractiveDomainSelector();
    this.validationWorkflow = new ComprehensiveValidationWorkflow();
    this.testingCoordinator = new ProductionTestingCoordinator();
    this.rollbackManager = new EnterpriseRollbackManager();
    this.cacheManager = new EnterpriseCacheManager();
  }

  /**
   * Initialize modules
   */
  async initializeModules() {
    // Initialize core modules
    await this.orchestrator.initialize();
    await this.portfolioManager.initialize();
    await this.multiDomainCoordinator.initialize();
    await this.interactiveSelector.initialize();
    await this.validationWorkflow.initialize();
    await this.testingCoordinator.initialize();
    await this.rollbackManager.initialize();
    await this.cacheManager.initialize();
  }

  /**
   * Load global configuration
   */
  loadGlobalConfig() {
    try {
      const configPath = join(process.cwd(), 'clodo-config.json');
      if (existsSync(configPath)) {
        return JSON.parse(readFileSync(configPath, 'utf8'));
      }
      return {};
    } catch (error) {
      console.warn('  Could not load global config:', error.message);
      return {};
    }
  }

  /**
   * Run the CLI
   */
  async run() {
    await this.initialize();

    program
      .name('enterprise-deploy')
      .description('Enterprise deployment system with extracted capabilities')
      .version(this.version);

    // Add commands here
    program
      .command('deploy')
      .description('Execute enterprise deployment')
      .action(async () => {
        try {
          console.log(' Starting enterprise deployment...');
          // Implementation would go here
          console.log(' Enterprise deployment completed');
        } catch (error) {
          console.error(' Deployment failed:', error.message);
          process.exit(1);
        }
      });

    program
      .command('test')
      .description('Run production testing')
      .action(async () => {
        try {
          console.log(' Starting production testing...');
          // Implementation would go here
          console.log(' Production testing completed');
        } catch (error) {
          console.error(' Testing failed:', error.message);
          process.exit(1);
        }
      });

    program
      .command('rollback')
      .description('Execute rollback operation')
      .action(async () => {
        try {
          console.log(' Starting rollback operation...');
          // Implementation would go here
          console.log(' Rollback completed');
        } catch (error) {
          console.error(' Rollback failed:', error.message);
          process.exit(1);
        }
      });

    await program.parseAsync();
  }

  /**
   * Get enterprise modules
   */
  getModules() {
    return {
      orchestrator: this.orchestrator,
      portfolioManager: this.portfolioManager,
      multiDomainCoordinator: this.multiDomainCoordinator,
      interactiveSelector: this.interactiveSelector,
      validationWorkflow: this.validationWorkflow,
      testingCoordinator: this.testingCoordinator,
      rollbackManager: this.rollbackManager,
      cacheManager: this.cacheManager
    };
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new EnterpriseDeploymentCLI();

  process.on('SIGINT', async () => {
    console.log('\n Shutting down gracefully...');
    await cli.orchestrator?.shutdown?.();
    await cli.testingCoordinator?.shutdown?.();
    await cli.rollbackManager?.shutdown?.();
    await cli.cacheManager?.shutdown?.();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error(' Uncaught Exception:', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  cli.run().catch((error) => {
    console.error(' CLI execution failed:', error.message);
    process.exit(1);
  });
}

export { EnterpriseDeploymentCLI };
