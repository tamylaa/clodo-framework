# Lego Framework

A reusable framework for building Lego-style software architecture on Cloudflare Workers + D1. This framework enables rapid development of domain-specific services while maintaining consistency and reusability across your entire ecosystem.

## Philosophy

Just like Lego bricks snap together to build anything you can imagine, this framework provides the base components that your services snap into. Focus on your business logic while the framework handles the infrastructure, configuration, and deployment patterns.

## Features

- **Domain Configuration System**: Centralized configuration management with validation
- **Feature Flag System**: Runtime feature toggling per domain
- **Worker Integration**: Consistent service initialization and feature guards
- **Enterprise Deployment & Orchestration**: Advanced multi-domain deployment with rollback, validation, and monitoring
- **Database Orchestration**: Multi-environment database management and migrations
- **Domain Discovery**: Runtime domain configuration discovery and management
- **Deployment Automation**: One-command deployment across environments
- **Interactive Setup**: Guided service creation and configuration
- **Service Templates**: Pre-built templates for common service patterns

## Enterprise Deployment & Orchestration

The Lego Framework now includes comprehensive enterprise-grade deployment and orchestration capabilities, extracted from production systems and made reusable across all services.

### Orchestration Modules

```javascript
import { MultiDomainOrchestrator, CrossDomainCoordinator } from '@tamyla/lego-framework/orchestration';

// Multi-domain deployment orchestration
const orchestrator = new MultiDomainOrchestrator({
  domains: ['api', 'auth', 'data'],
  environment: 'production',
  parallelDeployments: 3
});

// Cross-domain coordination for complex deployments
const coordinator = new CrossDomainCoordinator({
  portfolioName: 'enterprise-suite',
  maxConcurrentDeployments: 5,
  enableDependencyResolution: true
});
```

### Deployment Management

```javascript
import { DeploymentValidator, RollbackManager, ProductionTester, DeploymentAuditor } from '@tamyla/lego-framework/deployment';

// Pre-deployment validation
const validator = new DeploymentValidator();
await validator.validateDeployment(deploymentConfig);

// Production testing suite
const tester = new ProductionTester();
await tester.runProductionTests(deploymentId);

// Rollback management
const rollback = new RollbackManager();
await rollback.createRollbackPoint(deploymentId);

// Comprehensive audit logging
const auditor = new DeploymentAuditor();
auditor.logDeployment(deploymentId, 'started', { domains: ['api', 'auth'] });
```

### Database Orchestration

```javascript
import { DatabaseOrchestrator } from '@tamyla/lego-framework/database';

// Multi-environment database management
const dbOrchestrator = new DatabaseOrchestrator({
  projectRoot: './',
  dryRun: false
});

// Run migrations across environments
await dbOrchestrator.runMigrations('production');
await dbOrchestrator.createBackup('production');
```

### Domain Discovery

```javascript
import { DomainDiscovery } from '@tamyla/lego-framework/config/discovery';

// Runtime domain discovery and configuration
const discovery = new DomainDiscovery({
  apiToken: process.env.CLOUDFLARE_API_TOKEN
});

// Discover and cache domain configurations
await discovery.discoverDomains();
const config = await discovery.getDomainConfig('my-domain');
```

### Deployment Utilities

```javascript
import { EnhancedSecretManager, ConfigurationCacheManager, askUser, askYesNo } from '@tamyla/lego-framework/utils/deployment';

// Advanced secret management
const secretManager = new EnhancedSecretManager();
await secretManager.generateSecrets(['database', 'api-keys']);

// Configuration caching
const cache = new ConfigurationCacheManager();
await cache.cacheConfiguration(deploymentId, config);

// Interactive prompts for deployment scripts
const environment = await askChoice('Select environment:', ['staging', 'production']);
const confirmed = await askYesNo('Deploy to production?');
```

## Enterprise CLI Tools

The Lego Framework now includes powerful command-line tools for enterprise deployment and portfolio management.

### Installation

```bash
npm install -g @tamyla/lego-framework
# or
npx @tamyla/lego-framework --help
```

### Available CLI Tools

#### `lego-deploy` - Enterprise Deployment CLI
Advanced deployment system with multi-domain orchestration, validation, and rollback capabilities.

```bash
# Deploy a single domain
npx lego-deploy deploy my-domain --environment production

# Deploy multiple domains with coordination
npx lego-deploy deploy-multi api auth data --parallel

# Validate deployment readiness
npx lego-deploy validate my-domain

# Run production tests
npx lego-deploy test my-domain

# Rollback deployment
npx lego-deploy rollback my-domain
```

#### `lego-master-deploy` - Master Deployment Orchestrator
Comprehensive deployment orchestrator with enterprise features and portfolio management.

```bash
# Deploy with full orchestration
npx lego-master-deploy orchestrate --domains api,auth,data

# Run pre-deployment validation
npx lego-master-deploy validate --portfolio

# Monitor deployment progress
npx lego-master-deploy monitor
```

#### `lego-portfolio` - Portfolio Management CLI
Multi-domain portfolio operations with bulk management and analytics.

```bash
# Initialize portfolio
npx lego-portfolio init --portfolio-name my-enterprise

# Discover all domains
npx lego-portfolio discover

# Deploy entire portfolio
npx lego-portfolio deploy

# Get portfolio health status
npx lego-portfolio health

# Generate portfolio analytics
npx lego-portfolio analytics
```

#### `lego-db` - Database Management CLI
Enterprise database operations across multiple environments.

```bash
# Run migrations for domain
npx lego-db migrate my-domain --environment production

# Synchronize schemas across portfolio
npx lego-db sync --portfolio

# Create backups
npx lego-db backup my-domain
```

#### `lego-secrets` - Secret Generation Utility
Cryptographically secure secret generation for production deployments.

```bash
# Generate secrets for domain
npx lego-secrets --domain my-domain --environment production

# Generate specific secret types
npx lego-secrets --types database,api-keys,jwt --persist
```

## Quick Start

### Install the Framework

```bash
npm install @tamyla/lego-framework
```

### Create a New Service

```bash
npx create-lego-service my-new-service --type data-service
```

### Basic Usage

```javascript
import { initializeService, createFeatureGuard, FeatureFlagManager } from '@tamyla/lego-framework';

export default {
  async fetch(request, env, ctx) {
    // Initialize service with domain context
    const service = initializeService(env);

    // Feature-guarded endpoints
    if (request.url.includes('/premium')) {
      return createFeatureGuard('premiumFeatures')(
        handlePremiumRequest
      )(request, env, ctx);
    }

    return handleRequest(request, env, ctx);
  }
};
```

## Architecture

### Core Components

1. **Domain Configuration**: JSON-based configuration with validation
2. **Feature Flags**: Runtime feature management
3. **Worker Integration**: Service initialization helpers
4. **Deployment Framework**: Automated deployment scripts
5. **Service Registry**: Cross-service communication

### Service Structure

```
services/my-service/
├── src/
│   ├── config/
│   │   ├── domains.js      # Service-specific domain configs
│   │   └── features.js     # Service feature definitions
│   ├── worker/
│   │   └── index.js        # Main worker handler
│   └── routes/
├── scripts/
│   ├── deploy.ps1          # Deployment script
│   └── setup.ps1           # Setup script
├── package.json
└── wrangler.toml
```

## Configuration

### Domain Configuration

```javascript
// config/domains.js
import { createDomainConfigSchema } from '@tamyla/lego-framework';

export const domains = {
  'my-domain': {
    ...createDomainConfigSchema(),
    name: 'my-domain',
    displayName: 'My Domain',
    accountId: 'your-cloudflare-account-id',
    zoneId: 'your-zone-id',
    domains: {
      production: 'api.myapp.com',
      staging: 'staging-api.myapp.com'
    },
    features: {
      premiumFeatures: true,
      analytics: false
    }
  }
};
```

### Feature Definitions

```javascript
// config/features.js
export const FEATURES = {
  PREMIUM_FEATURES: 'premiumFeatures',
  ANALYTICS: 'analytics',
  FILE_STORAGE: 'fileStorage'
};
```

## Deployment

### Automated Deployment

```powershell
# Deploy to staging
.\scripts\deploy.ps1 -DomainName my-domain -Environment staging

# Deploy to production
.\scripts\deploy.ps1 -DomainName my-domain -Environment production
```

### Interactive Setup

```powershell
# Run interactive setup
.\scripts\setup.ps1
```

## Development

### Building the Framework

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions and support, please open an issue on GitHub or contact the maintainers.