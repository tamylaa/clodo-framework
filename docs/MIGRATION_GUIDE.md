# Migration Guide: Manual Routes → Automated Routing

This guide helps you migrate from manually configured wrangler.toml routes to Clodo Framework's automated route generation system.

## Overview

**Before:** Manual route configuration in wrangler.toml
**After:** Automatic route generation from domain configuration

**Benefits of Migration:**
- ✅ No manual wrangler.toml editing
- ✅ Consistent routes across environments
- ✅ Reduced configuration errors
- ✅ Easier multi-domain management
- ✅ Self-documenting configuration

## Quick Migration Steps

### Step 1: Audit Current Routes

Review your existing wrangler.toml:

```toml
# BEFORE: Manual configuration
[[routes]]
pattern = "api.example.com/api/*"
zone_id = "abc123456789..."

[[routes]]
pattern = "staging-api.example.com/api/*"
zone_id = "abc123456789..."

[env.development]
# Development uses workers.dev
```

**Extract the following information:**
1. Domain names (`api.example.com`, `staging-api.example.com`)
2. Zone IDs (`abc123456789...`)
3. Path patterns (`/api/*`)
4. Environment structure (top-level vs nested)

### Step 2: Create Domain Configuration

Create or update your domain config file:

```javascript
// domain-config.json
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "abc123456789...",
      "environments": {
        "production": {
          "domain": "api.example.com",
          "apiBasePath": "/api"
        },
        "staging": {
          "domain": "staging-api.example.com",
          "apiBasePath": "/api"
        },
        "development": {
          "subdomain": "my-service-dev"
        }
      }
    }
  }
}
```

### Step 3: Update Service Generation

Ensure your service generation includes domain config:

```javascript
import { ServiceCreator } from '@clodo/framework';

const creator = new ServiceCreator({
  serviceName: 'my-service',
  serviceType: 'api-gateway',
  domainConfig: './domain-config.json'  // Path to your config
});

await creator.createService();
```

### Step 4: Verify Generated Routes

Check the generated wrangler.toml:

```toml
# AFTER: Automatically generated
# Production environment routes
# Domain: api.example.com
# Zone ID: abc123456789...
[[routes]]
pattern = "api.example.com/api/*"
zone_id = "abc123456789..."

[env.staging]
# Staging environment routes
# Domain: staging-api.example.com
# Zone ID: abc123456789...
[[routes]]
pattern = "staging-api.example.com/api/*"
zone_id = "abc123456789..."

# Development environment
# Uses workers.dev subdomain
# No zone_id required
```

### Step 5: Clean Up

Remove manual route configurations from your workflow:
- ✅ Delete old wrangler.toml templates
- ✅ Remove manual route editing scripts
- ✅ Update deployment documentation

## Migration Scenarios

### Scenario 1: Single Domain, Multiple Environments

**Before (manual):**
```toml
[[routes]]
pattern = "api.myapp.com/v1/*"
zone_id = "xyz789..."

[env.staging]
[[routes]]
pattern = "staging.myapp.com/v1/*"
zone_id = "xyz789..."
```

**After (automated):**
```javascript
{
  "domains": {
    "myapp.com": {
      "cloudflareZoneId": "xyz789...",
      "environments": {
        "production": {
          "domain": "api.myapp.com",
          "apiBasePath": "/v1"
        },
        "staging": {
          "domain": "staging.myapp.com",
          "apiBasePath": "/v1"
        }
      }
    }
  }
}
```

### Scenario 2: Multi-Tenant SaaS

**Before (manual):**
```toml
# Customer 1
[[routes]]
pattern = "customer1.example.com/api/*"
zone_id = "zone1..."

# Customer 2
[[routes]]
pattern = "customer2.example.com/api/*"
zone_id = "zone2..."

# Customer 3
[[routes]]
pattern = "customer3.example.com/api/*"
zone_id = "zone3..."
```

**After (automated):**
```javascript
{
  "domains": {
    "customer1.example.com": {
      "cloudflareZoneId": "zone1...",
      "environments": {
        "production": {
          "domain": "customer1.example.com",
          "apiBasePath": "/api"
        }
      }
    },
    "customer2.example.com": {
      "cloudflareZoneId": "zone2...",
      "environments": {
        "production": {
          "domain": "customer2.example.com",
          "apiBasePath": "/api"
        }
      }
    },
    "customer3.example.com": {
      "cloudflareZoneId": "zone3...",
      "environments": {
        "production": {
          "domain": "customer3.example.com",
          "apiBasePath": "/api"
        }
      }
    }
  }
}
```

**Benefits:**
- Add new customers by updating config (no TOML editing)
- Consistent route patterns across all customers
- Easy to validate and review

### Scenario 3: Multiple Services, One Domain

**Before (manual):**
```toml
# API Service
[[routes]]
pattern = "example.com/api/*"
zone_id = "abc123..."

# Auth Service  
[[routes]]
pattern = "example.com/auth/*"
zone_id = "abc123..."

# Data Service
[[routes]]
pattern = "example.com/data/*"
zone_id = "abc123..."
```

**After (automated):**

Create separate domain configs for each service:

```javascript
// api-service/domain-config.json
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "abc123...",
      "environments": {
        "production": {
          "domain": "example.com",
          "apiBasePath": "/api"
        }
      }
    }
  }
}

// auth-service/domain-config.json
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "abc123...",
      "environments": {
        "production": {
          "domain": "example.com",
          "apiBasePath": "/auth"
        }
      }
    }
  }
}

// data-service/domain-config.json
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "abc123...",
      "environments": {
        "production": {
          "domain": "example.com",
          "apiBasePath": "/data"
        }
      }
    }
  }
}
```

Each service generates its own routes automatically.

### Scenario 4: Complex Wildcard Patterns

**Before (manual):**
```toml
[[routes]]
pattern = "api.example.com/v1/graphql"
zone_id = "abc123..."

[[routes]]
pattern = "api.example.com/v1/rest/*"
zone_id = "abc123..."
```

**After (automated):**

Use custom wildcard patterns:

```javascript
// domain-config.json
{
  "domains": {
    "api.example.com": {
      "cloudflareZoneId": "abc123...",
      "environments": {
        "production": {
          "domain": "api.example.com",
          "apiBasePath": "/v1"
        }
      }
    }
  }
}
```

```json
// validation-config.json
{
  "environments": {
    "production": {
      "routing": {
        "wildcardPattern": "/graphql"  // Or "/rest/*"
      }
    }
  }
}
```

**Note:** For multiple patterns per domain, you may still need some manual configuration. Consider splitting into separate services.

## Configuration Customization

### Customize Path Prefixes

Override default path prefixes per environment:

```json
{
  "environments": {
    "production": {
      "routing": {
        "defaultPathPrefix": "/v2"
      }
    },
    "staging": {
      "routing": {
        "defaultPathPrefix": "/v2-staging"
      }
    }
  }
}
```

### Disable Comments

For minimal TOML output:

```json
{
  "routing": {
    "defaults": {
      "includeComments": false
    }
  }
}
```

### Custom Route Ordering

Change how routes are ordered:

```json
{
  "routing": {
    "defaults": {
      "orderStrategy": "alphabetical"  // or "as-defined"
    }
  }
}
```

### Skip Specific Domains

Exclude domains from route generation:

```json
{
  "routing": {
    "domains": {
      "skipPatterns": [
        "internal.example.com",
        "*.test.com"
      ]
    }
  }
}
```

## Common Migration Issues

### Issue 1: Zone ID Not Found

**Error:** `Missing cloudflareZoneId in domain configuration`

**Solution:** Add zone ID to domain config:
```javascript
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "your-32-char-zone-id",
      // ...
    }
  }
}
```

Find your Zone ID in Cloudflare Dashboard → Domain → Overview (right sidebar).

### Issue 2: Routes Not Generated

**Problem:** wrangler.toml has no routes section

**Solutions:**
1. Check domain config has `environments` defined
2. Verify environment has `domain` or `subdomain`
3. Check if domain matches `skipPatterns`
4. Ensure service generation includes domain config path

### Issue 3: Different Route Patterns

**Problem:** Generated patterns don't match manual ones

**Solutions:**
1. Check `apiBasePath` matches your manual path prefix
2. Review `wildcardPattern` in routing config
3. Verify `defaultPathPrefix` for environment
4. Check for `ignoreSubdomains` filtering

### Issue 4: Missing Environment Routes

**Problem:** Staging or development routes not appearing

**Solutions:**
1. Ensure environment is defined in domain config
2. Check `nestedInToml` setting (should be `true` for non-production)
3. Verify `targetEnvironment` is `"all"` (default)
4. Review environment-specific routing config

### Issue 5: Duplicate Routes

**Problem:** Same route appears multiple times

**Solutions:**
1. Check for duplicate domain entries in config
2. Review multi-service setup (each service should have separate config)
3. Verify `orderStrategy` isn't causing confusion
4. Check `generateFallbackRoute` setting

## Validation Checklist

Before going live with automated routing:

- [ ] All manual routes documented and understood
- [ ] Domain configuration created with correct zone IDs
- [ ] Generated wrangler.toml reviewed and matches expectations
- [ ] Test deployment to staging environment
- [ ] Verify all routes work as expected
- [ ] Update documentation and runbooks
- [ ] Train team on new configuration approach
- [ ] Remove old manual route management scripts
- [ ] Add domain config to version control

## Rollback Plan

If you need to revert to manual configuration:

1. **Keep a backup** of your old wrangler.toml
2. **Document manual routes** before migration
3. **Test in staging first** before production
4. **Gradual migration**: Migrate one service at a time

To temporarily override automated routes:

```javascript
// domain-config.json
{
  "domains": {
    "example.com": {
      "_autoGenerate": false,  // Disable auto-generation
      "manualRoutes": true     // Use manual wrangler.toml
    }
  }
}
```

## Best Practices

### 1. Start with Development Environment

Migrate development environment first to validate the approach:

```javascript
{
  "domains": {
    "example.com": {
      "environments": {
        "development": {
          "subdomain": "my-service-dev"
        }
      }
    }
  }
}
```

### 2. Use Git for Domain Configuration

Version control your domain configs:
```bash
git add domain-config.json
git commit -m "Add automated routing configuration"
```

### 3. Document Zone IDs

Keep a reference of which zone IDs map to which domains:

```javascript
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "abc123...",
      "_note": "Production zone for example.com",
      // ...
    }
  }
}
```

### 4. Test Before Deploying

Always verify generated routes before deployment:

```bash
# Generate service locally
npx clodo-service create test-migration --type api-gateway

# Review generated wrangler.toml
cat test-migration/wrangler.toml

# Deploy to staging first
cd test-migration
npx wrangler deploy --env staging
```

### 5. Gradual Migration

Migrate services one at a time:
1. Start with low-traffic service
2. Monitor for issues
3. Validate route behavior
4. Move to next service
5. Keep high-traffic services for last

## Support and Resources

- **Documentation**: [ROUTING_GUIDE.md](./ROUTING_GUIDE.md) - Complete routing reference
- **Examples**: [examples/](../examples/) - Sample configurations
- **Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- **API Reference**: See ROUTING_GUIDE.md for programmatic usage

## Next Steps

After successful migration:
1. ✅ Remove manual route management from workflow
2. ✅ Update team documentation
3. ✅ Consider enabling strictMode validation
4. ✅ Explore advanced features (multi-tenant, custom patterns)
5. ✅ Share feedback on GitHub

Welcome to automated routing! 🚀
