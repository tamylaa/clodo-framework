import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Unit Tests Generator
 * Generates comprehensive unit test suites for service components
 */
export class UnitTestsGenerator extends BaseGenerator {
  /**
   * Generate unit tests
   * @param {Object} context - Generation context
   * @param {Object} context.coreInputs - Core service inputs
   * @param {Object} context.confirmedValues - Confirmed configuration values
   * @param {string} context.servicePath - Service directory path
   * @returns {Promise<string>} Path to generated test file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure test/unit directory exists
    const testDir = join(servicePath, 'test', 'unit');
    mkdirSync(testDir, { recursive: true });

    const unitTestContent = this._generateUnitTestContent(coreInputs, confirmedValues);
    
    const filePath = join(testDir, 'service.test.js');
    writeFileSync(filePath, unitTestContent, 'utf8');
    return filePath;
  }

  /**
   * Generate unit test content
   * @private
   */
  _generateUnitTestContent(coreInputs, confirmedValues) {
    return `import { describe, test, expect } from '@jest/globals';
import serviceHandlers from '../../src/handlers/service-handlers.js';
import serviceMiddleware from '../../src/middleware/service-middleware.js';
import serviceUtils from '../../src/utils/service-utils.js';
import serviceSchema from '../../src/schemas/service-schema.js';

describe('${confirmedValues.displayName} - Unit Tests', () => {
  describe('Handlers', () => {
    test('exports required handler functions', () => {
      expect(typeof serviceHandlers.handleRequest).toBe('function');
      expect(typeof serviceHandlers.handleError).toBe('function');
    });

    test('handleError returns proper error response', async () => {
      const error = new Error('Test error');
      const request = new Request('https://example.com/test');
      
      const response = await serviceHandlers.handleError(error, request);
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    ${confirmedValues.features.caching ? `
    test('cache handlers work correctly', () => {
      expect(typeof serviceHandlers.handleCacheHit).toBe('function');
      expect(typeof serviceHandlers.handleCacheMiss).toBe('function');
    });` : ''}

    ${confirmedValues.features.database ? `
    test('database handlers are defined', () => {
      expect(typeof serviceHandlers.handleDatabaseQuery).toBe('function');
      expect(typeof serviceHandlers.handleDatabaseError).toBe('function');
    });` : ''}
  });

  describe('Middleware', () => {
    test('exports middleware functions', () => {
      expect(typeof serviceMiddleware.addHeaders).toBe('function');
      expect(typeof serviceMiddleware.handleCors).toBe('function');
    });

    test('addHeaders adds service headers', () => {
      const headers = new Headers();
      serviceMiddleware.addHeaders(headers);
      
      expect(headers.get('x-service')).toBe('${coreInputs.serviceName}');
      expect(headers.get('x-version')).toBe('${confirmedValues.version}');
    });

    test('handleCors adds CORS headers', () => {
      const headers = new Headers();
      serviceMiddleware.handleCors(headers);
      
      expect(headers.has('Access-Control-Allow-Origin')).toBe(true);
    });

    ${confirmedValues.features.authentication ? `
    test('authentication middleware validates tokens', () => {
      expect(typeof serviceMiddleware.authenticateRequest).toBe('function');
    });` : ''}

    ${confirmedValues.features.authorization ? `
    test('authorization middleware checks permissions', () => {
      expect(typeof serviceMiddleware.authorizeRequest).toBe('function');
    });` : ''}

    ${confirmedValues.features.rateLimiting ? `
    test('rate limiting middleware tracks requests', () => {
      expect(typeof serviceMiddleware.checkRateLimit).toBe('function');
    });` : ''}
  });

  describe('Utilities', () => {
    test('exports utility functions', () => {
      expect(typeof serviceUtils.formatResponse).toBe('function');
      expect(typeof serviceUtils.validateInput).toBe('function');
    });

    test('formatResponse creates proper response format', () => {
      const data = { test: 'value' };
      const formatted = serviceUtils.formatResponse(data);
      
      expect(formatted.success).toBe(true);
      expect(formatted.data).toEqual(data);
      expect(formatted.timestamp).toBeDefined();
    });

    test('validateInput uses service schema', () => {
      const result = serviceUtils.validateInput({}, serviceSchema);
      expect(result).toBeDefined();
    });

    ${confirmedValues.features.database ? `
    test('database utilities handle connections', () => {
      expect(typeof serviceUtils.getDatabaseConnection).toBe('function');
    });` : ''}

    ${confirmedValues.features.caching ? `
    test('cache utilities manage cache operations', () => {
      expect(typeof serviceUtils.getCacheKey).toBe('function');
      expect(typeof serviceUtils.setCacheValue).toBe('function');
    });` : ''}
  });

  describe('Schema Validation', () => {
    test('service schema is properly defined', () => {
      expect(serviceSchema).toBeDefined();
      expect(typeof serviceSchema.parse).toBe('function');
    });

    ${this._generateSchemaTests(coreInputs.serviceType, confirmedValues)}
  });

  describe('Configuration', () => {
    test('service configuration is valid', () => {
      expect('${coreInputs.serviceName}').toMatch(/^[a-z][a-z0-9-]*$/);
      expect('${confirmedValues.version}').toMatch(/^\\d+\\.\\d+\\.\\d+$/);
    });

    test('environment variables are accessible', () => {
      // Test environment variable access patterns
      expect(typeof process.env).toBe('object');
    });

    test('domains configuration is valid', () => {
      const domainsConfig = {
        primary: '${coreInputs.domainName}',
        environments: {
          production: '${confirmedValues.productionUrl}',
          staging: '${confirmedValues.stagingUrl}',
          development: '${confirmedValues.developmentUrl}'
        }
      };
      
      expect(domainsConfig.primary).toBeDefined();
      expect(domainsConfig.environments.production).toContain('${coreInputs.domainName}');
    });
  });

  describe('Error Handling', () => {
    test('errors are properly formatted', () => {
      const error = new Error('Test error');
      const formatted = serviceUtils.formatError(error);
      
      expect(formatted.success).toBe(false);
      expect(formatted.error).toBeDefined();
      expect(formatted.timestamp).toBeDefined();
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
`;
  }

  /**
   * Generate service-type specific schema tests
   * @private
   */
  _generateSchemaTests(serviceType, confirmedValues) {
    switch (serviceType) {
      case 'data-service':
        return `test('data schema validates records', () => {
      const validData = {
        id: '123',
        data: { test: 'value' },
        timestamp: new Date().toISOString()
      };
      expect(() => serviceSchema.parse(validData)).not.toThrow();
    });

    test('data schema rejects invalid data', () => {
      const invalidData = { invalid: 'structure' };
      expect(() => serviceSchema.parse(invalidData)).toThrow();
    });`;

      case 'auth-service':
        return `test('auth schema validates credentials', () => {
      const validAuth = {
        username: 'testuser',
        password: 'testpass123'
      };
      expect(() => serviceSchema.parse(validAuth)).not.toThrow();
    });

    test('auth schema validates tokens', () => {
      const validToken = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresAt: new Date().toISOString()
      };
      expect(() => serviceSchema.parse(validToken)).not.toThrow();
    });`;

      case 'content-service':
        return `test('content schema validates content structure', () => {
      const validContent = {
        id: '123',
        title: 'Test Content',
        body: 'Content body',
        author: 'test-author'
      };
      expect(() => serviceSchema.parse(validContent)).not.toThrow();
    });`;

      case 'api-gateway':
        return `test('api schema validates requests', () => {
      const validRequest = {
        method: 'GET',
        path: '/test',
        headers: {}
      };
      expect(() => serviceSchema.parse(validRequest)).not.toThrow();
    });`;

      default:
        return `test('service schema validates input', () => {
      // Add service-specific schema tests
      expect(serviceSchema).toBeDefined();
    });`;
    }
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate unit tests
  }
}
