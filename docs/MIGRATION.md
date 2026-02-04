# Migration Guide

This guide helps existing clodo-framework users migrate to the new programmatic APIs and adapt to breaking changes.

## Overview

The clodo-framework has introduced comprehensive programmatic APIs that enable seamless integration with clodo-application. This guide covers:

- Migrating from CLI-based workflows to programmatic APIs
- Adapting to enum and validation changes
- Using new features and capabilities
- Best practices for integration

## Breaking Changes

### Enum Validation Changes

**What Changed:**
- Service types now use hyphenated names (e.g., `"api-service"` instead of `"api"`)
- Feature names have been standardized (e.g., `"upstash"` instead of `"kv"`)

**Migration:**
```javascript
// Before (may fail validation)
const payload = {
  serviceType: 'api',
  features: ['kv', 'metrics']
};

// After (correct)
const payload = {
  serviceType: 'api-service',
  features: ['upstash', 'metrics']
};
```

**Detection Script:**
```javascript
import { getFrameworkCapabilities } from '@tamyla/clodo-framework/api';

const capabilities = getFrameworkCapabilities();

// Check your current usage against supported values
console.log('Supported service types:', capabilities.supportedServiceTypes);
console.log('Supported features:', capabilities.supportedFeatures);
```

### Feature Name Changes

| Legacy Name | New Name | Purpose |
|-------------|----------|---------|
| `kv` | `upstash` | Redis database service |
| `storage` | `r2` | Object storage |
| `database` | `d1` | SQL database |

### Validation Strictness

**What Changed:**
- Domain validation is now stricter
- Service name format is enforced
- Feature validation includes all array elements

**Migration:**
```javascript
// Before (may pass but with warnings)
const payload = {
  serviceName: 'MyService',
  domain: 'localhost',
  features: ['d1', 'unknown-feature']
};

// After (strict validation)
const payload = {
  serviceName: 'my-service',
  domain: 'my-service.example.com',
  features: ['d1', 'metrics']
};
```

## Migration Steps

### Step 1: Update Dependencies

Ensure you're using the latest framework version:

```bash
npm update @tamyla/clodo-framework
# or
yarn upgrade @tamyla/clodo-framework
```

### Step 2: Check Compatibility

Add version compatibility checking to your application:

```javascript
import { checkApplicationCompatibility } from '@tamyla/clodo-framework/api';

const compatibility = checkApplicationCompatibility('1.0.0');

if (!compatibility.compatible) {
  console.error('Framework version incompatibility:');
  compatibility.breakingChanges.forEach(change => console.error(`- ${change}`));
  process.exit(1);
}
```

### Step 3: Migrate CLI Usage

**Before (CLI):**
```bash
npx clodo-service create
# Interactive prompts...
```

**After (Programmatic):**
```javascript
import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';

const result = await createServiceProgrammatic({
  serviceName: 'my-service',
  serviceType: 'api-service',
  domain: 'api.example.com',
  features: ['d1', 'metrics']
});

if (!result.success) {
  console.error('Service creation failed:', result.errors);
  process.exit(1);
}

console.log(`Service created at: ${result.servicePath}`);
```

### Step 4: Update Payloads

Create a migration utility to update your existing payloads:

```javascript
function migratePayload(legacyPayload) {
  const migrated = { ...legacyPayload };

  // Migrate service types
  const serviceTypeMap = {
    'api': 'api-service',
    'data': 'data-service',
    'static': 'pages'
  };

  if (serviceTypeMap[migrated.serviceType]) {
    migrated.serviceType = serviceTypeMap[migrated.serviceType];
  }

  // Migrate features
  const featureMap = {
    'kv': 'upstash',
    'storage': 'r2',
    'database': 'd1'
  };

  if (migrated.features) {
    migrated.features = migrated.features.map(feature =>
      featureMap[feature] || feature
    );
  }

  // Fix service name format
  if (migrated.serviceName) {
    migrated.serviceName = migrated.serviceName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Fix domain format
  if (migrated.domain && !migrated.domain.includes('.')) {
    migrated.domain = `${migrated.domain}.example.com`;
  }

  return migrated;
}
```

### Step 5: Add Validation

Always validate payloads before creation:

```javascript
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

function createServiceSafely(payload) {
  const validation = validateServicePayload(payload);

  if (!validation.valid) {
    console.error('Payload validation failed:');
    validation.errors.forEach(error => {
      console.error(`- ${error.field}: ${error.message}`);
    });
    return false;
  }

  if (validation.warnings.length > 0) {
    console.warn('Payload validation warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`- ${warning.field}: ${warning.message}`);
    });
  }

  return createServiceProgrammatic(payload);
}
```

### Step 6: Update Error Handling

Migrate from CLI error handling to programmatic error handling:

```javascript
// Before (CLI error handling)
try {
  execSync('npx clodo-service create', { stdio: 'inherit' });
} catch (error) {
  console.error('Service creation failed');
  process.exit(1);
}

// After (Programmatic error handling)
const result = await createServiceProgrammatic(payload);

if (!result.success) {
  console.error('Service creation failed:');
  result.errors.forEach(error => {
    console.error(`- ${error.message}`);
  });

  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach(warning => {
      console.warn(`- ${warning.message}`);
    });
  }

  process.exit(1);
}
```

## Feature Migration Examples

### Database Integration

**Before:**
```javascript
const payload = {
  features: ['database', 'kv']
};
```

**After:**
```javascript
const payload = {
  features: ['d1', 'upstash']
};
```

### Static Site with API

**Before:**
```javascript
const payload = {
  serviceType: 'static',
  features: ['api']
};
```

**After:**
```javascript
const payload = {
  serviceType: 'pages',
  features: ['api-service']
};
```

### Worker with Storage

**Before:**
```javascript
const payload = {
  serviceType: 'worker',
  features: ['storage', 'kv']
};
```

**After:**
```javascript
const payload = {
  serviceType: 'worker',
  features: ['r2', 'upstash']
};
```

## Testing Migration

### Unit Tests

Update your tests to use the new APIs:

```javascript
// Before
describe('Service Creation', () => {
  it('creates service via CLI', () => {
    // CLI testing...
  });
});

// After
describe('Service Creation', () => {
  it('creates service programmatically', async () => {
    const payload = {
      serviceName: 'test-service',
      serviceType: 'api-service',
      domain: 'test.example.com'
    };

    const result = await createServiceProgrammatic(payload, { dryRun: true });
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

Use the mock framework for integration testing:

```javascript
import { createMockFramework } from '@tamyla/clodo-framework/testing';

describe('Service Integration', () => {
  let mockFramework;

  beforeEach(() => {
    mockFramework = createMockFramework();
  });

  it('integrates with application layer', async () => {
    const payload = createMigratedPayload(legacyPayload);
    const result = await mockFramework.createService(payload);

    expect(result.success).toBe(true);
    expect(mockFramework.getCreatedServices()).toHaveLength(1);
  });
});
```

## Rollback Strategy

If migration issues occur, you can temporarily use compatibility mode:

```javascript
// Temporary compatibility mode (if implemented)
const result = await createServiceProgrammatic(payload, {
  compatibilityMode: true, // Allow legacy enums
  force: false // Still validate but be more lenient
});
```

## Common Migration Issues

### Issue: "Invalid serviceType"
**Solution:** Update service types to use hyphens:
- `"api"` → `"api-service"`
- `"data"` → `"data-service"`
- `"static"` → `"pages"`

### Issue: "Invalid features"
**Solution:** Update feature names:
- `"kv"` → `"upstash"`
- `"storage"` → `"r2"`
- `"database"` → `"d1"`

### Issue: "serviceName format invalid"
**Solution:** Convert to lowercase and replace invalid characters:
```javascript
serviceName = serviceName
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-');
```

### Issue: "domain format invalid"
**Solution:** Ensure proper domain format:
```javascript
if (!domain.includes('.')) {
  domain = `${domain}.example.com`;
}
```

## Support and Resources

### Getting Help

1. Check the [Programmatic API Guide](PROGRAMMATIC_API.md)
2. Review the [Parameter Reference](parameter_reference.md)
3. Check the [Error Reference](errors.md)
4. Use framework capabilities API for current supported values

### Validation Tools

```javascript
import {
  validateServicePayload,
  getParameterDefinitions,
  getFrameworkCapabilities
} from '@tamyla/clodo-framework';

// Validate your migrated payloads
const validation = validateServicePayload(migratedPayload);

// Get current supported values
const capabilities = getFrameworkCapabilities();

// Get parameter metadata
const parameters = getParameterDefinitions();
```

### Automated Migration

Consider creating a migration script:

```javascript
const fs = require('fs');
const path = require('path');

function migrateConfigFiles(configDir) {
  const files = fs.readdirSync(configDir);

  files.forEach(file => {
    if (file.endsWith('.json')) {
      const filePath = path.join(configDir, file);
      const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (config.serviceType || config.features) {
        const migrated = migratePayload(config);
        fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2));
        console.log(`Migrated ${file}`);
      }
    }
  });
}
```

## Next Steps

1. **Audit existing usage** for enum/feature dependencies
2. **Create migration plan** with rollback strategy
3. **Test migration** in staging environment
4. **Deploy gradually** with feature flags if needed
5. **Monitor errors** and provide fallback handling

The programmatic APIs provide better error handling, validation, and integration capabilities. Migration may require initial effort but provides long-term benefits for automated workflows and integrations.