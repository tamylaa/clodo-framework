/**
 * Common Feature Constants
 * Worker-safe constants extracted from ConfigurationManager
 * No Node.js dependencies (fs, path, etc.)
 */

export const COMMON_FEATURES = {
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
