/**
 * Configuration Loader
 * Consolidates configuration loading from JSON files
 * Reuses existing patterns from codebase while adding standardized interface
 * 
 * Patterns consolidated from:
 * - loadJsonConfig() in clodo-service-old.js
 * - CommandConfigManager in bin/shared/config/command-config-manager.js
 * - DeploymentValidator.loadValidationConfig() in bin/shared/deployment/validator.js
 * 
 * Features:
 * - Load JSON configuration files with validation
 * - Merge config file defaults with CLI options
 * - Support environment variable substitution
 * - Graceful error handling with fallback defaults
 * - Optional per-command validation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export class ConfigLoader {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
    this.json = options.json || false;
  }

  /**
   * Load configuration from JSON file
   * @param {string} filePath - Path to JSON configuration file
   * @param {Array<string>} requiredFields - Optional list of required fields to validate
   * @returns {Object} Parsed configuration object
   * @throws {Error} If file not found, invalid JSON, or missing required fields
   */
  load(filePath, requiredFields = []) {
    try {
      const fullPath = resolve(filePath);

      if (!existsSync(fullPath)) {
        throw new Error(`Configuration file not found: ${fullPath}`);
      }

      const content = readFileSync(fullPath, 'utf8');
      let config;

      try {
        config = JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Invalid JSON in configuration file: ${parseError.message}`);
      }

      // Validate required fields
      if (requiredFields && requiredFields.length > 0) {
        this.validate(config, requiredFields);
      }

      if (this.verbose) {
        console.log(`✅ Loaded configuration from: ${fullPath}`);
      }

      return config;
    } catch (error) {
      if (this.json) {
        console.log(JSON.stringify({ error: error.message, filePath }, null, 2));
      } else if (!this.quiet) {
        console.error(`❌ ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load configuration with fallback to defaults (non-throwing)
   * @param {string} filePath - Path to JSON configuration file
   * @param {Object} defaultConfig - Default configuration to return if load fails
   * @returns {Object} Loaded configuration or defaults
   */
  loadSafe(filePath, defaultConfig = {}) {
    try {
      return this.load(filePath);
    } catch (error) {
      if (this.verbose && !this.quiet) {
        console.log(`ℹ️  Using default configuration (failed to load ${filePath})`);
      }
      return defaultConfig;
    }
  }

  /**
   * Validate configuration against required fields
   * @param {Object} config - Configuration object to validate
   * @param {Array<string>} requiredFields - List of required field names
   * @returns {Object} Validation result { valid, errors }
   */
  validate(config, requiredFields = []) {
    const result = {
      valid: true,
      errors: []
    };

    if (!config || typeof config !== 'object') {
      result.valid = false;
      result.errors.push('Configuration must be an object');
      return result;
    }

    for (const field of requiredFields) {
      if (!config[field]) {
        result.valid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    if (!result.valid) {
      const errorMessage = result.errors.join(', ');
      throw new Error(`Configuration validation failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Merge configuration file defaults with CLI options
   * CLI options take precedence over config file defaults
   * @param {Object} configFile - Configuration loaded from file
   * @param {Object} cliOptions - Options from command line
   * @returns {Object} Merged configuration with CLI options taking precedence
   */
  merge(configFile, cliOptions) {
    if (!configFile || typeof configFile !== 'object') {
      return cliOptions || {};
    }

    if (!cliOptions || typeof cliOptions !== 'object') {
      return configFile || {};
    }

    // Create merged result: start with config file, override with CLI options
    const merged = { ...configFile };

    for (const [key, value] of Object.entries(cliOptions)) {
      // Only override with CLI option if it's explicitly provided (not undefined, null, or empty string)
      if (value !== undefined && value !== null && value !== '') {
        merged[key] = value;
      }
    }

    if (this.verbose && !this.quiet) {
      console.log('📋 Configuration merged: CLI options override file defaults');
    }

    return merged;
  }

  /**
   * Substitute environment variables in configuration values
   * Format: ${ENV_VAR_NAME} in strings will be replaced with environment variable values
   * @param {Object} config - Configuration object with potential env var references
   * @returns {Object} Configuration with substituted values
   */
  substituteEnvironmentVariables(config) {
    const result = { ...config };
    const envVarPattern = /\$\{([^}]+)\}/g;

    const substitute = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          obj[key] = value.replace(envVarPattern, (match, varName) => {
            const envValue = process.env[varName];
            if (envValue) {
              if (this.verbose && !this.quiet) {
                console.log(`🔑 Substituted environment variable: ${varName}`);
              }
              return envValue;
            }
            return match; // Keep original if env var not found
          });
        } else if (typeof value === 'object' && value !== null) {
          substitute(value);
        }
      }
    };

    substitute(result);
    return result;
  }

  /**
   * Get a nested configuration value by dot-notation path
   * @param {Object} config - Configuration object
   * @param {string} path - Dot-notation path (e.g., 'server.port')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value or default
   */
  get(config, path, defaultValue = null) {
    if (!config || typeof config !== 'object') {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Get all configuration as a flat object with dot-notation keys
   * Useful for logging and debugging
   * @param {Object} config - Configuration object to flatten
   * @param {string} prefix - Prefix for keys (used recursively)
   * @returns {Object} Flattened configuration
   */
  getAll(config, prefix = '') {
    const result = {};

    if (!config || typeof config !== 'object') {
      return result;
    }

    for (const [key, value] of Object.entries(config)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.getAll(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }

    return result;
  }

  /**
   * Load multiple configuration files and merge them
   * Files loaded in order, later files override earlier ones
   * @param {Array<string>} filePaths - Array of file paths to load
   * @param {Object} defaultConfig - Default configuration as base
   * @returns {Object} Merged configuration from all files
   */
  loadMultiple(filePaths, defaultConfig = {}) {
    let merged = { ...defaultConfig };

    for (const filePath of filePaths) {
      try {
        const config = this.load(filePath);
        merged = { ...merged, ...config };
      } catch (error) {
        if (this.verbose && !this.quiet) {
          console.log(`⚠️  Failed to load ${filePath}, continuing with existing config`);
        }
      }
    }

    return merged;
  }

  /**
   * Create a copy of configuration with sensitive values redacted
   * Useful for logging without exposing secrets
   * @param {Object} config - Configuration object
   * @param {Array<string>} sensitiveFields - Field names to redact (lowercase)
   * @returns {Object} Configuration with sensitive values redacted as ***
   */
  redactSensitive(config, sensitiveFields = ['token', 'password', 'secret', 'key', 'apikey']) {
    const result = JSON.parse(JSON.stringify(config)); // Deep copy
    const redactLowerFields = sensitiveFields.map(f => f.toLowerCase());

    const redact = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (redactLowerFields.includes(key.toLowerCase())) {
          obj[key] = '***REDACTED***';
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          redact(value);
        }
      }
    };

    redact(result);
    return result;
  }
}
