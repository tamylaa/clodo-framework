/**
 * Mock Framework Tests
 */

import {
  MockServiceOrchestrator,
  createMockFramework,
  createMockServicePayload,
  assertServiceCreationResult
} from '../../src/testing/mockFramework.js';

describe('MockServiceOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MockServiceOrchestrator();
  });

  describe('createService', () => {
    it('should create service successfully with valid payload', async () => {
      const payload = createMockServicePayload();

      const result = await orchestrator.createService(payload);

      expect(result.success).toBe(true);
      expect(result.serviceId).toMatch(/^mock-test-service-\d+$/);
      expect(result.servicePath).toBe('/mock/path/test-service');
      expect(result.warnings).toEqual([]);
    });

    it('should reject invalid payload', async () => {
      const payload = { invalid: 'payload' };

      const result = await orchestrator.createService(payload);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should store created services', async () => {
      const payload1 = createMockServicePayload({ serviceName: 'service1' });
      const payload2 = createMockServicePayload({ serviceName: 'service2' });

      await orchestrator.createService(payload1);
      await orchestrator.createService(payload2);

      const services = orchestrator.getCreatedServices();
      expect(services).toHaveLength(2);
      expect(services[0].serviceName).toBe('service1');
      expect(services[1].serviceName).toBe('service2');
    });
  });

  describe('getCreatedServices', () => {
    it('should return copy of services array', async () => {
      const payload = createMockServicePayload();
      await orchestrator.createService(payload);

      const services1 = orchestrator.getCreatedServices();
      const services2 = orchestrator.getCreatedServices();

      expect(services1).not.toBe(services2); // Different references
      expect(services1).toEqual(services2); // Same content
    });
  });

  describe('findService', () => {
    it('should find service by name', async () => {
      const payload = createMockServicePayload({ serviceName: 'find-me' });
      await orchestrator.createService(payload);

      const found = orchestrator.findService('find-me');
      expect(found).toBeDefined();
      expect(found.serviceName).toBe('find-me');

      const notFound = orchestrator.findService('not-there');
      expect(notFound).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all services', async () => {
      const payload = createMockServicePayload();
      await orchestrator.createService(payload);

      expect(orchestrator.getCreatedServices()).toHaveLength(1);

      orchestrator.reset();

      expect(orchestrator.getCreatedServices()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return creation statistics', async () => {
      await orchestrator.createService(createMockServicePayload({
        serviceName: 'api-svc',
        serviceType: 'api-service',
        features: ['d1', 'metrics']
      }));

      await orchestrator.createService(createMockServicePayload({
        serviceName: 'data-svc',
        serviceType: 'data-service',
        features: ['d1', 'upstash']
      }));

      const stats = orchestrator.getStats();

      expect(stats.totalCreated).toBe(2);
      expect(stats.serviceTypes).toEqual(['api-service', 'data-service']);
      expect(stats.features).toEqual(['d1', 'metrics', 'upstash']);
    });
  });
});

describe('createMockFramework', () => {
  let mockFramework;

  beforeEach(() => {
    mockFramework = createMockFramework();
  });

  it('should create complete mock framework', () => {
    expect(mockFramework.ServiceOrchestrator).toBe(MockServiceOrchestrator);
    expect(typeof mockFramework.createService).toBe('function');
    expect(typeof mockFramework.getAcceptedParameters).toBe('function');
    expect(typeof mockFramework.getFrameworkCapabilities).toBe('function');
    expect(typeof mockFramework.getFrameworkVersion).toBe('function');
    expect(mockFramework._mockOrchestrator).toBeInstanceOf(MockServiceOrchestrator);
  });

  it('should provide working createService function', async () => {
    const payload = createMockServicePayload();
    const result = await mockFramework.createService(payload);

    expect(result.success).toBe(true);
    expect(result.serviceId).toBeDefined();
  });

  it('should provide parameter definitions', () => {
    const params = mockFramework.getAcceptedParameters();

    expect(params.serviceName).toBeDefined();
    expect(params.serviceType).toBeDefined();
    expect(params.domain).toBeDefined();
    expect(params.features).toBeDefined();
    expect(params.clodo).toBeDefined();
  });

  it('should provide framework capabilities', () => {
    const capabilities = mockFramework.getFrameworkCapabilities();

    expect(capabilities.version).toBe('4.3.2-mock');
    expect(capabilities.supportsProgrammaticCreation).toBe(true);
    expect(capabilities.hasParameterDiscovery).toBe(true);
    expect(capabilities.hasUnifiedValidation).toBe(true);
    expect(capabilities.supportsPassthrough).toBe(true);
  });

  it('should provide framework version', () => {
    const version = mockFramework.getFrameworkVersion();
    expect(version).toBe('4.3.2-mock');
  });
});

describe('createMockServicePayload', () => {
  it('should create valid payload with defaults', () => {
    const payload = createMockServicePayload();

    expect(payload.serviceName).toBe('test-service');
    expect(payload.serviceType).toBe('api-service');
    expect(payload.domain).toBe('test.example.com');
    expect(payload.description).toBe('Test service description');
    expect(payload.features).toEqual(['d1', 'metrics']);
  });

  it('should override defaults', () => {
    const payload = createMockServicePayload({
      serviceName: 'custom-service',
      serviceType: 'data-service',
      features: ['upstash']
    });

    expect(payload.serviceName).toBe('custom-service');
    expect(payload.serviceType).toBe('data-service');
    expect(payload.features).toEqual(['upstash']);
  });
});

describe('assertServiceCreationResult', () => {
  it('should assert successful creation', () => {
    const result = {
      success: true,
      serviceId: 'test-id',
      servicePath: '/test/path',
      warnings: []
    };

    expect(() => assertServiceCreationResult(result)).not.toThrow();
  });

  it('should assert failed creation', () => {
    const result = {
      success: false,
      errors: ['Invalid payload']
    };

    expect(() => assertServiceCreationResult(result, { success: false, errorCount: 1 })).not.toThrow();
  });

  it('should throw on assertion failure', () => {
    const result = {
      success: false,
      errors: []
    };

    expect(() => assertServiceCreationResult(result, { success: true })).toThrow();
  });
});