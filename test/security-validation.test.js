/**
 * Security Validation Unit Tests - Critical External Security Methods
 *
 * Tests the security validation methods that prevent insecure configurations
 * from being deployed, focusing on the most critical externally facing security checks.
 */

import { jest } from '@jest/globals';

// Mock fs operations
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
  join: jest.fn()
}));

// Mock the insecure patterns and environment rules
jest.mock('../src/security/patterns/insecure-patterns.js', () => ({
  INSECURE_PATTERNS: {
    apiKeys: ['your-api-key', 'test-key', 'dummy-key'],
    secrets: ['password123', 'admin123', 'secret123'],
    urls: ['http://localhost', 'http://127.0.0.1']
  }
}));

jest.mock('../src/security/patterns/environment-rules.js', () => ({
  ENVIRONMENT_REQUIREMENTS: {
    production: { requireHttps: true, noDummyKeys: true },
    staging: { requireHttps: false, noDummyKeys: true },
    development: { requireHttps: false, noDummyKeys: false }
  },
  getEnvironmentRequirements: jest.fn((env) => {
    const requirements = {
      production: { requireHttps: true, noDummyKeys: true },
      staging: { requireHttps: false, noDummyKeys: true },
      development: { requireHttps: false, noDummyKeys: false }
    };
    return requirements[env] || requirements.development;
  })
}));

// Mock dirname helper
jest.mock('../src/utils/dirname-helper.js', () => ({
  getDirname: jest.fn(() => '/mock/dir')
}));

// Import after mocking
import { ConfigurationValidator } from '../src/security/ConfigurationValidator.js';
import { INSECURE_PATTERNS } from '../src/security/patterns/insecure-patterns.js';
import { getEnvironmentRequirements } from '../src/security/patterns/environment-rules.js';

describe('Security Validation - Critical External Security Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Key Validation', () => {
    test('should detect insecure API keys in production', () => {
      const config = {
        cloudflare: {
          token: 'your-api-key', // insecure pattern
          accountId: 'valid-account-id',
          zoneId: 'valid-zone-id'
        }
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('API key') || issue.includes('insecure'))).toBe(true);
    });

    test('should allow valid API keys', () => {
      const config = {
        cloudflare: {
          token: 'CF_TOKEN_1234567890abcdef', // looks valid
          accountId: 'valid-account-id',
          zoneId: 'valid-zone-id'
        }
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      // Should not have API key related issues
      const apiKeyIssues = issues.filter(issue =>
        issue.includes('API key') || issue.includes('token')
      );
      expect(apiKeyIssues.length).toBe(0);
    });

    test('should be more lenient in development', () => {
      const config = {
        cloudflare: {
          token: 'test-key', // would be flagged in production
          accountId: 'valid-account-id',
          zoneId: 'valid-zone-id'
        }
      };

      const issues = ConfigurationValidator.validate(config, 'development');

      // Should be more lenient in development
      expect(issues.length).toBeLessThan(ConfigurationValidator.validate(config, 'production').length);
    });
  });

  describe('URL Validation', () => {
    test('should require HTTPS in production', () => {
      const config = {
        domains: [{
          name: 'example.com',
          url: 'http://example.com' // not HTTPS
        }]
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('HTTPS') || issue.includes('SSL'))).toBe(true);
    });

    test('should allow HTTP in development', () => {
      const config = {
        domains: [{
          name: 'example.com',
          url: 'http://localhost:3000' // HTTP allowed in dev
        }]
      };

      const issues = ConfigurationValidator.validate(config, 'development');

      // Should not flag HTTP in development
      const urlIssues = issues.filter(issue => issue.includes('HTTP') || issue.includes('HTTPS'));
      expect(urlIssues.length).toBe(0);
    });

    test('should detect localhost URLs in production', () => {
      const config = {
        domains: [{
          name: 'example.com',
          url: 'http://localhost:3000' // localhost in production
        }]
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('localhost') || issue.includes('insecure'))).toBe(true);
    });
  });

  describe('Secret Validation', () => {
    test('should detect common weak passwords', () => {
      const config = {
        database: {
          password: 'password123' // weak password
        }
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('password') || issue.includes('weak'))).toBe(true);
    });

    test('should detect dummy secrets', () => {
      const config = {
        secrets: {
          apiSecret: 'secret123', // dummy secret
          jwtSecret: 'your-jwt-secret'
        }
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('secret') || issue.includes('dummy'))).toBe(true);
    });
  });

  describe('Environment-Specific Validation', () => {
    test('should apply different rules per environment', () => {
      const config = {
        cloudflare: {
          token: 'test-key' // dummy key
        },
        domains: [{
          url: 'http://example.com' // no HTTPS
        }]
      };

      const prodIssues = ConfigurationValidator.validate(config, 'production');
      const devIssues = ConfigurationValidator.validate(config, 'development');

      // Production should have more issues
      expect(prodIssues.length).toBeGreaterThan(devIssues.length);
    });

    test('should validate staging environment rules', () => {
      const config = {
        cloudflare: {
          token: 'test-key' // dummy key not allowed in staging
        },
        domains: [{
          url: 'https://staging.example.com' // HTTPS required
        }]
      };

      const issues = ConfigurationValidator.validate(config, 'staging');

      // Should flag dummy key but allow HTTPS
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('API key') || issue.includes('dummy'))).toBe(true);
    });
  });

  describe('Configuration Structure Validation', () => {
    test('should validate Cloudflare configuration structure', () => {
      const config = {
        cloudflare: {
          // Missing required fields
        }
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      // Should detect missing Cloudflare configuration
      expect(issues.length).toBeGreaterThan(0);
    });

    test('should validate domain configuration structure', () => {
      const config = {
        domains: [{
          // Missing required fields
          name: 'example.com'
          // missing url, ssl, etc.
        }]
      };

      const issues = ConfigurationValidator.validate(config, 'production');

      // Should detect incomplete domain configuration
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('Static Properties', () => {
    test('should expose insecure patterns', () => {
      expect(ConfigurationValidator.INSECURE_PATTERNS).toBeDefined();
      expect(ConfigurationValidator.INSECURE_PATTERNS.apiKeys).toBeDefined();
      expect(ConfigurationValidator.INSECURE_PATTERNS.secrets).toBeDefined();
      expect(ConfigurationValidator.INSECURE_PATTERNS.urls).toBeDefined();
    });

    test('should expose environment requirements', () => {
      expect(ConfigurationValidator.ENVIRONMENT_REQUIREMENTS).toBeDefined();
      expect(ConfigurationValidator.ENVIRONMENT_REQUIREMENTS.production).toBeDefined();
      expect(ConfigurationValidator.ENVIRONMENT_REQUIREMENTS.staging).toBeDefined();
      expect(ConfigurationValidator.ENVIRONMENT_REQUIREMENTS.development).toBeDefined();
    });
  });
});