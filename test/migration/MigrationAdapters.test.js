import { jest } from '@jest/globals';

// Mock feature manager
await jest.unstable_mockModule('../../src/config/FeatureManager.js', () => ({
  featureManager: {
    withFeature: jest.fn((feature, enhancedFn, legacyFn) => {
      console.log('withFeature called with:', feature);
      return enhancedFn();
    }),
    getAllFeatures: jest.fn(() => ({
      enhanced_validation: { enabled: true },
      sql_caching: { enabled: false },
      schema_caching: { enabled: true },
      advanced_queries: { enabled: true },
      security_controls: { enabled: true },
      query_caching: { enabled: false },
      advanced_pagination: { enabled: false },
      cache_metrics: { enabled: false },
      debug_logging: { enabled: false },
      enhanced_schema: { enabled: true },
      hook_metrics: { enabled: false },
      hook_timeout: { enabled: false },
      enhanced_hooks: { enabled: true },
      parallel_execution: { enabled: false }
    }))
  },
  FEATURES: {
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

import {
  SchemaManagerAdapter,
  DataServiceAdapter,
  ModuleManagerAdapter,
  MigrationFactory
} from '../../src/migration/MigrationAdapters.js';

// Import the mocked featureManager
import { featureManager } from '../../src/config/FeatureManager.js';

describe('Migration Adapters', () => {
  let mockEnhancedSchemaManager;
  let mockLegacySchemaManager;
  let mockEnhancedDataService;
  let mockEnhancedModuleManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on featureManager methods
    jest.spyOn(featureManager, 'withFeature').mockImplementation((feature, enhancedFn, legacyFn) => {
      return enhancedFn();
    });

    // Mock enhanced components
    mockEnhancedSchemaManager = {
      validateData: jest.fn(() => ({ valid: true, errors: [] })),
      generateCreateSQL: jest.fn(() => 'CREATE TABLE test'),
      getSchema: jest.fn(() => ({ fields: [] })),
      getSchemaFromConfig: jest.fn(() => ({ fields: [] })),
      addTable: jest.fn(() => true)
    };

    mockLegacySchemaManager = {
      validateData: jest.fn(() => ({ valid: true, errors: [] })),
      generateCreateSQL: jest.fn(() => 'CREATE TABLE legacy_test'),
      getSchema: jest.fn(() => ({ fields: [] }))
    };

    mockEnhancedDataService = {
      query: jest.fn(() => []),
      create: jest.fn(() => ({ id: 1 })),
      update: jest.fn(() => ({ id: 1 })),
      delete: jest.fn(() => true),
      getMigrationStats: jest.fn(() => ({
        callCounts: { query: 10, create: 5 },
        cacheHitRates: { query: 0.8 }
      }))
    };

    mockEnhancedModuleManager = {
      registerModule: jest.fn(() => true),
      unregisterModule: jest.fn(() => true),
      getModule: jest.fn(() => ({ name: 'test' })),
      executeHook: jest.fn(() => ({ success: true })),
      executeHooks: jest.fn(() => [{ success: true }]),
      getMigrationStats: jest.fn(() => ({
        hookExecutions: { 'pre-deploy': 5 },
        timeoutEvents: { 'slow-hook': 1 }
      }))
    };
  });

  describe('SchemaManagerAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new SchemaManagerAdapter(mockEnhancedSchemaManager, mockLegacySchemaManager);
    });

    test('should initialize with enhanced and legacy managers', () => {
      expect(adapter.enhanced).toBe(mockEnhancedSchemaManager);
      expect(adapter.legacy).toBe(mockLegacySchemaManager);
      expect(adapter.migrationState.callCounts).toBeInstanceOf(Map);
    });

    test('should validate data using enhanced validation when feature enabled', () => {
      const result = adapter.validateData('users', { name: 'test' });

      expect(mockEnhancedSchemaManager.validateData).toHaveBeenCalledWith('users', { name: 'test' }, {
        comprehensive: true,
        returnDetailedErrors: true
      });
      expect(result.valid).toBe(true);
    });

    test('should generate SQL with caching when feature enabled', () => {
      const result = adapter.generateCreateSQL('users', { columns: ['id', 'name'] });

      expect(mockEnhancedSchemaManager.generateCreateSQL).toHaveBeenCalledWith('users', {
        columns: ['id', 'name'],
        useCache: true
      });
      expect(result).toBe('CREATE TABLE test');
    });

    test('should get schema with caching when feature enabled', () => {
      const result = adapter.getSchema('users');

      expect(mockEnhancedSchemaManager.getSchema).toHaveBeenCalledWith('users');
      expect(result).toEqual({ fields: [] });
    });

    test('should track migration call counts', () => {
      adapter.validateData('users', {});
      adapter.generateCreateSQL('users');

      expect(adapter.migrationState.callCounts.get('validateData')).toBe(1);
      expect(adapter.migrationState.callCounts.get('generateCreateSQL')).toBe(1);
    });
  });

  describe('DataServiceAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new DataServiceAdapter(mockEnhancedDataService);
    });

    test('should initialize correctly', () => {
      expect(adapter.enhanced).toBe(mockEnhancedDataService);
      expect(adapter.migrationState).toBeDefined();
    });

    test('should delegate query operations', async () => {
      const result = await adapter.query('SELECT * FROM users');

      expect(mockEnhancedDataService.query).toHaveBeenCalledWith('SELECT * FROM users', [], {
        usePreparedStatements: true,
        enableQueryAnalysis: true
      });
      expect(result).toEqual([]);
    });

    test('should delegate create operations', async () => {
      const result = await adapter.create('users', { name: 'test' });

      expect(mockEnhancedDataService.create).toHaveBeenCalledWith('users', { name: 'test' }, {
        validateSecurity: true,
        auditAction: true
      });
      expect(result).toEqual({ id: 1 });
    });

    test('should provide migration statistics', () => {
      const stats = adapter.getMigrationStats();

      expect(stats.callCounts).toEqual({ query: 10, create: 5 });
      expect(stats.cacheHitRates).toEqual({ query: 0.8 });
    });
  });

  describe('ModuleManagerAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new ModuleManagerAdapter(mockEnhancedModuleManager);
    });

    test('should initialize correctly', () => {
      expect(adapter.enhanced).toBe(mockEnhancedModuleManager);
    });

    test('should delegate module registration', async () => {
      const result = await adapter.registerModule('test', {});

      expect(mockEnhancedModuleManager.registerModule).toHaveBeenCalledWith('test', {}, {
        enableMetrics: false,
        enableTimeout: false
      });
      expect(result).toBe(true);
    });

    test('should delegate hook execution', async () => {
      const result = await adapter.executeHook('pre-deploy', {});

      expect(mockEnhancedModuleManager.executeHooks).toHaveBeenCalledWith('pre-deploy', {}, {
        enableTimeout: false,
        enableMetrics: false,
        parallelExecution: false
      });
      expect(result).toEqual({ success: true });
    });

    test('should provide migration statistics', () => {
      const stats = adapter.getMigrationStats();

      expect(stats.hookExecutions).toEqual({ 'pre-deploy': 5 });
      expect(stats.timeoutEvents).toEqual({ 'slow-hook': 1 });
    });
  });

  describe('MigrationFactory', () => {
    describe('Adapter Creation', () => {
      test('should create SchemaManagerAdapter', () => {
        const adapter = MigrationFactory.createSchemaManagerAdapter(
          mockEnhancedSchemaManager,
          mockLegacySchemaManager
        );

        expect(adapter).toBeInstanceOf(SchemaManagerAdapter);
        expect(adapter.enhanced).toBe(mockEnhancedSchemaManager);
        expect(adapter.legacy).toBe(mockLegacySchemaManager);
      });

      test('should create DataServiceAdapter', () => {
        const adapter = MigrationFactory.createDataServiceAdapter(mockEnhancedDataService);

        expect(adapter).toBeInstanceOf(DataServiceAdapter);
        expect(adapter.enhanced).toBe(mockEnhancedDataService);
      });

      test('should create ModuleManagerAdapter', () => {
        const adapter = MigrationFactory.createModuleManagerAdapter(mockEnhancedModuleManager);

        expect(adapter).toBeInstanceOf(ModuleManagerAdapter);
        expect(adapter.enhanced).toBe(mockEnhancedModuleManager);
      });
    });

    describe('Migration Suite', () => {
      test('should create complete migration suite', () => {
        const enhancedComponents = {
          schemaManager: mockEnhancedSchemaManager,
          dataService: mockEnhancedDataService,
          moduleManager: mockEnhancedModuleManager
        };

        const suite = MigrationFactory.createMigrationSuite(enhancedComponents);

        expect(suite.schemaManager).toBeInstanceOf(SchemaManagerAdapter);
        expect(suite.dataService).toBeInstanceOf(DataServiceAdapter);
        expect(suite.moduleManager).toBeInstanceOf(ModuleManagerAdapter);
        expect(typeof suite.getMigrationStats).toBe('function');
        expect(typeof suite.generateMigrationReport).toBe('function');
      });

      test('should generate migration statistics', () => {
        const enhancedComponents = {
          schemaManager: mockEnhancedSchemaManager,
          dataService: mockEnhancedDataService,
          moduleManager: mockEnhancedModuleManager
        };

        const suite = MigrationFactory.createMigrationSuite(enhancedComponents);
        const stats = suite.getMigrationStats();

        expect(stats).toHaveProperty('schemaManager');
        expect(stats).toHaveProperty('dataService');
        expect(stats).toHaveProperty('moduleManager');
        expect(stats).toHaveProperty('overallFeatureUsage');
      });

      test('should generate migration report', () => {
        const enhancedComponents = {
          schemaManager: mockEnhancedSchemaManager,
          dataService: mockEnhancedDataService,
          moduleManager: mockEnhancedModuleManager
        };

        const suite = MigrationFactory.createMigrationSuite(enhancedComponents);
        const report = suite.generateMigrationReport();

        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('details');
        expect(report).toHaveProperty('recommendations');
        expect(report.summary).toHaveProperty('totalCalls');
        expect(report.summary).toHaveProperty('featuresEnabled');
        expect(Array.isArray(report.recommendations)).toBe(true);
      });

      test('should generate recommendations based on stats', () => {
        const enhancedComponents = {
          schemaManager: mockEnhancedSchemaManager,
          dataService: mockEnhancedDataService,
          moduleManager: mockEnhancedModuleManager
        };

        const suite = MigrationFactory.createMigrationSuite(enhancedComponents);
        const report = suite.generateMigrationReport();

        // Should have recommendations based on mock data
        expect(report.recommendations.length).toBeGreaterThan(0);
      });
    });
  });
});