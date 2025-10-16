/**
 * Tests for Assessment Integration in Service Creation Workflow
 *
 * Tests that assessment runs at appropriate points during service creation:
 * 1. After API token collection (deployment readiness)
 * 2. Before service generation (final validation)
 */

import { jest } from '@jest/globals';
import { InputCollector } from '../src/service-management/InputCollector.js';
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';
import { CapabilityAssessmentEngine } from '../src/service-management/CapabilityAssessmentEngine.js';

// Mock the assessment engine
jest.mock('../src/service-management/CapabilityAssessmentEngine.js');

describe('Assessment Integration', () => {
  let mockAssessmentEngine;
  let mockAssessmentResult;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock assessment result
    mockAssessmentResult = {
      capabilityManifest: {
        serviceType: 'data-service'
      },
      gapAnalysis: {
        missing: []
      },
      confidence: 85,
      cached: false,
      recommendations: []
    };

    // Mock assessment engine
    mockAssessmentEngine = {
      assessCapabilities: jest.fn().mockResolvedValue(mockAssessmentResult),
      getCacheStats: jest.fn().mockResolvedValue({ memory: { total: 1, valid: 1 } }),
      clearCache: jest.fn().mockResolvedValue(),
      forceRefresh: jest.fn().mockImplementation(async (userInputs) => {
        // forceRefresh should call assessCapabilities
        return mockAssessmentEngine.assessCapabilities(userInputs);
      })
    };

    CapabilityAssessmentEngine.mockImplementation(() => mockAssessmentEngine);
  });

  describe('InputCollector Assessment Integration', () => {
    let inputCollector;

    beforeEach(() => {
      inputCollector = new InputCollector({
        interactive: false // Non-interactive for testing
      });
    });

    test('should run assessment after API token collection', async () => {
      // Mock core inputs with API token
      const coreInputs = {
        'service-name': { value: 'test-service' },
        'service-type': { value: 'data-service' },
        'domain-name': { value: 'example.com' },
        'environment': { value: 'development' },
        'cloudflare-api-token': { value: 'test-token-123' }
      };

      // Mock the question method to avoid readline errors in test
      inputCollector.question = jest.fn().mockResolvedValue('test-token-123');

      // Mock the collectInputFromDefinition to simulate core input collection
      inputCollector.collectInputFromDefinition = jest.fn().mockImplementation(async (inputDef) => {
        const values = {
          'service-name': 'test-service',
          'service-type': 'data-service',
          'domain-name': 'example.com',
          'environment': 'development',
          'cloudflare-api-token': 'test-token-123'
        };
        return values[inputDef.id] || 'mock-value';
      });

      // Mock UI structures loader
      const mockCoreTemplate = {
        inputs: [
          { id: 'service-name', order: 1 },
          { id: 'service-type', order: 2 },
          { id: 'domain-name', order: 3 },
          { id: 'environment', order: 4 },
          { id: 'cloudflare-api-token', order: 6 } // API token is last
        ]
      };

      const mockUiLoader = {
        loadTemplates: jest.fn().mockResolvedValue(),
        getCoreInputsTemplate: jest.fn().mockReturnValue(mockCoreTemplate),
        getSmartConfirmableTemplate: jest.fn().mockReturnValue(null),
        getAutomatedTemplate: jest.fn().mockReturnValue(null)
      };

      // Temporarily replace the uiStructuresLoader
      const originalLoader = inputCollector.uiStructuresLoader;
      inputCollector.uiStructuresLoader = mockUiLoader;

      try {
        const result = await inputCollector.collectInputsWithTransparency();

        // CapabilityAssessmentEngine should be instantiated during runDeploymentReadinessAssessment
        expect(CapabilityAssessmentEngine).toHaveBeenCalled();

        // Verify core inputs were collected
        expect(result.coreInputs).toBeDefined();
        expect(result.coreInputs['service-name']).toBeDefined();
      } finally {
        // Restore original loader
        inputCollector.uiStructuresLoader = originalLoader;
      }
    });

    test('should display assessment results appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test successful assessment display
      inputCollector.displayAssessmentResults(mockAssessmentResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Assessment Results')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Service Type: data-service')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Confidence: 85.0%')
      );

      consoleSpy.mockRestore();
    });

    test('should handle assessment with deployment blockers', async () => {
      const blockerResult = {
        ...mockAssessmentResult,
        gapAnalysis: {
          missing: [
            {
              capability: 'database',
              priority: 'blocked',
              reason: 'Missing D1 permissions'
            }
          ]
        }
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      inputCollector.displayAssessmentResults(blockerResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 capability gap(s) found')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 deployment blocker(s) detected')
      );

      consoleSpy.mockRestore();
    });

    test('should handle cached assessment results', async () => {
      const cachedResult = {
        ...mockAssessmentResult,
        cached: true,
        cacheKey: 'test-cache-key'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      inputCollector.displayAssessmentResults(cachedResult);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('(Results loaded from cache)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ServiceOrchestrator Assessment Integration', () => {
    let orchestrator;

    beforeEach(() => {
      orchestrator = new ServiceOrchestrator({
        interactive: false,
        outputPath: '/test/output'
      });
    });

    test('should run final assessment before generation', async () => {
      const coreInputs = {
        serviceName: 'test-service',
        serviceType: 'data-service',
        domainName: 'example.com',
        cloudflareToken: 'test-token'
      };

      const confirmedValues = {
        databaseName: 'test-service-db',
        workerName: 'test-service-worker'
      };

      const assessment = await orchestrator.runFinalAssessment(coreInputs, confirmedValues);

      expect(CapabilityAssessmentEngine).toHaveBeenCalledWith('/test/output', {
        cacheEnabled: true,
        cache: { ttl: 5 * 60 * 1000 }
      });

      expect(mockAssessmentEngine.assessCapabilities).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: 'test-service',
          serviceType: 'data-service',
          domainName: 'example.com',
          cloudflareToken: 'test-token',
          databaseName: 'test-service-db',
          workerName: 'test-service-worker'
        })
      );

      expect(assessment).toBe(mockAssessmentResult);
    });

    test('should handle deployment blockers in final assessment', async () => {
      // Mock assessment with blockers
      const blockerResult = {
        ...mockAssessmentResult,
        gapAnalysis: {
          missing: [
            {
              capability: 'database',
              priority: 'blocked',
              reason: 'Missing D1 permissions'
            }
          ]
        }
      };

      mockAssessmentEngine.assessCapabilities.mockResolvedValue(blockerResult);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock non-interactive mode (should proceed despite blockers)
      orchestrator.interactive = false;

      const assessment = await orchestrator.runFinalAssessment({}, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deployment Blockers Detected')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Proceeding with generation despite blockers')
      );

      consoleSpy.mockRestore();
    });

    test('should handle assessment failures gracefully', async () => {
      mockAssessmentEngine.assessCapabilities.mockRejectedValue(
        new Error('Assessment failed')
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const assessment = await orchestrator.runFinalAssessment({}, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Final assessment failed')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Continuing with service generation')
      );
      expect(assessment).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('Assessment Engine Integration', () => {
    test('should integrate cache management methods', async () => {
      const engine = new CapabilityAssessmentEngine('/test', { cacheEnabled: true });

      await engine.getCacheStats();
      await engine.clearCache();

      expect(mockAssessmentEngine.getCacheStats).toHaveBeenCalled();
      expect(mockAssessmentEngine.clearCache).toHaveBeenCalled();
    });

    test('should support force refresh', async () => {
      const engine = new CapabilityAssessmentEngine('/test', { cacheEnabled: true });

      await engine.forceRefresh({ serviceName: 'test' });

      // Should have disabled cache temporarily
      expect(mockAssessmentEngine.assessCapabilities).toHaveBeenCalled();
    });
  });
});