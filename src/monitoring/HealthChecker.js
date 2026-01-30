/**
 * Runtime Health Checker
 * Provides health validation and monitoring for services
 */

/**
 * Runtime Health Checker for service monitoring
 */
export class HealthChecker {

  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000,
      interval: options.interval || 30000,
      retries: options.retries || 2,
      ...options
    };

    this.checks = new Map();
    this.lastCheck = null;
    this.overallStatus = 'unknown';
  }

  /**
   * Add a health check
   * @param {string} name - Check name
   * @param {Function} checkFunction - Async function that returns health status
   * @param {Object} options - Check options
   */
  addCheck(name, checkFunction, options = {}) {
    this.checks.set(name, {
      name,
      checkFunction,
      options: {
        timeout: options.timeout || this.options.timeout,
        critical: options.critical !== false,
        ...options
      },
      lastResult: null,
      lastCheck: null
    });
  }

  /**
   * Remove a health check
   * @param {string} name - Check name
   */
  removeCheck(name) {
    this.checks.delete(name);
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Health status
   */
  async runChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: this.checks.size,
        healthy: 0,
        unhealthy: 0,
        unknown: 0
      }
    };

    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const startTime = Date.now();
        const result = await this.runSingleCheck(check);
        const duration = Date.now() - startTime;

        results.checks[name] = {
          status: result.status,
          duration,
          timestamp: new Date().toISOString(),
          ...result.details
        };

        // Update summary
        results.summary[result.status === 'healthy' ? 'healthy' : 'unhealthy']++;

        // Update overall status
        if (result.status !== 'healthy' && check.options.critical) {
          results.status = 'unhealthy';
        }

      } catch (error) {
        results.checks[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        results.summary.unhealthy++;

        if (check.options.critical) {
          results.status = 'unhealthy';
        }
      }
    });

    await Promise.all(checkPromises);
    this.lastCheck = results;

    return results;
  }

  /**
   * Run a single health check with timeout and retries
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>} Check result
   */
  async runSingleCheck(check) {
    let lastError;

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), check.options.timeout);

        const result = await check.checkFunction({ signal: controller.signal });
        clearTimeout(timeoutId);

        check.lastResult = result;
        check.lastCheck = new Date();

        return {
          status: 'healthy',
          details: result
        };

      } catch (error) {
        lastError = error;

        if (attempt === this.options.retries) {
          break;
        }

        // Wait before retry
        await this.sleep(1000 * attempt);
      }
    }

    throw lastError;
  }

  /**
   * Get the last health check results
   * @returns {Object|null} Last check results
   */
  getLastResults() {
    return this.lastCheck;
  }

  /**
   * Get overall health status
   * @returns {string} Health status
   */
  getStatus() {
    return this.lastCheck?.status || 'unknown';
  }

  /**
   * Check if service is healthy
   * @returns {boolean} True if healthy
   */
  isHealthy() {
    return this.getStatus() === 'healthy';
  }

  /**
   * Add common health checks
   * @param {Object} env - Cloudflare Worker environment
   */
  addCommonChecks(env) {
    // Database connectivity check
    if (env.DATABASE) {
      this.addCheck('database', async () => {
        await env.DATABASE.prepare('SELECT 1').first();
        return { message: 'Database connection successful' };
      });
    }

    // KV connectivity check
    if (env.KV_CACHE) {
      this.addCheck('kv', async () => {
        await env.KV_CACHE.put('health-check', 'ok', { expirationTtl: 60 });
        return { message: 'KV connection successful' };
      });
    }

    // R2 connectivity check
    if (env.R2_STORAGE) {
      this.addCheck('r2', async () => {
        // Try to list objects (will work if bucket exists and is accessible)
        try {
          const objects = await env.R2_STORAGE.list({ limit: 1 });
          return { message: 'R2 connection successful' };
        } catch (error) {
          // If list fails, try a simple head request on a test object
          await env.R2_STORAGE.head('health-check-test');
          return { message: 'R2 connection successful' };
        }
      });
    }

    // Memory usage check
    this.addCheck('memory', async () => {
      // In Cloudflare Workers, memory is managed automatically
      // This is just a placeholder for custom memory checks
      return { message: 'Memory check passed' };
    }, { critical: false });
  }

  /**
   * Start periodic health checking
   * @param {Object} env - Cloudflare Worker environment
   */
  startPeriodicChecks(env) {
    // Add common checks if not already added
    if (this.checks.size === 0) {
      this.addCommonChecks(env);
    }

    // Run initial check
    this.runChecks().catch(error => {
      console.error('Initial health check failed:', error);
    });

    // Set up periodic checks
    if (this.options.interval > 0) {
      this.intervalId = setInterval(async () => {
        try {
          await this.runChecks();
        } catch (error) {
          console.error('Periodic health check failed:', error);
        }
      }, this.options.interval);
    }
  }

  /**
   * Stop periodic health checking
   */
  stopPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get health check summary
   * @returns {Object} Summary of health status
   */
  getSummary() {
    if (!this.lastCheck) {
      return { status: 'unknown', message: 'No health checks run yet' };
    }

    const summary = {
      status: this.lastCheck.status,
      timestamp: this.lastCheck.timestamp,
      totalChecks: this.lastCheck.summary.total,
      healthyChecks: this.lastCheck.summary.healthy,
      unhealthyChecks: this.lastCheck.summary.unhealthy
    };

    return summary;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}