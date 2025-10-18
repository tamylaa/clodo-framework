/**
 * Error Recovery Module
 * Implements circuit breakers, retries, and graceful degradation
 */

export class ErrorRecoveryManager {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.circuitStates = new Map(); // service -> { failures, lastFailure, state }
    this.retryStates = new Map(); // operation -> retry count
  }

  /**
   * Initialize with framework configuration
   */
  async initialize() {
    // Import framework config for consistent timing and retry settings
    const { frameworkConfig } = await import('../../../dist/utils/framework-config.js');
    const timing = frameworkConfig.getTiming();
    
    this.config = {
      maxRetries: this.options.maxRetries || timing.retryAttempts,
      retryDelay: this.options.retryDelay || timing.retryDelay,
      circuitBreakerThreshold: this.options.circuitBreakerThreshold || timing.circuitBreakerThreshold,
      circuitBreakerTimeout: this.options.circuitBreakerTimeout || timing.circuitBreakerTimeout,
      gracefulDegradation: this.options.gracefulDegradation !== false,
      ...this.options
    };
  }

  /**
   * Execute operation with error recovery
   */
  async executeWithRecovery(operation, options = {}) {
    const config = { ...this.config, ...options };
    const operationId = this.getOperationId(operation);

    // Check circuit breaker
    if (this.isCircuitOpen(operationId)) {
      if (config.gracefulDegradation) {
        return this.executeGracefulFallback(operation, config);
      }
      throw new Error(`Circuit breaker open for operation: ${operationId}`);
    }

    let lastError;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.recordSuccess(operationId);
        return result;
      } catch (error) {
        lastError = error;
        this.recordFailure(operationId, error);

        if (attempt < config.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, config.retryDelay);
          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    if (config.gracefulDegradation) {
      return this.executeGracefulFallback(operation, config);
    }

    throw lastError;
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(operationId) {
    const state = this.circuitStates.get(operationId);
    if (!state) return false;

    if (state.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - state.lastFailure > this.config.circuitBreakerTimeout) {
        state.state = 'half-open';
        state.failures = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record operation success
   */
  recordSuccess(operationId) {
    const state = this.circuitStates.get(operationId);
    if (state) {
      if (state.state === 'half-open') {
        state.state = 'closed';
        state.failures = 0;
      }
    }
  }

  /**
   * Record operation failure
   */
  recordFailure(operationId, error) {
    let state = this.circuitStates.get(operationId);
    if (!state) {
      state = { failures: 0, lastFailure: 0, state: 'closed' };
      this.circuitStates.set(operationId, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.state = 'open';
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt, baseDelay) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Execute graceful fallback
   */
  async executeGracefulFallback(operation, config) {
    console.warn(`Executing graceful fallback for operation`);

    // Try to execute with reduced functionality
    try {
      // For deployment operations, try a simplified version
      if (operation.name && operation.name.includes('deploy')) {
        return { success: false, degraded: true, message: 'Operation executed in degraded mode' };
      }

      // For data operations, return cached or default data
      if (operation.name && operation.name.includes('fetch')) {
        return { data: [], cached: true, degraded: true };
      }

      // Default fallback
      return { success: false, degraded: true, fallback: true };

    } catch (fallbackError) {
      console.error('Graceful fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Get unique operation ID
   */
  getOperationId(operation) {
    if (typeof operation === 'function' && operation.name) {
      return operation.name;
    }
    return `operation_${Date.now()}_${Math.random()}`;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status
   */
  getCircuitStatus(operationId) {
    const state = this.circuitStates.get(operationId);
    if (!state) {
      return { state: 'closed', failures: 0 };
    }
    return {
      state: state.state,
      failures: state.failures,
      lastFailure: state.lastFailure,
      timeSinceLastFailure: Date.now() - state.lastFailure
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(operationId) {
    this.circuitStates.delete(operationId);
  }

  /**
   * Get all circuit statuses
   */
  getAllCircuitStatuses() {
    const statuses = {};
    for (const [operationId, state] of this.circuitStates) {
      statuses[operationId] = this.getCircuitStatus(operationId);
    }
    return statuses;
  }
}

/**
 * Retry wrapper for functions
 */
export function withRetry(fn, options = {}) {
  const recovery = new ErrorRecoveryManager(options);
  return (...args) => recovery.executeWithRecovery(() => fn(...args), options);
}

/**
 * Circuit breaker wrapper for functions
 */
export function withCircuitBreaker(fn, options = {}) {
  const recovery = new ErrorRecoveryManager(options);
  return (...args) => recovery.executeWithRecovery(() => fn(...args), options);
}