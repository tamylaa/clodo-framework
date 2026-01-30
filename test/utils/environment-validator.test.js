/**
 * EnvironmentValidator Unit Tests
 *
 * Tests the EnvironmentValidator class for environment variable validation
 */

import { jest, describe, test, expect } from '@jest/globals';
import { EnvironmentValidator } from '../../src/utils/EnvironmentValidator.js';

describe('EnvironmentValidator', () => {
  describe('validateRequired', () => {
    test('should pass when all required variables are present', () => {
      const env = {
        API_KEY: 'test-key',
        DATABASE_URL: 'test-url',
        PORT: '3000'
      };

      expect(() => {
        EnvironmentValidator.validateRequired(['API_KEY', 'DATABASE_URL'], env);
      }).not.toThrow();
    });

    test('should throw error when required variables are missing', () => {
      const env = {
        API_KEY: 'test-key'
      };

      expect(() => {
        EnvironmentValidator.validateRequired(['API_KEY', 'DATABASE_URL'], env);
      }).toThrow('Environment validation failed:\nMissing required environment variables: DATABASE_URL');
    });

    test('should throw error when required variables are empty', () => {
      const env = {
        API_KEY: '',
        DATABASE_URL: 'test-url'
      };

      expect(() => {
        EnvironmentValidator.validateRequired(['API_KEY', 'DATABASE_URL'], env);
      }).toThrow('Environment validation failed:\nEmpty required environment variables: API_KEY');
    });

    test('should throw error with multiple missing and empty variables', () => {
      const env = {
        API_KEY: '',
        PORT: undefined
      };

      expect(() => {
        EnvironmentValidator.validateRequired(['API_KEY', 'DATABASE_URL', 'PORT'], env);
      }).toThrow('Environment validation failed:\nMissing required environment variables: DATABASE_URL, PORT\nEmpty required environment variables: API_KEY');
    });

    test('should use process.env by default', () => {
      const originalEnv = process.env;
      process.env.TEST_VAR = 'test-value';

      expect(() => {
        EnvironmentValidator.validateRequired(['TEST_VAR']);
      }).not.toThrow();

      delete process.env.TEST_VAR;
    });
  });

  describe('validateCloudflareVars', () => {
    test('should pass when Cloudflare variables are present', () => {
      const env = {
        CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
        CLOUDFLARE_API_TOKEN: 'test-token'
      };

      expect(() => {
        EnvironmentValidator.validateCloudflareVars(env);
      }).not.toThrow();
    });

    test('should throw error when Cloudflare variables are missing', () => {
      const env = {};

      expect(() => {
        EnvironmentValidator.validateCloudflareVars(env);
      }).toThrow('Environment validation failed:\nMissing required environment variables: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN');
    });
  });

  describe('validateServiceVars', () => {
    test('should pass when service variables are present', () => {
      const env = {
        SERVICE_API_KEY: 'test-key',
        SERVICE_DATABASE_URL: 'test-url'
      };

      expect(() => {
        EnvironmentValidator.validateServiceVars(['SERVICE_API_KEY', 'SERVICE_DATABASE_URL'], env);
      }).not.toThrow();
    });

    test('should throw error when service variables are missing', () => {
      const env = {};

      expect(() => {
        EnvironmentValidator.validateServiceVars(['SERVICE_API_KEY'], env);
      }).toThrow('Environment validation failed:\nMissing required environment variables: SERVICE_API_KEY');
    });
  });

  describe('validateServiceConfig', () => {
    test('should validate complete service configuration', () => {
      const config = {
        requiredEnvironmentVars: ['CUSTOM_VAR']
      };
      const env = {
        CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
        CLOUDFLARE_API_TOKEN: 'test-token',
        CUSTOM_VAR: 'custom-value'
      };

      expect(() => {
        EnvironmentValidator.validateServiceConfig(config, env);
      }).not.toThrow();
    });

    test('should include feature-specific validations', () => {
      const config = {
        features: { d1: true, kv: true },
        requiredEnvironmentVars: ['CUSTOM_VAR']
      };
      const env = {
        CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
        CLOUDFLARE_API_TOKEN: 'test-token',
        CUSTOM_VAR: 'custom-value'
      };

      expect(() => {
        EnvironmentValidator.validateServiceConfig(config, env);
      }).not.toThrow();
    });
  });

  describe('getStatus', () => {
    test('should return correct status for all present variables', () => {
      const env = {
        VAR1: 'value1',
        VAR2: 'value2'
      };

      const status = EnvironmentValidator.getStatus(['VAR1', 'VAR2'], env);

      expect(status).toEqual({
        total: 2,
        set: 2,
        missing: [],
        empty: [],
        valid: true
      });
    });

    test('should return correct status with missing and empty variables', () => {
      const env = {
        VAR1: 'value1',
        VAR2: '',
        VAR4: undefined
      };

      const status = EnvironmentValidator.getStatus(['VAR1', 'VAR2', 'VAR3', 'VAR4'], env);

      expect(status).toEqual({
        total: 4,
        set: 1,
        missing: ['VAR3', 'VAR4'],
        empty: ['VAR2'],
        valid: false
      });
    });
  });

  describe('logValidationResults', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log success message when all variables are set', () => {
      const status = {
        total: 2,
        set: 2,
        missing: [],
        empty: [],
        valid: true
      };

      EnvironmentValidator.logValidationResults(['VAR1', 'VAR2'], status);

      expect(consoleSpy).toHaveBeenCalledWith('\n🌍 Environment Variable Validation');
      expect(consoleSpy).toHaveBeenCalledWith('=' .repeat(40));
      expect(consoleSpy).toHaveBeenCalledWith('✅ PASSED - All 2 variables are set');
    });

    test('should log issues when variables are missing or empty', () => {
      const status = {
        total: 3,
        set: 1,
        missing: ['VAR2'],
        empty: ['VAR3'],
        valid: false
      };

      EnvironmentValidator.logValidationResults(['VAR1', 'VAR2', 'VAR3'], status);

      expect(consoleSpy).toHaveBeenCalledWith('❌ ISSUES - 2 problems found');
      expect(consoleSpy).toHaveBeenCalledWith('\n📭 MISSING VARIABLES:');
      expect(consoleSpy).toHaveBeenCalledWith('   - VAR2');
      expect(consoleSpy).toHaveBeenCalledWith('\n📝 EMPTY VARIABLES:');
      expect(consoleSpy).toHaveBeenCalledWith('   - VAR3');
    });
  });
});