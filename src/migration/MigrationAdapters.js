/**
 * Migration Adapters for LEGO Framework
 * Maintains backwards compatibility while enabling enhanced features
 */

import { featureManager, FEATURES } from '../config/FeatureManager.js';

/**
 * Schema Manager Migration Adapter
 * Wraps enhanced SchemaManager to maintain legacy API compatibility
 */
export class SchemaManagerAdapter {
  constructor(enhancedSchemaManager, legacySchemaManager = null) {
    this.enhanced = enhancedSchemaManager;
    this.legacy = legacySchemaManager;
    this.migrationState = {
      callCounts: new Map(),
      errorCounts: new Map(),
      performanceMetrics: new Map()
    };
  }

  /**
   * Validate data with progressive enhancement
   */
  validateData(tableName, data, options = {}) {
    return this._withMigrationLogging('validateData', () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_COMPREHENSIVE_VALIDATION,
        () => {
          // Use enhanced validation with detailed error reporting
          return this.enhanced.validateData(tableName, data, {
            ...options,
            comprehensive: true,
            returnDetailedErrors: true
          });
        },
        () => {
          // Fallback to basic validation
          if (this.legacy && this.legacy.validateData) {
            return this.legacy.validateData(tableName, data);
          }
          // Minimal compatibility validation
          return this._basicValidation(tableName, data);
        }
      );
    });
  }

  /**
   * Generate SQL with optional caching
   */
  generateCreateSQL(tableName, options = {}) {
    return this._withMigrationLogging('generateCreateSQL', () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_SQL_CACHING,
        () => {
          // Use cached SQL generation
          return this.enhanced.generateCreateSQL(tableName, {
            ...options,
            useCache: true
          });
        },
        () => {
          // Direct SQL generation without caching
          if (this.legacy && this.legacy.generateCreateSQL) {
            return this.legacy.generateCreateSQL(tableName, options);
          }
          return this.enhanced.generateCreateSQL(tableName, {
            ...options,
            useCache: false
          });
        }
      );
    });
  }

  /**
   * Get schema with optional caching
   */
  getSchema(tableName) {
    return this._withMigrationLogging('getSchema', () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_SCHEMA_CACHING,
        () => this.enhanced.getSchema(tableName),
        () => {
          if (this.legacy && this.legacy.getSchema) {
            return this.legacy.getSchema(tableName);
          }
          return this.enhanced.getSchemaFromConfig(tableName);
        }
      );
    });
  }

  /**
   * Add table with validation
   */
  addTable(tableName, schema, options = {}) {
    return this._withMigrationLogging('addTable', () => {
      const enhancedOptions = {
        ...options,
        validateSchema: featureManager.isEnabled(FEATURES.ENABLE_ENHANCED_SCHEMA),
        enableCaching: featureManager.isEnabled(FEATURES.ENABLE_SCHEMA_CACHING)
      };

      if (this.enhanced.addTable) {
        return this.enhanced.addTable(tableName, schema, enhancedOptions);
      }

      // Fallback implementation
      if (this.legacy && this.legacy.addTable) {
        return this.legacy.addTable(tableName, schema, options);
      }

      throw new Error('No implementation available for addTable');
    });
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    return {
      callCounts: Object.fromEntries(this.migrationState.callCounts),
      errorCounts: Object.fromEntries(this.migrationState.errorCounts),
      performanceMetrics: Object.fromEntries(this.migrationState.performanceMetrics),
      featureUsage: this._getFeatureUsageStats()
    };
  }

  // Private methods

  _withMigrationLogging(methodName, callback) {
    const startTime = Date.now();
    this.migrationState.callCounts.set(
      methodName,
      (this.migrationState.callCounts.get(methodName) || 0) + 1
    );

    try {
      const result = callback();
      this._recordPerformance(methodName, Date.now() - startTime);
      return result;
    } catch (error) {
      this.migrationState.errorCounts.set(
        methodName,
        (this.migrationState.errorCounts.get(methodName) || 0) + 1
      );
      
      if (featureManager.isEnabled(FEATURES.ENABLE_DEBUG_LOGGING)) {
        console.error(`Migration adapter error in ${methodName}:`, error);
      }
      
      throw error;
    }
  }

  _recordPerformance(methodName, duration) {
    const existing = this.migrationState.performanceMetrics.get(methodName) || {
      totalTime: 0,
      callCount: 0,
      averageTime: 0
    };

    existing.totalTime += duration;
    existing.callCount += 1;
    existing.averageTime = existing.totalTime / existing.callCount;

    this.migrationState.performanceMetrics.set(methodName, existing);
  }

  _basicValidation(tableName, data) {
    // Basic validation fallback
    const schema = this.enhanced.getSchemaFromConfig(tableName);
    if (!schema) {
      return { isValid: false, errors: ['Schema not found'] };
    }

    const errors = [];
    for (const [fieldName, fieldConfig] of Object.entries(schema.fields || {})) {
      if (fieldConfig.required && (data[fieldName] === undefined || data[fieldName] === null)) {
        errors.push(`Field '${fieldName}' is required`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _getFeatureUsageStats() {
    const features = {};
    const allFeatures = featureManager.getAllFeatures();
    
    for (const [featureName, featureInfo] of Object.entries(allFeatures)) {
      if (featureName.startsWith('ENABLE_SCHEMA') || featureName.startsWith('ENABLE_COMPREHENSIVE')) {
        features[featureName] = featureInfo.enabled;
      }
    }
    
    return features;
  }
}

/**
 * Generic Data Service Migration Adapter
 * Wraps enhanced GenericDataService for compatibility
 */
export class DataServiceAdapter {
  constructor(enhancedDataService, legacyDataService = null) {
    this.enhanced = enhancedDataService;
    this.legacy = legacyDataService;
    this.migrationState = {
      callCounts: new Map(),
      cacheHitRates: new Map(),
      performanceGains: new Map()
    };
  }

  /**
   * Create with optional security and validation
   */
  async create(tableName, data, options = {}) {
    return this._withAsyncMigrationLogging('create', async () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_SECURITY_CONTROLS,
        async () => {
          return await this.enhanced.create(tableName, data, {
            ...options,
            validateSecurity: true,
            auditAction: true
          });
        },
        async () => {
          if (this.legacy && this.legacy.create) {
            return await this.legacy.create(tableName, data, options);
          }
          return await this.enhanced.create(tableName, data, {
            ...options,
            validateSecurity: false,
            auditAction: false
          });
        }
      );
    });
  }

  /**
   * Read with optional caching and pagination
   */
  async read(tableName, id, options = {}) {
    return this._withAsyncMigrationLogging('read', async () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_QUERY_CACHING,
        async () => {
          return await this.enhanced.read(tableName, id, {
            ...options,
            useCache: true
          });
        },
        async () => {
          if (this.legacy && this.legacy.read) {
            return await this.legacy.read(tableName, id, options);
          }
          return await this.enhanced.readDirect(tableName, id, options);
        }
      );
    });
  }

  /**
   * Update with optional validation and security
   */
  async update(tableName, id, data, options = {}) {
    return this._withAsyncMigrationLogging('update', async () => {
      const enhancedOptions = {
        ...options,
        validateSecurity: featureManager.isEnabled(FEATURES.ENABLE_SECURITY_CONTROLS),
        invalidateCache: featureManager.isEnabled(FEATURES.ENABLE_QUERY_CACHING)
      };

      if (this.enhanced.update) {
        return await this.enhanced.update(tableName, id, data, enhancedOptions);
      }

      if (this.legacy && this.legacy.update) {
        return await this.legacy.update(tableName, id, data, options);
      }

      throw new Error('No implementation available for update');
    });
  }

  /**
   * Delete with optional security and cleanup
   */
  async delete(tableName, id, options = {}) {
    return this._withAsyncMigrationLogging('delete', async () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_SECURITY_CONTROLS,
        async () => {
          return await this.enhanced.delete(tableName, id, {
            ...options,
            validateSecurity: true,
            auditAction: true,
            cascadeDelete: options.cascade || false
          });
        },
        async () => {
          if (this.legacy && this.legacy.delete) {
            return await this.legacy.delete(tableName, id, options);
          }
          return await this.enhanced.deleteDirect(tableName, id, options);
        }
      );
    });
  }

  /**
   * List with optional advanced pagination
   */
  async list(tableName, options = {}) {
    return this._withAsyncMigrationLogging('list', async () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_ADVANCED_PAGINATION,
        async () => {
          return await this.enhanced.list(tableName, {
            ...options,
            advancedPagination: true,
            includeMetadata: true
          });
        },
        async () => {
          if (this.legacy && this.legacy.list) {
            return await this.legacy.list(tableName, options);
          }
          return await this.enhanced.listBasic(tableName, options);
        }
      );
    });
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    if (featureManager.isEnabled(FEATURES.ENABLE_CACHE_METRICS)) {
      return this.enhanced.getCacheMetrics();
    }
    return { message: 'Cache metrics not enabled' };
  }

  /**
   * Get migration progress and statistics
   */
  getMigrationStats() {
    return {
      callCounts: Object.fromEntries(this.migrationState.callCounts),
      cacheHitRates: Object.fromEntries(this.migrationState.cacheHitRates),
      performanceGains: Object.fromEntries(this.migrationState.performanceGains),
      featureUsage: this._getFeatureUsageStats()
    };
  }

  // Private methods

  async _withAsyncMigrationLogging(methodName, callback) {
    const startTime = Date.now();
    this.migrationState.callCounts.set(
      methodName,
      (this.migrationState.callCounts.get(methodName) || 0) + 1
    );

    try {
      const result = await callback();
      const duration = Date.now() - startTime;
      this._recordPerformanceGain(methodName, duration);
      return result;
    } catch (error) {
      if (featureManager.isEnabled(FEATURES.ENABLE_DEBUG_LOGGING)) {
        console.error(`Data service migration adapter error in ${methodName}:`, error);
      }
      throw error;
    }
  }

  _recordPerformanceGain(methodName, duration) {
    // Record whether enhanced features provided performance benefits
    const usesCaching = featureManager.isEnabled(FEATURES.ENABLE_QUERY_CACHING);
    const usesAdvancedPagination = featureManager.isEnabled(FEATURES.ENABLE_ADVANCED_PAGINATION);
    
    const existing = this.migrationState.performanceGains.get(methodName) || {
      cachedCalls: 0,
      uncachedCalls: 0,
      averageCachedTime: 0,
      averageUncachedTime: 0
    };

    if (usesCaching && (methodName === 'read' || methodName === 'list')) {
      existing.cachedCalls += 1;
      existing.averageCachedTime = (existing.averageCachedTime + duration) / existing.cachedCalls;
    } else {
      existing.uncachedCalls += 1;
      existing.averageUncachedTime = (existing.averageUncachedTime + duration) / existing.uncachedCalls;
    }

    this.migrationState.performanceGains.set(methodName, existing);
  }

  _getFeatureUsageStats() {
    const features = {};
    const allFeatures = featureManager.getAllFeatures();
    
    for (const [featureName, featureInfo] of Object.entries(allFeatures)) {
      if (featureName.includes('QUERY_CACHING') || featureName.includes('SECURITY') || featureName.includes('PAGINATION')) {
        features[featureName] = featureInfo.enabled;
      }
    }
    
    return features;
  }
}

/**
 * Module Manager Migration Adapter
 * Wraps enhanced ModuleManager for compatibility
 */
export class ModuleManagerAdapter {
  constructor(enhancedModuleManager, legacyModuleManager = null) {
    this.enhanced = enhancedModuleManager;
    this.legacy = legacyModuleManager;
    this.migrationState = {
      hookExecutions: new Map(),
      timeoutEvents: new Map(),
      performanceMetrics: new Map()
    };
  }

  /**
   * Register module with optional enhanced features
   */
  async registerModule(name, module, options = {}) {
    return this._withAsyncMigrationLogging('registerModule', async () => {
      const enhancedOptions = {
        ...options,
        enableMetrics: featureManager.isEnabled(FEATURES.ENABLE_HOOK_METRICS),
        enableTimeout: featureManager.isEnabled(FEATURES.ENABLE_HOOK_TIMEOUT)
      };

      if (this.enhanced.registerModule) {
        return await this.enhanced.registerModule(name, module, enhancedOptions);
      }

      if (this.legacy && this.legacy.registerModule) {
        return await this.legacy.registerModule(name, module, options);
      }

      throw new Error('No implementation available for registerModule');
    });
  }

  /**
   * Execute hooks with optional enhancements
   */
  async executeHooks(hookName, context = {}) {
    return this._withAsyncMigrationLogging('executeHooks', async () => {
      return featureManager.withFeature(
        FEATURES.ENABLE_ENHANCED_HOOKS,
        async () => {
          return await this.enhanced.executeHooks(hookName, context, {
            enableTimeout: featureManager.isEnabled(FEATURES.ENABLE_HOOK_TIMEOUT),
            enableMetrics: featureManager.isEnabled(FEATURES.ENABLE_HOOK_METRICS),
            parallelExecution: featureManager.isEnabled(FEATURES.ENABLE_PARALLEL_EXECUTION)
          });
        },
        async () => {
          if (this.legacy && this.legacy.executeHooks) {
            return await this.legacy.executeHooks(hookName, context);
          }
          return await this.enhanced.executeHooksBasic(hookName, context);
        }
      );
    });
  }

  /**
   * Get hook metrics if available
   */
  getHookMetrics() {
    return featureManager.withFeature(
      FEATURES.ENABLE_HOOK_METRICS,
      () => this.enhanced.getMetrics(),
      () => ({ message: 'Hook metrics not enabled' })
    );
  }

  /**
   * Get migration statistics
   */
  getMigrationStats() {
    return {
      hookExecutions: Object.fromEntries(this.migrationState.hookExecutions),
      timeoutEvents: Object.fromEntries(this.migrationState.timeoutEvents),
      performanceMetrics: Object.fromEntries(this.migrationState.performanceMetrics),
      featureUsage: this._getFeatureUsageStats()
    };
  }

  // Private methods

  async _withAsyncMigrationLogging(methodName, callback) {
    const startTime = Date.now();
    this.migrationState.hookExecutions.set(
      methodName,
      (this.migrationState.hookExecutions.get(methodName) || 0) + 1
    );

    try {
      const result = await callback();
      this._recordMetrics(methodName, Date.now() - startTime);
      return result;
    } catch (error) {
      if (error.name === 'TimeoutError') {
        this.migrationState.timeoutEvents.set(
          methodName,
          (this.migrationState.timeoutEvents.get(methodName) || 0) + 1
        );
      }

      if (featureManager.isEnabled(FEATURES.ENABLE_DEBUG_LOGGING)) {
        console.error(`Module manager migration adapter error in ${methodName}:`, error);
      }
      throw error;
    }
  }

  _recordMetrics(methodName, duration) {
    const existing = this.migrationState.performanceMetrics.get(methodName) || {
      totalTime: 0,
      callCount: 0,
      averageTime: 0,
      enhancedFeatureUsage: 0
    };

    existing.totalTime += duration;
    existing.callCount += 1;
    existing.averageTime = existing.totalTime / existing.callCount;

    if (featureManager.isEnabled(FEATURES.ENABLE_ENHANCED_HOOKS)) {
      existing.enhancedFeatureUsage += 1;
    }

    this.migrationState.performanceMetrics.set(methodName, existing);
  }

  _getFeatureUsageStats() {
    const features = {};
    const allFeatures = featureManager.getAllFeatures();
    
    for (const [featureName, featureInfo] of Object.entries(allFeatures)) {
      if (featureName.includes('HOOK') || featureName.includes('PARALLEL')) {
        features[featureName] = featureInfo.enabled;
      }
    }
    
    return features;
  }
}

/**
 * Migration Factory
 * Creates appropriate adapters for different components
 */
export class MigrationFactory {
  static createSchemaManagerAdapter(enhanced, legacy = null) {
    return new SchemaManagerAdapter(enhanced, legacy);
  }

  static createDataServiceAdapter(enhanced, legacy = null) {
    return new DataServiceAdapter(enhanced, legacy);
  }

  static createModuleManagerAdapter(enhanced, legacy = null) {
    return new ModuleManagerAdapter(enhanced, legacy);
  }

  /**
   * Create a complete migration suite
   */
  static createMigrationSuite(enhancedComponents, legacyComponents = {}) {
    return {
      schemaManager: this.createSchemaManagerAdapter(
        enhancedComponents.schemaManager,
        legacyComponents.schemaManager
      ),
      dataService: this.createDataServiceAdapter(
        enhancedComponents.dataService,
        legacyComponents.dataService
      ),
      moduleManager: this.createModuleManagerAdapter(
        enhancedComponents.moduleManager,
        legacyComponents.moduleManager
      ),
      
      /**
       * Get comprehensive migration statistics
       */
      getMigrationStats() {
        return {
          schemaManager: this.schemaManager.getMigrationStats(),
          dataService: this.dataService.getMigrationStats(),
          moduleManager: this.moduleManager.getMigrationStats(),
          overallFeatureUsage: featureManager.getAllFeatures()
        };
      },

      /**
       * Generate migration report
       */
      generateMigrationReport() {
        const stats = this.getMigrationStats();
        return {
          summary: {
            totalCalls: Object.values(stats.schemaManager.callCounts).reduce((a, b) => a + b, 0) +
                      Object.values(stats.dataService.callCounts).reduce((a, b) => a + b, 0) +
                      Object.values(stats.moduleManager.hookExecutions).reduce((a, b) => a + b, 0),
            featuresEnabled: Object.values(stats.overallFeatureUsage).filter(f => f.enabled).length,
            totalFeatures: Object.keys(stats.overallFeatureUsage).length
          },
          details: stats,
          recommendations: this._generateRecommendations(stats)
        };
      },

      _generateRecommendations(stats) {
        const recommendations = [];

        // Check cache usage
        if (stats.dataService.cacheHitRates && Object.keys(stats.dataService.cacheHitRates).length === 0) {
          recommendations.push('Consider enabling query caching for better performance');
        }

        // Check hook timeouts
        if (stats.moduleManager.timeoutEvents && Object.values(stats.moduleManager.timeoutEvents).some(count => count > 0)) {
          recommendations.push('Review hook timeout configurations - some hooks are timing out');
        }

        // Check feature adoption
        const enabledFeatures = Object.values(stats.overallFeatureUsage).filter(f => f.enabled).length;
        const totalFeatures = Object.keys(stats.overallFeatureUsage).length;
        if (enabledFeatures < totalFeatures * 0.5) {
          recommendations.push('Consider enabling more enhanced features for better functionality');
        }

        return recommendations;
      }
    };
  }
}