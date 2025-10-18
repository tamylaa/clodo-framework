# 📚 CLODO Framework - Complete API Reference

> **Version**: 3.0.5  
> **Updated**: October 2025  
> **Coverage**: All public APIs, classes, and functions

---

## 📖 Table of Contents

### Core APIs
- [🏗️ Framework Initialization](#framework-initialization)
- [🗄️ Data Services](#data-services)  
- [🛣️ Routing System](#routing-system)
- [🔐 Security & Authentication](#security--authentication)
- [⚙️ Configuration Management](#configuration-management)

### Advanced APIs  
- [🚀 Deployment & Orchestration](#deployment--orchestration)
- [🧪 Testing & Production](#testing--production)
- [🔧 Utilities & Helpers](#utilities--helpers)
- [🎛️ CLI Tools](#cli-tools)

### Types & Constants
- [📋 TypeScript Definitions](#typescript-definitions)
- [🏷️ Constants & Enums](#constants--enums)

---

## 🏗️ Framework Initialization

### `initializeService(config, env)`

Initialize a CLODO Framework service instance.

```javascript
import { initializeService } from '@tamyla/clodo-framework';

const service = initializeService(domainConfig, env);
```

**Parameters:**
- `config` (Object): Domain configuration object
- `env` (Object): Environment variables and bindings

**Returns:** Service instance with initialized components

**Example:**
```javascript
import { initializeService } from '@tamyla/clodo-framework';
import { domains } from './config/domains.js';

export default {
  async fetch(request, env) {
    const service = initializeService(domains['my-api'], env);
    
    // Use service.router, service.auth, etc.
    return service.router.handleRequest(request);
  }
};
```

### `autoConfigureFramework(overrides?)`

Automatically configure the framework with sensible defaults.

```javascript
import { autoConfigureFramework } from '@tamyla/clodo-framework';

const config = autoConfigureFramework({
  environment: 'production',
  enableAuth: true
});
```

---

## 🗄️ Data Services

### `GenericDataService`

Type-safe database operations with automatic validation.

```javascript
import { GenericDataService } from '@tamyla/clodo-framework';

const userService = new GenericDataService(d1Client, 'users');
```

#### Constructor
```javascript
new GenericDataService(d1Client: D1Database, modelName: string)
```

#### CRUD Methods

##### `create(data)`
```javascript
const user = await userService.create({
  name: 'John Doe',
  email: 'john@example.com'
});
// Returns: { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '...' }
```

##### `findById(id)`
```javascript
const user = await userService.findById('123');
// Returns: User object or null if not found
```

##### `find(criteria?, options?)`
```javascript
const activeUsers = await userService.find(
  { status: 'active' },
  { limit: 10, offset: 0, orderBy: 'created_at DESC' }
);
// Returns: Array of matching users
```

##### `findAll(options?)`
```javascript
const allUsers = await userService.findAll({
  limit: 100,
  orderBy: 'name ASC'
});
// Returns: Array of all users with options applied
```

##### `update(id, updates)`
```javascript
const updatedUser = await userService.update('123', {
  name: 'Jane Doe',
  last_login: new Date().toISOString()
});
// Returns: Updated user object
```

##### `delete(id)`
```javascript
const success = await userService.delete('123');
// Returns: boolean indicating success
```

##### `paginate(page, perPage, criteria?)`
```javascript
const result = await userService.paginate(2, 25, { status: 'active' });
// Returns: { data: [...], total: 150, page: 2, perPage: 25, totalPages: 6 }
```

#### Query Options
```typescript
interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  select?: string[];
}
```

### `createDataService(d1Client, modelName)`

Factory function for creating data services.

```javascript
import { createDataService } from '@tamyla/clodo-framework';

const userService = createDataService(env.DB, 'users');
const postService = createDataService(env.DB, 'posts');
```

### `getAllDataServices(d1Client)`

Create services for all registered models.

```javascript
import { getAllDataServices } from '@tamyla/clodo-framework';

const services = getAllDataServices(env.DB);
// Returns: { users: GenericDataService, posts: GenericDataService, ... }
```

---

## 🏗️ Schema Management

### `schemaManager`

Global schema registry for managing data models.

```javascript
import { schemaManager } from '@tamyla/clodo-framework';
```

#### Methods

##### `registerModel(name, schema)`
```javascript
schemaManager.registerModel('users', {
  tableName: 'users',
  columns: {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'text', required: true },
    email: { type: 'text', required: true, unique: true },
    created_at: { type: 'text', default: 'CURRENT_TIMESTAMP' }
  },
  validation: {
    required: ['name', 'email']
  },
  indexes: [
    { name: 'idx_email', columns: ['email'], unique: true }
  ]
});
```

##### `getModel(name)`
```javascript
const userModel = schemaManager.getModel('users');
// Returns: ModelSchema object or null
```

##### `getAllModels()`
```javascript
const allModels = schemaManager.getAllModels();
// Returns: Map<string, ModelSchema>
```

##### `validateData(modelName, data)`
```javascript
const result = schemaManager.validateData('users', {
  name: 'John',
  email: 'invalid-email' // Will fail validation
});
// Returns: { valid: false, errors: [...] }
```

##### `generateSQL(modelName, operation, data)`
```javascript
const sql = schemaManager.generateSQL('users', 'create', {
  name: 'John',
  email: 'john@example.com'
});
// Returns: { query: 'INSERT INTO...', params: [...] }
```

#### Schema Types
```typescript
interface ModelSchema {
  tableName: string;
  columns: Record<string, ColumnDefinition>;
  validation?: ValidationRules;
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
}

interface ColumnDefinition {
  type: 'integer' | 'text' | 'real' | 'blob';
  primaryKey?: boolean;
  required?: boolean;
  unique?: boolean;
  default?: string | number;
}
```

---

## 🛣️ Routing System

### `EnhancedRouter`

Advanced routing with middleware and authentication support.

```javascript
import { EnhancedRouter } from '@tamyla/clodo-framework';

const router = new EnhancedRouter(d1Client, {
  requireAuth: true,
  allowPublicRead: true
});
```

#### Constructor
```javascript
new EnhancedRouter(d1Client: D1Database, options?: RouterOptions)
```

#### Methods

##### `registerRoute(method, path, handler)`
```javascript
router.registerRoute('GET', '/api/users/:id', async (request, id) => {
  const user = await userService.findById(id);
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

##### `handleRequest(method, path, request)`
```javascript
const response = await router.handleRequest('GET', '/api/users/123', request);
```

#### Router Options
```typescript
interface RouterOptions {
  requireAuth?: boolean;
  allowPublicRead?: boolean;
  customValidators?: Record<string, Function>;
  hooks?: {
    beforeRequest?: Function;
    afterRequest?: Function;
    onError?: Function;
  };
}
```

### `GenericRouteHandler`

Pre-built CRUD route handlers for data models.

```javascript
import { GenericRouteHandler } from '@tamyla/clodo-framework';

const userHandler = new GenericRouteHandler(d1Client, 'users', {
  requireAuth: true,
  allowPublicRead: false
});
```

#### HTTP Handlers

##### `handleList(request)` - GET /api/model
```javascript
const response = await userHandler.handleList(request);
// Supports query params: ?limit=10&offset=20&orderBy=name
```

##### `handleCreate(request)` - POST /api/model
```javascript
const response = await userHandler.handleCreate(request);
// Expects JSON body with model data
```

##### `handleGet(request, id)` - GET /api/model/:id
```javascript
const response = await userHandler.handleGet(request, '123');
```

##### `handleUpdate(request, id)` - PATCH /api/model/:id
```javascript
const response = await userHandler.handleUpdate(request, '123');
// Expects JSON body with updates
```

##### `handleDelete(request, id)` - DELETE /api/model/:id
```javascript
const response = await userHandler.handleDelete(request, '123');
```

---

## 🔐 Security & Authentication

### Core Security Functions

#### `validateSecurity(config, environment?)`
```javascript
import { validateSecurity } from '@tamyla/clodo-framework/security';

const issues = validateSecurity(config, 'production');
// Returns: Array of security issues or empty array if valid
```

#### `deployWithSecurity(options)`
```javascript
import { deployWithSecurity } from '@tamyla/clodo-framework/security';

await deployWithSecurity({
  customer: 'my-company',
  environment: 'production',
  dryRun: false
});
```

#### `generateSecureKey(type?, options?)`
```javascript
import { generateSecureKey } from '@tamyla/clodo-framework/security';

// Generate JWT secret
const jwtSecret = generateSecureKey('jwt', { length: 64 });

// Generate API key
const apiKey = generateSecureKey('api', { length: 32, prefix: 'sk_' });
```

### `ConfigurationValidator`

Validate service configurations for security compliance.

```javascript
import { ConfigurationValidator } from '@tamyla/clodo-framework/security';

const issues = ConfigurationValidator.validate(config, 'production');
const result = ConfigurationValidator.validateConfiguration('my-company', 'prod');
```

### `SecretGenerator`

Generate cryptographically secure keys and tokens.

```javascript
import { SecretGenerator } from '@tamyla/clodo-framework/security';

// Generate different types of secrets
const apiKey = SecretGenerator.generateSecureApiKey(32, 'api_');
const jwtSecret = SecretGenerator.generateSecureJwtSecret(64);
const serviceKey = SecretGenerator.generateServiceKey('auth-service', 'prod');
```

### `DeploymentManager`

Secure deployment orchestration.

```javascript
import { DeploymentManager } from '@tamyla/clodo-framework/security';

// Deploy with security validation
await DeploymentManager.deployWithSecurity({
  customer: 'enterprise-client',
  environment: 'production',
  dryRun: false,
  validateSecurity: true
});

// Generate secure configuration
const config = DeploymentManager.generateSecureConfig('client', 'prod');
```

---

## ⚙️ Configuration Management

### Domain Configuration

#### `createDomainConfigSchema(domains)`
```javascript
import { createDomainConfigSchema } from '@tamyla/clodo-framework';

export const domains = createDomainConfigSchema({
  'my-api': {
    name: 'My API Service',
    environment: 'production',
    features: ['auth', 'database', 'cors', 'rate-limiting'],
    database: {
      enabled: true,
      models: ['users', 'posts', 'comments']
    },
    auth: {
      jwt_secret: process.env.JWT_SECRET,
      enabled: true,
      providers: ['jwt', 'api-key']
    },
    cors: {
      origins: ['https://myapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  }
});
```

#### `validateDomainConfig(domain)`
```javascript
import { validateDomainConfig } from '@tamyla/clodo-framework';

const result = validateDomainConfig(domains['my-api']);
// Returns: { valid: boolean, errors: string[] }
```

#### `createDomainRegistry(domains)`
```javascript
import { createDomainRegistry } from '@tamyla/clodo-framework';

const registry = createDomainRegistry(domains);
```

### Feature Management

#### `FeatureManager`
```javascript
import { featureManager, isFeatureEnabled, withFeature } from '@tamyla/clodo-framework';

// Check if feature is enabled
if (isFeatureEnabled('NEW_API_ENDPOINTS')) {
  // Use new endpoints
}

// Execute code conditionally
withFeature('ADVANCED_LOGGING', 
  () => console.log('Advanced logging enabled'),
  () => console.log('Basic logging')
);
```

#### Feature Constants
```javascript
import { COMMON_FEATURES } from '@tamyla/clodo-framework';

// Available features
COMMON_FEATURES.AUTHENTICATION     // 'authentication'
COMMON_FEATURES.AUTHORIZATION      // 'authorization'
COMMON_FEATURES.LOGGING           // 'logging'
COMMON_FEATURES.MONITORING        // 'monitoring'
COMMON_FEATURES.CACHING           // 'caching'
COMMON_FEATURES.RATE_LIMITING     // 'rateLimiting'
COMMON_FEATURES.FILE_STORAGE      // 'fileStorage'
// ... and many more
```

---

## 🚀 Deployment & Orchestration

### `MultiDomainOrchestrator`

Coordinate deployments across multiple domains and environments.

```javascript
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/orchestration';

const orchestrator = new MultiDomainOrchestrator({
  portfolio: ['api.example.com', 'auth.example.com'],
  environment: 'production',
  parallelLimit: 3,
  dryRun: false
});

await orchestrator.deployPortfolio();
```

#### Methods

##### `initialize(config)`
```javascript
await orchestrator.initialize({
  portfolio: ['domain1.com', 'domain2.com'],
  environment: 'staging',
  parallelLimit: 2
});
```

##### `deployPortfolio()`
```javascript
const results = await orchestrator.deployPortfolio();
// Returns: { successful: [...], failed: [...], duration: 1234 }
```

##### `validatePrerequisites(domain)`
```javascript
const isValid = await orchestrator.validatePrerequisites('api.example.com');
```

### `CrossDomainCoordinator`

Coordinate resources and dependencies across domains.

```javascript
import { CrossDomainCoordinator } from '@tamyla/clodo-framework/orchestration';

const coordinator = new CrossDomainCoordinator();
await coordinator.coordinateDomains(['api.com', 'auth.com']);
```

---

## 🧪 Testing & Production

### `ProductionTester`

Comprehensive production environment testing.

```javascript
import { ProductionTester } from '@tamyla/clodo-framework/deployment';

const tester = new ProductionTester({
  baseUrl: 'https://api.example.com',
  testUser: { email: 'test@example.com', password: 'test123' }
});

const results = await tester.runAllTests();
```

#### Test Methods

##### `runAllTests()`
```javascript
const results = await tester.runAllTests();
// Returns comprehensive test results across all categories
```

##### `runEndpointTests(config)`
```javascript
const endpointResults = await tester.runEndpointTests({
  endpoints: ['/health', '/api/v1/status'],
  timeout: 5000
});
```

##### `runAuthenticationTests(testUser)`
```javascript
const authResults = await tester.runAuthenticationTests({
  email: 'test@example.com',
  password: 'testpass'
});
```

### Specialized Testers

#### `ApiTester`
```javascript
import { ApiTester } from '@tamyla/clodo-framework/deployment';

const apiTester = new ApiTester({ timeout: 5000 });
const results = await apiTester.runApiTests('production');
```

#### `AuthTester`
```javascript
import { AuthTester } from '@tamyla/clodo-framework/deployment';

const authTester = new AuthTester({ jwtSecret: process.env.JWT_SECRET });
const results = await authTester.testAuthFlow(testUser);
```

#### `DatabaseTester`
```javascript
import { DatabaseTester } from '@tamyla/clodo-framework/deployment';

const dbTester = new DatabaseTester({ connectionString: env.DATABASE_URL });
const results = await dbTester.testDatabaseConnectivity();
```

---

## 🔧 Utilities & Helpers

### Logging

#### `createLogger(serviceName)`
```javascript
import { createLogger } from '@tamyla/clodo-framework';

const logger = createLogger('MyService');

logger.debug('Debug message', { data: 'value' });
logger.info('Info message');
logger.warn('Warning message'); 
logger.error('Error message', error);
```

### Validation

#### `validateRequired(object, fields)`
```javascript
import { validateRequired } from '@tamyla/clodo-framework';

try {
  validateRequired(userData, ['name', 'email']);
  // Validation passed
} catch (error) {
  // Missing required fields
}
```

#### `deepMerge(target, source)`
```javascript
import { deepMerge } from '@tamyla/clodo-framework';

const merged = deepMerge(defaultConfig, userConfig);
```

### Error Recovery

#### `ErrorRecoveryManager`
```javascript
import { ErrorRecoveryManager } from '@tamyla/clodo-framework';

const recovery = new ErrorRecoveryManager({
  maxRetries: 3,
  backoffStrategy: 'exponential'
});

await recovery.executeWithRetry(async () => {
  return await riskyOperation();
});
```

#### `withRetry(fn, options)`
```javascript
import { withRetry } from '@tamyla/clodo-framework';

const result = await withRetry(
  () => fetch('https://api.example.com/data'),
  { maxRetries: 3, delay: 1000 }
);
```

#### `withCircuitBreaker(fn, options)`
```javascript
import { withCircuitBreaker } from '@tamyla/clodo-framework';

const result = await withCircuitBreaker(
  () => externalApiCall(),
  { threshold: 5, timeout: 60000 }
);
```

---

## 🎛️ CLI Tools

### Service Management

#### `clodo-create-service`
```bash
# Create new service
node bin/service-management/create-service.js my-api --type data-service

# Available types: data-service, auth-service, content-service, api-gateway, generic
# Options: --output, --force, --type
```

#### `clodo-init-service`
```bash
# Initialize existing service
node bin/service-management/init-service.js ./my-existing-service
```

### Security Tools

#### `clodo-security`
```bash
# Generate secrets
node bin/security/security-cli.js generate-key jwt
node bin/security/security-cli.js generate-key api my-service

# Validate configuration
node bin/security/security-cli.js validate my-customer production

# Deploy securely  
node bin/security/security-cli.js deploy my-customer production
```

### Deployment Tools

#### `enterprise-deploy`
```bash
# Deploy enterprise configuration
node bin/deployment/enterprise-deploy.js --customer enterprise --env production

# Options: --dry-run, --force, --skip-validation
```

#### `master-deploy`
```bash
# Master deployment orchestration
node bin/deployment/master-deploy.js --portfolio portfolio.json --env staging
```

---

## 📋 TypeScript Definitions

### Core Interfaces

#### `ServiceConfig`
```typescript
interface ServiceConfig {
  name: string;
  environment: 'development' | 'staging' | 'production';
  features: string[];
  database?: DatabaseConfig;
  auth?: AuthConfig;
  cors?: CorsConfig;
}
```

#### `DatabaseConfig`
```typescript
interface DatabaseConfig {
  enabled: boolean;
  models: string[];
  migrations?: string[];
}
```

#### `AuthConfig`
```typescript
interface AuthConfig {
  enabled: boolean;
  jwt_secret: string;
  providers: ('jwt' | 'api-key' | 'oauth')[];
  tokenExpiry?: number;
}
```

#### `ValidationResult`
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}
```

#### `QueryOptions`
```typescript
interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  select?: string[];
  where?: Record<string, any>;
}
```

### Response Types

#### `PaginatedResult<T>`
```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

#### `DeploymentResult`
```typescript
interface DeploymentResult {
  successful: string[];
  failed: Array<{ domain: string; error: string }>;
  duration: number;
  timestamp: string;
}
```

---

## 🏷️ Constants & Enums

### Environment Types
```typescript
type Environment = 'development' | 'staging' | 'production' | 'test';
```

### HTTP Methods
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
```

### Feature Flags
```javascript
export const FEATURE_FLAGS = {
  ENABLE_NEW_API: 'enable_new_api',
  ADVANCED_LOGGING: 'advanced_logging',
  RATE_LIMITING: 'rate_limiting',
  CACHING: 'caching'
};
```

### Error Codes
```javascript
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
```

---

## 🔗 Import Paths

```javascript
// Core framework
import { initializeService, autoConfigureFramework } from '@tamyla/clodo-framework';

// Data services
import { GenericDataService, schemaManager } from '@tamyla/clodo-framework/services';

// Routing
import { EnhancedRouter, GenericRouteHandler } from '@tamyla/clodo-framework/routing';

// Security
import { validateSecurity, generateSecureKey } from '@tamyla/clodo-framework/security';

// Configuration
import { createDomainConfigSchema, featureManager } from '@tamyla/clodo-framework/config';

// Orchestration
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/orchestration';

// Testing
import { ProductionTester, ApiTester } from '@tamyla/clodo-framework/deployment';

// Utilities
import { createLogger, validateRequired } from '@tamyla/clodo-framework/utils';
```

---

## 📞 Support & Resources

- **📖 Documentation**: [Complete Guide](../README.md)
- **🚀 Getting Started**: [Interactive Tutorial](./getting-started.md)
- **🔐 Security Guide**: [Security Documentation](../SECURITY.md)
- **🐛 Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- **💬 Discussions**: [Community Forum](https://github.com/tamylaa/clodo-framework/discussions)

---

**🎯 Need something not covered here?** Check our [Developer Guide](./guides/developer-guide.md) or open an issue for missing documentation.