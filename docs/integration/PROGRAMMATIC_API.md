# Programmatic API Guide

This guide explains how to use the Clodo Framework's programmatic APIs for service creation and management without interactive CLI prompts.

## Overview

The Clodo Framework provides several programmatic APIs that enable applications to create, deploy, and manage services programmatically:

- **Service Creation**: Create services using structured payloads
- **Service Deployment**: Deploy services to Cloudflare with full control
- **Service Validation**: Validate existing service configurations
- **Parameter Discovery**: Discover accepted parameters and validation rules
- **Framework Capabilities**: Check framework features and compatibility
- **Validation**: Validate service payloads before creation

## Quick Start

```javascript
import { createServiceProgrammatic, deployServiceProgrammatic, validateServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';
import { getFrameworkCapabilities, getFrameworkVersion } from '@tamyla/clodo-framework/api';
import { getAcceptedParameters, validateServicePayload } from '@tamyla/clodo-framework/validation';
import {
  IntegrationError,
  PayloadValidationError,
  ParameterNotSupportedError
} from '@tamyla/clodo-framework/errors';

// Check framework capabilities
const capabilities = getFrameworkCapabilities();
console.log('Framework version:', capabilities.version);
console.log('Supports programmatic creation:', capabilities.supportsProgrammaticCreation);

// Get parameter definitions
const parameters = getAcceptedParameters();
console.log('Required parameters:', Object.keys(parameters).filter(key => parameters[key].required));

// Validate payload
const validation = validateServicePayload(payload);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Create a service
const result = await createServiceProgrammatic(payload, { outputDir: './services' });
if (result.success) {
  console.log('Service created:', result.serviceId);
  console.log('Service path:', result.servicePath);
} else {
  console.error('Creation failed:', result.errors);
}

// Deploy the service
const deployResult = await deployServiceProgrammatic({
  servicePath: result.servicePath,
  environment: 'production',
  dryRun: false
});
if (deployResult.success) {
  console.log('Service deployed successfully');
} else {
  console.error('Deployment failed:', deployResult.errors);
}

// Validate the deployed service
const validationResult = await validateServiceProgrammatic(result.servicePath);
if (validationResult.success) {
  console.log('Service validation passed');
} else {
  console.error('Validation issues:', validationResult.issues);
}
```

## API Reference

### Service Creation

#### `createServiceProgrammatic(payload, options?)`

Creates a service programmatically using the provided payload.

**Import:** `import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic'`

**Parameters:**
- `payload` (ServicePayload): Service creation payload
- `options` (ServiceCreationOptions, optional): Creation options

**Returns:** Promise<ServiceCreationResult>

**Example:**
```javascript
import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';

const result = await createServiceProgrammatic({
  serviceName: 'my-service',
  serviceType: 'api-service',
  domain: 'example.com',
  features: ['d1', 'metrics']
}, {
  outputDir: './services',
  dryRun: false
});
```

#### Service Payload Structure

```typescript
interface ServicePayload {
  serviceName: string;        // Required: Unique service identifier
  serviceType: string;        // Required: Type of service ('api-service', 'data-service', etc.)
  domain: string;            // Required: Service domain
  description?: string;      // Optional: Human-readable description
  template?: string;         // Optional: Template to use
  features?: string[];       // Optional: Features to enable
  bindings?: string[];       // Optional: Resource bindings
  resources?: object;        // Optional: Resource configuration
  specs?: object;           // Optional: Service specifications
  clodo?: object;           // Optional: Passthrough data for clodo-application
}
```

#### Service Creation Result

```typescript
interface ServiceCreationResult {
  success: boolean;
  serviceId?: string;        // Present if success = true
  servicePath?: string;      // Present if success = true
  errors?: string[];         // Present if success = false
  warnings?: string[];       // Validation warnings
}
```

### Service Deployment

#### `deployServiceProgrammatic(options?)`

Deploys a service to Cloudflare Workers with full programmatic control.

**Import:** `import { deployServiceProgrammatic } from '@tamyla/clodo-framework/programmatic'`

**Parameters:**
- `options` (DeploymentOptions, optional): Deployment configuration

**Returns:** Promise<DeploymentResult>

**Example:**
```javascript
import { deployServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';

const result = await deployServiceProgrammatic({
  servicePath: './my-service',
  environment: 'production',
  domain: 'api.example.com',
  serviceName: 'my-api-service',
  dryRun: false,
  credentials: {
    token: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID
  }
});
```

#### Deployment Options

```typescript
interface DeploymentOptions {
  servicePath?: string;      // Path to service directory (default: '.')
  environment?: string;      // Target environment ('development', 'staging', 'production')
  domain?: string;          // Specific domain to deploy to
  serviceName?: string;     // Service name for URL generation
  workerName?: string;      // Specific worker name to use
  databaseName?: string;    // Specific database name to use
  dryRun?: boolean;         // Simulate deployment without changes
  credentials?: {           // Cloudflare credentials
    token?: string;
    accountId?: string;
    zoneId?: string;
  };
}
```

#### Deployment Result

```typescript
interface DeploymentResult {
  success: boolean;
  message?: string;          // Success message
  deployedDomains?: string[]; // Domains where service was deployed
  errors?: string[];         // Present if success = false
}
```

### Service Validation

#### `validateServiceProgrammatic(servicePath?, options?)`

Validates an existing service configuration and returns detailed validation results.

**Import:** `import { validateServiceProgrammatic } from '@tamyla/clodo-framework/programmatic'`

**Parameters:**
- `servicePath` (string, optional): Path to service directory (default: '.')
- `options` (ValidationOptions, optional): Validation configuration

**Returns:** Promise<ValidationResult>

**Example:**
```javascript
import { validateServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';

const result = await validateServiceProgrammatic('./my-service', {
  exportReport: './validation-report.json'
});

if (result.success) {
  console.log('Service is valid');
  if (result.issues && result.issues.length > 0) {
    console.log(`Found ${result.issues.length} minor issues`);
  }
} else {
  console.error('Validation failed:', result.message);
  console.error('Issues:', result.issues);
}
```

#### Validation Options

```typescript
interface ValidationOptions {
  exportReport?: string;     // Path to export JSON validation report
}
```

#### Validation Result

```typescript
interface ValidationResult {
  success: boolean;
  message?: string;          // Validation summary message
  issues?: string[];         // List of validation issues found
}
```

### Parameter Discovery

#### `getAcceptedParameters()`

Returns detailed information about all accepted parameters for service creation.

**Import:** `import { getAcceptedParameters } from '@tamyla/clodo-framework/validation'`

**Returns:** Object mapping parameter names to parameter definitions

**Example:**
```javascript
import { getAcceptedParameters } from '@tamyla/clodo-framework/validation';

const params = getAcceptedParameters();

console.log('Service name validation:', params.serviceName.validationRules);
// Output: [{ rule: 'pattern', value: '^[a-z0-9-]+$', message: '...' }, ...]

console.log('Supported service types:', params.serviceType.enum);
// Output: ['api-service', 'data-service', 'worker', 'pages', 'gateway']
```

#### Parameter Definition Structure

```typescript
interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  enum?: string[];
  defaultValue?: any;
  validationRules?: ValidationRule[];
  sinceVersion?: string;
}

interface ValidationRule {
  rule: string;
  value?: any;
  message: string;
}
```

### Framework Capabilities

#### `getFrameworkCapabilities()`

Returns information about framework capabilities and supported features.

**Import:** `import { getFrameworkCapabilities } from '@tamyla/clodo-framework/api'`

**Returns:** FrameworkCapabilities

#### `getFrameworkVersion()`

Returns the current framework version string.

**Import:** `import { getFrameworkVersion } from '@tamyla/clodo-framework/api'`

**Returns:** string object

**Example:**
```javascript
const capabilities = getFrameworkCapabilities();

if (capabilities.supportsProgrammaticCreation) {
  console.log('✅ Programmatic creation supported');
}

console.log('Supported features:', capabilities.supportedFeatures);
```

#### Framework Capabilities Structure

```typescript
interface FrameworkCapabilities {
  version: string;
  supportsProgrammaticCreation: boolean;
  supportedServiceTypes: string[];
  supportedFeatures: string[];
  hasParameterDiscovery: boolean;
  hasUnifiedValidation: boolean;
  supportsPassthrough: boolean;
}
```

#### `getFrameworkVersion()`

Returns the current framework version as a string.

**Returns:** string

**Example:**
```javascript
const version = getFrameworkVersion();
console.log('Framework version:', version);
```

## Version Compatibility

Check compatibility between your application and the framework:

```javascript
import { checkApplicationCompatibility, getSupportedApplicationVersions } from '@tamyla/clodo-framework/api';

const compatibility = checkApplicationCompatibility('1.0.0');
if (!compatibility.compatible) {
  console.error('Incompatible:', compatibility.breakingChanges);
  console.log('Recommendations:', compatibility.recommendations);
}

// Get supported version ranges
const supportedVersions = getSupportedApplicationVersions();
console.log('Supported application versions:', supportedVersions);
```

### Version Compatibility Functions

#### `checkApplicationCompatibility(appVersion: string)`

Checks if a given application version is compatible with the current framework version.

**Parameters:**
- `appVersion`: Application version string (e.g., "1.0.0")

**Returns:** CompatibilityResult

#### `getSupportedApplicationVersions()`

Returns the range of application versions supported by the current framework version.

**Returns:** VersionRange

#### `getVersionCompatibilityMatrix()`

Returns a matrix showing compatibility between framework and application versions.

**Returns:** CompatibilityMatrix

### Compatibility Result Structure

```typescript
interface CompatibilityResult {
  compatible: boolean;
  breakingChanges: string[];
  recommendations: string[];
  frameworkVersion: string;
  applicationVersion: string;
}
```

## Validation

### Payload Validation

Before creating services, you can validate payloads:

```javascript
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

const payload = {
  serviceName: 'my-service',
  serviceType: 'api-service',
  domain: 'example.com'
};

const validation = validateServicePayload(payload);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Validation warnings:', validation.warnings);
}
```

### Validation Result Structure

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  expected?: any;
}

interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}
```

## Error Handling

The programmatic APIs use structured error classes for better error handling:

```javascript
import {
  PayloadValidationError,
  ParameterNotSupportedError,
  VersionCompatibilityError
} from '@tamyla/clodo-framework/errors';

try {
  const result = await createService(payload);
} catch (error) {
  if (error instanceof PayloadValidationError) {
    console.error('Validation failed:', error.details.validationResult.errors);
  } else if (error instanceof ParameterNotSupportedError) {
    console.error('Parameter not supported:', error.details.parameterName);
  } else if (error instanceof VersionCompatibilityError) {
    console.error('Version incompatibility:', error.message);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Testing

### Mock Framework

For testing integrations, use the mock framework:

```javascript
import { createMockFramework } from '@tamyla/clodo-framework/testing';

const mockFramework = createMockFramework();

// Use mock APIs
const capabilities = mockFramework.getFrameworkCapabilities();
const result = await mockFramework.createService(payload);

// Access underlying mock for advanced testing
const orchestrator = mockFramework._mockOrchestrator;
const createdServices = orchestrator.getCreatedServices();
```

### Mock Service Payloads

Helper function to create test payloads:

```javascript
import { createMockServicePayload } from '@tamyla/clodo-framework/testing';

const payload = createMockServicePayload({
  serviceName: 'test-service',
  features: ['d1', 'upstash']
});
```

## Best Practices

### 1. Always Validate First

```javascript
const validation = validateServicePayload(payload);
if (!validation.valid) {
  // Handle validation errors
  throw new PayloadValidationError(validation);
}

const result = await createService(payload);
```

### 2. Check Framework Compatibility

```javascript
const capabilities = getFrameworkCapabilities();
if (!capabilities.supportsProgrammaticCreation) {
  throw new Error('Framework does not support programmatic creation');
}
```

### 3. Handle Warnings

```javascript
const result = await createService(payload);
if (result.warnings && result.warnings.length > 0) {
  console.warn('Service created with warnings:', result.warnings);
  // Consider logging or user notification
}
```

### 4. Use Structured Error Handling

```javascript
try {
  const result = await createService(payload);
  // Handle success
} catch (error) {
  if (error instanceof IntegrationError) {
    // Structured error with code and details
    console.error(`Integration error ${error.code}:`, error.message);
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
  }
}
```

### 5. Test with Mocks

```javascript
// In test files
const mockFramework = createMockFramework();
const result = await mockFramework.createService(testPayload);

// Assert results
expect(result.success).toBe(true);
expect(result.serviceId).toMatch(/^mock-/);
```

## Migration from CLI

### Before (Interactive CLI)

```bash
npx clodo-framework create-service
# Interactive prompts...
```

### After (Programmatic)

```javascript
import { createService } from '@tamyla/clodo-framework/programmatic';

const result = await createService({
  serviceName: 'my-service',
  serviceType: 'api-service',
  domain: 'example.com',
  features: ['d1', 'metrics']
});
```

## Troubleshooting

### Common Issues

1. **"Parameter not supported" errors**
   - Check `getAcceptedParameters()` for current parameter definitions
   - Verify framework version compatibility

2. **Validation failures**
   - Use `validateServicePayload()` to check payloads before creation
   - Review validation error messages for specific issues

3. **Service creation failures**
   - Check `result.errors` for detailed error information
   - Ensure all required parameters are provided
   - Verify parameter values match expected formats

4. **Framework compatibility**
   - Use `getFrameworkCapabilities()` to check feature support
   - Update framework version if needed

### Debug Information

Enable debug logging:

```javascript
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

// Get detailed validation info
const validation = validateServicePayload(payload, { debug: true });
console.log('Validation details:', validation);
```

## Examples

### Basic Service Creation

```javascript
import { createService } from '@tamyla/clodo-framework/programmatic';

async function createBasicService() {
  const result = await createService({
    serviceName: 'hello-world',
    serviceType: 'api-service',
    domain: 'hello.example.com',
    description: 'A simple hello world service'
  });

  return result;
}
```

### Advanced Service with Features

```javascript
import { createService } from '@tamyla/clodo-framework/programmatic';
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

async function createAdvancedService() {
  const payload = {
    serviceName: 'data-api',
    serviceType: 'api-service',
    domain: 'api.example.com',
    features: ['d1', 'upstash', 'metrics'],
    description: 'Data API with database and caching',
    clodo: {
      customConfig: 'value'
    }
  };

  // Validate first
  const validation = validateServicePayload(payload);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Create service
  const result = await createService(payload);
  if (!result.success) {
    throw new Error(`Creation failed: ${result.errors.join(', ')}`);
  }

  return result;
}
```

### Integration Testing

```javascript
import { createMockFramework, createMockServicePayload } from '@tamyla/clodo-framework/testing';

describe('My Service Integration', () => {
  let mockFramework;

  beforeEach(() => {
    mockFramework = createMockFramework();
  });

  it('should create service successfully', async () => {
    const payload = createMockServicePayload({
      serviceName: 'test-service',
      features: ['d1']
    });

    const result = await mockFramework.createService(payload);

    expect(result.success).toBe(true);
    expect(result.serviceId).toMatch(/^mock-/);
  });
});
```

## API Stability

- **Stable APIs**: `createService`, `getFrameworkCapabilities`, `getAcceptedParameters`
- **Beta APIs**: Error classes may evolve
- **Internal APIs**: Mock framework is for testing only

All APIs follow semantic versioning. Breaking changes will be clearly documented in release notes.