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
   * Legacy method for backward compatibility
   * @deprecated Use deploymentCoordinator.initializeDomainDeployment() instead
   */
  async initializeDomainDeployment(domain) {
    return await this.deploymentCoordinator.initializeDomainDeployment(domain);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use deploymentCoordinator.setupDomainDatabase() instead
   */
  async setupDomainDatabase(domain) {
    return await this.deploymentCoordinator.setupDomainDatabase(domain);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use deploymentCoordinator.handleDomainSecrets() instead
   */
  async handleDomainSecrets(domain) {
    return await this.deploymentCoordinator.handleDomainSecrets(domain);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use deploymentCoordinator.deployDomainWorker() instead
   */
  async deployDomainWorker(domain) {
    return await this.deploymentCoordinator.deployDomainWorker(domain);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use deploymentCoordinator.validateDomainDeployment() instead
   */
  async validateDomainDeployment(domain) {
    return await this.deploymentCoordinator.validateDomainDeployment(domain);
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