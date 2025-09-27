# Lego Framework

A reusable framework for building Lego-style software architecture on Cloudflare Workers + D1. This framework enables rapid development of domain-specific services while maintaining consistency and reusability across your entire ecosystem.

## Philosophy

Just like Lego bricks snap together to build anything you can imagine, this framework provides the base components that your services snap into. Focus on your business logic while the framework handles the infrastructure, configuration, and deployment patterns.

## Features

- **Domain Configuration System**: Centralized configuration management with validation
- **Feature Flag System**: Runtime feature toggling per domain
- **Worker Integration**: Consistent service initialization and feature guards
- **Deployment Automation**: One-command deployment across environments
- **Interactive Setup**: Guided service creation and configuration
- **Service Templates**: Pre-built templates for common service patterns

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