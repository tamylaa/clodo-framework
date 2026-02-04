# Parameter Reference

This document provides detailed reference information for all parameters supported by the clodo-framework programmatic APIs.

## Service Payload Parameters

### serviceName
- **Type:** `string`
- **Required:** Yes
- **Description:** Unique identifier for the service
- **Validation:**
  - Minimum length: 3 characters
  - Maximum length: 50 characters
  - Pattern: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)
- **Example:** `"my-api-service"`

### serviceType
- **Type:** `string`
- **Required:** Yes
- **Description:** Type of service to create
- **Allowed Values:**
  - `"api-service"`: REST API service
  - `"data-service"`: Data processing service
  - `"worker"`: Background worker service
  - `"pages"`: Static site service
  - `"gateway"`: API gateway service
- **Example:** `"api-service"`

### domain
- **Type:** `string`
- **Required:** Yes
- **Description:** Domain name for the service
- **Validation:**
  - Must be a valid domain name format
  - Pattern: `^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$`
- **Example:** `"api.example.com"`

### description
- **Type:** `string`
- **Required:** No
- **Description:** Human-readable description of the service
- **Example:** `"Customer API service with authentication"`

### template
- **Type:** `string`
- **Required:** No
- **Description:** Template to use for service generation
- **Default:** `"generic"`
- **Example:** `"rest-api"`

### features
- **Type:** `string[]`
- **Required:** No
- **Description:** Array of features to enable for the service
- **Allowed Values:**
  - `"d1"`: Cloudflare D1 database
  - `"upstash"`: Upstash Redis database
  - `"r2"`: Cloudflare R2 object storage
  - `"pages"`: Cloudflare Pages integration
  - `"ws"`: WebSocket support
  - `"durableObject"`: Cloudflare Durable Objects
  - `"cron"`: Cron trigger support
  - `"metrics"`: Metrics collection and monitoring
- **Example:** `["d1", "metrics", "ws"]`

### bindings
- **Type:** `string[]`
- **Required:** No
- **Description:** Array of resource bindings for the service
- **Example:** `["DATABASE", "CACHE", "STORAGE"]`

### resources
- **Type:** `object`
- **Required:** No
- **Description:** Resource configuration object
- **Properties:**
  - `memory` (number): Memory allocation in MB
  - `cpu` (number): CPU allocation
  - `storage` (number): Storage allocation in GB
- **Example:**
  ```json
  {
    "memory": 128,
    "cpu": 0.5,
    "storage": 10
  }
  ```

### specs
- **Type:** `object`
- **Required:** No
- **Description:** Service specifications and configuration
- **Example:**
  ```json
  {
    "environment": "production",
    "replicas": 3,
    "healthCheck": "/health"
  }
  ```

### clodo
- **Type:** `object`
- **Required:** No
- **Description:** Passthrough data for clodo-application specific configuration
- **Note:** This data is preserved and passed through to clodo-application without validation
- **Example:**
  ```json
  {
    "orchestration": {
      "autoScale": true,
      "regions": ["us-east-1", "eu-west-1"]
    },
    "monitoring": {
      "alerts": ["cpu", "memory"],
      "dashboard": true
    }
  }
  ```

## Creation Options

### outputDir
- **Type:** `string`
- **Required:** No
- **Description:** Directory path where the service should be created
- **Default:** `"."` (current directory)
- **Example:** `"./services"`

### dryRun
- **Type:** `boolean`
- **Required:** No
- **Description:** If true, validates the payload and simulates creation without writing files
- **Default:** `false`
- **Example:** `true`

### force
- **Type:** `boolean`
- **Required:** No
- **Description:** If true, continues creation even if validation fails
- **Default:** `false`
- **Example:** `true`

### environment
- **Type:** `string`
- **Required:** No
- **Description:** Target environment for the service
- **Default:** `"development"`
- **Allowed Values:** `"development"`, `"staging"`, `"production"`
- **Example:** `"production"`

## Validation Rules

### Service Name Validation
- Must contain only lowercase letters, numbers, and hyphens
- Cannot start or end with a hyphen
- Must be between 3 and 50 characters

### Domain Validation
- Must follow standard domain name format
- Can include subdomains
- Must have a valid TLD (top-level domain)

### Feature Validation
- All specified features must be in the allowed features list
- Duplicate features are allowed but generate warnings
- Unknown features generate warnings but don't fail validation

### Type Validation
- Service type must exactly match one of the allowed values
- Case-sensitive matching

## Error Response Format

### ValidationError
```typescript
interface ValidationError {
  field: string;        // Field that failed validation
  code: string;         // Error code (e.g., "REQUIRED_FIELD_MISSING")
  message: string;      // Human-readable error message
  value?: any;          // The invalid value provided
  expected?: any;       // Expected value or format
}
```

### ValidationWarning
```typescript
interface ValidationWarning {
  field: string;        // Field that generated the warning
  code: string;         // Warning code (e.g., "DUPLICATE_FEATURES")
  message: string;      // Human-readable warning message
  suggestion?: string;  // Suggested fix or action
}
```

### ServiceCreationResult
```typescript
interface ServiceCreationResult {
  success: boolean;           // Whether creation succeeded
  serviceId?: string;         // Unique service identifier
  servicePath?: string;       // Path where service was created
  errors?: string[];          // Array of error messages
  warnings?: string[];        // Array of warning messages
  fileCount?: number;         // Number of files created
  generatedFiles?: string[];  // List of generated file paths
}
```

## Framework Capabilities

### FrameworkCapabilities
```typescript
interface FrameworkCapabilities {
  version: string;                    // Framework version
  supportsProgrammaticCreation: boolean;  // Programmatic API support
  supportedServiceTypes: string[];    // Supported service types
  supportedFeatures: string[];        // Supported features
  hasParameterDiscovery: boolean;     // Parameter discovery API
  hasUnifiedValidation: boolean;      // Payload validation API
  supportsPassthrough: boolean;       // Clodo passthrough support
}
```

### CompatibilityResult
```typescript
interface CompatibilityResult {
  compatible: boolean;                // Version compatibility
  frameworkVersion: string;           // Current framework version
  minimumApplicationVersion?: string; // Minimum app version required
  breakingChanges?: string[];         // Breaking changes if incompatible
  recommendations?: string[];         // Recommended actions
}
```

## Examples

### Minimal Valid Payload
```json
{
  "serviceName": "api-service",
  "serviceType": "api-service",
  "domain": "api.example.com"
}
```

### Full Featured Payload
```json
{
  "serviceName": "customer-portal",
  "serviceType": "api-service",
  "domain": "portal.example.com",
  "description": "Customer portal with real-time updates",
  "template": "spa-api",
  "features": ["d1", "upstash", "ws", "metrics"],
  "bindings": ["CUSTOMER_DB", "SESSION_CACHE"],
  "resources": {
    "memory": 256,
    "cpu": 1.0,
    "storage": 50
  },
  "specs": {
    "environment": "production",
    "replicas": 2
  },
  "clodo": {
    "orchestration": {
      "autoScale": true,
      "maxReplicas": 10
    }
  }
}
```

### Error Response Example
```json
{
  "success": false,
  "errors": [
    {
      "field": "serviceName",
      "code": "INVALID_FORMAT",
      "message": "serviceName must contain only lowercase letters, numbers, and hyphens",
      "value": "MyService",
      "expected": "^[a-z0-9-]+$"
    }
  ],
  "warnings": [
    {
      "field": "features",
      "code": "UNKNOWN_FEATURES",
      "message": "Unknown features: legacy-feature",
      "suggestion": "Check supported features with getFrameworkCapabilities()"
    }
  ]
}
```