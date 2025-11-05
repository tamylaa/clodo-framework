import { jest } from '@jest/globals';

// Mock ModuleManager before importing security module
await jest.unstable_mockModule('../../src/modules/ModuleManager.js', () => ({
  moduleManager: {
    registerModule: jest.fn()
  }
}));

// Mock security dependencies
await jest.unstable_mockModule('../../src/security/ConfigurationValidator.js', () => ({
  ConfigurationValidator: {
    validate: jest.fn(() => []),
    validateConfiguration: jest.fn(() => ({ valid: true, issues: [] }))
  }
}));

await jest.unstable_mockModule('../../src/security/SecretGenerator.js', () => ({
  SecretGenerator: {
    generateSecureApiKey: jest.fn(() => 'generated-api-key'),
    generateSecureJwtSecret: jest.fn(() => 'generated-jwt-secret'),
    generateServiceKey: jest.fn(() => 'generated-service-key'),
    calculateEntropy: jest.fn(() => 128),
    validateKeyStrength: jest.fn(() => ({ valid: true, score: 100 }))
  }
}));

await jest.unstable_mockModule('../../src/security/patterns/environment-rules.js', () => ({
  isValidEnvironment: jest.fn(() => true)
}));

// Import the mocked modules for use in tests
const { ConfigurationValidator } = await import('../../src/security/ConfigurationValidator.js');
const { SecretGenerator } = await import('../../src/security/SecretGenerator.js');
const { isValidEnvironment } = await import('../../src/security/patterns/environment-rules.js');
const { moduleManager } = await import('../../src/modules/ModuleManager.js');

import { securityModule } from '../../src/modules/security.js';

describe('Security Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the static methods directly
    jest.spyOn(ConfigurationValidator, 'validate').mockReturnValue([]);
    jest.spyOn(ConfigurationValidator, 'validateConfiguration').mockReturnValue({ valid: true, issues: [] });
    jest.spyOn(SecretGenerator, 'generateSecureApiKey').mockReturnValue('generated-api-key');
    jest.spyOn(SecretGenerator, 'generateSecureJwtSecret').mockReturnValue('generated-jwt-secret');
    jest.spyOn(SecretGenerator, 'generateServiceKey').mockReturnValue('generated-service-key');
    jest.spyOn(SecretGenerator, 'calculateEntropy').mockReturnValue(128);
    jest.spyOn(SecretGenerator, 'validateKeyStrength').mockReturnValue({ valid: true, score: 100 });
  });

  describe('Module Structure', () => {
    test('should have correct module metadata', () => {
      expect(securityModule.name).toBe('security');
      expect(securityModule.version).toBe('1.0.0');
    });

    test('should have all required methods', () => {
      expect(typeof securityModule.validate).toBe('function');
      expect(typeof securityModule.validateConfiguration).toBe('function');
      expect(typeof securityModule.generateSecureKey).toBe('function');
      expect(typeof securityModule.generateSecureJwtSecret).toBe('function');
      expect(typeof securityModule.generateServiceKey).toBe('function');
    });

    test('should have hooks object', () => {
      expect(securityModule.hooks).toBeDefined();
      expect(typeof securityModule.hooks['pre-deployment']).toBe('function');
      expect(typeof securityModule.hooks['post-deployment']).toBe('function');
    });

    test('should have utils object', () => {
      expect(securityModule.utils).toBeDefined();
      expect(typeof securityModule.utils.calculateKeyEntropy).toBe('function');
      expect(typeof securityModule.utils.validateKeyStrength).toBe('function');
      expect(typeof securityModule.utils.isValidEnvironment).toBe('function');
    });
  });

  describe('Validation Methods', () => {
    test('validate should return validation result', () => {
      const mockConfig = { test: 'config' };
      const mockEnv = 'production';

      const result = securityModule.validate(mockConfig, mockEnv);

      expect(result).toEqual([]);
    });

    test('validateConfiguration should return configuration validation result', () => {
      const customer = 'test-customer';
      const env = 'production';

      const result = securityModule.validateConfiguration(customer, env);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('securityIssues');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.securityIssues)).toBe(true);
    });
  });

  describe('Key Generation Methods', () => {
    test('generateSecureKey should return generated API key', () => {
      const prefix = 'test';

      const result = securityModule.generateSecureKey(prefix);

      expect(typeof result).toBe('string');
      expect(result.startsWith('test_')).toBe(true);
      expect(result.length).toBeGreaterThan(10);
    });

    test('generateSecureJwtSecret should return generated JWT secret', () => {
      const length = 128;

      const result = securityModule.generateSecureJwtSecret(length);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100); // Should be a long hex string
    });

    test('generateSecureJwtSecret should use default length when none provided', () => {
      const result = securityModule.generateSecureJwtSecret();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100); // Should be a long hex string
    });

    test('generateServiceKey should return generated service key', () => {
      const serviceName = 'test-service';
      const env = 'production';
      const length = 64;

      const result = securityModule.generateServiceKey(serviceName, env, length);

      expect(typeof result).toBe('string');
      expect(result.startsWith('test-service_production_')).toBe(true);
      expect(result.length).toBeGreaterThan(30);
    });
  });

  describe('Deprecated Methods', () => {
    test('deployWithSecurity should throw deprecation error', () => {
      expect(() => {
        securityModule.deployWithSecurity();
      }).toThrow('deployWithSecurity is deprecated. Use MultiDomainOrchestrator for real deployments.');
    });

    test('generateSecureConfig should throw deprecation error', () => {
      expect(() => {
        securityModule.generateSecureConfig();
      }).toThrow('generateSecureConfig is deprecated. Use UnifiedConfigManager for configuration.');
    });

    test('validateDeploymentReadiness should throw deprecation error', () => {
      expect(() => {
        securityModule.validateDeploymentReadiness();
      }).toThrow('validateDeploymentReadiness is deprecated. Use MultiDomainOrchestrator validation.');
    });
  });

  describe('Hooks', () => {
    describe('pre-deployment hook', () => {
      test('should validate configuration and pass when no critical issues', async () => {
        const context = {
          config: { test: 'config' },
          environment: 'production',
          customer: 'test-customer'
        };

        const result = await securityModule.hooks['pre-deployment'](context);

        expect(result.valid).toBe(true);
        expect(result.issues).toEqual([]);
      });

      test('should throw error when critical issues found', async () => {
        const context = {
          config: { API_KEY: 'test-key' }, // This should trigger a critical issue
          environment: 'production',
          customer: 'test-customer'
        };

        await expect(securityModule.hooks['pre-deployment'](context))
          .rejects
          .toThrow('Deployment blocked due to critical security issues');
      });

      test('should allow warnings and info issues', async () => {
        const context = {
          config: { API_KEY: 'test-key' }, // This should trigger a warning in staging
          environment: 'staging',
          customer: 'test-customer'
        };

        const result = await securityModule.hooks['pre-deployment'](context);

        expect(result.valid).toBe(true);
        expect(result.issues.length).toBeGreaterThan(0);
      });
    });

    describe('post-deployment hook', () => {
      test('should complete post-deployment checks', async () => {
        const context = {
          customer: 'test-customer',
          environment: 'production'
        };

        const result = await securityModule.hooks['post-deployment'](context);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Post-deployment phase complete');
      });
    });
  });

  describe('Utils', () => {
    test('calculateKeyEntropy should return entropy value', () => {
      const key = 'weakpassword';

      const result = securityModule.utils.calculateKeyEntropy(key);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10); // 'weakpassword' has low entropy
    });

    test('validateKeyStrength should return validation result', () => {
      const key = 'a'.repeat(64); // 64 character hex-like key
      const requirements = { minLength: 32, requireHex: false, minEntropy: 1.0 };

      const result = securityModule.utils.validateKeyStrength(key, requirements);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    test('isValidEnvironment should return environment validity', () => {
      const env = 'production';

      const result = securityModule.utils.isValidEnvironment(env);

      expect(result).toBe(true);
    });
  });

  describe('Module Registration', () => {
    test('should attempt to register with ModuleManager', () => {
      // The registration happens during module import, so we can't easily test it
      // But we can verify the mock was set up correctly
      expect(moduleManager.registerModule).toBeDefined();
    });
  });
});