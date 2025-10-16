/**
 * Unit Tests for CapabilityAssessmentEngine
 * Tests the intelligent capability assessment and gap analysis
 */

import { jest } from '@jest/globals';
import { CapabilityAssessmentEngine } from '../src/service-management/CapabilityAssessmentEngine.js';
import { ServiceAutoDiscovery } from '../src/service-management/ServiceAutoDiscovery.js';
import { AssessmentCache } from '../src/service-management/AssessmentCache.js';

// Mock the ServiceAutoDiscovery dependency
jest.mock('../src/service-management/ServiceAutoDiscovery.js');

// Mock AssessmentCache
jest.mock('../src/service-management/AssessmentCache.js', () => ({
  AssessmentCache: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ memory: { total: 0, valid: 0 } }),
    generateCacheKey: jest.fn().mockResolvedValue('mock-cache-key'),
    initialize: jest.fn().mockResolvedValue(),
    initialized: true
  }))
}));

describe('CapabilityAssessmentEngine', () => {
  let engine;
  let mockDiscovery;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock ServiceAutoDiscovery
    mockDiscovery = {
      discoverServiceCapabilities: jest.fn()
    };

    ServiceAutoDiscovery.mockImplementation(() => mockDiscovery);

    // Create engine instance
    engine = new CapabilityAssessmentEngine('/test/service/path');
  });

  describe('constructor', () => {
    test('should initialize with ServiceAutoDiscovery', () => {
      expect(ServiceAutoDiscovery).toHaveBeenCalledWith('/test/service/path');
      expect(engine.discovery).toBe(mockDiscovery);
    });

    test('should default to current working directory', () => {
      const defaultEngine = new CapabilityAssessmentEngine();
      expect(ServiceAutoDiscovery).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe('assessCapabilities', () => {
    const mockDiscoveryResult = {
      artifacts: {
        wrangler: { exists: true, capabilities: ['deployment'] },
        package: { exists: true, capabilities: ['framework'] },
        structure: { exists: true, capabilities: [] },
        apiToken: { available: true, permissions: ['D1:Edit'], capabilities: { database: { possible: true } } }
      },
      capabilities: {
        deployment: { configured: true, provider: 'cloudflare' },
        database: { configured: false },
        framework: { configured: true, provider: 'express' }
      },
      assessment: {
        serviceType: 'data-service',
        maturity: 'developing',
        completeness: 75
      }
    };

    beforeEach(() => {
      mockDiscovery.discoverServiceCapabilities.mockResolvedValue(mockDiscoveryResult);
    });

    test('should perform complete capability assessment', async () => {
      const result = await engine.assessCapabilities();

      expect(mockDiscovery.discoverServiceCapabilities).toHaveBeenCalled();
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('discovery', mockDiscoveryResult);
      expect(result).toHaveProperty('capabilityManifest');
      expect(result).toHaveProperty('gapAnalysis');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('confidence');
    });

    test('should merge user inputs with discovery', async () => {
      const userInputs = {
        serviceType: 'custom-service',
        environment: 'production'
      };

      const result = await engine.assessCapabilities(userInputs);

      // Verify that user inputs are passed to manifest generation
      expect(result.capabilityManifest.serviceType).toBe('custom-service');
    });

    test('should calculate confidence score', async () => {
      const result = await engine.assessCapabilities();

      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('generateCapabilityManifest', () => {
    test('should generate manifest for generic service', () => {
      const inputs = {
        serviceType: 'generic',
        capabilities: {
          deployment: { configured: true },
          database: { configured: false }
        }
      };

      const manifest = engine.generateCapabilityManifest(inputs);

      expect(manifest.serviceType).toBe('generic');
      expect(manifest.requiredCapabilities).toContain('basic-api');
      expect(manifest.optionalCapabilities).toContain('database');
      expect(manifest.infrastructure).toContain('deployment');
      expect(manifest.apiTokenCapabilities).toEqual({});
    });

    test('should generate manifest for data-service', () => {
      const inputs = {
        serviceType: 'data-service',
        capabilities: {}
      };

      const manifest = engine.generateCapabilityManifest(inputs);

      expect(manifest.requiredCapabilities).toContain('database');
      expect(manifest.requiredCapabilities).toContain('data-validation');
      expect(manifest.infrastructure).toContain('d1-database');
    });

    test('should include API token capabilities', () => {
      const inputs = {
        serviceType: 'generic',
        capabilities: {}
      };
      const apiTokenCapabilities = {
        database: { possible: true },
        storage: { possible: false }
      };

      const manifest = engine.generateCapabilityManifest(inputs, apiTokenCapabilities);

      expect(manifest.apiTokenCapabilities).toEqual(apiTokenCapabilities);
    });

    test('should add production-specific capabilities', () => {
      const inputs = {
        serviceType: 'generic',
        environments: ['production'],
        capabilities: {}
      };

      const manifest = engine.generateCapabilityManifest(inputs);

      expect(manifest.monitoring).toContain('error-tracking');
      expect(manifest.security).toContain('rate-limiting');
    });
  });

  describe('performGapAnalysis', () => {
    test('should identify missing required capabilities', () => {
      const manifest = {
        requiredCapabilities: ['database'],
        optionalCapabilities: [],
        infrastructure: ['deployment', 'monitoring'],
        apiTokenCapabilities: {
          database: { possible: true },
          deployment: { possible: true },
          monitoring: { possible: true }
        },
        discoveredCapabilities: {
          deployment: { configured: true, provider: 'cloudflare' },
          database: { configured: false },
          monitoring: { configured: false }
        }
      };

      const gaps = engine.performGapAnalysis(manifest);

      // Should find monitoring as missing infrastructure, database as missing required
      expect(gaps.missing.some(g => g.capability === 'monitoring')).toBe(true);
      expect(gaps.missing.some(g => g.capability === 'database')).toBe(true);
      // Deployment is configured but infrastructure doesn't add to fullyConfigured
      expect(gaps.fullyConfigured).toHaveLength(0);
    });

    test('should mark capabilities as blocked when permissions unavailable', () => {
      const manifest = {
        requiredCapabilities: ['database', 'storage'],
        optionalCapabilities: [],
        infrastructure: [],
        apiTokenCapabilities: {
          database: { possible: true },
          storage: { possible: false }
        },
        discoveredCapabilities: {
          database: { configured: false },
          storage: { configured: false }
        }
      };

      const gaps = engine.performGapAnalysis(manifest);

      expect(gaps.missing).toHaveLength(2);
      const storageGap = gaps.missing.find(g => g.capability === 'storage');
      expect(storageGap.priority).toBe('blocked');
      expect(storageGap.deployable).toBe(false);
    });

    test('should identify partially configured capabilities', () => {
      const manifest = {
        requiredCapabilities: ['database'],
        optionalCapabilities: [],
        infrastructure: [],
        apiTokenCapabilities: {},
        discoveredCapabilities: {
          database: { configured: true, partial: true }
        }
      };

      const gaps = engine.performGapAnalysis(manifest);

      expect(gaps.partiallyConfigured).toHaveLength(1);
      expect(gaps.partiallyConfigured[0].capability).toBe('database');
    });
  });

  describe('getCapabilityPermissionInfo', () => {
    test('should return possible when permissions available', () => {
      const apiTokenCapabilities = {
        database: { possible: true },
        storage: { possible: false }
      };

      const info = engine.getCapabilityPermissionInfo('database', apiTokenCapabilities);

      expect(info.possible).toBe(true);
      expect(info.reason).toBe('API permissions allow deployment');
    });

    test('should return blocked when permissions unavailable', () => {
      const apiTokenCapabilities = {
        database: { possible: false }
      };

      const info = engine.getCapabilityPermissionInfo('database', apiTokenCapabilities);

      expect(info.possible).toBe(false);
      expect(info.reason).toContain('Missing required API permissions');
      expect(info.requiredPermissions).toContain('D1:Edit');
    });

    test('should return possible when no token analysis available', () => {
      const info = engine.getCapabilityPermissionInfo('database', {});

      expect(info.possible).toBe(true);
      expect(info.reason).toBe('No API token analysis available');
    });
  });

  describe('getRequiredPermissions', () => {
    test('should return correct permissions for each capability', () => {
      expect(engine.getRequiredPermissions('database')).toEqual(['D1:Edit']);
      expect(engine.getRequiredPermissions('storage')).toEqual(['Workers R2 Storage:Edit']);
      expect(engine.getRequiredPermissions('kv')).toEqual(['Workers KV Storage:Edit']);
      expect(engine.getRequiredPermissions('deployment')).toEqual(['Workers Scripts:Edit', 'Workers Routes:Edit']);
      expect(engine.getRequiredPermissions('observability')).toEqual(['Workers Observability:Edit']);
      expect(engine.getRequiredPermissions('pages')).toEqual(['Cloudflare Pages:Edit']);
      expect(engine.getRequiredPermissions('ai')).toEqual(['Workers Agents Configuration:Edit']);
    });

    test('should return empty array for unknown capability', () => {
      expect(engine.getRequiredPermissions('unknown-capability')).toEqual([]);
    });
  });

  describe('mapCapabilityToDiscovery', () => {
    const discovery = {
      database: { configured: true, provider: 'd1' },
      deployment: { configured: true, provider: 'cloudflare' },
      authentication: { configured: false }
    };

    test('should map direct capability names', () => {
      expect(engine.mapCapabilityToDiscovery('database', discovery)).toBe(discovery.database);
      expect(engine.mapCapabilityToDiscovery('deployment', discovery)).toBe(discovery.deployment);
    });

    test('should map aliased capability names', () => {
      expect(engine.mapCapabilityToDiscovery('d1-database', discovery)).toEqual(
        discovery.database?.provider === 'd1' ? discovery.database : { configured: false }
      );
    });

    test('should return not configured for missing capabilities', () => {
      const result = engine.mapCapabilityToDiscovery('storage', discovery);
      expect(result).toEqual({ configured: false });
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate confidence based on discovery completeness', () => {
      const discovery = {
        assessment: { completeness: 75 },
        artifacts: {
          wrangler: { exists: true },
          package: { exists: true },
          structure: { exists: true }
        }
      };
      const userInputs = {};

      const confidence = engine.calculateConfidence(discovery, userInputs);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    test('should increase confidence with user inputs', () => {
      const discovery = {
        assessment: { completeness: 50 },
        artifacts: {
          wrangler: { exists: true },
          package: { exists: false },
          structure: { exists: false }
        }
      };
      const userInputs = { serviceType: 'data-service', environment: 'production' };

      const confidence = engine.calculateConfidence(discovery, userInputs);

      expect(confidence).toBeGreaterThan(30); // Base confidence plus user input bonus
    });
  });

  describe('mergeUserInputs', () => {
    test('should merge discovery with user inputs', () => {
      const discovery = {
        assessment: { serviceType: 'discovered-type' },
        artifacts: {
          wrangler: { environments: ['staging'] }
        },
        capabilities: { deployment: { configured: true } }
      };
      const userInputs = {
        environment: 'production',
        customField: 'custom-value'
      };

      const merged = engine.mergeUserInputs(discovery, userInputs);

      expect(merged.serviceType).toBe('discovered-type'); // From discovery
      expect(merged.environment).toBe('production'); // From user inputs
      expect(merged.customField).toBe('custom-value'); // From user inputs
      expect(merged.discoveredCapabilities).toBe(discovery.capabilities);
    });

    test('should prefer user inputs over discovery', () => {
      const discovery = {
        assessment: { serviceType: 'discovered-type' },
        artifacts: { wrangler: { environments: ['staging'] } },
        capabilities: {}
      };
      const userInputs = {
        serviceType: 'user-specified-type'
      };

      const merged = engine.mergeUserInputs(discovery, userInputs);

      expect(merged.serviceType).toBe('user-specified-type');
    });
  });
});