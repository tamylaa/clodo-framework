/**
 * TypeScript Definitions for Enhanced LEGO Framework
 * Provides type safety and better IDE support
 */

/**
 * Base interfaces and types
 */
export interface FieldConfig {
  type: 'text' | 'integer' | 'boolean' | 'real' | 'blob';
  required?: boolean;
  defaultValue?: any;
  unique?: boolean;
  primaryKey?: boolean;
  foreignKey?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp | string;
    custom?: (value: any) => boolean | string;
  };
}

export interface SchemaDefinition {
  tableName: string;
  columns: Record<string, FieldConfig>;
  indexes?: string[];
  relationships?: Record<string, RelationshipConfig>;
  validation?: {
    required?: string[];
    unique?: string[];
    custom?: (data: Record<string, any>) => ValidationResult;
  };
}

export interface RelationshipConfig {
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
  to: string;
  foreignKey: string;
  localKey: string;
  through?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
  data: Record<string, any> | null;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  hits?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  validationHits: number;
  validationMisses: number;
  totalSize?: number;
  evictions?: number;
}

/**
 * Enhanced SchemaManager
 */
export declare class SchemaManager {
  schemas: Map<string, SchemaDefinition>;
  relationships: Map<string, RelationshipConfig>;
  schemaCache: Map<string, CacheEntry>;
  sqlCache: Map<string, CacheEntry>;
  validationCache: Map<string, CacheEntry<ValidationResult>>;
  cacheEnabled: boolean;
  cacheStats: CacheStats;

  constructor();

  /**
   * Register a data model schema
   */
  registerModel(modelName: string, schema: SchemaDefinition): void;

  /**
   * Get a registered model schema
   */
  getModel(modelName: string): SchemaDefinition | null;

  /**
   * Generate SQL query for model operations with caching
   */
  generateSQL(modelName: string, operation: 'create' | 'read' | 'update' | 'delete', params?: Record<string, any>): {
    sql: string;
    params: any[];
  };

  /**
   * Validate data against schema with comprehensive error reporting
   */
  validateData(modelName: string, data: Record<string, any>, options?: {
    comprehensive?: boolean;
    returnDetailedErrors?: boolean;
    skipCache?: boolean;
  }): ValidationResult;

  /**
   * Generate CREATE TABLE SQL for model
   */
  generateCreateSQL(modelName: string, options?: {
    ifNotExists?: boolean;
    useCache?: boolean;
  }): string;

  /**
   * Clear schema cache
   */
  clearSchemaCache(modelName?: string): void;

  /**
   * Generate cache key for operations
   */
  generateCacheKey(modelName: string, operation: string, params?: Record<string, any>): string;

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats;

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void;
}

/**
 * Security configuration for GenericDataService
 */
export interface SecurityConfig {
  maxQueryLimit: number;
  defaultQueryLimit: number;
  maxBulkOperationSize: number;
  enableAuditLog: boolean;
  allowedOperations: string[];
  rateLimiting?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Pagination configuration and result
 */
export interface PaginationConfig {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T = any> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    pages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: Record<string, any>;
}

/**
 * Enhanced GenericDataService
 */
export declare class GenericDataService {
  d1Client: any; // D1 client interface
  modelName: string;
  schema: SchemaDefinition;
  queryCache: Map<string, CacheEntry>;
  securityConfig: SecurityConfig;
  cacheEnabled: boolean;

  constructor(d1Client: any, modelName: string, options?: {
    securityConfig?: Partial<SecurityConfig>;
    cacheEnabled?: boolean;
    schema?: SchemaDefinition;
  });

  /**
   * Create a new record with validation and security checks
   */
  create(data: Record<string, any>, options?: {
    validateSecurity?: boolean;
    auditAction?: boolean;
    skipCache?: boolean;
  }): Promise<any>;

  /**
   * Read record(s) with optional caching
   */
  read(id: string | number, options?: {
    useCache?: boolean;
    fields?: string[];
  }): Promise<any>;

  /**
   * Update a record with validation
   */
  update(id: string | number, data: Record<string, any>, options?: {
    validateSecurity?: boolean;
    invalidateCache?: boolean;
    auditAction?: boolean;
  }): Promise<any>;

  /**
   * Delete a record with security checks
   */
  delete(id: string | number, options?: {
    validateSecurity?: boolean;
    auditAction?: boolean;
    cascadeDelete?: boolean;
  }): Promise<any>;

  /**
   * List records with advanced pagination
   */
  list(criteria?: Record<string, any>, options?: PaginationConfig & {
    advancedPagination?: boolean;
    includeMetadata?: boolean;
    useCache?: boolean;
  }): Promise<PaginatedResult>;

  /**
   * Find records with relationships
   */
  findWithRelations(criteria?: Record<string, any>, include?: string[], fields?: string[]): Promise<any[]>;

  /**
   * Get cache metrics
   */
  getCacheMetrics(): {
    totalEntries: number;
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    oldestEntry: number;
    newestEntry: number;
  };

  /**
   * Clear cache
   */
  clearCache(): void;

  /**
   * Set security configuration
   */
  setSecurityConfig(config: Partial<SecurityConfig>): void;
}

/**
 * Module hook context and configuration
 */
export interface HookContext {
  operation: string;
  modelName?: string;
  data?: Record<string, any>;
  user?: any;
  timestamp: number;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface HookResult {
  success: boolean;
  data?: any;
  error?: Error;
  metadata?: Record<string, any>;
  timing?: number;
}

export interface ModuleConfig {
  name: string;
  version?: string;
  priority?: number;
  hooks?: Record<string, Function>;
  dependencies?: string[];
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Enhanced ModuleManager
 */
export declare class ModuleManager {
  modules: Map<string, ModuleConfig>;
  hooks: Map<string, Function[]>;
  metrics: Map<string, any>;

  constructor();

  /**
   * Register a module with hooks
   */
  registerModule(name: string, module: ModuleConfig, options?: {
    enableMetrics?: boolean;
    enableTimeout?: boolean;
    priority?: number;
  }): Promise<void>;

  /**
   * Execute hooks with enhanced error handling
   */
  executeHooks(hookName: string, context: HookContext, options?: {
    enableTimeout?: boolean;
    enableMetrics?: boolean;
    parallelExecution?: boolean;
    timeout?: number;
  }): Promise<HookResult[]>;

  /**
   * Get module metrics
   */
  getMetrics(): Record<string, any>;

  /**
   * Unregister a module
   */
  unregisterModule(name: string): void;

  /**
   * List registered modules
   */
  listModules(): ModuleConfig[];

  /**
   * Check if module is registered
   */
  hasModule(name: string): boolean;
}

/**
 * Feature Management
 */
export interface FeatureFlags {
  ENABLE_ENHANCED_SCHEMA: boolean;
  ENABLE_SCHEMA_CACHING: boolean;
  ENABLE_COMPREHENSIVE_VALIDATION: boolean;
  ENABLE_SQL_CACHING: boolean;
  ENABLE_QUERY_CACHING: boolean;
  ENABLE_SECURITY_CONTROLS: boolean;
  ENABLE_ADVANCED_PAGINATION: boolean;
  ENABLE_RELATIONSHIP_LOADING: boolean;
  ENABLE_ENHANCED_HOOKS: boolean;
  ENABLE_HOOK_TIMEOUT: boolean;
  ENABLE_HOOK_METRICS: boolean;
  ENABLE_PARALLEL_EXECUTION: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  ENABLE_CACHE_METRICS: boolean;
  ENABLE_QUERY_OPTIMIZATION: boolean;
  ENABLE_DEBUG_LOGGING: boolean;
  ENABLE_DEVELOPMENT_MODE: boolean;
  ENABLE_STRICT_VALIDATION: boolean;
  ENABLE_LEGACY_COMPATIBILITY: boolean;
  ENABLE_DEPRECATION_WARNINGS: boolean;
  ENABLE_MIGRATION_HELPERS: boolean;
}

export declare class FeatureManager {
  features: Partial<FeatureFlags>;
  listeners: Map<string, Function[]>;
  context: {
    environment: string;
    version: string;
    timestamp: number;
  };

  constructor(config?: Partial<FeatureFlags>);

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureName: keyof FeatureFlags): boolean;

  /**
   * Enable a feature flag
   */
  enable(featureName: keyof FeatureFlags, options?: {
    dependencies?: string[];
    reason?: string;
  }): void;

  /**
   * Disable a feature flag
   */
  disable(featureName: keyof FeatureFlags, options?: {
    disableDependents?: boolean;
    reason?: string;
  }): void;

  /**
   * Toggle a feature flag
   */
  toggle(featureName: keyof FeatureFlags): boolean;

  /**
   * Get all feature flags and their states
   */
  getAllFeatures(): Record<string, {
    enabled: boolean;
    default: boolean;
    configured: boolean;
    overridden: boolean;
  }>;

  /**
   * Execute code with feature flag check
   */
  withFeature<T>(
    featureName: keyof FeatureFlags,
    enabledCallback: () => T,
    disabledCallback?: () => T
  ): T;

  /**
   * Create a feature-gated wrapper function
   */
  createFeatureGate<T extends Function>(
    featureName: keyof FeatureFlags,
    enhancedFunction: T,
    legacyFunction?: T
  ): T;

  /**
   * Listen for feature flag changes
   */
  onFeatureChange(featureName: keyof FeatureFlags, callback: Function): () => void;

  /**
   * Validate feature flag configuration
   */
  validateConfiguration(): string[];
}

/**
 * Migration and Version Detection
 */
export interface VersionInfo {
  version: string;
  type: 'legacy' | 'enhanced';
  confidence: number;
  method: string;
  features: string[];
  warning?: string;
}

export interface MigrationStrategy {
  sourceVersion: string;
  targetVersion: string;
  compatibility: {
    compatible: boolean;
    requiresAdapters: boolean;
    migrationComplexity: 'none' | 'low' | 'medium' | 'high' | 'impossible';
    breakingChanges: string[];
  };
  strategy: string;
  phases: string[];
  risks: string[];
  timeline: string;
}

export declare class VersionDetector {
  detectionCache: Map<string, any>;
  compatibilityMatrix: Map<string, any>;
  versionHistory: VersionInfo[];
  currentVersion: VersionInfo | null;

  constructor();

  /**
   * Detect the current framework version
   */
  detectVersion(): VersionInfo;

  /**
   * Check compatibility between versions
   */
  checkCompatibility(sourceVersion: string, targetVersion: string): {
    compatible: boolean;
    requiresAdapters: boolean;
    migrationComplexity: string;
    breakingChanges: string[];
  };

  /**
   * Auto-configure framework based on detected environment
   */
  autoConfigureFramework(overrides?: Record<string, any>): {
    version: string;
    environment: string;
    capabilities: string[];
    features: Partial<FeatureFlags>;
    components: Record<string, any>;
    migration: Record<string, any>;
  };

  /**
   * Create version-appropriate adapters
   */
  createVersionAdapters(components: Record<string, any>): any;

  /**
   * Generate migration strategy
   */
  generateMigrationStrategy(targetVersion: string): MigrationStrategy;
}

/**
 * Factory functions
 */
export declare function createDataService(d1Client: any, modelName: string): GenericDataService;
export declare function getAllDataServices(d1Client: any): Record<string, GenericDataService>;
export declare function autoConfigureFramework(overrides?: Record<string, any>): any;
export declare function getFrameworkVersion(): VersionInfo;
export declare function createVersionAdapters(components: Record<string, any>): any;
export declare function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
export declare function withFeature<T>(
  featureName: keyof FeatureFlags,
  enabledCallback: () => T,
  disabledCallback?: () => T
): T;

/**
 * Feature flag constants
 */
export declare const FEATURES: FeatureFlags;

/**
 * Global instances
 */
export declare const featureManager: FeatureManager;
export declare const versionDetector: VersionDetector;

/**
 * Framework constants
 */
export declare const FRAMEWORK_VERSION: string;
export declare const FRAMEWORK_NAME: string;

/**
 * Framework initialization
 */
export declare function initializeFramework(options?: Record<string, any>): {
  version: string;
  name: string;
  options: Record<string, any>;
};