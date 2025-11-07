/**
 * Feature Flag Manager
 * Simple stub for missing features.js
 */

export class FeatureFlagManager {
  constructor() {
    this.features = new Map();
  }

  isEnabled(feature) {
    return this.features.get(feature) || false;
  }

  enable(feature) {
    this.features.set(feature, true);
  }

  disable(feature) {
    this.features.set(feature, false);
  }

  withFeature(feature, enhancedFn, legacyFn = null) {
    if (this.isEnabled(feature)) {
      return enhancedFn();
    } else if (legacyFn) {
      return legacyFn();
    } else {
      // If no legacy function provided, just call enhanced anyway
      return enhancedFn();
    }
  }

  getAllFeatures() {
    const result = {};
    for (const [key, value] of this.features) {
      result[key] = { enabled: value };
    }
    return result;
  }
}

// Default instance
export const featureManager = new FeatureFlagManager();

// Feature constants
export const FEATURES = {
  ENHANCED_SCHEMA: 'enhanced_schema',
  ENHANCED_VALIDATION: 'enhanced_validation',
  ENABLE_COMPREHENSIVE_VALIDATION: 'enhanced_validation',
  ENABLE_SQL_CACHING: 'sql_caching',
  ENABLE_SCHEMA_CACHING: 'schema_caching',
  ENABLE_ADVANCED_QUERIES: 'advanced_queries',
  ENABLE_SECURITY_CONTROLS: 'security_controls',
  ENABLE_QUERY_CACHING: 'query_caching',
  ENABLE_ADVANCED_PAGINATION: 'advanced_pagination',
  ENABLE_CACHE_METRICS: 'cache_metrics',
  ENABLE_DEBUG_LOGGING: 'debug_logging',
  ENABLE_ENHANCED_SCHEMA: 'enhanced_schema',
  ENABLE_HOOK_METRICS: 'hook_metrics',
  ENABLE_HOOK_TIMEOUT: 'hook_timeout',
  ENABLE_ENHANCED_HOOKS: 'enhanced_hooks',
  ENABLE_PARALLEL_EXECUTION: 'parallel_execution'
};
