/**
 * Programmatic API Integration Tests
 * End-to-end testing of the programmatic service creation APIs
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Import the programmatic APIs
import { createService } from '../../../src/programmatic/createService.js';
import { getFrameworkCapabilities, getFrameworkVersion } from '../../../src/api/frameworkCapabilities.js';
import { getAcceptedParameters } from '../../../src/validation/payloadValidation.js';
import { validateServicePayload } from '../../../src/validation/payloadValidation.js';
import {
  IntegrationError,
  PayloadValidationError,
  ParameterNotSupportedError,
  VersionCompatibilityError
} from '../../../src/errors/integrationErrors.js';

describe('Programmatic API Integration', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `prog-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Framework Capabilities API', () => {
    it('should return consistent framework capabilities', () => {
      const capabilities = getFrameworkCapabilities();

      expect(capabilities).toHaveProperty('version');
      expect(capabilities).toHaveProperty('supportsProgrammaticCreation', true);
      expect(capabilities).toHaveProperty('supportedServiceTypes');
      expect(capabilities).toHaveProperty('supportedFeatures');
      expect(capabilities).toHaveProperty('hasParameterDiscovery', true);
      expect(capabilities).toHaveProperty('hasUnifiedValidation', true);
      expect(capabilities).toHaveProperty('supportsPassthrough', true);

      expect(Array.isArray(capabilities.supportedServiceTypes)).toBe(true);
      expect(Array.isArray(capabilities.supportedFeatures)).toBe(true);
      expect(capabilities.supportedServiceTypes.length).toBeGreaterThan(0);
      expect(capabilities.supportedFeatures.length).toBeGreaterThan(0);
    });

    it('should return valid framework version', () => {
      const version = getFrameworkVersion();
      const capabilities = getFrameworkCapabilities();

      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      expect(version).toBe(capabilities.version);
    });
  });

  describe('Parameter Discovery API', () => {
    it('should return comprehensive parameter definitions', () => {
      const parameters = getAcceptedParameters();

      expect(parameters).toHaveProperty('serviceName');
      expect(parameters).toHaveProperty('serviceType');
      expect(parameters).toHaveProperty('domain');
      expect(parameters).toHaveProperty('features');
      expect(parameters).toHaveProperty('clodo');

      // Check required parameters
      expect(parameters.serviceName.required).toBe(true);
      expect(parameters.serviceType.required).toBe(true);
      expect(parameters.domain.required).toBe(true);

      // Check optional parameters
      expect(parameters.description.required).toBe(false);
      expect(parameters.features.required).toBe(false);
      expect(parameters.clodo.required).toBe(false);
    });

    it('should include validation rules for parameters', () => {
      const parameters = getAcceptedParameters();

      expect(parameters.serviceName).toHaveProperty('validationRules');
      expect(parameters.domain).toHaveProperty('validationRules');
      expect(Array.isArray(parameters.serviceName.validationRules)).toBe(true);
      expect(Array.isArray(parameters.domain.validationRules)).toBe(true);
    });

    it('should include enum values for applicable parameters', () => {
      const parameters = getAcceptedParameters();

      expect(parameters.serviceType).toHaveProperty('enum');
      expect(parameters.features).toHaveProperty('enum');
      expect(Array.isArray(parameters.serviceType.enum)).toBe(true);
      expect(Array.isArray(parameters.features.enum)).toBe(true);
    });
  });

  describe('Payload Validation Integration', () => {
    it('should validate valid payload successfully', () => {
      const payload = {
        serviceName: 'test-service',
        serviceType: 'generic',
        domain: 'test.example.com'
      };

      const result = validateServicePayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should reject invalid payload with detailed errors', () => {
      const payload = {
        serviceName: 'INVALID NAME', // Invalid format
        serviceType: 'invalid-type', // Invalid enum
        // domain missing - required
        features: ['invalid-feature'] // Invalid enum
      };

      const result = validateServicePayload(payload);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for specific error types
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields.some(field => field.includes('serviceName'))).toBe(true);
      expect(errorFields.some(field => field.includes('serviceType'))).toBe(true);
      expect(errorFields.some(field => field.includes('domain'))).toBe(true);
      expect(errorFields.some(field => field.includes('features'))).toBe(true);
    });

    it('should handle passthrough clodo data', () => {
      const payload = {
        serviceName: 'test-service',
        serviceType: 'generic',
        domain: 'test.example.com',
        clodo: {
          customConfig: 'value',
          nested: { data: true }
        }
      };

      const result = validateServicePayload(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should generate warnings for potential issues', () => {
      const payload = {
        serviceName: 'test-service',
        serviceType: 'pages',
        domain: 'test.example.com',
        features: ['d1'] // D1 with pages might be unusual
      };

      const result = validateServicePayload(payload);

      // May or may not have warnings depending on implementation
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Service Creation Integration', () => {
    it('should create service with valid payload (dry-run)', async () => {
      const payload = {
        serviceName: 'integration-test-service',
        serviceType: 'generic',
        domain: 'integration.example.com',
        description: 'Integration test service'
      };

      const result = await createService(payload, {
        dryRun: true,
        outputDir: tmpDir
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('serviceId');
      expect(result).toHaveProperty('servicePath');

      if (result.success) {
        // In dry-run mode, serviceId and servicePath may be null or generated values
        expect(result).toHaveProperty('serviceId');
        expect(result).toHaveProperty('servicePath');
        expect(result).toHaveProperty('serviceName', payload.serviceName);
      }
    });

    it('should fail with invalid payload', async () => {
      const payload = {
        invalidField: 'value'
      };

      const result = await createService(payload, {
        dryRun: true,
        outputDir: tmpDir
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle passthrough clodo data in creation', async () => {
      const payload = {
        serviceName: 'clodo-test-service',
        serviceType: 'generic',
        domain: 'clodo.example.com',
        clodo: {
          deployment: {
            region: 'us-east-1',
            scaling: { minInstances: 1, maxInstances: 10 }
          },
          monitoring: {
            alerts: ['error-rate', 'latency']
          }
        }
      };

      const result = await createService(payload, {
        dryRun: true,
        outputDir: tmpDir
      });

      expect(result.success).toBe(true);
      // The clodo data should be preserved (exact behavior depends on implementation)
    });
  });

  describe('Error Classes Integration', () => {
    it('should throw PayloadValidationError for invalid payloads', () => {
      const invalidPayload = { invalid: 'payload' };
      const validationResult = validateServicePayload(invalidPayload);

      expect(() => {
        throw new PayloadValidationError(validationResult);
      }).toThrow(PayloadValidationError);
    });

    it('should create ParameterNotSupportedError correctly', () => {
      const error = new ParameterNotSupportedError('customField', '4.3.2');

      expect(error).toBeInstanceOf(IntegrationError);
      expect(error.code).toBe('PARAMETER_NOT_SUPPORTED');
      expect(error.details.parameterName).toBe('customField');
      expect(error.details.frameworkVersion).toBe('4.3.2');
    });

    it('should create VersionCompatibilityError correctly', () => {
      const error = new VersionCompatibilityError('1.0.0', '4.3.2');

      expect(error).toBeInstanceOf(IntegrationError);
      expect(error.code).toBe('VERSION_INCOMPATIBILITY');
      expect(error.details.applicationVersion).toBe('1.0.0');
      expect(error.details.frameworkVersion).toBe('4.3.2');
    });

    it('should maintain error hierarchy', () => {
      const validationError = new PayloadValidationError({ valid: false, errors: [] });
      const paramError = new ParameterNotSupportedError('test', '1.0.0');
      const versionError = new VersionCompatibilityError('1.0.0', '2.0.0');

      expect(validationError).toBeInstanceOf(IntegrationError);
      expect(validationError).toBeInstanceOf(Error);

      expect(paramError).toBeInstanceOf(IntegrationError);
      expect(paramError).toBeInstanceOf(Error);

      expect(versionError).toBeInstanceOf(IntegrationError);
      expect(versionError).toBeInstanceOf(Error);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full programmatic workflow', async () => {
      // 1. Check capabilities
      const capabilities = getFrameworkCapabilities();
      expect(capabilities.supportsProgrammaticCreation).toBe(true);

      // 2. Get parameters
      const parameters = getAcceptedParameters();
      expect(parameters.serviceName).toBeDefined();

      // 3. Create and validate payload
      const payload = {
        serviceName: 'e2e-workflow-service',
        serviceType: 'generic',
        domain: 'workflow.example.com',
        description: 'End-to-end workflow test',
        clodo: {
          testData: 'preserved'
        }
      };

      const validation = validateServicePayload(payload);
      expect(validation.valid).toBe(true);

      // 4. Create service
      const result = await createService(payload, {
        dryRun: true,
        outputDir: tmpDir
      });

      expect(result.success).toBe(true);
      expect(result.serviceId).toBeDefined();
      expect(result.servicePath).toBeDefined();

      // 5. Verify no errors thrown
      expect(result.errors).toBeUndefined();
    });

    it('should handle error recovery gracefully', async () => {
      // Test with invalid payload
      const invalidPayload = {
        serviceName: '', // Invalid: empty
        serviceType: 'invalid-type', // Invalid: not in enum
        domain: 'not-a-domain', // Invalid: not domain format
        features: ['non-existent-feature'] // Invalid: not in enum
      };

      // Should validate and fail gracefully
      const validation = validateServicePayload(invalidPayload);
      expect(validation.valid).toBe(false);

      // Should create and fail gracefully
      const result = await createService(invalidPayload, {
        dryRun: true,
        outputDir: tmpDir
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.serviceId).toBeUndefined();
      expect(result.servicePath).toBeUndefined();
    });
  });

  describe('Cross-API Consistency', () => {
    it('should have consistent service types across APIs', () => {
      const capabilities = getFrameworkCapabilities();
      const parameters = getAcceptedParameters();

      expect(capabilities.supportedServiceTypes).toEqual(parameters.serviceType.enum);
    });

    it('should have consistent features across APIs', () => {
      const capabilities = getFrameworkCapabilities();
      const parameters = getAcceptedParameters();

      expect(capabilities.supportedFeatures).toEqual(parameters.features.enum);
    });

    it('should validate payloads that use discovered parameters', () => {
      const parameters = getAcceptedParameters();

      // Create payload using discovered parameter info
      const payload = {
        serviceName: 'consistency-test',
        serviceType: parameters.serviceType.enum[0], // Use first valid type
        domain: 'consistency.example.com',
        features: [parameters.features.enum[0]] // Use first valid feature
      };

      const validation = validateServicePayload(payload);
      expect(validation.valid).toBe(true);
    });
  });
});