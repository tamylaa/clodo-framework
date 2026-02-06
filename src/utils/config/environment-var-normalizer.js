#!/usr/bin/env node

/**
 * Environment Variable Normalizer
 * Standardizes service environment variable configuration across multiple formats
 * 
 * Supports three legacy formats for backward compatibility:
 * 1. Flat structure (recommended):
 *    service.vars = { API_KEY: "value" }
 * 
 * 2. Nested structure (deprecated):
 *    service.environment = { vars: { API_KEY: "value" }, secrets: [...] }
 * 
 * 3. Per-environment overrides (deprecated):
 *    service.env = { production: { vars: { ... } }, staging: { vars: { ... } } }
 * 
 * @module EnvironmentVarNormalizer
 */

/**
 * EnvironmentVarNormalizer
 * Handles conversion and validation of service environment variable formats
 */
export class EnvironmentVarNormalizer {
  /**
   * Normalize service configuration to standard flat structure
   * Accepts all 3 formats and converts to unified output
   * 
   * @param {Object} service - Service configuration object
   * @param {Object} options - Normalization options
   * @param {boolean} options.warnOnDeprecated - Log deprecation warnings (default: true)
   * @param {boolean} options.throwOnConflict - Throw error if conflicting formats found (default: false)
   * @returns {Object} Normalized service config with flat vars and secrets
   */
  static normalize(service, options = {}) {
    const {
      warnOnDeprecated = true,
      throwOnConflict = false
    } = options;

    const result = {
      ...service,
      vars: {},
      secrets: [],
      _normalizationInfo: {
        formatDetected: null,
        deprecatedFormatsFound: [],
        warnings: []
      }
    };

    // Check which formats are present
    const hasFlat = 'vars' in service;
    const hasNested = 'environment' in service && service.environment?.vars;
    const hasPerEnv = 'env' in service && this.hasPerEnvironmentVars(service.env);

    // Track what we found
    const formatsFound = [];
    if (hasFlat) formatsFound.push('flat');
    if (hasNested) formatsFound.push('nested');
    if (hasPerEnv) formatsFound.push('per-environment');

    // Handle conflicts
    if (formatsFound.length > 1) {
      const warning = `Service '${service.name}' uses multiple var formats: [${formatsFound.join(', ')}]. Using flat format as primary.`;
      result._normalizationInfo.warnings.push(warning);
      
      if (warnOnDeprecated) {
        console.warn(`⚠️  ${warning}`);
      }

      if (throwOnConflict) {
        throw new Error(
          `Configuration conflict: Service '${service.name}' has conflicting var formats. ` +
          `Please use only the flat format: service.vars = {...}`
        );
      }
    }

    // Extract flat format (primary)
    if (hasFlat && service.vars && typeof service.vars === 'object') {
      result.vars = { ...service.vars };
      result._normalizationInfo.formatDetected = 'flat';
    }

    // Extract flat secrets
    if (Array.isArray(service.secrets)) {
      result.secrets = [...service.secrets];
    }

    // Extract nested format (deprecated)
    if (hasNested) {
      result._normalizationInfo.deprecatedFormatsFound.push('nested');

      if (warnOnDeprecated) {
        console.warn(
          `⚠️  DEPRECATION: Service '${service.name}' uses nested format (service.environment.vars). ` +
          `This will be removed in v5.0.0. Use flat format instead: service.vars = {...}`
        );
      }

      const nestedVars = service.environment.vars || {};
      Object.assign(result.vars, nestedVars);

      // Extract secrets from nested format (only if not already set from flat)
      if (Array.isArray(service.environment.secrets) && result.secrets.length === 0) {
        result.secrets = [...service.environment.secrets];
      }

      if (!result._normalizationInfo.formatDetected) {
        result._normalizationInfo.formatDetected = 'nested';
      }
    }

    // Extract per-environment format (deprecated)
    if (hasPerEnv) {
      result._normalizationInfo.deprecatedFormatsFound.push('per-environment');

      if (warnOnDeprecated) {
        console.warn(
          `⚠️  DEPRECATION: Service '${service.name}' uses per-environment format (service.env.{environment}.vars). ` +
          `This will be removed in v5.0.0. Use flat format instead: service.vars = {...} ` +
          `(Clodo will handle environment-specific overrides internally)`
        );
      }

      // Merge all environment vars
      for (const [envName, envConfig] of Object.entries(service.env)) {
        if (envConfig?.vars && typeof envConfig.vars === 'object') {
          Object.assign(result.vars, envConfig.vars);
        }
      }

      if (!result._normalizationInfo.formatDetected) {
        result._normalizationInfo.formatDetected = 'per-environment';
      }
    }

    // Remove deprecated properties from result
    if (hasNested) {
      delete result.environment;
    }
    if (hasPerEnv) {
      // Don't delete env - it might have other valid properties like name
      // Just remove the vars from each environment config
      if (result.env && typeof result.env === 'object') {
        for (const envConfig of Object.values(result.env)) {
          if (envConfig?.vars) {
            delete envConfig.vars;
          }
        }
      }
    }

    return result;
  }

  /**
   * Check if env object contains per-environment var configs
   * @private
   */
  static hasPerEnvironmentVars(env) {
    if (!env || typeof env !== 'object') return false;
    
    for (const envConfig of Object.values(env)) {
      if (envConfig?.vars && typeof envConfig.vars === 'object') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get deprecation timeline for the current version
   * @param {string} currentVersion - Current framework version (e.g., "4.4.1")
   * @returns {Object} Deprecation timeline with dates and versions
   */
  static getDeprecationTimeline(currentVersion = '4.4.1') {
    return {
      current: {
        version: currentVersion,
        status: 'DEPRECATED (but supported)',
        message: 'Nested and per-environment formats are still supported but generate warnings'
      },
      v4_5_0: {
        version: '4.5.0',
        eta: 'Q2 2026 (May 2026)',
        status: 'WARNINGS REQUIRED',
        message: 'All uses of deprecated formats must emit console warnings during deployment'
      },
      v5_0_0: {
        version: '5.0.0',
        eta: 'Q3 2026 (July 2026)',
        status: 'REMOVAL',
        message: 'Nested and per-environment formats will no longer be supported. Only flat format accepted.'
      }
    };
  }

  /**
   * Validate that vars follow naming conventions
   * @param {Object} vars - Variables object
   * @returns {Object} Validation result with issues array
   */
  static validateNamingConventions(vars) {
    const issues = [];

    if (!vars || typeof vars !== 'object') {
      return { valid: true, issues };
    }

    for (const [key, value] of Object.entries(vars)) {
      // Check for hyphens first
      if (key.includes('-')) {
        issues.push({
          key,
          issue: 'Hyphens not allowed in variable names',
          message: `Variable name '${key}' contains hyphens. Use underscores instead: ${key.replace(/-/g, '_')}`,
          severity: 'error'
        });
        continue; // Skip other checks for this key
      }

      // Check for dots
      if (key.includes('.')) {
        issues.push({
          key,
          issue: 'Dots not allowed in variable names',
          message: `Variable name '${key}' contains dots. Use underscores instead: ${key.replace(/\./g, '_')}`,
          severity: 'error'
        });
        continue; // Skip other checks for this key
      }

      // Check for valid identifier format
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
        issues.push({
          key,
          issue: 'Invalid variable name format',
          message: `Variable name '${key}' doesn't follow SCREAMING_SNAKE_CASE convention. ` +
                   `Use uppercase letters, numbers, and underscores only (must start with letter or underscore).`,
          severity: 'warning'
        });
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }
}
