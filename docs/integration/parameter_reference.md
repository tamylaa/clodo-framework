# Parameter Reference

This document provides a complete reference for all parameters accepted by the Clodo Framework's programmatic service creation API.

## Overview

The `getAcceptedParameters()` API returns detailed information about all parameters that can be used when creating services programmatically. This document serves as a static reference of these parameters.

## Parameter Definitions

### serviceName

**Type:** `string`  
**Required:** Yes  
**Description:** Unique identifier for the service

**Validation Rules:**
- Pattern: `^[a-z0-9-]+$` (lowercase letters, numbers, and hyphens only)
- Minimum length: 3 characters
- Maximum length: 50 characters

**Example:**
```json
{
  "serviceName": "my-api-service"
}
```

### serviceType

**Type:** `string`  
**Required:** Yes  
**Description:** Type of service to create

**Allowed Values:**
- `"api-service"` - REST API service
- `"data-service"` - Data processing service
- `"worker"` - Background worker service
- `"pages"` - Static site/pages service
- `"gateway"` - API gateway service
- `"generic"` - Generic service

**Example:**
```json
{
  "serviceType": "api-service"
}
```

### domain

**Type:** `string`  
**Required:** Yes  
**Description:** Domain for the service

**Validation Rules:**
- Pattern: `^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$` (valid domain name format)

**Example:**
```json
{
  "domain": "api.example.com"
}
```

### description

**Type:** `string`  
**Required:** No  
**Description:** Human-readable description of the service

**Example:**
```json
{
  "description": "Customer management API service"
}
```

### template

**Type:** `string`  
**Required:** No  
**Description:** Template to use for service generation  
**Default:** `"generic"`

**Example:**
```json
{
  "template": "express-api"
}
```

### features

**Type:** `array` of `string`  
**Required:** No  
**Description:** Features to enable for the service

**Allowed Values:**
- `"d1"` - Cloudflare D1 database
- `"upstash"` - Upstash Redis
- `"kv"` - Cloudflare KV storage (legacy)
- `"r2"` - Cloudflare R2 object storage
- `"pages"` - Cloudflare Pages
- `"ws"` - WebSocket support
- `"durableObject"` - Durable Objects
- `"durableObjects"` - Durable Objects (alias)
- `"cron"` - Cron trigger support
- `"metrics"` - Metrics collection

**Example:**
```json
{
  "features": ["d1", "metrics", "upstash"]
}
```

### bindings

**Type:** `array` of `string`  
**Required:** No  
**Description:** Resource bindings for the service

**Example:**
```json
{
  "bindings": ["database", "cache"]
}
```

### resources

**Type:** `object`  
**Required:** No  
**Description:** Resource configuration

**Example:**
```json
{
  "resources": {
    "cpu": "1vCPU",
    "memory": "256MB",
    "storage": "10GB"
  }
}
```

### specs

**Type:** `object`  
**Required:** No  
**Description:** Service specifications (memory, CPU, etc.)

**Example:**
```json
{
  "specs": {
    "memory": "128MB",
    "cpu": "0.5vCPU",
    "timeout": "30s"
  }
}
```

### clodo

**Type:** `object`  
**Required:** No  
**Description:** Passthrough data for clodo-application specific configuration

**Notes:**
- This field allows passing custom configuration data to clodo-application
- The framework preserves this data but does not validate its contents
- Applications can use this for custom extensions and configurations

**Example:**
```json
{
  "clodo": {
    "customDeployment": {
      "region": "us-east-1",
      "scaling": {
        "minInstances": 1,
        "maxInstances": 10
      }
    },
    "monitoring": {
      "alerts": ["error-rate", "latency"]
    }
  }
}
```

## Complete Example Payload

```json
{
  "serviceName": "customer-api",
  "serviceType": "api-service",
  "domain": "api.customerapp.com",
  "description": "REST API for customer management",
  "template": "express-api",
  "features": ["d1", "upstash", "metrics"],
  "bindings": ["customer-db", "cache"],
  "resources": {
    "cpu": "1vCPU",
    "memory": "512MB"
  },
  "specs": {
    "timeout": "30s",
    "concurrency": 10
  },
  "clodo": {
    "deployment": {
      "environment": "production",
      "scaling": {
        "enabled": true,
        "minInstances": 2,
        "maxInstances": 20
      }
    },
    "monitoring": {
      "datadog": {
        "enabled": true,
        "apiKey": "${DATADOG_API_KEY}"
      }
    }
  }
}
```

## Validation

All parameters are validated according to their type and rules. Use `validateServicePayload()` to check payloads before service creation:

```javascript
import { validateServicePayload } from '@tamyla/clodo-framework';

const payload = { /* your payload */ };
const result = validateServicePayload(payload);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Dynamic Parameter Discovery

While this document provides a static reference, the actual accepted parameters may vary by framework version. Always use `getAcceptedParameters()` in code to get the current parameter definitions:

```javascript
import { getAcceptedParameters } from '@tamyla/clodo-framework';

const parameters = getAcceptedParameters();
console.log('Current parameters:', Object.keys(parameters));
```

## Version Compatibility

Parameters may be added, removed, or modified between framework versions. Check the `sinceVersion` field in parameter definitions to understand when parameters were introduced.

## Error Reference

### Validation Errors

| Error Code | Description | Example |
|------------|-------------|---------|
| `REQUIRED_FIELD_MISSING` | Required parameter is missing | `serviceName` not provided |
| `INVALID_TYPE` | Parameter has wrong type | `serviceName` is number instead of string |
| `INVALID_ENUM_VALUE` | Parameter value not in allowed list | `serviceType` is `"invalid-type"` |
| `INVALID_FORMAT` | Parameter doesn't match required format | `serviceName` contains uppercase |
| `SCHEMA_VALIDATION` | General schema validation failure | Complex validation rule failure |

### Common Issues

1. **Service name validation**: Must be lowercase, numbers, and hyphens only
2. **Domain validation**: Must be a valid domain name format
3. **Feature validation**: Only predefined features are allowed
4. **Type validation**: Parameters must match their declared types

## Testing

Use the mock framework for testing parameter handling:

```javascript
import { createMockFramework } from '@tamyla/clodo-framework';

const mockFramework = createMockFramework();
const parameters = mockFramework.getAcceptedParameters();

// Test parameter validation
const result = await mockFramework.createService({
  serviceName: 'test-service',
  serviceType: 'api-service',
  domain: 'test.com'
});
```