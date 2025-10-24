# Clodo Framework - Routing Guide

## Overview

Clodo Framework automatically generates Cloudflare Worker routes from your domain configuration. This eliminates manual wrangler.toml route management and ensures consistency across development, staging, and production environments.

**Key Benefits:**
- 🚀 Zero manual route configuration
- 🔄 Automatic environment-specific routing
- 🌍 Multi-domain and multi-tenant support
- 🛡️ Validation and conflict detection
- 📝 Self-documenting TOML output

## Quick Start

### Basic Single Domain

```javascript
// domain-config.json
{
  "domains": {
    "api.example.com": {
      "cloudflareZoneId": "abc123...",
      "environments": {
        "production": {
          "domain": "api.example.com",
          "apiBasePath": "/api"
        }
      }
    }
  }
}
```

**Generated Routes:**
```toml
# Production environment routes
# Domain: api.example.com
# Zone ID: abc123...
[[routes]]
pattern = "api.example.com/api/*"
zone_id = "abc123..."
```

### Multi-Environment Setup

```javascript
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "xyz789...",
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

**Generated Routes:**
```toml
# Production environment routes
[[routes]]
pattern = "api.example.com/api/*"
zone_id = "xyz789..."

[env.staging]
[[routes]]
pattern = "staging-api.example.com/api/*"
zone_id = "xyz789..."

# Development environment
# Uses workers.dev subdomain
# No zone_id required
```

## Configuration Reference

### Global Routing Configuration

Located in `validation-config.json` under the `routing` section:

#### `routing.defaults`

Default options applied to all route generation:

```json
{
  "routing": {
    "defaults": {
      "includeComments": true,
      "includeZoneId": true,
      "targetEnvironment": "all",
      "orderStrategy": "most-specific-first"
    }
  }
}
```

**Options:**

- **`includeComments`** (boolean): Add descriptive comments to generated TOML
  - Default: `true`
  - Set to `false` for minimal output

- **`includeZoneId`** (boolean): Include Cloudflare Zone IDs in routes
  - Default: `true`
  - Required for custom domains, optional for workers.dev

- **`targetEnvironment`** (string): Which environments to generate routes for
  - Default: `"all"`
  - Options: `"all"`, `"production"`, `"staging"`, `"development"`

- **`orderStrategy`** (string): Route ordering in TOML output
  - Default: `"most-specific-first"`
  - Options: `"most-specific-first"`, `"alphabetical"`, `"as-defined"`

#### `routing.domains`

Domain-specific routing rules:

```json
{
  "routing": {
    "domains": {
      "skipPatterns": [],
      "complexTLDs": [".co.uk", ".com.au", ".org.uk"],
      "subdomainMinParts": 3,
      "ignoreSubdomains": ["www"]
    }
  }
}
```

**Options:**

- **`skipPatterns`** (array): Domain patterns to exclude from route generation
  - Example: `["internal.example.com", "*.test.com"]`
  - Supports wildcards

- **`complexTLDs`** (array): Multi-part top-level domains
  - Used for proper subdomain detection
  - Example: `api.example.co.uk` → subdomain is `api`, not `api.example`

- **`subdomainMinParts`** (number): Minimum domain parts to be considered a subdomain
  - Default: `3` (e.g., `api.example.com` = 3 parts)
  - `example.com` (2 parts) = apex domain

- **`ignoreSubdomains`** (array): Subdomain prefixes to skip in route patterns
  - Default: `["www"]`
  - Example: `www.api.example.com` → generates routes for `api.example.com`

#### `routing.validation`

Pattern validation for generated routes:

```json
{
  "routing": {
    "validation": {
      "zoneIdPattern": "^[a-f0-9]{32}$",
      "domainPattern": "^[a-z0-9.-]+$",
      "strictMode": true
    }
  }
}
```

**Options:**

- **`zoneIdPattern`** (regex): Cloudflare Zone ID validation
  - Default: 32 hexadecimal characters
  - Prevents invalid zone IDs in generated routes

- **`domainPattern`** (regex): Valid domain character validation
  - Default: lowercase letters, numbers, dots, hyphens
  - Ensures clean route patterns

- **`strictMode`** (boolean): Error handling for invalid domains
  - `true`: Reject invalid domains (recommended for production)
  - `false`: Log warnings but continue (useful for development)

#### `routing.comments`

TOML comment templates with placeholder support:

```json
{
  "routing": {
    "comments": {
      "enabled": true,
      "templates": {
        "production": "# Production environment routes\n# Domain: {{domain}}",
        "staging": "# Staging environment routes\n# Domain: {{domain}}",
        "development": "# Development environment\n# Uses {{WORKERS_DEV_DOMAIN}} subdomain"
      }
    }
  }
}
```

**Placeholders:**
- `{{domain}}` - Domain name
- `{{zone_id}}` - Cloudflare Zone ID
- `{{environment}}` - Environment name
- `{{WORKERS_DEV_DOMAIN}}` - Workers.dev domain from config

### Environment-Specific Configuration

Located in `validation-config.json` under `environments.<env>.routing`:

```json
{
  "environments": {
    "production": {
      "routing": {
        "defaultPathPrefix": "/api",
        "wildcardPattern": "/*",
        "generateFallbackRoute": true,
        "nestedInToml": false
      }
    },
    "staging": {
      "routing": {
        "defaultPathPrefix": "/staging-api",
        "wildcardPattern": "/*",
        "generateFallbackRoute": true,
        "nestedInToml": true
      }
    },
    "development": {
      "routing": {
        "defaultPathPrefix": "/dev-api",
        "wildcardPattern": "/*",
        "generateFallbackRoute": true,
        "nestedInToml": true
      }
    }
  }
}
```

**Options:**

- **`defaultPathPrefix`** (string): Default API base path when not specified in domain config
  - Production: `/api`
  - Staging: `/staging-api`
  - Development: `/dev-api`

- **`wildcardPattern`** (string): Route pattern suffix
  - Default: `"/*"` (match all paths under prefix)
  - Alternative: `"/v1/*"`, `"/graphql"`, etc.

- **`generateFallbackRoute`** (boolean): Generate catch-all route
  - Default: `true`
  - Creates `domain.com/*` in addition to specific patterns

- **`nestedInToml`** (boolean): Use `[env.<name>]` sections in wrangler.toml
  - Production: `false` (top-level routes)
  - Staging/Dev: `true` (nested under environment)

## Advanced Use Cases

### Multi-Tenant SaaS

Generate routes for multiple customer domains:

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
    }
  }
}
```

**Generated Routes:**
```toml
# Customer 1 routes
[[routes]]
pattern = "customer1.example.com/api/*"
zone_id = "zone1..."

# Customer 2 routes
[[routes]]
pattern = "customer2.example.com/api/*"
zone_id = "zone2..."
```

### Custom Wildcard Patterns

Override the default `/*` pattern:

```javascript
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

**With custom wildcard in config:**
```json
{
  "environments": {
    "production": {
      "routing": {
        "wildcardPattern": "/graphql"
      }
    }
  }
}
```

**Generated Route:**
```toml
[[routes]]
pattern = "api.example.com/v1/graphql"
zone_id = "abc123..."
```

### Skip Internal Domains

Exclude certain domains from route generation:

```json
{
  "routing": {
    "domains": {
      "skipPatterns": [
        "internal.example.com",
        "*.staging.internal.com",
        "test-*.example.com"
      ]
    }
  }
}
```

Any domain matching these patterns will be ignored during route generation.

### Complex Multi-Part TLDs

Proper handling of international domains:

```json
{
  "routing": {
    "domains": {
      "complexTLDs": [
        ".co.uk",
        ".com.au",
        ".org.uk",
        ".gov.uk",
        ".co.nz",
        ".com.br"
      ]
    }
  }
}
```

**Example:**
- `api.example.co.uk` → subdomain: `api`, domain: `example.co.uk`
- Without config → would treat `co.uk` as two separate parts

## Programmatic Usage

### Using RouteGenerator Directly

```javascript
import { RouteGenerator } from './src/service-management/routing/RouteGenerator.js';

const generator = new RouteGenerator({
  includeComments: true,
  includeZoneId: true,
  environment: 'production'
});

const domainConfig = {
  domains: {
    'api.example.com': {
      cloudflareZoneId: 'abc123...',
      environments: {
        production: {
          domain: 'api.example.com',
          apiBasePath: '/api'
        }
      }
    }
  }
};

const routes = generator.generateRoutes(domainConfig);
console.log(routes); // TOML-formatted routes
```

### Custom Route Generation Options

```javascript
const generator = new RouteGenerator({
  includeComments: false,          // Minimal output
  includeZoneId: true,              // Include zone IDs
  environment: 'staging',           // Only staging routes
  orderStrategy: 'alphabetical',    // Sort routes alphabetically
  skipPatterns: ['internal.*']      // Skip internal domains
});
```

### Environment-Specific Generation

```javascript
// Generate only production routes
const prodGenerator = new RouteGenerator({
  environment: 'production'
});

// Generate only staging routes
const stagingGenerator = new RouteGenerator({
  environment: 'staging'
});

// Generate all environments (default)
const allGenerator = new RouteGenerator({
  environment: 'all'
});
```

## Troubleshooting

### Routes Not Generated

**Problem:** No routes appear in wrangler.toml

**Solutions:**
1. Check domain config has valid `cloudflareZoneId`
2. Verify environment has `domain` or `subdomain` specified
3. Check if domain matches `skipPatterns` in routing config
4. Ensure `strictMode` validation passes

### Incorrect Route Patterns

**Problem:** Generated patterns don't match expected URLs

**Solutions:**
1. Check `apiBasePath` in domain config
2. Verify `defaultPathPrefix` in environment routing config
3. Review `wildcardPattern` setting
4. Check for `ignoreSubdomains` filtering

### Zone ID Errors

**Problem:** Invalid zone_id in generated routes

**Solutions:**
1. Verify `cloudflareZoneId` is 32 hexadecimal characters
2. Check `zoneIdPattern` validation regex
3. Ensure zone ID matches your Cloudflare zone
4. For workers.dev, zone ID is optional

### Missing Environment Routes

**Problem:** Staging or development routes not generated

**Solutions:**
1. Check `targetEnvironment` is set to `"all"` (default)
2. Verify environment is defined in domain config
3. Check `nestedInToml` setting for environment
4. Review environment-specific routing config

## Best Practices

### 1. Use Environment-Specific Prefixes

Differentiate environments clearly:
```json
{
  "production": { "defaultPathPrefix": "/api" },
  "staging": { "defaultPathPrefix": "/staging-api" },
  "development": { "defaultPathPrefix": "/dev-api" }
}
```

### 2. Enable Comments in Development

Make generated TOML readable:
```json
{
  "routing": {
    "defaults": {
      "includeComments": true
    }
  }
}
```

### 3. Use Strict Mode in Production

Catch configuration errors early:
```json
{
  "routing": {
    "validation": {
      "strictMode": true
    }
  }
}
```

### 4. Skip Internal Domains

Avoid exposing internal routes:
```json
{
  "routing": {
    "domains": {
      "skipPatterns": [
        "internal.*",
        "*.local",
        "test-*"
      ]
    }
  }
}
```

### 5. Order Routes Strategically

Most specific routes first prevents conflicts:
```json
{
  "routing": {
    "defaults": {
      "orderStrategy": "most-specific-first"
    }
  }
}
```

## Migration from Manual Routes

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed steps on migrating from manually configured wrangler.toml routes to automated route generation.

## API Reference

### RouteGenerator

**Constructor:**
```javascript
new RouteGenerator(options)
```

**Options:**
- `includeComments` (boolean): Include descriptive comments
- `includeZoneId` (boolean): Include Cloudflare Zone IDs
- `environment` (string): Target environment ('all', 'production', 'staging', 'development')
- `orderStrategy` (string): Route ordering strategy
- `skipPatterns` (array): Patterns to exclude

**Methods:**

- `generateRoutes(domainConfig)` → string
  - Generates TOML-formatted routes from domain configuration
  - Returns complete routes section ready for wrangler.toml

### DomainRouteMapper

**Constructor:**
```javascript
new DomainRouteMapper(options)
```

**Methods:**

- `mapDomain(domain, config, environment)` → array
  - Maps single domain to route patterns
  - Returns array of route objects: `[{ pattern, zone_id }]`

- `mapAllDomains(domainConfig, environment)` → array
  - Maps all domains in config to routes
  - Returns array of all route objects

### WranglerRoutesBuilder

**Constructor:**
```javascript
new WranglerRoutesBuilder(options)
```

**Methods:**

- `buildToml(routes, environment)` → string
  - Converts route objects to TOML format
  - Handles environment nesting and comments
  - Returns TOML-formatted string

## Support

For issues or questions:
- GitHub Issues: [clodo-framework/issues](https://github.com/tamylaa/clodo-framework/issues)
- Documentation: [README.md](../README.md)
- Examples: [examples/](../examples/)
