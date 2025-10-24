# ADR: Domain/Routes Automation Implementation

**Date**: October 24, 2025  
**Status**: Accepted  
**Authors**: Clodo Framework Team  

## Context

Clodo Framework needs to automate Cloudflare Workers routing configuration to reduce manual errors and improve developer experience. The current manual process requires developers to:

1. Understand Cloudflare routing patterns
2. Manually map subdomains to path prefixes
3. Handle environment-specific configurations
4. Maintain wrangler.toml files across services

This leads to:
- Inconsistent routing configurations
- Deployment failures from invalid patterns
- Maintenance overhead for multi-environment setups
- No validation of routing conflicts

## Decision

Implement Domain/Routes Automation as a core feature with the following architecture:

### Architecture Components
1. **RouteGenerator**: Main orchestrator for route generation
2. **DomainRouteMapper**: Business logic for domain-to-route mapping
3. **WranglerRoutesBuilder**: TOML syntax generation and formatting

### Configuration Approach
- Externalize routing rules to `validation-config.json`
- Provide sensible defaults for common scenarios
- Allow customization for advanced use cases

### Key Design Decisions
1. **Configuration-Driven**: All hardcoded assumptions moved to config
2. **Environment-Aware**: Different logic for production/staging/development
3. **Subdomain-First**: Most-specific routes generated first
4. **Workers.dev Aware**: Skip routing for development subdomains

## Consequences

### Positive
- **Automated Reliability**: Eliminates manual routing errors
- **Consistency**: Standardized patterns across all services
- **Maintainability**: Single source of truth for routing rules
- **Flexibility**: Configurable for custom requirements
- **Developer Experience**: Zero routing configuration for standard cases

### Negative
- **Configuration Complexity**: New config section to maintain
- **Learning Curve**: Developers need to understand routing concepts
- **Backward Compatibility**: Existing manual configs may need migration

### Risks
- **TOML Generation**: Risk of invalid syntax (mitigated by validation)
- **Performance**: Complex domain parsing (mitigated by caching)
- **Scope**: Feature creep into advanced routing (bounded by acceptance criteria)

## Implementation Details

### Configuration Structure
```json
{
  "routing": {
    "defaults": { "includeComments": true, "includeZoneId": true },
    "pathPrefixes": { "production": "/api", "staging": "/staging-api" },
    "domains": { "skipPatterns": ["workers.dev"] }
  }
}
```

### API Contract
```javascript
const routes = await engine.generateRoutes({
  coreInputs: { domainName, environment, cloudflareZoneId },
  confirmedValues: { apiBasePath, productionUrl }
});
```

### Validation Rules
- Zone IDs must match `/^[a-f0-9]{32}$/`
- Domains must be valid hostname format
- No duplicate patterns generated
- TOML syntax always valid

## Alternatives Considered

### Alternative 1: Template-Based Generation
- **Pros**: Simple, familiar templating approach
- **Cons**: Limited flexibility, hard to validate, error-prone
- **Decision**: Rejected - too rigid for complex routing logic

### Alternative 2: Cloudflare API Integration
- **Pros**: Real-time validation, automatic zone detection
- **Cons**: API dependencies, rate limits, complexity
- **Decision**: Deferred - implement basic version first, add API integration later

### Alternative 3: No Automation
- **Pros**: No implementation cost, full control
- **Cons**: Manual errors, maintenance burden, poor DX
- **Decision**: Rejected - core differentiator for Clodo

## Compliance

This decision aligns with:
- **Clodo's positioning** as automated Cloudflare Workers framework
- **Developer experience goals** of zero-configuration deployment
- **Reliability requirements** for production deployments
- **Maintainability standards** for long-term codebase health

## References

- [Domain/Routes Automation Design](./DOMAIN_ROUTES_AUTOMATION_DESIGN.md)
- [Routing Configuration Assessment](./ROUTING_CONFIGURATION_ASSESSMENT.md)
- [GenerationEngine Refactoring](./GENERATION_ENGINE_REFACTORING_ANALYSIS.md)</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework\docs\ADR_DOMAIN_ROUTES_AUTOMATION.md