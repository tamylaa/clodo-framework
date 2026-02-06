# Environment Variable Standardization - Migration Guide

**Framework Version**: 4.4.1+  
**Last Updated**: February 6, 2026

---

## Overview

The Clodo Framework standardizes environment variable configuration to a single, recommended flat format. This improves consistency, reduces confusion, and simplifies the API.

**Key Changes**:
- ✅ **Flat format** is now the recommended standard: `service.vars = {...}`
- ⚠️ **Nested format** is deprecated: `service.environment = { vars: {...} }`
- ⚠️ **Per-environment format** is deprecated: `service.env = { production: { vars: {...} } }`

---

## Deprecation Timeline

| Version | Date | Status | Action |
|---------|------|--------|--------|
| **4.4.1** | Feb 6, 2026 | DEPRECATED (Supported) | Nested & per-env formats work but emit warnings |
| **4.5.0** | May 2026 | WARNINGS REQUIRED | Warnings are mandatory during deployment |
| **5.0.0** | July 2026 | REMOVAL | Only flat format accepted; old formats cause errors |

---

## Why Standardize?

The previous implementation accepted three different formats for the same thing:

```javascript
// Format 1: Flat (Now recommended) ✅
service.vars = { API_KEY: 'value' };

// Format 2: Nested (Deprecated) ⚠️
service.environment = { vars: { API_KEY: 'value' } };

// Format 3: Per-Environment (Deprecated) ⚠️
service.env = {
  production: { vars: { API_KEY: 'prod-value' } },
  staging: { vars: { API_KEY: 'staging-value' } }
};
```

**Problems this caused**:
- Generator code needed to handle 3 different formats, increasing complexity
- Documentation was ambiguous about which format to use
- Users confused when configs worked in some tools but not others
- Inconsistent with Wrangler.toml and industry conventions

---

## Migration Guide

### Option 1: Flat Format (Recommended)

Use `service.vars` for all environment variables:

```javascript
// services-config.json
{
  "services": [
    {
      "name": "api-service",
      "vars": {
        "API_KEY": "my-api-key",
        "DEBUG": "true",
        "LOG_LEVEL": "info"
      },
      "secrets": ["DB_PASSWORD", "JWT_SECRET"]
    }
  ]
}
```

**Advantages**:
- Simple and clear
- Aligns with Wrangler.toml conventions
- No version-specific migrations needed
- Fully supported in all versions

---

### Option 2: Migration from Nested Format

**Before (v4.4.0 - Nested)**:
```javascript
{
  "services": [
    {
      "name": "api-service",
      "environment": {
        "vars": {
          "API_KEY": "my-api-key",
          "DEBUG": "true"
        },
        "secrets": ["DB_PASSWORD"]
      }
    }
  ]
}
```

**After (v4.4.1+ - Flat)**:
```javascript
{
  "services": [
    {
      "name": "api-service",
      "vars": {
        "API_KEY": "my-api-key",
        "DEBUG": "true"
      },
      "secrets": ["DB_PASSWORD"]
    }
  ]
}
```

**Steps**:
1. Copy the `vars` object from `environment.vars` to top-level `vars`
2. Copy the `secrets` array from `environment.secrets` to top-level `secrets` (if present)
3. Delete the `environment` property
4. Test your deployment

---

### Option 3: Migration from Per-Environment Format

**Before (v4.4.0 - Per-Environment)**:
```javascript
{
  "services": [
    {
      "name": "api-service",
      "env": {
        "production": {
          "name": "api-prod",
          "vars": {
            "API_KEY": "prod-key",
            "DEBUG": "false"
          }
        },
        "staging": {
          "name": "api-staging",
          "vars": {
            "API_KEY": "staging-key",
            "DEBUG": "true"
          }
        }
      }
    }
  ]
}
```

**After (v4.4.1+ - Flat)**:
```javascript
{
  "services": [
    {
      "name": "api-service",
      "vars": {
        "API_KEY": "prod-key",      // Use production value
        "DEBUG": "false"             // Use production value
      },
      "env": {
        "production": {
          "name": "api-prod"         // Keep non-vars properties
        },
        "staging": {
          "name": "api-staging"      // Keep non-vars properties
        }
      }
    }
  ]
}
```

**Steps**:
1. Create a new top-level `vars` object
2. Copy all `vars` from each environment (preferring production values)
3. Keep non-vars properties like `name` in the `env` sections
4. Delete `vars` from each `env.{environment}` section
5. Test your deployment

**Note**: For environment-specific values, use Clodo's environment override mechanism (documented in configuration guide) instead of per-environment `vars`.

---

## Variable Naming Conventions

All environment variable names must follow SCREAMING_SNAKE_CASE:

✅ **Valid**:
```javascript
API_KEY
DATABASE_URL
LOG_LEVEL
_INTERNAL_FLAG
VAR_123
```

❌ **Invalid**:
```javascript
api-key         // Use underscores, not hyphens
api.key         // Use underscores, not dots
apiKey          // Use SCREAMING_SNAKE_CASE
```

---

## Secrets Management

Secrets are sensitive values that should not be stored in config files. Specify which variables are secrets:

```javascript
{
  "services": [
    {
      "name": "api-service",
      "vars": {
        "API_URL": "https://api.example.com",
        "DEBUG": "false"
        // API_KEY and DB_PASSWORD are secrets, not listed here
      },
      "secrets": ["API_KEY", "DB_PASSWORD"]  // <-- Specify secret names
    }
  ]
}
```

**Then provide actual values at deployment**:
```bash
# Via environment variables
export API_KEY="sk-1234567890"
export DB_PASSWORD="password-here"

# Or via .dev.vars file (local development)
# .dev.vars
API_KEY=sk-1234567890
DB_PASSWORD=password-here
```

---

## Checking Your Migration Status

### 1. Run migration validator

```bash
npx clodo-framework validate --config path/to/config.json
```

This will show:
- ✅ Configs using flat format
- ⚠️ Configs using deprecated formats (with specific suggestions)
- ❌ Any invalid configurations

### 2. Check framework logs

During deployment, the framework will emit warnings like:

```
⚠️  DEPRECATION: Service 'api-service' uses nested format (service.environment.vars).
This will be removed in v5.0.0. Use flat format instead: service.vars = {...}
```

### 3. Test locally

```bash
# Test configuration locally
npm run dev

# Check for deprecation warnings in output
```

---

## Troubleshooting

### "My config still works but I see warnings"

This is expected in v4.4.1. You have until v5.0.0 to migrate. Update your config using the migration guide above.

### "I'm using multiple formats mixed together"

The framework will merge them with the flat format taking priority. However, this is confusing and will cause an error in v5.0.0. Consolidate to flat format only.

### "How do I handle per-environment settings now?"

Instead of per-environment `vars`, use Clodo's environment-specific configuration in your service definition:

```javascript
{
  "services": [
    {
      "name": "api-service",
      "vars": {
        "API_URL": "https://api.example.com"
      },
      "environments": {
        "production": {
          "vars": { "DEBUG": "false" }
        },
        "staging": {
          "vars": { "DEBUG": "true" }
        }
      }
    }
  ]
}
```

(See the main configuration guide for more details on environment-specific configuration)

---

## FAQ

**Q: Can I use both flat and nested formats together?**  
A: Not recommended. The framework will merge them, but this creates confusion. Standardize on flat format only.

**Q: What if I have hundreds of services?**  
A: Write a migration script to batch-update your configs. See the example script below.

**Q: Will this change how I pass environment variables to `wrangler deploy`?**  
A: No. The `.dev.vars` file and deployment secrets management remain unchanged. Only the config format is standardized.

---

## Migration Script Example

If you have many services, automate the migration:

```javascript
import fs from 'fs';
import path from 'path';

function migrateConfigFile(filePath) {
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const service of config.services || []) {
    // Convert nested format
    if (service.environment?.vars && !service.vars) {
      service.vars = service.environment.vars;
      if (service.environment.secrets) {
        service.secrets = service.environment.secrets;
      }
      delete service.environment;
      console.log(`✅ Migrated nested format for '${service.name}'`);
    }

    // Convert per-environment format
    if (service.env) {
      const allVars = {};
      for (const [envName, envConfig] of Object.entries(service.env)) {
        if (envConfig?.vars) {
          Object.assign(allVars, envConfig.vars);
          delete envConfig.vars;
        }
      }
      if (Object.keys(allVars).length > 0) {
        if (!service.vars) {
          service.vars = allVars;
        }
        console.log(`✅ Migrated per-environment format for '${service.name}'`);
      }
    }
  }

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log(`📝 Updated: ${filePath}`);
}

// Run on your config files
migrateConfigFile('./config/services.json');
migrateConfigFile('./config/staging-services.json');
// etc.
```

---

## Getting Help

**Still using deprecated formats after v5.0.0?**
- Error messages will show exactly what needs to change
- Use the migration steps above as reference
- File an issue with your config structure (sanitized) for help

**Questions about environment-specific configuration?**
- See: `docs/environment-configuration.md`
- See: `docs/api-reference.md#service-configuration`

---

## Timeline for Removal

- **v4.4.1 - TODAY**: Deprecation warnings introduced; all old formats still work
- **v4.5.0 - May 2026**: Warnings become required; framework enforces deprecation
- **v5.0.0 - July 2026**: Only flat format accepted; errors on old formats

Start migrating now to avoid issues when v5.0.0 is released.
