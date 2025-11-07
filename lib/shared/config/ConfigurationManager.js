/**
 * Unified Configuration Manager
 * Consolidates feature management, domain configuration, and customer settings
 * Replaces: FeatureManager.js (440 lines), features.js (237 lines), partial domains.js/customers.js logic
 * Savings: 600+ lines of consolidated code
 */

import { logger } from '../logging/Logger.js';

/**
 * Default feature flags for CLODO Framework
 */
const DEFAULT_FEATURES = {
  // Schema Manager Features
  ENABLE_ENHANCED_SCHEMA: true,
  ENABLE_SCHEMA_CACHING: true,
  ENABLE_COMPREHENSIVE_VALIDATION: true,
  ENABLE_SQL_CACHING: true,

  // Generic Data Service Features
  ENABLE_QUERY_CACHING: true,
  ENABLE_SECURITY_CONTROLS: true,
  ENABLE_ADVANCED_PAGINATION: true,
  ENABLE_RELATIONSHIP_LOADING: true,

  // Module Manager Features
  ENABLE_ENHANCED_HOOKS: true,
  ENABLE_HOOK_TIMEOUT: true,
  ENABLE_HOOK_METRICS: true,
  ENABLE_PARALLEL_EXECUTION: true,

  // Performance Features
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_CACHE_METRICS: true,
  ENABLE_QUERY_OPTIMIZATION: true,

  // Development Features
  ENABLE_DEBUG_LOGGING: false,
  ENABLE_DEVELOPMENT_MODE: false,
  ENABLE_STRICT_VALIDATION: false,

  // Migration Features
  ENABLE_LEGACY_COMPATIBILITY: true,
  ENABLE_DEPRECATION_WARNINGS: true,
  ENABLE_MIGRATION_HELPERS: true,

  // Domain-specific features
  AUTHENTICATION: true,
  AUTHORIZATION: true,
  LOGGING: true,
  MONITORING: true,
  CACHING: true,
  RATE_LIMITING: true,
  FILE_STORAGE: true
};

/**
 * Unified Configuration Manager
 * Manages feature flags, domain configuration, and customer settings
 */
export class ConfigurationManager {
  constructor(config = {}) {
    this.features = { ...DEFAULT_FEATURES, ...config.features };
    this.environment = config.environment || this._detectEnvironment();
    this.domains = new Map();
    this.currentDomain = null;
    this.featureListeners = new Map();
    this.globalOverrides = new Map();
    this.context = {
      environment: this.environment,
      version: config.version || '2.0.0',
      timestamp: Date.now()
    };

    this._validateConfiguration();
  }

  /**
   * Deep merge two configuration objects
   * @param {Object} defaults - Default configuration
   * @param {Object} userConfig - User-provided configuration
   * @returns {Object} Merged configuration
   */
  mergeConfigurations(defaults, userConfig) {
    const output = { ...defaults };

    for (const key in userConfig) {
      if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        // Recursively merge objects
        output[key] = this.mergeConfigurations(defaults[key] || {}, userConfig[key]);
      } else {
        // Overwrite arrays and primitives
        output[key] = userConfig[key];
      }
    }

    return output;
  }

  // ============ UTILITY METHODS ============

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Name of the feature flag
   * @param {boolean} defaultValue - Default value if not configured
   * @returns {boolean} Whether the feature is enabled
   */
  isFeatureEnabled(featureName, defaultValue = false) {
    // Check environment-specific override
    const envOverride = this._getEnvironmentOverride(featureName);
    if (envOverride !== null) {
      return envOverride;
    }

    // Check global override
    if (this.globalOverrides.has(featureName)) {
      return this.globalOverrides.get(featureName);
    }

    // Check domain-specific features if domain is set
    if (this.currentDomain?.features?.[featureName] !== undefined) {
      return this.currentDomain.features[featureName];
    }

    // Return default or configured feature flag
    return this.features[featureName] ?? defaultValue;
  }

  /**
   * Enable a feature flag
   * @param {string} featureName - Name of the feature flag
   * @param {Object} options - Enable options
   */
  enableFeature(featureName, options = {}) {
    const previousValue = this.features[featureName];
    this.features[featureName] = true;

    logger.info(`Feature enabled: ${featureName}`, { options });
    this._notifyFeatureListeners(featureName, true, previousValue);

    // Auto-enable dependencies if specified
    if (options.dependencies?.length) {
      options.dependencies.forEach(dep => {
        if (!this.isFeatureEnabled(dep)) {
          this.enableFeature(dep, { reason: `Required by ${featureName}` });
        }
      });
    }
  }

  /**
   * Disable a feature flag
   * @param {string} featureName - Name of the feature flag
   * @param {Object} options - Disable options
   */
  disableFeature(featureName, options = {}) {
    const previousValue = this.features[featureName];
    this.features[featureName] = false;

    logger.info(`Feature disabled: ${featureName}`, { options });
    this._notifyFeatureListeners(featureName, false, previousValue);

    // Auto-disable dependents if specified
    if (options.disableDependents) {
      this._disableDependents(featureName);
    }
  }

  /**
   * Toggle a feature flag
   * @param {string} featureName - Name of the feature flag
   * @returns {boolean} New state of the feature
   */
  toggleFeature(featureName) {
    const currentState = this.isFeatureEnabled(featureName);
    if (currentState) {
      this.disableFeature(featureName);
    } else {
      this.enableFeature(featureName);
    }
    return !currentState;
  }

  /**
   * Set a global feature override
   * @param {string} featureName - Name of the feature
   * @param {boolean} enabled - Whether to enable the feature
   */
  setFeatureOverride(featureName, enabled) {
    this.globalOverrides.set(featureName, enabled);
    logger.info(`Feature override set: ${featureName} = ${enabled}`);
    this._notifyFeatureListeners(featureName, enabled, this.features[featureName]);
  }

  /**
   * Remove a global feature override
   * @param {string} featureName - Name of the feature
   */
  removeFeatureOverride(featureName) {
    if (this.globalOverrides.has(featureName)) {
      this.globalOverrides.delete(featureName);
      logger.info(`Feature override removed: ${featureName}`);
    }
  }

  /**
   * Get all features with their states
   * @returns {Object} All features and their current states
   */
  getAllFeatures() {
    const features = {};
    for (const [name] of Object.entries(DEFAULT_FEATURES)) {
      features[name] = {
        enabled: this.isFeatureEnabled(name),
        default: DEFAULT_FEATURES[name],
        configured: this.features[name],
        overridden: this.isFeatureEnabled(name) !== this.features[name]
      };
    }
    return features;
  }

  /**
   * Get enabled features
   * @returns {string[]} Array of enabled feature names
   */
  getEnabledFeatures() {
    const features = Object.keys(DEFAULT_FEATURES).filter(feature => 
      this.isFeatureEnabled(feature)
    );

    // Include domain-specific features if a domain is set
    if (this.currentDomain?.features) {
      const domainFeatures = Object.keys(this.currentDomain.features).filter(
        feature => this.currentDomain.features[feature]
      );
      features.push(...domainFeatures);
    }

    return [...new Set(features)]; // Remove duplicates and return
  }

  /**
   * Get disabled features
   * @returns {string[]} Array of disabled feature names
   */
  getDisabledFeatures() {
    return Object.keys(DEFAULT_FEATURES).filter(feature => 
      !this.isFeatureEnabled(feature)
    );
  }

  /**
   * Listen for feature flag changes
   * @param {string} featureName - Name of the feature flag
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onFeatureChange(featureName, callback) {
    if (!this.featureListeners.has(featureName)) {
      this.featureListeners.set(featureName, []);
    }
    this.featureListeners.get(featureName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.featureListeners.get(featureName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Safely execute code with feature flag check
   * @param {string} featureName - Name of the feature flag
   * @param {Function} enabledCallback - Function if feature is enabled
   * @param {Function} disabledCallback - Function if feature is disabled
   * @returns {any} Result of executed callback
   */
  withFeature(featureName, enabledCallback, disabledCallback = null) {
    if (this.isFeatureEnabled(featureName)) {
      try {
        return enabledCallback();
      } catch (error) {
        logger.warn(`Feature '${featureName}' execution failed`, { error: error.message });
        if (disabledCallback) return disabledCallback();
        throw error;
      }
    } else {
      if (this.isFeatureEnabled('ENABLE_DEPRECATION_WARNINGS')) {
        logger.warn(`Feature '${featureName}' is disabled`);
      }
      return disabledCallback ? disabledCallback() : null;
    }
  }

  /**
   * Create a feature-gated wrapper function
   * @param {string} featureName - Name of the feature flag
   * @param {Function} enhancedFunction - Enhanced function to use when enabled
   * @param {Function} legacyFunction - Legacy function to use when disabled
   * @returns {Function} Wrapped function
   */
  createFeatureGate(featureName, enhancedFunction, legacyFunction) {
    return (...args) => {
      return this.withFeature(
        featureName,
        () => enhancedFunction(...args),
        legacyFunction ? () => legacyFunction(...args) : null
      );
    };
  }

  // ============ DOMAIN CONFIGURATION ============

  /**
   * Set the current domain context
   * @param {Object} domainConfig - Domain configuration object
   */
  setDomain(domainConfig) {
    if (!domainConfig) {
      throw new Error('Domain configuration is required');
    }

    this.currentDomain = domainConfig;
    this.domains.set(domainConfig.name, domainConfig);
    logger.info(`Domain set: ${domainConfig.name}`);
  }

  /**
   * Get the current domain context
   * @returns {Object} Current domain configuration
   */
  getDomain() {
    return this.currentDomain;
  }

  /**
   * Register a domain configuration
   * @param {string} domainName - Domain identifier
   * @param {Object} domainConfig - Domain configuration
   */
  registerDomain(domainName, domainConfig) {
    this.domains.set(domainName, domainConfig);
    logger.info(`Domain registered: ${domainName}`);
  }

  /**
   * Get a registered domain configuration
   * @param {string} domainName - Domain identifier
   * @returns {Object} Domain configuration
   */
  getDomainConfig(domainName) {
    return this.domains.get(domainName);
  }

  /**
   * Get all registered domains
   * @returns {Map} All registered domains
   */
  getAllDomains() {
    return new Map(this.domains);
  }

  // ============ ENVIRONMENT & VALIDATION ============

  /**
   * Get the current environment
   * @returns {string} Current environment (development, staging, production, etc.)
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Check if running in development mode
   * @returns {boolean} Whether in development environment
   */
  isDevelopment() {
    return this.environment === 'development' || this.isFeatureEnabled('ENABLE_DEVELOPMENT_MODE');
  }

  /**
   * Check if running in production mode
   * @returns {boolean} Whether in production environment
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Check if running in staging mode
   * @returns {boolean} Whether in staging environment
   */
  isStaging() {
    return this.environment === 'staging';
  }

  /**
   * Validate configuration
   * @returns {Array} Array of validation errors
   */
  validateConfiguration() {
    const errors = [];

    // Check for unknown feature flags
    for (const featureName of Object.keys(this.features)) {
      if (!(featureName in DEFAULT_FEATURES)) {
        errors.push(`Unknown feature flag: ${featureName}`);
      }
    }

    // Check for conflicting features
    const conflicts = [
      ['ENABLE_LEGACY_COMPATIBILITY', 'ENABLE_STRICT_VALIDATION'],
      ['ENABLE_DEVELOPMENT_MODE', 'ENABLE_QUERY_OPTIMIZATION']
    ];

    for (const [feature1, feature2] of conflicts) {
      if (this.isFeatureEnabled(feature1) && this.isFeatureEnabled(feature2)) {
        errors.push(`Conflicting features: ${feature1} and ${feature2}`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`Configuration validation found ${errors.length} issues`, { errors });
    }

    return errors;
  }

  // ============ PRIVATE METHODS ============

  /**
   * Detect current environment
   * @private
   */
  _detectEnvironment() {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    if (typeof globalThis !== 'undefined' && globalThis.navigator) {
      return 'browser';
    }
    return 'worker';
  }

  /**
   * Get environment-specific override
   * @private
   */
  _getEnvironmentOverride(featureName) {
    if (typeof process !== 'undefined' && process.env) {
      const envVar = `CLODO_${featureName}`;
      if (process.env[envVar] !== undefined) {
        return process.env[envVar] === 'true';
      }
    }
    return null;
  }

  /**
   * Validate configuration on initialization
   * @private
   */
  _validateConfiguration() {
    const errors = this.validateConfiguration();
    if (errors.length > 0 && this.isFeatureEnabled('ENABLE_STRICT_VALIDATION')) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Notify feature listeners
   * @private
   */
  _notifyFeatureListeners(featureName, newValue, previousValue) {
    const callbacks = this.featureListeners.get(featureName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newValue, previousValue, featureName);
        } catch (error) {
          logger.error(`Feature listener error for '${featureName}'`, { error: error.message });
        }
      });
    }
  }

  /**
   * Disable features that depend on this one
   * @private
   */
  _disableDependents(featureName) {
    const dependents = this._findDependents(featureName);
    dependents.forEach(dependent => {
      if (this.isFeatureEnabled(dependent)) {
        this.disableFeature(dependent, { 
          reason: `Dependency ${featureName} was disabled`,
          cascade: true 
        });
      }
    });
  }

  /**
   * Find features that depend on this one
   * @private
   */
  _findDependents(featureName) {
    const dependencies = {
      'ENABLE_ENHANCED_SCHEMA': ['ENABLE_SCHEMA_CACHING', 'ENABLE_COMPREHENSIVE_VALIDATION'],
      'ENABLE_QUERY_CACHING': ['ENABLE_CACHE_METRICS'],
      'ENABLE_ENHANCED_HOOKS': ['ENABLE_HOOK_TIMEOUT', 'ENABLE_HOOK_METRICS']
    };

    const dependents = [];
    for (const [feature, deps] of Object.entries(dependencies)) {
      if (deps.includes(featureName)) {
        dependents.push(feature);
      }
    }

    return dependents;
  }
}

// Global singleton instance
export const configManager = new ConfigurationManager();

/**
 * Convenience functions for common operations
 */
export const isFeatureEnabled = (featureName, defaultValue = false) =>
  configManager.isFeatureEnabled(featureName, defaultValue);

export const getEnabledFeatures = () =>
  configManager.getEnabledFeatures();

export const withFeature = (featureName, enabledCallback, disabledCallback = null) =>
  configManager.withFeature(featureName, enabledCallback, disabledCallback);

/**
 * Feature flag constants
 */
export const FEATURES = Object.keys(DEFAULT_FEATURES).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

export const COMMON_FEATURES = {
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  LOGGING: 'LOGGING',
  MONITORING: 'MONITORING',
  CACHING: 'CACHING',
  RATE_LIMITING: 'RATE_LIMITING',
  FILE_STORAGE: 'FILE_STORAGE'
};
