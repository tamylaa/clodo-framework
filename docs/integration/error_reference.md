# Error Reference

This document provides a comprehensive reference for errors that can occur when using the Clodo Framework's programmatic APIs.

## Overview

The framework uses structured error handling with specific error codes and classes. This enables applications to handle errors programmatically and provide appropriate user feedback.

## Error Classes

### IntegrationError (Base Class)

All integration errors extend from `IntegrationError`.

```javascript
class IntegrationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.details = details;
  }
}
```

### PayloadValidationError

Thrown when service payload validation fails.

```javascript
class PayloadValidationError extends IntegrationError {
  constructor(validationResult) {
    // code: 'PAYLOAD_VALIDATION_FAILED'
    // details: { validationResult }
  }
}
```

### ParameterNotSupportedError

Thrown when a parameter is not supported in the current framework version.

```javascript
class ParameterNotSupportedError extends IntegrationError {
  constructor(parameterName, frameworkVersion) {
    // code: 'PARAMETER_NOT_SUPPORTED'
    // details: { parameterName, frameworkVersion }
  }
}
```

### VersionCompatibilityError

Thrown when application version is incompatible with framework version.

```javascript
class VersionCompatibilityError extends IntegrationError {
  constructor(applicationVersion, frameworkVersion) {
    // code: 'VERSION_INCOMPATIBILITY'
    // details: { applicationVersion, frameworkVersion }
  }
}
```

## Error Codes and Handling

### PAYLOAD_VALIDATION_FAILED

**Class:** `PayloadValidationError`  
**Description:** Service payload validation failed  
**Details:** `validationResult` object with errors and warnings

**Handling:**
```javascript
try {
  const result = await createService(payload);
} catch (error) {
  if (error.code === 'PAYLOAD_VALIDATION_FAILED') {
    const { validationResult } = error.details;
    console.error('Validation errors:');
    validationResult.errors.forEach(err => {
      console.error(`- ${err.field}: ${err.message}`);
    });
  }
}
```

### PARAMETER_NOT_SUPPORTED

**Class:** `ParameterNotSupportedError`  
**Description:** A parameter used in the payload is not supported  
**Details:** `parameterName`, `frameworkVersion`

**Handling:**
```javascript
try {
  const result = await createService(payload);
} catch (error) {
  if (error.code === 'PARAMETER_NOT_SUPPORTED') {
    const { parameterName, frameworkVersion } = error.details;
    console.error(`Parameter '${parameterName}' not supported in version ${frameworkVersion}`);
    // Suggest updating framework or removing parameter
  }
}
```

### VERSION_INCOMPATIBILITY

**Class:** `VersionCompatibilityError`  
**Description:** Application version incompatible with framework  
**Details:** `applicationVersion`, `frameworkVersion`

**Handling:**
```javascript
try {
  const result = await createService(payload);
} catch (error) {
  if (error.code === 'VERSION_INCOMPATIBILITY') {
    const { applicationVersion, frameworkVersion } = error.details;
    console.error(`Version incompatibility: app ${applicationVersion} vs framework ${frameworkVersion}`);
    // Suggest updating application or framework
  }
}
```

## Validation Errors

Validation errors are returned in `ServiceCreationResult.errors` or `ValidationResult.errors`.

### Field-Level Validation Errors

| Code | Description | Field | Example |
|------|-------------|-------|---------|
| `REQUIRED_FIELD_MISSING` | Required field not provided | any | `serviceName` missing |
| `INVALID_TYPE` | Wrong data type | any | `serviceName` is number |
| `INVALID_ENUM_VALUE` | Value not in allowed list | `serviceType`, `features` | `serviceType: "invalid"` |
| `INVALID_FORMAT` | Doesn't match required format | `serviceName`, `domain` | `serviceName` with uppercase |
| `SCHEMA_VALIDATION` | Zod schema validation failure | any | Complex validation |

### Common Validation Error Messages

#### Service Name Errors
```
"serviceName must be lowercase letters, numbers and hyphens only"
"serviceName must be at least 3 characters"
"serviceName must be at most 50 characters"
```

#### Service Type Errors
```
"Invalid serviceType. Expected one of: api-service, data-service, worker, pages, gateway, generic"
```

#### Domain Errors
```
"domain must be a valid domain name"
```

#### Feature Errors
```
"Invalid feature. Expected one of: d1, upstash, kv, r2, pages, ws, durableObject, durableObjects, cron, metrics"
```

## Service Creation Errors

Errors returned in `ServiceCreationResult.errors` when `success: false`.

### File System Errors
- "Failed to create service directory"
- "Permission denied when creating service files"
- "Disk space insufficient"

### Template Errors
- "Template 'xyz' not found"
- "Template 'xyz' is corrupted"

### Configuration Errors
- "Invalid configuration for feature 'xyz'"
- "Conflicting features specified"

### Resource Errors
- "Insufficient resources for service type"
- "Resource 'xyz' not available"

## Framework Capability Errors

### Programmatic Creation Not Supported
```javascript
const capabilities = getFrameworkCapabilities();
if (!capabilities.supportsProgrammaticCreation) {
  throw new Error('Framework does not support programmatic service creation');
}
```

### Parameter Discovery Not Available
```javascript
const capabilities = getFrameworkCapabilities();
if (!capabilities.hasParameterDiscovery) {
  console.warn('Parameter discovery not available, using static definitions');
}
```

## Error Handling Patterns

### Try-Catch with Type Checking

```javascript
import {
  IntegrationError,
  PayloadValidationError,
  ParameterNotSupportedError,
  VersionCompatibilityError
} from '@tamyla/clodo-framework';

try {
  const result = await createService(payload);
  if (!result.success) {
    // Handle result errors
    console.error('Service creation failed:', result.errors);
  }
} catch (error) {
  if (error instanceof PayloadValidationError) {
    // Handle validation errors
  } else if (error instanceof ParameterNotSupportedError) {
    // Handle unsupported parameters
  } else if (error instanceof VersionCompatibilityError) {
    // Handle version incompatibility
  } else if (error instanceof IntegrationError) {
    // Handle other integration errors
  } else {
    // Handle unexpected errors
  }
}
```

### Result-Based Error Handling

```javascript
const result = await createService(payload);

if (!result.success) {
  // Categorize errors
  const validationErrors = result.errors.filter(e => e.includes('validation'));
  const permissionErrors = result.errors.filter(e => e.includes('permission'));
  const resourceErrors = result.errors.filter(e => e.includes('resource'));

  if (validationErrors.length > 0) {
    // Handle validation errors
  }
  if (permissionErrors.length > 0) {
    // Handle permission errors
  }
  if (resourceErrors.length > 0) {
    // Handle resource errors
  }
}
```

### Validation-First Approach

```javascript
import { validateServicePayload, PayloadValidationError } from '@tamyla/clodo-framework';

// Validate first
const validation = validateServicePayload(payload);
if (!validation.valid) {
  throw new PayloadValidationError(validation);
}

// Then create
const result = await createService(payload);
```

## Testing Error Scenarios

### Mock Framework Error Testing

```javascript
import { createMockFramework } from '@tamyla/clodo-framework';

const mockFramework = createMockFramework();

// Test validation errors
const invalidPayload = { invalid: 'payload' };
const result = await mockFramework.createService(invalidPayload);
expect(result.success).toBe(false);
expect(result.errors).toBeDefined();
```

### Error Class Testing

```javascript
import { PayloadValidationError } from '@tamyla/clodo-framework';

const validationResult = { valid: false, errors: [{ field: 'serviceName', message: 'Required' }] };
const error = new PayloadValidationError(validationResult);

expect(error.code).toBe('PAYLOAD_VALIDATION_FAILED');
expect(error.details.validationResult).toBe(validationResult);
```

## Best Practices

### 1. Always Check Result Status

```javascript
const result = await createService(payload);
if (!result.success) {
  // Log errors for debugging
  console.error('Service creation failed:', result.errors);
  // Handle errors appropriately
  return;
}
```

### 2. Use Specific Error Types

```javascript
try {
  await createService(payload);
} catch (error) {
  if (error instanceof IntegrationError) {
    // Structured error handling
    handleIntegrationError(error);
  } else {
    // Generic error handling
    handleGenericError(error);
  }
}
```

### 3. Provide User-Friendly Messages

```javascript
function handleIntegrationError(error) {
  switch (error.code) {
    case 'PAYLOAD_VALIDATION_FAILED':
      return 'Please check your service configuration and try again.';
    case 'PARAMETER_NOT_SUPPORTED':
      return `The parameter '${error.details.parameterName}' is not supported in this version.`;
    case 'VERSION_INCOMPATIBILITY':
      return 'Your application version is not compatible with this framework version.';
    default:
      return 'An integration error occurred. Please contact support.';
  }
}
```

### 4. Log Errors for Debugging

```javascript
try {
  const result = await createService(payload);
} catch (error) {
  // Log full error details for debugging
  console.error('Service creation error:', {
    code: error.code,
    message: error.message,
    details: error.details,
    stack: error.stack
  });

  // Show user-friendly message
  throw new Error('Service creation failed. Please try again.');
}
```

### 5. Validate Early

```javascript
// Validate payload before attempting creation
const validation = validateServicePayload(payload);
if (!validation.valid) {
  // Handle validation errors before they become service creation errors
  const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`);
  throw new Error(`Invalid payload: ${errorMessages.join(', ')}`);
}
```

## Troubleshooting

### Debug Mode

Enable debug logging for detailed error information:

```javascript
// Set debug environment variable
process.env.DEBUG = 'clodo-framework:*';

// Or enable in framework config
const config = {
  debug: true,
  verboseErrors: true
};
```

### Common Error Scenarios

1. **Network timeouts**: Check network connectivity and retry
2. **Permission denied**: Verify file system permissions
3. **Invalid parameters**: Use `getAcceptedParameters()` to check current requirements
4. **Version conflicts**: Update framework or application to compatible versions
5. **Resource exhaustion**: Check system resources and clean up if needed

### Getting Help

When reporting errors, include:
- Framework version (`getFrameworkVersion()`)
- Error code and message
- Full error details
- Payload being used (redact sensitive data)
- Environment information