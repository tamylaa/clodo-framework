/**
 * Clodo Framework - Simple API
 *
 * A simplified, unified API that provides easy access to core framework functionality
 * with sensible defaults and minimal configuration required.
 */

import { ServiceOrchestrator } from './service-management/ServiceOrchestrator.js';
import { MultiDomainOrchestrator } from './orchestration/multi-domain-orchestrator.js';
import { initializeService } from './worker/integration.js';
import { ConfigurationManager } from './lib/shared/config/ConfigurationManager.js';

/**
 * Simple API for Clodo Framework
 * Provides easy-to-use methods with smart defaults
 */
export class Clodo {

  /**
   * Create a new service with minimal configuration
   * @param {Object} options - Service creation options
   * @param {string} options.name - Service name
   * @param {string} options.type - Service type (data-service, auth-service, content-service, api-gateway, generic)
   * @param {string} options.domain - Domain name
   * @param {string} options.environment - Target environment (development, staging, production)
   * @param {string} options.outputPath - Output directory (default: current directory)
   * @returns {Promise<Object>} Service creation result
   */
  static async createService(options = {}) {
    return await ServiceOrchestrator.create(options);
  }

  /**
   * Deploy a service with smart configuration detection
   * @param {Object} options - Deployment options
   * @param {string} options.servicePath - Path to service directory
   * @param {string} options.environment - Target environment
   * @param {string} options.domain - Specific domain to deploy to
   * @param {boolean} options.dryRun - Simulate deployment
   * @returns {Promise<Object>} Deployment result
   */
  static async deploy(options = {}) {
    return await MultiDomainOrchestrator.deploy(options);
  }

  /**
   * Validate a service configuration
   * @param {Object} options - Validation options
   * @param {string} options.servicePath - Path to service directory
   * @param {string} options.exportReport - Path to export validation report
   * @returns {Promise<Object>} Validation result
   */
  static async validate(options = {}) {
    return await ServiceOrchestrator.validate(options.servicePath || '.', options);
  }

  /**
   * Initialize a worker service with auto-configuration
   * @param {Object} env - Cloudflare Worker environment
   * @param {Object} options - Initialization options
   * @returns {Object} Initialized service context
   */
  static initialize(env, options = {}) {
    try {
      // Get domain configs from options or use defaults
      const domainConfigs = options.domainConfigs || {};

      return initializeService(env, domainConfigs);
    } catch (error) {
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Get framework information
   * @returns {Object} Framework info
   */
  static getInfo() {
    return {
      name: 'Clodo Framework',
      version: '3.1.23',
      description: 'Unified service management framework for Cloudflare Workers',
      features: [
        'Service Creation',
        'Multi-Domain Deployment',
        'Configuration Management',
        'Validation & Diagnostics',
        'Worker Integration'
      ]
    };
  }
}

// Convenience functions for direct usage
export const createService = Clodo.createService.bind(Clodo);
export const deploy = Clodo.deploy.bind(Clodo);
export const validate = Clodo.validate.bind(Clodo);
export const initialize = Clodo.initialize.bind(Clodo);
export const getInfo = Clodo.getInfo.bind(Clodo);

// Default export
export default Clodo;