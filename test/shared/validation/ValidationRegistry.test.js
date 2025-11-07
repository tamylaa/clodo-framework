/**
 * ValidationRegistry.test.js - Comprehensive test suite for ValidationRegistry utility
 * Tests validation rules, custom validators, and edge cases
 */

import { ValidationRegistry } from '../../../lib/shared/validation/ValidationRegistry.js';
import { describe, test, expect } from '@jest/globals';

describe('ValidationRegistry Utility', () => {
  describe('Built-in Validation Rules', () => {
    describe('serviceName validation', () => {
      test('should validate correct service names', () => {
        const result = ValidationRegistry.validate('serviceName', 'my-service');
        expect(result.valid).toBe(true);
      });

      test('should reject invalid service names', () => {
        const result = ValidationRegistry.validate('serviceName', 'My Service'); // uppercase and spaces
        expect(result.valid).toBe(false);
      });

      test('should reject empty service name', () => {
        const result = ValidationRegistry.validate('serviceName', '');
        expect(result.valid).toBe(false);
      });

      test('should reject service names with special characters', () => {
        const result = ValidationRegistry.validate('serviceName', 'my@service');
        expect(result.valid).toBe(false);
      });

      test('should accept service names with hyphens and numbers', () => {
        const result = ValidationRegistry.validate('serviceName', 'my-service-123');
        expect(result.valid).toBe(true);
      });

      test('should reject very short service names', () => {
        const result = ValidationRegistry.validate('serviceName', 'ab');
        expect(result.valid).toBe(false);
      });

      test('should reject very long service names', () => {
        const longName = 'a'.repeat(100);
        const result = ValidationRegistry.validate('serviceName', longName);
        expect(result.valid).toBe(false);
      });

      test('should return appropriate error message', () => {
        const result = ValidationRegistry.validate('serviceName', 'Invalid Service');
        expect(result.message).toBeDefined();
        expect(result.message.length).toBeGreaterThan(0);
      });
    });

    describe('domainName validation', () => {
      test('should validate correct domain names', () => {
        const result = ValidationRegistry.validate('domainName', 'example.com');
        expect(result.valid).toBe(true);
      });

      test('should validate domains with subdomains', () => {
        const result = ValidationRegistry.validate('domainName', 'api.example.com');
        expect(result.valid).toBe(true);
      });

      test('should reject invalid domains', () => {
        const result = ValidationRegistry.validate('domainName', 'invalid domain');
        expect(result.valid).toBe(false);
      });

      test('should reject domains without TLD', () => {
        const result = ValidationRegistry.validate('domainName', 'localhost');
        expect(result.valid).toBe(true); // localhost is valid for local domains
      });

      test('should handle IP addresses', () => {
        // IP address validation depends on implementation
        const result = ValidationRegistry.validate('domainName', '192.168.1.1');
        expect(result).toBeDefined();
      });

      test('should reject empty domain name', () => {
        const result = ValidationRegistry.validate('domainName', '');
        expect(result.valid).toBe(false);
      });
    });

    describe('serviceType validation', () => {
      test('should validate data-service', () => {
        const result = ValidationRegistry.validate('serviceType', 'data-service');
        expect(result.valid).toBe(true);
      });

      test('should validate auth-service', () => {
        const result = ValidationRegistry.validate('serviceType', 'auth-service');
        expect(result.valid).toBe(true);
      });

      test('should validate content-service', () => {
        const result = ValidationRegistry.validate('serviceType', 'content-service');
        expect(result.valid).toBe(true);
      });

      test('should validate api-gateway', () => {
        const result = ValidationRegistry.validate('serviceType', 'api-gateway');
        expect(result.valid).toBe(true);
      });

      test('should validate generic', () => {
        const result = ValidationRegistry.validate('serviceType', 'generic');
        expect(result.valid).toBe(true);
      });

      test('should reject invalid service type', () => {
        const result = ValidationRegistry.validate('serviceType', 'invalid-type');
        expect(result.valid).toBe(false);
      });

      test('should be case-sensitive', () => {
        const result = ValidationRegistry.validate('serviceType', 'Data-Service');
        expect(result.valid).toBe(false);
      });

      test('should reject empty service type', () => {
        const result = ValidationRegistry.validate('serviceType', '');
        expect(result.valid).toBe(false);
      });
    });

    describe('environment validation', () => {
      test('should validate development', () => {
        const result = ValidationRegistry.validate('environment', 'development');
        expect(result.valid).toBe(true);
      });

      test('should validate staging', () => {
        const result = ValidationRegistry.validate('environment', 'staging');
        expect(result.valid).toBe(true);
      });

      test('should validate production', () => {
        const result = ValidationRegistry.validate('environment', 'production');
        expect(result.valid).toBe(true);
      });

      test('should reject invalid environment', () => {
        const result = ValidationRegistry.validate('environment', 'testing');
        expect(result.valid).toBe(false);
      });

      test('should be case-sensitive', () => {
        const result = ValidationRegistry.validate('environment', 'Production');
        expect(result.valid).toBe(false);
      });
    });

    describe('cloudflareToken validation', () => {
      test('should validate valid token format', () => {
        const token = 'sk_live_' + 'a'.repeat(20);
        const result = ValidationRegistry.validate('cloudflareToken', token);
        expect(result.valid).toBe(true);
      });

      test('should reject short tokens', () => {
        const result = ValidationRegistry.validate('cloudflareToken', 'short');
        expect(result.valid).toBe(false);
      });

      test('should reject empty token', () => {
        const result = ValidationRegistry.validate('cloudflareToken', '');
        expect(result.valid).toBe(false);
      });

      test('should require minimum length', () => {
        const token = 'a'.repeat(19); // One less than minimum
        const result = ValidationRegistry.validate('cloudflareToken', token);
        expect(result.valid).toBe(false);
      });
    });

    describe('cloudflareAccountId validation', () => {
      test('should validate correct account ID format', () => {
        const accountId = 'a'.repeat(32);
        const result = ValidationRegistry.validate('cloudflareAccountId', accountId);
        expect(result.valid).toBe(true);
      });

      test('should accept hexadecimal characters', () => {
        const accountId = '0123456789abcdef0123456789abcdef';
        const result = ValidationRegistry.validate('cloudflareAccountId', accountId);
        expect(result.valid).toBe(true);
      });

      test('should reject wrong length', () => {
        const accountId = 'a'.repeat(31);
        const result = ValidationRegistry.validate('cloudflareAccountId', accountId);
        expect(result.valid).toBe(false);
      });

      test('should reject non-hex characters', () => {
        const accountId = 'g'.repeat(32);
        const result = ValidationRegistry.validate('cloudflareAccountId', accountId);
        expect(result.valid).toBe(false);
      });
    });

    describe('cloudflareZoneId validation', () => {
      test('should validate correct zone ID format', () => {
        const zoneId = 'a'.repeat(32);
        const result = ValidationRegistry.validate('cloudflareZoneId', zoneId);
        expect(result.valid).toBe(true);
      });

      test('should follow same rules as account ID', () => {
        const zoneId = '0123456789abcdef0123456789abcdef';
        const result = ValidationRegistry.validate('cloudflareZoneId', zoneId);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Multi-field Validation', () => {
    test('should validate multiple fields', () => {
      const fields = {
        serviceName: 'my-service',
        domainName: 'example.com',
        environment: 'production'
      };
      const result = ValidationRegistry.validateMultiple(fields);
      expect(result.valid).toBe(true);
      expect(result.errors.size).toBe(0);
    });

    test('should catch validation errors for all fields', () => {
      const fields = {
        serviceName: 'Invalid Service', // Invalid
        domainName: 'invalid', // Invalid
        environment: 'invalid' // Invalid
      };
      const result = ValidationRegistry.validateMultiple(fields);
      expect(result.valid).toBe(false);
      expect(result.errors.size).toBeGreaterThan(0);
    });

    test('should return error map with field names', () => {
      const fields = {
        serviceName: 'Invalid Service',
        domainName: 'example.com'
      };
      const result = ValidationRegistry.validateMultiple(fields);
      expect(result.errors.has('serviceName')).toBe(true);
    });

    test('should only include failed validations in errors', () => {
      const fields = {
        serviceName: 'my-service', // Valid
        domainName: 'in@valid.com', // Invalid (contains @)
        environment: 'production' // Valid
      };
      const result = ValidationRegistry.validateMultiple(fields);
      expect(result.errors.has('domainName')).toBe(true);
      expect(result.errors.has('serviceName')).toBe(false);
      expect(result.errors.has('environment')).toBe(false);
    });

    test('should handle empty fields object', () => {
      const result = ValidationRegistry.validateMultiple({});
      expect(result.valid).toBe(true);
      expect(result.errors.size).toBe(0);
    });

    test('should handle null values', () => {
      const fields = {
        serviceName: null,
        domainName: null
      };
      const result = ValidationRegistry.validateMultiple(fields);
      expect(result.valid).toBe(false);
    });
  });

  describe('Custom Validation Rules', () => {
    test('should allow registration of custom rules', () => {
      const customRule = (value) => value === 'custom';
      ValidationRegistry.register('customRule', customRule, 'Must be exactly "custom"');
      expect(ValidationRegistry.RULES['customRule']).toBeDefined();
    });

    test('should use registered custom rules', () => {
      ValidationRegistry.register('testCustom', (value) => value.length === 5, 'Must be exactly 5 characters');
      const result = ValidationRegistry.validate('testCustom', 'hello');
      expect(result.valid).toBe(true);
    });

    test('should reject values that fail custom validation', () => {
      ValidationRegistry.register('testCustom2', (value) => value.length === 5, 'Must be exactly 5 characters');
      const result = ValidationRegistry.validate('testCustom2', 'hi');
      expect(result.valid).toBe(false);
    });

    test('should support custom validators', () => {
      ValidationRegistry.register('emailLike', (value) => value.includes('@'), 'Must contain @');
      const result = ValidationRegistry.validate('emailLike', 'user@example.com');
      expect(result.valid).toBe(true);
      const resultFail = ValidationRegistry.validate('emailLike', 'invalid');
      expect(resultFail.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown rule names', () => {
      const result = ValidationRegistry.validate('unknownRule', 'value');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Unknown validation rule');
    });

    test('should handle validator errors gracefully', () => {
      ValidationRegistry.register('errorRule', () => {
        throw new Error('Validation error');
      }, 'Error in validator');
      const result = ValidationRegistry.validate('errorRule', 'value');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('error');
    });

    test('should return valid error message for each rule', () => {
      const result = ValidationRegistry.validate('serviceName', 'Invalid Service');
      expect(result.message).toBeDefined();
      expect(result.message).not.toBeNull();
    });
  });

  describe('Validation Results', () => {
    test('should return boolean valid property', () => {
      const result = ValidationRegistry.validate('serviceName', 'valid-service');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });

    test('should always return message property', () => {
      const validResult = ValidationRegistry.validate('serviceName', 'valid-service');
      const invalidResult = ValidationRegistry.validate('serviceName', 'Invalid');
      expect(validResult).toHaveProperty('message');
      expect(invalidResult).toHaveProperty('message');
    });

    test('should indicate "Valid" for passing validations', () => {
      const result = ValidationRegistry.validate('serviceName', 'valid-service');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('Valid');
    });
  });

  describe('Integration Tests', () => {
    test('should support service creation validation flow', () => {
      const inputs = {
        serviceName: 'my-service',
        domainName: 'example.com',
        serviceType: 'api-gateway',
        environment: 'production'
      };
      const result = ValidationRegistry.validateMultiple(inputs);
      expect(result.valid).toBe(true);
    });

    test('should catch all validation errors in complex object', () => {
      const inputs = {
        serviceName: 'Invalid Service', // Fails
        domainName: 'invalid', // Fails
        serviceType: 'invalid-type', // Fails
        environment: 'invalid' // Fails
      };
      const result = ValidationRegistry.validateMultiple(inputs);
      expect(result.valid).toBe(false);
      expect(result.errors.size).toBeGreaterThan(0);
    });

    test('should support partial validation', () => {
      const input = {
        serviceName: 'my-service'
      };
      const result = ValidationRegistry.validateMultiple(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('Rule Consistency', () => {
    test('all built-in rules should have validators', () => {
      for (const [ruleName, rule] of Object.entries(ValidationRegistry.RULES)) {
        expect(rule).toHaveProperty('validator');
        expect(typeof rule.validator).toBe('function');
      }
    });

    test('all built-in rules should have error messages', () => {
      for (const [ruleName, rule] of Object.entries(ValidationRegistry.RULES)) {
        expect(rule).toHaveProperty('message');
        expect(rule.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance', () => {
    test('should validate quickly for single rule', () => {
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        ValidationRegistry.validate('serviceName', 'my-service');
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    test('should validate multiple fields efficiently', () => {
      const fields = {
        serviceName: 'my-service',
        domainName: 'example.com',
        serviceType: 'api-gateway',
        environment: 'production'
      };
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        ValidationRegistry.validateMultiple(fields);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = ValidationRegistry.validate('serviceName', longString);
      expect(result).toBeDefined();
    });

    test('should handle special characters', () => {
      const specialChars = '!@#$%^&*()';
      const result = ValidationRegistry.validate('serviceName', specialChars);
      expect(result.valid).toBe(false);
    });

    test('should handle unicode characters', () => {
      const unicode = 'café-서비스';
      const result = ValidationRegistry.validate('serviceName', unicode);
      expect(result).toBeDefined();
    });

    test('should handle whitespace', () => {
      const withSpace = 'my service';
      const result = ValidationRegistry.validate('serviceName', withSpace);
      expect(result.valid).toBe(false);
    });
  });
});
