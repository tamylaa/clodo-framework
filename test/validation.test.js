/**
 * Validation Utilities Test Suite
 *
 * Tests all validation functions used throughout the Clodo Framework
 */

import {
  validateServiceName,
  validateDomainName,
  validateCloudflareToken,
  validateCloudflareId,
  validateServiceType,
  validateEnvironment,
  validateFeatures
} from '../src/utils/validation.js';

describe('Validation Utilities', () => {
  describe('validateServiceName', () => {
    test('should validate correct service names', () => {
      expect(validateServiceName('test-service')).toBe(true);
      expect(validateServiceName('my-service-123')).toBe(true);
      expect(validateServiceName('a')).toBe(false); // too short
      expect(validateServiceName('valid-service-name-with-multiple-hyphens')).toBe(true);
      expect(validateServiceName('service123')).toBe(true);
    });

    test('should reject invalid service names', () => {
      expect(validateServiceName('')).toBe(false);
      expect(validateServiceName(null)).toBe(false);
      expect(validateServiceName(undefined)).toBe(false);
      expect(validateServiceName(123)).toBe(false);
      expect(validateServiceName('ab')).toBe(false); // too short
      expect(validateServiceName('a'.repeat(51))).toBe(false); // too long
      expect(validateServiceName('Test-Service')).toBe(false); // uppercase
      expect(validateServiceName('test_service')).toBe(false); // underscores
      expect(validateServiceName('test.service')).toBe(false); // dots
      expect(validateServiceName('-test-service')).toBe(false); // leading hyphen
      expect(validateServiceName('test-service-')).toBe(false); // trailing hyphen
      expect(validateServiceName('test--service')).toBe(false); // consecutive hyphens
      expect(validateServiceName('test service')).toBe(false); // spaces
    });

    test('should handle edge cases', () => {
      expect(validateServiceName('a1')).toBe(false); // too short
      expect(validateServiceName('a-')).toBe(false); // too short with trailing hyphen
      expect(validateServiceName('-a')).toBe(false); // too short with leading hyphen
      expect(validateServiceName('1test')).toBe(true); // starts with number
      expect(validateServiceName('test1')).toBe(true); // ends with number
    });
  });

  describe('validateDomainName', () => {
    test('should validate correct domain names', () => {
      expect(validateDomainName('example.com')).toBe(true);
      expect(validateDomainName('sub.example.com')).toBe(true);
      expect(validateDomainName('test.example.co.uk')).toBe(true);
      expect(validateDomainName('example.com.')).toBe(true); // trailing dot is removed
      expect(validateDomainName('a.co')).toBe(true); // minimal valid domain
    });

    test('should reject invalid domain names', () => {
      expect(validateDomainName('')).toBe(false);
      expect(validateDomainName(null)).toBe(false);
      expect(validateDomainName(undefined)).toBe(false);
      expect(validateDomainName(123)).toBe(false);
      expect(validateDomainName('invalid domain with spaces')).toBe(false);
      expect(validateDomainName('invalid..domain')).toBe(false); // consecutive dots
      expect(validateDomainName('.invalid.com')).toBe(false); // leading dot
      expect(validateDomainName('invalid.com.')).toBe(true); // trailing dot is removed and becomes valid
      expect(validateDomainName('-invalid.com')).toBe(false); // leading hyphen
      expect(validateDomainName('invalid-.com')).toBe(false); // trailing hyphen
      expect(validateDomainName('a'.repeat(254) + '.com')).toBe(false); // too long
    });

    test('should handle edge cases', () => {
      expect(validateDomainName('localhost')).toBe(true);
      expect(validateDomainName('127.0.0.1')).toBe(true); // IP addresses are technically valid domain format
      expect(validateDomainName('xn--example.com')).toBe(true); // punycode
      expect(validateDomainName('example.com\n')).toBe(false); // newline
    });
  });

  describe('validateCloudflareToken', () => {
    test('should validate correct Cloudflare tokens', () => {
      expect(validateCloudflareToken('abcdefghijklmnopqrstuvwxy')).toBe(true); // 20 chars
      expect(validateCloudflareToken('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-')).toBe(true);
      expect(validateCloudflareToken('a_very_long_token_with_valid_characters_123456789')).toBe(true);
    });

    test('should reject invalid Cloudflare tokens', () => {
      expect(validateCloudflareToken('')).toBe(false);
      expect(validateCloudflareToken(null)).toBe(false);
      expect(validateCloudflareToken(undefined)).toBe(false);
      expect(validateCloudflareToken(123)).toBe(false);
      expect(validateCloudflareToken('short')).toBe(false); // too short
      expect(validateCloudflareToken('invalid token with spaces')).toBe(false); // spaces
      expect(validateCloudflareToken('invalid@token.com')).toBe(false); // special chars
      expect(validateCloudflareToken('invalid.token')).toBe(false); // dots
    });
  });

  describe('validateCloudflareId', () => {
    test('should validate correct Cloudflare IDs', () => {
      expect(validateCloudflareId('1234567890abcdef1234567890abcdef')).toBe(true);
      expect(validateCloudflareId('ABCDEF1234567890ABCDEF1234567890')).toBe(true);
      expect(validateCloudflareId('abcdef1234567890abcdef1234567890')).toBe(true);
    });

    test('should reject invalid Cloudflare IDs', () => {
      expect(validateCloudflareId('')).toBe(false);
      expect(validateCloudflareId(null)).toBe(false);
      expect(validateCloudflareId(undefined)).toBe(false);
      expect(validateCloudflareId(123)).toBe(false);
      expect(validateCloudflareId('1234567890abcdef1234567890abcde')).toBe(false); // 31 chars
      expect(validateCloudflareId('1234567890abcdef1234567890abcdefg')).toBe(false); // 33 chars
      expect(validateCloudflareId('gggggggggggggggggggggggggggggggg')).toBe(false); // 'g' is not valid hex
      expect(validateCloudflareId('ggggggggggggggggggggggggggggggg')).toBe(false); // 31 chars
    });
  });

  describe('validateServiceType', () => {
    test('should validate correct service types', () => {
      expect(validateServiceType('data-service')).toBe(true);
      expect(validateServiceType('auth-service')).toBe(true);
      expect(validateServiceType('content-service')).toBe(true);
      expect(validateServiceType('api-gateway')).toBe(true);
      expect(validateServiceType('generic')).toBe(true);
    });

    test('should reject invalid service types', () => {
      expect(validateServiceType('')).toBe(false);
      expect(validateServiceType(null)).toBe(false);
      expect(validateServiceType(undefined)).toBe(false);
      expect(validateServiceType(123)).toBe(false);
      expect(validateServiceType('invalid-type')).toBe(false);
      expect(validateServiceType('Data-Service')).toBe(false); // case sensitive
      expect(validateServiceType('data_service')).toBe(false); // underscores
    });
  });

  describe('validateEnvironment', () => {
    test('should validate correct environments', () => {
      expect(validateEnvironment('development')).toBe(true);
      expect(validateEnvironment('staging')).toBe(true);
      expect(validateEnvironment('production')).toBe(true);
    });

    test('should reject invalid environments', () => {
      expect(validateEnvironment('')).toBe(false);
      expect(validateEnvironment(null)).toBe(false);
      expect(validateEnvironment(undefined)).toBe(false);
      expect(validateEnvironment(123)).toBe(false);
      expect(validateEnvironment('Development')).toBe(false); // case sensitive
      expect(validateEnvironment('dev')).toBe(false); // abbreviation
      expect(validateEnvironment('prod')).toBe(false); // abbreviation
    });
  });

  describe('validateFeatures', () => {
    const validFeatures = {
      logging: true,
      monitoring: true,
      errorReporting: true,
      customFeature: false
    };

    test('should validate correct feature configurations', () => {
      expect(validateFeatures(validFeatures, 'data-service')).toBe(true);
      expect(validateFeatures({
        logging: false,
        monitoring: true,
        errorReporting: true,
        additionalFeature: true
      }, 'data-service')).toBe(true);
    });

    test('should reject invalid feature configurations', () => {
      expect(validateFeatures(null, 'data-service')).toBe(false);
      expect(validateFeatures(undefined, 'data-service')).toBe(false);
      expect(validateFeatures('not-an-object', 'data-service')).toBe(false);
      expect(validateFeatures(123, 'data-service')).toBe(false);
      expect(validateFeatures({}, 'data-service')).toBe(false); // missing required features
      expect(validateFeatures({
        logging: true,
        monitoring: true
        // missing errorReporting
      }, 'data-service')).toBe(false);
      expect(validateFeatures({
        logging: true,
        // missing monitoring
        errorReporting: true
      }, 'data-service')).toBe(false);
      expect(validateFeatures({
        // missing logging
        monitoring: true,
        errorReporting: true
      }, 'data-service')).toBe(false);
    });
  });
});