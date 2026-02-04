# Error Reference

This document provides comprehensive information about errors that can occur when using the clodo-framework programmatic APIs.

## Error Types

### IntegrationError (Base Class)

All framework errors extend from `IntegrationError` and include:
- `message`: Human-readable error description
- `code`: Machine-readable error code
- `details`: Additional error context

### PayloadValidationError

Thrown when service payload validation fails.

**Code:** `PAYLOAD_VALIDATION_FAILED`

**Details:** Contains the full `ValidationResult` object

**Example:**
```javascript
try {
  await createServiceProgrammatic(invalidPayload);
} catch (error) {
  if (error.code === 'PAYLOAD_VALIDATION_FAILED') {
    console.log('Validation errors:', error.details.validationResult.errors);
  }
}
```

### ParameterNotSupportedError

Thrown when a parameter is not supported in the current framework version.

**Code:** `PARAMETER_NOT_SUPPORTED`

**Details:**
- `parameterName`: The unsupported parameter name
- `frameworkVersion`: Current framework version

### VersionCompatibilityError

Thrown when application version is incompatible with framework.

**Code:** `VERSION_INCOMPATIBILITY`

**Details:**
- `applicationVersion`: The incompatible application version
- `frameworkVersion`: Current framework version

## Validation Error Codes

### REQUIRED_FIELD_MISSING
- **Description:** A required field is missing from the payload
- **Fields:** Any required field (`serviceName`, `serviceType`, `domain`)
- **Example:**
  ```json
  {
    "field": "serviceName",
    "code": "REQUIRED_FIELD_MISSING",
    "message": "Required field 'serviceName' is missing"
  }
  ```

### INVALID_TYPE
- **Description:** Field has wrong data type
- **Fields:** Any field
- **Example:**
  ```json
  {
    "field": "features",
    "code": "INVALID_TYPE",
    "message": "features must be an array",
    "value": "d1,metrics",
    "expected": "array"
  }
  ```

### INVALID_FORMAT
- **Description:** Field value doesn't match required format
- **Fields:** `serviceName`, `domain`
- **Example:**
  ```json
  {
    "field": "serviceName",
    "code": "INVALID_FORMAT",
    "message": "serviceName must contain only lowercase letters, numbers, and hyphens",
    "value": "MyService",
    "expected": "^[a-z0-9-]+$"
  }
  ```

### INVALID_ENUM_VALUE
- **Description:** Field value not in allowed enum
- **Fields:** `serviceType`, `features` (individual items)
- **Example:**
  ```json
  {
    "field": "serviceType",
    "code": "INVALID_ENUM_VALUE",
    "message": "Invalid serviceType: 'invalid-type'",
    "value": "invalid-type",
    "expected": ["api-service", "data-service", "worker", "pages", "gateway"]
  }
  ```

### INVALID_ENUM_VALUES
- **Description:** Array field contains invalid enum values
- **Fields:** `features`
- **Example:**
  ```json
  {
    "field": "features",
    "code": "INVALID_ENUM_VALUES",
    "message": "Invalid features: 'legacy-kv', 'unknown-feature'",
    "value": ["legacy-kv", "unknown-feature"],
    "expected": ["d1", "upstash", "r2", "pages", "ws", "durableObject", "cron", "metrics"]
  }
  ```

### SCHEMA_VALIDATION
- **Description:** Zod schema validation error
- **Fields:** Any field
- **Example:**
  ```json
  {
    "field": "domain",
    "code": "SCHEMA_VALIDATION",
    "message": "domain must be a valid domain name"
  }
  ```

## Warning Codes

### DUPLICATE_FEATURES
- **Description:** Features array contains duplicates
- **Field:** `features`
- **Example:**
  ```json
  {
    "field": "features",
    "code": "DUPLICATE_FEATURES",
    "message": "Duplicate features: 'd1', 'metrics'",
    "suggestion": "Remove duplicate features from the array"
  }
  ```

### UNKNOWN_FEATURES
- **Description:** Features array contains unknown feature names
- **Field:** `features`
- **Example:**
  ```json
  {
    "field": "features",
    "code": "UNKNOWN_FEATURES",
    "message": "Unknown features: 'legacy-feature'",
    "suggestion": "Check supported features with getFrameworkCapabilities()"
  }
  ```

### POTENTIAL_CONFLICT
- **Description:** Feature combination may cause issues
- **Field:** Any field
- **Example:**
  ```json
  {
    "field": "features",
    "code": "POTENTIAL_CONFLICT",
    "message": "Pages services typically don't use D1 database",
    "suggestion": "Consider using R2 for static asset storage instead"
  }
  ```

### INVALID_PASSTHROUGH_TYPE
- **Description:** `clodo` passthrough data has wrong type
- **Field:** `clodo`
- **Example:**
  ```json
  {
    "field": "clodo",
    "code": "INVALID_PASSTHROUGH_TYPE",
    "message": "clodo passthrough should be an object",
    "suggestion": "Ensure clodo data is properly structured"
  }
  ```

## HTTP Status Code Mapping

When using the programmatic APIs over HTTP:

- `200 OK`: Success
- `400 Bad Request`: Validation error (`PAYLOAD_VALIDATION_FAILED`)
- `422 Unprocessable Entity`: Version incompatibility (`VERSION_INCOMPATIBILITY`)
- `500 Internal Server Error`: Framework internal error

## Error Handling Patterns

### Basic Error Handling
```javascript
const result = await createServiceProgrammatic(payload);

if (!result.success) {
  result.errors.forEach(error => {
    console.error(`${error.field}: ${error.message}`);
  });
  result.warnings.forEach(warning => {
    console.warn(`${warning.field}: ${warning.message}`);
  });
}
```

### Advanced Error Handling
```javascript
try {
  const result = await createServiceProgrammatic(payload);

  if (!result.success) {
    // Handle specific error types
    result.errors.forEach(error => {
      switch (error.code) {
        case 'REQUIRED_FIELD_MISSING':
          console.error(`Missing required field: ${error.field}`);
          break;
        case 'INVALID_ENUM_VALUE':
          console.error(`Invalid ${error.field}: ${error.value}`);
          console.log(`Valid options: ${error.expected.join(', ')}`);
          break;
        default:
          console.error(`${error.field}: ${error.message}`);
      }
    });
  }
} catch (error) {
  // Handle thrown errors
  if (error instanceof IntegrationError) {
    console.error(`Integration error [${error.code}]: ${error.message}`);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Validation Error Handling
```javascript
const validation = validateServicePayload(payload);

if (!validation.valid) {
  const errorsByField = validation.errors.reduce((acc, error) => {
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(error);
    return acc;
  }, {});

  Object.entries(errorsByField).forEach(([field, errors]) => {
    console.error(`Field '${field}' has ${errors.length} error(s):`);
    errors.forEach(error => console.error(`  - ${error.message}`));
  });
}
```

## Troubleshooting Common Errors

### "Required field 'serviceName' is missing"
- Ensure the payload includes all required fields: `serviceName`, `serviceType`, `domain`
- Check field names for typos

### "serviceName must contain only lowercase letters, numbers, and hyphens"
- Convert service name to lowercase
- Replace spaces and special characters with hyphens
- Remove uppercase letters

### "Invalid serviceType: 'api'"
- Use exact enum values: `"api-service"`, not `"api"`
- Check `getFrameworkCapabilities()` for current supported types

### "Invalid features: 'kv'"
- Legacy feature names like `"kv"` are not supported
- Use current feature names: `"upstash"` for Redis, `"d1"` for database
- Check `getFrameworkCapabilities()` for current supported features

### "domain must be a valid domain name"
- Ensure domain follows format: `subdomain.example.com`
- Include TLD (`.com`, `.org`, etc.)
- Use only valid characters (letters, numbers, hyphens)

### Version Compatibility Issues
```javascript
const compatibility = checkApplicationCompatibility(myAppVersion);

if (!compatibility.compatible) {
  console.error('Version incompatibility:');
  compatibility.breakingChanges.forEach(change => {
    console.error(`- ${change}`);
  });

  console.log('Recommendations:');
  compatibility.recommendations.forEach(rec => {
    console.log(`- ${rec}`);
  });
}
```

## Error Recovery

### Automatic Recovery
```javascript
async function createServiceWithRetry(payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await createServiceProgrammatic(payload);

      if (result.success) {
        return result;
      }

      // Check if errors are recoverable
      const hasRecoverableErrors = result.errors.every(error =>
        ['DUPLICATE_FEATURES', 'UNKNOWN_FEATURES'].includes(error.code)
      );

      if (!hasRecoverableErrors || attempt === maxRetries) {
        return result; // Cannot recover or max retries reached
      }

      // Attempt to fix recoverable errors
      payload.features = [...new Set(payload.features)]; // Remove duplicates
      payload.features = payload.features.filter(feature =>
        getFrameworkCapabilities().supportedFeatures.includes(feature)
      ); // Remove unknown features

      console.log(`Retrying after fixing recoverable errors (attempt ${attempt + 1})`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

### Graceful Degradation
```javascript
async function createServiceGracefully(payload) {
  // First try with all features
  let result = await createServiceProgrammatic(payload);

  if (result.success) {
    return result;
  }

  // If failed due to unknown features, try without them
  const unknownFeatures = result.errors
    .filter(e => e.code === 'INVALID_ENUM_VALUES')
    .flatMap(e => e.value || []);

  if (unknownFeatures.length > 0) {
    console.warn(`Removing unknown features: ${unknownFeatures.join(', ')}`);
    payload.features = payload.features.filter(f => !unknownFeatures.includes(f));

    result = await createServiceProgrammatic(payload);
  }

  return result;
}
```