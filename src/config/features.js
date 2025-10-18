import { createLogger } from '../utils/index.js';

const logger = createLogger('FeatureFlags');

/**
 * Feature Flag Manager Class
 * Manages feature flags for domain-specific functionality
 */
export class FeatureFlagManager {
  constructor() {
    this.currentDomain = null;
    this.globalOverrides = new Map();
    this.listeners = new Set();
  }

  /**
   * Sets the current domain configuration
   * @param {Object} domainConfig - Domain configuration object
   */
  setDomain(domainConfig) {
    if (!domainConfig) {
      throw new Error('Domain configuration is required');
    }

    this.currentDomain = domainConfig;
    logger.info(`Domain set for feature flags: ${domainConfig.name}`);

    // Notify listeners of domain change
    this._notifyListeners('domainChanged', { domain: domainConfig.name });
  }

  /**
   * Checks if a feature is enabled
   * @param {string} featureName - Name of the feature to check
   * @param {boolean} defaultValue - Default value if feature not configured
   * @returns {boolean} Whether the feature is enabled
   */
  isEnabled(featureName, defaultValue = false) {
    if (!this.currentDomain) {
      logger.warn('No domain set, using default value for feature check');
      return defaultValue;
    }

    // Check global overrides first
    if (this.globalOverrides.has(featureName)) {
      return this.globalOverrides.get(featureName);
    }

    // Check domain-specific features
    const features = this.currentDomain.features || {};
    const enabled = features[featureName] ?? defaultValue;

    logger.debug(`Feature ${featureName}: ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
  }

  /**
   * Gets all enabled features for current domain
   * @returns {string[]} Array of enabled feature names
   */
  getEnabledFeatures() {
    if (!this.currentDomain?.features) {
      return [];
    }

    return Object.entries(this.currentDomain.features)
      .filter(([, enabled]) => enabled === true)
      .map(([feature]) => feature);
  }

  /**
   * Gets all disabled features for current domain
   * @returns {string[]} Array of disabled feature names
   */
  getDisabledFeatures() {
    if (!this.currentDomain?.features) {
      return [];
    }

    return Object.entries(this.currentDomain.features)
      .filter(([, enabled]) => enabled === false)
      .map(([feature]) => feature);
  }

  /**
   * Gets all configured features with their status
   * @returns {Object} Object mapping feature names to enabled status
   */
  getAllFeatures() {
    return this.currentDomain?.features || {};
  }

  /**
   * Sets a global feature override
   * @param {string} featureName - Name of the feature
   * @param {boolean} enabled - Whether to enable the feature
   */
  setGlobalOverride(featureName, enabled) {
    this.globalOverrides.set(featureName, enabled);
    logger.info(`Global override set: ${featureName} = ${enabled}`);

    this._notifyListeners('overrideChanged', { feature: featureName, enabled });
  }

  /**
   * Removes a global feature override
   * @param {string} featureName - Name of the feature
   */
  removeGlobalOverride(featureName) {
    const hadOverride = this.globalOverrides.has(featureName);
    this.globalOverrides.delete(featureName);

    if (hadOverride) {
      logger.info(`Global override removed: ${featureName}`);
      this._notifyListeners('overrideChanged', { feature: featureName, removed: true });
    }
  }

  /**
   * Clears all global overrides
   */
  clearGlobalOverrides() {
    const count = this.globalOverrides.size;
    this.globalOverrides.clear();

    if (count > 0) {
      logger.info(`Cleared ${count} global overrides`);
      this._notifyListeners('overridesCleared', { count });
    }
  }

  /**
   * Adds a listener for feature flag changes
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Removes a listener
   * @param {Function} listener - Callback function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Gets feature flag status with metadata
   * @param {string} featureName - Name of the feature
   * @returns {Object} Feature status information
   */
  getFeatureInfo(featureName) {
    const domainEnabled = this.currentDomain?.features?.[featureName] ?? null;
    const globalOverride = this.globalOverrides.get(featureName);
    const effectiveEnabled = this.isEnabled(featureName);

    return {
      name: featureName,
      domainEnabled,
      globalOverride,
      effectiveEnabled,
      hasOverride: globalOverride !== undefined,
      domain: this.currentDomain?.name
    };
  }

  /**
   * Creates a feature toggle function
   * @param {string} featureName - Name of the feature
   * @param {Function} enabledHandler - Function to call when enabled
   * @param {Function} disabledHandler - Function to call when disabled
   * @returns {Function} Toggle function
   */
  createToggle(featureName, enabledHandler, disabledHandler) {
    return (...args) => {
      if (this.isEnabled(featureName)) {
        return enabledHandler?.(...args);
      } else {
        return disabledHandler?.(...args);
      }
    };
  }

  /**
   * Notifies all listeners of changes
   * @private
   */
  _notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        logger.error(`Error in feature flag listener: ${error.message}`);
      }
    });
  }
}

// Default singleton instance
export const featureManager = new FeatureFlagManager();

// Convenience functions for common operations
export const isFeatureEnabled = (featureName, defaultValue = false) =>
  featureManager.isEnabled(featureName, defaultValue);

export const getEnabledFeatures = () =>
  featureManager.getEnabledFeatures();

export const setFeatureOverride = (featureName, enabled) =>
  featureManager.setGlobalOverride(featureName, enabled);

// Feature flag constants for common features
export const COMMON_FEATURES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  LOGGING: 'logging',
  MONITORING: 'monitoring',
  ANALYTICS: 'analytics',
  CACHING: 'caching',
  RATE_LIMITING: 'rateLimiting',
  FILE_STORAGE: 'fileStorage',
  EMAIL_NOTIFICATIONS: 'emailNotifications',
  PUSH_NOTIFICATIONS: 'pushNotifications',
  SEARCH: 'search',
  FILTERING: 'filtering',
  SORTING: 'sorting',
  PAGINATION: 'pagination',
  EXPORT: 'export',
  IMPORT: 'import',
  BACKUP: 'backup',
  RESTORE: 'restore'
};