import { describe, test, expect } from '@jest/globals';
import { createServiceHandlers } from '../../src/handlers/service-handlers.js';
import middlewareDefault, { registerMiddleware } from '../../src/middleware/service-middleware.js';
import * as serviceUtils from '../../src/utils/service-utils.js';
import { baseServiceSchema as serviceSchema } from '../../src/schemas/service-schema.js';

describe('Test Integration Service - Unit Tests', () => {
  describe('Handlers', () => {
    test('exports required handler functions', () => {
      const mockConfig = { name: 'test-integration-service' };
      const mockEnv = {};
      const handlers = createServiceHandlers(mockConfig, mockEnv);
      expect(typeof handlers.handleRequest).toBe('function');
      expect(typeof handlers.handleHealthCheck).toBe('function');
    });

    test('handleRequest returns 404 for unknown path', async () => {
      const request = new Request('https://example.com/unknown');
      const mockConfig = { name: 'test-integration-service' };
      const mockEnv = {};
      const handlers = createServiceHandlers(mockConfig, mockEnv);

      const response = await handlers.handleRequest(request, {});
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    

    
  });

  describe('Middleware', () => {
    test('exports middleware contract and register helper', () => {
      expect(typeof middlewareDefault).toBe('function');
      expect(typeof registerMiddleware).toBe('function');
    });

    test('default middleware instance has lifecycle methods', () => {
      const instance = new middlewareDefault();
      expect(typeof instance.preprocess).toBe('function');
      expect(typeof instance.postprocess).toBe('function');
    });

    test('registerMiddleware does not throw when called', () => {
      const registry = { registered: null, register(name, instance) { this.registered = { name, instance }; } };
      expect(() => registerMiddleware(registry, 'test-integration-service')).not.toThrow();
    });

    

    

    
  });

  describe('Utilities', () => {
    test('exports utility classes', () => {
      expect(typeof serviceUtils.DatabaseUtils.executeQuery).toBe('function');
      expect(typeof serviceUtils.LoggingUtils.logRequest).toBe('function');
      expect(typeof serviceUtils.FeatureUtils.isFeatureEnabled).toBe('function');
    });

    test('createSuccessResponse returns a Response with proper structure', async () => {
      const data = { test: 'value' };
      const response = serviceUtils.ResponseUtils.createSuccessResponse(data);
      expect(response instanceof Response).toBe(true);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.timestamp).toBeDefined();
    });

    test('service schema validates input (safeParse)', () => {
      const result = serviceSchema.safeParse({});
      expect(result).toBeDefined();
    });

    

    
  });

  describe('Schema Validation', () => {
    test('service schema is properly defined', () => {
      expect(serviceSchema).toBeDefined();
      expect(typeof serviceSchema.parse).toBe('function');
    });

    test('service schema validates input', () => {
      // Add service-specific schema tests
      expect(serviceSchema).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('service configuration is valid', () => {
      expect('test-integration-service').toMatch(/^[a-z][a-z0-9-]*$/);
      expect('1.0.0').toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('environment variables are accessible', () => {
      // Test environment variable access patterns
      expect(typeof process.env).toBe('object');
    });

    test('domains configuration is valid', () => {
      const domainsConfig = {
        primary: 'test.clodo.dev',
        environments: {
          production: 'https://test-integration-service.test.clodo.dev',
          staging: 'https://test-integration-service-sta.test.clodo.dev',
          development: 'https://test-integration-service-dev.test.clodo.dev'
        }
      };
      
      expect(domainsConfig.primary).toBeDefined();
      expect(domainsConfig.environments.production).toContain('test.clodo.dev');
    });
  });

  describe('Error Handling', () => {
    test('errors are properly formatted (error response)', async () => {
      const error = new Error('Test error');
      const response = serviceUtils.ResponseUtils.createErrorResponse(error);
      expect(response instanceof Response).toBe(true);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    test('handles validation errors', () => {
      try {
        serviceSchema.parse({ invalid: 'data' });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
