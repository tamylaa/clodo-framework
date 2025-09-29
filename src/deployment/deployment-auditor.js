/**
 * Enterprise Deployment Audit System
 * 
 * Comprehensive audit and logging system for enterprise deployments with:
 * - Structured deployment logging with multiple output formats
 * - Comprehensive audit trails with compliance features
 * - Deployment history tracking and analytics
 * - Backup and recovery logging
 * - Performance metrics and reporting
 * - Cross-environment audit coordination
 * - Real-time monitoring and alerting
 * - Compliance reporting and retention policies
 * - Advanced search and filtering capabilities
 * 
 * @module deployment-auditor
 * @version 2.0.0
 */

import { existsSync, access } from 'fs';
import { readFile, writeFile, appendFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DeploymentAuditor {
  constructor(options = {}) {
    this.config = {
      // Audit configuration
      auditLevel: options.auditLevel || 'detailed', // minimal, standard, detailed, verbose
      retentionDays: options.retentionDays || 90,
      maxLogSize: options.maxLogSize || 100 * 1024 * 1024, // 100MB
      
      // Output formats
      formats: options.formats || ['json', 'csv', 'plain'],
      includeMetrics: options.includeMetrics !== false,
      includeBackups: options.includeBackups !== false,
      
      // Paths
      auditDir: options.auditDir || 'audit-logs',
      backupDir: options.backupDir || 'audit-backups',
      reportsDir: options.reportsDir || 'audit-reports',
      
      // Real-time options
      realTimeAlerts: options.realTimeAlerts || false,
      alertWebhook: options.alertWebhook || null,
      
      // Compliance
      complianceMode: options.complianceMode || false,
      encryptLogs: options.encryptLogs || false,
      digitallySigned: options.digitallySigned || false,
      
      // Environment tracking
      environments: options.environments || ['development', 'staging', 'production'],
      crossEnvironmentTracking: options.crossEnvironmentTracking !== false
    };

    // Audit state
    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      deployments: new Map(),
      events: [],
      metrics: {
        totalEvents: 0,
        errorCount: 0,
        warningCount: 0,
        deploymentCount: 0,
        rollbackCount: 0
      }
    };

    // Event types registry
    this.eventTypes = {
      DEPLOYMENT_START: { level: 'info', category: 'deployment', retention: 'long' },
      DEPLOYMENT_END: { level: 'info', category: 'deployment', retention: 'long' },
      DEPLOYMENT_ERROR: { level: 'error', category: 'deployment', retention: 'permanent' },
      PHASE_START: { level: 'debug', category: 'phase', retention: 'standard' },
      PHASE_END: { level: 'debug', category: 'phase', retention: 'standard' },
      ROLLBACK_START: { level: 'warn', category: 'rollback', retention: 'long' },
      ROLLBACK_END: { level: 'warn', category: 'rollback', retention: 'long' },
      SECRET_GENERATED: { level: 'info', category: 'security', retention: 'long' },
      SECRET_DEPLOYED: { level: 'info', category: 'security', retention: 'long' },
      DATABASE_MIGRATION: { level: 'info', category: 'database', retention: 'long' },
      VALIDATION_ERROR: { level: 'error', category: 'validation', retention: 'long' },
      PERFORMANCE_METRIC: { level: 'info', category: 'performance', retention: 'standard' },
      SECURITY_EVENT: { level: 'warn', category: 'security', retention: 'permanent' },
      COMPLIANCE_VIOLATION: { level: 'error', category: 'compliance', retention: 'permanent' },
      AUDIT_EVENT: { level: 'info', category: 'audit', retention: 'permanent' }
    };

    // Initialize audit system
    this.initializeAuditSystem();
    this.logAuditEvent('AUDIT_SYSTEM_INITIALIZED', 'SYSTEM', {
      config: this.config,
      sessionId: this.currentSession.sessionId
    });

    console.log('📋 Deployment Audit System initialized');
    if (this.config.auditLevel === 'verbose') {
      console.log(`   📊 Session ID: ${this.currentSession.sessionId}`);
      console.log(`   🔍 Audit Level: ${this.config.auditLevel}`);
      console.log(`   💾 Formats: ${this.config.formats.join(', ')}`);
      console.log(`   📁 Audit Directory: ${this.config.auditDir}`);
    }
  }

  /**
   * Initialize audit system directories and files
   */
  initializeAuditSystem() {
    this.paths = {
      audit: this.config.auditDir,
      backup: this.config.backupDir,
      reports: this.config.reportsDir,
      daily: join(this.config.auditDir, 'daily'),
      deployments: join(this.config.auditDir, 'deployments'),
      security: join(this.config.auditDir, 'security'),
      performance: join(this.config.auditDir, 'performance'),
      compliance: join(this.config.auditDir, 'compliance')
    };

    // Create directory structure - moved to async initialize
    // Object.values(this.paths).forEach(path => {
    //   if (!existsSync(path)) {
    //     mkdirSync(path, { recursive: true });
    //   }
    // });

    // Initialize log files
    this.logFiles = {
      main: join(this.paths.audit, 'deployment-audit.log'),
      errors: join(this.paths.audit, 'deployment-errors.log'),
      security: join(this.paths.security, 'security-audit.log'),
      performance: join(this.paths.performance, 'performance-audit.log'),
      compliance: join(this.paths.compliance, 'compliance-audit.log'),
      daily: join(this.paths.daily, `audit-${this.getCurrentDateString()}.log`)
    };

    // Initialize session log
    this.sessionLogFile = join(this.paths.deployments, `session-${this.currentSession.sessionId}.log`);
  }

  /**
   * Initialize the auditor asynchronously
   */
  async initialize() {
    // Create directory structure
    for (const path of Object.values(this.paths)) {
      try {
        await mkdir(path, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore
      }
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Get current date string for file naming
   * @returns {string} Date string
   */
  getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Start deployment audit session
   * @param {string} deploymentId - Deployment identifier
   * @param {string} domain - Domain being deployed
   * @param {Object} config - Deployment configuration
   * @returns {Object} Deployment audit context
   */
  startDeploymentAudit(deploymentId, domain, config = {}) {
    const deploymentContext = {
      deploymentId,
      domain,
      config,
      startTime: new Date(),
      phases: [],
      events: [],
      metrics: {
        phaseCount: 0,
        errorCount: 0,
        warningCount: 0,
        duration: 0
      },
      rollbacks: [],
      status: 'in-progress'
    };

    this.currentSession.deployments.set(deploymentId, deploymentContext);
    this.currentSession.metrics.deploymentCount++;

    this.logAuditEvent('DEPLOYMENT_START', domain, {
      deploymentId,
      config,
      sessionId: this.currentSession.sessionId,
      environment: config.environment || 'unknown'
    });

    console.log(`📋 Deployment audit started: ${deploymentId}`);
    if (this.config.auditLevel === 'verbose') {
      console.log(`   🌐 Domain: ${domain}`);
      console.log(`   🌍 Environment: ${config.environment || 'unknown'}`);
    }

    return deploymentContext;
  }

  /**
   * End deployment audit session
   * @param {string} deploymentId - Deployment identifier
   * @param {string} status - Final deployment status
   * @param {Object} summary - Deployment summary
   */
  endDeploymentAudit(deploymentId, status, summary = {}) {
    const deployment = this.currentSession.deployments.get(deploymentId);
    
    if (!deployment) {
      this.logAuditEvent('AUDIT_ERROR', 'SYSTEM', {
        error: `Deployment not found: ${deploymentId}`,
        deploymentId
      });
      return;
    }

    deployment.endTime = new Date();
    deployment.duration = (deployment.endTime - deployment.startTime) / 1000;
    deployment.status = status;
    deployment.summary = summary;

    this.logAuditEvent('DEPLOYMENT_END', deployment.domain, {
      deploymentId,
      status,
      duration: deployment.duration,
      phaseCount: deployment.phases.length,
      errorCount: deployment.metrics.errorCount,
      summary
    });

    console.log(`📋 Deployment audit completed: ${deploymentId} (${status})`);
    if (this.config.auditLevel !== 'minimal') {
      console.log(`   ⏱️  Duration: ${deployment.duration.toFixed(2)}s`);
      console.log(`   📊 Phases: ${deployment.phases.length}`);
      console.log(`   ❌ Errors: ${deployment.metrics.errorCount}`);
    }

    // Generate deployment report
    this.generateDeploymentReport(deploymentId);
  }

  /**
   * Log deployment phase start/end
   * @param {string} deploymentId - Deployment identifier
   * @param {string} phaseName - Phase name
   * @param {string} action - 'start' or 'end'
   * @param {Object} details - Phase details
   */
  logPhase(deploymentId, phaseName, action, details = {}) {
    const deployment = this.currentSession.deployments.get(deploymentId);
    
    if (!deployment) {
      console.warn(`⚠️  Deployment not found for phase logging: ${deploymentId}`);
      return;
    }

    const phaseEvent = {
      phase: phaseName,
      action,
      timestamp: new Date(),
      details
    };

    deployment.phases.push(phaseEvent);

    if (action === 'start') {
      deployment.metrics.phaseCount++;
    }

    this.logAuditEvent(`PHASE_${action.toUpperCase()}`, deployment.domain, {
      deploymentId,
      phase: phaseName,
      phaseNumber: deployment.phases.filter(p => p.action === 'start').length,
      details
    });

    if (this.config.auditLevel === 'verbose') {
      console.log(`   📋 Phase ${action}: ${phaseName}`);
    }
  }

  /**
   * Log deployment error with context
   * @param {string} deploymentId - Deployment identifier
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context
   */
  logError(deploymentId, error, context = {}) {
    const deployment = this.currentSession.deployments.get(deploymentId);
    
    if (deployment) {
      deployment.metrics.errorCount++;
    }

    this.currentSession.metrics.errorCount++;

    const errorDetails = {
      deploymentId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : { message: error.toString() },
      context,
      timestamp: new Date()
    };

    this.logAuditEvent('DEPLOYMENT_ERROR', deployment?.domain || 'UNKNOWN', errorDetails);

    // Write to error log
    this.writeToLogFile(this.logFiles.errors, {
      type: 'error',
      timestamp: new Date(),
      deploymentId,
      error: errorDetails.error,
      context
    });

    console.error(`❌ Deployment error logged: ${deploymentId}`);
  }

  /**
   * Log security-related events
   * @param {string} deploymentId - Deployment identifier
   * @param {string} eventType - Security event type
   * @param {Object} details - Security event details
   */
  logSecurityEvent(deploymentId, eventType, details = {}) {
    const securityEvent = {
      deploymentId,
      eventType,
      details,
      timestamp: new Date(),
      severity: details.severity || 'medium'
    };

    this.logAuditEvent('SECURITY_EVENT', details.domain || 'SYSTEM', securityEvent);

    // Write to security log
    this.writeToLogFile(this.logFiles.security, securityEvent);

    if (this.config.auditLevel !== 'minimal') {
      console.log(`🔐 Security event: ${eventType} (${securityEvent.severity})`);
    }

    // Alert on high severity events
    if (securityEvent.severity === 'high' && this.config.realTimeAlerts) {
      this.sendSecurityAlert(securityEvent);
    }
  }

  /**
   * Log performance metrics
   * @param {string} deploymentId - Deployment identifier
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {Object} metadata - Additional metric metadata
   */
  logPerformanceMetric(deploymentId, metricName, value, metadata = {}) {
    const performanceEvent = {
      deploymentId,
      metric: metricName,
      value,
      metadata,
      timestamp: new Date()
    };

    this.logAuditEvent('PERFORMANCE_METRIC', metadata.domain || 'SYSTEM', performanceEvent);

    if (this.config.includeMetrics) {
      this.writeToLogFile(this.logFiles.performance, performanceEvent);
    }

    if (this.config.auditLevel === 'verbose') {
      console.log(`⚡ Performance: ${metricName} = ${value}${metadata.unit || ''}`);
    }
  }

  /**
   * Log rollback operations
   * @param {string} deploymentId - Deployment identifier
   * @param {string} action - Rollback action ('start' or 'end')
   * @param {Object} rollbackData - Rollback details
   */
  logRollback(deploymentId, action, rollbackData = {}) {
    const deployment = this.currentSession.deployments.get(deploymentId);
    
    if (deployment && action === 'start') {
      deployment.rollbacks.push({
        startTime: new Date(),
        actions: rollbackData.actions || [],
        reason: rollbackData.reason || 'deployment-failure'
      });
    }

    if (action === 'start') {
      this.currentSession.metrics.rollbackCount++;
    }

    this.logAuditEvent(`ROLLBACK_${action.toUpperCase()}`, deployment?.domain || 'SYSTEM', {
      deploymentId,
      rollbackData,
      timestamp: new Date()
    });

    console.log(`🔄 Rollback ${action}: ${deploymentId}`);
  }

  /**
   * Log general audit event
   * @param {string} eventType - Type of event
   * @param {string} domain - Domain context
   * @param {Object} details - Event details
   */
  logAuditEvent(eventType, domain, details = {}) {
    const eventConfig = this.eventTypes[eventType] || { 
      level: 'info', 
      category: 'general', 
      retention: 'standard' 
    };

    const auditEvent = {
      eventType,
      level: eventConfig.level,
      category: eventConfig.category,
      retention: eventConfig.retention,
      domain,
      details,
      timestamp: new Date(),
      sessionId: this.currentSession.sessionId,
      sequence: this.currentSession.metrics.totalEvents++
    };

    // Add to session events
    this.currentSession.events.push(auditEvent);

    // Write to main audit log
    this.writeToLogFile(this.logFiles.main, auditEvent);
    
    // Write to daily log
    this.writeToLogFile(this.logFiles.daily, auditEvent);

    // Write to session log
    this.writeToLogFile(this.sessionLogFile, auditEvent);

    // Category-specific logging
    if (eventConfig.category === 'security') {
      this.writeToLogFile(this.logFiles.security, auditEvent);
    } else if (eventConfig.category === 'compliance') {
      this.writeToLogFile(this.logFiles.compliance, auditEvent);
    }

    // Update metrics
    if (eventConfig.level === 'error') {
      this.currentSession.metrics.errorCount++;
    } else if (eventConfig.level === 'warn') {
      this.currentSession.metrics.warningCount++;
    }

    // Real-time processing
    if (this.config.realTimeAlerts && eventConfig.level === 'error') {
      this.sendAlert(auditEvent);
    }
  }

  /**
   * Write structured log entry to file
   * @param {string} logFile - Log file path
   * @param {Object} logEntry - Log entry object
   */
  async writeToLogFile(logFile, logEntry) {
    try {
      // Ensure directory exists
      const dir = dirname(logFile);
      try {
        await access(dir);
      } catch {
        await mkdir(dir, { recursive: true });
      }

      // Check file size and rotate if needed
      try {
        const stats = await stat(logFile);
        if (stats.size > this.config.maxLogSize) {
          await this.rotateLogFile(logFile);
        }
      } catch {
        // File doesn't exist, no rotation needed
      }

      // Write log entry based on format
      if (this.config.formats.includes('json')) {
        await appendFile(logFile, JSON.stringify(logEntry) + '\n');
      }

      if (this.config.formats.includes('plain')) {
        const plainEntry = `[${logEntry.timestamp?.toISOString() || new Date().toISOString()}] ${logEntry.eventType || 'LOG'}: ${JSON.stringify(logEntry.details || logEntry)}`;
        const plainFile = logFile.replace('.log', '.txt');
        await appendFile(plainFile, plainEntry + '\n');
      }

      if (this.config.formats.includes('csv')) {
        const csvFile = logFile.replace('.log', '.csv');
        const csvHeaders = 'timestamp,eventType,level,category,domain,details\n';
        
        try {
          await access(csvFile);
        } catch {
          await writeFile(csvFile, csvHeaders);
        }
        
        const csvEntry = [
          logEntry.timestamp?.toISOString() || new Date().toISOString(),
          logEntry.eventType || 'LOG',
          logEntry.level || 'info',
          logEntry.category || 'general',
          logEntry.domain || '',
          JSON.stringify(logEntry.details || {}).replace(/"/g, '""')
        ].join(',');
        
        await appendFile(csvFile, csvEntry + '\n');
      }

    } catch (error) {
      console.error(`⚠️  Failed to write audit log: ${error.message}`);
    }
  }

  /**
   * Rotate log file when it exceeds size limit
   * @param {string} logFile - Log file to rotate
   */
  async rotateLogFile(logFile) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
      
      // Move current file
      await execAsync(`move "${logFile}" "${rotatedFile}"`, { shell: true });
      
      await this.logAuditEvent('AUDIT_LOG_ROTATED', 'SYSTEM', {
        originalFile: logFile,
        rotatedFile: rotatedFile,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`⚠️  Failed to rotate log file: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive deployment report
   * @param {string} deploymentId - Deployment identifier
   * @returns {Object} Generated report info
   */
  async generateDeploymentReport(deploymentId) {
    const deployment = this.currentSession.deployments.get(deploymentId);
    
    if (!deployment) {
      console.warn(`⚠️  Cannot generate report: deployment ${deploymentId} not found`);
      return null;
    }

    const reportData = {
      deploymentId,
      domain: deployment.domain,
      startTime: deployment.startTime,
      endTime: deployment.endTime,
      duration: deployment.duration,
      status: deployment.status,
      phases: deployment.phases,
      metrics: deployment.metrics,
      rollbacks: deployment.rollbacks,
      events: deployment.events,
      summary: deployment.summary || {},
      generatedAt: new Date()
    };

    // Generate report files
    const reportFiles = {
      json: join(this.paths.reports, `deployment-${deploymentId}.json`),
      html: join(this.paths.reports, `deployment-${deploymentId}.html`),
      csv: join(this.paths.reports, `deployment-${deploymentId}.csv`)
    };

    // JSON report
    await writeFile(reportFiles.json, JSON.stringify(reportData, null, 2));

    // HTML report
    const htmlReport = this.generateHtmlReport(reportData);
    await writeFile(reportFiles.html, htmlReport);

    // CSV report
    const csvReport = this.generateCsvReport(reportData);
    await writeFile(reportFiles.csv, csvReport);

    console.log(`📊 Deployment report generated: ${deploymentId}`);
    if (this.config.auditLevel !== 'minimal') {
      console.log(`   📄 JSON: ${reportFiles.json}`);
      console.log(`   🌐 HTML: ${reportFiles.html}`);
      console.log(`   📊 CSV: ${reportFiles.csv}`);
    }

    return reportFiles;
  }

  /**
   * Generate HTML deployment report
   * @param {Object} reportData - Report data
   * @returns {string} HTML content
   */
  generateHtmlReport(reportData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deployment Report - ${reportData.deploymentId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${reportData.status === 'success' ? '#059669' : '#dc2626'}; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 24px; }
        .phases { background: #f1f5f9; border-radius: 6px; padding: 20px; margin-top: 20px; }
        .phase { padding: 15px; border-left: 4px solid #3b82f6; margin-bottom: 10px; background: white; }
        .phase.error { border-color: #dc2626; background: #fef2f2; }
        .timeline { margin-top: 20px; }
        .event { padding: 10px; border-left: 3px solid #e2e8f0; margin-bottom: 8px; font-size: 14px; }
        .event.error { border-color: #dc2626; color: #dc2626; }
        .event.warn { border-color: #f59e0b; color: #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Deployment Report</h1>
            <p>Deployment: ${reportData.deploymentId}</p>
            <p>Domain: ${reportData.domain}</p>
            <p>Status: ${reportData.status.toUpperCase()}</p>
            <p>Generated: ${reportData.generatedAt.toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="summary-card">
                    <h3>${reportData.duration?.toFixed(2) || 0}s</h3>
                    <p>Total Duration</p>
                </div>
                <div class="summary-card">
                    <h3>${reportData.phases.length}</h3>
                    <p>Phases Executed</p>
                </div>
                <div class="summary-card">
                    <h3>${reportData.metrics.errorCount}</h3>
                    <p>Errors</p>
                </div>
                <div class="summary-card">
                    <h3>${reportData.rollbacks.length}</h3>
                    <p>Rollbacks</p>
                </div>
            </div>

            <div class="phases">
                <h3>📊 Deployment Phases</h3>
                ${reportData.phases.map((phase, index) => `
                    <div class="phase ${phase.error ? 'error' : ''}">
                        <strong>${index + 1}. ${phase.phase} (${phase.action})</strong>
                        <div>Time: ${phase.timestamp.toLocaleString()}</div>
                        ${phase.details ? `<div>Details: ${JSON.stringify(phase.details)}</div>` : ''}
                    </div>
                `).join('')}
            </div>

            ${reportData.events.length > 0 ? `
            <div class="timeline">
                <h3>📝 Event Timeline</h3>
                ${reportData.events.slice(-20).map(event => `
                    <div class="event ${event.level}">
                        <strong>${event.timestamp.toLocaleString()}</strong> - ${event.eventType}
                        ${event.details ? `<div>${JSON.stringify(event.details)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSV deployment report
   * @param {Object} reportData - Report data
   * @returns {string} CSV content
   */
  generateCsvReport(reportData) {
    const headers = 'timestamp,phase,action,status,duration,details\n';
    const rows = reportData.phases.map(phase => [
      phase.timestamp.toISOString(),
      phase.phase,
      phase.action,
      phase.error ? 'error' : 'success',
      reportData.duration || 0,
      JSON.stringify(phase.details || {}).replace(/"/g, '""')
    ].join(',')).join('\n');

    return headers + rows;
  }

  /**
   * Search audit logs with filters
   * @param {Object} filters - Search filters
   * @returns {Array} Matching log entries
   */
  searchAuditLogs(filters = {}) {
    const results = [];
    const {
      eventType,
      domain,
      dateFrom,
      dateTo,
      level,
      category,
      deploymentId,
      limit = 100
    } = filters;

    // Search current session events
    let matchingEvents = this.currentSession.events.filter(event => {
      if (eventType && event.eventType !== eventType) return false;
      if (domain && event.domain !== domain) return false;
      if (level && event.level !== level) return false;
      if (category && event.category !== category) return false;
      if (deploymentId && event.details?.deploymentId !== deploymentId) return false;
      if (dateFrom && event.timestamp < new Date(dateFrom)) return false;
      if (dateTo && event.timestamp > new Date(dateTo)) return false;
      return true;
    });

    // Sort by timestamp (newest first)
    matchingEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    results.push(...matchingEvents.slice(0, limit));

    this.logAuditEvent('AUDIT_SEARCH', 'SYSTEM', {
      filters,
      resultCount: results.length
    });

    return results;
  }

  /**
   * Generate audit summary for current session
   * @returns {Object} Audit summary
   */
  generateAuditSummary() {
    const sessionDuration = (new Date() - this.currentSession.startTime) / 1000;
    
    const summary = {
      sessionId: this.currentSession.sessionId,
      sessionDuration,
      metrics: { ...this.currentSession.metrics },
      deployments: Array.from(this.currentSession.deployments.entries()).map(([id, deployment]) => ({
        deploymentId: id,
        domain: deployment.domain,
        status: deployment.status,
        duration: deployment.duration,
        phaseCount: deployment.phases.length,
        errorCount: deployment.metrics.errorCount
      })),
      eventsByCategory: {},
      eventsByLevel: {},
      generatedAt: new Date()
    };

    // Categorize events
    this.currentSession.events.forEach(event => {
      // By category
      if (!summary.eventsByCategory[event.category]) {
        summary.eventsByCategory[event.category] = 0;
      }
      summary.eventsByCategory[event.category]++;

      // By level
      if (!summary.eventsByLevel[event.level]) {
        summary.eventsByLevel[event.level] = 0;
      }
      summary.eventsByLevel[event.level]++;
    });

    console.log('\n📊 Audit Session Summary');
    console.log(`   🆔 Session: ${summary.sessionId}`);
    console.log(`   ⏱️  Duration: ${sessionDuration.toFixed(2)}s`);
    console.log(`   📈 Deployments: ${summary.metrics.deploymentCount}`);
    console.log(`   📝 Total Events: ${summary.metrics.totalEvents}`);
    console.log(`   ❌ Errors: ${summary.metrics.errorCount}`);
    console.log(`   ⚠️  Warnings: ${summary.metrics.warningCount}`);

    return summary;
  }

  /**
   * Send real-time security alert
   * @param {Object} securityEvent - Security event data
   */
  async sendSecurityAlert(securityEvent) {
    if (!this.config.alertWebhook) {
      console.warn('⚠️  Security alert webhook not configured');
      return;
    }

    const alert = {
      type: 'security_alert',
      severity: securityEvent.severity,
      event: securityEvent,
      timestamp: new Date(),
      sessionId: this.currentSession.sessionId
    };

    try {
      // In a real implementation, this would send to a webhook
      console.log(`🚨 Security Alert: ${securityEvent.eventType} (${securityEvent.severity})`);
      
      this.logAuditEvent('SECURITY_ALERT_SENT', 'SYSTEM', {
        alertId: Date.now().toString(),
        event: securityEvent
      });

    } catch (error) {
      console.error(`❌ Failed to send security alert: ${error.message}`);
    }
  }

  /**
   * Send general alert
   * @param {Object} auditEvent - Audit event to alert on
   */
  async sendAlert(auditEvent) {
    if (!this.config.realTimeAlerts) return;

    console.log(`🔔 Alert: ${auditEvent.eventType} (${auditEvent.level})`);
    
    this.logAuditEvent('ALERT_SENT', 'SYSTEM', {
      alertId: Date.now().toString(),
      originalEvent: auditEvent.eventType
    });
  }

  /**
   * Clean up old audit logs based on retention policy
   * @returns {Object} Cleanup results
   */
  async cleanupAuditLogs() {
    const cleanupResults = {
      filesRemoved: 0,
      spaceSaved: 0,
      errors: []
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Scan audit directory for old files
      const scanDirectory = async (dir) => {
        try {
          await access(dir);
        } catch {
          return;
        }

        const items = await readdir(dir);
        for (const item of items) {
          const itemPath = join(dir, item);
          const stats = await stat(itemPath);

          if (stats.isFile() && stats.mtime < cutoffDate) {
            try {
              cleanupResults.spaceSaved += stats.size;
              await execAsync(`del "${itemPath}"`, { shell: true });
              cleanupResults.filesRemoved++;
            } catch (error) {
              cleanupResults.errors.push({
                file: itemPath,
                error: error.message
              });
            }
          }
        }
      };

      await scanDirectory(this.paths.daily);
      await scanDirectory(this.paths.deployments);

      this.logAuditEvent('AUDIT_CLEANUP_COMPLETED', 'SYSTEM', cleanupResults);

      console.log(`🧹 Audit cleanup completed: ${cleanupResults.filesRemoved} files removed`);

    } catch (error) {
      console.error(`❌ Audit cleanup failed: ${error.message}`);
      cleanupResults.errors.push({ general: error.message });
    }

    return cleanupResults;
  }
}

// Legacy function exports for backward compatibility

/**
 * Create simple audit logger
 * @param {string} deploymentId - Deployment identifier
 * @param {Object} options - Audit options
 * @returns {DeploymentAuditor} Auditor instance
 */
export function createAuditLogger(deploymentId, options = {}) {
  const auditor = new DeploymentAuditor(options);
  
  return {
    logPhase: (phase, action, details) => auditor.logPhase(deploymentId, phase, action, details),
    logError: (error, context) => auditor.logError(deploymentId, error, context),
    logEvent: (eventType, details) => auditor.logAuditEvent(eventType, details.domain || 'SYSTEM', details),
    generateReport: () => auditor.generateDeploymentReport(deploymentId),
    getSummary: () => auditor.generateAuditSummary()
  };
}

/**
 * Simple deployment logging
 * @param {string} deploymentId - Deployment identifier
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 */
export function logDeployment(deploymentId, message, context = {}) {
  const auditor = new DeploymentAuditor({ auditLevel: 'standard' });
  auditor.logAuditEvent('DEPLOYMENT_LOG', context.domain || 'SYSTEM', {
    deploymentId,
    message,
    ...context
  });
}

/**
 * Log deployment phase with timing
 * @param {string} deploymentId - Deployment identifier
 * @param {string} phase - Phase name
 * @param {Function} operation - Operation to execute
 * @returns {Promise<*>} Operation result
 */
export async function auditPhase(deploymentId, phase, operation) {
  const auditor = new DeploymentAuditor({ auditLevel: 'detailed' });
  
  auditor.logPhase(deploymentId, phase, 'start');
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    auditor.logPhase(deploymentId, phase, 'end', { duration, success: true });
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    auditor.logPhase(deploymentId, phase, 'end', { duration, success: false, error: error.message });
    auditor.logError(deploymentId, error, { phase });
    throw error;
  }
}