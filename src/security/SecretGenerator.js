import crypto from 'crypto';

/**
 * Secret Generator for Secure Key Management
 * Provides cryptographically secure key generation utilities
 */
export class SecretGenerator {

  /**
   * Generate a cryptographically secure API key
   * @param {number} length - Length of the key in bytes (default: 32)
   * @param {string} prefix - Optional prefix for the key
   * @returns {string} Secure API key
   */
  static generateSecureApiKey(length = 32, prefix = '') {
    const bytes = crypto.randomBytes(length);
    const key = bytes.toString('hex');

    if (prefix) {
      return `${prefix}_${key}`;
    }

    return key;
  }

  /**
   * Generate a cryptographically secure JWT secret
   * @param {number} length - Length of the secret in bytes (default: 64)
   * @returns {string} Secure JWT secret
   */
  static generateSecureJwtSecret(length = 64) {
    const bytes = crypto.randomBytes(length);
    return bytes.toString('hex');
  }

  /**
   * Generate a secure key with specific service prefix
   * @param {string} serviceName - Name of the service
   * @param {string} environment - Environment (prod, staging, dev)
   * @param {number} length - Length of the key in bytes
   * @returns {string} Service-specific secure key
   */
  static generateServiceKey(serviceName, environment = 'prod', length = 32) {
    const prefix = `${serviceName}_${environment}`;
    return this.generateSecureApiKey(length, prefix);
  }

  /**
   * Generate multiple keys at once
   * @param {Array} keySpecs - Array of key specifications
   * @returns {Object} Object with generated keys
   */
  static generateMultipleKeys(keySpecs) {
    const keys = {};

    for (const spec of keySpecs) {
      const { name, type = 'api', length, prefix } = spec;

      if (type === 'jwt') {
        keys[name] = this.generateSecureJwtSecret(length);
      } else {
        keys[name] = this.generateSecureApiKey(length, prefix);
      }
    }

    return keys;
  }

  /**
   * Validate key strength
   * @param {string} key - Key to validate
   * @param {Object} requirements - Strength requirements
   * @returns {Object} Validation result
   */
  static validateKeyStrength(key, requirements = {}) {
    const {
      minLength = 32,
      requireHex = true,
      minEntropy = 3.0
    } = requirements;

    const result = {
      valid: true,
      issues: []
    };

    // Check length
    if (key.length < minLength) {
      result.valid = false;
      result.issues.push(`Key too short: ${key.length} < ${minLength}`);
    }

    // Check if hex format is required
    if (requireHex && !/^[a-f0-9]+$/i.test(key)) {
      result.valid = false;
      result.issues.push('Key must be hexadecimal format');
    }

    // Check entropy
    const entropy = this.calculateEntropy(key);
    if (entropy < minEntropy) {
      result.valid = false;
      result.issues.push(`Low entropy: ${entropy.toFixed(2)} < ${minEntropy}`);
    }

    return result;
  }

  /**
   * Calculate Shannon entropy of a string
   * @param {string} str - String to analyze
   * @returns {number} Entropy value
   */
  static calculateEntropy(str) {
    const charCounts = {};
    for (const char of str) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(charCounts)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Generate a key with timestamp for rotation tracking
   * @param {string} prefix - Key prefix
   * @param {number} length - Key length
   * @returns {Object} Key with metadata
   */
  static generateKeyWithMetadata(prefix = '', length = 32) {
    const key = this.generateSecureApiKey(length, prefix);
    const timestamp = new Date().toISOString();

    return {
      key,
      generatedAt: timestamp,
      length,
      entropy: this.calculateEntropy(key),
      algorithm: 'crypto.randomBytes'
    };
  }
}
