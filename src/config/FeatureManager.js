/**
 * Feature Flag System for LEGO Framework
 * Enables gradual migration and progressive enhancement
 */

/**
 * Default feature flags configuration
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
  ENABLE_MIGRATION_HELPERS: true
};

/**
 * Feature flag manager for controlling framework capabilities
 */
export class FeatureManager {
  constructor(config = {}) {
    this.features = { ...DEFAULT_FEATURES, ...config };
    this.listeners = new Map();
    this.context = {
      environment: this._detectEnvironment(),
      version: this._getFrameworkVersion(),
      timestamp: Date.now()
    };

    this._logFeatureState();
  }

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Name of the feature flag
   * @returns {boolean} Whether the feature is enabled
   */
  isEnabled(featureName) {
    // Check for environment-specific overrides
    const envOverride = this._getEnvironmentOverride(featureName);
    if (envOverride !== null) {
      return envOverride;
    }

    // Check for runtime overrides
    const runtimeOverride = this._getRuntimeOverride(featureName);
    if (runtimeOverride !== null) {
      return runtimeOverride;
    }

    // Return default configuration
    return this.features[featureName] ?? false;
  }

  /**
   * Enable a feature flag
   * @param {string} featureName - Name of the feature flag
   * @param {Object} options - Enable options
   */
  enable(featureName, options = {}) {
    const previousValue = this.features[featureName];
    this.features[featureName] = true;

    this._logFeatureChange(featureName, previousValue, true, options);
    this._notifyListeners(featureName, true, previousValue);

    // Auto-enable dependencies if specified
    if (options.dependencies) {
      options.dependencies.forEach(dep => {
        if (!this.isEnabled(dep)) {
          this.enable(dep, { reason: `Required by ${featureName}` });
        }
      });
    }
  }

  /**
   * Disable a feature flag
   * @param {string} featureName - Name of the feature flag
   * @param {Object} options - Disable options
   */
  disable(featureName, options = {}) {
    const previousValue = this.features[featureName];
    this.features[featureName] = false;

    this._logFeatureChange(featureName, previousValue, false, options);
    this._notifyListeners(featureName, false, previousValue);

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
  toggle(featureName) {
    const currentState = this.isEnabled(featureName);
    if (currentState) {
      this.disable(featureName, { reason: 'Toggled off' });
    } else {
      this.enable(featureName, { reason: 'Toggled on' });
    }
    return !currentState;
  }

  /**
   * Get all feature flags and their states
   * @returns {Object} All feature flags with their current states
   */
  getAllFeatures() {
    const features = {};
    for (const [name] of Object.entries(DEFAULT_FEATURES)) {
      features[name] = {
        enabled: this.isEnabled(name),
        default: DEFAULT_FEATURES[name],
        configured: this.features[name],
        overridden: this.isEnabled(name) !== this.features[name]
      };
    }
    return features;
  }

  /**
   * Get features by category
   * @param {string} category - Feature category (e.g., 'SCHEMA', 'DATA_SERVICE')
   * @returns {Object} Features in the specified category
   */
  getFeaturesByCategory(category) {
    const prefix = `ENABLE_${category}`;
    const categoryFeatures = {};
    
    for (const [name, value] of Object.entries(this.features)) {
      if (name.startsWith(prefix)) {
        categoryFeatures[name] = {
          enabled: this.isEnabled(name),
          configured: value
        };
      }
    }
    
    return categoryFeatures;
  }

  /**
   * Listen for feature flag changes
   * @param {string} featureName - Name of the feature flag to listen for
   * @param {Function} callback - Callback function
   */
  onFeatureChange(featureName, callback) {
    if (!this.listeners.has(featureName)) {
      this.listeners.set(featureName, []);
    }
    this.listeners.get(featureName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(featureName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Safely execute code with feature flag check
   * @param {string} featureName - Name of the feature flag
   * @param {Function} enabledCallback - Function to execute if feature is enabled
   * @param {Function} disabledCallback - Function to execute if feature is disabled
   * @returns {any} Result of the executed callback
   */
  withFeature(featureName, enabledCallback, disabledCallback = null) {
    if (this.isEnabled(featureName)) {
      try {
        return enabledCallback();
      } catch (error) {
        console.warn(`Feature '${featureName}' execution failed:`, error);
        if (disabledCallback) {
          return disabledCallback();
        }
        throw error;
      }
    } else {
      if (this.isEnabled('ENABLE_DEPRECATION_WARNINGS')) {
        console.warn(`Feature '${featureName}' is disabled. Consider enabling it for enhanced functionality.`);
      }
      return disabledCallback ? disabledCallback() : null;
    }
  }

  /**
   * Create a feature-gated wrapper function
   * @param {string} featureName - Name of the feature flag
   * @param {Function} enhancedFunction - Enhanced function to use when feature is enabled
   * @param {Function} legacyFunction - Legacy function to use when feature is disabled
   * @returns {Function} Wrapped function that chooses implementation based on feature flag
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

  /**
   * Validate feature flag configuration
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
      if (this.isEnabled(feature1) && this.isEnabled(feature2)) {
        errors.push(`Conflicting features enabled: ${feature1} and ${feature2}`);
      }
    }

    return errors;
  }

  // Private methods

  /**
   * Detect current environment
   * @private
   */
  _detectEnvironment() {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV || 'development';
    }
    if (typeof globalThis !== 'undefined' && globalThis.navigator) {
      return 'browser';
    }
    return 'worker';
  }

  /**
   * Get framework version
   * @private
   */
  _getFrameworkVersion() {
    // Try to get version from package.json if available
    return '2.0.0'; // Placeholder - should be dynamically determined
  }

  /**
   * Get environment-specific override
   * @private
   */
  _getEnvironmentOverride(featureName) {
    if (typeof process !== 'undefined' && process.env) {
      const envVar = `LEGO_${featureName}`;
      if (process.env[envVar] !== undefined) {
        return process.env[envVar] === 'true';
      }
    }
    return null;
  }

  /**
   * Get runtime override
   * @private
   */
  _getRuntimeOverride(featureName) {
    // Check for URL parameters in browser environment
    if (typeof URLSearchParams !== 'undefined' && typeof globalThis !== 'undefined' && globalThis.location) {
      const params = new URLSearchParams(globalThis.location.search);
      const override = params.get(`lego_${featureName.toLowerCase()}`);
      if (override !== null) {
        return override === 'true';
      }
    }
    return null;
  }

  /**
   * Log feature flag state on initialization
   * @private
   */
  _logFeatureState() {
    if (this.isEnabled('ENABLE_DEBUG_LOGGING')) {
      console.log('LEGO Framework Feature Flags:', {
        context: this.context,
        features: this.getAllFeatures()
      });
    }
  }

  /**
   * Log feature flag changes
   * @private
   */
  _logFeatureChange(featureName, previousValue, newValue, options) {
    if (this.isEnabled('ENABLE_DEBUG_LOGGING')) {
      console.log(`Feature flag changed: ${featureName}`, {
        from: previousValue,
        to: newValue,
        options,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Notify listeners of feature flag changes
   * @private
   */
  _notifyListeners(featureName, newValue, previousValue) {
    const callbacks = this.listeners.get(featureName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newValue, previousValue, featureName);
        } catch (error) {
          console.error(`Feature listener error for '${featureName}':`, error);
        }
      });
    }
  }

  /**
   * Disable features that depend on the given feature
   * @private
   */
  _disableDependents(featureName) {
    const dependents = this._findDependents(featureName);
    dependents.forEach(dependent => {
      if (this.isEnabled(dependent)) {
        this.disable(dependent, { 
          reason: `Dependency ${featureName} was disabled`,
          cascade: true 
        });
      }
    });
  }

  /**
   * Find features that depend on the given feature
   * @private
   */
  _findDependents(featureName) {
    // Simple dependency mapping - in a real implementation, this would be more sophisticated
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

// Create global feature manager instance
export const featureManager = new FeatureManager();

/**
 * Convenience function to check if a feature is enabled
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return featureManager.isEnabled(featureName);
}

/**
 * Convenience function to execute code with feature flag check
 * @param {string} featureName - Name of the feature flag
 * @param {Function} enabledCallback - Function to execute if feature is enabled
 * @param {Function} disabledCallback - Function to execute if feature is disabled
 * @returns {any} Result of the executed callback
 */
export function withFeature(featureName, enabledCallback, disabledCallback = null) {
  return featureManager.withFeature(featureName, enabledCallback, disabledCallback);
}

/**
 * Export feature flag constants for easy use
 */
export const FEATURES = Object.keys(DEFAULT_FEATURES).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});