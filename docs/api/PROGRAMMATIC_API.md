# Programmatic API Guide

This guide covers how to use the clodo-framework programmatically for integration with clodo-application and other tools.

## Overview

The clodo-framework provides comprehensive programmatic APIs for service creation, validation, and introspection. These APIs enable seamless integration without requiring interactive CLI usage.

## Quick Start

```javascript
import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';
import { validateServicePayload } from '@tamyla/clodo-framework/validation';
import { getFrameworkCapabilities } from '@tamyla/clodo-framework/api';

// Create a service programmatically
const payload = {
  serviceName: 'my-api-service',
  serviceType: 'api-service',
  domain: 'myapp.example.com',
  features: ['d1', 'metrics'],
  description: 'My API service'
};

const result = await createServiceProgrammatic(payload, {
  outputDir: './services'
});

if (result.success) {
  console.log(`Service created at: ${result.servicePath}`);
} else {
  console.error('Creation failed:', result.errors);
}
```

## Core APIs

### Service Creation

#### `createServiceProgrammatic(payload, options)`

Creates a service programmatically without interactive prompts.

**Parameters:**
- `payload` (ServicePayload): Service configuration object
- `options` (Object): Creation options

**Options:**
- `outputDir` (string): Directory to create the service in (default: '.')
- `dryRun` (boolean): Validate without creating files (default: false)
- `force` (boolean): Continue despite validation errors (default: false)

**Returns:** Promise<ServiceCreationResult>

**Example:**
```javascript
const result = await createServiceProgrammatic({
  serviceName: 'api-gateway',
  serviceType: 'gateway',
  domain: 'api.example.com',
  features: ['durableObject', 'metrics']
}, {
  outputDir: './services',
  dryRun: false
});
```

### Payload Validation

#### `validateServicePayload(payload)`

Validates a service payload against the framework schema.

**Parameters:**
- `payload` (ServicePayload): Payload to validate

**Returns:** ValidationResult

**Example:**
```javascript
const validation = validateServicePayload({
  serviceName: 'my-service',
  serviceType: 'invalid-type', // This will fail
  domain: 'example.com'
});

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Parameter Discovery

#### `getParameterDefinitions()`

Returns metadata about all supported parameters.

**Returns:** Record<string, ParameterDefinition>

**Example:**
```javascript
const params = getParameterDefinitions();

console.log('Required parameters:');
Object.entries(params)
  .filter(([_, def]) => def.required)
  .forEach(([name, def]) => {
    console.log(`${name}: ${def.description}`);
  });
```

### Framework Capabilities

#### `getFrameworkCapabilities()`

Returns information about framework capabilities and supported features.

**Returns:** FrameworkCapabilities

**Example:**
```javascript
const capabilities = getFrameworkCapabilities();

console.log(`Framework version: ${capabilities.version}`);
console.log(`Supports programmatic creation: ${capabilities.supportsProgrammaticCreation}`);
console.log(`Supported service types: ${capabilities.supportedServiceTypes.join(', ')}`);
```

### Version Compatibility

#### `checkApplicationCompatibility(applicationVersion)`

Checks if an application version is compatible with the current framework.

**Parameters:**
- `applicationVersion` (string): Version to check

**Returns:** CompatibilityResult

**Example:**
```javascript
const compatibility = checkApplicationCompatibility('1.0.0');

if (!compatibility.compatible) {
  console.log('Breaking changes:', compatibility.breakingChanges);
  console.log('Recommendations:', compatibility.recommendations);
}
```

## Service Payload Schema

The `ServicePayload` object supports the following properties:

### Required Properties

- `serviceName` (string): Unique service identifier (3-50 chars, lowercase, numbers, hyphens)
- `serviceType` (string): Type of service (see supported types below)
- `domain` (string): Domain name for the service

### Optional Properties

- `description` (string): Human-readable description
- `template` (string): Template to use (default: 'generic')
- `features` (string[]): Array of features to enable
- `bindings` (string[]): Resource bindings
- `resources` (object): Resource configuration
- `specs` (object): Service specifications (memory, CPU, etc.)
- `clodo` (object): Passthrough data for clodo-application

## Supported Service Types

- `api-service`: REST API service
- `data-service`: Data processing service
- `worker`: Background worker service
- `pages`: Static site service
- `gateway`: API gateway service

## Supported Features

- `d1`: Cloudflare D1 database
- `upstash`: Upstash Redis
- `r2`: Cloudflare R2 storage
- `pages`: Cloudflare Pages
- `ws`: WebSocket support
- `durableObject`: Durable Objects
- `cron`: Cron triggers
- `metrics`: Metrics collection

## Error Handling

All programmatic APIs return structured error information:

```javascript
const result = await createServiceProgrammatic(payload);

if (!result.success) {
  // Handle errors
  result.errors.forEach(error => {
    console.error(`Error: ${error.message}`);
  });

  // Handle warnings
  result.warnings.forEach(warning => {
    console.warn(`Warning: ${warning.message}`);
  });
}
```

## Integration Testing

Use the mock framework for testing integrations:

```javascript
import { createMockFramework } from '@tamyla/clodo-framework/testing';

const mockFramework = createMockFramework();

// Test your integration
const result = await mockFramework.createService(payload);
expect(result.success).toBe(true);
```

## Migration from CLI

### Before (CLI)
```bash
npx clodo-service create
# Interactive prompts...
```

### After (Programmatic)
```javascript
import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';

const result = await createServiceProgrammatic({
  serviceName: 'my-service',
  serviceType: 'api-service',
  domain: 'example.com'
});
```

## Best Practices

1. **Always validate payloads** before creation
2. **Check framework capabilities** before using advanced features
3. **Handle errors gracefully** with proper user feedback
4. **Use dry-run mode** for testing integrations
5. **Check version compatibility** in production deployments
6. **Test integrations** using the mock framework

## Troubleshooting

### Common Issues

**"Parameter not supported"**
- Check `getParameterDefinitions()` for supported parameters
- Verify parameter names and types

**"Service type not valid"**
- Use `getFrameworkCapabilities()` to get supported service types
- Check enum values against framework capabilities

**"Validation failed"**
- Use `validateServicePayload()` to get detailed error information
- Check parameter formats and required fields

**"Version incompatibility"**
- Use `checkApplicationCompatibility()` to verify version compatibility
- Update application or framework as recommended