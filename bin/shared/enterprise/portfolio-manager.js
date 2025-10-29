/**
 * Portfolio Deployment Manager
 *
 * Enterprise-grade portfolio deployment orchestration system providing comprehensive
 * management of domain portfolios with health checks, dependency resolution, rollback
 * thresholds, and advanced monitoring capabilities.
 *
 * @author Clodo Framework Team
 * @version 2.0.0
 * @since 2025-10-29
 */

import { EventEmitter } from 'events';

// Enterprise utility imports
import { Logger } from '../logging/Logger.js';
import { classifyError } from '../error-handling/error-classifier.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';

// Core deployment modules
import { MultiDomainOrchestrator } from '../../../src/orchestration/multi-domain-orchestrator.js';
import { CrossDomainCoordinator } from '../../../src/orchestration/cross-domain-coordinator.js';
import { DeploymentAuditor } from '../deployment/auditor.js';
import { ProductionTestingCoordinator } from './testing-coordinator.js';

/**
 * Portfolio Deployment Configuration
 * @typedef {Object} PortfolioDeploymentConfig
 * @property {string} portfolioName - Name of the portfolio
 * @property {Array<string>} domains - List of domains in portfolio
 * @property {Object} filters - Domain filtering options
 * @property {Object} healthCheck - Health check configuration
 * @property {number} rollbackThreshold - Rollback threshold (0-1)
 * @property {boolean} enableCoordination - Enable cross-domain coordination
 * @property {boolean} resolveDependencies - Resolve domain dependencies
 * @property {number} batchSize - Deployment batch size
 * @property {number} timeout - Overall deployment timeout (ms)
 * @property {boolean} dryRun - Simulate deployment
 * @property {Object} monitoring - Monitoring configuration
 * @property {Object} audit - Audit configuration
 */

/**
 * Portfolio Health Status
 * @typedef {Object} PortfolioHealthStatus
 * @property {number} total - Total domains in portfolio
 * @property {number} healthy - Number of healthy domains
 * @property {number} unhealthy - Number of unhealthy domains
 * @property {Array} issues - Health issues found
 * @property {Date} checkedAt - When health check was performed
 */

/**
 * Portfolio Deployment Result
 * @typedef {Object} PortfolioDeploymentResult
 * @property {boolean} success - Whether portfolio deployment succeeded
 * @property {string} portfolioId - Unique portfolio deployment ID
 * @property {Object} results - Individual domain results
 * @property {PortfolioHealthStatus} healthStatus - Portfolio health status
 * @property {number} duration - Total deployment duration
 * @property {Array} errors - Errors encountered
 * @property {Object} metrics - Deployment metrics
 * @property {Object} audit - Audit information
 */

/**
 * Portfolio Deployment Manager
 *
 * Orchestrates deployment of entire domain portfolios with enterprise-grade features
 * including health checks, dependency resolution, rollback thresholds, and comprehensive
 * monitoring and auditing.
 */
export class PortfolioDeploymentManager extends EventEmitter {
  /**
   * Create Portfolio Deployment Manager
   * @param {PortfolioDeploymentConfig} config - Manager configuration
   */
  constructor(config = {}) {
    super();

    // Initialize core configuration
    this.config = this._initializeConfiguration(config);

    // Initialize core components
    this.logger = new Logger({
      level: this.config.logging?.level || 'info',
      prefix: '[Portfolio-Manager]',
      enableFileLogging: this.config.logging?.enableFileLogging || false
    });

    this.classifyError = classifyError;
    this.configManager = new ConfigurationManager();

    // Initialize deployment state
    this.deploymentState = new Map();
    this.activeDeployments = new Set();

    // Initialize metrics
    this.metrics = {
      totalPortfolios: 0,
      successfulPortfolios: 0,
      failedPortfolios: 0,
      averageDuration: 0,
      lastDeploymentTime: null
    };

    this.logger.info('Portfolio Deployment Manager initialized', {
      portfolioName: this.config.portfolioName,
      domainCount: this.config.domains?.length || 0,
      enableCoordination: this.config.enableCoordination
    });
  }

  /**
   * Initialize configuration with enterprise defaults
   * @private
   * @param {Object} userConfig - User-provided configuration
   * @returns {PortfolioDeploymentConfig} Complete configuration
   */
  _initializeConfiguration(userConfig) {
    const defaults = {
      portfolioName: 'enterprise-portfolio',
      domains: [],
      filters: {
        include: [],
        exclude: [],
        pattern: null
      },
      healthCheck: {
        enabled: true,
        timeout: 30000,
        criticalServices: ['api', 'auth', 'database']
      },
      rollbackThreshold: 0.8,
      enableCoordination: true,
      resolveDependencies: true,
      batchSize: 3,
      timeout: 3600000, // 1 hour
      dryRun: false,
      monitoring: {
        enabled: true,
        interval: 60000,
        alertThresholds: {
          duration: 1800000, // 30 minutes
          errorRate: 0.2
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
        logDirectory: './logs/portfolio-deployments'
      }
    };

    return this.configManager.mergeConfigurations(defaults, userConfig);
  }

  /**
   * Initialize manager components
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing Portfolio Deployment Manager components...');

      // Initialize core orchestrators
      this.multiDomainOrchestrator = new MultiDomainOrchestrator({
        maxConcurrentDeployments: this.config.batchSize,
        timeout: this.config.timeout,
        enableRollback: true
      });

      this.crossDomainCoordinator = new CrossDomainCoordinator({
        portfolioName: this.config.portfolioName,
        enableDependencyResolution: this.config.resolveDependencies
      });

      this.deploymentAuditor = new DeploymentAuditor({
        auditLevel: this.config.audit.level,
        enableCompliance: this.config.audit.enableCompliance
      });

      this.productionTester = new ProductionTester({
        comprehensiveTests: true,
        environment: 'production'
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

      this.logger.info('Portfolio Deployment Manager initialization completed');

    } catch (error) {
      this.logger.error('Failed to initialize Portfolio Deployment Manager', { error: error.message });
      throw this.classifyError(error);
    }
  }

  /**
   * Execute portfolio deployment
   * @param {Object} options - Deployment options
   * @returns {Promise<PortfolioDeploymentResult>} Portfolio deployment result
   */
  async deployPortfolio(options = {}) {
    const portfolioId = this._generatePortfolioId();
    const context = this._createDeploymentContext(portfolioId, options);

    this.logger.info(`Starting portfolio deployment: ${this.config.portfolioName}`, {
      portfolioId,
      domainCount: this.config.domains.length
    });

    try {
      // Track active deployment
      this.activeDeployments.add(portfolioId);
      this.deploymentState.set(portfolioId, { status: 'initializing', context });

      // Emit deployment started event
      this.emit('portfolioDeploymentStarted', context);

      // Phase 1: Discover and filter domains
      const targetDomains = await this._discoverTargetDomains(context);

      // Phase 2: Health check (if enabled)
      let healthStatus = null;
      if (this.config.healthCheck.enabled && !this.config.dryRun) {
        healthStatus = await this._executeHealthCheck(targetDomains, context);
      }

      // Phase 3: Execute portfolio deployment
      const deploymentResult = await this._executePortfolioDeployment(targetDomains, context);

      // Phase 4: Finalize portfolio deployment
      const finalResult = await this._finalizePortfolioDeployment(deploymentResult, healthStatus, context);

      // Update metrics
      this._updateMetrics(finalResult);

      this.logger.info(`Portfolio deployment completed successfully: ${this.config.portfolioName}`, {
        portfolioId,
        domainsDeployed: targetDomains.length,
        duration: finalResult.duration
      });

      return finalResult;

    } catch (error) {
      this.logger.error(`Portfolio deployment failed: ${this.config.portfolioName}`, {
        portfolioId,
        error: error.message,
        stack: error.stack
      });

      // Execute rollback if threshold exceeded
      if (this.config.rollbackThreshold > 0) {
        await this._executePortfolioRollback(portfolioId, context, error);
      }

      // Create failure result
      const failureResult = this._createFailureResult(portfolioId, error, context);

      // Update metrics
      this._updateMetrics(failureResult);

      throw failureResult;

    } finally {
      // Cleanup
      this.activeDeployments.delete(portfolioId);
      this.deploymentState.delete(portfolioId);
      this.emit('portfolioDeploymentCompleted', context);
    }
  }

  /**
   * Discover target domains for deployment
   * @private
   * @param {Object} context - Deployment context
   * @returns {Promise<Array<string>>} Filtered list of target domains
   */
  async _discoverTargetDomains(context) {
    this.logger.info('Discovering target domains for portfolio deployment');

    let domains = [...this.config.domains];

    // Apply filters
    if (this.config.filters.pattern) {
      const pattern = new RegExp(this.config.filters.pattern);
      domains = domains.filter(domain => pattern.test(domain));
    }

    if (this.config.filters.include.length > 0) {
      const includePatterns = this.config.filters.include.map(p => new RegExp(p));
      domains = domains.filter(domain =>
        includePatterns.some(pattern => pattern.test(domain))
      );
    }

    if (this.config.filters.exclude.length > 0) {
      const excludePatterns = this.config.filters.exclude.map(p => new RegExp(p));
      domains = domains.filter(domain =>
        !excludePatterns.some(pattern => pattern.test(domain))
      );
    }

    // Resolve dependencies if enabled
    if (this.config.resolveDependencies) {
      domains = await this.crossDomainCoordinator.resolveDependencies(domains);
    }

    this.logger.info(`Target domains discovered: ${domains.length} domains`, { domains });
    this.emit('domainsDiscovered', { domains, context });

    return domains;
  }

  /**
   * Execute portfolio health check
   * @private
   * @param {Array<string>} domains - Domains to check
   * @param {Object} context - Deployment context
   * @returns {Promise<PortfolioHealthStatus>} Health status
   */
  async _executeHealthCheck(domains, context) {
    this.logger.info('Executing portfolio health check', { domainCount: domains.length });

    this.emit('healthCheckStarted', { domains, context });

    try {
      const healthResults = await this.crossDomainCoordinator.monitorPortfolioHealth();

      const healthStatus = {
        total: domains.length,
        healthy: healthResults.summary.healthy,
        unhealthy: healthResults.summary.total - healthResults.summary.healthy,
        issues: healthResults.issues || [],
        checkedAt: new Date()
      };

      const healthRate = healthStatus.healthy / healthStatus.total;
      this.logger.info(`Portfolio health check completed: ${healthStatus.healthy}/${healthStatus.total} healthy`, {
        healthRate: healthRate.toFixed(2)
      });

      this.emit('healthCheckCompleted', { healthStatus, context });

      return healthStatus;

    } catch (error) {
      this.logger.error('Portfolio health check failed', { error: error.message });
      this.emit('healthCheckFailed', { domains, context, error });
      throw error;
    }
  }

  /**
   * Execute portfolio deployment
   * @private
   * @param {Array<string>} domains - Domains to deploy
   * @param {Object} context - Deployment context
   * @returns {Promise<Object>} Deployment results
   */
  async _executePortfolioDeployment(domains, context) {
    this.logger.info(`Executing portfolio deployment for ${domains.length} domains`);

    this.emit('portfolioDeploymentPhaseStarted', { domains, context });

    try {
      const deploymentOptions = {
        environment: context.environment,
        batchSize: this.config.batchSize,
        enableCoordination: this.config.enableCoordination,
        dryRun: this.config.dryRun,
        timeout: this.config.timeout,
        rollbackThreshold: this.config.rollbackThreshold
      };

      const result = await this.crossDomainCoordinator.coordinateMultiDomainDeployment(
        domains,
        deploymentOptions
      );

      this.logger.info('Portfolio deployment phase completed', {
        successful: result.results.successful.length,
        failed: result.results.failed.length,
        total: domains.length
      });

      this.emit('portfolioDeploymentPhaseCompleted', { domains, result, context });

      return result;

    } catch (error) {
      this.logger.error('Portfolio deployment phase failed', { error: error.message });
      this.emit('portfolioDeploymentPhaseFailed', { domains, context, error });
      throw error;
    }
  }

  /**
   * Finalize portfolio deployment
   * @private
   * @param {Object} deploymentResult - Raw deployment result
   * @param {PortfolioHealthStatus} healthStatus - Health status
   * @param {Object} context - Deployment context
   * @returns {PortfolioDeploymentResult} Final result
   */
  async _finalizePortfolioDeployment(deploymentResult, healthStatus, context) {
    this.logger.info('Finalizing portfolio deployment');

    // End audit session
    if (this.config.audit.enabled) {
      await this.deploymentAuditor.endDeploymentAudit(context.portfolioId, 'success', {
        portfolioName: this.config.portfolioName,
        domainsDeployed: deploymentResult.results.successful.length,
        duration: deploymentResult.duration
      });
    }

    const finalResult = {
      success: true,
      portfolioId: context.portfolioId,
      results: deploymentResult.results,
      healthStatus,
      duration: deploymentResult.duration,
      errors: [],
      metrics: this._collectPortfolioMetrics(context),
      audit: {
        enabled: this.config.audit.enabled,
        level: this.config.audit.level
      }
    };

    this.emit('portfolioDeploymentFinalized', { context, result: finalResult });
    return finalResult;
  }

  /**
   * Execute portfolio rollback
   * @private
   * @param {string} portfolioId - Portfolio deployment ID
   * @param {Object} context - Deployment context
   * @param {Error} error - Original error
   */
  async _executePortfolioRollback(portfolioId, context, error) {
    this.logger.warn(`Executing portfolio rollback for: ${this.config.portfolioName}`);

    try {
      // Calculate rollback threshold
      const successRate = this._calculateSuccessRate(context);

      if (successRate < this.config.rollbackThreshold) {
        this.logger.info(`Rollback threshold exceeded (${successRate.toFixed(2)} < ${this.config.rollbackThreshold}), initiating rollback`);

        const rollbackResult = await this.crossDomainCoordinator.rollbackPortfolioDeployment(portfolioId, {
          reason: `Portfolio deployment failed: ${error.message}`,
          force: false
        });

        this.logger.info('Portfolio rollback completed', {
          portfolioId,
          rollbackId: rollbackResult.rollbackId
        });

        this.emit('portfolioRollbackExecuted', { portfolioId, context, rollbackResult });
      } else {
        this.logger.info(`Rollback threshold not exceeded (${successRate.toFixed(2)} >= ${this.config.rollbackThreshold}), skipping rollback`);
      }

    } catch (rollbackError) {
      this.logger.error('Portfolio rollback failed', {
        portfolioId,
        rollbackError: rollbackError.message
      });

      this.emit('portfolioRollbackFailed', { portfolioId, context, error: rollbackError });
    }
  }

  /**
   * Create deployment context
   * @private
   * @param {string} portfolioId - Portfolio ID
   * @param {Object} options - Deployment options
   * @returns {Object} Deployment context
   */
  _createDeploymentContext(portfolioId, options) {
    return {
      portfolioId,
      portfolioName: this.config.portfolioName,
      environment: options.environment || 'production',
      startTime: new Date(),
      options: { ...options },
      metadata: {
        manager: 'portfolio',
        version: '2.0.0',
        initiatedBy: options.user || 'system'
      }
    };
  }

  /**
   * Create failure result
   * @private
   * @param {string} portfolioId - Portfolio ID
   * @param {Error} error - Failure error
   * @param {Object} context - Deployment context
   * @returns {PortfolioDeploymentResult} Failure result
   */
  _createFailureResult(portfolioId, error, context) {
    return {
      success: false,
      portfolioId,
      results: { successful: [], failed: [] },
      healthStatus: null,
      duration: Date.now() - context.startTime.getTime(),
      errors: [this.classifyError(error)],
      metrics: this._collectPortfolioMetrics(context),
      audit: {
        enabled: this.config.audit.enabled,
        level: this.config.audit.level
      }
    };
  }

  /**
   * Calculate success rate from context
   * @private
   * @param {Object} context - Deployment context
   * @returns {number} Success rate (0-1)
   */
  _calculateSuccessRate(context) {
    // This would be calculated based on actual deployment results
    // For now, return a default value
    return 0.5;
  }

  /**
   * Collect portfolio metrics
   * @private
   * @param {Object} context - Deployment context
   * @returns {Object} Portfolio metrics
   */
  _collectPortfolioMetrics(context) {
    return {
      startTime: context.startTime,
      endTime: new Date(),
      duration: Date.now() - context.startTime.getTime(),
      portfolioName: context.portfolioName,
      environment: context.environment,
      manager: 'portfolio'
    };
  }

  /**
   * Update portfolio metrics
   * @private
   * @param {PortfolioDeploymentResult} result - Deployment result
   */
  _updateMetrics(result) {
    this.metrics.totalPortfolios++;
    this.metrics.lastDeploymentTime = new Date();

    if (result.success) {
      this.metrics.successfulPortfolios++;
    } else {
      this.metrics.failedPortfolios++;
    }

    // Update average duration
    const totalDuration = this.metrics.averageDuration * (this.metrics.totalPortfolios - 1) + result.duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalPortfolios;
  }

  /**
   * Generate unique portfolio ID
   * @private
   * @returns {string} Portfolio ID
   */
  _generatePortfolioId() {
    return `portfolio-deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start monitoring
   * @private
   */
  _startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this._performMonitoringCheck();
    }, this.config.monitoring.interval);

    this.logger.debug('Portfolio deployment monitoring started', {
      interval: this.config.monitoring.interval
    });
  }

  /**
   * Perform monitoring check
   * @private
  async _performMonitoringCheck() {
    try {
      const activeCount = this.activeDeployments.size;
      const metrics = { ...this.metrics, activeDeployments: activeCount };

      // Check for long-running deployments
      for (const portfolioId of this.activeDeployments) {
        const state = this.deploymentState.get(portfolioId);
        if (state && state.context) {
          const duration = Date.now() - state.context.startTime.getTime();
          if (duration > this.config.monitoring.alertThresholds.duration) {
            this.logger.warn(`Long-running portfolio deployment detected`, {
              portfolioId,
              portfolioName: state.context.portfolioName,
              duration
            });

            this.emit('longRunningPortfolioDeployment', {
              portfolioId,
              portfolioName: state.context.portfolioName,
              duration
            });
          }
        }
      }

      this.emit('portfolioMonitoringCheck', metrics);

    } catch (error) {
      this.logger.error('Portfolio monitoring check failed', { error: error.message });
    }
  }

  /**
   * Get portfolio deployment status
   * @param {string} portfolioId - Portfolio deployment ID
   * @returns {Object|null} Deployment status
   */
  getPortfolioStatus(portfolioId) {
    return this.deploymentState.get(portfolioId) || null;
  }

  /**
   * Get portfolio manager metrics
   * @returns {Object} Manager metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeDeployments: this.activeDeployments.size,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown portfolio manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Shutting down Portfolio Deployment Manager...');

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

    this.logger.info('Portfolio Deployment Manager shutdown completed');
    this.emit('portfolioShutdown');
  }
}

export default PortfolioDeploymentManager;