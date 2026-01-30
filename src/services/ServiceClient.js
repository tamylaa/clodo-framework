/**
 * Service Client for Inter-Service Communication
 * Provides circuit breaker, retry logic, and service discovery
 */

import { CircuitBreaker } from '../utils/CircuitBreaker.js';

/**
 * Service Client for inter-service communication
 */
export class ServiceClient {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
      circuitBreakerEnabled: options.circuitBreakerEnabled !== false,
      serviceDiscovery: options.serviceDiscovery || this.defaultServiceDiscovery,
      ...options
    };

    // Initialize circuit breaker if enabled
    if (this.options.circuitBreakerEnabled) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: options.failureThreshold || 5,
        recoveryTimeout: options.recoveryTimeout || 60000,
        monitoringPeriod: options.monitoringPeriod || 10000
      });
    }

    // Service URL cache
    this.serviceCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Make a call to another service
   * @param {string} serviceName - Name of the target service
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Call options
   * @returns {Promise<Object>} Response data
   */
  async call(serviceName, endpoint, options = {}) {
    const callOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
      timeout: options.timeout || this.options.timeout,
      retries: options.retries || this.options.retries,
      ...options
    };

    // Get service URL
    const serviceUrl = await this.getServiceUrl(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const fullUrl = `${serviceUrl}${endpoint}`;

    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.canExecute(serviceName)) {
      throw new Error(`Circuit breaker open for service ${serviceName}`);
    }

    let lastError;

    // Retry logic
    for (let attempt = 0; attempt <= callOptions.retries; attempt++) {
      try {
        const response = await this.makeRequest(fullUrl, callOptions);

        // Record success for circuit breaker
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess(serviceName);
        }

        return response;
      } catch (error) {
        lastError = error;

        // Record failure for circuit breaker
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure(serviceName);
        }

        // Don't retry on the last attempt
        if (attempt === callOptions.retries) {
          break;
        }

        // Wait before retry
        const delay = this.options.retryDelay * Math.pow(2, attempt); // Exponential backoff
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make an HTTP request with timeout
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const fetchOptions = {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: controller.signal
      };

      if (options.body && typeof options.body === 'object') {
        fetchOptions.body = JSON.stringify(options.body);
      } else if (options.body) {
        fetchOptions.body = options.body;
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Get service URL using service discovery
   * @param {string} serviceName - Name of the service
   * @returns {Promise<string|null>} Service URL or null if not found
   */
  async getServiceUrl(serviceName) {
    // Check cache first
    const cached = this.serviceCache.get(serviceName);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.url;
    }

    // Use service discovery
    const url = await this.options.serviceDiscovery(serviceName);

    if (url) {
      this.serviceCache.set(serviceName, {
        url: url,
        timestamp: Date.now()
      });
    }

    return url;
  }

  /**
   * Default service discovery implementation
   * Uses environment variables for service URLs
   * @param {string} serviceName - Name of the service
   * @returns {Promise<string|null>} Service URL
   */
  async defaultServiceDiscovery(serviceName) {
    // Try environment-based discovery
    const envKey = `SERVICE_URL_${serviceName.toUpperCase().replace(/-/g, '_')}`;
    const envUrl = process.env[envKey];

    if (envUrl) {
      return envUrl;
    }

    // Try development localhost patterns
    if (process.env.NODE_ENV === 'development') {
      const localhostUrl = `http://localhost:8787`; // Default Cloudflare Workers dev port
      return localhostUrl;
    }

    // Try production Cloudflare Workers pattern
    const productionUrl = `https://${serviceName}.your-domain.workers.dev`;
    return productionUrl;
  }

  /**
   * Health check for a service
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} True if service is healthy
   */
  async healthCheck(serviceName) {
    try {
      await this.call(serviceName, '/health', {
        timeout: 5000,
        retries: 0
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get circuit breaker status
   * @param {string} serviceName - Name of the service
   * @returns {Object} Circuit breaker status
   */
  getCircuitBreakerStatus(serviceName) {
    if (!this.circuitBreaker) {
      return { enabled: false };
    }

    return this.circuitBreaker.getStatus(serviceName);
  }

  /**
   * Clear service URL cache
   * @param {string} serviceName - Specific service to clear (optional)
   */
  clearCache(serviceName = null) {
    if (serviceName) {
      this.serviceCache.delete(serviceName);
    } else {
      this.serviceCache.clear();
    }
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