/**
 * Circuit Breaker Implementation
 * Prevents cascading failures in distributed systems
 */

/**
 * Circuit Breaker for resilient service communication
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 60000,
      monitoringPeriod: options.monitoringPeriod || 10000,
      ...options
    };

    // State: 'closed', 'open', 'half-open'
    this.state = 'closed';

    // Failure tracking
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    // Success tracking for half-open state
    this.successCount = 0;
    this.requiredSuccessCount = options.requiredSuccessCount || 3;

    // Service-specific tracking
    this.services = new Map();
  }

  /**
   * Check if an operation can be executed
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if operation can proceed
   */
  canExecute(serviceName) {
    const serviceState = this.getServiceState(serviceName);

    switch (serviceState.state) {
      case 'closed':
        return true;
      case 'open':
        if (Date.now() >= serviceState.nextAttemptTime) {
          // Transition to half-open
          this.setServiceState(serviceName, 'half-open');
          return true;
        }
        return false;
      case 'half-open':
        return true;
      default:
        return false;
    }
  }

  /**
   * Record a successful operation
   * @param {string} serviceName - Name of the service
   */
  recordSuccess(serviceName) {
    const serviceState = this.getServiceState(serviceName);

    switch (serviceState.state) {
      case 'half-open':
        serviceState.successCount++;
        if (serviceState.successCount >= this.requiredSuccessCount) {
          // Transition back to closed
          this.setServiceState(serviceName, 'closed');
        }
        break;
      case 'closed':
        // Reset failure count on success
        serviceState.failureCount = 0;
        serviceState.lastFailureTime = null;
        break;
    }
  }

  /**
   * Record a failed operation
   * @param {string} serviceName - Name of the service
   */
  recordFailure(serviceName) {
    const serviceState = this.getServiceState(serviceName);

    serviceState.failureCount++;
    serviceState.lastFailureTime = Date.now();

    if (serviceState.failureCount >= this.options.failureThreshold) {
      // Transition to open
      this.setServiceState(serviceName, 'open');
    }
  }

  /**
   * Get the current state for a service
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service state information
   */
  getStatus(serviceName) {
    const serviceState = this.getServiceState(serviceName);

    return {
      service: serviceName,
      state: serviceState.state,
      failureCount: serviceState.failureCount,
      lastFailureTime: serviceState.lastFailureTime,
      nextAttemptTime: serviceState.nextAttemptTime,
      successCount: serviceState.successCount,
      canExecute: this.canExecute(serviceName)
    };
  }

  /**
   * Get service state (internal)
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service state
   */
  getServiceState(serviceName) {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        successCount: 0
      });
    }

    return this.services.get(serviceName);
  }

  /**
   * Set service state (internal)
   * @param {string} serviceName - Name of the service
   * @param {string} state - New state
   */
  setServiceState(serviceName, state) {
    const serviceState = this.getServiceState(serviceName);

    serviceState.state = state;

    if (state === 'open') {
      serviceState.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
      serviceState.successCount = 0;
    } else if (state === 'half-open') {
      serviceState.successCount = 0;
    } else if (state === 'closed') {
      serviceState.failureCount = 0;
      serviceState.lastFailureTime = null;
      serviceState.nextAttemptTime = null;
      serviceState.successCount = 0;
    }
  }

  /**
   * Manually reset a service's circuit breaker
   * @param {string} serviceName - Name of the service
   */
  reset(serviceName) {
    this.setServiceState(serviceName, 'closed');
  }

  /**
   * Force a service into open state
   * @param {string} serviceName - Name of the service
   */
  trip(serviceName) {
    this.setServiceState(serviceName, 'open');
  }

  /**
   * Get all service statuses
   * @returns {Object} All service statuses
   */
  getAllStatuses() {
    const statuses = {};

    for (const [serviceName] of this.services) {
      statuses[serviceName] = this.getStatus(serviceName);
    }

    return statuses;
  }

  /**
   * Clean up old service states (optional maintenance)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = this.options.monitoringPeriod * 10; // 10 monitoring periods

    for (const [serviceName, serviceState] of this.services.entries()) {
      if (serviceState.lastFailureTime &&
          (now - serviceState.lastFailureTime) > maxAge &&
          serviceState.state === 'closed') {
        this.services.delete(serviceName);
      }
    }
  }
}