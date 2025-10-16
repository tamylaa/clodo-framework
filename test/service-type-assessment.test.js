/**
 * Tests for Service Type Assessment
 *
 * Tests that assessment correctly generates capability manifests
 * for different service types with appropriate configurations
 */

import { jest } from '@jest/globals';
import { CapabilityAssessmentEngine } from '../src/service-management/CapabilityAssessmentEngine.js';

// Mock AssessmentCache
jest.mock('../src/service-management/AssessmentCache.js', () => ({
  AssessmentCache: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ memory: { total: 0, valid: 0 } }),
    generateCacheKey: jest.fn().mockResolvedValue('mock-cache-key')
  }))
}));

import { AssessmentCache } from '../src/service-management/AssessmentCache.js';

describe('Service Type Assessment', () => {
  let assessmentEngine;
  let mockCache;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn().mockReturnValue(false),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({ memory: { total: 0, valid: 0 } }),
      generateCacheKey: jest.fn().mockResolvedValue('mock-cache-key'),
      initialize: jest.fn().mockResolvedValue(),
      initialized: true
    };

    AssessmentCache.mockImplementation(() => mockCache);

    assessmentEngine = new CapabilityAssessmentEngine('/test', {
      cacheEnabled: true,
      cache: { ttl: 10 * 60 * 1000 }
    });
  });

  describe('API Service Assessment', () => {
    test('should generate correct manifest for api-service', async () => {
      const inputs = {
        serviceName: 'user-api',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'dns:edit'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.serviceType).toBe('api-service');
      expect(result.capabilityManifest.endpoints).toContain('GET /users');
      expect(result.capabilityManifest.endpoints).toContain('POST /users');
      expect(result.capabilityManifest.features).toContain('rate-limiting');
      expect(result.capabilityManifest.features).toContain('cors');
      expect(result.capabilityManifest.urls.api).toBe('https://user-api.example.com');
      expect(result.capabilityManifest.urls.worker).toBe('https://user-api-worker.example.com');
    });

    test('should identify missing API permissions for api-service', async () => {
      const inputs = {
        serviceName: 'user-api',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'insufficient-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: [], // No permissions
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // API service should include basic-api, routing, request-handling capabilities
      expect(result.capabilityManifest.requiredCapabilities).toContain('basic-api');
      expect(result.capabilityManifest.requiredCapabilities).toContain('routing');
      expect(result.capabilityManifest.requiredCapabilities).toContain('request-handling');
    });
  });

  describe('Data Service Assessment', () => {
    test('should generate correct manifest for data-service', async () => {
      const inputs = {
        serviceName: 'user-data',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token',
        databaseName: 'user-db'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['d1:read', 'd1:write', 'account:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.serviceType).toBe('data-service');
      expect(result.capabilityManifest.database).toBeDefined();
      expect(result.capabilityManifest.database.name).toBe('user-db');
      expect(result.capabilityManifest.database.type).toBe('d1');
      expect(result.capabilityManifest.endpoints).toContain('GET /data');
      expect(result.capabilityManifest.endpoints).toContain('POST /data');
      expect(result.capabilityManifest.features).toContain('data-validation');
      expect(result.capabilityManifest.features).toContain('backup');
      expect(result.capabilityManifest.urls.database).toBe('https://user-data-db.example.com');
    });

    test('should identify missing D1 permissions for data-service', async () => {
      const inputs = {
        serviceName: 'user-data',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'insufficient-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'], // Missing D1 permissions
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'database',
          priority: 'blocked',
          reason: expect.stringContaining('D1')
        })
      );
    });
  });

  describe('Cache Service Assessment', () => {
    test('should generate correct manifest for cache-service', async () => {
      const inputs = {
        serviceName: 'user-cache',
        serviceType: 'cache-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['kv:read', 'kv:write', 'account:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.serviceType).toBe('cache-service');
      expect(result.capabilityManifest.cache).toBeDefined();
      expect(result.capabilityManifest.cache.type).toBe('kv');
      expect(result.capabilityManifest.endpoints).toContain('GET /cache/:key');
      expect(result.capabilityManifest.endpoints).toContain('PUT /cache/:key');
      expect(result.capabilityManifest.endpoints).toContain('DELETE /cache/:key');
      expect(result.capabilityManifest.features).toContain('key-expiration');
      expect(result.capabilityManifest.features).toContain('bulk-operations');
      expect(result.capabilityManifest.urls.cache).toBe('https://user-cache-cache.example.com');
    });

    test('should identify missing KV permissions for cache-service', async () => {
      const inputs = {
        serviceName: 'user-cache',
        serviceType: 'cache-service',
        domainName: 'example.com',
        cloudflareToken: 'insufficient-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'], // Missing KV permissions
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'kv-storage',
          priority: 'blocked',
          reason: expect.stringContaining('KV')
        })
      );
    });
  });

  describe('File Service Assessment', () => {
    test('should generate correct manifest for file-service', async () => {
      const inputs = {
        serviceName: 'user-files',
        serviceType: 'file-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['r2:read', 'r2:write', 'account:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.serviceType).toBe('file-service');
      expect(result.capabilityManifest.storage).toBeDefined();
      expect(result.capabilityManifest.storage.type).toBe('r2');
      expect(result.capabilityManifest.endpoints).toContain('GET /files/:id');
      expect(result.capabilityManifest.endpoints).toContain('POST /files');
      expect(result.capabilityManifest.endpoints).toContain('DELETE /files/:id');
      expect(result.capabilityManifest.features).toContain('cdn-delivery');
      expect(result.capabilityManifest.features).toContain('file-metadata');
      expect(result.capabilityManifest.urls.storage).toBe('https://user-files-storage.example.com');
      expect(result.capabilityManifest.urls.cdn).toBe('https://user-files-cdn.example.com');
    });

    test('should identify missing R2 permissions for file-service', async () => {
      const inputs = {
        serviceName: 'user-files',
        serviceType: 'file-service',
        domainName: 'example.com',
        cloudflareToken: 'insufficient-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'], // Missing R2 permissions
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'r2-storage',
          priority: 'blocked',
          reason: expect.stringContaining('R2')
        })
      );
    });
  });

  describe('Service Type Validation', () => {
    test('should handle unknown service types gracefully', async () => {
      const inputs = {
        serviceName: 'unknown-service',
        serviceType: 'unknown-type',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'account:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.serviceType).toBe('unknown-type');
      // Unknown service types may have basic health endpoints
      expect(Array.isArray(result.capabilityManifest.endpoints)).toBe(true);
      // Features should be minimal or empty
      expect(Array.isArray(result.capabilityManifest.features)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0); // Some confidence for basic setup
    });

    test('should validate service type compatibility', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      // Mock incompatible permissions (data service with only KV permissions)
      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['kv:read', 'kv:write'], // KV instead of D1
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'database',
          priority: 'blocked',
          reason: expect.stringContaining('D1')
        })
      );
      expect(result.confidence).toBeLessThan(50); // Low confidence due to incompatibility
    });
  });

  describe('Capability Manifest Generation', () => {
    test('should include environment-specific configurations', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'api-service',
        domainName: 'example.com',
        environment: 'production',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'dns:edit'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.environment).toBe('production');
      expect(result.capabilityManifest.features).toContain('production-optimization');
      expect(result.capabilityManifest.security).toBeDefined();
      expect(result.capabilityManifest.monitoring).toBeDefined();
    });

    test('should include development-specific configurations', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'api-service',
        domainName: 'example.com',
        environment: 'development',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'dns:edit'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.environment).toBe('development');
      expect(result.capabilityManifest.features).toContain('debug-logging');
      expect(result.capabilityManifest.features).toContain('hot-reload');
    });

    test('should generate resource estimates', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['d1:read', 'd1:write'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.resources).toBeDefined();
      expect(result.capabilityManifest.resources.cpu).toBeDefined();
      expect(result.capabilityManifest.resources.memory).toBeDefined();
      expect(result.capabilityManifest.resources.storage).toBeDefined();
    });

    test('should include deployment recommendations', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'cache-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['kv:read', 'kv:write'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // Check for recommendations related to cache service
      expect(Array.isArray(result.recommendations)).toBe(true);
      // At least one recommendation should exist
      expect(result.recommendations.length).toBeGreaterThan(0);
      // Check that recommendations have proper structure
      result.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('priority');
      });
    });
  });
});