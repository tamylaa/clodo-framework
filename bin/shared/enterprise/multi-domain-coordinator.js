/**
 * Multi-Domain Coordinator
 *
 * Enterprise-grade multi-domain deployment coordination system providing advanced
 * batch processing, dependency resolution, cross-domain communication, and
 * intelligent deployment sequencing for complex enterprise environments.
 *
 * @author Clodo Framework Team
 * @version 2.0.0
 * @since 2025-10-29
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Enterprise utility imports
import { Logger } from '../logging/Logger.js';
import { ErrorClassifier } from '../error-handling/error-classifier.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';

// Core orchestration modules
import { MultiDomainOrchestrator } from '../../../src/orchestration/multi-domain-orchestrator.js';
import { CrossDomainCoordinator } from '../../../src/orchestration/cross-domain-coordinator.js';
import { DeploymentAuditor } from '../deployment/auditor.js';

/**
 * Multi-Domain Coordination Configuration
 * @typedef {Object} MultiDomainCoordinationConfig
 * @property {number} batchSize - Number of domains to deploy in parallel
 * @property {boolean} enableCoordination - Enable cross-domain coordination
 * @property {boolean} resolveDependencies - Resolve domain dependencies
 * @property {boolean} sharedSecrets - Enable shared secret management
 * @property {number} timeout - Coordination timeout (ms)
 * @property {Object} retry - Retry configuration
 * @property {Object} monitoring - Monitoring configuration
 * @property {Object} audit - Audit configuration
 */

/**
 * Coordination Context
 * @typedef {Object} CoordinationContext
 * @property {string} coordinationId - Unique coordination ID
 * @property {Array<string>} domains - Domains being coordinated
 * @property {string} strategy - Coordination strategy
 * @property {Date} startTime - Coordination start time
 * @property {Object} options - Coordination options
 */

/**
 * Coordination Result
 * @typedef {Object} CoordinationResult
 * @property {boolean} success - Whether coordination succeeded
 * @property {string} coordinationId - Coordination identifier
 * @property {Object} results - Individual domain results
 * @property {Array} errors - Errors encountered
 * @property {number} duration - Total coordination duration
 * @property {Object} metrics - Coordination metrics
 * @property {Object} audit - Audit information
 */

/**
 * Multi-Domain Coordinator
 *
 * Coordinates complex multi-domain deployments with enterprise-grade features
 * including dependency resolution, batch processing, cross-domain communication,
 * and intelligent failure handling.
 */
export class MultiDomainCoordinator extends EventEmitter {
  /**
   * Create Multi-Domain Coordinator
   * @param {MultiDomainCoordinationConfig} config - Coordinator configuration
   */
  constructor(config = {}) {
    super();

    // Initialize core configuration
    this.config = this._initializeConfiguration(config);

    // Initialize core components
    this.logger = new Logger({
      level: this.config.logging?.level || 'info',
      prefix: '[MultiDomain-Coordinator]',
      enableFileLogging: this.config.logging?.enableFileLogging || false
    });

    this.errorClassifier = new ErrorClassifier();
    this.configManager = new ConfigurationManager();

    // Initialize coordination state
    this.coordinationState = new Map();
    this.activeCoordinations = new Set();
    this.domainDependencies = new Map();

    // Initialize metrics
    this.metrics = {
      totalCoordinations: 0,
      successfulCoordinations: 0,
      failedCoordinations: 0,
      averageDuration: 0,
      lastCoordinationTime: null
    };

    this.logger.info('Multi-Domain Coordinator initialized', {
      batchSize: this.config.batchSize,
      enableCoordination: this.config.enableCoordination,
      resolveDependencies: this.config.resolveDependencies
    });
  }

  /**
   * Initialize configuration with enterprise defaults
   * @private
   * @param {Object} userConfig - User-provided configuration
   * @returns {MultiDomainCoordinationConfig} Complete configuration
   */
  _initializeConfiguration(userConfig) {
    const defaults = {
      batchSize: 3,
      enableCoordination: true,
      resolveDependencies: true,
      sharedSecrets: false,
      timeout: 1800000, // 30 minutes
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 5000,
        maxDelay: 60000
      },
      monitoring: {
        enabled: true,
        interval: 30000,
        alertThresholds: {
          duration: 900000, // 15 minutes
          errorRate: 0.3
        }
      },
      audit: {
        level: 'detailed',
        enableCompliance: true,
        retentionDays: 90
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        logDirectory: './logs/multi-domain-coordination'
      }
    };

    return this.configManager.mergeConfigurations(defaults, userConfig);
  }

  /**
   * Initialize coordinator components
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing Multi-Domain Coordinator components...');

      // Initialize core orchestrators
      this.multiDomainOrchestrator = new MultiDomainOrchestrator({
        maxConcurrentDeployments: this.config.batchSize,
        timeout: this.config.timeout,
        enableRollback: true
      });

      this.crossDomainCoordinator = new CrossDomainCoordinator({
        enableDependencyResolution: this.config.resolveDependencies,
        sharedSecretsEnabled: this.config.sharedSecrets
      });

      this.deploymentAuditor = new DeploymentAuditor({
        auditLevel: this.config.audit.level,
        enableCompliance: this.config.audit.enableCompliance
      });

      // Initialize async components
      await Promise.all([
        this.multiDomainOrchestrator.initialize(),
        this.crossDomainCoordinator.initialize(),
        this.deploymentAuditor.initialize()
      ]);

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this._startMonitoring();
      }

      this.logger.info('Multi-Domain Coordinator initialization completed');

    } catch (error) {
      this.logger.error('Failed to initialize Multi-Domain Coordinator', { error: error.message });
      throw this.errorClassifier.classifyError(error, 'coordinator_initialization');
    }
  }

  /**
   * Coordinate multi-domain deployment
   * @param {Array<string>} domains - Domains to coordinate
   * @param {Object} options - Coordination options
   * @returns {Promise<CoordinationResult>} Coordination result
   */
  async coordinateMultiDomainDeployment(domains, options = {}) {
    const coordinationId = this._generateCoordinationId();
    const context = this._createCoordinationContext(coordinationId, domains, options);

    this.logger.info(`Starting multi-domain coordination for ${domains.length} domains`, {
      coordinationId,
      domains: domains.slice(0, 5) // Log first 5 domains
    });

    try {
      // Track active coordination
      this.activeCoordinations.add(coordinationId);
      this.coordinationState.set(coordinationId, { status: 'initializing', context });

      // Emit coordination started event
      this.emit('coordinationStarted', context);

      // Phase 1: Resolve dependencies
      const orderedDomains = await this._resolveDomainDependencies(domains, context);

      // Phase 2: Execute coordinated deployment
      const coordinationResult = await this._executeCoordinatedDeployment(orderedDomains, context);

      // Phase 3: Finalize coordination
      const finalResult = await this._finalizeCoordination(coordinationResult, context);

      // Update metrics
      this._updateMetrics(finalResult);

      this.logger.info(`Multi-domain coordination completed successfully`, {
        coordinationId,
        domainsCoordinated: domains.length,
        duration: finalResult.duration
      });

      return finalResult;

    } catch (error) {
      this.logger.error(`Multi-domain coordination failed`, {
        coordinationId,
        error: error.message,
        stack: error.stack
      });

      // Create failure result
      const failureResult = this._createFailureResult(coordinationId, domains, error, context);

      // Update metrics
      this._updateMetrics(failureResult);

      throw failureResult;

    } finally {
      // Cleanup
      this.activeCoordinations.delete(coordinationId);
      this.coordinationState.delete(coordinationId);
      this.emit('coordinationCompleted', context);
    }
  }

  /**
   * Resolve domain dependencies
   * @private
   * @param {Array<string>} domains - Input domains
   * @param {CoordinationContext} context - Coordination context
   * @returns {Promise<Array<string>>} Ordered domains
   */
  async _resolveDomainDependencies(domains, context) {
    if (!this.config.resolveDependencies) {
      this.logger.debug('Dependency resolution disabled, using original order');
      return domains;
    }

    this.logger.info('Resolving domain dependencies', { domainCount: domains.length });

    try {
      // Build dependency graph
      const dependencyGraph = await this._buildDependencyGraph(domains);

      // Perform topological sort
      const orderedDomains = this._topologicalSort(dependencyGraph);

      this.logger.info('Domain dependencies resolved', {
        originalCount: domains.length,
        orderedCount: orderedDomains.length
      });

      this.emit('dependenciesResolved', { domains: orderedDomains, context });

      return orderedDomains;

    } catch (error) {
      this.logger.warn('Dependency resolution failed, using original order', { error: error.message });
      this.emit('dependenciesResolutionFailed', { domains, context, error });
      return domains; // Fallback to original order
    }
  }

  /**
   * Build dependency graph for domains
   * @private
   * @param {Array<string>} domains - Domains to analyze
   * @returns {Promise<Map>} Dependency graph
   */
  async _buildDependencyGraph(domains) {
    const graph = new Map();

    // Initialize graph
    domains.forEach(domain => {
      graph.set(domain, { dependencies: [], dependents: [] });
    });

    // Analyze dependencies (this would integrate with domain configuration)
    // For now, create a simple dependency based on domain relationships
    for (const domain of domains) {
      const node = graph.get(domain);

      // Example: API domains depend on auth domains
      if (domain.includes('api') && !domain.includes('auth')) {
        const authDomain = domain.replace('api', 'auth');
        if (domains.includes(authDomain)) {
          node.dependencies.push(authDomain);
          graph.get(authDomain).dependents.push(domain);
        }
      }

      // Example: Frontend domains depend on API domains
      if (!domain.includes('api') && !domain.includes('auth')) {
        const apiDomain = domain.replace(/^([^.]+)\./, 'api.');
        if (domains.includes(apiDomain)) {
          node.dependencies.push(apiDomain);
          graph.get(apiDomain).dependents.push(domain);
        }
      }
    }

    return graph;
  }

  /**
   * Perform topological sort on dependency graph
   * @private
   * @param {Map} graph - Dependency graph
   * @returns {Array<string>} Topologically sorted domains
   */
  _topologicalSort(graph) {
    const visited = new Set();
    const visiting = new Set();
    const result = [];

    const visit = (domain) => {
      if (visited.has(domain)) return;
      if (visiting.has(domain)) {
        throw new Error(`Circular dependency detected involving domain: ${domain}`);
      }

      visiting.add(domain);

      const node = graph.get(domain);
      for (const dependency of node.dependencies) {
        visit(dependency);
      }

      visiting.delete(domain);
      visited.add(domain);
      result.push(domain);
    };

    // Visit all nodes
    for (const domain of graph.keys()) {
      if (!visited.has(domain)) {
        visit(domain);
      }
    }

    return result;
  }

  /**
   * Execute coordinated deployment
   * @private
   * @param {Array<string>} domains - Ordered domains
   * @param {CoordinationContext} context - Coordination context
   * @returns {Promise<Object>} Coordination result
   */
  async _executeCoordinatedDeployment(domains, context) {
    this.logger.info(`Executing coordinated deployment for ${domains.length} domains`);

    this.emit('coordinatedDeploymentStarted', { domains, context });

    try {
      // Split domains into batches
      const batches = this._createDeploymentBatches(domains, this.config.batchSize);

      const results = {
        successful: [],
        failed: [],
        batches: []
      };

      // Execute batches sequentially
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.info(`Executing batch ${i + 1}/${batches.length}`, {
          batchSize: batch.length,
          domains: batch
        });

        const batchResult = await this._executeDeploymentBatch(batch, context);
        results.batches.push(batchResult);

        results.successful.push(...batchResult.successful);
        results.failed.push(...batchResult.failed);

        // Check if we should continue after batch failure
        if (batchResult.failed.length > 0) {
          const shouldContinue = await this._shouldContinueAfterBatchFailure(batchResult, context);
          if (!shouldContinue) {
            this.logger.warn('Stopping coordination due to batch failure');
            break;
          }
        }
      }

      const coordinationResult = {
        results,
        duration: Date.now() - context.startTime.getTime(),
        coordinationId: context.coordinationId
      };

      this.logger.info('Coordinated deployment execution completed', {
        successful: results.successful.length,
        failed: results.failed.length,
        batches: results.batches.length
      });

      this.emit('coordinatedDeploymentCompleted', { domains, result: coordinationResult, context });

      return coordinationResult;

    } catch (error) {
      this.logger.error('Coordinated deployment execution failed', { error: error.message });
      this.emit('coordinatedDeploymentFailed', { domains, context, error });
      throw error;
    }
  }

  /**
   * Create deployment batches
   * @private
   * @param {Array<string>} domains - Domains to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array<string>>} Batches of domains
   */
  _createDeploymentBatches(domains, batchSize) {
    const batches = [];
    for (let i = 0; i < domains.length; i += batchSize) {
      batches.push(domains.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Execute deployment batch
   * @private
   * @param {Array<string>} batch - Batch of domains
   * @param {CoordinationContext} context - Coordination context
   * @returns {Promise<Object>} Batch result
   */
  async _executeDeploymentBatch(batch, context) {
    const batchResult = {
      successful: [],
      failed: [],
      startTime: Date.now(),
      duration: 0
    };

    try {
      // Execute batch in parallel
      const batchPromises = batch.map(async (domain) => {
        try {
          const result = await this.multiDomainOrchestrator.deploySingleDomain(domain, {
            environment: context.options.environment || 'production',
            dryRun: context.options.dryRun || false,
            timeout: this.config.timeout / batch.length // Divide timeout among batch
          });

          batchResult.successful.push({
            domain,
            result,
            deployedAt: new Date()
          });

          return { domain, success: true, result };

        } catch (error) {
          this.logger.warn(`Domain deployment failed in batch: ${domain}`, { error: error.message });

          batchResult.failed.push({
            domain,
            error: this.errorClassifier.classifyError(error, 'batch_deployment_failure'),
            failedAt: new Date()
          });

          return { domain, success: false, error };
        }
      });

      await Promise.allSettled(batchPromises);
      batchResult.duration = Date.now() - batchResult.startTime;

      return batchResult;

    } catch (error) {
      batchResult.duration = Date.now() - batchResult.startTime;
      this.logger.error('Batch execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Determine if coordination should continue after batch failure
   * @private
   * @param {Object} batchResult - Batch result
   * @param {CoordinationContext} context - Coordination context
   * @returns {Promise<boolean>} Whether to continue
   */
  async _shouldContinueAfterBatchFailure(batchResult, context) {
    const failureRate = batchResult.failed.length / (batchResult.successful.length + batchResult.failed.length);
    const threshold = this.config.continuationThreshold || 0.5;

    if (failureRate > threshold) {
      this.logger.warn(`Batch failure rate ${failureRate.toFixed(2)} exceeds threshold ${threshold}, stopping coordination`);
      return false;
    }

    this.logger.info(`Batch failure rate ${failureRate.toFixed(2)} within threshold ${threshold}, continuing coordination`);
    return true;
  }

  /**
   * Finalize coordination
   * @private
   * @param {Object} coordinationResult - Raw coordination result
   * @param {CoordinationContext} context - Coordination context
   * @returns {CoordinationResult} Final result
   */
  async _finalizeCoordination(coordinationResult, context) {
    this.logger.info('Finalizing multi-domain coordination');

    // End audit session
    if (this.config.audit.enabled) {
      await this.deploymentAuditor.endDeploymentAudit(context.coordinationId, 'success', {
        domainsCoordinated: context.domains.length,
        successful: coordinationResult.results.successful.length,
        failed: coordinationResult.results.failed.length,
        duration: coordinationResult.duration
      });
    }

    const finalResult = {
      success: coordinationResult.results.failed.length === 0,
      coordinationId: context.coordinationId,
      results: coordinationResult.results,
      errors: coordinationResult.results.failed.map(f => f.error),
      duration: coordinationResult.duration,
      metrics: this._collectCoordinationMetrics(context),
      audit: {
        enabled: this.config.audit.enabled,
        level: this.config.audit.level
      }
    };

    this.emit('coordinationFinalized', { context, result: finalResult });
    return finalResult;
  }

  /**
   * Create coordination context
   * @private
   * @param {string} coordinationId - Coordination ID
   * @param {Array<string>} domains - Domains
   * @param {Object} options - Options
   * @returns {CoordinationContext} Context
   */
  _createCoordinationContext(coordinationId, domains, options) {
    return {
      coordinationId,
      domains: [...domains],
      strategy: options.strategy || 'batch-sequential',
      startTime: new Date(),
      options: { ...options },
      metadata: {
        coordinator: 'multi-domain',
        version: '2.0.0',
        batchSize: this.config.batchSize
      }
    };
  }

  /**
   * Create failure result
   * @private
   * @param {string} coordinationId - Coordination ID
   * @param {Array<string>} domains - Domains
   * @param {Error} error - Error
   * @param {CoordinationContext} context - Context
   * @returns {CoordinationResult} Failure result
   */
  _createFailureResult(coordinationId, domains, error, context) {
    return {
      success: false,
      coordinationId,
      results: { successful: [], failed: domains.map(d => ({ domain: d, error })) },
      errors: [this.errorClassifier.classifyError(error, 'coordination_failure')],
      duration: Date.now() - context.startTime.getTime(),
      metrics: this._collectCoordinationMetrics(context),
      audit: {
        enabled: this.config.audit.enabled,
        level: this.config.audit.level
      }
    };
  }

  /**
   * Collect coordination metrics
   * @private
   * @param {CoordinationContext} context - Context
   * @returns {Object} Metrics
   */
  _collectCoordinationMetrics(context) {
    return {
      startTime: context.startTime,
      endTime: new Date(),
      duration: Date.now() - context.startTime.getTime(),
      domainCount: context.domains.length,
      batchSize: this.config.batchSize,
      strategy: context.strategy
    };
  }

  /**
   * Update coordination metrics
   * @private
   * @param {CoordinationResult} result - Result
   */
  _updateMetrics(result) {
    this.metrics.totalCoordinations++;
    this.metrics.lastCoordinationTime = new Date();

    if (result.success) {
      this.metrics.successfulCoordinations++;
    } else {
      this.metrics.failedCoordinations++;
    }

    // Update average duration
    const totalDuration = this.metrics.averageDuration * (this.metrics.totalCoordinations - 1) + result.duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalCoordinations;
  }

  /**
   * Generate unique coordination ID
   * @private
   * @returns {string} Coordination ID
   */
  _generateCoordinationId() {
    return `multi-domain-coord-${uuidv4()}`;
  }

  /**
   * Start monitoring
   * @private
   */
  _startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this._performMonitoringCheck();
    }, this.config.monitoring.interval);

    this.logger.debug('Multi-domain coordination monitoring started', {
      interval: this.config.monitoring.interval
    });
  }

  /**
   * Perform monitoring check
   * @private
   */
  async _performMonitoringCheck() {
    try {
      const activeCount = this.activeCoordinations.size;
      const metrics = { ...this.metrics, activeCoordinations: activeCount };

      // Check for long-running coordinations
      for (const coordinationId of this.activeCoordinations) {
        const state = this.coordinationState.get(coordinationId);
        if (state && state.context) {
          const duration = Date.now() - state.context.startTime.getTime();
          if (duration > this.config.monitoring.alertThresholds.duration) {
            this.logger.warn(`Long-running coordination detected`, {
              coordinationId,
              domainCount: state.context.domains.length,
              duration
            });

            this.emit('longRunningCoordination', {
              coordinationId,
              domainCount: state.context.domains.length,
              duration
            });
          }
        }
      }

      this.emit('coordinationMonitoringCheck', metrics);

    } catch (error) {
      this.logger.error('Coordination monitoring check failed', { error: error.message });
    }
  }

  /**
   * Get coordination status
   * @param {string} coordinationId - Coordination ID
   * @returns {Object|null} Status
   */
  getCoordinationStatus(coordinationId) {
    return this.coordinationState.get(coordinationId) || null;
  }

  /**
   * Get coordinator metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeCoordinations: this.activeCoordinations.size,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown coordinator
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Shutting down Multi-Domain Coordinator...');

    // Clear monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Shutdown components
    const shutdownPromises = [];

    if (this.multiDomainOrchestrator?.shutdown) {
      shutdownPromises.push(this.multiDomainOrchestrator.shutdown());
    }

    if (this.crossDomainCoordinator?.shutdown) {
      shutdownPromises.push(this.crossDomainCoordinator.shutdown());
    }

    if (this.deploymentAuditor?.shutdown) {
      shutdownPromises.push(this.deploymentAuditor.shutdown());
    }

    await Promise.allSettled(shutdownPromises);

    this.logger.info('Multi-Domain Coordinator shutdown completed');
    this.emit('coordinatorShutdown');
  }
}

export default MultiDomainCoordinator;