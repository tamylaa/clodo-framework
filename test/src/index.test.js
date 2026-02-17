import { jest } from '@jest/globals';

// Mock missing dependencies before importing the main module
await jest.unstable_mockModule('../../src/config/features.js', () => ({
  FeatureFlagManager: class FeatureFlagManager {
    constructor() { this.features = new Map(); }
    isEnabled() { return false; }
    enable() {}
    disable() {}
    withFeature(f, fn) { return fn(); }
    getAllFeatures() { return {}; }
  },
  featureManager: { isEnabled: jest.fn(), enable: jest.fn(), disable: jest.fn(), withFeature: jest.fn(), getAllFeatures: jest.fn(() => ({})), features: new Map() },
  FEATURES: {
    ENHANCED_SCHEMA: 'enhanced_schema',
    ENHANCED_VALIDATION: 'enhanced_validation',
    ENABLE_COMPREHENSIVE_VALIDATION: 'enhanced_validation',
    ENABLE_SQL_CACHING: 'sql_caching',
    ENABLE_SCHEMA_CACHING: 'schema_caching',
    ENABLE_ADVANCED_QUERIES: 'advanced_queries',
    ENABLE_SECURITY_CONTROLS: 'security_controls',
    ENABLE_QUERY_CACHING: 'query_caching',
    ENABLE_ADVANCED_PAGINATION: 'advanced_pagination',
    ENABLE_CACHE_METRICS: 'cache_metrics',
    ENABLE_DEBUG_LOGGING: 'debug_logging',
    ENABLE_ENHANCED_SCHEMA: 'enhanced_schema',
    ENABLE_HOOK_METRICS: 'hook_metrics',
    ENABLE_HOOK_TIMEOUT: 'hook_timeout',
    ENABLE_ENHANCED_HOOKS: 'enhanced_hooks',
    ENABLE_PARALLEL_EXECUTION: 'parallel_execution'
  }
}));

await jest.unstable_mockModule('../../src/utils/domain-config.js', () => ({
  createDomainConfigSchema: jest.fn(),
  validateDomainConfig: jest.fn(),
  createDefaultDomainConfig: jest.fn()
}));

await jest.unstable_mockModule('../../src/worker/integration.js', () => ({
  initializeService: jest.fn(),
  createFeatureGuard: jest.fn()
}));

// Mock all other exports to avoid import errors
await jest.unstable_mockModule('../../src/services/GenericDataService.js', () => ({}));
await jest.unstable_mockModule('../../src/schema/SchemaManager.js', () => ({}));
await jest.unstable_mockModule('../../src/modules/ModuleManager.js', () => ({}));
await jest.unstable_mockModule('../../src/routing/EnhancedRouter.js', () => ({}));
await jest.unstable_mockModule('../../src/handlers/GenericRouteHandler.js', () => ({}));
await jest.unstable_mockModule('../../src/deployment/wrangler-deployer.js', () => ({
  WranglerDeployer: class WranglerDeployer {}
}));
await jest.unstable_mockModule('../../src/security/index.js', () => ({}));
await jest.unstable_mockModule('../../src/service-management/ServiceCreator.js', () => ({
  ServiceCreator: class ServiceCreator {},
  createService: jest.fn()
}));
await jest.unstable_mockModule('../../src/service-management/ServiceOrchestrator.js', () => ({
  ServiceOrchestrator: class ServiceOrchestrator {}
}));
await jest.unstable_mockModule('../../src/service-management/handlers/InputHandler.js', () => ({
  InputHandler: class InputHandler {}
}));
await jest.unstable_mockModule('../../src/service-management/handlers/ConfirmationHandler.js', () => ({
  ConfirmationHandler: class ConfirmationHandler {}
}));
await jest.unstable_mockModule('../../src/service-management/handlers/GenerationHandler.js', () => ({
  GenerationHandler: class GenerationHandler {}
}));
await jest.unstable_mockModule('../../src/service-management/handlers/ValidationHandler.js', () => ({
  ValidationHandler: class ValidationHandler {}
}));

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));

const {
  FRAMEWORK_VERSION,
  FRAMEWORK_NAME,
  initializeFramework,
  default: defaultExport
} = await import('../../src/index.js');

describe('Clodo Framework Main Entry Point', () => {
  describe('Framework Constants', () => {
    test('should export correct framework version', () => {
      // Should match package.json version
      expect(FRAMEWORK_VERSION).toBe(pkg.version);
    });

    test('should export correct framework name', () => {
      expect(FRAMEWORK_NAME).toBe('Clodo Framework');
    });
  });

  describe('initializeFramework', () => {
    test('should initialize framework with default options', () => {
      const result = initializeFramework();

      expect(result).toEqual({
        version: pkg.version,
        name: 'Clodo Framework',
        options: {}
      });
    });

    test('should initialize framework with custom options', () => {
      const customOptions = { debug: true, environment: 'test' };
      const result = initializeFramework(customOptions);

      expect(result).toEqual({
        version: pkg.version,
        name: 'Clodo Framework',
        options: customOptions
      });
    });

    test('should log initialization message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      initializeFramework({ verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(`Clodo Framework v${pkg.version} initialized`);

      consoleSpy.mockRestore();
    });
  });

  describe('Default Export', () => {
    test('should export default worker handler', () => {
      expect(typeof defaultExport.fetch).toBe('function');
    });

    test('should handle fetch requests with default response', async () => {
      const mockRequest = {};
      const mockEnv = {};
      const mockCtx = {};

      const response = await defaultExport.fetch(mockRequest, mockEnv, mockCtx);

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);

      const text = await response.text();
      expect(text).toBe('CLODO Framework Worker');
    });

    test('should set correct content type header', async () => {
      const response = await defaultExport.fetch({}, {}, {});

      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });
  });

  describe('Module Exports', () => {
    test('should export core framework classes', () => {
      // Test that key exports are available (imports tested implicitly)
      expect(FRAMEWORK_VERSION).toBeDefined();
      expect(FRAMEWORK_NAME).toBeDefined();
      expect(initializeFramework).toBeDefined();
      expect(defaultExport).toBeDefined();
    });
  });
});
