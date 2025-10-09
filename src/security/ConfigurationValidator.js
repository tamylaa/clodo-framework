import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getDirname } from '../utils/dirname-helper.js';
import { INSECURE_PATTERNS } from './patterns/insecure-patterns.js';
import { ENVIRONMENT_REQUIREMENTS, getEnvironmentRequirements } from './patterns/environment-rules.js';

let __dirname;
try {
  __dirname = getDirname(import.meta.url);
} catch {
  // Fallback for CommonJS environment (Jest)
  __dirname = getDirname();
}

/**
 * Configuration Security Validator
 * Prevents deployment of insecure configurations, especially dummy API keys
 */
export class ConfigurationValidator {

  // Known insecure patterns that should never be in production
  static INSECURE_PATTERNS = INSECURE_PATTERNS;

  // Security requirements by environment
  static ENVIRONMENT_REQUIREMENTS = ENVIRONMENT_REQUIREMENTS;

  /**
   * Validate a configuration object for security issues
   * @param {Object} config - Configuration object to validate
   * @param {string} environment - Environment (development, staging, production)
   * @returns {Array} Array of security issues found
   */
  static validate(config, environment = 'production') {
    const issues = [];
    const requirements = getEnvironmentRequirements(environment);

    // Validate API keys
    this.validateApiKeysForConfig(config, environment, issues);

    // Validate URLs
    this.validateUrlsForConfig(config, requirements, issues);

    // Validate secrets
    this.validateSecretsForConfig(config, requirements, issues);

    return issues;
  }

  /**
   * Validate API keys in a config object
   */
  static validateApiKeysForConfig(config, environment, issues) {
    const apiKeyFields = Object.keys(config).filter(key =>
      key.includes('API_KEY') || key.includes('_KEY') || key.includes('TOKEN')
    );

    for (const field of apiKeyFields) {
      const value = config[field];
      if (!value || typeof value !== 'string') continue;

      // Check against known dummy keys
      for (const dummyKey of this.INSECURE_PATTERNS.DUMMY_API_KEYS) {
        if (value.includes(dummyKey) || value === dummyKey) {
          issues.push({
            key: field,
            value: value,
            severity: environment === 'production' ? 'critical' : 'warning',
            message: `Dummy/development API key detected: "${value}"`,
            remediation: 'Generate secure key with: npm run security:generate-key'
          });
        }
      }
    }
  }

  /**
   * Validate URLs in a config object
   */
  static validateUrlsForConfig(config, requirements, issues) {
    const urlFields = Object.keys(config).filter(key =>
      key.includes('URL') || key.includes('ENDPOINT') || key.includes('HOST')
    );

    for (const field of urlFields) {
      const value = config[field];
      if (!value || typeof value !== 'string') continue;

      // Check for HTTP in production
      if (requirements.requireHttps && value.startsWith('http://')) {
        issues.push({
          key: field,
          value: value,
          severity: 'warning',
          message: `${field} uses HTTP instead of HTTPS`,
          remediation: 'Use HTTPS URLs in production environments'
        });
      }

      // Check for localhost in production
      if (!requirements.allowLocalhostUrls && this.isLocalhostUrl(value)) {
        issues.push({
          key: field,
          value: value,
          severity: 'critical',
          message: `${field} contains localhost URL in production`,
          remediation: 'Use proper domain URLs in production'
        });
      }
    }
  }

  /**
   * Validate secrets in a config object
   */
  static validateSecretsForConfig(config, requirements, issues) {
    const secretFields = Object.keys(config).filter(key =>
      key.includes('SECRET') || key.includes('PASSWORD')
    );

    for (const field of secretFields) {
      const value = config[field];
      if (!value || typeof value !== 'string') continue;

      // Check minimum length
      if (value.length < requirements.minSecretLength) {
        issues.push({
          key: field,
          value: '***masked***',
          severity: 'high',
          message: `${field} is too short (${value.length} chars). Minimum: ${requirements.minSecretLength}`,
          remediation: 'Use cryptographically secure random secret'
        });
      }

      // Check for weak patterns
      for (const pattern of this.INSECURE_PATTERNS.WEAK_JWT_PATTERNS) {
        if (pattern.test(value)) {
          issues.push({
            key: field,
            value: '***masked***',
            severity: 'high',
            message: `${field} matches insecure pattern`,
            remediation: 'Use a cryptographically strong random secret'
          });
          break;
        }
      }
    }
  }

  /**
   * Validate customer configuration for security issues
   * @param {string} customer - Customer ID
   * @param {string} environment - Environment (development, staging, production)
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with issues found
   */
  static validateConfiguration(customer, environment, options = {}) {
    // Options parameter reserved for future validation configuration
    // eslint-disable-next-line no-unused-vars
    const _options = options;
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      securityIssues: []
    };

    try {
      // Load customer configuration
      const config = this.loadCustomerConfig(customer, environment);
      const requirements = getEnvironmentRequirements(environment);

      // 1. Validate API keys for dummy/insecure values
      this.validateApiKeys(config, environment, result);

      // 2. Validate JWT secrets
      this.validateJwtSecrets(config, requirements, result);

      // 3. Validate URLs for environment appropriateness
      this.validateUrls(config, requirements, result);

      // 4. Validate secret strength and patterns
      this.validateSecretStrength(config, requirements, result);

      // 5. Check for hardcoded credentials
      this.validateHardcodedCredentials(config, result);

      // 6. Environment-specific validations
      this.validateEnvironmentSpecific(config, environment, requirements, result);

      // Set overall validity
      result.valid = result.errors.length === 0 && result.securityIssues.length === 0;

      // Log results
      this.logValidationResults(customer, environment, result);

      return result;

    } catch (error) {
      result.valid = false;
      result.errors.push(`Failed to validate configuration: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate API keys for dummy/insecure values
   */
  static validateApiKeys(config, environment, result) {
    const apiKeyFields = [
      'CONTENT_SKIMMER_API_KEY',
      'LOGGER_SERVICE_API_KEY',
      'AUTH_SERVICE_API_KEY',
      'X_SERVICE_KEY'
    ];

    for (const field of apiKeyFields) {
      const value = config[field];
      if (!value) continue;

      // Check against known dummy keys
      if (this.INSECURE_PATTERNS.DUMMY_API_KEYS.includes(value)) {
        const severity = environment === 'production' ? 'error' : 'warning';
        const message = `${field} contains dummy/development key: "${value}". This is ${environment === 'production' ? 'CRITICAL' : 'not recommended'} for ${environment} environment.`;

        if (severity === 'error') {
          result.securityIssues.push({
            field,
            issue: 'dummy_api_key',
            value: value,
            message,
            severity: 'critical'
          });
          result.errors.push(message);
        } else {
          result.warnings.push(message);
        }
      }

      // Check for weak patterns
      if (this.isWeakApiKey(value)) {
        result.warnings.push(`${field} appears to be a weak API key. Consider using a stronger, randomly generated key.`);
      }
    }
  }

  /**
   * Validate JWT secrets for strength
   */
  static validateJwtSecrets(config, requirements, result) {
    const jwtFields = ['AUTH_JWT_SECRET'];

    for (const field of jwtFields) {
      const value = config[field];
      if (!value) continue;

      // Check length
      if (value.length < requirements.minSecretLength) {
        result.securityIssues.push({
          field,
          issue: 'short_jwt_secret',
          value: '***masked***',
          message: `${field} is too short (${value.length} chars). Minimum required: ${requirements.minSecretLength} chars.`,
          severity: 'high'
        });
        result.errors.push(`${field} is too short. Minimum length: ${requirements.minSecretLength} characters.`);
      }

      // Check for weak patterns
      for (const pattern of this.INSECURE_PATTERNS.WEAK_JWT_PATTERNS) {
        if (pattern.test(value)) {
          result.securityIssues.push({
            field,
            issue: 'weak_jwt_pattern',
            value: '***masked***',
            message: `${field} matches insecure pattern. Use a cryptographically strong random secret.`,
            severity: 'high'
          });
          result.errors.push(`${field} uses an insecure pattern. Generate a strong random secret.`);
          break;
        }
      }

      // Check entropy (randomness)
      if (requirements.requireStrongJWT && this.hasLowEntropy(value)) {
        result.warnings.push(`${field} appears to have low entropy. Consider using a cryptographically strong random generator.`);
      }
    }
  }

  /**
   * Validate URLs for environment appropriateness
   */
  static validateUrls(config, requirements, result) {
    const urlFields = [
      'FRONTEND_URL',
      'AUTH_SERVICE_URL',
      'DATA_SERVICE_URL',
      'CONTENT_STORE_SERVICE_URL'
    ];

    for (const field of urlFields) {
      const url = config[field];
      if (!url) continue;

      // Check for localhost in non-development environments
      if (!requirements.allowLocalhostUrls && this.isLocalhostUrl(url)) {
        result.securityIssues.push({
          field,
          issue: 'localhost_in_production',
          value: url,
          message: `${field} contains localhost URL in production environment: ${url}`,
          severity: 'critical'
        });
        result.errors.push(`${field} cannot use localhost in production: ${url}`);
      }

      // Check HTTPS requirement
      if (requirements.requireHttps && !url.startsWith('https://') && !url.startsWith('http://localhost')) {
        result.securityIssues.push({
          field,
          issue: 'insecure_http',
          value: url,
          message: `${field} must use HTTPS in production: ${url}`,
          severity: 'high'
        });
        result.errors.push(`${field} must use HTTPS: ${url}`);
      }

      // Check for development/test domains in production
      if (requirements.requireHttps && this.isDevelopmentDomain(url)) {
        result.warnings.push(`${field} appears to use a development/test domain: ${url}`);
      }
    }
  }

  /**
   * Validate secret strength across all fields
   */
  static validateSecretStrength(config, requirements, result) {
    const secretFields = Object.keys(config).filter(key =>
      key.includes('SECRET') ||
      key.includes('KEY') ||
      key.includes('TOKEN') ||
      key.includes('PASSWORD')
    );

    for (const field of secretFields) {
      const value = config[field];
      if (!value || typeof value !== 'string') continue;

      // Skip URL fields and non-secret fields
      if (field.includes('URL') || field.includes('_ID')) continue;

      // Check for weak common values
      for (const weak of this.INSECURE_PATTERNS.WEAK_SECRETS) {
        if (value.toLowerCase().includes(weak)) {
          result.securityIssues.push({
            field,
            issue: 'weak_secret_value',
            value: '***masked***',
            message: `${field} contains weak/common value pattern`,
            severity: 'high'
          });
          result.errors.push(`${field} contains weak secret value`);
          break;
        }
      }
    }
  }

  /**
   * Check for hardcoded credentials that should be in secure storage
   */
  static validateHardcodedCredentials(config, result) {
    // Check for potential database credentials
    const credentialPatterns = [
      { pattern: /database.*password/i, message: 'Database passwords should not be in configuration files' },
      { pattern: /db.*pass/i, message: 'Database passwords should not be in configuration files' },
      { pattern: /mysql.*pass/i, message: 'MySQL passwords should not be in configuration files' },
      { pattern: /postgres.*pass/i, message: 'PostgreSQL passwords should not be in configuration files' }
    ];

    for (const [key] of Object.entries(config)) {
      for (const { pattern, message } of credentialPatterns) {
        if (pattern.test(key)) {
          result.warnings.push(`${key}: ${message}`);
        }
      }
    }
  }

  /**
   * Environment-specific validation rules
   */
  static validateEnvironmentSpecific(config, environment, requirements, result) {
    if (environment === 'production') {
      // Production-specific checks

      // SKIP_WEBHOOK_AUTH should be false in production
      if (config.SKIP_WEBHOOK_AUTH === 'true') {
        result.securityIssues.push({
          field: 'SKIP_WEBHOOK_AUTH',
          issue: 'insecure_production_setting',
          value: 'true',
          message: 'SKIP_WEBHOOK_AUTH must be false in production for security',
          severity: 'critical'
        });
        result.errors.push('SKIP_WEBHOOK_AUTH must be false in production');
      }

      // Check for development indicators in production
      const devIndicators = ['dev', 'test', 'debug', 'localhost'];
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string') {
          for (const indicator of devIndicators) {
            if (value.toLowerCase().includes(indicator) && !key.includes('ALLOWED_FILE_TYPES')) {
              result.warnings.push(`${key} contains development indicator "${indicator}" in production: ${value}`);
            }
          }
        }
      }
    }
  }

  /**
   * Check if API key appears to be weak
   */
  static isWeakApiKey(key) {
    // Very short keys
    if (key.length < 16) return true;

    // Simple patterns
    if (/^[a-zA-Z0-9]{1,20}$/.test(key)) return true;

    // Common weak patterns
    if (/^(key|api|token)-/.test(key)) return true;

    return false;
  }

  /**
   * Check if JWT secret has low entropy
   */
  static hasLowEntropy(secret) {
    // Simple entropy check - count unique characters
    const uniqueChars = new Set(secret).size;
    const ratio = uniqueChars / secret.length;

    // If less than 50% unique characters, consider low entropy
    return ratio < 0.5;
  }

  /**
   * Check if URL is localhost
   */
  static isLocalhostUrl(url) {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }

  /**
   * Check if domain appears to be for development/testing
   */
  static isDevelopmentDomain(url) {
    const devPatterns = [
      /dev\./,
      /test\./,
      /staging\./,
      /\.dev$/,
      /\.test$/,
      /\.local$/
    ];

    return devPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Load customer configuration from file
   */
  static loadCustomerConfig(customer, environment) {
    const configPath = resolve(__dirname, `../config/customers/${customer}/${environment}.env`);
    const configContent = readFileSync(configPath, 'utf-8');

    const config = {};
    const lines = configContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          config[key] = valueParts.join('=');
        }
      }
    }

    return config;
  }

  /**
   * Log validation results
   */
  static logValidationResults(customer, environment, result) {
    console.log(`\n🔒 Security Validation: ${customer}/${environment}`);
    console.log('=' .repeat(50));

    if (result.valid) {
      console.log('✅ PASSED - Configuration is secure');
    } else {
      console.log('❌ FAILED - Security issues found');
    }

    if (result.errors.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Must fix before deployment):');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Should review):');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (result.securityIssues.length > 0) {
      console.log('\n🔍 SECURITY ISSUES:');
      result.securityIssues.forEach(issue => {
        console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
        if (issue.field) console.log(`     Field: ${issue.field}`);
      });
    }
  }
}