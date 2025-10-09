# 🛠️ LEGO Framework CLI Tutorial

Interactive guide to mastering the LEGO Framework command-line tools. Follow along with real examples and see the expected outputs.

## 📋 CLI Tools Overview

The LEGO Framework provides three main CLI tools:

### 🏗️ **Service Management**
- `lego-create-service` - Generate new services
- `lego-init-service` - Initialize existing projects

### 🔐 **Security Tools**  
- `lego-security` - Manage keys, validate configs, deploy securely

### 🚀 **Deployment Tools**
- `enterprise-deploy` - Enterprise deployment management
- `master-deploy` - Multi-domain deployment orchestration

---

## 🏗️ Service Management CLI

### `lego-create-service` - Create New Services

#### **Basic Usage**
```bash
node bin/service-management/create-service.js --help
```

**📤 Expected Output:**
```
Lego Framework - Service Template Generator

Usage: lego-create-service <service-name> [options]

Arguments:
  service-name    Name of the service to create (required)

Options:
  -t, --type <type>     Service type: data-service, auth-service, content-service, api-gateway, generic (default: generic)
  -o, --output <path>   Output directory (default: current directory)
  -f, --force           Overwrite existing service directory
  -h, --help           Show this help message

Examples:
  lego-create-service my-data-service --type data-service
  lego-create-service auth-api --type auth-service --output ./services
  lego-create-service my-service --force
```

#### **Example 1: Create a Data Service**
```bash
node bin/service-management/create-service.js my-blog-api --type data-service --output ./projects
```

**📤 Expected Output:**
```
🏗️  Lego Framework Service Generator
=====================================

📋 Configuration:
   Service Name: my-blog-api
   Service Type: data-service  
   Output Path: ./projects/my-blog-api
   
🚀 Generating service structure...

📁 Creating directories...
   ✅ ./projects/my-blog-api/src
   ✅ ./projects/my-blog-api/src/config
   ✅ ./projects/my-blog-api/src/handlers
   ✅ ./projects/my-blog-api/src/middleware
   ✅ ./projects/my-blog-api/src/schema
   ✅ ./projects/my-blog-api/src/worker
   ✅ ./projects/my-blog-api/test

📄 Generating files...
   ✅ package.json
   ✅ wrangler.toml
   ✅ src/config/domains.js
   ✅ src/schema/models.js
   ✅ src/handlers/data-handlers.js
   ✅ src/worker/index.js
   ✅ test/integration.test.js
   ✅ README.md

🎉 Service 'my-blog-api' created successfully!

📝 Next Steps:
   1. cd ./projects/my-blog-api
   2. npm install
   3. Configure your database models in src/schema/models.js
   4. npm test
   5. npm run deploy

🔗 Documentation: https://github.com/tamylaa/lego-framework/docs
```

#### **Example 2: Create an Auth Service**
```bash
node bin/service-management/create-service.js user-auth --type auth-service
```

**📤 Expected Output:**
```
🏗️  Lego Framework Service Generator
=====================================

📋 Configuration:
   Service Name: user-auth
   Service Type: auth-service
   Output Path: ./user-auth
   
🚀 Generating service structure...

📁 Creating directories...
   ✅ ./user-auth/src
   ✅ ./user-auth/src/config
   ✅ ./user-auth/src/handlers
   ✅ ./user-auth/src/middleware
   ✅ ./user-auth/src/schema
   ✅ ./user-auth/src/worker
   ✅ ./user-auth/test

📄 Generating files...
   ✅ package.json
   ✅ wrangler.toml  
   ✅ src/config/domains.js
   ✅ src/schema/models.js (with user, session, token models)
   ✅ src/handlers/auth-handlers.js
   ✅ src/middleware/auth-middleware.js
   ✅ src/worker/index.js
   ✅ test/auth.test.js
   ✅ README.md

🔐 Auth-specific features added:
   ✅ User registration/login handlers
   ✅ JWT token management
   ✅ Password hashing utilities
   ✅ Session management
   ✅ Rate limiting middleware

🎉 Auth service 'user-auth' created successfully!

📝 Next Steps:
   1. cd ./user-auth
   2. npm install
   3. Generate JWT secret: node ../bin/security/security-cli.js generate-key jwt
   4. Set JWT_SECRET in your environment
   5. npm test
   6. npm run deploy

⚠️  Security Note: Always generate secure secrets for production!
```

### `lego-init-service` - Initialize Existing Projects

#### **Basic Usage**
```bash
node bin/service-management/init-service.js --help
```

**📤 Expected Output:**
```
Lego Framework - Service Initializer

Usage: lego-init-service [directory] [options]

Arguments:
  directory       Directory to initialize (default: current directory)

Options:
  -f, --force     Overwrite existing configuration
  -t, --type      Service type to initialize as
  -h, --help      Show this help message

Examples:
  lego-init-service ./existing-project
  lego-init-service --type data-service --force
```

#### **Example: Initialize Existing Project**
```bash
# Assume you have an existing project
mkdir existing-api && cd existing-api
npm init -y

# Initialize with LEGO Framework
node ../bin/service-management/init-service.js .
```

**📤 Expected Output:**
```
🔧 Lego Framework Service Initializer
====================================

📁 Analyzing directory: ./
   ✅ Found package.json
   ✅ Node.js project detected

🔍 Detecting project type...
   📦 Package dependencies found
   🎯 Detected type: generic service

🚀 Initializing LEGO Framework integration...

📄 Adding framework files...
   ✅ src/config/domains.js
   ✅ src/schema/models.js  
   ✅ src/handlers/service-handlers.js
   ✅ src/worker/index.js
   ✅ wrangler.toml

📦 Updating package.json...
   ✅ Added @tamyla/lego-framework dependency
   ✅ Added build scripts
   ✅ Added deploy scripts

🧪 Adding test configuration...
   ✅ test/service.test.js
   ✅ jest.config.js

🎉 Project initialized successfully!

📝 Next Steps:
   1. npm install
   2. Configure your service in src/config/domains.js
   3. Define your data models in src/schema/models.js
   4. npm test
   5. npm run deploy

🔗 Integration Guide: https://github.com/tamylaa/lego-framework/docs/integration
```

---

## 🔐 Security CLI

### `lego-security` - Security Management

#### **Basic Usage**
```bash
node bin/security/security-cli.js --help
```

**📤 Expected Output:**
```
🔐 Lego Framework Security CLI
=============================

Usage: lego-security <command> [options]

Commands:
  generate-key <type> [name]     Generate secure keys (jwt, api, service)
  validate <customer> <env>      Validate security configuration  
  deploy <customer> <env>        Deploy with security validation
  audit <customer>               Security audit report

Options:
  --length <n>      Key length (default: 32 for API, 64 for JWT)
  --prefix <str>    Key prefix (for API keys)
  --dry-run         Show what would be done without executing
  --force           Skip confirmations
  -h, --help        Show this help message

Examples:
  lego-security generate-key jwt
  lego-security generate-key api content-service --prefix cs_
  lego-security validate my-company production
  lego-security deploy my-company production --dry-run
```

#### **Example 1: Generate JWT Secret**
```bash
node bin/security/security-cli.js generate-key jwt
```

**📤 Expected Output:**
```
🔐 Lego Framework Security CLI
=============================

🔑 Generating JWT Secret Key
===========================

📋 Configuration:
   Key Type: JWT Secret
   Length: 64 characters
   Cryptographically Secure: ✅

🔒 Generated JWT Secret:
   a8f5f167f44f4964e6c998dee827110c8b0c16a5e2c6e1a9c0b5e8c8f5a0d2c3e1f4a7b2

⚠️  SECURITY WARNING:
   🔴 This secret should be kept absolutely secure
   🔴 Never commit this to version control
   🔴 Store in environment variables or secure vault
   🔴 Rotate regularly in production

💾 Saving to local file: .env.local
   JWT_SECRET=a8f5f167f44f4964e6c998dee827110c8b0c16a5e2c6e1a9c0b5e8c8f5a0d2c3e1f4a7b2

✅ JWT secret generated successfully!

📝 Usage in your service:
   process.env.JWT_SECRET
```

#### **Example 2: Generate API Key**
```bash
node bin/security/security-cli.js generate-key api content-service --prefix cs_ --length 48
```

**📤 Expected Output:**
```
🔐 Lego Framework Security CLI
=============================

🔑 Generating API Key
====================

📋 Configuration:
   Key Type: API Key
   Service: content-service
   Length: 48 characters
   Prefix: cs_
   Cryptographically Secure: ✅

🔒 Generated API Key:
   cs_7f3c9b1e8d4a2f6c5e9b0a3d1f8c2e7a4b9d6f0c3e8a1b5

💾 Saving to configuration:
   📁 Created: config/api-keys/content-service.key
   📄 Updated: config/services.json

✅ API key generated successfully!

📝 Usage in requests:
   Authorization: Bearer cs_7f3c9b1e8d4a2f6c5e9b0a3d1f8c2e7a4b9d6f0c3e8a1b5
   X-API-Key: cs_7f3c9b1e8d4a2f6c5e9b0a3d1f8c2e7a4b9d6f0c3e8a1b5
```

#### **Example 3: Validate Security Configuration**
```bash
node bin/security/security-cli.js validate my-company production
```

**📤 Expected Output:**
```
🔐 Lego Framework Security CLI
=============================

🔍 Security Configuration Validation
===================================

📋 Validating: my-company (production environment)

🔎 Checking configuration files...
   ✅ config/customers/my-company/production.json found
   ✅ Configuration syntax valid
   ✅ Required fields present

🔑 Checking secrets and keys...
   ✅ JWT_SECRET configured and secure (64 chars)
   ✅ API keys follow naming conventions
   ✅ Database credentials use environment variables
   ⚠️  Warning: X_SERVICE_KEY is only 24 characters (recommend 32+)

🛡️  Checking security settings...
   ✅ HTTPS enforcement enabled
   ✅ CORS configuration secure
   ✅ Rate limiting configured
   ❌ Error: Content Security Policy not configured
   ❌ Error: Security headers incomplete

🌐 Checking environment configuration...
   ✅ Production environment properly configured
   ✅ Debug mode disabled
   ✅ Error reporting configured
   ⚠️  Warning: Verbose logging enabled (consider reducing for production)

📊 Security Score: 7/10 (Good)

❌ Issues Found (2 critical, 2 warnings):
   🔴 Critical: Content Security Policy missing
   🔴 Critical: Security headers incomplete  
   🟡 Warning: X_SERVICE_KEY length below recommended
   🟡 Warning: Verbose logging in production

📝 Recommendations:
   1. Add Content-Security-Policy header configuration
   2. Enable security headers (HSTS, X-Frame-Options, etc.)
   3. Regenerate X_SERVICE_KEY with length 32+
   4. Reduce logging verbosity for production

✅ Validation complete. Address critical issues before deployment.
```

#### **Example 4: Deploy with Security Validation**
```bash
node bin/security/security-cli.js deploy my-company production --dry-run
```

**📤 Expected Output:**
```
🔐 Lego Framework Security CLI
=============================

🚀 Secure Deployment Process
===========================

📋 Deployment Configuration:
   Customer: my-company
   Environment: production  
   Mode: DRY RUN (no actual changes)

🔍 Pre-deployment Security Validation...
   ✅ Configuration validation passed
   ✅ Secrets properly configured
   ✅ Environment variables validated
   ⚠️  2 security warnings (non-blocking)

🛡️  Security Checklist:
   ✅ HTTPS enforcement
   ✅ Authentication configured
   ✅ Database security  
   ✅ API rate limiting
   ✅ Error handling
   ⚠️  Content Security Policy (recommended)

🚀 Deployment Steps (DRY RUN):
   1. ✅ Validate all security configurations
   2. ✅ Check environment prerequisites  
   3. ✅ Verify secrets and credentials
   4. ✅ Run security audit
   5. 🔄 Deploy configuration (SKIPPED - dry run)
   6. 🔄 Deploy application code (SKIPPED - dry run)
   7. 🔄 Run post-deployment validation (SKIPPED - dry run)

📊 Security Assessment: PASS WITH WARNINGS
   ✅ Safe to deploy
   ⚠️  Consider addressing warnings before production

💡 To execute actual deployment:
   node bin/security/security-cli.js deploy my-company production

✅ Dry run completed successfully!
```

---

## 🚀 Deployment CLI

### `enterprise-deploy` - Enterprise Deployment

#### **Basic Usage**
```bash
node bin/deployment/enterprise-deploy.js --help
```

**📤 Expected Output:**
```
🏢 Lego Framework Enterprise Deployment
======================================

Usage: enterprise-deploy [options]

Options:
  --customer <name>     Customer/client name (required)
  --env <environment>   Environment: dev, staging, production (required)
  --dry-run            Show deployment plan without executing  
  --force              Skip confirmation prompts
  --skip-validation    Skip security validation (not recommended)
  --config <path>      Custom configuration file path
  -h, --help           Show this help message

Examples:
  enterprise-deploy --customer acme-corp --env production
  enterprise-deploy --customer startup-x --env staging --dry-run
  enterprise-deploy --customer enterprise --env production --config ./custom.json
```

#### **Example: Enterprise Production Deployment**
```bash
node bin/deployment/enterprise-deploy.js --customer acme-corp --env production --dry-run
```

**📤 Expected Output:**
```
🏢 Lego Framework Enterprise Deployment
======================================

📋 Deployment Configuration
==========================
   Customer: acme-corp
   Environment: production
   Mode: DRY RUN
   Timestamp: 2025-10-09T10:30:45.123Z

🔍 Pre-flight Checks
===================
   ✅ Customer configuration found: config/customers/acme-corp/
   ✅ Environment configuration valid: production.json
   ✅ Dependencies satisfied
   ✅ Build artifacts present
   ⚠️  Warning: Database migration pending

🛡️  Security Validation
=======================
   ✅ Configuration security scan passed
   ✅ Secrets properly configured
   ✅ API keys rotated within policy (< 90 days)
   ✅ SSL certificates valid
   ✅ Domain configuration secure

🏗️  Infrastructure Checks  
=========================
   ✅ Target domains responding
   ✅ CDN configuration valid
   ✅ Database connectivity confirmed
   ✅ External service integrations healthy
   ⚠️  Warning: Cache hit rate below optimal (68%)

📦 Deployment Plan
==================
   Phase 1: Database Migration
   └── 🔄 Apply 3 pending migrations (SKIPPED - dry run)
   
   Phase 2: Application Deployment  
   ├── 🔄 Deploy to api.acme-corp.com (SKIPPED - dry run)
   ├── 🔄 Deploy to auth.acme-corp.com (SKIPPED - dry run)
   └── 🔄 Deploy to admin.acme-corp.com (SKIPPED - dry run)
   
   Phase 3: Configuration Updates
   ├── 🔄 Update CDN rules (SKIPPED - dry run)
   ├── 🔄 Update load balancer config (SKIPPED - dry run)  
   └── 🔄 Update monitoring alerts (SKIPPED - dry run)
   
   Phase 4: Health Validation
   └── 🔄 Run production health checks (SKIPPED - dry run)

📊 Deployment Summary
====================
   Estimated Duration: 8-12 minutes
   Rollback Plan: Available (automated)
   Monitoring: Enabled  
   Alerting: Configured

⚠️  Pre-deployment Warnings:
   🟡 Database migration required (3 pending)
   🟡 Cache performance below optimal
   🟡 Consider peak traffic timing

💡 To execute actual deployment:
   node bin/deployment/enterprise-deploy.js --customer acme-corp --env production

✅ Dry run completed. Ready for production deployment!
```

### `master-deploy` - Multi-Domain Orchestration

#### **Basic Usage**
```bash
node bin/deployment/master-deploy.js --help  
```

**📤 Expected Output:**
```
🌐 Lego Framework Master Deployment Orchestrator
===============================================

Usage: master-deploy [options]

Options:
  --portfolio <file>    Portfolio configuration file (required)
  --env <environment>   Target environment (required)
  --parallel <n>        Maximum parallel deployments (default: 3)
  --dry-run            Show deployment plan without executing
  --force              Skip all confirmation prompts
  --continue-on-error  Continue if individual domains fail
  -h, --help           Show this help message

Examples:
  master-deploy --portfolio portfolio.json --env production
  master-deploy --portfolio ./config/staging-portfolio.json --env staging --parallel 5
  master-deploy --portfolio portfolio.json --env production --dry-run
```

#### **Example: Multi-Domain Production Deploy**
```bash
node bin/deployment/master-deploy.js --portfolio config/production-portfolio.json --env production --parallel 2 --dry-run
```

**📤 Expected Output:**
```
🌐 Lego Framework Master Deployment Orchestrator  
===============================================

📋 Master Deployment Configuration
=================================
   Portfolio: config/production-portfolio.json
   Environment: production
   Parallel Limit: 2
   Mode: DRY RUN
   Orchestration ID: master-deploy-20251009-103045-abc123

📁 Loading Portfolio Configuration...
   ✅ Portfolio file loaded successfully
   ✅ Found 8 domains to deploy
   ✅ Dependencies mapped
   ✅ Deployment order calculated

🌍 Domain Portfolio
==================
   Primary Domains:
   ├── api.acme-corp.com (data-service)
   ├── auth.acme-corp.com (auth-service)  
   ├── admin.acme-corp.com (admin-panel)
   └── cdn.acme-corp.com (static-assets)
   
   Secondary Domains:
   ├── webhooks.acme-corp.com (webhook-service)
   ├── analytics.acme-corp.com (analytics-service)
   ├── notifications.acme-corp.com (notification-service)
   └── support.acme-corp.com (support-portal)

🔗 Dependency Analysis
=====================
   Deployment Groups:
   Group 1: auth.acme-corp.com (no dependencies)
   Group 2: api.acme-corp.com, cdn.acme-corp.com (depends on auth)
   Group 3: admin.acme-corp.com, webhooks.acme-corp.com (depends on api)
   Group 4: analytics.acme-corp.com, notifications.acme-corp.com (depends on api)
   Group 5: support.acme-corp.com (depends on admin)

🚀 Deployment Execution Plan
============================
   Phase 1 (1 domain, parallel: 1):
   └── 🔄 auth.acme-corp.com (SKIPPED - dry run)
   
   Phase 2 (2 domains, parallel: 2):
   ├── 🔄 api.acme-corp.com (SKIPPED - dry run)  
   └── 🔄 cdn.acme-corp.com (SKIPPED - dry run)
   
   Phase 3 (2 domains, parallel: 2):
   ├── 🔄 admin.acme-corp.com (SKIPPED - dry run)
   └── 🔄 webhooks.acme-corp.com (SKIPPED - dry run)
   
   Phase 4 (2 domains, parallel: 2):  
   ├── 🔄 analytics.acme-corp.com (SKIPPED - dry run)
   └── 🔄 notifications.acme-corp.com (SKIPPED - dry run)
   
   Phase 5 (1 domain, parallel: 1):
   └── 🔄 support.acme-corp.com (SKIPPED - dry run)

📊 Deployment Metrics Estimation
===============================
   Total Domains: 8
   Deployment Phases: 5
   Estimated Duration: 15-20 minutes
   Resource Requirements: Medium
   Rollback Complexity: High (cross-domain dependencies)

🛡️  Risk Assessment  
==================
   ✅ Low Risk: All domains have rollback plans
   ✅ Medium Risk: Dependencies properly ordered
   ⚠️  High Risk: 8 domains in single deployment
   ⚠️  Consider: Staged deployment over multiple windows

💡 Recommendations:
   🎯 Consider deploying in smaller batches
   🎯 Schedule during low-traffic window
   🎯 Have rollback plan ready
   🎯 Monitor each phase before continuing

💡 To execute actual deployment:
   node bin/deployment/master-deploy.js --portfolio config/production-portfolio.json --env production --parallel 2

✅ Master deployment dry run completed successfully!
```

---

## 🧪 Interactive Testing

Let's test these CLIs interactively! You can try these commands right now:

### **Test 1: Get Help for Any CLI**
```bash
# Try this now:
node bin/service-management/create-service.js --help
node bin/security/security-cli.js --help
```

### **Test 2: Generate a Test Service**  
```bash
# Create a test service:
node bin/service-management/create-service.js test-cli-demo --type data-service --output ./temp-test
```

### **Test 3: Generate a Secure Key**
```bash
# Generate a JWT secret:
node bin/security/security-cli.js generate-key jwt
```

### **Test 4: Validate (will show warnings for demo)**
```bash
# This will show validation output:
node bin/security/security-cli.js validate demo-customer test
```

---

## 🎯 Common Workflows

### **Workflow 1: New Project Setup**
```bash
# Step 1: Create the service
node bin/service-management/create-service.js my-new-api --type data-service

# Step 2: Generate secrets  
cd my-new-api
node ../bin/security/security-cli.js generate-key jwt > .env
node ../bin/security/security-cli.js generate-key api my-new-api --prefix api_

# Step 3: Install and test
npm install && npm test

# Step 4: Deploy (dry run first)  
node ../bin/deployment/enterprise-deploy.js --customer my-company --env staging --dry-run
```

### **Workflow 2: Security Audit & Deploy**
```bash
# Step 1: Validate security
node bin/security/security-cli.js validate my-company production

# Step 2: Fix any issues found, then validate again
node bin/security/security-cli.js validate my-company production

# Step 3: Deploy with security validation
node bin/security/security-cli.js deploy my-company production --dry-run

# Step 4: Execute actual deployment  
node bin/security/security-cli.js deploy my-company production
```

### **Workflow 3: Multi-Domain Portfolio Deploy**
```bash  
# Step 1: Create portfolio configuration
# (Edit config/portfolio.json with your domains)

# Step 2: Dry run to see plan
node bin/deployment/master-deploy.js --portfolio config/portfolio.json --env production --dry-run

# Step 3: Execute staged deployment
node bin/deployment/master-deploy.js --portfolio config/portfolio.json --env production --parallel 2
```

---

## 🔧 Troubleshooting Common Issues

### **Issue: "Module not found"**
```bash
# Make sure you're in the framework root directory
pwd  # Should show: .../lego-framework

# If not, navigate there:
cd path/to/lego-framework
```

### **Issue: "Permission denied"**  
```bash
# On Unix systems, you may need to make scripts executable:
chmod +x bin/service-management/create-service.js
chmod +x bin/security/security-cli.js
```

### **Issue: "Configuration file not found"**
```bash
# Check if you have the required config structure:
ls config/customers/
ls config/

# Create if missing:
mkdir -p config/customers/demo-customer
```

### **Issue: CLI shows outdated help**
```bash  
# Clear Node.js cache:
node --max-old-space-size=8192 bin/service-management/create-service.js --help
```

---

## 🎓 Advanced CLI Tips

### **1. Using Environment Variables**
```bash
# Set common options via environment  
export LEGO_DEFAULT_TYPE=data-service
export LEGO_OUTPUT_DIR=./my-services

# Now these are defaults:
node bin/service-management/create-service.js my-api
```

### **2. Batch Operations**
```bash
# Create multiple services:
for service in api auth admin; do
  node bin/service-management/create-service.js ${service}-service --type data-service
done
```

### **3. Configuration Templates**
```bash
# Use configuration files for complex deployments:
echo '{"customer": "my-company", "env": "production"}' > deploy-config.json
node bin/deployment/enterprise-deploy.js --config deploy-config.json
```

### **4. Logging and Output**
```bash
# Save output for later review:
node bin/security/security-cli.js validate my-company production > security-audit.log 2>&1

# Parse JSON output:  
node bin/deployment/enterprise-deploy.js --dry-run --json | jq '.deploymentPlan'
```

---

## 📚 Next Steps

After mastering the CLI tools:

1. **📖 Read the Complete Docs**: [../README.md](../README.md)
2. **🔧 Try the API**: [./api-reference.md](./api-reference.md)  
3. **🚀 Use Templates**: [./quickstart-templates/](./quickstart-templates/)
4. **🔐 Security Guide**: [../SECURITY.md](../SECURITY.md)

---

**🎯 Questions or Issues?** [Open an issue](https://github.com/tamylaa/lego-framework/issues) or check our [troubleshooting guide](./troubleshooting.md)!