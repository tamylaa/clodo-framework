# Lego Framework Documentation

> A comprehensive framework for building Lego-style microservices on Cloudflare Workers + D1

## 📚 Documentation Structure

### **Getting Started**
- **[Overview](./overview.md)** - Framework philosophy and core concepts
- **[Quick Start Guide](./guides/getting-started.md)** - Build your first service in 5 minutes
- **[Installation](./guides/installation.md)** - Setup and prerequisites

### **Architecture**
- **[Framework Architecture](./architecture/README.md)** - High-level architecture overview
- **[Core Components](./architecture/components.md)** - Deep dive into framework modules
- **[Configuration System](./architecture/configuration.md)** - Domain and feature management
- **[Data Layer](./architecture/data-layer.md)** - Services, schemas, and database integration
- **[Worker Integration](./architecture/worker-integration.md)** - Cloudflare Workers patterns

### **Guides**
- **[Creating Services](./guides/creating-services.md)** - Service generation and templates
- **[Domain Configuration](./guides/domain-configuration.md)** - Multi-tenant setup
- **[Feature Management](./guides/feature-flags.md)** - Feature flags and runtime control
- **[Authentication](./guides/authentication.md)** - Security patterns and implementation
- **[Database Operations](./guides/database-operations.md)** - CRUD patterns and data modeling

### **Deployment**
- **[Environment Setup](./deployment/environment-setup.md)** - Cloudflare and local development
- **[Deployment Guide](./deployment/deployment-guide.md)** - Production deployment strategies
- **[CI/CD Integration](./deployment/ci-cd.md)** - Automated deployment pipelines
- **[Monitoring](./deployment/monitoring.md)** - Observability and debugging

### **API Reference**
- **[Core Classes](./api/core-classes.md)** - Framework class references
- **[Configuration API](./api/configuration.md)** - Domain and feature APIs
- **[Service API](./api/services.md)** - Data service interfaces
- **[Worker Helpers](./api/worker-helpers.md)** - Cloudflare Worker utilities
- **[CLI Tools](./api/cli-tools.md)** - Command-line interface documentation

### **Examples**
- **[Basic CRUD Service](./examples/basic-crud.md)** - Simple data service example
- **[Multi-Tenant SaaS](./examples/multi-tenant-saas.md)** - Complex multi-domain setup
- **[Authentication Service](./examples/auth-service.md)** - JWT-based authentication
- **[API Gateway](./examples/api-gateway.md)** - Service orchestration patterns

### **Decision Framework**
- **[When to Use](./decision-framework.md)** - Use cases and anti-patterns
- **[Alternatives](./alternatives.md)** - Other approaches and trade-offs
- **[Migration Guide](./migration-guide.md)** - Moving to/from the framework

## 🚀 Quick Navigation

| I want to... | Go to |
|--------------|--------|
| **Understand the framework** | [Overview](./overview.md) |
| **Build my first service** | [Getting Started](./guides/getting-started.md) |
| **Configure domains** | [Domain Configuration](./guides/domain-configuration.md) |
| **Deploy to production** | [Deployment Guide](./deployment/deployment-guide.md) |
| **Find API documentation** | [API Reference](./api/README.md) |
| **See real examples** | [Examples](./examples/README.md) |
| **Decide if this is right for me** | [Decision Framework](./decision-framework.md) |

## 🆘 Getting Help

- **Documentation Issues**: Open an issue in the repository
- **Framework Bugs**: Report via GitHub Issues
- **Questions**: Check existing issues or create a new discussion
- **Contributing**: See [Contributing Guide](../CONTRIBUTING.md)

## 🔗 External Resources

- **[Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)**
- **[D1 Database Documentation](https://developers.cloudflare.com/d1/)**
- **[Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)**

---

**Framework Version**: 1.0.0  
**Last Updated**: September 27, 2025  
**Cloudflare Workers Runtime**: Compatible with 2023-05-18 and later