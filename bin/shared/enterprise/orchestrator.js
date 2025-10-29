/**
 * Enterprise Deployment Orchestrator
 *
 * Top-tier enterprise-grade deployment orchestration system providing comprehensive
 * deployment management with advanced error handling, audit trails, rollback capabilities,
 * and production testing integration.
 *
 * @author Clodo Framework Team
 * @version 2.0.0
 * @since 2025-10-29
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Enterprise utility imports
import { Logger } from '../logging/Logger.js';
import { classifyError } from '../error-handling/error-classifier.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { CloudflareAPI } from '../../../src/utils/cloudflare/api.js';

// Core deployment modules - using enterprise versions
import { MultiDomainOrchestrator } from '../../../src/orchestration/multi-domain-orchestrator.js';
import { RollbackManager } from './rollback-manager.js';
import { ProductionTestingCoordinator } from './testing-coordinator.js';
import { ComprehensiveValidationWorkflow } from './validation-workflow.js';
import { ConfigurationCacheManager } from './cache-manager.js';

/**
 * Enterprise Deployment Orchestrator Configuration
 * @typedef {Object} EnterpriseDeploymentConfig
 * @property {string} environment - Target deployment environment
 * @property {boolean} enableValidation - Enable pre-deployment validation
 * @property {string} validationLevel - Validation level (basic|standard|comprehensive)
 * @property {boolean} enableTesting - Enable post-deployment testing
 * @property {boolean} enableRollback - Enable automatic rollback on failure
 * @property {boolean} enableAuditing - Enable deployment auditing
 * @property {number} testTimeout - Timeout for production tests (ms)
 * @property {number} deploymentTimeout - Overall deployment timeout (ms)
 * @property {boolean} dryRun - Simulate deployment without changes
 * @property {Object} cloudflare - Cloudflare API configuration
 * @property {Object} monitoring - Monitoring configuration
 * @property {Object} audit - Audit configuration
 */

/**
 * Deployment Context
 * @typedef {Object} DeploymentContext
 * @property {string} deploymentId - Unique deployment identifier
 * @property {string} domain - Target domain
 * @property {string} environment - Deployment environment
 * @property {Date} startTime - Deployment start timestamp
 * @property {Object} options - Deployment options
 * @property {Object} metadata - Additional deployment metadata
 */

/**
 * Deployment Result
 * @typedef {Object} DeploymentResult
 * @property {boolean} success - Whether deployment succeeded
 * @property {string} deploymentId - Deployment identifier
 * @property {string} url - Deployed application URL
 * @property {number} duration - Deployment duration in seconds
 * @property {Array} errors - Array of errors encountered
 * @property {Object} metrics - Deployment metrics
 * @property {Object} audit - Audit information
 */

/**
 * Enterprise Deployment Orchestrator
 *
 * Orchestrates complex enterprise deployments with comprehensive error handling,
 * monitoring, auditing, and rollback capabilities. Designed for high-reliability
 * production deployments across multiple domains and environments.
 */
export class EnterpriseDeploymentOrchestrator extends EventEmitter {
  /**
   * Create Enterprise Deployment Orchestrator
   * @param {EnterpriseDeploymentConfig} config - Orchestrator configuration
   */
  constructor(config = {}) {
    super();

    // Initialize core configuration with defaults
    this.config = this._initializeConfiguration(config);

    // Initialize core components
    this.logger = new Logger({
      level: this.config.logging?.level || 'info',
      prefix: '[Enterprise-Orchestrator]',
      enableFileLogging: this.config.logging?.enableFileLogging || false
    });

    this.classifyError = classifyError;
    this.configManager = new ConfigurationManager();

    // Initialize deployment state
    this.deploymentState = new Map();
    this.activeDeployments = new Set();

    // Initialize metrics
    this.metrics = {
      totalDeployments: 0,
      successfulDeployments: 0,
      failedDeployments: 0,
      averageDuration: 0,
      lastDeploymentTime: null
    };

    this.logger.info('Enterprise Deployment Orchestrator initialized', {
      environment: this.config.environment,
      validationEnabled: this.config.enableValidation,
      testingEnabled: this.config.enableTesting
    });
  }

  /**
   * Initialize configuration with enterprise defaults
   * @private
   * @param {Object} userConfig - User-provided configuration
   * @returns {EnterpriseDeploymentConfig} Complete configuration
   */
  _initializeConfiguration(userConfig) {
    const defaults = {
      environment: 'production',
      enableValidation: true,
      validationLevel: 'comprehensive',
      enableTesting: true,
      enableRollback: true,
      enableAuditing: true,
      testTimeout: 300000, // 5 minutes
      deploymentTimeout: 1800000, // 30 minutes
      dryRun: false,
      cloudflare: {
        timeout: 60000,
        retries: 3,
        retryDelay: 5000
      },
      monitoring: {
        enabled: true,
        interval: 30000,
        alertThresholds: {
          duration: 600000, // 10 minutes
          errorRate: 0.1
        }
      },
      audit: {
        level: 'detailed',
        retentionDays: 90,
        enableCompliance: true
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        logDirectory: './logs/enterprise-deployments'
      }
    };

    return this.configManager.mergeConfigurations(defaults, userConfig);
  }

  /**
   * Initialize orchestrator components
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing Enterprise Deployment Orchestrator components...');

      // Initialize core modules
      this.multiDomainOrchestrator = new MultiDomainOrchestrator({
        maxConcurrentDeployments: 3,
        timeout: this.config.deploymentTimeout,
        enableRollback: this.config.enableRollback
      });

      this.rollbackManager = new RollbackManager({
        autoRollbackEnabled: this.config.enableRollback,
        retentionPeriod: this.config.audit.retentionDays
      });

      this.productionTester = new ProductionTester({
        comprehensiveTests: this.config.enableTesting,
        timeout: this.config.testTimeout,
        environment: this.config.environment
      });

      this.deploymentValidator = new DeploymentValidator({
        validationLevel: this.config.validationLevel,
        environment: this.config.environment
      });

      this.deploymentAuditor = new DeploymentAuditor({
        auditLevel: this.config.audit.level,
        enableCompliance: this.config.audit.enableCompliance
      });

      // Initialize Cloudflare API if configured
      if (this.config.cloudflare?.token) {
        this.cloudflareAPI = new CloudflareAPI({
          token: this.config.cloudflare.token,
          timeout: this.config.cloudflare.timeout,
          retries: this.config.cloudflare.retries
        });
      }

      // Initialize async components
      await Promise.all([
        this.multiDomainOrchestrator.initialize(),
        this.rollbackManager.initialize(),
        this.deploymentAuditor.initialize()
      ]);

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this._startMonitoring();
      }

      this.logger.info('Enterprise Deployment Orchestrator initialization completed');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize Enterprise Deployment Orchestrator', { error: error.message });
      throw this.classifyError(error);
    }
  }

  /**
   * Execute enterprise deployment for single domain
   * @param {string} domain - Domain to deploy
   * @param {Object} options - Deployment options
   * @returns {Promise<DeploymentResult>} Deployment result
   */
  async deployDomain(domain, options = {}) {
    const deploymentId = this._generateDeploymentId();
    const context = this._createDeploymentContext(deploymentId, domain, options);

    this.logger.info(`Starting enterprise deployment for domain: ${domain}`, { deploymentId });

    try {
      // Track active deployment
      this.activeDeployments.add(deploymentId);
      this.deploymentState.set(deploymentId, { status: 'initializing', context });

      // Emit deployment started event
      this.emit('deploymentStarted', context);

      // Phase 1: Pre-deployment validation
      if (this.config.enableValidation && !options.force) {
        await this._executeValidationPhase(domain, context);
      }

      // Phase 2: Execute deployment
      const deploymentResult = await this._executeDeploymentPhase(domain, context);

      // Phase 3: Post-deployment testing
      if (this.config.enableTesting && !this.config.dryRun) {
        await this._executeTestingPhase(domain, deploymentResult, context);
      }

      // Phase 4: Finalize deployment
      const finalResult = await this._finalizeDeployment(deploymentResult, context);

      // Update metrics
      this._updateMetrics(finalResult);

      this.logger.info(`Enterprise deployment completed successfully for: ${domain}`, {
        deploymentId,
        duration: finalResult.duration,
        url: finalResult.url
      });

      return finalResult;

    } catch (error) {
      this.logger.error(`Enterprise deployment failed for domain: ${domain}`, {
        deploymentId,
        error: error.message,
        stack: error.stack
      });

      // Execute rollback if enabled
      if (this.config.enableRollback) {
        await this._executeRollback(domain, context, error);
      }

      // Create failure result
      const failureResult = this._createFailureResult(deploymentId, domain, error, context);

      // Update metrics
      this._updateMetrics(failureResult);

      throw failureResult;

    } finally {
      // Cleanup
      this.activeDeployments.delete(deploymentId);
      this.deploymentState.delete(deploymentId);
      this.emit('deploymentCompleted', context);
    }
  }

  /**
   * Execute validation phase
   * @private
   * @param {string} domain - Domain to validate
   * @param {DeploymentContext} context - Deployment context
   */
  async _executeValidationPhase(domain, context) {
    this.logger.info(`Executing validation phase for: ${domain}`);
    this.deploymentState.set(context.deploymentId, { status: 'validating', context });

    this.emit('validationStarted', { domain, context });

    try {
      const validationResult = await this.deploymentValidator.validateDeployment(domain, {
        environment: context.environment,
        validationLevel: this.config.validationLevel,
        deploymentType: 'enterprise'
      });

      if (validationResult.overall !== 'passed') {
        const error = new Error(`Validation failed: ${validationResult.errors.length} errors found`);
        error.details = validationResult.errors;
        throw this.classifyError(error);
      }

      this.logger.info(`Validation completed successfully for: ${domain}`);
      this.emit('validationCompleted', { domain, context, result: validationResult });

    } catch (error) {
      this.logger.error(`Validation failed for: ${domain}`, { error: error.message });
      this.emit('validationFailed', { domain, context, error });
      throw error;
    }
  }

  /**
   * Execute deployment phase
   * @private
   * @param {string} domain - Domain to deploy
   * @param {DeploymentContext} context - Deployment context
   * @returns {Promise<Object>} Deployment result
   */
  async _executeDeploymentPhase(domain, context) {
    this.logger.info(`Executing deployment phase for: ${domain}`);
    this.deploymentState.set(context.deploymentId, { status: 'deploying', context });

    this.emit('deploymentPhaseStarted', { domain, context });

    try {
      const result = await this.multiDomainOrchestrator.deploySingleDomain(domain, {
        environment: context.environment,
        dryRun: this.config.dryRun,
        timeout: this.config.deploymentTimeout
      });

      this.logger.info(`Deployment phase completed for: ${domain}`, {
        url: result.url,
        duration: result.duration
      });

      this.emit('deploymentPhaseCompleted', { domain, context, result });
      return result;

    } catch (error) {
      this.logger.error(`Deployment phase failed for: ${domain}`, { error: error.message });
      this.emit('deploymentPhaseFailed', { domain, context, error });
      throw error;
    }
  }

  /**
   * Execute testing phase
   * @private
   * @param {string} domain - Domain to test
   * @param {Object} deploymentResult - Deployment result
   * @param {DeploymentContext} context - Deployment context
   */
  async _executeTestingPhase(domain, deploymentResult, context) {
    if (!deploymentResult.url) {
      this.logger.warn(`Skipping testing phase for ${domain} - no deployment URL available`);
      return;
    }

    this.logger.info(`Executing testing phase for: ${domain}`);
    this.deploymentState.set(context.deploymentId, { status: 'testing', context });

    this.emit('testingStarted', { domain, context, url: deploymentResult.url });

    try {
      // Wait for deployment propagation
      await this._waitForPropagation(deploymentResult.url);

      const testResult = await this.productionTester.runFullTestSuite(context.environment, {
        targetUrl: deploymentResult.url,
        timeout: this.config.testTimeout
      });

      if (testResult.failed > 0) {
        this.logger.warn(`Testing phase completed with failures for: ${domain}`, {
          passed: testResult.passed,
          failed: testResult.failed,
          total: testResult.total
        });

        // Check if failures are critical
        if (this._areTestFailuresCritical(testResult)) {
          const error = new Error(`Critical test failures: ${testResult.failed}/${testResult.total} tests failed`);
          error.testResults = testResult;
          throw this.classifyError(error);
        }
      } else {
        this.logger.info(`Testing phase completed successfully for: ${domain}`, {
          totalTests: testResult.total
        });
      }

      this.emit('testingCompleted', { domain, context, result: testResult });

    } catch (error) {
      this.logger.error(`Testing phase failed for: ${domain}`, { error: error.message });
      this.emit('testingFailed', { domain, context, error });
      throw error;
    }
  }

  /**
   * Finalize deployment
   * @private
   * @param {Object} deploymentResult - Raw deployment result
   * @param {DeploymentContext} context - Deployment context
   * @returns {DeploymentResult} Final deployment result
   */
  async _finalizeDeployment(deploymentResult, context) {
    this.logger.info(`Finalizing deployment for: ${context.domain}`);

    // End audit session
    if (this.config.enableAuditing) {
      await this.deploymentAuditor.endDeploymentAudit(context.deploymentId, 'success', {
        url: deploymentResult.url,
        duration: deploymentResult.duration,
        environment: context.environment
      });
    }

    const finalResult = {
      success: true,
      deploymentId: context.deploymentId,
      url: deploymentResult.url,
      duration: deploymentResult.duration,
      errors: [],
      metrics: this._collectDeploymentMetrics(context),
      audit: {
        enabled: this.config.enableAuditing,
        level: this.config.audit.level
      }
    };

    this.emit('deploymentFinalized', { context, result: finalResult });
    return finalResult;
  }

  /**
   * Execute rollback on deployment failure
   * @private
   * @param {string} domain - Domain to rollback
   * @param {DeploymentContext} context - Deployment context
   * @param {Error} error - Original error
   */
  async _executeRollback(domain, context, error) {
    this.logger.warn(`Executing rollback for failed deployment: ${domain}`);

    try {
      const rollbackResult = await this.rollbackManager.rollbackDeployment(context.deploymentId, {
        reason: `Automatic rollback due to deployment failure: ${error.message}`,
        force: false
      });

      this.logger.info(`Rollback completed for: ${domain}`, {
        deploymentId: context.deploymentId,
        rollbackId: rollbackResult.rollbackId
      });

      this.emit('rollbackExecuted', { domain, context, rollbackResult });

    } catch (rollbackError) {
      this.logger.error(`Rollback failed for: ${domain}`, {
        deploymentId: context.deploymentId,
        rollbackError: rollbackError.message
      });

      this.emit('rollbackFailed', { domain, context, error: rollbackError });
    }
  }

  /**
   * Create deployment context
   * @private
   * @param {string} deploymentId - Deployment ID
   * @param {string} domain - Target domain
   * @param {Object} options - Deployment options
   * @returns {DeploymentContext} Deployment context
   */
  _createDeploymentContext(deploymentId, domain, options) {
    return {
      deploymentId,
      domain,
      environment: options.environment || this.config.environment,
      startTime: new Date(),
      options: { ...options },
      metadata: {
        orchestrator: 'enterprise',
        version: '2.0.0',
        initiatedBy: options.user || 'system'
      }
    };
  }

  /**
   * Create failure result
   * @private
   * @param {string} deploymentId - Deployment ID
   * @param {string} domain - Failed domain
   * @param {Error} error - Failure error
   * @param {DeploymentContext} context - Deployment context
   * @returns {DeploymentResult} Failure result
   */
  _createFailureResult(deploymentId, domain, error, context) {
    return {
      success: false,
      deploymentId,
      url: null,
      duration: Date.now() - context.startTime.getTime(),
      errors: [this.classifyError(error)],
      metrics: this._collectDeploymentMetrics(context),
      audit: {
        enabled: this.config.enableAuditing,
        level: this.config.audit.level
      }
    };
  }

  /**
   * Generate unique deployment ID
   * @private
   * @returns {string} Deployment ID
   */
  _generateDeploymentId() {
    return `enterprise-deploy-${uuidv4()}`;
  }

  /**
   * Wait for deployment propagation
   * @private
   * @param {string} url - Deployment URL
   * @returns {Promise<void>}
   */
  async _waitForPropagation(url) {
    const propagationTime = this.config.testing?.propagationWaitTime || 10000;
    this.logger.debug(`Waiting ${propagationTime}ms for deployment propagation`, { url });

    return new Promise(resolve => setTimeout(resolve, propagationTime));
  }

  /**
   * Check if test failures are critical
   * @private
   * @param {Object} testResult - Test results
   * @returns {boolean} Whether failures are critical
   */
  _areTestFailuresCritical(testResult) {
    const failureRate = testResult.failed / testResult.total;
    const criticalThreshold = this.config.testing?.criticalFailureRate || 0.5;

    return failureRate > criticalThreshold;
  }

  /**
   * Collect deployment metrics
   * @private
   * @param {DeploymentContext} context - Deployment context
   * @returns {Object} Deployment metrics
   */
  _collectDeploymentMetrics(context) {
    return {
      startTime: context.startTime,
      endTime: new Date(),
      duration: Date.now() - context.startTime.getTime(),
      environment: context.environment,
      orchestrator: 'enterprise'
    };
  }

  /**
   * Update deployment metrics
   * @private
   * @param {DeploymentResult} result - Deployment result
   */
  _updateMetrics(result) {
    this.metrics.totalDeployments++;
    this.metrics.lastDeploymentTime = new Date();

    if (result.success) {
      this.metrics.successfulDeployments++;
    } else {
      this.metrics.failedDeployments++;
    }

    // Update average duration
    const totalDuration = this.metrics.averageDuration * (this.metrics.totalDeployments - 1) + result.duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalDeployments;
  }

  /**
   * Start monitoring
   * @private
   */
  _startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this._performMonitoringCheck();
    }, this.config.monitoring.interval);

    this.logger.debug('Enterprise deployment monitoring started', {
      interval: this.config.monitoring.interval
    });
  }

  /**
   * Perform monitoring check
   * @private
   */
  async _performMonitoringCheck() {
    try {
      const activeCount = this.activeDeployments.size;
      const metrics = { ...this.metrics, activeDeployments: activeCount };

      // Check for long-running deployments
      for (const deploymentId of this.activeDeployments) {
        const state = this.deploymentState.get(deploymentId);
        if (state && state.context) {
          const duration = Date.now() - state.context.startTime.getTime();
          if (duration > this.config.monitoring.alertThresholds.duration) {
            this.logger.warn(`Long-running deployment detected`, {
              deploymentId,
              domain: state.context.domain,
              duration
            });

            this.emit('longRunningDeployment', {
              deploymentId,
              domain: state.context.domain,
              duration
            });
          }
        }
      }

      this.emit('monitoringCheck', metrics);

    } catch (error) {
      this.logger.error('Monitoring check failed', { error: error.message });
    }
  }

  /**
   * Get deployment status
   * @param {string} deploymentId - Deployment ID
   * @returns {Object|null} Deployment status
   */
  getDeploymentStatus(deploymentId) {
    return this.deploymentState.get(deploymentId) || null;
  }

  /**
   * Get orchestrator metrics
   * @returns {Object} Orchestrator metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeDeployments: this.activeDeployments.size,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown orchestrator
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Shutting down Enterprise Deployment Orchestrator...');

    // Clear monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Shutdown components
    const shutdownPromises = [];

    if (this.multiDomainOrchestrator?.shutdown) {
      shutdownPromises.push(this.multiDomainOrchestrator.shutdown());
    }

    if (this.rollbackManager?.shutdown) {
      shutdownPromises.push(this.rollbackManager.shutdown());
    }

    if (this.deploymentAuditor?.shutdown) {
      shutdownPromises.push(this.deploymentAuditor.shutdown());
    }

    await Promise.allSettled(shutdownPromises);

    this.logger.info('Enterprise Deployment Orchestrator shutdown completed');
    this.emit('shutdown');
  }
}

export default EnterpriseDeploymentOrchestrator;