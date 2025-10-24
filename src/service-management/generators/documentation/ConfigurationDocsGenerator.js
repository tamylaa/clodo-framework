import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Configuration Documentation Generator
 * Generates comprehensive configuration guide covering all config layers
 */
export class ConfigurationDocsGenerator extends BaseGenerator {
  /**
   * Generate configuration documentation
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated configuration docs file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure docs directory exists
    const docsDir = join(servicePath, 'docs');
    mkdirSync(docsDir, { recursive: true });

    const configDocsContent = this._generateConfigDocsContent(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, 'docs', 'CONFIGURATION.md');
    writeFileSync(filePath, configDocsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate configuration documentation content
   * @private
   */
  _generateConfigDocsContent(coreInputs, confirmedValues) {
    return `# ${confirmedValues.displayName} - Configuration Guide

## Overview

${confirmedValues.displayName} is configured using multiple layers of configuration files and environment variables.

## Configuration Hierarchy

1. **Environment Variables** (.env) - Runtime secrets and environment-specific values
2. **Service Configuration** (src/config/domains.js) - Service-specific settings
3. **Worker Configuration** (wrangler.toml) - Cloudflare Workers deployment settings
4. **Package Configuration** (package.json) - Node.js package settings

## Environment Variables

### Required Variables

\`\`\`bash
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}
CLOUDFLARE_API_TOKEN=your_api_token

# Service Configuration
SERVICE_NAME=${coreInputs.serviceName}
SERVICE_TYPE=${coreInputs.serviceType}
DOMAIN_NAME=${coreInputs.domainName}
ENVIRONMENT=${coreInputs.environment}
\`\`\`

### Optional Variables

\`\`\`bash
# URLs (override defaults)
PRODUCTION_URL=${confirmedValues.productionUrl}
STAGING_URL=${confirmedValues.stagingUrl}
DEVELOPMENT_URL=${confirmedValues.developmentUrl}
DOCUMENTATION_URL=${confirmedValues.documentationUrl}

# API Configuration
API_BASE_PATH=${confirmedValues.apiBasePath}
HEALTH_CHECK_PATH=${confirmedValues.healthCheckPath}

# Database
DATABASE_NAME=${confirmedValues.databaseName}

# Logging and Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
ERROR_REPORTING_ENABLED=true

# Custom Variables
CUSTOM_VAR=value
\`\`\`

## Service Configuration (domains.js)

Located at \`src/config/domains.js\`, this file contains service-specific configuration:

\`\`\`javascript
export const domains = {
  '${coreInputs.serviceName}': {
    name: '${coreInputs.serviceName}',
    displayName: '${confirmedValues.displayName}',
    description: '${confirmedValues.description}',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    domains: {
      production: '${confirmedValues.productionUrl}',
      staging: '${confirmedValues.stagingUrl}',
      development: '${confirmedValues.developmentUrl}'
    },
    services: [
      '${coreInputs.serviceName}'
    ],
    databases: [
      {
        name: '${confirmedValues.databaseName}',
        type: 'd1',
        binding: 'DB'
      }
    ],
    features: ${JSON.stringify(confirmedValues.features, null, 4)},
    metadata: {
      version: '${confirmedValues.version}',
      author: '${confirmedValues.author}',
      generatedAt: '${new Date().toISOString()}',
      frameworkVersion: '3.0.0',
      serviceType: '${coreInputs.serviceType}',
      environment: '${coreInputs.environment}'
    }
  }
};
\`\`\`

## Worker Configuration (wrangler.toml)

Cloudflare Workers configuration with environment-specific settings:

\`\`\`toml
name = "${confirmedValues.workerName}"
main = "src/worker/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"
compatibility_flags = ["nodejs_compat"]

# Environment configurations
[env.development]
name = "${confirmedValues.workerName}-dev"

[env.staging]
name = "${confirmedValues.workerName}-staging"

[env.production]
name = "${confirmedValues.workerName}"

# Database bindings
[[d1_databases]]
binding = "DB"
database_name = "${confirmedValues.databaseName}"

# Environment variables
[vars]
SERVICE_NAME = "${coreInputs.serviceName}"
SERVICE_TYPE = "${coreInputs.serviceType}"
DOMAIN_NAME = "${coreInputs.domainName}"
ENVIRONMENT = "${coreInputs.environment}"
API_BASE_PATH = "${confirmedValues.apiBasePath}"
HEALTH_CHECK_PATH = "${confirmedValues.healthCheckPath}"

# Domain-specific variables
PRODUCTION_URL = "${confirmedValues.productionUrl}"
STAGING_URL = "${confirmedValues.stagingUrl}"
DEVELOPMENT_URL = "${confirmedValues.developmentUrl}"

# Feature flags
${Object.entries(confirmedValues.features)
  .filter(([, enabled]) => enabled)
  .map(([feature, enabled]) => `FEATURE_${feature.toUpperCase()} = ${enabled}`)
  .join('\n')}

# Custom environment variables (configure as needed)
# CUSTOM_VAR = "value"
\`\`\`

## Feature Flags

The service supports the following feature flags:

${Object.entries(confirmedValues.features)
  .map(([feature, enabled]) => `- **${feature}**: ${enabled ? '✅ Enabled' : '❌ Disabled'}`)
  .join('\n')}

### Feature Descriptions

- **logging**: Request/response logging
- **monitoring**: Performance monitoring and metrics
- **errorReporting**: Error tracking and reporting
- **metrics**: Application metrics collection
- **healthChecks**: Health check endpoints
${confirmedValues.features.database ? '- **database**: Database operations and connectivity\n' : ''}
${confirmedValues.features.authentication ? '- **authentication**: User authentication\n' : ''}
${confirmedValues.features.authorization ? '- **authorization**: Access control and permissions\n' : ''}
${confirmedValues.features.search ? '- **search**: Search functionality\n' : ''}
${confirmedValues.features.filtering ? '- **filtering**: Data filtering capabilities\n' : ''}
${confirmedValues.features.pagination ? '- **pagination**: Paginated responses\n' : ''}
${confirmedValues.features.caching ? '- **caching**: Response caching\n' : ''}
${confirmedValues.features.backup ? '- **backup**: Data backup functionality\n' : ''}

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

\`\`\`bash
# Check environment variables
node -e "console.log(process.env)"

# Validate service configuration
node -e "import('./src/config/domains.js').then(config => console.log(JSON.stringify(config, null, 2)))"

# Test wrangler configuration
wrangler dev --dry-run
\`\`\`
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate configuration documentation
  }
}
