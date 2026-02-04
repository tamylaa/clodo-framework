# Test Api Service - Deployment Guide

## Overview

This guide covers deploying Test Api Service to different environments using the Clodo Framework.

## Environments

### Development
- **URL**: https://test-api-service-dev.test.example.com
- **Environment**: development
- **Configuration**: `config/development.env`

### Staging
- **URL**: https://test-api-service-sta.test.example.com
- **Environment**: staging
- **Configuration**: `config/staging.env`

### Production
- **URL**: https://test-api-service.test.example.com
- **Environment**: production
- **Configuration**: `config/production.env`

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Wrangler CLI installed
- PowerShell (for deployment scripts)

## Initial Setup

1. **Clone and setup**:
   ```bash
   git clone https://github.com/tamylaa/test-api-service
   cd test-api-service
   .\scripts\setup.ps1
   ```

2. **Configure environment**:
   Edit `.env` with your Cloudflare credentials:
   ```bash
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_ZONE_ID=your_zone_id
   CLOUDFLARE_API_TOKEN=your_api_token
   ```

3. **Setup database** (if enabled):
   Database not required for this service type.

## Development Deployment

```bash
# Start local development server
npm run dev

# Server will be available at http://localhost:8787
```

## Staging Deployment

```bash
# Deploy to staging
.\scripts\deploy.ps1 -Environment staging

# Run health checks
.\scripts\health-check.ps1 -Environment staging
```

## Production Deployment

```bash
# Deploy to production
.\scripts\deploy.ps1 -Environment production

# Verify deployment
.\scripts\health-check.ps1 -Environment production
```

## Automated Deployment

### GitHub Actions

The service includes GitHub Actions workflows for automated deployment:

- **CI**: Runs on every push to main branch
- **Deploy**: Deploys to staging on successful CI
- **Release**: Deploys to production on tag creation

### Manual CI/CD

```bash
# Run full CI pipeline locally
npm run lint
npm test
npm run build

# Deploy if all checks pass
.\scripts\deploy.ps1 -Environment production
```

## Monitoring and Health Checks

### Health Check Endpoint

```bash
curl https://test-api-service.test.example.com/health
```

### Automated Health Monitoring

The deployment scripts include automated health checks. For production monitoring, consider:

- Cloudflare Analytics
- External monitoring services
- Log aggregation tools

## Rollback Strategy

### Quick Rollback

```bash
# Deploy previous version
wrangler deploy --env production

# Or redeploy from git
git checkout previous-version
npm run deploy
```

### Database Rollback

No database rollback required for this service type.

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

```bash
# View worker logs
wrangler tail

# Check deployment status
wrangler deployments list

# View environment info
wrangler whoami
```

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
