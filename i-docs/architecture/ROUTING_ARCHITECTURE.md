# 🛣️ Routing Architecture - Complete Guide

**Date**: October 27, 2025 (Consolidated Documentation)
**Purpose**: Comprehensive routing configuration and architecture guide

---

## 📋 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Architecture Assessment](#-architecture-assessment)
3. [Configuration Reuse Analysis](#-configuration-reuse-analysis)
4. [Implementation Guide](#-implementation-guide)

---

## 🎯 Executive Summary

### Routing Architecture Overview
Clodo Framework automatically generates Cloudflare Worker routes from domain configuration, eliminating manual wrangler.toml management and ensuring consistency across environments.

**Key Benefits:**
- 🚀 Zero manual route configuration
- 🔄 Automatic environment-specific routing
- 🌍 Multi-domain and multi-tenant support
- 🛡️ Validation and conflict detection
- 📝 Self-documenting TOML output

### Current State
- **18 hardcoded assumptions** identified that should be configurable
- **60% of needed configuration** already exists in `validation-config.json`
- **Modular architecture** established with RouteGenerator, DomainRouteMapper, and WranglerRoutesBuilder

---

## 🔍 Architecture Assessment

**Purpose**: Identify hardcoded assumptions and hidden expectations in route generation that should be configurable

### 🔴 CRITICAL: Hardcoded Assumptions (Must Fix)

#### 1. Default Path Prefixes (Severity: HIGH)
**Current State**: Hardcoded fallback values in `DomainRouteMapper.js`
```javascript
// Line 118: Production default
const pathPrefix = config.apiBasePath || '/api';

// Line 150: Staging default
const pathPrefix = config.apiBasePath || '/staging-api';

// Line 184: Development default
const pathPrefix = config.apiBasePath || '/dev-api';
```

**Problem**:
- Users cannot customize default path conventions
- Assumes API-centric architecture (not suitable for static sites, webhooks, etc.)
- Different services might need different path strategies

**Impact**: HIGH - Affects all route generation for non-subdomain deployments

**Solution**: Externalize to `validation-config.json`
```json
{
  "routing": {
    "defaultPathPrefixes": {
      "production": "/api",
      "staging": "/staging-api",
      "development": "/dev-api"
    }
  }
}
```

#### 2. Workers.dev Detection (Severity: MEDIUM)
**Current State**: Hardcoded string matching
```javascript
// RouteGenerator.js line 150
if (!domainUrl || domainUrl.includes('workers.dev')) {
  // workers.dev subdomain - no routes needed
  return '';
}

// DomainRouteMapper.js line 58
if (domainUrl.includes('workers.dev')) {
  return { patterns: [], zoneId, environment };
}
```

**Problem**:
- Only detects Cloudflare's workers.dev
- Doesn't handle custom development domains
- Hardcoded string makes it inflexible

**Impact**: MEDIUM - Affects development environment routing

**Solution**: Configurable development domain patterns
```json
{
  "routing": {
    "developmentDomains": [
      "*.workers.dev",
      "*.dev.example.com",
      "localhost:*"
    ]
  }
}
```

#### 3. Route Pattern Templates (Severity: HIGH)
**Current State**: Hardcoded pattern construction
```javascript
// DomainRouteMapper.js lines 200-220
const subdomainRoute = `${subdomain}.${domain}/*`;
const fallbackRoute = `${domain}${pathPrefix}/*`;
```

**Problem**:
- Assumes specific pattern format
- No support for custom routing patterns
- Cannot handle complex routing scenarios

**Impact**: HIGH - Limits routing flexibility

**Solution**: Template-based pattern generation
```json
{
  "routing": {
    "patternTemplates": {
      "subdomain": "{{subdomain}}.{{domain}}/*",
      "fallback": "{{domain}}{{pathPrefix}}/*",
      "custom": "{{domain}}/{{service}}/*"
    }
  }
}
```

#### 4. Environment-Specific Logic (Severity: MEDIUM)
**Current State**: Hardcoded environment detection
```javascript
// RouteGenerator.js line 89
if (environment === 'production') {
  // Production-specific logic
} else if (environment === 'staging') {
  // Staging-specific logic
} else {
  // Development logic
}
```

**Problem**:
- Environment names are hardcoded
- Logic cannot be customized per project
- Difficult to add new environments

**Impact**: MEDIUM - Limits environment flexibility

**Solution**: Environment configuration in validation-config.json
```json
{
  "routing": {
    "environments": {
      "production": { "generateRoutes": true, "pathPrefix": "/" },
      "staging": { "generateRoutes": true, "pathPrefix": "/staging" },
      "development": { "generateRoutes": false, "pathPrefix": "/dev" }
    }
  }
}
```

#### 5. Zone ID Resolution (Severity: HIGH)
**Current State**: Manual zone ID passing
```javascript
// Requires explicit zoneId parameter
generateRoutes(domain, environment, zoneId)
```

**Problem**:
- Manual zone ID management
- No automatic resolution from domain
- Error-prone for multi-zone setups

**Impact**: HIGH - Affects all route generation

**Solution**: Domain-to-zone mapping
```json
{
  "routing": {
    "domainZones": {
      "api.example.com": "zone-123",
      "*.example.com": "zone-456",
      "staging-api.example.com": "zone-789"
    }
  }
}
```

### 🟡 HIGH: Configuration Gaps (Should Fix)

#### 6. Service Type Routing (Severity: HIGH)
**Current State**: No service-type specific routing
```javascript
// All services use same routing logic
const routes = generateRoutes(domain, environment);
```

**Problem**:
- API gateways need different routes than static sites
- Webhook services need different patterns than web apps
- No service-type awareness in routing

**Impact**: HIGH - Affects service architecture decisions

**Solution**: Service-type routing rules
```json
{
  "routing": {
    "serviceTypes": {
      "api-gateway": {
        "patterns": ["{{domain}}/api/*", "{{subdomain}}.{{domain}}/*"],
        "pathPrefix": "/api"
      },
      "static-site": {
        "patterns": ["{{domain}}/*"],
        "pathPrefix": "/"
      },
      "webhook": {
        "patterns": ["{{domain}}/webhook/*"],
        "pathPrefix": "/webhook"
      }
    }
  }
}
```

#### 7. Custom Route Overrides (Severity: MEDIUM)
**Current State**: No way to add custom routes
```javascript
// Generated routes only
const routes = generateRoutes(domain, environment);
```

**Problem**:
- Cannot add project-specific routes
- No escape hatch for complex scenarios
- All routes must follow generated patterns

**Impact**: MEDIUM - Limits advanced use cases

**Solution**: Custom route injection
```json
{
  "routing": {
    "customRoutes": {
      "api.example.com": [
        { "pattern": "api.example.com/health", "zoneId": "zone-123" },
        { "pattern": "api.example.com/metrics", "zoneId": "zone-123" }
      ]
    }
  }
}
```

#### 8. Route Priority Ordering (Severity: MEDIUM)
**Current State**: Basic most-specific first
```javascript
// DomainRouteMapper.js line 300
routes.sort((a, b) => b.pattern.length - a.pattern.length);
```

**Problem**:
- Simple length-based sorting
- No priority control
- Cannot handle complex precedence rules

**Impact**: MEDIUM - Affects route matching order

**Solution**: Configurable route ordering
```json
{
  "routing": {
    "routeOrdering": {
      "rules": [
        { "pattern": "*.workers.dev", "priority": 100 },
        { "pattern": "*staging*", "priority": 50 },
        { "pattern": "*", "priority": 10 }
      ]
    }
  }
}
```

### 🟢 MEDIUM: Nice-to-Have Features

#### 9. Route Validation Rules
#### 10. Conflict Detection
#### 11. Performance Optimization
#### 12. Monitoring Integration

---

## 🔄 Configuration Reuse Analysis

**Purpose**: Identify existing constants in `validation-config.json` that can be reused for routing configuration

### ✅ Existing Constants We Can Reuse

#### 1. Environment Configuration (ALREADY EXISTS)
**Location**: `validation-config.json` lines 79-104

```json
"environments": {
  "development": {
    "domainTemplate": "dev-{service}.{domain}",
    "workerSuffix": "-dev",
    "databaseSuffix": "-dev",
    "logLevel": "debug",
    "enableMetrics": true,
    "strictValidation": false
  },
  "staging": {
    "domainTemplate": "staging-{service}.{domain}",
    "workerSuffix": "-staging",
    "databaseSuffix": "-staging",
    "logLevel": "info",
    "enableMetrics": true,
    "strictValidation": true
  },
  "production": {
    "domainTemplate": "{service}.{domain}",
    "workerSuffix": "",
    "databaseSuffix": "",
    "logLevel": "warn",
    "enableMetrics": true,
    "strictValidation": true
  }
}
```

**✅ REUSE FOR**:
- Environment names: `['production', 'staging', 'development']`
- TOML section nesting: Use `workerSuffix` to determine nesting
  - If `workerSuffix === ''` → Top-level routes (production)
  - If `workerSuffix !== ''` → Nested sections (staging, development)

#### 2. Domain Configuration (ALREADY EXISTS)
**Location**: `validation-config.json` lines 50-78

```json
"domains": {
  "clodo.dev": {
    "cloudflareZoneId": "abc123def456ghi789jkl012",
    "certificateAuthority": "letsencrypt",
    "dnsProvider": "cloudflare",
    "supportedEnvironments": ["development", "staging", "production"],
    "wildcardCertificate": true,
    "customDNS": false
  }
}
```

**✅ REUSE FOR**:
- Zone ID mapping: `domains[domain].cloudflareZoneId`
- Environment support: `domains[domain].supportedEnvironments`
- Certificate info: For HTTPS validation in routes

#### 3. Service Types (ALREADY EXISTS)
**Location**: `validation-config.json` lines 20-49

```json
"serviceTypes": {
  "api-gateway": {
    "description": "REST API with OpenAPI spec",
    "defaultPort": 3000,
    "requiresDatabase": true,
    "supportedDatabases": ["d1", "postgres"],
    "defaultTemplate": "api-gateway",
    "features": ["routing", "middleware", "validation"]
  },
  "static-site": {
    "description": "Static website with assets",
    "defaultPort": 80,
    "requiresDatabase": false,
    "supportedDatabases": [],
    "defaultTemplate": "static-site",
    "features": ["cdn", "caching", "redirects"]
  }
}
```

**✅ REUSE FOR**:
- Service type validation: Check if routing is supported
- Default features: `serviceTypes[type].features.includes('routing')`
- Template selection: For route generation templates

#### 4. Security Configuration (PARTIALLY EXISTS)
**Location**: `validation-config.json` lines 105-130

```json
"security": {
  "defaultAuthProvider": "clodo-auth",
  "supportedAuthProviders": ["clodo-auth", "auth0", "firebase"],
  "corsPolicy": "restrictive",
  "rateLimiting": {
    "enabled": true,
    "defaultLimit": 100,
    "burstLimit": 200
  }
}
```

**✅ REUSE FOR**:
- CORS validation: Route generation considers CORS requirements
- Rate limiting: May affect route patterns for rate-limited endpoints

### 📋 New Configuration Needed

#### Routing-Specific Section
```json
{
  "routing": {
    "defaultPathPrefixes": {
      "production": "/api",
      "staging": "/staging-api",
      "development": "/dev-api"
    },
    "developmentDomains": [
      "*.workers.dev",
      "*.dev.example.com"
    ],
    "patternTemplates": {
      "subdomain": "{{subdomain}}.{{domain}}/*",
      "fallback": "{{domain}}{{pathPrefix}}/*"
    },
    "serviceTypeOverrides": {
      "static-site": {
        "pathPrefix": "/"
      },
      "webhook": {
        "pathPrefix": "/webhook"
      }
    },
    "customRoutes": {},
    "routeOrdering": {
      "mostSpecificFirst": true
    }
  }
}
```

### Implementation Impact

#### ✅ Benefits of Reuse
- **60% less configuration** needed
- **Consistency** with existing validation
- **Backward compatibility** maintained
- **Single source of truth** for environment config

#### ⚠️ Integration Challenges
- **Circular dependencies**: Routing config needs domain config, domain config references routing
- **Validation timing**: Route validation needs complete domain config
- **Migration path**: Existing hardcoded values need graceful migration

---

## 📖 Implementation Guide

### Quick Start

#### Basic Single Domain

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

#### Multi-Environment Setup

```javascript
{
  "domains": {
    "example.com": {
      "cloudflareZoneId": "zone-123",
      "environments": {
        "production": { "domain": "api.example.com" },
        "staging": { "domain": "staging-api.example.com" },
        "development": { "domain": "dev-api.example.com" }
      }
    }
  }
}
```

**Generated Routes:**
```toml
# Production routes
[[routes]]
pattern = "api.example.com/*"
zone_id = "zone-123"

[[routes]]
pattern = "example.com/api/*"
zone_id = "zone-123"

# Staging routes
[[routes]]
pattern = "staging-api.example.com/*"
zone_id = "zone-123"

# Development routes (workers.dev - no routes generated)
# Development environment uses workers.dev subdomains
```

### Advanced Configuration

#### Custom Path Prefixes

```json
{
  "routing": {
    "defaultPathPrefixes": {
      "production": "/v2/api",
      "staging": "/staging/v2/api",
      "development": "/dev/v2/api"
    }
  }
}
```

#### Service-Type Specific Routing

```json
{
  "routing": {
    "serviceTypeOverrides": {
      "static-site": {
        "pathPrefix": "/",
        "patterns": ["{{domain}}/*"]
      },
      "webhook": {
        "pathPrefix": "/webhook",
        "patterns": ["{{domain}}/webhook/*"]
      }
    }
  }
}
```

#### Custom Route Injection

```json
{
  "routing": {
    "customRoutes": {
      "api.example.com": [
        {
          "pattern": "api.example.com/health",
          "zoneId": "zone-123"
        },
        {
          "pattern": "api.example.com/metrics",
          "zoneId": "zone-123"
        }
      ]
    }
  }
}
```

### Architecture Components

#### RouteGenerator (Main Orchestrator)
```typescript
class RouteGenerator {
  constructor(config: RoutingConfig)

  generateRoutes(domainConfig: DomainConfig): RouteResult
  validateRoutes(routes: Route[]): ValidationResult
  resolveZoneId(domain: string): string
}
```

#### DomainRouteMapper (Business Logic)
```typescript
class DomainRouteMapper {
  constructor(routingConfig: RoutingConfig)

  mapDomainToRoutes(domain: string, environment: string): RouteMapping
  extractSubdomain(domain: string): string
  generatePathPrefix(subdomain: string, environment: string): string
  applyServiceTypeOverrides(routes: Route[], serviceType: string): Route[]
}
```

#### WranglerRoutesBuilder (TOML Generation)
```typescript
class WranglerRoutesBuilder {
  constructor(options: BuilderOptions)

  buildTomlSection(routes: Route[], environment: string): string
  formatRoute(route: Route): string
  addComments(route: Route): string
  orderRoutes(routes: Route[]): Route[]
}
```

### Error Handling

#### Validation Errors
- **Invalid Domain**: Malformed domain names
- **Missing Zone ID**: No Cloudflare zone associated
- **Route Conflicts**: Overlapping patterns detected
- **Configuration Errors**: Invalid routing config

#### Recovery Strategies
- **Graceful Degradation**: Fall back to manual routes on failure
- **Partial Generation**: Generate valid routes, skip invalid ones
- **Detailed Logging**: Comprehensive error reporting for debugging

### Best Practices

#### Domain Naming
- Use consistent subdomain patterns (api., staging-api., dev-api.)
- Keep domain names under 63 characters
- Avoid special characters in subdomains

#### Configuration Management
- Store routing config in version control
- Document custom routing rules
- Test routing changes in staging first

#### Performance Optimization
- Minimize route count for better performance
- Use wildcard patterns efficiently
- Regularly audit and clean up unused routes

### Troubleshooting

#### Common Issues

**Routes not generating**:
- Check domain format (must be valid FQDN)
- Verify Cloudflare zone ID is configured
- Ensure environment is properly set

**Route conflicts**:
- Review existing wrangler.toml for conflicts
- Use zone-specific routing for multi-zone setups
- Check custom routing rules for overlaps

**Workers.dev issues**:
- Development environments skip route generation by default
- Use `workers.dev` subdomains for local development
- Routes are automatically generated on deployment

---

## 🔧 API Reference

### RouteGenerator Class

#### Constructor
```typescript
new RouteGenerator(config?: RoutingConfig)
```

#### Methods

##### generateRoutes(domainConfig: DomainConfig): RouteResult
Generates routing configuration from domain inputs.

**Parameters**:
- `domainConfig`: Domain configuration object

**Returns**:
- `RouteResult`: Generated routes and metadata

##### validateRoutes(routes: Route[]): ValidationResult
Validates generated routes for conflicts and correctness.

**Parameters**:
- `routes`: Array of route objects to validate

**Returns**:
- `ValidationResult`: Validation results with errors/warnings

### Configuration Types

#### RoutingConfig
```typescript
interface RoutingConfig {
  defaultPathPrefixes: Record<string, string>;
  developmentDomains: string[];
  patternTemplates: Record<string, string>;
  serviceTypeOverrides: Record<string, ServiceTypeConfig>;
  customRoutes: Record<string, Route[]>;
  routeOrdering: RouteOrderingConfig;
}
```

#### RouteResult
```typescript
interface RouteResult {
  routes: Route[];
  warnings: string[];
  errors: string[];
  metadata: {
    generatedAt: Date;
    environment: string;
    domainCount: number;
  };
}
```

#### Route
```typescript
interface Route {
  pattern: string;
  zoneId: string;
  comment?: string;
  priority?: number;
}
```

---

**Document Version**: 1.0 | **Last Updated**: October 27, 2025 | **Consolidated from 3 source documents**</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\i-docs\architecture\ROUTING_ARCHITECTURE.md