/**
 * Unified Validation Registry
 * Centralizes all validation logic
 * Replaces: Fragmented validation across 3+ files
 * Savings: 100+ lines
 */

/**
 * Import validators from utils (source of truth)
 */
import {
  validateServiceName,
  validateDomainName,
  validateCloudflareToken,
  validateCloudflareId,
  validateServiceType,
  validateEnvironment
} from '../../utils/validation.js';

/**
 * Validation Registry - Single source of truth for all validators
 */
export class ValidationRegistry {
  /**
   * Standard validation rules
   */
  static RULES = {
    // Service configuration
    serviceName: {
      validator: validateServiceName,
      message: 'Service name must be 3-50 characters, lowercase with hyphens only'
    },
    
    domainName: {
      validator: validateDomainName,
      message: 'Domain name must be valid (e.g., example.com)'
    },
    
    serviceType: {
      validator: validateServiceType,
      message: 'Service type must be one of: data-service, auth-service, content-service, api-gateway, generic'
    },
    
    environment: {
      validator: validateEnvironment,
      message: 'Environment must be one of: development, staging, production'
    },
    
    // Cloudflare configuration
    cloudflareToken: {
      validator: validateCloudflareToken,
      message: 'Cloudflare API token must be at least 20 characters'
    },
    
    cloudflareAccountId: {
      validator: validateCloudflareId,
      message: 'Cloudflare Account ID must be 32 hexadecimal characters'
    },
    
    cloudflareZoneId: {
      validator: validateCloudflareId,
      message: 'Cloudflare Zone ID must be 32 hexadecimal characters'
    }
  };

  /**
   * Validate a value against a registered rule
   * Returns: { valid: boolean, message: string }
   */
  static validate(ruleName, value) {
    const rule = this.RULES[ruleName];
    
    if (!rule) {
      return {
        valid: false,
        message: `Unknown validation rule: ${ruleName}`
      };
    }
    
    try {
      const isValid = rule.validator(value);
      return {
        valid: isValid,
        message: isValid ? 'Valid' : rule.message
      };
    } catch (error) {
      return {
        valid: false,
        message: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate multiple fields
   * Returns: { valid: boolean, errors: Map<fieldName, message> }
   */
  static validateMultiple(fields) {
    const errors = new Map();
    
    for (const [fieldName, value] of Object.entries(fields)) {
      const result = this.validate(fieldName, value);
      if (!result.valid) {
        errors.set(fieldName, result.message);
      }
    }
    
    return {
      valid: errors.size === 0,
      errors
    };
  }

  /**
   * Register custom validation rule
   * Usage: ValidationRegistry.register('customRule', customValidator, 'Custom error message')
   */
  static register(ruleName, validator, message = 'Invalid value') {
    this.RULES[ruleName] = {
      validator,
      message
    };
  }

  /**
   * Get all registered rules
   */
  static getAllRules() {
    return Object.keys(this.RULES);
  }

  /**
   * Get rule details
   */
  static getRule(ruleName) {
    return this.RULES[ruleName];
  }
}

/**
 * Export for convenience
 */
export const validators = ValidationRegistry;
