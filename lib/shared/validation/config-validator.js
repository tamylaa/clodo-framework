/**
 * Configuration Validator
 *
 * Validates Wrangler and service configurations before deployment
 * to prevent common deployment failures and provide actionable feedback.
 */

import { WranglerCompatibilityDetector } from '../utils/wrangler-compatibility.js';
import fs from 'fs';
import path from 'path';

/**
 * Configuration Validation Result
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether configuration is valid
 * @property {ValidationIssue[]} issues - List of validation issues
 * @property {string[]} warnings - Non-blocking warnings
 * @property {string[]} suggestions - Improvement suggestions
 */

/**
 * Validation Issue
 * @typedef {Object} ValidationIssue
 * @property {string} type - Issue type identifier
 * @property {string} severity - ERROR, WARNING, or INFO
 * @property {string} message - Human-readable message
 * @property {string} fix - Suggested fix
 * @property {string} [file] - File where issue occurs
 * @property {number} [line] - Line number if applicable
 */

/**
 * Configuration Validator
 * Handles pre-deployment configuration validation
 */
export class ConfigurationValidator {
  constructor() {
    this.compatibilityDetector = new WranglerCompatibilityDetector();
  }

  /**
   * Validates a complete service configuration
   * @param {string} servicePath - Path to service directory
   * @param {Object} options - Validation options
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateServiceConfig(servicePath, options = {}) {
    const issues = [];
    const warnings = [];
    const suggestions = [];

    try {
      // Load wrangler.toml
      const wranglerConfig = await this.loadWranglerConfig(servicePath);
      if (!wranglerConfig) {
        issues.push({
          type: 'MISSING_CONFIG',
          severity: 'ERROR',
          message: 'wrangler.toml not found in service directory',
          fix: 'Create wrangler.toml file or run service generation'
        });
        return { isValid: false, issues, warnings, suggestions };
      }

      // Detect Wrangler version
      const wranglerVersion = await this.compatibilityDetector.detectVersion();

      // Validate compatibility settings
      const compatibilityResult = this.compatibilityDetector.validateConfig(wranglerConfig, wranglerVersion);
      issues.push(...compatibilityResult.issues);

      // Validate build configuration
      const buildIssues = this.validateBuildConfig(wranglerConfig);
      issues.push(...buildIssues);

      // Validate service structure
      const structureIssues = await this.validateServiceStructure(servicePath);
      issues.push(...structureIssues);

      // Check for common issues
      const commonIssues = await this.checkCommonIssues(servicePath, wranglerConfig);
      warnings.push(...commonIssues.warnings);
      suggestions.push(...commonIssues.suggestions);

      // Generate improvement suggestions
      if (options.verbose) {
        suggestions.push(...this.generateOptimizationSuggestions(wranglerConfig, wranglerVersion));
      }

      const isValid = issues.filter(issue => issue.severity === 'ERROR').length === 0;

      return {
        isValid,
        issues,
        warnings,
        suggestions
      };

    } catch (error) {
      issues.push({
        type: 'VALIDATION_ERROR',
        severity: 'ERROR',
        message: `Configuration validation failed: ${error.message}`,
        fix: 'Check service directory structure and configuration files'
      });

      return {
        isValid: false,
        issues,
        warnings,
        suggestions
      };
    }
  }

  /**
   * Loads and parses wrangler.toml configuration
   * @param {string} servicePath - Path to service directory
   * @returns {Promise<Object|null>} Parsed configuration or null if not found
   */
  async loadWranglerConfig(servicePath) {
    const configPath = path.join(servicePath, 'wrangler.toml');

    try {
      if (!fs.existsSync(configPath)) {
        return null;
      }

      // For now, return a basic parsed config
      // In a real implementation, you'd use a TOML parser
      const configContent = fs.readFileSync(configPath, 'utf8');

      // Basic TOML parsing (simplified - would use proper TOML parser in production)
      return this.parseTomlConfig(configContent);

    } catch (error) {
      throw new Error(`Failed to load wrangler.toml: ${error.message}`);
    }
  }

  /**
   * Basic TOML config parser (simplified)
   * @param {string} content - TOML content
   * @returns {Object} Parsed configuration
   */
  parseTomlConfig(content) {
    const config = {};

    // Very basic parsing - in production, use a proper TOML library
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse key = value
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex > 0) {
        const key = trimmed.substring(0, equalsIndex).trim();
        const value = trimmed.substring(equalsIndex + 1).trim();

        // Handle different value types
        if (value === 'true') {
          config[key] = true;
        } else if (value === 'false') {
          config[key] = false;
        } else if (value.startsWith('"') && value.endsWith('"')) {
          config[key] = value.slice(1, -1);
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // Basic array parsing
          const arrayContent = value.slice(1, -1);
          config[key] = arrayContent.split(',').map(item => item.trim().replace(/"/g, ''));
        } else {
          config[key] = value;
        }
      }
    }

    return config;
  }

  /**
   * Validates build configuration
   * @param {Object} config - Wrangler configuration
   * @returns {ValidationIssue[]} Build-related issues
   */
  validateBuildConfig(config) {
    const issues = [];

    // Check build command
    if (!config.build?.command) {
      issues.push({
        type: 'MISSING_BUILD_COMMAND',
        severity: 'WARNING',
        message: 'Build command not specified',
        fix: 'Add build.command = "npm run build" to wrangler.toml'
      });
    }

    // Check upload format
    if (config.build?.upload?.format !== 'modules') {
      issues.push({
        type: 'BUILD_FORMAT',
        severity: 'INFO',
        message: 'Consider using modules format for better performance',
        fix: 'Set build.upload.format = "modules"'
      });
    }

    return issues;
  }

  /**
   * Validates service directory structure
   * @param {string} servicePath - Path to service directory
   * @returns {Promise<ValidationIssue[]>} Structure-related issues
   */
  async validateServiceStructure(servicePath) {
    const issues = [];

    // Check for package.json
    const packagePath = path.join(servicePath, 'package.json');
    if (!fs.existsSync(packagePath)) {
      issues.push({
        type: 'MISSING_PACKAGE_JSON',
        severity: 'ERROR',
        message: 'package.json not found',
        fix: 'Create package.json with service dependencies'
      });
    }

    // Check for src directory
    const srcPath = path.join(servicePath, 'src');
    if (!fs.existsSync(srcPath)) {
      issues.push({
        type: 'MISSING_SRC_DIR',
        severity: 'WARNING',
        message: 'src directory not found',
        fix: 'Create src directory with service code'
      });
    }

    return issues;
  }

  /**
   * Checks for common configuration issues
   * @param {string} servicePath - Path to service directory
   * @param {Object} config - Wrangler configuration
   * @returns {Object} Common issues with warnings and suggestions
   */
  async checkCommonIssues(servicePath, config) {
    const warnings = [];
    const suggestions = [];

    // Check for large bundle potential
    if (!config.build?.upload?.external?.include?.includes('node:*')) {
      warnings.push('Consider externalizing Node.js modules to reduce bundle size');
    }

    // Check for missing environment variables
    if (config.vars) {
      const varKeys = Object.keys(config.vars);
      suggestions.push(`Consider moving ${varKeys.length} environment variables to .env file for security`);
    }

    return { warnings, suggestions };
  }

  /**
   * Generates optimization suggestions
   * @param {Object} config - Current configuration
   * @param {string} wranglerVersion - Wrangler version
   * @returns {string[]} Optimization suggestions
   */
  generateOptimizationSuggestions(config, wranglerVersion) {
    const suggestions = [];

    // Performance suggestions
    if (!config.build?.minify) {
      suggestions.push('Enable minification: build.minify = true');
    }

    // Security suggestions
    if (!config.build?.upload?.external) {
      suggestions.push('Externalize dependencies to reduce bundle size and improve cold start performance');
    }

    return suggestions;
  }

  /**
   * Fixes common configuration issues automatically
   * @param {string} servicePath - Path to service directory
   * @param {ValidationResult} validationResult - Validation result
   * @returns {Promise<Object>} Fix result
   */
  async autoFix(servicePath, validationResult) {
    const fixes = [];
    const errors = [];

    try {
      const wranglerVersion = await this.compatibilityDetector.detectVersion();
      const currentConfig = await this.loadWranglerConfig(servicePath);

      if (!currentConfig) {
        errors.push('Cannot auto-fix: wrangler.toml not found');
        return { success: false, fixes, errors };
      }

      // Generate optimal config
      const optimalConfig = this.compatibilityDetector.generateOptimalConfig(wranglerVersion, currentConfig);

      // Apply fixes for auto-fixable issues
      for (const issue of validationResult.issues) {
        if (issue.type === 'COMPATIBILITY_CONFIG' && optimalConfig.nodejs_compat !== undefined) {
          optimalConfig.nodejs_compat = optimalConfig.nodejs_compat;
          fixes.push('Fixed nodejs_compat setting');
        } else if (issue.type === 'COMPATIBILITY_FLAGS') {
          optimalConfig.compatibility_flags = optimalConfig.compatibility_flags;
          fixes.push('Fixed compatibility_flags setting');
        }
      }

      // Save updated config
      await this.saveWranglerConfig(servicePath, optimalConfig);
      fixes.push('Updated wrangler.toml with optimal configuration');

      return { success: true, fixes, errors };

    } catch (error) {
      errors.push(`Auto-fix failed: ${error.message}`);
      return { success: false, fixes, errors };
    }
  }

  /**
   * Saves wrangler configuration to file
   * @param {string} servicePath - Path to service directory
   * @param {Object} config - Configuration to save
   */
  async saveWranglerConfig(servicePath, config) {
    const configPath = path.join(servicePath, 'wrangler.toml');

    // Basic TOML generation (simplified - would use proper TOML library in production)
    let tomlContent = '# Auto-generated by Clodo Framework\n\n';

    // Add main config
    if (config.name) tomlContent += `name = "${config.name}"\n`;
    if (config.main) tomlContent += `main = "${config.main}"\n`;
    if (config.compatibility_flags) {
      tomlContent += `compatibility_flags = ${JSON.stringify(config.compatibility_flags)}\n`;
    }
    if (config.nodejs_compat !== undefined) {
      tomlContent += `nodejs_compat = ${config.nodejs_compat}\n`;
    }

    // Add build config
    if (config.build) {
      tomlContent += '\n[build]\n';
      if (config.build.command) tomlContent += `command = "${config.build.command}"\n`;

      if (config.build.upload) {
        tomlContent += '\n[build.upload]\n';
        if (config.build.upload.format) tomlContent += `format = "${config.build.upload.format}"\n`;

        if (config.build.upload.external) {
          tomlContent += '\n[build.upload.external]\n';
          if (config.build.upload.external.include) {
            tomlContent += `include = ${JSON.stringify(config.build.upload.external.include)}\n`;
          }
        }
      }
    }

    fs.writeFileSync(configPath, tomlContent, 'utf8');
  }
}

// Export singleton instance
export const configValidator = new ConfigurationValidator();