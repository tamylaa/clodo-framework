/**
 * Mock Framework for Integration Testing
 * Provides mock implementations for testing programmatic API consumers
 */

import { getConfig } from '../config/service-schema-config.js';
import { validateServicePayload } from '../validation/payloadValidation.js';

/**
 * Mock Service Orchestrator for testing
 * Provides predictable behavior without file system operations
 */
export class MockServiceOrchestrator {
  constructor() {
    this.createdServices = [];
    this.reset();
  }

  /**
   * Mock service creation - validates payload and stores for testing
   * @param {Object} payload - Service payload to create
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Creation result
   */
  async createService(payload, options = {}) {
    // Validate payload using real validation logic
    const validation = validateServicePayload(payload);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message)
      };
    }

    // Store for testing purposes
    const serviceId = `mock-${payload.serviceName}-${Date.now()}`;
    const servicePath = `/mock/path/${payload.serviceName}`;

    const serviceRecord = {
      ...payload,
      serviceId,
      servicePath,
      createdAt: new Date().toISOString(),
      options
    };

    this.createdServices.push(serviceRecord);

    return {
      success: true,
      serviceId,
      servicePath,
      warnings: validation.warnings.map(w => w.message)
    };
  }

  /**
   * Get all services created during testing
   * @returns {Array} Array of created service records
   */
  getCreatedServices() {
    return [...this.createdServices];
  }

  /**
   * Find a service by name
   * @param {string} serviceName - Name of the service to find
   * @returns {Object|null} Service record or null if not found
   */
  findService(serviceName) {
    return this.createdServices.find(s => s.serviceName === serviceName) || null;
  }

  /**
   * Reset the mock state
   */
  reset() {
    this.createdServices = [];
  }

  /**
   * Get creation statistics
   * @returns {Object} Statistics about mock operations
   */
  getStats() {
    return {
      totalCreated: this.createdServices.length,
      serviceTypes: [...new Set(this.createdServices.map(s => s.serviceType))],
      features: [...new Set(this.createdServices.flatMap(s => s.features || []))]
    };
  }
}

/**
 * Create a complete mock framework for testing
 * @returns {Object} Mock framework with all necessary APIs
 */
export function createMockFramework() {
  const mockOrchestrator = new MockServiceOrchestrator();

  return {
    // Mock ServiceOrchestrator
    ServiceOrchestrator: MockServiceOrchestrator,

    // Mock programmatic creation function
    createService: (payload, options) => mockOrchestrator.createService(payload, options),

    // Mock parameter discovery (returns real parameter definitions)
    getAcceptedParameters: () => {
      const config = getConfig();
      return {
        serviceName: {
          name: 'serviceName',
          type: 'string',
          required: true,
          description: 'Unique identifier for the service',
          validationRules: [
            { rule: 'pattern', value: '^[a-z0-9-]+$', message: 'Lowercase letters, numbers and hyphens only' },
            { rule: 'minLength', value: 3, message: 'At least 3 characters' },
            { rule: 'maxLength', value: 50, message: 'At most 50 characters' }
          ]
        },
        serviceType: {
          name: 'serviceType',
          type: 'string',
          required: true,
          description: 'Type of service to create',
          enum: config.serviceTypes
        },
        domain: {
          name: 'domain',
          type: 'string',
          required: true,
          description: 'Domain for the service',
          validationRules: [
            { rule: 'pattern', value: '^([a-z0-9]+(-[a-z0-9]+)*\\.)+[a-z]{2,}$', message: 'Must be a valid domain' }
          ]
        },
        features: {
          name: 'features',
          type: 'array',
          required: false,
          description: 'Features to enable',
          enum: config.features
        },
        clodo: {
          name: 'clodo',
          type: 'object',
          required: false,
          description: 'Passthrough data for clodo-application specific configuration'
        }
      };
    },

    // Mock framework capabilities
    getFrameworkCapabilities: () => {
      const config = getConfig();
      return {
        version: '4.3.2-mock',
        supportsProgrammaticCreation: true,
        supportedServiceTypes: [...config.serviceTypes],
        supportedFeatures: [...config.features],
        hasParameterDiscovery: true,
        hasUnifiedValidation: true,
        supportsPassthrough: true
      };
    },

    // Mock framework version
    getFrameworkVersion: () => '4.3.2-mock',

    // Access to the underlying mock orchestrator for advanced testing
    _mockOrchestrator: mockOrchestrator
  };
}

/**
 * Helper function to create a mock service payload for testing
 * @param {Object} overrides - Properties to override in the default payload
 * @returns {Object} Complete service payload
 */
export function createMockServicePayload(overrides = {}) {
  return {
    serviceName: 'test-service',
    serviceType: 'api-service',
    domain: 'test.example.com',
    description: 'Test service description',
    features: ['d1', 'metrics'],
    ...overrides
  };
}

/**
 * Helper function to assert service creation results
 * @param {Object} result - Result from createService
 * @param {Object} expected - Expected properties
 */
export function assertServiceCreationResult(result, expected = {}) {
  const defaults = {
    success: true,
    hasServiceId: true,
    hasServicePath: true,
    errorCount: 0,
    warningCount: 0
  };

  const checks = { ...defaults, ...expected };

  if (checks.success) {
    expect(result.success).toBe(true);
    if (checks.hasServiceId) {
      expect(result.serviceId).toBeDefined();
      expect(typeof result.serviceId).toBe('string');
    }
    if (checks.hasServicePath) {
      expect(result.servicePath).toBeDefined();
      expect(typeof result.servicePath).toBe('string');
    }
  } else {
    expect(result.success).toBe(false);
  }

  if (checks.errorCount > 0) {
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors).toHaveLength(checks.errorCount);
  }

  if (checks.warningCount >= 0) {
    if (result.warnings) {
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.warnings).toHaveLength(checks.warningCount);
    }
  }
}