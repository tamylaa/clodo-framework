/**
 * Pluggable Business Logic Modules
 * Allows domain-specific logic to be added as optional modules
 */

export class ModuleManager {
  constructor() {
    this.modules = new Map();
    this.hooks = new Map();
    
    // Enterprise configuration
    this.config = {
      defaultTimeout: 5000, // 5 seconds default timeout per hook
      maxConcurrentHooks: 10, // Maximum concurrent hook executions
      enableHookIsolation: true, // Isolate hook execution contexts
      enableMetrics: true, // Track hook performance metrics
      retryFailedHooks: false, // Retry failed hooks (disabled by default)
      maxRetries: 2 // Maximum retry attempts
    };
    
    // Hook execution metrics
    this.metrics = {
      totalExecutions: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      executionTimes: new Map(), // hookName -> array of execution times
      failureReasons: new Map() // hookName -> array of failure reasons
    };
    
    // Active hook executions for timeout management
    this.activeExecutions = new Map();
  }

  /**
   * Register a business logic module
   * @param {string} moduleName - Name of the module
   * @param {Object} module - Module definition
   */
  registerModule(moduleName, module) {
    this.modules.set(moduleName, {
      name: moduleName,
      ...module
    });

    // Register hooks
    if (module.hooks) {
      Object.entries(module.hooks).forEach(([hookName, hookFn]) => {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({
          module: moduleName,
          fn: hookFn
        });
      });
    }

    if (typeof process !== 'undefined' && process.env?.DEBUG) {
      console.log(`✅ Registered module: ${moduleName}`);
    }
  }

  /**
   * Get a registered module
   * @param {string} moduleName - Name of the module
   * @returns {Object} Module definition
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Check if a module is registered
   * @param {string} moduleName - Name of the module
   * @returns {boolean}
   */
  hasModule(moduleName) {
    return this.modules.has(moduleName);
  }

  /**
   * Execute hooks for a specific event with enterprise-grade features
   * @param {string} hookName - Name of the hook
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @param {...any} args - Additional arguments
   * @returns {Promise<Object>} Hook execution results with metadata
   */
  async executeHooks(hookName, context, options = {}, ...args) {
    const executionId = this._generateExecutionId();
    const startTime = Date.now();
    
    const executionOptions = {
      timeout: options.timeout || this.config.defaultTimeout,
      parallel: options.parallel || false,
      stopOnError: options.stopOnError || false,
      retryOnFailure: options.retryOnFailure || this.config.retryFailedHooks,
      maxRetries: options.maxRetries || this.config.maxRetries,
      ...options
    };

    const hooks = this.hooks.get(hookName) || [];
    const results = [];
    let totalErrors = 0;
    let totalTimeouts = 0;

    // Track active execution
    this.activeExecutions.set(executionId, {
      hookName,
      startTime,
      hooks: hooks.length,
      options: executionOptions
    });

    try {
      if (executionOptions.parallel && hooks.length > 1) {
        // Parallel execution with concurrency control
        const results = await this._executeHooksParallel(hooks, hookName, context, executionOptions, args);
        totalErrors = results.filter(r => !r.success).length;
        totalTimeouts = results.filter(r => r.timeout).length;
        return this._buildExecutionResult(executionId, hookName, results, startTime, totalErrors, totalTimeouts);
      } else {
        // Sequential execution
        for (const hook of hooks) {
          const hookResult = await this._executeHookWithRetry(hook, hookName, context, executionOptions, args);
          results.push(hookResult);

          if (!hookResult.success) {
            totalErrors++;
            if (hookResult.timeout) totalTimeouts++;
            
            // Stop on error if configured
            if (executionOptions.stopOnError) {
              console.warn(`Stopping hook execution for '${hookName}' due to error in module '${hook.module}'`);
              break;
            }
          }
        }
      }

      return this._buildExecutionResult(executionId, hookName, results, startTime, totalErrors, totalTimeouts);

    } finally {
      // Clean up active execution tracking
      this.activeExecutions.delete(executionId);
      
      // Update metrics
      this._updateMetrics(hookName, Date.now() - startTime, totalErrors, totalTimeouts);
    }
  }

  /**
   * Execute a single hook with retry logic
   * @param {Object} hook - Hook configuration
   * @param {string} hookName - Hook name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @param {Array} args - Hook arguments
   * @returns {Promise<Object>} Hook result
   * @private
   */
  async _executeHookWithRetry(hook, hookName, context, options, args) {
    let lastError = null;
    let attempts = 0;
    const maxAttempts = options.retryOnFailure ? options.maxRetries + 1 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const result = await this._executeHookWithTimeout(hook, hookName, context, options, args);
        
        // Success - log retry success if this wasn't the first attempt
        if (attempts > 1) {
          console.info(`Hook '${hookName}' in module '${hook.module}' succeeded on attempt ${attempts}`);
        }
        
        return {
          module: hook.module,
          result,
          success: true,
          attempts,
          executionTime: result.executionTime,
          timeout: false
        };
        
      } catch (error) {
        lastError = error;
        
        if (attempts < maxAttempts && options.retryOnFailure) {
          console.warn(`Hook '${hookName}' in module '${hook.module}' failed (attempt ${attempts}/${maxAttempts}): ${error.message}. Retrying...`);
          
          // Wait before retry with exponential backoff
          await this._sleep(Math.min(1000 * Math.pow(2, attempts - 1), 5000));
        }
      }
    }

    // All retry attempts failed
    const isTimeout = lastError.name === 'TimeoutError';
    console.error(`Hook '${hookName}' in module '${hook.module}' failed after ${attempts} attempts:`, lastError.message);
    
    return {
      module: hook.module,
      error: lastError.message,
      success: false,
      attempts,
      timeout: isTimeout,
      errorType: lastError.name || 'UnknownError'
    };
  }

  /**
   * Execute a hook with timeout protection
   * @param {Object} hook - Hook configuration
   * @param {string} hookName - Hook name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @param {Array} args - Hook arguments
   * @returns {Promise<Object>} Hook result with execution time
   * @private
   */
  async _executeHookWithTimeout(hook, hookName, context, options, args) {
    const startTime = Date.now();
    
    // Create isolated context if enabled
    const executionContext = options.enableHookIsolation !== false ? 
      this._createIsolatedContext(context, hook.module) : context;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Hook execution timeout after ${options.timeout}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, options.timeout);
    });

    try {
      const result = await Promise.race([
        hook.fn(executionContext, ...args),
        timeoutPromise
      ]);

      return {
        result,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      // Add execution time to error context
      error.executionTime = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Execute hooks in parallel with concurrency control
   * @param {Array} hooks - Hook configurations
   * @param {string} hookName - Hook name
   * @param {Object} context - Execution context
   * @param {Object} options - Execution options
   * @param {Array} args - Hook arguments
   * @returns {Promise<Array>} Hook results
   * @private
   */
  async _executeHooksParallel(hooks, hookName, context, options, args) {
    const concurrencyLimit = Math.min(hooks.length, this.config.maxConcurrentHooks);
    const results = new Array(hooks.length);
    
    // Create execution promises
    const executeHook = async (hookIndex) => {
      const hook = hooks[hookIndex];
      const result = await this._executeHookWithRetry(hook, hookName, context, options, args);
      results[hookIndex] = result;
      return result;
    };

    // Execute with concurrency control
    const promises = [];
    for (let i = 0; i < hooks.length; i += concurrencyLimit) {
      const batch = [];
      for (let j = i; j < Math.min(i + concurrencyLimit, hooks.length); j++) {
        batch.push(executeHook(j));
      }
      promises.push(...batch);
      
      // Wait for current batch before starting next (if not fully parallel)
      if (i + concurrencyLimit < hooks.length) {
        await Promise.all(batch);
      }
    }

    // Wait for all executions to complete
    await Promise.all(promises);
    
    return results;
  }

  /**
   * Get all registered modules
   * @returns {Map} All modules
   */
  getAllModules() {
    return this.modules;
  }

  /**
   * Get hook execution metrics
   * @param {string} hookName - Optional: specific hook name
   * @returns {Object} Execution metrics
   */
  getMetrics(hookName = null) {
    if (hookName) {
      return {
        executions: this.metrics.executionTimes.get(hookName)?.length || 0,
        averageTime: this._calculateAverageTime(hookName),
        failures: this.metrics.failureReasons.get(hookName)?.length || 0,
        successRate: this._calculateSuccessRate(hookName)
      };
    }

    return {
      totalExecutions: this.metrics.totalExecutions,
      totalFailures: this.metrics.totalFailures,
      totalTimeouts: this.metrics.totalTimeouts,
      overallSuccessRate: this._calculateOverallSuccessRate(),
      hookMetrics: this._getAllHookMetrics()
    };
  }

  /**
   * Clear execution metrics
   * @param {string} hookName - Optional: specific hook to clear
   */
  clearMetrics(hookName = null) {
    if (hookName) {
      this.metrics.executionTimes.delete(hookName);
      this.metrics.failureReasons.delete(hookName);
    } else {
      this.metrics.totalExecutions = 0;
      this.metrics.totalFailures = 0;
      this.metrics.totalTimeouts = 0;
      this.metrics.executionTimes.clear();
      this.metrics.failureReasons.clear();
    }
  }

  /**
   * Update module manager configuration
   * @param {Object} config - New configuration options
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get active hook executions
   * @returns {Array} Active executions
   */
  getActiveExecutions() {
    const now = Date.now();
    return Array.from(this.activeExecutions.entries()).map(([id, execution]) => ({
      id,
      hookName: execution.hookName,
      duration: now - execution.startTime,
      hookCount: execution.hooks,
      options: execution.options
    }));
  }

  // Private helper methods

  /**
   * Generate unique execution ID
   * @returns {string} Execution ID
   * @private
   */
  _generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create isolated execution context
   * @param {Object} originalContext - Original context
   * @param {string} moduleName - Module name
   * @returns {Object} Isolated context
   * @private
   */
  _createIsolatedContext(originalContext, moduleName) {
    return {
      ...originalContext,
      _module: moduleName,
      _isolated: true,
      _timestamp: Date.now()
    };
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build comprehensive execution result
   * @param {string} executionId - Execution ID
   * @param {string} hookName - Hook name
   * @param {Array} results - Individual hook results
   * @param {number} startTime - Execution start time
   * @param {number} totalErrors - Total error count
   * @param {number} totalTimeouts - Total timeout count
   * @returns {Object} Execution result
   * @private
   */
  _buildExecutionResult(executionId, hookName, results, startTime, totalErrors, totalTimeouts) {
    const executionTime = Date.now() - startTime;
    const successfulHooks = results.filter(r => r.success);
    const failedHooks = results.filter(r => !r.success);

    return {
      executionId,
      hookName,
      executionTime,
      totalHooks: results.length,
      successful: successfulHooks.length,
      failed: failedHooks.length,
      timeouts: totalTimeouts,
      successRate: results.length > 0 ? (successfulHooks.length / results.length) * 100 : 0,
      results,
      summary: {
        overallSuccess: totalErrors === 0,
        hasTimeouts: totalTimeouts > 0,
        partialSuccess: successfulHooks.length > 0 && failedHooks.length > 0
      }
    };
  }

  /**
   * Update execution metrics
   * @param {string} hookName - Hook name
   * @param {number} executionTime - Execution time
   * @param {number} errorCount - Error count
   * @param {number} timeoutCount - Timeout count
   * @private
   */
  _updateMetrics(hookName, executionTime, errorCount, timeoutCount) {
    if (!this.config.enableMetrics) return;

    this.metrics.totalExecutions++;
    this.metrics.totalFailures += errorCount;
    this.metrics.totalTimeouts += timeoutCount;

    if (!this.metrics.executionTimes.has(hookName)) {
      this.metrics.executionTimes.set(hookName, []);
    }
    this.metrics.executionTimes.get(hookName).push(executionTime);

    // Keep only last 100 execution times per hook to prevent memory leaks
    const times = this.metrics.executionTimes.get(hookName);
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
  }

  /**
   * Calculate average execution time for a hook
   * @param {string} hookName - Hook name
   * @returns {number} Average time in ms
   * @private
   */
  _calculateAverageTime(hookName) {
    const times = this.metrics.executionTimes.get(hookName) || [];
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  /**
   * Calculate success rate for a hook
   * @param {string} hookName - Hook name
   * @returns {number} Success rate percentage
   * @private
   */
  _calculateSuccessRate(hookName) {
    const executions = this.metrics.executionTimes.get(hookName)?.length || 0;
    const failures = this.metrics.failureReasons.get(hookName)?.length || 0;
    if (executions === 0) return 100;
    return ((executions - failures) / executions) * 100;
  }

  /**
   * Calculate overall success rate
   * @returns {number} Overall success rate percentage
   * @private
   */
  _calculateOverallSuccessRate() {
    if (this.metrics.totalExecutions === 0) return 100;
    return ((this.metrics.totalExecutions - this.metrics.totalFailures) / this.metrics.totalExecutions) * 100;
  }

  /**
   * Get metrics for all hooks
   * @returns {Object} All hook metrics
   * @private
   */
  _getAllHookMetrics() {
    const metrics = {};
    for (const hookName of this.metrics.executionTimes.keys()) {
      metrics[hookName] = this.getMetrics(hookName);
    }
    return metrics;
  }
}

// Create singleton instance
export const moduleManager = new ModuleManager();

// Pre-register existing modules for backward compatibility

// Authentication Module
moduleManager.registerModule('auth', {
  name: 'auth',
  description: 'Authentication and user management',

  // Custom methods
  methods: {
    async createMagicLink(dataService, email, userId, expiresMinutes = 15) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresMinutes);

      return await dataService.create({
        token: crypto.randomUUID(),
        user_id: userId,
        email,
        expires_at: expiresAt.toISOString()
      });
    },

    async verifyMagicLink(dataService, token) {
      const magicLink = await dataService.findById(token);
      if (!magicLink) {
        throw new Error('Magic link not found');
      }

      if (new Date() > new Date(magicLink.expires_at)) {
        throw new Error('Magic link expired');
      }

      if (magicLink.used) {
        throw new Error('Magic link already used');
      }

      // Mark as used
      await dataService.update(token, { used: 1 });

      return magicLink;
    },

    async createAuthToken(dataService, userId, type = 'access', expiresHours = 24) {
      const expiresAt = expiresHours ? new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString() : null;

      return await dataService.create({
        token: crypto.randomUUID(),
        user_id: userId,
        type,
        expires_at: expiresAt
      });
    },

    async validateToken(dataService, token, type = null) {
      const tokenRecord = await dataService.find({ token })[0];
      if (!tokenRecord) {
        return null;
      }

      if (type && tokenRecord.type !== type) {
        return null;
      }

      if (tokenRecord.expires_at && new Date() > new Date(tokenRecord.expires_at)) {
        return null;
      }

      return tokenRecord;
    }
  },

  // Hooks
  hooks: {
    'user.created': async (context, userData) => {
      console.log(`Auth module: User created: ${userData.email}`);
      // Could send welcome email, create default settings, etc.
    },

    'user.deleted': async (context, userId) => {
      console.log(`Auth module: User deleted: ${userId}`);
      // Could clean up related data, revoke sessions, etc.
    }
  }
});

// File Management Module
moduleManager.registerModule('files', {
  name: 'files',
  description: 'File upload and management',

  methods: {
    async createFileRecord(dataService, fileData) {
      return await dataService.create({
        ...fileData,
        status: fileData.status || 'uploaded'
      });
    },

    async updateFileStatus(dataService, fileId, status) {
      return await dataService.update(fileId, {
        status,
        updated_at: new Date().toISOString()
      });
    },

    async getUserFiles(dataService, userId, status = null) {
      const criteria = { user_id: userId };
      if (status) {
        criteria.status = status;
      }
      return await dataService.find(criteria);
    },

    async getFileStats(dataService, userId) {
      const allFiles = await dataService.find({ user_id: userId });
      const stats = {
        total: allFiles.length,
        byStatus: {},
        totalSize: 0
      };

      allFiles.forEach(file => {
        stats.byStatus[file.status] = (stats.byStatus[file.status] || 0) + 1;
        stats.totalSize += file.size || 0;
      });

      return stats;
    }
  },

  hooks: {
    'file.uploaded': async (context, fileData) => {
      console.log(`Files module: File uploaded: ${fileData.filename}`);
      // Could trigger processing, virus scanning, etc.
    },

    'file.deleted': async (context, fileId) => {
      console.log(`Files module: File deleted: ${fileId}`);
      // Could clean up physical files, update storage quotas, etc.
    }
  }
});

// Logging Module
moduleManager.registerModule('logging', {
  name: 'logging',
  description: 'Centralized logging and audit trails',

  methods: {
    async logActivity(dataService, level, message, userId = null, metadata = {}) {
      return await dataService.create({
        level: level.toUpperCase(),
        message,
        user_id: userId,
        metadata: JSON.stringify(metadata)
      });
    },

    async getUserActivity(dataService, userId, limit = 50) {
      return await dataService.find(
        { user_id: userId },
        { limit, orderBy: 'timestamp DESC' }
      );
    },

    async getRecentLogs(dataService, level = null, limit = 100) {
      const criteria = {};
      if (level) {
        criteria.level = level.toUpperCase();
      }
      return await dataService.find(criteria, { limit, orderBy: 'timestamp DESC' });
    }
  },

  hooks: {
    'system.cleanup': async (context, cleanupData) => {
      await context.loggingService.logActivity(
        'INFO',
        `Data cleanup performed: ${cleanupData.operation}`,
        null,
        cleanupData
      );
    }
  }
});

// Module Manager initialized with 3 default modules (auth, files, logging)
// Set DEBUG=true to see registration logs
