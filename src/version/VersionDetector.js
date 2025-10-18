/**
 * Version Detection System for CLODO Framework
 * Automatically detects framework versions and chooses appropriate implementations
 */

import { featureManager, FEATURES } from '../config/FeatureManager.js';
import { MigrationFactory } from './MigrationAdapters.js';

/**
 * Version Detection and Compatibility Manager
 */
export class VersionDetector {
  constructor() {
    this.detectionCache = new Map();
    this.compatibilityMatrix = new Map();
    this.versionHistory = [];
    this.currentVersion = null;
    
    this._initializeCompatibilityMatrix();
    this._detectCurrentVersion();
  }

  /**
   * Detect the current framework version
   * @returns {Object} Version information
   */
  detectVersion() {
    if (this.currentVersion) {
      return this.currentVersion;
    }

    const cacheKey = 'framework_version';
    if (this.detectionCache.has(cacheKey)) {
      return this.detectionCache.get(cacheKey);
    }

    const versionInfo = this._performVersionDetection();
    this.detectionCache.set(cacheKey, versionInfo);
    this.currentVersion = versionInfo;

    return versionInfo;
  }

  /**
   * Check compatibility between versions
   * @param {string} sourceVersion - Source version
   * @param {string} targetVersion - Target version
   * @returns {Object} Compatibility information
   */
  checkCompatibility(sourceVersion, targetVersion) {
    const compatKey = `${sourceVersion}->${targetVersion}`;
    
    if (this.compatibilityMatrix.has(compatKey)) {
      return this.compatibilityMatrix.get(compatKey);
    }

    const compatibility = this._calculateCompatibility(sourceVersion, targetVersion);
    this.compatibilityMatrix.set(compatKey, compatibility);
    
    return compatibility;
  }

  /**
   * Get recommended implementation based on version and features
   * @param {string} componentType - Type of component (schemaManager, dataService, etc.)
   * @param {Object} options - Detection options
   * @returns {Object} Implementation recommendation
   */
  getRecommendedImplementation(componentType, options = {}) {
    const version = this.detectVersion();
    const features = this._analyzeAvailableFeatures(componentType);
    const userPreferences = this._getUserPreferences(options);

    return {
      componentType,
      version: version.version,
      implementation: this._selectImplementation(componentType, version, features, userPreferences),
      features: features,
      migrationPath: this._generateMigrationPath(componentType, version),
      compatibility: this._getCompatibilityInfo(componentType, version)
    };
  }

  /**
   * Auto-configure framework based on detected environment
   * @param {Object} overrides - Manual configuration overrides
   * @returns {Object} Configuration result
   */
  autoConfigureFramework(overrides = {}) {
    const version = this.detectVersion();
    const environment = this._detectEnvironment();
    const capabilities = this._detectCapabilities();

    const configuration = {
      version: version.version,
      environment: environment.type,
      capabilities: capabilities,
      features: this._generateFeatureConfiguration(version, environment, capabilities),
      components: this._generateComponentConfiguration(version, environment),
      migration: this._generateMigrationConfiguration(version, environment)
    };

    // Apply overrides
    if (overrides.features) {
      Object.assign(configuration.features, overrides.features);
    }

    // Configure feature manager
    this._applyFeatureConfiguration(configuration.features);

    return configuration;
  }

  /**
   * Create version-appropriate adapters
   * @param {Object} components - Available components
   * @returns {Object} Configured adapters
   */
  createVersionAdapters(components) {
    const version = this.detectVersion();
    const compatibility = this._getVersionCompatibility(version);

    if (compatibility.requiresAdapters) {
      return this._createCompatibilityAdapters(components, version);
    }

    return this._createDirectAdapters(components, version);
  }

  /**
   * Generate migration strategy
   * @param {string} targetVersion - Target version to migrate to
   * @returns {Object} Migration strategy
   */
  generateMigrationStrategy(targetVersion) {
    const currentVersion = this.detectVersion();
    const compatibility = this.checkCompatibility(currentVersion.version, targetVersion);

    return {
      sourceVersion: currentVersion.version,
      targetVersion: targetVersion,
      compatibility: compatibility,
      strategy: this._determineMigrationStrategy(currentVersion, targetVersion, compatibility),
      phases: this._generateMigrationPhases(currentVersion, targetVersion),
      risks: this._assessMigrationRisks(currentVersion, targetVersion),
      timeline: this._estimateMigrationTimeline(currentVersion, targetVersion)
    };
  }

  // Private methods

  /**
   * Initialize compatibility matrix with known version relationships
   * @private
   */
  _initializeCompatibilityMatrix() {
    const compatibilityRules = [
      // Legacy to Enhanced (1.x -> 2.x)
      {
        source: '1.0.0',
        target: '2.0.0',
        compatible: true,
        requiresAdapters: true,
        breakingChanges: ['API signature changes', 'Configuration format changes'],
        migrationComplexity: 'medium'
      },
      {
        source: '1.1.0',
        target: '2.0.0',
        compatible: true,
        requiresAdapters: true,
        breakingChanges: ['Enhanced validation format'],
        migrationComplexity: 'low'
      },
      // Enhanced versions (2.x series)
      {
        source: '2.0.0',
        target: '2.1.0',
        compatible: true,
        requiresAdapters: false,
        breakingChanges: [],
        migrationComplexity: 'none'
      }
    ];

    compatibilityRules.forEach(rule => {
      const key = `${rule.source}->${rule.target}`;
      this.compatibilityMatrix.set(key, rule);
    });
  }

  /**
   * Detect current framework version
   * @private
   */
  _detectCurrentVersion() {
    this.currentVersion = this._performVersionDetection();
  }

  /**
   * Perform actual version detection
   * @private
   */
  _performVersionDetection() {
    const detectionMethods = [
      () => this._detectFromPackageJson(),
      () => this._detectFromModuleExports(),
      () => this._detectFromFeatureFlags(),
      () => this._detectFromAPISignatures(),
      () => this._detectFromFileStructure()
    ];

    let versionInfo = null;
    
    for (const method of detectionMethods) {
      try {
        const result = method();
        if (result && result.confidence > 0.5) {
          versionInfo = result;
          break;
        }
      } catch (error) {
        // Continue with next detection method
        continue;
      }
    }

    if (!versionInfo) {
      versionInfo = this._getDefaultVersionInfo();
    }

    // Add detection metadata
    versionInfo.detectedAt = new Date().toISOString();
    versionInfo.detectionMethod = versionInfo.method || 'default';

    return versionInfo;
  }

  /**
   * Detect version from package.json
   * @private
   */
  _detectFromPackageJson() {
    try {
      // In a real implementation, this would read from actual package.json
      // For now, we'll simulate detection
      const packageVersion = '2.0.0'; // Simulated version
      
      return {
        version: packageVersion,
        type: 'enhanced',
        confidence: 0.9,
        method: 'package.json',
        features: ['caching', 'validation', 'security', 'metrics']
      };
    } catch {
      return null;
    }
  }

  /**
   * Detect version from module exports
   * @private
   */
  _detectFromModuleExports() {
    try {
      // Check for enhanced features in exports
      const hasEnhancedFeatures = this._checkForEnhancedFeatures();
      
      if (hasEnhancedFeatures) {
        return {
          version: '2.0.0',
          type: 'enhanced',
          confidence: 0.8,
          method: 'module_exports',
          features: this._detectAvailableFeatures()
        };
      } else {
        return {
          version: '1.0.0',
          type: 'legacy',
          confidence: 0.7,
          method: 'module_exports',
          features: ['basic_crud', 'simple_validation']
        };
      }
    } catch {
      return null;
    }
  }

  /**
   * Detect version from feature flags
   * @private
   */
  _detectFromFeatureFlags() {
    try {
      const hasFeatureManager = typeof featureManager !== 'undefined';
      
      if (hasFeatureManager) {
        const allFeatures = featureManager.getAllFeatures();
        const enhancedFeatureCount = Object.keys(allFeatures).length;
        
        return {
          version: enhancedFeatureCount > 10 ? '2.0.0' : '1.1.0',
          type: 'enhanced',
          confidence: 0.85,
          method: 'feature_flags',
          features: Object.keys(allFeatures)
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect version from API signatures
   * @private
   */
  _detectFromAPISignatures() {
    try {
      // Check for enhanced method signatures
      const signatures = this._analyzeAPISignatures();
      
      if (signatures.hasEnhancedSignatures) {
        return {
          version: '2.0.0',
          type: 'enhanced',
          confidence: 0.75,
          method: 'api_signatures',
          features: signatures.detectedFeatures
        };
      }
      
      return {
        version: '1.0.0',
        type: 'legacy',
        confidence: 0.6,
        method: 'api_signatures',
        features: ['basic_api']
      };
    } catch {
      return null;
    }
  }

  /**
   * Detect version from file structure
   * @private
   */
  _detectFromFileStructure() {
    try {
      // Check for enhanced framework structure
      const hasEnhancedStructure = this._checkFileStructure();
      
      return {
        version: hasEnhancedStructure ? '2.0.0' : '1.0.0',
        type: hasEnhancedStructure ? 'enhanced' : 'legacy',
        confidence: 0.6,
        method: 'file_structure',
        features: hasEnhancedStructure ? ['enhanced_structure'] : ['basic_structure']
      };
    } catch {
      return null;
    }
  }

  /**
   * Get default version info as fallback
   * @private
   */
  _getDefaultVersionInfo() {
    return {
      version: '2.0.0',
      type: 'enhanced',
      confidence: 0.3,
      method: 'default',
      features: ['unknown'],
      warning: 'Version detection failed, using default enhanced version'
    };
  }

  /**
   * Check for enhanced framework features
   * @private
   */
  _checkForEnhancedFeatures() {
    // Check for enhanced method signatures or capabilities
    const enhancedIndicators = [
      'validateData',
      'getCacheMetrics',
      'executeHooks',
      'generateMigrationPath'
    ];

    // In a real implementation, this would check actual exports
    return enhancedIndicators.some(() => {
      // Simulate checking for method existence
      return true; // Assume enhanced features are available
    });
  }

  /**
   * Detect available features
   * @private
   */
  _detectAvailableFeatures() {
    const features = [];
    
    // Check for caching capabilities
    if (this._hasFeature('caching')) {
      features.push('caching');
    }
    
    // Check for validation capabilities
    if (this._hasFeature('validation')) {
      features.push('validation');
    }
    
    // Check for security capabilities
    if (this._hasFeature('security')) {
      features.push('security');
    }
    
    return features;
  }

  /**
   * Check if a specific feature is available
   * @private
   */
  _hasFeature() {
    // In a real implementation, this would test for actual feature availability
    return true; // Assume features are available for now
  }

  /**
   * Analyze API signatures for version detection
   * @private
   */
  _analyzeAPISignatures() {
    // Check method signatures for enhanced features
    const enhancedMethods = [
      'validateData',
      'getCacheMetrics',
      'executeHooks'
    ];

    return {
      hasEnhancedSignatures: true, // Simulate detection
      detectedFeatures: enhancedMethods
    };
  }

  /**
   * Check file structure for version indicators
   * @private
   */
  _checkFileStructure() {
    // Check for enhanced framework directory structure
    // const enhancedPaths = [
    //   'src/config/FeatureManager.js',
    //   'src/migration/MigrationAdapters.js',
    //   'src/monitoring/'
    // ];

    // In a real implementation, this would check actual file system
    return true; // Assume enhanced structure
  }

  /**
   * Calculate compatibility between versions
   * @private
   */
  _calculateCompatibility(sourceVersion, targetVersion) {
    const [sourceMajor, sourceMinor] = this._parseVersion(sourceVersion);
    const [targetMajor, targetMinor] = this._parseVersion(targetVersion);

    const majorDiff = Math.abs(targetMajor - sourceMajor);
    const minorDiff = Math.abs(targetMinor - sourceMinor);

    if (majorDiff > 1) {
      return {
        compatible: false,
        requiresAdapters: false,
        migrationComplexity: 'impossible',
        breakingChanges: ['Major version incompatibility']
      };
    }

    if (majorDiff === 1) {
      return {
        compatible: true,
        requiresAdapters: true,
        migrationComplexity: 'high',
        breakingChanges: ['API changes', 'Configuration changes']
      };
    }

    return {
      compatible: true,
      requiresAdapters: minorDiff > 0,
      migrationComplexity: minorDiff > 0 ? 'low' : 'none',
      breakingChanges: []
    };
  }

  /**
   * Parse version string
   * @private
   */
  _parseVersion(versionString) {
    const parts = versionString.split('.').map(Number);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }

  /**
   * Analyze available features for component type
   * @private
   */
  _analyzeAvailableFeatures(componentType) {
    const featureMap = {
      schemaManager: [
        FEATURES.ENABLE_ENHANCED_SCHEMA,
        FEATURES.ENABLE_SCHEMA_CACHING,
        FEATURES.ENABLE_COMPREHENSIVE_VALIDATION
      ],
      dataService: [
        FEATURES.ENABLE_QUERY_CACHING,
        FEATURES.ENABLE_SECURITY_CONTROLS,
        FEATURES.ENABLE_ADVANCED_PAGINATION
      ],
      moduleManager: [
        FEATURES.ENABLE_ENHANCED_HOOKS,
        FEATURES.ENABLE_HOOK_TIMEOUT,
        FEATURES.ENABLE_HOOK_METRICS
      ]
    };

    const componentFeatures = featureMap[componentType] || [];
    return componentFeatures.map(feature => ({
      name: feature,
      enabled: featureManager.isEnabled(feature),
      available: true
    }));
  }

  /**
   * Get user preferences from options
   * @private
   */
  _getUserPreferences(options) {
    return {
      preferEnhanced: options.preferEnhanced ?? true,
      enableMigration: options.enableMigration ?? true,
      riskTolerance: options.riskTolerance || 'medium',
      performanceFirst: options.performanceFirst ?? false
    };
  }

  /**
   * Select appropriate implementation
   * @private
   */
  _selectImplementation(componentType, version, features, preferences) {
    if (version.type === 'legacy' && preferences.preferEnhanced) {
      return {
        type: 'adapter',
        reason: 'Legacy version with enhanced preference',
        adapter: 'migration'
      };
    }

    if (version.type === 'enhanced') {
      return {
        type: 'enhanced',
        reason: 'Enhanced version available',
        adapter: 'direct'
      };
    }

    return {
      type: 'legacy',
      reason: 'Legacy version, no migration requested',
      adapter: 'none'
    };
  }

  /**
   * Generate migration path for component
   * @private
   */
  _generateMigrationPath(componentType, version) {
    if (version.type === 'enhanced') {
      return { required: false, steps: [] };
    }

    return {
      required: true,
      steps: [
        'Enable feature flags',
        'Create migration adapters',
        'Test compatibility',
        'Gradual rollout'
      ]
    };
  }

  /**
   * Get compatibility information for component
   * @private
   */
  _getCompatibilityInfo(componentType, version) {
    return {
      backwardCompatible: version.type === 'enhanced',
      forwardCompatible: true,
      adaptersRequired: version.type === 'legacy',
      migrationPath: this._generateMigrationPath(componentType, version)
    };
  }

  /**
   * Detect environment information
   * @private
   */
  _detectEnvironment() {
    return {
      type: 'cloudflare-worker',
      runtime: 'v8',
      capabilities: ['d1', 'kv', 'durable-objects'],
      constraints: ['memory-limited', 'cpu-limited']
    };
  }

  /**
   * Detect runtime capabilities
   * @private
   */
  _detectCapabilities() {
    return {
      database: ['d1'],
      storage: ['kv'],
      compute: ['isolates'],
      networking: ['fetch'],
      caching: ['cache-api'],
      monitoring: ['analytics']
    };
  }

  /**
   * Generate feature configuration
   * @private
   */
  _generateFeatureConfiguration(version, environment, capabilities) {
    const config = {};

    // Enable caching if supported
    if (capabilities.caching.includes('cache-api')) {
      config[FEATURES.ENABLE_QUERY_CACHING] = true;
      config[FEATURES.ENABLE_SCHEMA_CACHING] = true;
    }

    // Enable security in production
    if (environment.type !== 'development') {
      config[FEATURES.ENABLE_SECURITY_CONTROLS] = true;
    }

    // Enable monitoring if available
    if (capabilities.monitoring.includes('analytics')) {
      config[FEATURES.ENABLE_PERFORMANCE_MONITORING] = true;
      config[FEATURES.ENABLE_HOOK_METRICS] = true;
    }

    return config;
  }

  /**
   * Generate component configuration
   * @private
   */
  _generateComponentConfiguration(version, environment) {
    return {
      schemaManager: {
        implementation: version.type === 'enhanced' ? 'enhanced' : 'legacy',
        caching: environment.type !== 'development'
      },
      dataService: {
        implementation: version.type === 'enhanced' ? 'enhanced' : 'legacy',
        security: environment.type !== 'development'
      },
      moduleManager: {
        implementation: version.type === 'enhanced' ? 'enhanced' : 'legacy',
        metrics: environment.type !== 'development'
      }
    };
  }

  /**
   * Generate migration configuration
   * @private
   */
  _generateMigrationConfiguration(version, environment) {
    return {
      enabled: version.type === 'legacy',
      strategy: version.type === 'legacy' ? 'gradual' : 'none',
      phases: version.type === 'legacy' ? [
        'feature-flags',
        'adapters',
        'testing',
        'rollout'
      ] : []
    };
  }

  /**
   * Apply feature configuration to feature manager
   * @private
   */
  _applyFeatureConfiguration(features) {
    for (const [featureName, enabled] of Object.entries(features)) {
      if (enabled) {
        featureManager.enable(featureName, { reason: 'Auto-configured by version detector' });
      } else {
        featureManager.disable(featureName, { reason: 'Auto-configured by version detector' });
      }
    }
  }

  /**
   * Get version compatibility information
   * @private
   */
  _getVersionCompatibility(version) {
    return {
      requiresAdapters: version.type === 'legacy',
      supportsMigration: true,
      hasBreakingChanges: version.type === 'legacy'
    };
  }

  /**
   * Create compatibility adapters
   * @private
   */
  _createCompatibilityAdapters(components, version) {
    return MigrationFactory.createMigrationSuite(
      components,
      {} // Legacy components would be provided here if available
    );
  }

  /**
   * Create direct adapters (no compatibility needed)
   * @private
   */
  _createDirectAdapters(components, version) {
    return {
      schemaManager: components.schemaManager,
      dataService: components.dataService,
      moduleManager: components.moduleManager,
      direct: true,
      version: version.version
    };
  }
}

// Export singleton instance
export const versionDetector = new VersionDetector();

/**
 * Convenience function to auto-configure framework
 */
export function autoConfigureFramework(overrides = {}) {
  return versionDetector.autoConfigureFramework(overrides);
}

/**
 * Convenience function to get version info
 */
export function getFrameworkVersion() {
  return versionDetector.detectVersion();
}

/**
 * Convenience function to create adapters
 */
export function createVersionAdapters(components) {
  return versionDetector.createVersionAdapters(components);
}