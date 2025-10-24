# Domain/Routes Automation - Design Specification

**Date**: October 24, 2025  
**Status**: Design Phase  
**Authors**: Clodo Framework Team  

## Executive Summary

Domain/Routes Automation is Clodo's **core differentiator** - the ability to automatically generate Cloudflare Workers routing configuration from simple domain metadata. This feature enables multi-domain orchestration, eliminating manual wrangler.toml maintenance and reducing deployment errors.

**Problem**: Developers manually configure complex routing rules in wrangler.toml, leading to:
- Human error in route patterns
- Inconsistent subdomain-to-path mapping
- Difficult multi-environment management
- No validation of routing conflicts

**Solution**: Automated generation of `[[routes]]` configuration from domain inputs, with configurable patterns, zone mapping, and edge-case handling.

---

## 🎯 **Core Requirements**

### Functional Requirements
1. **Automatic Route Generation**: Generate `[[routes]]` from domain name + environment
2. **Multi-Environment Support**: Production, staging, development with different patterns
3. **Zone Mapping**: Associate routes with correct Cloudflare zones
4. **Subdomain Handling**: Convert subdomains to path prefixes (api.example.com → /api/*)
5. **Workers.dev Detection**: Skip routes for workers.dev subdomains
6. **Configurable Patterns**: Allow customization of path prefixes and wildcards

### Non-Functional Requirements
1. **Reliability**: No invalid route patterns generated
2. **Performance**: Sub-100ms generation for typical services
3. **Maintainability**: Clear separation of mapping logic and TOML generation
4. **Testability**: 95%+ code coverage with comprehensive edge cases

---

## 🏗️ **Architecture Overview**

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
│       └── TOML escaping
└── Configuration (validation-config.json)
    ├── Path prefixes per environment
    ├── Skip patterns
    └── Validation rules
```

### Key Components

#### RouteGenerator
- **Purpose**: Main entry point for route generation
- **Inputs**: Core inputs (domain, environment) + confirmed values
- **Outputs**: TOML `[[routes]]` configuration string
- **Responsibilities**:
  - Coordinate domain mapping and TOML building
  - Load configuration from validation-config.json
  - Handle environment-specific logic

#### DomainRouteMapper
- **Purpose**: Map domains to route patterns
- **Logic**:
  - Detect subdomain vs root domain
  - Apply environment-specific path prefixes
  - Generate wildcard patterns
  - Skip workers.dev domains

#### WranglerRoutesBuilder
- **Purpose**: Generate valid wrangler.toml syntax
- **Features**:
  - Environment-specific TOML sections
  - Comment generation for readability
  - Pattern ordering (most-specific first)
  - TOML string escaping

---

## 🔧 **API Design**

### GenerationEngine Integration

```javascript
// Existing API - no changes needed
const engine = new GenerationEngine();

// Generate routes for wrangler.toml
const routesToml = await engine.generateRoutes(context);

// Context structure
const context = {
  coreInputs: {
    serviceName: 'my-service',
    domainName: 'api.example.com',
    cloudflareZoneId: 'abc123...',
    environment: 'production'
  },
  confirmedValues: {
    productionUrl: 'https://api.example.com',
    stagingUrl: 'https://staging-api.example.com',
    developmentUrl: 'https://dev-api.example.com',
    apiBasePath: '/api/v1'
  }
};
```

### RouteGenerator Direct Usage

```javascript
const generator = new RouteGenerator();

// Generate routes
const routes = await generator.generate(context);

// Returns TOML string like:
// [[routes]]
// pattern = "api.example.com/*"
// zone_id = "abc123..."
//
// [[routes]]
// pattern = "example.com/api/v1/*"
// zone_id = "abc123..."
```

---

## ⚙️ **Configuration Design**

### validation-config.json Structure

```json
{
  "routing": {
    "defaults": {
      "includeComments": true,
      "includeZoneId": true,
      "targetEnvironment": "all",
      "orderStrategy": "most-specific-first"
    },
    
    "pathPrefixes": {
      "production": "/api",
      "staging": "/staging-api", 
      "development": "/dev-api",
      "fallback": "/api"
    },
    
    "patterns": {
      "wildcard": "/*",
      "allowedPatterns": ["/*", "/api/*", "/v1/*"],
      "maxPatterns": 10
    },
    
    "domains": {
      "skipPatterns": ["workers.dev"],
      "complexTLDs": [".co.uk", ".com.au", ".org.uk"],
      "subdomainMinParts": 3,
      "ignoreSubdomains": ["www", "mail"]
    },
    
    "environments": {
      "names": ["production", "staging", "development"],
      "nestingRules": {
        "production": false,
        "staging": true,
        "development": true
      }
    },
    
    "validation": {
      "zoneIdPattern": "^[a-f0-9]{32}$",
      "domainPattern": "^[a-z0-9.-]+$",
      "strictMode": true
    },
    
    "comments": {
      "enabled": true,
      "templates": {
        "production": "# Production routes for {{domain}}",
        "staging": "# Staging routes for {{domain}}", 
        "development": "# Development routes - workers.dev: https://{{workerName}}-dev.{{account}}.workers.dev"
      }
    },
    
    "toml": {
      "escaping": "standard",
      "sectionPrefix": {
        "production": "",
        "staging": "env.staging.",
        "development": "env.development."
      }
    }
  }
}
```

### Configuration Loading

```javascript
// framework-config.js integration
export function getRoutingConfig() {
  return config.routing || {
    defaults: { includeComments: true, includeZoneId: true },
    pathPrefixes: { production: '/api', staging: '/staging-api', development: '/dev-api' },
    domains: { skipPatterns: ['workers.dev'] },
    // ... defaults
  };
}
```

---

## 📋 **Example Configurations**

### Example 1: Standard API Service

**Input**:
```javascript
{
  domainName: 'api.example.com',
  environment: 'production',
  cloudflareZoneId: 'abc123def456...',
  apiBasePath: '/api/v1'
}
```

**Generated wrangler.toml**:
```toml
# Production routes for api.example.com
[[routes]]
pattern = "api.example.com/*"
zone_id = "abc123def456..."

# Fallback routes for example.com
[[routes]]
pattern = "example.com/api/v1/*"
zone_id = "abc123def456..."
```

### Example 2: Multi-Environment with Custom Paths

**Configuration**:
```json
{
  "routing": {
    "pathPrefixes": {
      "production": "/api/v2",
      "staging": "/staging", 
      "development": "/dev"
    }
  }
}
```

**Input**:
```javascript
{
  domainName: 'my-service.example.com',
  environment: 'staging',
  cloudflareZoneId: 'def789ghi012...'
}
```

**Generated wrangler.toml**:
```toml
# Staging environment routes
# Domain: my-service.example.com
[env.staging]

  [[env.staging.routes]]
  pattern = "my-service.example.com/*"
  zone_id = "def789ghi012..."

  [[env.staging.routes]]
  pattern = "example.com/staging/*"
  zone_id = "def789ghi012..."
```

### Example 3: Workers.dev Development

**Input**:
```javascript
{
  domainName: 'my-service-abc123.workers.dev',
  environment: 'development'
}
```

**Generated wrangler.toml**:
```toml
# Development environment
# Uses workers.dev subdomain: https://my-service-dev.abc123.workers.dev
# No routes needed for workers.dev subdomains
```

---

## ✅ **Acceptance Criteria**

### Functional Acceptance Criteria
- [ ] Generate valid `[[routes]]` for api.example.com → `api.example.com/*` + `example.com/api/*`
- [ ] Skip routes for *.workers.dev domains
- [ ] Support custom path prefixes per environment
- [ ] Handle complex TLDs (.co.uk, .com.au)
- [ ] Generate environment-specific TOML sections
- [ ] Include helpful comments in generated config
- [ ] Validate zone IDs and domain formats
- [ ] Support subdomain-to-path conversion
- [ ] Allow configuration of wildcard patterns
- [ ] Generate routes for all 3 environments simultaneously

### Quality Acceptance Criteria
- [ ] 95%+ test coverage for routing logic
- [ ] Sub-100ms generation performance
- [ ] No invalid TOML syntax generated
- [ ] Clear error messages for invalid inputs
- [ ] Comprehensive documentation with examples
- [ ] Backward compatibility with existing configs

### Integration Acceptance Criteria
- [ ] GenerationEngine.generateRoutes() works end-to-end
- [ ] CLI service creation includes routes
- [ ] wrangler.toml validation passes
- [ ] Multi-service domain conflicts detected
- [ ] Configuration reloads without restart

---

## 🧪 **Test Plan Outline**

### Unit Tests (~30 tests)
- DomainRouteMapper subdomain detection
- Path prefix application per environment
- Workers.dev skip logic
- Complex TLD handling
- Route pattern generation
- Zone ID validation

### Integration Tests (~14 tests)
- End-to-end route generation
- TOML syntax validation
- Multi-environment output
- Configuration loading
- Error handling
- Performance benchmarks

**Total**: ~44 tests targeting 95% coverage

---

## 📚 **Implementation Plan**

### Phase 1: Core Implementation (Week 1)
1. Implement DomainRouteMapper with basic logic
2. Create WranglerRoutesBuilder for TOML generation
3. Add RouteGenerator orchestrator
4. Basic configuration loading

### Phase 2: Advanced Features (Week 2)
1. Complex TLD support
2. Custom path prefixes
3. Environment-specific sections
4. Comment templates

### Phase 3: Polish & Testing (Week 3)
1. Comprehensive test suite
2. Performance optimization
3. Error handling improvements
4. Documentation completion

### Phase 4: Integration (Week 4)
1. GenerationEngine integration
2. CLI workflow updates
3. Dogfooding on clodo.dev
4. Production deployment

---

## 🔍 **Risks & Mitigations**

### Technical Risks
- **TOML Generation Errors**: Mitigated by comprehensive validation and escaping
- **Performance Issues**: Mitigated by efficient algorithms and caching
- **Configuration Complexity**: Mitigated by sensible defaults and clear documentation

### Business Risks
- **Scope Creep**: Mitigated by phased implementation and clear acceptance criteria
- **Backward Compatibility**: Mitigated by maintaining existing API contracts
- **User Adoption**: Mitigated by clear positioning as core differentiator

---

## 📈 **Success Metrics**

- **Adoption**: 100% of generated services use automated routing
- **Reliability**: Zero routing-related deployment failures
- **Performance**: <100ms route generation
- **Maintainability**: <5% of codebase changes affect routing logic
- **User Satisfaction**: Positive feedback in developer surveys

---

## 📝 **Open Questions**

1. Should we support custom route patterns beyond wildcards?
2. How to handle route conflicts between services?
3. Whether to add route validation against existing Cloudflare zones?
4. How to support IPv6 or non-HTTP routes?
5. Whether to integrate with Cloudflare API for zone validation?

---

## 📋 **Next Steps**

1. ✅ Complete this design specification
2. ⏳ Create ADR for configuration structure approval
3. ⏳ Implement core RouteGenerator components
4. ⏳ Add comprehensive test suite
5. ⏳ Integrate with GenerationEngine
6. ⏳ Update CLI and documentation

**Status**: Design Complete - Ready for Implementation</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\docs\DOMAIN_ROUTES_AUTOMATION_DESIGN.md