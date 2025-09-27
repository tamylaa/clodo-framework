# Deployment Guide

## 🚀 Production Deployment Strategy

This guide covers comprehensive deployment strategies for Lego Framework services, from development to production environments.

## 📋 Prerequisites

### **Required Tools**
- **Wrangler CLI**: `npm install -g wrangler@latest`
- **PowerShell**: 5.1+ (Windows) or PowerShell Core 7+ (cross-platform)
- **Git**: For version control and CI/CD integration

### **Cloudflare Setup**
- **Cloudflare Account**: With Workers and D1 enabled
- **Custom Domain** (optional): Added to Cloudflare DNS
- **API Token**: With appropriate permissions

### **Authentication**
```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

## 🏗️ Environment Architecture

### **Standard Environment Setup**
```
┌─────────────────────────────────────────────────────────────┐
│                     Production Environment                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ my-service-prod │ │ my-service-db   │ │ Custom Domain   ││
│  │ (Worker)        │ │ (D1 Database)   │ │ api.company.com ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                     Staging Environment                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ my-service-stage│ │ my-service-     │ │ Staging Domain  ││
│  │ (Worker)        │ │ staging-db      │ │ staging-api.com ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                   Development Environment                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ my-service-dev  │ │ my-service-     │ │ Workers.dev     ││
│  │ (Worker)        │ │ dev-db          │ │ Subdomain       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration Management

### **Environment-Specific Configuration**

**1. Update `wrangler.toml`:**
```toml
name = "my-service-dev"
main = "src/worker/index.js"
compatibility_date = "2025-09-27"

# Development Environment
[env.development]
name = "my-service-dev"
vars = { ENVIRONMENT = "development", DOMAIN_NAME = "my-service" }

# Staging Environment  
[env.staging]
name = "my-service-staging"
vars = { ENVIRONMENT = "staging", DOMAIN_NAME = "my-service" }
[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-service-staging-db"

# Production Environment
[env.production]
name = "my-service-production"
vars = { ENVIRONMENT = "production", DOMAIN_NAME = "my-service" }
[[env.production.d1_databases]]
binding = "DB"
database_name = "my-service-production-db"
```

**2. Domain Configuration (`src/config/domains.js`):**
```javascript
export const domains = {
  'my-service': {
    name: 'my-service',
    displayName: 'My Service',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    
    domains: {
      production: 'api.mycompany.com',
      staging: 'staging-api.mycompany.com', 
      development: 'my-service.myname.workers.dev'
    },
    
    // Environment-specific features
    features: {
      authentication: true,
      logging: true,
      analytics: process.env.ENVIRONMENT === 'production',
      rateLimiting: process.env.ENVIRONMENT !== 'development',
      monitoring: process.env.ENVIRONMENT === 'production'
    },
    
    settings: {
      environment: process.env.ENVIRONMENT || 'development',
      logLevel: process.env.ENVIRONMENT === 'production' ? 'warn' : 'info',
      corsOrigins: process.env.ENVIRONMENT === 'production' 
        ? ['https://mycompany.com'] 
        : ['*']
    }
  }
};
```

## 🗄️ Database Management

### **Create Databases for Each Environment**

```bash
# Create development database
wrangler d1 create my-service-dev-db

# Create staging database  
wrangler d1 create my-service-staging-db

# Create production database
wrangler d1 create my-service-production-db
```

### **Database Migration Strategy**

**1. Create Migration Scripts (`migrations/`):**
```sql
-- migrations/001_create_users_table.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);
```

**2. Run Migrations:**
```bash
# Development
wrangler d1 execute my-service-dev-db --file migrations/001_create_users_table.sql

# Staging  
wrangler d1 execute my-service-staging-db --file migrations/001_create_users_table.sql

# Production
wrangler d1 execute my-service-production-db --file migrations/001_create_users_table.sql
```

## 📜 Deployment Scripts

### **Enhanced PowerShell Deployment Script**

**Create `scripts/deploy.ps1`:**
```powershell
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "my-service",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$RunMigrations
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying $ServiceName to $Environment environment" -ForegroundColor Green

# Pre-deployment checks
Write-Host "📋 Running pre-deployment checks..." -ForegroundColor Cyan

# Check if wrangler is authenticated
$whoami = wrangler whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Wrangler authentication required. Run 'wrangler login'"
}

Write-Host "✅ Authenticated as: $whoami" -ForegroundColor Green

# Run tests (unless skipped)
if (-not $SkipTests) {
    Write-Host "🧪 Running tests..." -ForegroundColor Cyan
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Tests failed. Deployment aborted."
    }
    Write-Host "✅ All tests passed" -ForegroundColor Green
}

# Build the service
Write-Host "🔨 Building service..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build failed"
}

# Run database migrations
if ($RunMigrations) {
    Write-Host "🗄️ Running database migrations..." -ForegroundColor Cyan
    
    $dbName = "$ServiceName-$Environment-db"
    
    # Get list of migration files
    $migrations = Get-ChildItem -Path "migrations/*.sql" | Sort-Object Name
    
    foreach ($migration in $migrations) {
        Write-Host "   Executing: $($migration.Name)" -ForegroundColor Yellow
        
        if (-not $DryRun) {
            wrangler d1 execute $dbName --file $migration.FullName
            if ($LASTEXITCODE -ne 0) {
                Write-Error "❌ Migration failed: $($migration.Name)"
            }
        }
    }
    
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
}

# Deploy to Cloudflare Workers
Write-Host "☁️ Deploying to Cloudflare Workers..." -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN - Would deploy with:" -ForegroundColor Yellow
    Write-Host "   Environment: $Environment"
    Write-Host "   Service: $ServiceName"
    wrangler deploy --dry-run --env $Environment
} else {
    wrangler deploy --env $Environment
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Deployment failed"
    }
}

# Post-deployment validation
Write-Host "🔍 Running post-deployment validation..." -ForegroundColor Cyan

$workerName = "$ServiceName-$Environment"
$url = if ($Environment -eq "production") {
    "https://api.mycompany.com"
} elseif ($Environment -eq "staging") {
    "https://staging-api.mycompany.com"  
} else {
    "https://$workerName.myname.workers.dev"
}

# Health check
Write-Host "   Testing health endpoint..." -ForegroundColor Yellow
$healthResponse = Invoke-RestMethod -Uri "$url/health" -Method Get -TimeoutSec 30

if ($healthResponse.status -eq "healthy") {
    Write-Host "✅ Health check passed" -ForegroundColor Green
} else {
    Write-Warning "⚠️ Health check returned unexpected status: $($healthResponse.status)"
}

# Feature validation
Write-Host "   Validating features..." -ForegroundColor Yellow
Write-Host "   Active features: $($healthResponse.features -join ', ')" -ForegroundColor Gray

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Service URL: $url" -ForegroundColor Cyan
Write-Host "📊 Monitor at: https://dash.cloudflare.com/" -ForegroundColor Cyan
```

### **Simplified Deployment Commands**

**Add to `package.json`:**
```json
{
  "scripts": {
    "deploy:dev": "powershell -File scripts/deploy.ps1 -Environment development",
    "deploy:staging": "powershell -File scripts/deploy.ps1 -Environment staging -RunMigrations",
    "deploy:production": "powershell -File scripts/deploy.ps1 -Environment production -RunMigrations",
    "deploy:dry-run": "powershell -File scripts/deploy.ps1 -Environment staging -DryRun"
  }
}
```

## 🔄 CI/CD Integration

### **GitHub Actions Workflow**

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run linting
        run: npm run lint

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Deploy to staging
        run: |
          echo "${{ secrets.CLOUDFLARE_API_TOKEN }}" | wrangler auth --api-token
          npm run build
          wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js  
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run database migrations
        run: |
          echo "${{ secrets.CLOUDFLARE_API_TOKEN }}" | wrangler auth --api-token
          # Run migration scripts here
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          
      - name: Deploy to production
        run: |
          echo "${{ secrets.CLOUDFLARE_API_TOKEN }}" | wrangler auth --api-token
          npm run build
          wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### **Required GitHub Secrets**
```bash
# Add these secrets to your GitHub repository:
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

## 🏷️ Versioning Strategy

### **Semantic Versioning with Git Tags**
```bash
# Tag releases
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Deploy specific version
git checkout v1.0.0
npm run deploy:production
```

### **Automatic Version Detection**
```javascript
// Add to worker/index.js
const VERSION = process.env.npm_package_version || '1.0.0';
const GIT_SHA = process.env.GITHUB_SHA || 'unknown';

// Include in health endpoint
return new Response(JSON.stringify({
  status: 'healthy',
  version: VERSION,
  commit: GIT_SHA,
  // ... other health data
}));
```

## 🎯 Blue-Green Deployment

### **Zero-Downtime Deployment Strategy**
```bash
# Deploy to blue environment
wrangler deploy --env production-blue

# Test blue environment
curl https://blue-api.mycompany.com/health

# Switch traffic to blue (via DNS or route updates)
# Monitor for issues

# If successful, blue becomes new production
# If issues, switch back to green instantly
```

### **Route-Based Traffic Switching**
```javascript
// Use Cloudflare Workers route patterns
// Route 1: api.mycompany.com/* -> production-green (current)
// Route 2: blue-api.mycompany.com/* -> production-blue (testing)

// After validation, switch routes:
// Route 1: api.mycompany.com/* -> production-blue (new)
// Route 2: green-api.mycompany.com/* -> production-green (backup)
```

## 📊 Monitoring and Rollback

### **Deployment Monitoring**
```bash
# Monitor deployment in real-time
wrangler tail my-service-production

# Check error rates
wrangler analytics my-service-production --since 1h

# Monitor custom metrics
curl https://api.mycompany.com/metrics
```

### **Automated Rollback**
```powershell
# Add to deploy.ps1
# Post-deployment health check
$healthCheck = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 30

if ($healthCheck.status -ne "healthy") {
    Write-Warning "❌ Health check failed, initiating rollback..."
    
    # Get previous version
    $previousVersion = wrangler deployments list --limit 2 | Select-Object -Skip 1 -First 1
    
    # Rollback to previous deployment
    wrangler rollback $previousVersion.id
    
    Write-Host "🔄 Rollback completed" -ForegroundColor Yellow
    exit 1
}
```

## 🔐 Security Considerations

### **Environment Variables Management**
```bash
# Set sensitive variables via wrangler
wrangler secret put JWT_SECRET --env production
wrangler secret put DATABASE_ENCRYPTION_KEY --env production

# List secrets (names only)
wrangler secret list --env production
```

### **Access Control**
```toml
# wrangler.toml - limit who can deploy
[env.production]
# Only allow specific API tokens
# Implement in CI/CD pipeline
```

## 📈 Performance Optimization

### **Build Optimization**
```json
{
  "scripts": {
    "build": "webpack --mode production --optimize-minimize",
    "build:analyze": "webpack-bundle-analyzer dist/bundle.js"
  }
}
```

### **Caching Strategy**
```javascript
// Add caching headers for static responses
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 minutes
    'CDN-Cache-Control': 'max-age=3600'     // 1 hour on CDN
  }
});
```

---

**Next**: [Monitoring and Observability](./monitoring.md) | [CI/CD Best Practices](./ci-cd.md)