/**
 * Configuration Validator
 *
 * Validates service configurations before deployment to catch issues early
 * and provide actionable error messages.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { WranglerCompatibilityDetector } from './wrangler-compatibility.js';

export class ConfigurationValidator {
  /**
   * Validate a service configuration
   * @param {string} servicePath - Path to the service directory
   * @returns {Promise<ValidationResult>} Validation result
   */
  static async validateServiceConfig(servicePath) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Check if wrangler.toml exists
      const wranglerPath = join(servicePath, 'wrangler.toml');
      if (!existsSync(wranglerPath)) {
        result.isValid = false;
        result.errors.push('Missing wrangler.toml file');
        result.suggestions.push('Run: npx clodo-service create --service-name <name>');
        return result;
      }

      // Load and parse wrangler.toml
      const wranglerConfig = ConfigurationValidator.parseWranglerToml(wranglerPath);
      if (!wranglerConfig) {
        result.isValid = false;
        result.errors.push('Invalid wrangler.toml format');
        return result;
      }

      // Validate required fields
      ConfigurationValidator.validateRequiredFields(wranglerConfig, result);

      // Validate compatibility configuration
      await ConfigurationValidator.validateCompatibilityConfig(wranglerConfig, result);

      // Validate build configuration
      ConfigurationValidator.validateBuildConfig(wranglerConfig, result);

      // Check for common issues
      ConfigurationValidator.checkCommonIssues(servicePath, wranglerConfig, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Configuration validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Parse wrangler.toml file
   * @param {string} filePath - Path to wrangler.toml
   * @returns {Object|null} Parsed configuration or null if invalid
   */
  static parseWranglerToml(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      // Simple TOML-like parsing (basic implementation)
      const config = {};

      const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));

      let currentSection = null;
      for (const line of lines) {
        if (line.startsWith('[') && line.endsWith(']')) {
          currentSection = line.slice(1, -1);
          config[currentSection] = {};
        } else if (line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();

          if (currentSection) {
            config[currentSection][key.trim()] = this.parseValue(value);
          } else {
            config[key.trim()] = this.parseValue(value);
          }
        }
      }

      return config;
    } catch (error) {
      console.warn(`Failed to parse wrangler.toml: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse TOML value
   * @param {string} value - Raw value string
   * @returns {any} Parsed value
   */
  static parseValue(value) {
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Parse booleans
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Parse arrays (basic)
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * Validate required fields
   * @param {Object} config - Wrangler configuration
   * @param {ValidationResult} result - Validation result to update
   */
  static validateRequiredFields(config, result) {
    const required = ['name', 'main', 'compatibility_date', 'account_id'];

    for (const field of required) {
      if (!config[field]) {
        result.isValid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check for D1 databases
    if (config['d1_databases'] || config['[[d1_databases]]']) {
      if (!config['d1_databases']?.binding || !config['[[d1_databases]]']?.binding) {
        result.warnings.push('D1 database configured but binding not specified');
      }
    }
  }

  /**
   * Validate compatibility configuration
   * @param {Object} config - Wrangler configuration
   * @param {ValidationResult} result - Validation result to update
   */
  static async validateCompatibilityConfig(config, result) {
    try {
      const detector = new WranglerCompatibilityDetector();
      const wranglerVersion = await Promise.race([
        detector.detectVersion(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);

      const optimalConfig = detector.getOptimalConfig(wranglerVersion);

      // Check if current config matches optimal
      if (optimalConfig.nodejs_compat !== undefined) {
        if (config.nodejs_compat !== optimalConfig.nodejs_compat) {
          result.warnings.push(`nodejs_compat should be ${optimalConfig.nodejs_compat} for Wrangler ${wranglerVersion}`);
          result.suggestions.push('Consider updating compatibility configuration');
        }
      } else if (optimalConfig.compatibility_flags) {
        const currentFlags = config.compatibility_flags;
        if (!currentFlags || !Array.isArray(currentFlags) ||
            !ConfigurationValidator.arraysEqual(currentFlags, optimalConfig.compatibility_flags)) {
          result.warnings.push(`compatibility_flags should be ${JSON.stringify(optimalConfig.compatibility_flags)} for Wrangler ${wranglerVersion}`);
          result.suggestions.push('Consider updating compatibility configuration');
        }
      }
    } catch (error) {
      result.warnings.push(`Could not validate compatibility configuration: ${error.message}`);
    }
  }

  /**
   * Validate build configuration
   * @param {Object} config - Wrangler configuration
   * @param {ValidationResult} result - Validation result to update
   */
  static validateBuildConfig(config, result) {
    const build = config.build || {};

    // Check for build command
    if (!build.command) {
      result.warnings.push('No build command specified - deployment may fail if code needs compilation');
      result.suggestions.push('Add: [build] command = "npm run build"');
    }

    // Check for upload format
    const upload = build.upload || {};
    if (!upload.format) {
      result.warnings.push('No upload format specified - using default may cause issues');
      result.suggestions.push('Add: [build.upload] format = "modules"');
    }

    // Check for external includes (important for Node.js modules)
    const external = upload.external || {};
    if (!external.include || !external.include.includes('node:*')) {
      result.warnings.push('Node.js modules may not be properly externalized');
      result.suggestions.push('Add: [build.upload.external] include = ["node:*"]');
    }
  }

  /**
   * Check for common configuration issues
   * @param {string} servicePath - Service directory path
   * @param {Object} config - Wrangler configuration
   * @param {ValidationResult} result - Validation result to update
   */
  static checkCommonIssues(servicePath, config, result) {
    // Check if main file exists
    if (config.main) {
      const mainPath = join(servicePath, config.main);
      if (!existsSync(mainPath)) {
        result.isValid = false;
        result.errors.push(`Main file does not exist: ${config.main}`);
        result.suggestions.push('Ensure the main file exists or update the main field in wrangler.toml');
      }
    }

    // Check for environment variables without values
    const vars = config.vars || {};
    for (const [key, value] of Object.entries(vars)) {
      if (value === '' || value === '""') {
        result.warnings.push(`Environment variable ${key} has empty value`);
      }
    }

    // Check for database_id placeholders
    if (config['d1_databases']?.database_id === '') {
      result.warnings.push('D1 database_id is empty - needs to be configured before deployment');
      result.suggestions.push('Run: wrangler d1 create <database-name>');
    }
  }

  /**
   * Check if two arrays are equal
   * @param {Array} a - First array
   * @param {Array} b - Second array
   * @returns {boolean} True if arrays are equal
   */
  static arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
}

/**
 * Validation result interface
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether configuration is valid
 * @property {string[]} errors - Critical errors that prevent deployment
 * @property {string[]} warnings - Non-critical issues that should be addressed
 * @property {string[]} suggestions - Actionable suggestions for improvement
 */