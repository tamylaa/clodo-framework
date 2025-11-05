import { describe, it, expect } from '@jest/globals';
import {
  buildCustomDomain,
  getDomainTemplate,
  getWorkerSuffix,
  getDatabaseSuffix,
  getTimeout,
  getServiceTypes,
  VALIDATION_CONFIG,
  CONSTANTS
} from '../../src/utils/constants.js';

describe('Constants Module', () => {
  describe('VALIDATION_CONFIG', () => {
    it('should load validation config successfully', () => {
      expect(VALIDATION_CONFIG).toBeDefined();
      
      if (VALIDATION_CONFIG) {
        expect(VALIDATION_CONFIG).toHaveProperty('environments');
      }
    });
  });

  describe('CONSTANTS', () => {
    it('should have required constant values', () => {
      expect(CONSTANTS).toBeDefined();
      expect(CONSTANTS).toHaveProperty('DEFAULT_ENVIRONMENT');
      expect(CONSTANTS).toHaveProperty('SUPPORTED_ENVIRONMENTS');
      expect(CONSTANTS).toHaveProperty('WORKERS_DEV_SUFFIX');
    });

    it('should have valid supported environments', () => {
      expect(Array.isArray(CONSTANTS.SUPPORTED_ENVIRONMENTS)).toBe(true);
      expect(CONSTANTS.SUPPORTED_ENVIRONMENTS).toContain('production');
      expect(CONSTANTS.SUPPORTED_ENVIRONMENTS).toContain('staging');
      expect(CONSTANTS.SUPPORTED_ENVIRONMENTS).toContain('development');
    });
  });

  describe('getDomainTemplate', () => {
    it('should return correct template for production', () => {
      const template = getDomainTemplate('production');
      
      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(template).toContain('{service}');
      expect(template).toContain('{domain}');
    });

    it('should return correct template for staging', () => {
      const template = getDomainTemplate('staging');
      
      expect(template).toBeDefined();
      expect(template).toContain('staging');
      expect(template).toContain('{service}');
      expect(template).toContain('{domain}');
    });

    it('should return correct template for development', () => {
      const template = getDomainTemplate('development');
      
      expect(template).toBeDefined();
      expect(template).toContain('dev');
      expect(template).toContain('{service}');
      expect(template).toContain('{domain}');
    });

    it('should return production template for unknown environment', () => {
      const template = getDomainTemplate('unknown-env');
      
      expect(template).toBe(getDomainTemplate('production'));
    });

    it('should handle missing environment parameter', () => {
      const template = getDomainTemplate();
      
      expect(template).toBeDefined();
      expect(template).toBe(getDomainTemplate('production'));
    });
  });

  describe('buildCustomDomain', () => {
    it('should build production domain correctly', () => {
      const domain = buildCustomDomain('data-service', 'clodo.dev', 'production');
      
      expect(domain).toBe('https://data-service.clodo.dev');
    });

    it('should build staging domain correctly', () => {
      const domain = buildCustomDomain('data-service', 'clodo.dev', 'staging');
      
      expect(domain).toBe('https://staging-data-service.clodo.dev');
    });

    it('should build development domain correctly', () => {
      const domain = buildCustomDomain('data-service', 'clodo.dev', 'development');
      
      expect(domain).toBe('https://dev-data-service.clodo.dev');
    });

    it('should handle different service names', () => {
      const domain1 = buildCustomDomain('auth-service', 'example.com', 'production');
      expect(domain1).toBe('https://auth-service.example.com');
      
      const domain2 = buildCustomDomain('api', 'mysite.io', 'staging');
      expect(domain2).toBe('https://staging-api.mysite.io');
    });

    it('should handle different base domains', () => {
      const domain1 = buildCustomDomain('api', 'example.com', 'production');
      expect(domain1).toBe('https://api.example.com');
      
      const domain2 = buildCustomDomain('api', 'mycompany.co.uk', 'production');
      expect(domain2).toBe('https://api.mycompany.co.uk');
    });

    it('should default to production for unknown environment', () => {
      const domain = buildCustomDomain('api', 'test.com', 'unknown');
      
      expect(domain).toBe('https://api.test.com');
    });

    it('should handle hyphenated service names', () => {
      const domain = buildCustomDomain('my-data-service', 'example.com', 'production');
      
      expect(domain).toBe('https://my-data-service.example.com');
    });

    it('should include https protocol', () => {
      const domain = buildCustomDomain('api', 'example.com', 'production');
      
      expect(domain).toMatch(/^https:\/\//);
    });
  });

  describe('getWorkerSuffix', () => {
    it('should return worker suffix for production', () => {
      const suffix = getWorkerSuffix('production');
      
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe('string');
    });

    it('should return worker suffix for staging', () => {
      const suffix = getWorkerSuffix('staging');
      
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe('string');
    });

    it('should return worker suffix for development', () => {
      const suffix = getWorkerSuffix('development');
      
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe('string');
    });

    it('should return production suffix for unknown environment', () => {
      const suffix = getWorkerSuffix('unknown');
      
      expect(suffix).toBe(getWorkerSuffix('production'));
    });
  });

  describe('getDatabaseSuffix', () => {
    it('should return database suffix for production', () => {
      const suffix = getDatabaseSuffix('production');
      
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe('string');
      // Production typically has empty suffix or '-production'
    });

    it('should return database suffix for staging', () => {
      const suffix = getDatabaseSuffix('staging');
      
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe('string');
      // Staging should have a distinguishing suffix
      expect(suffix.length).toBeGreaterThan(0);
      expect(suffix).toContain('staging');
    });

    it('should return database suffix for development', () => {
      const suffix = getDatabaseSuffix('development');
      
      expect(suffix).toBeDefined();
      expect(typeof suffix).toBe('string');
      // Development should have a distinguishing suffix
      expect(suffix.length).toBeGreaterThan(0);
      expect(suffix).toContain('dev');
    });

    it('should return production suffix for unknown environment', () => {
      const suffix = getDatabaseSuffix('unknown');
      
      expect(suffix).toBe(getDatabaseSuffix('production'));
    });
  });

  describe('getTimeout', () => {
    it('should return timeout value for database operations', () => {
      const timeout = getTimeout('database');
      
      expect(typeof timeout).toBe('number');
      expect(timeout).toBeGreaterThan(0);
    });

    it('should return timeout value for deployment operations', () => {
      const timeout = getTimeout('deployment');
      
      expect(typeof timeout).toBe('number');
      expect(timeout).toBeGreaterThan(0);
    });

    it('should return timeout value for health check operations', () => {
      const timeout = getTimeout('healthCheck');
      
      expect(typeof timeout).toBe('number');
      expect(timeout).toBeGreaterThan(0);
    });

    it('should return default timeout for unknown operation', () => {
      const timeout = getTimeout('unknown');
      
      expect(typeof timeout).toBe('number');
      expect(timeout).toBeGreaterThan(0);
    });
  });

  describe('getServiceTypes', () => {
    it('should return array of valid service types', () => {
      const types = getServiceTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include common service types', () => {
      const types = getServiceTypes();
      
      // Should include at least some expected types
      const hasDataService = types.some(t => 
        t === 'data-service' || t === 'cloudflare-workers-service'
      );
      expect(hasDataService).toBe(true);
    });

    it('should return strings in the array', () => {
      const types = getServiceTypes();
      
      types.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should use templates consistently across functions', () => {
      const template = getDomainTemplate('production');
      const domain = buildCustomDomain('api', 'example.com', 'production');
      
      // Domain should be built using the template and include https
      expect(domain).toMatch(/^https:\/\/api.*example\.com/);
    });

    it('should handle all environments consistently', () => {
      const environments = ['production', 'staging', 'development'];
      
      environments.forEach(env => {
        const template = getDomainTemplate(env);
        const domain = buildCustomDomain('test', 'example.com', env);
        const workerSuffix = getWorkerSuffix(env);
        const dbSuffix = getDatabaseSuffix(env);
        
        expect(template).toBeDefined();
        expect(domain).toBeDefined();
        expect(domain).toMatch(/^https:\/\//);
        expect(typeof workerSuffix).toBe('string');
        expect(typeof dbSuffix).toBe('string');
      });
    });

    it('should build different domains for different environments', () => {
      const prodDomain = buildCustomDomain('api', 'example.com', 'production');
      const stagingDomain = buildCustomDomain('api', 'example.com', 'staging');
      const devDomain = buildCustomDomain('api', 'example.com', 'development');
      
      // All should be different
      expect(prodDomain).not.toBe(stagingDomain);
      expect(prodDomain).not.toBe(devDomain);
      expect(stagingDomain).not.toBe(devDomain);
      
      // All should contain the base domain and https
      expect(prodDomain).toContain('example.com');
      expect(prodDomain).toContain('https://');
      expect(stagingDomain).toContain('example.com');
      expect(stagingDomain).toContain('https://');
      expect(devDomain).toContain('example.com');
      expect(devDomain).toContain('https://');
    });
  });
});
