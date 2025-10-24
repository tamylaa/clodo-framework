# Domain/Routes Automation - Example Configurations

**Date**: October 24, 2025  
**Purpose**: Provide concrete examples of routing configuration for different scenarios

## Overview

This document provides example configurations for Domain/Routes Automation, showing how the feature generates wrangler.toml routing sections from simple domain inputs.

## Example 1: Standard API Service

### Input Context
```javascript
{
  coreInputs: {
    serviceName: 'user-api',
    domainName: 'api.example.com',
    cloudflareZoneId: 'abc123def456ghi789jkl012',
    environment: 'production'
  },
  confirmedValues: {
    productionUrl: 'https://api.example.com',
    stagingUrl: 'https://staging-api.example.com',
    developmentUrl: 'https://dev-api.example.com',
    apiBasePath: '/api/v1'
  }
}
```

### Generated wrangler.toml
```toml
# Production routes for api.example.com
[[routes]]
pattern = "api.example.com/*"
zone_id = "abc123def456ghi789jkl012"

# Fallback routes for example.com
[[routes]]
pattern = "example.com/api/v1/*"
zone_id = "abc123def456ghi789jkl012"
```

### Explanation
- **Subdomain Route**: `api.example.com/*` handles direct subdomain traffic
- **Fallback Route**: `example.com/api/v1/*` provides path-based routing for root domain
- **Zone Association**: Both routes point to the same Cloudflare zone

---

## Example 2: Multi-Environment Service

### Input Context
```javascript
{
  coreInputs: {
    serviceName: 'analytics-service',
    domainName: 'analytics.example.com',
    cloudflareZoneId: 'def456ghi789jkl012mno345',
    environment: 'all'  // Generate for all environments
  },
  confirmedValues: {
    productionUrl: 'https://analytics.example.com',
    stagingUrl: 'https://staging-analytics.example.com',
    developmentUrl: 'https://analytics-dev.example.com',
    apiBasePath: '/analytics'
  }
}
```

### Generated wrangler.toml
```toml
# Production routes for analytics.example.com
[[routes]]
pattern = "analytics.example.com/*"
zone_id = "def456ghi789jkl012mno345"

[[routes]]
pattern = "example.com/analytics/*"
zone_id = "def456ghi789jkl012mno345"

# Staging environment routes
# Domain: analytics.example.com
[env.staging]

  [[env.staging.routes]]
  pattern = "staging-analytics.example.com/*"
  zone_id = "def456ghi789jkl012mno345"

  [[env.staging.routes]]
  pattern = "example.com/staging-analytics/*"
  zone_id = "def456ghi789jkl012mno345"

# Development environment
# Uses workers.dev subdomain: https://analytics-service-dev.<account>.workers.dev
# No routes needed for workers.dev subdomains
```

### Explanation
- **Production**: Top-level routes without nesting
- **Staging**: Nested under `[env.staging]` section
- **Development**: Workers.dev detection skips route generation
- **Pattern Ordering**: Subdomain routes before fallback routes

---

## Example 3: Custom Path Prefixes

### validation-config.json
```json
{
  "routing": {
    "pathPrefixes": {
      "production": "/api/v2",
      "staging": "/preview",
      "development": "/dev",
      "fallback": "/api/v2"
    }
  }
}
```

### Input Context
```javascript
{
  coreInputs: {
    serviceName: 'content-api',
    domainName: 'content-api.example.com',
    environment: 'production'
  },
  confirmedValues: {
    apiBasePath: '/api/v2'
  }
}
```

### Generated wrangler.toml
```toml
# Production routes for content-api.example.com
[[routes]]
pattern = "content-api.example.com/*"
zone_id = "ghi789jkl012mno345pqr678"

[[routes]]
pattern = "example.com/api/v2/*"
zone_id = "ghi789jkl012mno345pqr678"
```

### Explanation
- **Custom Prefix**: Uses `/api/v2` instead of default `/api`
- **Config-Driven**: Path prefix read from validation-config.json
- **Fallback Match**: Uses same prefix for root domain routes

---

## Example 4: Complex TLD Handling

### Input Context
```javascript
{
  coreInputs: {
    serviceName: 'uk-service',
    domainName: 'api.example.co.uk',
    cloudflareZoneId: 'jkl012mno345pqr678stu901',
    environment: 'production'
  }
}
```

### Generated wrangler.toml
```toml
# Production routes for api.example.co.uk
[[routes]]
pattern = "api.example.co.uk/*"
zone_id = "jkl012mno345pqr678stu901"

[[routes]]
pattern = "example.co.uk/api/*"
zone_id = "jkl012mno345pqr678stu901"
```

### Explanation
- **Complex TLD**: Correctly identifies `.co.uk` as root domain
- **Proper Parsing**: Doesn't treat `co.uk` as subdomain
- **Correct Routes**: Generates appropriate patterns for international domains

---

## Example 5: Workers.dev Development Environment

### Input Context
```javascript
{
  coreInputs: {
    serviceName: 'test-service',
    domainName: 'test-service-abc123.workers.dev',
    environment: 'development'
  }
}
```

### Generated wrangler.toml
```toml
# Development environment
# Uses workers.dev subdomain: https://test-service-dev.abc123.workers.dev
# No routes needed for workers.dev subdomains
```

### Explanation
- **Skip Logic**: Detects `workers.dev` and skips route generation
- **Comment Only**: Provides helpful information about the workers.dev URL
- **No Routes**: Workers.dev handles routing automatically

---

## Example 6: Root Domain Only (No Subdomain)

### Input Context
```javascript
{
  coreInputs: {
    serviceName: 'marketing-site',
    domainName: 'example.com',
    environment: 'production'
  },
  confirmedValues: {
    apiBasePath: '/api'
  }
}
```

### Generated wrangler.toml
```toml
# Production routes for example.com
[[routes]]
pattern = "example.com/api/*"
zone_id = "mno345pqr678stu901vwx234"
```

### Explanation
- **No Subdomain**: Domain has only 2 parts, treated as root
- **Single Route**: Only generates the path-based route
- **No Subdomain Route**: No `example.com/*` pattern (would conflict)

---

## Configuration Examples

### Basic Configuration
```json
{
  "routing": {
    "defaults": {
      "includeComments": true,
      "includeZoneId": true,
      "targetEnvironment": "all"
    }
  }
}
```

### Advanced Configuration
```json
{
  "routing": {
    "defaults": {
      "includeComments": true,
      "includeZoneId": true,
      "orderStrategy": "most-specific-first"
    },
    "pathPrefixes": {
      "production": "/api",
      "staging": "/staging-api",
      "development": "/dev-api"
    },
    "domains": {
      "skipPatterns": ["workers.dev", "localhost"],
      "complexTLDs": [".co.uk", ".com.au", ".org.uk"]
    },
    "environments": {
      "names": ["production", "staging", "development"]
    }
  }
}
```

### Custom Comment Templates
```json
{
  "routing": {
    "comments": {
      "templates": {
        "production": "# Production API routes for {{domain}} - {{serviceName}}",
        "staging": "# Staging environment - {{domain}}",
        "development": "# Dev mode: {{workerName}}-dev.{{account}}.workers.dev"
      }
    }
  }
}
```

## Error Examples

### Invalid Zone ID
```javascript
// Input: invalid zone ID
{ cloudflareZoneId: "invalid" }

// Error: cloudflareZoneId must be a valid Cloudflare zone ID (32 hex characters). Received: invalid
```

### Invalid Domain
```javascript
// Input: invalid domain
{ domainName: "invalid..domain" }

// Error: domainName must be a valid hostname format
```

### Missing Required Fields
```javascript
// Missing zone ID
{ domainName: "api.example.com" }

// Error: coreInputs.cloudflareZoneId is required for route generation
```</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\docs\DOMAIN_ROUTES_AUTOMATION_EXAMPLES.md