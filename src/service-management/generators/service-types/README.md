# Service Type Generators

Service-type specific generators that implement the Strategy Pattern.

## Base Class

**BaseServiceTypeGenerator** - Abstract base class for service-type specific generation logic.

Provides hooks for:
- `generateHandlers()` - Service-specific request handlers
- `generateSchemas()` - Service-specific data schemas
- `generateMiddleware()` - Service-specific middleware
- `generateDocs()` - Service-specific documentation

## Service Type Generators

Each service type has its own generator class:

- **DataServiceGenerator** - For data services (database operations, CRUD APIs)
- **AuthServiceGenerator** - For authentication services (JWT, OAuth, session management)
- **ContentServiceGenerator** - For content management services (CMS, media handling)
- **ApiGatewayServiceGenerator** - For API gateway services (routing, aggregation)
- **GenericServiceGenerator** - For generic/custom services (default fallback)
- **StaticSiteGenerator** - *(Future)* For static website hosting with Workers Sites

## Priority

**P0 priority** for infrastructure (BaseServiceTypeGenerator)  
**P1-P2 priority** for individual service-type generators

## Status

- [ ] BaseServiceTypeGenerator (REFACTOR-24)
- [ ] DataServiceGenerator (REFACTOR-25)
- [ ] AuthServiceGenerator (REFACTOR-25)
- [ ] ContentServiceGenerator (REFACTOR-25)
- [ ] ApiGatewayServiceGenerator (REFACTOR-25)
- [ ] GenericServiceGenerator (REFACTOR-25)
- [ ] StaticSiteGenerator *(Future - after REFACTOR-9 complete)*

## Architecture Note

This directory implements the **Strategy Pattern** to eliminate the large switch-case statements in GenerationEngine. Each service type is now an independent, testable class that can be extended without modifying core framework code.

## Integration with Core Generators

Service-type generators work in conjunction with core generators:
- Core generators (PackageJson, WranglerToml, etc.) provide base functionality
- Service-type generators customize the output for specific service types
- GeneratorRegistry orchestrates execution order and dependencies
