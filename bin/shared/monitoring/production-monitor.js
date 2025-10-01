/**
 * Production Monitoring Module
 * Implements structured logging, metrics collection, and alerting
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class ProductionMonitor {
  constructor(options = {}) {
    this.config = {
      logLevel: options.logLevel || 'info',
      logDir: options.logDir || 'logs',
      metricsInterval: options.metricsInterval || 60000, // 1 minute
      alertThresholds: {
        errorRate: options.errorRateThreshold || 0.05, // 5% error rate
        responseTime: options.responseTimeThreshold || 5000, // 5 seconds
        memoryUsage: options.memoryUsageThreshold || 0.8, // 80% memory usage
        ...options.alertThresholds
      },
      enableMetrics: options.enableMetrics !== false,
      enableAlerts: options.enableAlerts !== false,
      alertWebhook: options.alertWebhook,
      ...options
    };

    this.metrics = {
      startTime: new Date(),
      requests: { total: 0, successful: 0, failed: 0 },
      responseTimes: [],
      errors: [],
      memoryUsage: [],
      customMetrics: new Map()
    };

    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };

    this.alerts = [];
    this.isMonitoring = false;
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    await this.ensureLogDirectory();

    // Start metrics collection
    if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => {
        this.collectSystemMetrics();
        this.checkAlertThresholds();
      }, this.config.metricsInterval);
    }

    this.log('info', 'Production monitoring started', {
      config: this.config,
      startTime: this.metrics.startTime
    });
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    await this.saveMetrics();
    this.log('info', 'Production monitoring stopped');
  }

  /**
   * Log a message with structured data
   */
  async log(level, message, data = {}) {
    if (this.logLevels[level] < this.logLevels[this.config.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Console output for development
    const consoleMethod = level === 'error' || level === 'fatal' ? 'error' :
                         level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data);

    // File logging
    try {
      const logFile = join(this.config.logDir, `${new Date().toISOString().split('T')[0]}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      await appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log file:', error);
    }

    // Track errors for metrics
    if (level === 'error' || level === 'fatal') {
      this.metrics.errors.push(logEntry);
    }
  }

  /**
   * Record a request
   */
  recordRequest(success = true, responseTime = 0, metadata = {}) {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    if (responseTime > 0) {
      this.metrics.responseTimes.push({
        time: responseTime,
        timestamp: new Date(),
        success,
        ...metadata
      });

      // Keep only last 1000 response times
      if (this.metrics.responseTimes.length > 1000) {
        this.metrics.responseTimes.shift();
      }
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name, value, tags = {}) {
    if (!this.metrics.customMetrics.has(name)) {
      this.metrics.customMetrics.set(name, []);
    }

    const metrics = this.metrics.customMetrics.get(name);
    metrics.push({
      value,
      timestamp: new Date(),
      tags
    });

    // Keep only last 100 values per metric
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const memoryData = {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: new Date()
    };

    this.metrics.memoryUsage.push(memoryData);

    // Keep only last 100 memory readings
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }

    // Record memory usage as custom metric
    this.recordMetric('memory_usage_percent', (memUsage.heapUsed / memUsage.heapTotal) * 100);
    this.recordMetric('memory_heap_used_mb', memUsage.heapUsed / 1024 / 1024);
  }

  /**
   * Check alert thresholds and trigger alerts
   */
  checkAlertThresholds() {
    const now = Date.now();

    // Check error rate
    const recentRequests = this.getRecentRequests(5 * 60 * 1000); // Last 5 minutes
    if (recentRequests.total > 10) { // Only check if we have enough data
      const errorRate = recentRequests.failed / recentRequests.total;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.triggerAlert('HIGH_ERROR_RATE', {
          errorRate: errorRate * 100,
          threshold: this.config.alertThresholds.errorRate * 100,
          recentRequests
        });
      }
    }

    // Check response time
    const avgResponseTime = this.getAverageResponseTime(5 * 60 * 1000);
    if (avgResponseTime > this.config.alertThresholds.responseTime) {
      this.triggerAlert('HIGH_RESPONSE_TIME', {
        averageResponseTime: avgResponseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }

    // Check memory usage
    const currentMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    if (currentMemory) {
      const memoryUsagePercent = currentMemory.heapUsed / currentMemory.heapTotal;
      if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
        this.triggerAlert('HIGH_MEMORY_USAGE', {
          memoryUsagePercent: memoryUsagePercent * 100,
          threshold: this.config.alertThresholds.memoryUsage * 100,
          heapUsed: currentMemory.heapUsed,
          heapTotal: currentMemory.heapTotal
        });
      }
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(type, data) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      data,
      acknowledged: false
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Log the alert
    await this.log('error', `Alert triggered: ${type}`, data);

    // Send webhook if configured
    if (this.config.alertWebhook) {
      try {
        await this.sendWebhookAlert(alert);
      } catch (error) {
        await this.log('error', 'Failed to send alert webhook', { error: error.message });
      }
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    if (!this.config.alertWebhook) return;

    // In a real implementation, you'd use fetch or axios to send the webhook
    // For now, just log it
    await this.log('info', 'Alert webhook would be sent', {
      webhook: this.config.alertWebhook,
      alert
    });
  }

  /**
   * Get recent requests within time window
   */
  getRecentRequests(timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    const recent = this.metrics.responseTimes.filter(r => r.timestamp.getTime() > cutoff);

    return {
      total: recent.length,
      successful: recent.filter(r => r.success).length,
      failed: recent.filter(r => !r.success).length
    };
  }

  /**
   * Get average response time within time window
   */
  getAverageResponseTime(timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    const recent = this.metrics.responseTimes.filter(r => r.timestamp.getTime() > cutoff);

    if (recent.length === 0) return 0;

    const totalTime = recent.reduce((sum, r) => sum + r.time, 0);
    return totalTime / recent.length;
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    const uptime = Date.now() - this.metrics.startTime.getTime();

    return {
      uptime,
      requests: { ...this.metrics.requests },
      errorRate: this.metrics.requests.total > 0 ?
        (this.metrics.requests.failed / this.metrics.requests.total) * 100 : 0,
      averageResponseTime: this.getAverageResponseTime(60 * 60 * 1000), // Last hour
      memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1],
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      totalAlerts: this.alerts.length
    };
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      ...this.getMetricsSummary(),
      responseTimes: this.metrics.responseTimes.slice(-100), // Last 100
      memoryUsage: this.metrics.memoryUsage.slice(-20), // Last 20 readings
      errors: this.metrics.errors.slice(-50), // Last 50 errors
      alerts: this.alerts.slice(-20), // Last 20 alerts
      customMetrics: Object.fromEntries(this.metrics.customMetrics)
    };
  }

  /**
   * Save metrics to file
   */
  async saveMetrics() {
    try {
      const metricsFile = join(this.config.logDir, 'metrics.json');
      const metricsData = this.getDetailedMetrics();
      await writeFile(metricsFile, JSON.stringify(metricsData, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await mkdir(this.config.logDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts() {
    return this.alerts.filter(a => !a.acknowledged);
  }
}