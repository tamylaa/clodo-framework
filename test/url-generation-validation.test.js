/**
 * Tests for URL Generation Validation in Assessment
 *
 * Tests that assessment correctly validates service name-based URL patterns
 * and identifies potential conflicts or issues
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

describe('URL Generation Validation', () => {
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

  describe('Service Name to URL Conversion', () => {
    test('should generate correct URLs for valid service names', async () => {
      const inputs = {
        serviceName: 'my-test-service',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      // Mock successful token validation
      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'dns:edit'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.urls).toBeDefined();
      expect(result.capabilityManifest.urls.api).toBe('https://my-test-service.example.com');
      expect(result.capabilityManifest.urls.worker).toBe('https://my-test-service-worker.example.com');
    });

    test('should handle service names with special characters', async () => {
      const inputs = {
        serviceName: 'My_Test-Service_123',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['d1:read', 'd1:write'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // Should convert to URL-safe format
      expect(result.capabilityManifest.urls.api).toBe('https://my-test-service-123.example.com');
      expect(result.capabilityManifest.urls.database).toBe('https://my-test-service-123-db.example.com');
    });

    test('should handle very long service names', async () => {
      const longName = 'a'.repeat(100);
      const inputs = {
        serviceName: longName,
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // Should truncate or handle long names appropriately
      expect(result.capabilityManifest.urls.api).toBeDefined();
      expect(result.capabilityManifest.urls.api.length).toBeLessThan(200); // Reasonable length
    });

    test('should handle service names with uppercase', async () => {
      const inputs = {
        serviceName: 'MyService',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // Should convert to lowercase
      expect(result.capabilityManifest.urls.api).toBe('https://myservice.example.com');
    });
  });

  describe('URL Conflict Detection', () => {
    test('should detect potential DNS conflicts', async () => {
      const inputs = {
        serviceName: 'admin', // Common conflicting name
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      // Mock DNS check that finds conflict
      assessmentEngine.checkDnsAvailability = jest.fn().mockResolvedValue({
        available: false,
        conflictingRecords: ['admin.example.com (A record)']
      });

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'dns:edit'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'dns',
          priority: 'warning',
          reason: expect.stringContaining('DNS conflict detected')
        })
      );
    });

    test('should pass when DNS is available', async () => {
      const inputs = {
        serviceName: 'unique-service-name',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.checkDnsAvailability = jest.fn().mockResolvedValue({
        available: true,
        conflictingRecords: []
      });

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read', 'dns:edit'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      const dnsGaps = result.gapAnalysis.missing.filter(gap => gap.capability === 'dns');
      expect(dnsGaps).toHaveLength(0);
    });

    test('should handle DNS check failures gracefully', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.checkDnsAvailability = jest.fn().mockRejectedValue(
        new Error('DNS check failed')
      );

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // Should not block deployment due to DNS check failure
      const dnsGaps = result.gapAnalysis.missing.filter(gap => gap.capability === 'dns');
      expect(dnsGaps).toHaveLength(0);
    });
  });

  describe('Domain Validation', () => {
    test('should validate domain ownership', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateDomainOwnership = jest.fn().mockResolvedValue({
        owned: true,
        accountId: 'test-account'
      });

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      const domainGaps = result.gapAnalysis.missing.filter(gap => gap.capability === 'domain');
      expect(domainGaps).toHaveLength(0);
    });

    test('should detect unowned domains', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'api-service',
        domainName: 'unowned-domain.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateDomainOwnership = jest.fn().mockResolvedValue({
        owned: false,
        accountId: null
      });

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'domain',
          priority: 'blocked',
          reason: expect.stringContaining('Domain not owned')
        })
      );
    });

    test('should handle domain validation failures', async () => {
      const inputs = {
        serviceName: 'test-service',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateDomainOwnership = jest.fn().mockRejectedValue(
        new Error('Domain validation failed')
      );

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      // Should issue warning but not block
      expect(result.gapAnalysis.missing).toContainEqual(
        expect.objectContaining({
          capability: 'domain',
          priority: 'warning',
          reason: expect.stringContaining('Could not validate domain')
        })
      );
    });
  });

  describe('URL Pattern Generation by Service Type', () => {
    test('should generate correct URL patterns for api-service', async () => {
      const inputs = {
        serviceName: 'api-test',
        serviceType: 'api-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['zone:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.urls.api).toBe('https://api-test.example.com');
      expect(result.capabilityManifest.urls.worker).toBe('https://api-test-worker.example.com');
      expect(result.capabilityManifest.urls.docs).toBe('https://api-test-docs.example.com');
    });

    test('should generate correct URL patterns for data-service', async () => {
      const inputs = {
        serviceName: 'data-test',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['d1:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.urls.api).toBe('https://data-test.example.com');
      expect(result.capabilityManifest.urls.database).toBe('https://data-test-db.example.com');
      expect(result.capabilityManifest.urls.admin).toBe('https://data-test-admin.example.com');
    });

    test('should generate correct URL patterns for cache-service', async () => {
      const inputs = {
        serviceName: 'cache-test',
        serviceType: 'cache-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['kv:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.urls.api).toBe('https://cache-test.example.com');
      expect(result.capabilityManifest.urls.cache).toBe('https://cache-test-cache.example.com');
    });

    test('should generate correct URL patterns for file-service', async () => {
      const inputs = {
        serviceName: 'file-test',
        serviceType: 'file-service',
        domainName: 'example.com',
        cloudflareToken: 'valid-token'
      };

      assessmentEngine.validateCloudflareToken = jest.fn().mockResolvedValue({
        permissions: ['r2:read'],
        accountId: 'test-account'
      });

      const result = await assessmentEngine.assessCapabilities(inputs);

      expect(result.capabilityManifest.urls.api).toBe('https://file-test.example.com');
      expect(result.capabilityManifest.urls.storage).toBe('https://file-test-storage.example.com');
      expect(result.capabilityManifest.urls.cdn).toBe('https://file-test-cdn.example.com');
    });
  });
});