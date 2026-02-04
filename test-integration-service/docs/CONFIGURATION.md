# Test Integration Service - Configuration Guide

## Overview

Test Integration Service is configured using multiple layers of configuration files and environment variables.

## Configuration Hierarchy

1. **Environment Variables** (.env) - Runtime secrets and environment-specific values
2. **Service Configuration** (src/config/domains.js) - Service-specific settings
3. **Worker Configuration** (wrangler.toml) - Cloudflare Workers deployment settings
4. **Package Configuration** (package.json) - Node.js package settings

## Environment Variables

### Required Variables

```bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=undefined
CLOUDFLARE_ZONE_ID=undefined
CLOUDFLARE_API_TOKEN=your_api_token

# Service Configuration
SERVICE_NAME=test-integration-service
SERVICE_TYPE=api-service
DOMAIN_NAME=test.clodo.dev
ENVIRONMENT=development
```

### Optional Variables

```bash
# URLs (override defaults)
PRODUCTION_URL=https://test-integration-service.test.clodo.dev
STAGING_URL=https://test-integration-service-sta.test.clodo.dev
DEVELOPMENT_URL=https://test-integration-service-dev.test.clodo.dev
DOCUMENTATION_URL=https://docs.test.clodo.dev

# API Configuration
API_BASE_PATH=/api/v1/test/integration-service
HEALTH_CHECK_PATH=/health

# Database
DATABASE_NAME=test-integration-service-db

# Logging and Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
ERROR_REPORTING_ENABLED=true

# Custom Variables
CUSTOM_VAR=value
```

## Service Configuration (domains.js)

Located at `src/config/domains.js`, this file contains service-specific configuration:

```javascript
export const domains = {
  'test-integration-service': {
    name: 'test-integration-service',
    displayName: 'Test Integration Service',
    description: 'A Clodo Framework service providing core functionality and extensibility',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    domains: {
      production: 'https://test-integration-service.test.clodo.dev',
      staging: 'https://test-integration-service-sta.test.clodo.dev',
      development: 'https://test-integration-service-dev.test.clodo.dev'
    },
    services: [
      'test-integration-service'
    ],
    databases: [
      {
        name: 'test-integration-service-db',
        type: 'd1',
        binding: 'DB'
      }
    ],
    features: {
    "logging": true,
    "monitoring": true,
    "errorReporting": true,
    "metrics": true,
    "healthChecks": true,
    "extensibility": true,
    "configuration": true,
    "deployment": true,
    "d1": true
},
    metadata: {
      version: '1.0.0',
      author: 'Clodo Framework',
      generatedAt: '2026-02-04T03:54:13.698Z',
      frameworkVersion: '3.0.0',
      serviceType: 'api-service',
      environment: 'development'
    }
  }
};
```

## Worker Configuration (wrangler.toml)

Cloudflare Workers configuration with environment-specific settings:

```toml
name = "test-integration-service-worker"
main = "src/worker/index.js"
compatibility_date = "2026-02-04"
compatibility_flags = ["nodejs_compat"]

# Environment configurations
[env.development]
name = "test-integration-service-worker-dev"

[env.staging]
name = "test-integration-service-worker-staging"

[env.production]
name = "test-integration-service-worker"

# Database bindings
[[d1_databases]]
binding = "DB"
database_name = "test-integration-service-db"

# Environment variables
[vars]
SERVICE_NAME = "test-integration-service"
SERVICE_TYPE = "api-service"
DOMAIN_NAME = "test.clodo.dev"
ENVIRONMENT = "development"
API_BASE_PATH = "/api/v1/test/integration-service"
HEALTH_CHECK_PATH = "/health"

# Domain-specific variables
PRODUCTION_URL = "https://test-integration-service.test.clodo.dev"
STAGING_URL = "https://test-integration-service-sta.test.clodo.dev"
DEVELOPMENT_URL = "https://test-integration-service-dev.test.clodo.dev"

# Feature flags
FEATURE_LOGGING = true
FEATURE_MONITORING = true
FEATURE_ERRORREPORTING = true
FEATURE_METRICS = true
FEATURE_HEALTHCHECKS = true
FEATURE_EXTENSIBILITY = true
FEATURE_CONFIGURATION = true
FEATURE_DEPLOYMENT = true
FEATURE_D1 = true

# Custom environment variables (configure as needed)
# CUSTOM_VAR = "value"
```

## Feature Flags

The service supports the following feature flags:

- **logging**: ✅ Enabled
- **monitoring**: ✅ Enabled
- **errorReporting**: ✅ Enabled
- **metrics**: ✅ Enabled
- **healthChecks**: ✅ Enabled
- **extensibility**: ✅ Enabled
- **configuration**: ✅ Enabled
- **deployment**: ✅ Enabled
- **d1**: ✅ Enabled

### Feature Descriptions

- **logging**: Request/response logging
- **monitoring**: Performance monitoring and metrics
- **errorReporting**: Error tracking and reporting
- **metrics**: Application metrics collection
- **healthChecks**: Health check endpoints









## Environment-Specific Configuration

### Development
- Full debugging enabled
- Local database connections
- Hot reload enabled
- Less strict validation

### Staging
- Production-like settings
- Separate database
- Full feature set enabled
- Error reporting enabled

### Production
- Optimized settings
- Production database
- Security hardening
- Full monitoring enabled

## Configuration Validation

The service validates configuration on startup:

1. **Environment Variables**: Required variables present and valid
2. **Service Configuration**: domains.js structure and values
3. **Worker Configuration**: wrangler.toml syntax and bindings
4. **Feature Compatibility**: Feature flags compatible with service type

## Runtime Configuration

Some configuration can be changed at runtime:

- Environment variables (require restart)
- Feature flags (may require restart)
- Database connections (handled automatically)
- Logging levels (immediate effect)

## Security Considerations

- Never commit secrets to version control
- Use Cloudflare Workers secrets for sensitive data
- Rotate API tokens regularly
- Limit feature access based on environment
- Validate all input data
- Use HTTPS for all production endpoints

## Troubleshooting Configuration Issues

### Common Problems

1. **Missing environment variables**
   - Check .env file exists and is loaded
   - Verify variable names match expectations

2. **Invalid Cloudflare credentials**
   - Check account ID format (32 hex characters)
   - Verify API token permissions
   - Confirm zone ID is correct

3. **Database connection issues**
   - Verify D1 database exists
   - Check database ID in wrangler.toml
   - Confirm database binding name

4. **Feature flag conflicts**
   - Some features require others to be enabled
   - Check service type compatibility

### Debugging Configuration

```bash
# Check environment variables
node -e "console.log(process.env)"

# Validate service configuration
node -e "import('./src/config/domains.js').then(config => console.log(JSON.stringify(config, null, 2)))"

# Test wrangler configuration
wrangler dev --dry-run
```
