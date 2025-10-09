# {{SERVICE_DISPLAY_NAME}}

A Lego Framework {{SERVICE_TYPE}} service generated on {{CURRENT_DATE}}.

## Overview

This service was created using the Lego Framework template generator. It includes:

- Domain configuration management
- Feature flag system
- Automated deployment scripts
- Consistent service architecture
- Cloudflare Workers + D1 integration

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your service:**
   ```bash
   npm run setup
   ```
   This will guide you through:
   - Domain configuration
   - Cloudflare account setup
   - Feature flag configuration

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Deploy to production:**
   ```bash
   npm run deploy -- --Environment production
   ```

## Project Structure

```
src/
├── config/
│   ├── domains.js     # Domain and feature configuration
│   └── features.js    # Service-specific feature definitions
├── worker/
│   └── index.js       # Cloudflare Worker entry point
├── routes/            # Route handlers
├── services/          # Business logic
└── utils/             # Utility functions

scripts/               # Deployment and setup scripts
tests/                 # Test files
migrations/            # Database migrations
docs/                  # Documentation
```

## Configuration

### Domain Configuration (`src/config/domains.js`)

Configure your Cloudflare account, domains, and feature flags:

```javascript
export const domains = {
  'your-domain': {
    name: 'your-domain',
    accountId: 'your-cloudflare-account-id',
    zoneId: 'your-zone-id',
    domains: {
      production: 'api.yourdomain.com',
      staging: 'staging-api.yourdomain.com'
    },
    features: {
      // Enable/disable features
      logging: true,
      monitoring: true
    }
  }
};
```

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
DOMAIN_NAME=your-domain
ENVIRONMENT=development
```

## Development

### Available Scripts

- `npm test` - Run test suite
- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run setup` - Interactive setup wizard
- `npm run lint` - Lint code
- `npm run format` - Format code

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/worker.test.js
```

### Local Development

```bash
# Start local development server
npm run dev

# Access your service at:
# http://localhost:8787
```

## Deployment

### Staging Deployment

```bash
npm run deploy -- --Environment staging
```

### Production Deployment

```bash
npm run deploy -- --Environment production
```

### Custom Deployment

```bash
# Deploy with custom domain
npm run deploy -- --DomainName your-custom-domain --Environment production

# Dry run (see what would be deployed)
npm run deploy -- --DryRun
```

## Features

This service includes these Lego Framework features:

- **Domain Configuration**: Centralized configuration management
- **Feature Flags**: Runtime feature toggling
- **Worker Integration**: Consistent service initialization
- **Deployment Automation**: One-command deployment
- **Health Checks**: Built-in service monitoring
- **Error Handling**: Comprehensive error management

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status and configuration information.

**Response:**
```json
{
  "status": "healthy",
  "service": "{{SERVICE_NAME}}",
  "version": "1.0.0",
  "features": ["logging", "monitoring"],
  "domain": "your-domain",
  "environment": "development"
}
```

## Lego Framework

This service is built on the Lego Framework v{{FRAMEWORK_VERSION}}. The framework provides:

- **Reusable Components**: Pre-built utilities and patterns
- **Consistent Architecture**: Standardized service structure
- **Automated Deployment**: One-command deployment to any environment
- **Feature Management**: Runtime feature toggling
- **Cross-Service Communication**: Service registry and communication patterns

Learn more: [Clodo Framework Documentation](../../packages/clodo-framework/README.md)

## Contributing

1. Follow the established code patterns
2. Add tests for new features
3. Update documentation as needed
4. Use the Lego Framework utilities

## License

MIT License - see LICENSE file for details