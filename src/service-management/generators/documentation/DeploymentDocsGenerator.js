import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Deployment Documentation Generator
 * Generates comprehensive deployment guide for all environments
 */
export class DeploymentDocsGenerator extends BaseGenerator {
  /**
   * Generate deployment documentation
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated deployment docs file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure docs directory exists
    const docsDir = join(servicePath, 'docs');
    mkdirSync(docsDir, { recursive: true });

    const deploymentDocsContent = this._generateDeploymentDocsContent(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, 'docs', 'DEPLOYMENT.md');
    writeFileSync(filePath, deploymentDocsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate deployment documentation content
   * @private
   */
  _generateDeploymentDocsContent(coreInputs, confirmedValues) {
    return `# ${confirmedValues.displayName} - Deployment Guide

## Overview

This guide covers deploying ${confirmedValues.displayName} to different environments using the Clodo Framework.

## Environments

### Development
- **URL**: ${confirmedValues.developmentUrl}
- **Environment**: development
- **Configuration**: \`config/development.env\`

### Staging
- **URL**: ${confirmedValues.stagingUrl}
- **Environment**: staging
- **Configuration**: \`config/staging.env\`

### Production
- **URL**: ${confirmedValues.productionUrl}
- **Environment**: production
- **Configuration**: \`config/production.env\`

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Wrangler CLI installed
- PowerShell (for deployment scripts)

## Initial Setup

1. **Clone and setup**:
   \`\`\`bash
   git clone ${confirmedValues.gitRepositoryUrl}
   cd ${coreInputs.serviceName}
   .\\scripts\\setup.ps1
   \`\`\`

2. **Configure environment**:
   Edit \`.env\` with your Cloudflare credentials:
   \`\`\`bash
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ZONE_ID=your_zone_id
   CLOUDFLARE_API_TOKEN=your_api_token
   \`\`\`

3. **Setup database** (if enabled):
   ${confirmedValues.features.database ? `
   Create a Cloudflare D1 database and update \`wrangler.toml\`:
   \`\`\`toml
   [[d1_databases]]
   binding = "DB"
   database_name = "${confirmedValues.databaseName}"
   database_id = "your_database_id"
   \`\`\`
   ` : 'Database not required for this service type.'}

## Development Deployment

\`\`\`bash
# Start local development server
npm run dev

# Server will be available at http://localhost:8787
\`\`\`

## Staging Deployment

\`\`\`bash
# Deploy to staging
.\\scripts\\deploy.ps1 -Environment staging

# Run health checks
.\\scripts\\health-check.ps1 -Environment staging
\`\`\`

## Production Deployment

\`\`\`bash
# Deploy to production
.\\scripts\\deploy.ps1 -Environment production

# Verify deployment
.\\scripts\\health-check.ps1 -Environment production
\`\`\`

## Automated Deployment

### GitHub Actions

The service includes GitHub Actions workflows for automated deployment:

- **CI**: Runs on every push to main branch
- **Deploy**: Deploys to staging on successful CI
- **Release**: Deploys to production on tag creation

### Manual CI/CD

\`\`\`bash
# Run full CI pipeline locally
npm run lint
npm test
npm run build

# Deploy if all checks pass
.\\scripts\\deploy.ps1 -Environment production
\`\`\`

## Monitoring and Health Checks

### Health Check Endpoint

\`\`\`bash
curl ${confirmedValues.productionUrl}${confirmedValues.healthCheckPath}
\`\`\`

### Automated Health Monitoring

The deployment scripts include automated health checks. For production monitoring, consider:

- Cloudflare Analytics
- External monitoring services
- Log aggregation tools

## Rollback Strategy

### Quick Rollback

\`\`\`bash
# Deploy previous version
wrangler deploy --env production

# Or redeploy from git
git checkout previous-version
npm run deploy
\`\`\`

### Database Rollback

${confirmedValues.features.database ? `
If database schema changes need rollback:

1. Restore from backup
2. Run migration rollback scripts
3. Update wrangler.toml if needed
` : 'No database rollback required for this service type.'}

## Troubleshooting

### Common Issues

1. **Deployment fails with authentication error**
   - Check Cloudflare API token permissions
   - Verify account ID and zone ID

2. **Health check fails**
   - Check database connectivity
   - Verify environment variables
   - Review worker logs

3. **API returns 500 errors**
   - Check worker logs in Cloudflare dashboard
   - Verify service configuration
   - Test locally first

### Logs and Debugging

\`\`\`bash
# View worker logs
wrangler tail

# Check deployment status
wrangler deployments list

# View environment info
wrangler whoami
\`\`\`

## Security Considerations

- Store secrets in Cloudflare Workers secrets, not environment variables
- Use HTTPS for all production endpoints
- Implement proper authentication and authorization
- Regularly rotate API tokens
- Monitor for unusual activity

## Performance Optimization

- Enable caching where appropriate
- Use appropriate database indexes
- Monitor response times
- Optimize bundle size
- Consider edge deployment locations
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate deployment documentation
  }
}

