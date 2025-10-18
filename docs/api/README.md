# API Reference

## 📚 Core Classes and Functions

### **Configuration System**

#### **FeatureFlagManager**
```javascript
import { FeatureFlagManager } from '@tamyla/clodo-framework';

const featureManager = new FeatureFlagManager();
```

**Methods:**
```javascript
// Set domain context for feature resolution
setDomain(domainConfig: DomainConfig): void

// Check if a feature is enabled
isEnabled(featureName: string, defaultValue?: boolean): boolean

// Get all enabled features
getEnabledFeatures(): string[]

// Get all disabled features  
getDisabledFeatures(): string[]

// Get all configured features with status
getAllFeatures(): Record<string, boolean>

// Set global feature override (for testing)
setGlobalOverride(featureName: string, enabled: boolean): void

// Remove global override
removeGlobalOverride(featureName: string): void

// Clear all global overrides
clearGlobalOverrides(): void

// Get detailed feature information
getFeatureInfo(featureName: string): FeatureInfo

// Create conditional handler based on feature
createToggle(featureName: string, enabledFn: Function, disabledFn?: Function): Function

// Add/remove event listeners
addListener(callback: Function): void
removeListener(callback: Function): void
```

**Types:**
```typescript
interface FeatureInfo {
  name: string;
  domainEnabled: boolean | null;
  globalOverride: boolean | undefined;
  effectiveEnabled: boolean;
  hasOverride: boolean;
  domain: string;
}
```

#### **Domain Configuration Functions**
```javascript
import { 
  createDomainConfigSchema,
  validateDomainConfig,
  mergeDomainConfigs,
  createDomainRegistry,
  getDomainFromEnv,
  createEnvironmentConfig 
} from '@tamyla/clodo-framework';
```

**Functions:**
```javascript
// Create base domain configuration template
createDomainConfigSchema(): DomainConfig

// Validate domain configuration
validateDomainConfig(config: DomainConfig): void // throws on invalid

// Merge base and service-specific configs
mergeDomainConfigs(baseConfig: DomainConfig, serviceConfig: DomainConfig): DomainConfig

// Create domain registry with lookup methods
createDomainRegistry(domainConfigs: Record<string, DomainConfig>): DomainRegistry

// Get domain config from environment variables
getDomainFromEnv(env: WorkerEnv, domainConfigs: Record<string, DomainConfig>): DomainConfig

// Create environment-specific configuration
createEnvironmentConfig(baseConfig: DomainConfig, environment?: string): DomainConfig
```

**Types:**
```typescript
interface DomainConfig {
  name: string;
  displayName: string;
  accountId: string;
  zoneId: string;
  domains: {
    production: string;
    staging: string;
    development: string;
  };
  services: Record<string, any>;
  databases: Record<string, any>;
  features: Record<string, boolean>;
  settings: {
    environment: string;
    logLevel: string;
    corsOrigins: string[];
  };
}

interface DomainRegistry {
  get(domainName: string): DomainConfig;
  list(): string[];
  validateAll(): void;
  add(domainName: string, config: DomainConfig): void;
  remove(domainName: string): void;
}
```

### **Data Services**

#### **GenericDataService**
```javascript
import { GenericDataService } from '@tamyla/clodo-framework';

const userService = new GenericDataService(d1Client, 'users');
```

**Constructor:**
```javascript
new GenericDataService(d1Client: D1Database, modelName: string)
```

**CRUD Methods:**
```javascript
// Create new record
async create(data: Record<string, any>): Promise<Record<string, any>>

// Find record by ID
async findById(id: string): Promise<Record<string, any> | null>

// Find records by criteria
async find(criteria?: Record<string, any>, options?: QueryOptions): Promise<Record<string, any>[]>

// Find all records
async findAll(options?: QueryOptions): Promise<Record<string, any>[]>

// Update record
async update(id: string, updates: Record<string, any>): Promise<Record<string, any>>

// Delete record
async delete(id: string): Promise<boolean>

// Paginate results
async paginate(criteria?: Record<string, any>, pagination?: PaginationOptions): Promise<PaginatedResult>
```

**Types:**
```typescript
interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

interface PaginatedResult {
  data: Record<string, any>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### **SchemaManager**
```javascript
import { schemaManager } from '@tamyla/clodo-framework';
```

**Methods:**
```javascript
// Register a data model
registerModel(name: string, schema: ModelSchema): void

// Get registered model
getModel(name: string): ModelSchema | null

// Get all registered models
getAllModels(): Map<string, ModelSchema>

// Validate data against model schema
validateData(modelName: string, data: Record<string, any>): ValidationResult

// Generate SQL for operations
generateSQL(modelName: string, operation: 'create' | 'read' | 'update' | 'delete', data: any): SQLResult

// Generate table creation SQL
generateTableSQL(modelName: string): string

// Generate index creation SQL
generateIndexSQL(modelName: string): string[]
```

**Types:**
```typescript
interface ModelSchema {
  tableName: string;
  columns: Record<string, ColumnDefinition>;
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
}

interface ColumnDefinition {
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'json';
  primaryKey?: boolean;
  required?: boolean;
  unique?: boolean;
  default?: any;
  auto?: boolean;  // For timestamps
  maxLength?: number;
  minLength?: number;
}

interface ValidationResult {
  valid: boolean;
  data: Record<string, any>;  // Cleaned/transformed data
  errors: string[];
}

interface SQLResult {
  sql: string;
  params: any[];
}
```

### **Routing System**

#### **EnhancedRouter**
```javascript
import { EnhancedRouter } from '@tamyla/clodo-framework';

const router = new EnhancedRouter(d1Client, options);
```

**Constructor:**
```javascript
new EnhancedRouter(d1Client: D1Database, options?: RouterOptions)
```

**Methods:**
```javascript
// Register custom route
registerRoute(method: string, path: string, handler: RouteHandler): void

// Handle incoming request
async handleRequest(method: string, path: string, request: Request): Promise<Response>

// Get registered routes (for debugging)
getRoutes(): Map<string, RouteHandler>
```

**Types:**
```typescript
interface RouterOptions {
  requireAuth?: boolean;
  allowPublicRead?: boolean;
  customValidators?: Record<string, Function>;
  hooks?: Record<string, Function>;
}

type RouteHandler = (request: Request, ...params: string[]) => Promise<Response>;
```

#### **GenericRouteHandler**
```javascript
import { GenericRouteHandler } from '@tamyla/clodo-framework';

const handler = new GenericRouteHandler(d1Client, 'users', options);
```

**Constructor:**
```javascript
new GenericRouteHandler(d1Client: D1Database, modelName: string, options?: HandlerOptions)
```

**HTTP Handlers:**
```javascript
// List all records - GET /api/model
async handleList(request: Request): Promise<Response>

// Create new record - POST /api/model
async handleCreate(request: Request): Promise<Response>

// Get single record - GET /api/model/:id
async handleGet(request: Request, id: string): Promise<Response>

// Update record - PATCH /api/model/:id
async handleUpdate(request: Request, id: string): Promise<Response>

// Delete record - DELETE /api/model/:id
async handleDelete(request: Request, id: string): Promise<Response>
```

**Types:**
```typescript
interface HandlerOptions {
  requireAuth?: boolean;
  allowPublicRead?: boolean;
  customValidators?: Record<string, Function>;
  hooks?: {
    beforeCreate?: Function;
    afterCreate?: Function;
    beforeUpdate?: Function;
    afterUpdate?: Function;
    beforeDelete?: Function;
    afterDelete?: Function;
  };
}
```

### **Worker Integration**

#### **Service Initialization**
```javascript
import { initializeService } from '@tamyla/clodo-framework';

const service = initializeService(env, domainConfigs);
```

**Function:**
```javascript
initializeService(
  env: WorkerEnv, 
  domainConfigs: Record<string, DomainConfig>
): ServiceContext
```

**Types:**
```typescript
interface ServiceContext {
  domain: string;
  environment: string;
  features: string[];
  config: DomainConfig;
  env: WorkerEnv;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
}

interface WorkerEnv {
  DOMAIN_NAME?: string;
  CF_DOMAIN_NAME?: string;
  ENVIRONMENT?: string;
  NODE_ENV?: string;
  [key: string]: any;
}
```

#### **Feature Guards**
```javascript
import { createFeatureGuard } from '@tamyla/clodo-framework';

const guard = createFeatureGuard('featureName', options);
```

**Function:**
```javascript
createFeatureGuard(
  featureName: string, 
  options?: FeatureGuardOptions
): (handler: RouteHandler) => RouteHandler
```

**Usage:**
```javascript
// Wrap route handler with feature guard
const protectedHandler = createFeatureGuard('premiumFeatures')(
  async (request, env, ctx) => {
    // Handler only executes if feature is enabled
    return new Response('Premium feature content');
  }
);
```

**Types:**
```typescript
interface FeatureGuardOptions {
  fallbackResponse?: Response;
  required?: boolean;
  logAccess?: boolean;
}
```

### **Module System**

#### **ModuleManager**
```javascript
import { moduleManager } from '@tamyla/clodo-framework';
```

**Methods:**
```javascript
// Register custom module
registerModule(name: string, module: Module): void

// Get registered module
getModule(name: string): Module | null

// Execute lifecycle hooks
async executeHooks(hookName: string, context: HookContext): Promise<void>

// List registered modules
getModules(): Map<string, Module>
```

**Types:**
```typescript
interface Module {
  name: string;
  version?: string;
  hooks?: Record<string, Function>;
  initialize?: (context: any) => Promise<void>;
}

interface HookContext {
  model?: string;
  request?: Request;
  data?: any;
  result?: any;
  [key: string]: any;
}
```

### **Utility Functions**

#### **Logging**
```javascript
import { createLogger } from '@tamyla/clodo-framework';

const logger = createLogger('ServiceName');
```

**Logger Methods:**
```javascript
logger.debug(message: string, ...args: any[]): void
logger.info(message: string, ...args: any[]): void
logger.warn(message: string, ...args: any[]): void
logger.error(message: string, ...args: any[]): void
```

#### **Validation Helpers**
```javascript
import { validateRequired, deepMerge } from '@tamyla/clodo-framework';

// Validate required fields exist
validateRequired(object: any, requiredFields: string[]): void // throws on missing

// Deep merge objects
deepMerge(target: any, source: any): any
```

### **Constants**

#### **Common Features**
```javascript
import { COMMON_FEATURES } from '@tamyla/clodo-framework';

// Pre-defined feature names
COMMON_FEATURES.AUTHENTICATION     // 'authentication'
COMMON_FEATURES.AUTHORIZATION      // 'authorization'
COMMON_FEATURES.LOGGING           // 'logging'
COMMON_FEATURES.MONITORING        // 'monitoring'
COMMON_FEATURES.ANALYTICS         // 'analytics'
COMMON_FEATURES.CACHING           // 'caching'
COMMON_FEATURES.RATE_LIMITING     // 'rateLimiting'
COMMON_FEATURES.FILE_STORAGE      // 'fileStorage'
COMMON_FEATURES.EMAIL_NOTIFICATIONS // 'emailNotifications'
COMMON_FEATURES.PUSH_NOTIFICATIONS  // 'pushNotifications'
COMMON_FEATURES.SEARCH            // 'search'
COMMON_FEATURES.FILTERING         // 'filtering'
COMMON_FEATURES.SORTING           // 'sorting'
COMMON_FEATURES.PAGINATION        // 'pagination'
COMMON_FEATURES.EXPORT            // 'export'
COMMON_FEATURES.IMPORT            // 'import'
COMMON_FEATURES.BACKUP            // 'backup'
COMMON_FEATURES.RESTORE           // 'restore'
```

## 🔧 Framework Information

```javascript
import { FRAMEWORK_VERSION, FRAMEWORK_NAME, initializeFramework } from '@tamyla/clodo-framework';

console.log(FRAMEWORK_NAME);     // 'Clodo Framework'
console.log(FRAMEWORK_VERSION);  // '1.0.0'

// Initialize framework with options
const framework = initializeFramework({
  logLevel: 'debug',
  enableMetrics: true
});
```

---

**Next**: [Configuration API Details](./configuration.md)