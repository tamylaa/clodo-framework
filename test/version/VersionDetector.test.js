import { jest } from '@jest/globals';

// Mock dependencies
await jest.unstable_mockModule('../../src/config/FeatureManager.js', () => ({
  featureManager: {
    isEnabled: jest.fn(() => true),
    getFeatures: jest.fn(() => ({}))
  },
  FEATURES: {
    ENHANCED_SCHEMA: 'enhanced_schema',
    ENHANCED_VALIDATION: 'enhanced_validation'
  }
}));

await jest.unstable_mockModule('../../src/migration/MigrationAdapters.js', () => ({
  MigrationFactory: {
    createAdapter: jest.fn(() => ({ adapt: jest.fn() }))
  }
}));

import { VersionDetector } from '../../src/version/VersionDetector.js';

describe('VersionDetector', () => {
  let detector;

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new VersionDetector();
  });

  describe('constructor', () => {
    test('should initialize with empty caches and matrices', () => {
      expect(detector.detectionCache).toBeInstanceOf(Map);
      expect(detector.compatibilityMatrix).toBeInstanceOf(Map);
      expect(detector.versionHistory).toEqual([]);
      expect(detector.currentVersion).toBeDefined();
    });

    test('should initialize compatibility matrix', () => {
      expect(detector.compatibilityMatrix.size).toBeGreaterThan(0);
    });
  });

  describe('detectVersion', () => {
    test('should return cached version on subsequent calls', () => {
      const firstCall = detector.detectVersion();
      const secondCall = detector.detectVersion();

      expect(firstCall).toBe(secondCall);
      expect(detector.detectionCache.has('framework_version')).toBe(true);
    });

    test('should return version information object', () => {
      const version = detector.detectVersion();

      expect(version).toHaveProperty('version');
      expect(version).toHaveProperty('major');
      expect(version).toHaveProperty('minor');
      expect(version).toHaveProperty('patch');
      expect(typeof version.version).toBe('string');
    });
  });

  describe('checkCompatibility', () => {
    test('should return cached compatibility result', () => {
      const firstCall = detector.checkCompatibility('1.0.0', '2.0.0');
      const secondCall = detector.checkCompatibility('1.0.0', '2.0.0');

      expect(firstCall).toBe(secondCall);
    });

    test('should return compatibility information', () => {
      const compatibility = detector.checkCompatibility('1.0.0', '2.0.0');

      expect(compatibility).toHaveProperty('source');
      expect(compatibility).toHaveProperty('target');
      expect(compatibility).toHaveProperty('compatible');
      expect(compatibility.source).toBe('1.0.0');
      expect(compatibility.target).toBe('2.0.0');
    });

    test('should handle unknown version combinations', () => {
      const compatibility = detector.checkCompatibility('9.9.9', '9.9.8');

      expect(compatibility).toHaveProperty('compatible');
      expect(compatibility).toHaveProperty('requiresAdapters');
    });
  });

  describe('getRecommendedImplementation', () => {
    test('should return implementation recommendation', () => {
      const recommendation = detector.getRecommendedImplementation('schemaManager');

      expect(recommendation).toHaveProperty('componentType');
      expect(recommendation).toHaveProperty('version');
      expect(recommendation).toHaveProperty('implementation');
      expect(recommendation).toHaveProperty('features');
      expect(recommendation).toHaveProperty('migrationPath');
      expect(recommendation).toHaveProperty('compatibility');
      expect(recommendation.componentType).toBe('schemaManager');
    });

    test('should accept options parameter', () => {
      const options = { preferLegacy: true };
      const recommendation = detector.getRecommendedImplementation('dataService', options);

      expect(recommendation.componentType).toBe('dataService');
    });
  });

  describe('autoConfigureFramework', () => {
    test('should return configuration object', () => {
      const config = detector.autoConfigureFramework();

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('capabilities');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('components');
      expect(config).toHaveProperty('migration');
    });

    test('should apply feature overrides', () => {
      const overrides = {
        features: {
          customFeature: true
        }
      };

      const config = detector.autoConfigureFramework(overrides);

      expect(config.features.customFeature).toBe(true);
    });
  });

  describe('createVersionAdapters', () => {
    test('should create adapters based on version compatibility', () => {
      const components = {
        schemaManager: {},
        dataService: {}
      };

      const adapters = detector.createVersionAdapters(components);

      expect(adapters).toBeDefined();
      // Adapters structure depends on version compatibility
    });

    test('should handle components requiring adapters', () => {
      // Mock a version that requires adapters
      const mockVersion = { version: '1.0.0' };
      detector.detectVersion = jest.fn(() => mockVersion);

      const components = { testComponent: {} };
      const adapters = detector.createVersionAdapters(components);

      expect(adapters).toBeDefined();
    });
  });

  describe('generateMigrationStrategy', () => {
    test('should generate migration strategy for version upgrade', () => {
      const strategy = detector.generateMigrationStrategy('2.0.0');

      expect(strategy).toHaveProperty('sourceVersion');
      expect(strategy).toHaveProperty('targetVersion');
      expect(strategy).toHaveProperty('compatibility');
      expect(strategy).toHaveProperty('strategy');
      expect(strategy).toHaveProperty('phases');
      expect(strategy).toHaveProperty('risks');
      expect(strategy).toHaveProperty('timeline');
      expect(strategy.targetVersion).toBe('2.0.0');
    });

    test('should include current version as source', () => {
      const currentVersion = detector.detectVersion();
      const strategy = detector.generateMigrationStrategy('2.1.0');

      expect(strategy.sourceVersion).toBe(currentVersion.version);
    });
  });

  describe('Compatibility Matrix', () => {
    test('should have predefined compatibility rules', () => {
      expect(detector.compatibilityMatrix.has('1.0.0->2.0.0')).toBe(true);
      expect(detector.compatibilityMatrix.has('1.1.0->2.0.0')).toBe(true);
      expect(detector.compatibilityMatrix.has('2.0.0->2.1.0')).toBe(true);
    });

    test('should store compatibility rule details', () => {
      const rule = detector.compatibilityMatrix.get('1.0.0->2.0.0');

      expect(rule.compatible).toBe(true);
      expect(rule.requiresAdapters).toBe(true);
      expect(rule.migrationComplexity).toBe('medium');
      expect(Array.isArray(rule.breakingChanges)).toBe(true);
    });
  });

  describe('Version History', () => {
    test('should maintain version history', () => {
      expect(Array.isArray(detector.versionHistory)).toBe(true);
    });

    test('should allow adding to version history', () => {
      const initialLength = detector.versionHistory.length;

      detector.versionHistory.push({
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });

      expect(detector.versionHistory.length).toBe(initialLength + 1);
    });
  });

  describe('Private Methods Integration', () => {
    test('should perform version detection internally', () => {
      // Test that private methods are called during construction
      expect(detector.currentVersion).toBeDefined();
      expect(typeof detector.currentVersion.version).toBe('string');
    });

    test('should initialize compatibility matrix during construction', () => {
      const newDetector = new VersionDetector();
      expect(newDetector.compatibilityMatrix.size).toBeGreaterThan(0);
    });
  });
});
