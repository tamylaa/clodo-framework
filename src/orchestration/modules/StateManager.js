/**
 * State Manager Module
 * Handles portfolio state tracking, audit logging, and rollback planning
 * Extracted from MultiDomainOrchestrator for focused responsibility
 */

import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export class StateManager {
  constructor(options = {}) {
    this.environment = options.environment || 'production';
    this.dryRun = options.dryRun || false;
    this.logDirectory = options.logDirectory || 'deployments';
    this.enablePersistence = options.enablePersistence !== false;
    this.rollbackEnabled = options.rollbackEnabled !== false;
    
    // Initialize portfolio state
    this.portfolioState = this.initializePortfolioState(options);
  }

  /**
   * Initialize portfolio state structure
   * @param {Object} options - Initialization options
   * @returns {Object} Portfolio state object
   */
  initializePortfolioState(options = {}) {
    return {
      orchestrationId: this.generateOrchestrationId(),
      startTime: new Date(),
      endTime: null,
      environment: this.environment,
      totalDomains: options.domains?.length || 0,
      completedDomains: 0,
      failedDomains: 0,
      domainStates: new Map(),
      rollbackPlan: [],
      auditLog: [],
      metadata: {
        dryRun: this.dryRun,
        persistenceEnabled: this.enablePersistence,
        rollbackEnabled: this.rollbackEnabled
      }
    };
  }

  /**
   * Generate unique orchestration ID for tracking portfolio deployments
   * @returns {string} Unique orchestration identifier
   */
  generateOrchestrationId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = randomBytes(6).toString('hex');
    return `orchestration-${timestamp}-${random}`;
  }

  /**
   * Generate deployment ID for individual domain
   * @param {string} domain - Domain name
   * @returns {string} Unique deployment identifier
   */
  generateDeploymentId(domain) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = randomBytes(4).toString('hex');
    return `deploy-${domain}-${timestamp}-${random}`;
  }

  /**
   * Initialize domain states for portfolio
   * @param {Array} domains - Array of domain names
   * @returns {Promise<void>}
   */
  async initializeDomainStates(domains) {
    this.portfolioState.totalDomains = domains.length;
    
    domains.forEach(domain => {
      this.portfolioState.domainStates.set(domain, {
        domain,
        deploymentId: this.generateDeploymentId(domain),
        phase: 'pending',
        status: 'pending',
        startTime: null,
        endTime: null,
        error: null,
        rollbackActions: [],
        metadata: {
          created: new Date().toISOString(),
          environment: this.environment
        }
      });
    });

    await this.logAuditEvent('PORTFOLIO_INITIALIZED', 'ALL', {
      totalDomains: domains.length,
      domains: domains
    });
  }

  /**
   * Update domain state
   * @param {string} domain - Domain name
   * @param {Object} updates - State updates
   * @returns {Object} Updated domain state
   */
  updateDomainState(domain, updates) {
    const domainState = this.portfolioState.domainStates.get(domain);
    if (!domainState) {
      throw new Error(`Domain state not found: ${domain}`);
    }

    Object.assign(domainState, updates, {
      lastUpdated: new Date().toISOString()
    });

    return domainState;
  }

  /**
   * Get domain state
   * @param {string} domain - Domain name
   * @returns {Object|null} Domain state or null if not found
   */
  getDomainState(domain) {
    return this.portfolioState.domainStates.get(domain) || null;
  }

  /**
   * Get portfolio state summary
   * @returns {Object} Portfolio state summary
   */
  getPortfolioSummary() {
    const states = Array.from(this.portfolioState.domainStates.values());
    
    return {
      orchestrationId: this.portfolioState.orchestrationId,
      environment: this.environment,
      totalDomains: this.portfolioState.totalDomains,
      completed: states.filter(s => s.status === 'completed').length,
      failed: states.filter(s => s.status === 'failed').length,
      inProgress: states.filter(s => s.status === 'deploying').length,
      pending: states.filter(s => s.status === 'pending').length,
      startTime: this.portfolioState.startTime,
      endTime: this.portfolioState.endTime,
      duration: this.portfolioState.endTime 
        ? this.portfolioState.endTime - this.portfolioState.startTime 
        : Date.now() - this.portfolioState.startTime,
      auditLogSize: this.portfolioState.auditLog.length
    };
  }

  /**
   * Log audit event for tracking
   * @param {string} event - Event type
   * @param {string} domain - Domain or 'ALL' for portfolio events
   * @param {Object} details - Event details
   * @returns {Promise<void>}
   */
  async logAuditEvent(event, domain, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      orchestrationId: this.portfolioState.orchestrationId,
      event,
      domain,
      details,
      sequenceNumber: this.portfolioState.auditLog.length + 1
    };

    this.portfolioState.auditLog.push(auditEntry);

    // Save to file for persistence (fire and forget)
    if (this.enablePersistence && !this.dryRun) {
      try {
        await this.saveAuditLog();
      } catch (error) {
        console.warn(`⚠️ Failed to save audit log: ${error.message}`);
      }
    }
  }

  /**
   * Add rollback action for domain
   * @param {string} domain - Domain name
   * @param {Object} action - Rollback action
   */
  addRollbackAction(domain, action) {
    const domainState = this.getDomainState(domain);
    if (domainState) {
      domainState.rollbackActions.push({
        ...action,
        timestamp: new Date().toISOString(),
        id: randomBytes(4).toString('hex')
      });
    }

    // Add to portfolio rollback plan
    this.portfolioState.rollbackPlan.push({
      domain,
      action: {
        ...action,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get rollback plan for portfolio or specific domain
   * @param {string} [domain] - Optional domain filter
   * @returns {Array} Rollback actions
   */
  getRollbackPlan(domain = null) {
    if (domain) {
      return this.portfolioState.rollbackPlan.filter(item => item.domain === domain);
    }
    return this.portfolioState.rollbackPlan;
  }

  /**
   * Mark deployment as started
   * @param {string} domain - Domain name
   */
  markDeploymentStarted(domain) {
    this.updateDomainState(domain, {
      status: 'deploying',
      startTime: new Date()
    });
    this.portfolioState.completedDomains++;
  }

  /**
   * Mark deployment as completed
   * @param {string} domain - Domain name
   * @param {Object} result - Deployment result
   */
  markDeploymentCompleted(domain, result = {}) {
    this.updateDomainState(domain, {
      status: 'completed',
      endTime: new Date(),
      result
    });
    this.portfolioState.completedDomains++;
  }

  /**
   * Mark deployment as failed
   * @param {string} domain - Domain name
   * @param {Error|string} error - Error details
   */
  markDeploymentFailed(domain, error) {
    this.updateDomainState(domain, {
      status: 'failed',
      endTime: new Date(),
      error: error instanceof Error ? error.message : error
    });
    this.portfolioState.failedDomains++;
  }

  /**
   * Mark portfolio as completed
   */
  markPortfolioCompleted() {
    this.portfolioState.endTime = new Date();
  }

  /**
   * Save audit log to file
   * @returns {Promise<void>}
   */
  async saveAuditLog() {
    if (!this.enablePersistence) return;
    
    try {
      // Ensure log directory exists
      try {
        await access(this.logDirectory);
      } catch {
        await mkdir(this.logDirectory, { recursive: true });
      }

      const logFile = join(this.logDirectory, `${this.portfolioState.orchestrationId}.json`);
      const logData = {
        orchestrationId: this.portfolioState.orchestrationId,
        environment: this.environment,
        startTime: this.portfolioState.startTime,
        endTime: this.portfolioState.endTime,
        summary: this.getPortfolioSummary(),
        domainStates: Array.from(this.portfolioState.domainStates.entries()).reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {}),
        rollbackPlan: this.portfolioState.rollbackPlan,
        auditLog: this.portfolioState.auditLog,
        metadata: this.portfolioState.metadata
      };

      await writeFile(logFile, JSON.stringify(logData, null, 2));
    } catch (error) {
      console.warn(`⚠️ Failed to save audit log: ${error.message}`);
    }
  }

  /**
   * Get audit log entries
   * @param {Object} filter - Filter options
   * @returns {Array} Filtered audit entries
   */
  getAuditLog(filter = {}) {
    let entries = this.portfolioState.auditLog;

    if (filter.event) {
      entries = entries.filter(entry => entry.event === filter.event);
    }

    if (filter.domain) {
      entries = entries.filter(entry => entry.domain === filter.domain);
    }

    if (filter.since) {
      entries = entries.filter(entry => new Date(entry.timestamp) >= filter.since);
    }

    return entries;
  }

  /**
   * Clear state (for testing or reset)
   */
  clearState() {
    this.portfolioState = this.initializePortfolioState();
  }

  /**
   * Get state statistics
   * @returns {Object} State statistics
   */
  getStateStats() {
    return {
      orchestrationId: this.portfolioState.orchestrationId,
      domainCount: this.portfolioState.domainStates.size,
      auditLogSize: this.portfolioState.auditLog.length,
      rollbackActionsCount: this.portfolioState.rollbackPlan.length,
      persistenceEnabled: this.enablePersistence,
      dryRun: this.dryRun
    };
  }
}
