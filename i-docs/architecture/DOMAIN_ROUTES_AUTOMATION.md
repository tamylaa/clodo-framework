# 🔄 Domain/Routes Automation - Complete Guide

**Clodo Framework Feature** | **Version**: 3.0+ | **Status**: ✅ Production Ready
**Date**: October 27, 2025 (Consolidated Documentation)

---

## 📋 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Architecture Decision Record](#-architecture-decision-record)
3. [Technical Design Specification](#-technical-design-specification)
4. [Implementation Examples](#-implementation-examples)
5. [User Guide](#-user-guide)
6. [API Reference](#-api-reference)

---

## 🎯 Executive Summary

Domain/Routes Automation is Clodo's **core differentiator** - the ability to automatically generate Cloudflare Workers routing configuration from simple domain metadata. This feature enables multi-domain orchestration, eliminating manual wrangler.toml maintenance and reducing deployment errors.

### Problem Solved
Developers manually configure complex routing rules in wrangler.toml, leading to:
- Human error in route patterns
- Inconsistent subdomain-to-path mapping
- Difficult multi-environment management
- No validation of routing conflicts

### Solution
Automated generation of `[[routes]]` configuration from domain inputs, with configurable patterns, zone mapping, and edge-case handling.

### Key Benefits
- ⚡ **Zero Configuration**: No routing knowledge required
- 🛡️ **Error Prevention**: Automatic validation and conflict detection
- 🔄 **Multi-Environment**: Production, staging, development support
- 🌐 **Domain Agnostic**: Works with any domain structure
- 📈 **Scalable**: Handles complex routing scenarios automatically

---

## 📜 Architecture Decision Record

**Date**: October 24, 2025
**Status**: Accepted
**Authors**: Clodo Framework Team

### Context
Clodo Framework needs to automate Cloudflare Workers routing configuration to reduce manual errors and improve developer experience. The current manual process requires developers to understand Cloudflare routing patterns, manually map subdomains to path prefixes, handle environment-specific configurations, and maintain wrangler.toml files across services.

### Decision
Implement Domain/Routes Automation as a core feature with the following architecture:

#### Architecture Components
1. **RouteGenerator**: Main orchestrator for route generation
2. **DomainRouteMapper**: Business logic for domain-to-route mapping
3. **WranglerRoutesBuilder**: TOML syntax generation and formatting

#### Configuration Approach
- Externalize routing rules to `validation-config.json`
- Provide sensible defaults for common scenarios
- Allow customization for advanced use cases

#### Key Design Decisions
1. **Configuration-Driven**: All hardcoded assumptions moved to config
2. **Environment-Aware**: Different logic for production/staging/development
3. **Subdomain-First**: Most-specific routes generated first
4. **Workers.dev Aware**: Skip routing for development subdomains

### Consequences

#### Positive
- **Automated Reliability**: Eliminates manual routing errors
- **Consistency**: Standardized patterns across all services
- **Maintainability**: Single source of truth for routing rules
- **Flexibility**: Configurable for custom requirements
- **Developer Experience**: Zero routing configuration for standard cases

#### Negative
- **Learning Curve**: Developers need to understand automation behavior
- **Configuration Complexity**: Advanced cases require config file changes
- **Debugging**: Automated routes may be less obvious than manual ones

#### Risks
- **Over-Automation**: May not handle all edge cases
- **Configuration Drift**: Config file becomes critical dependency
- **Testing Complexity**: Automated routes harder to unit test

---

## 🏗️ Technical Design Specification

**Status**: Design Phase
**Last Updated**: October 24, 2025

### Core Requirements

#### Functional Requirements
1. **Automatic Route Generation**: Generate `[[routes]]` from domain name + environment
2. **Multi-Environment Support**: Production, staging, development with different patterns
3. **Zone Mapping**: Associate routes with correct Cloudflare zones
4. **Subdomain Handling**: Convert subdomains to path prefixes (api.example.com → /api/*)
5. **Workers.dev Detection**: Skip routes for workers.dev subdomains
6. **Configurable Patterns**: Allow customization of path prefixes and wildcards

#### Non-Functional Requirements
1. **Reliability**: No invalid route patterns generated
2. **Performance**: Sub-100ms generation for typical services
3. **Maintainability**: Clear separation of mapping logic and TOML generation
4. **Testability**: 95%+ code coverage with comprehensive edge cases

### Architecture Overview

```
Domain/Routes Automation Architecture
├── RouteGenerator (Main Orchestrator)
│   ├── DomainRouteMapper (Business Logic)
│   │   ├── Environment-specific mapping
│   │   ├── Subdomain-to-path conversion
│   │   └── Pattern validation
│   └── WranglerRoutesBuilder (TOML Generation)
│       ├── Route ordering
│       ├── Comment generation
│       └── Zone ID validation
├── Configuration Layer
│   ├── validation-config.json (Routing rules)
│   ├── Environment-specific overrides
│   └── Custom pattern definitions
└── Validation Layer
    ├── Route conflict detection
    ├── Pattern validation
    └── Zone ID verification
```

### Component Specifications

#### RouteGenerator
**Purpose**: Main orchestrator coordinating the entire route generation process

**Responsibilities**:
- Coordinate domain analysis and route generation
- Manage environment-specific logic
- Handle error aggregation and reporting
- Ensure thread-safety for concurrent operations

**Interface**:
```typescript
class RouteGenerator {
  generateRoutes(domainConfig: DomainConfig): RouteResult
  validateRoutes(routes: Route[]): ValidationResult
}
```

#### DomainRouteMapper
**Purpose**: Core business logic for converting domain inputs to routing rules

**Key Algorithms**:
1. **Subdomain Extraction**: Parse subdomain from full domain
2. **Path Prefix Generation**: Convert subdomain to URL path
3. **Environment Pattern Application**: Apply env-specific routing patterns
4. **Conflict Resolution**: Handle overlapping route patterns

**Mapping Rules**:
- `api.example.com` → `api.example.com/*` + `example.com/api/*`
- `staging-api.example.com` → `staging-api.example.com/*` + `example.com/staging-api/*`
- `dev-api.example.com` → Skip (workers.dev detection)

#### WranglerRoutesBuilder
**Purpose**: Generate properly formatted TOML syntax for wrangler.toml

**Features**:
- Proper TOML array syntax for `[[routes]]`
- Automatic comment generation
- Zone ID validation and formatting
- Route ordering (most-specific first)

### Configuration Schema

```json
{
  "routing": {
    "environments": {
      "production": {
        "generateSubdomainRoutes": true,
        "generateFallbackRoutes": true,
        "pathPrefix": "/"
      },
      "staging": {
        "generateSubdomainRoutes": true,
        "generateFallbackRoutes": false,
        "pathPrefix": "/staging"
      },
      "development": {
        "generateSubdomainRoutes": false,
        "generateFallbackRoutes": false,
        "skipWorkersDev": true
      }
    },
    "patterns": {
      "api": {
        "subdomainPattern": "{service}.example.com",
        "pathPattern": "/api/{version}"
      }
    }
  }
}
```

### Error Handling

#### Validation Errors
- **Invalid Domain**: Malformed domain names
- **Missing Zone ID**: No Cloudflare zone associated
- **Route Conflicts**: Overlapping patterns detected
- **Configuration Errors**: Invalid config file syntax

#### Recovery Strategies
- **Graceful Degradation**: Fall back to manual routes on failure
- **Partial Generation**: Generate valid routes, skip invalid ones
- **Detailed Logging**: Comprehensive error reporting for debugging

---

## 💡 Implementation Examples

**Purpose**: Provide concrete examples of routing configuration for different scenarios

### Example 1: Standard API Service

#### Input Context
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

#### Generated wrangler.toml
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

#### Explanation
- **Subdomain Route**: `api.example.com/*` handles direct subdomain traffic
- **Fallback Route**: `example.com/api/v1/*` provides path-based routing for root domain
- **Zone Association**: Both routes point to the same Cloudflare zone

### Example 2: Multi-Environment Service

#### Input Context
```javascript
{
  serviceName: 'user-service',
  environments: {
    production: { domain: 'api.example.com', zoneId: 'zone1' },
    staging: { domain: 'staging-api.example.com', zoneId: 'zone1' },
    development: { domain: 'dev-api.example.com', zoneId: 'zone2' }
  }
}
```

#### Generated wrangler.toml
```toml
# Production routes
[[routes]]
pattern = "api.example.com/*"
zone_id = "zone1"

[[routes]]
pattern = "example.com/api/*"
zone_id = "zone1"

# Staging routes
[[routes]]
pattern = "staging-api.example.com/*"
zone_id = "zone1"

# Development routes (workers.dev - no routes generated)
# Development environment uses workers.dev subdomains
```

### Example 3: Complex Multi-Domain Setup

#### Input Context
```javascript
{
  serviceName: 'multi-domain-api',
  domains: [
    { name: 'api.example.com', zoneId: 'zone1', primary: true },
    { name: 'api.example.org', zoneId: 'zone2', primary: false }
  ],
  environment: 'production'
}
```

#### Generated wrangler.toml
```toml
# Primary domain routes
[[routes]]
pattern = "api.example.com/*"
zone_id = "zone1"

[[routes]]
pattern = "example.com/api/*"
zone_id = "zone1"

# Secondary domain routes
[[routes]]
pattern = "api.example.org/*"
zone_id = "zone2"

[[routes]]
pattern = "example.org/api/*"
zone_id = "zone2"
```

### Example 4: Custom Path Prefixes

#### Configuration Override
```json
{
  "routing": {
    "customPrefixes": {
      "api.example.com": "/v2/api"
    }
  }
}
```

#### Generated wrangler.toml
```toml
# Custom prefix routes
[[routes]]
pattern = "api.example.com/*"
zone_id = "abc123..."

[[routes]]
pattern = "example.com/v2/api/*"
zone_id = "abc123..."
```

---

## 📖 User Guide

### Quick Start

#### Basic Usage
```bash
# Create a service with domain routing
npx clodo create-service my-api \
  --domain api.example.com \
  --type api-gateway
```

**Result**: `wrangler.toml` automatically includes:
```toml
# Production routes for api.example.com
[[routes]]
pattern = "api.example.com/*"
zone_id = "abc123..."

[[routes]]
pattern = "example.com/api/*"
zone_id = "abc123..."
```

### Advanced Configuration

#### Custom Routing Rules
Create `validation-config.json` in your project root:

```json
{
  "routing": {
    "rules": {
      "api.example.com": {
        "pathPrefix": "/api/v2",
        "additionalRoutes": [
          "example.com/graphql/*"
        ]
      }
    }
  }
}
```

#### Multi-Environment Setup
```javascript
// clodo-config.json
{
  "environments": {
    "production": {
      "domain": "api.example.com",
      "zoneId": "prod-zone-123"
    },
    "staging": {
      "domain": "staging-api.example.com",
      "zoneId": "staging-zone-456"
    }
  }
}
```

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

---

## 🔧 API Reference

### RouteGenerator Class

#### Constructor
```typescript
new RouteGenerator(config?: RouteGeneratorConfig)
```

#### Methods

##### generateRoutes(domainConfig: DomainConfig): RouteResult
Generates routing configuration from domain inputs.

**Parameters**:
- `domainConfig`: Domain configuration object

**Returns**:
- `RouteResult`: Generated routes and metadata

**Example**:
```typescript
const generator = new RouteGenerator();
const result = generator.generateRoutes({
  domainName: 'api.example.com',
  environment: 'production',
  zoneId: 'abc123...'
});
```

##### validateRoutes(routes: Route[]): ValidationResult
Validates generated routes for conflicts and correctness.

**Parameters**:
- `routes`: Array of route objects to validate

**Returns**:
- `ValidationResult`: Validation results with errors/warnings

### DomainRouteMapper Class

#### Methods

##### mapDomainToRoutes(domain: string, environment: string): RouteMapping
Converts domain and environment to routing rules.

##### extractSubdomain(domain: string): string
Extracts subdomain from full domain name.

##### generatePathPrefix(subdomain: string, environment: string): string
Generates URL path prefix from subdomain and environment.

### Configuration Types

#### DomainConfig
```typescript
interface DomainConfig {
  domainName: string;
  environment: 'production' | 'staging' | 'development';
  zoneId: string;
  customPrefix?: string;
  additionalRoutes?: string[];
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
}
```

---

## 📚 Additional Resources

- [Clodo Framework Overview](../overview.md)
- [Configuration Guide](../guides/CONFIGURATION.md)
- [Deployment Guide](../deployment/DEPLOYMENT.md)
- [Troubleshooting Guide](../guides/TROUBLESHOOTING.md)

---

**Document Version**: 1.0 | **Last Updated**: October 27, 2025 | **Consolidated from 4 source documents**</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\i-docs\architecture\DOMAIN_ROUTES_AUTOMATION.md