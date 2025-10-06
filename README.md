# Lego Framework

A comprehensive framework for building enterprise-grade software architecture on Cloudflare Workers + D1. This framework enables rapid development of autonomous, domain-specific services while maintaining consistency and reusability across your entire ecosystem.

> **Note**: This framework serves as both a development environment for understanding deployment workflows and a source of reusable components for service codebases. The ultimate goal is to embed these capabilities into individual service repositories for autonomous deployment.

## Philosophy

Just like Lego bricks snap together to build anything you can imagine, this framework provides the base components that your services snap into. Focus on your business logic while the framework handles the infrastructure, configuration, and deployment patterns.

## 🔒 Security-First Architecture

The Lego Framework implements **security-by-default** principles, ensuring that insecure configurations cannot reach production environments. Our comprehensive security validation framework automatically detects and prevents:

- **Dummy API Keys**: Prevents deployment of development/test keys to production
- **Weak Secrets**: Blocks passwords shorter than security requirements
- **Insecure URLs**: Enforces HTTPS in production, blocks localhost in live environments
- **JWT Security**: Validates JWT secret strength and entropy
- **Environment Compliance**: Different security rules for dev/staging/production

### Security Integration

Security validation is **automatically applied** to all deployments through framework hooks:

```javascript
// Security validation runs automatically on every deployment
hooks: {
  'pre-deployment': async (context) => {
    const issues = ConfigurationValidator.validate(config, environment);
    if (criticalIssues.length > 0) {
      throw new Error('🚫 Deployment blocked due to critical security issues');
    }
  }
}
```

### Quick Security Setup

```bash
# Generate secure keys
npx lego-security generate-key jwt
npx lego-security generate-key api content-skimmer

# Validate configuration security
npx lego-security validate customer production

# Deploy with automatic security validation
npx lego-security deploy customer production
```

## Current Status ✅

### **Working Features**
- ✅ **Interactive Domain Selection**: Choose domains from discovered services
- ✅ **Real Cloudflare Worker Deployment**: Actual wrangler-based deployment
- ✅ **Domain Discovery & Validation**: Comprehensive Cloudflare integration
- ✅ **API Token Management**: Secure encrypted storage and validation
- ✅ **Service Directory Intelligence**: Smart service discovery by domain configuration
- ✅ **Production Testing Suite**: Comprehensive post-deployment validation
- ✅ **Deployment Auditing**: Complete audit trails and logging
- ✅ **Graceful Error Handling**: D1 permission graceful degradation
- ✅ **Cross-Platform Support**: Windows PowerShell and Linux compatibility
- ✅ **🔒 Security Validation Framework**: Automated security validation and deployment blocking
- ✅ **🛡️ Cryptographic Key Generation**: Secure API key and JWT secret generation
- ✅ **🚫 Deployment Security**: Pre-deployment validation that blocks insecure configurations
- ✅ **👥 Customer Configuration Management**: Multi-environment, multi-customer configuration system
- ✅ **🏗️ Template-Based Customer Onboarding**: Automated customer setup from reusable templates
- ✅ **🔗 Framework Integration**: Customer configs integrate with domain and feature flag systems
- ✅ **📘 TypeScript Support**: Comprehensive type definitions with 500+ lines of TypeScript interfaces
- ✅ **⚡ Performance Caching**: Schema caching, SQL query caching, and validation result caching
- ✅ **🔄 Enhanced Data Services**: Advanced pagination, relationship loading, and query optimization

### **Core Capabilities**
- **Enterprise Deployment System**: Multi-domain deployment orchestration with validation
- **Domain Configuration Management**: Centralized configuration with runtime discovery
- **API Token Security**: AES-256-CBC encrypted storage with automatic prompting
- **Service Autonomy**: Each service can discover and deploy itself independently
- **Comprehensive Validation**: Network, authentication, configuration, and endpoint validation
- **🔒 Security-by-Default**: Automatic detection and prevention of insecure configurations
- **🛡️ Production Security**: Environment-specific security requirements and validation
- **🔐 Cryptographic Utilities**: Secure key generation and secret management
- **Production Testing**: Health checks, authentication flows, performance monitoring
- **Audit & Compliance**: Detailed deployment logging and reporting
- **👥 Customer Configuration Management**: Multi-environment customer isolation and management
- **🏗️ Template-Based Onboarding**: Automated customer setup with reusable configuration templates
- **🔗 Framework Integration**: Seamless integration with existing domain and feature flag systems
- **📘 TypeScript First**: Complete type safety with comprehensive type definitions and IDE support
- **⚡ Performance Optimized**: Intelligent caching system for schemas, SQL queries, and validation results
- **🔄 Advanced Data Operations**: Enhanced CRUD with relationships, advanced pagination, and query optimization

## � For Developers

If you're building services with the Lego Framework, see our comprehensive [Developer Guide](./docs/guides/developer-guide.md) for:

- Installation and setup instructions
- Service creation and configuration
- Best practices for using public APIs
- Deployment patterns (embedding logic, not calling internal commands)
- Troubleshooting and common issues

## 📘 TypeScript Support

The Lego Framework provides comprehensive TypeScript support with 500+ lines of type definitions for complete type safety and enhanced developer experience.

### **TypeScript Setup**
```typescript
// types/index.d.ts provides complete type coverage
import { 
  SchemaManager, 
  GenericDataService, 
  EnhancedRouter,
  CustomerConfigurationManager 
} from '@tamyla/lego-framework';

// Full IntelliSense and type checking
const schemaManager = new SchemaManager();
const service = new GenericDataService(d1Client, 'users');
```

### **Key TypeScript Features**
- **Complete API Coverage**: Every exported function and class is fully typed
- **Advanced Generic Types**: Complex data structures with proper generic constraints
- **Validation Types**: Type-safe schema definitions and validation results
- **Cache Types**: Typed caching interfaces with TTL and statistics
- **Security Types**: Comprehensive security validation and key generation types
- **IDE Integration**: Full IntelliSense, auto-completion, and refactoring support

> **Important**: The commands below are for framework development and internal use. External developers should embed deployment logic in their services rather than calling these scripts directly.

## �🚀 Working Commands

### **Enterprise Deployment (Primary)**
```bash
# Interactive domain deployment (Recommended)
node bin/deployment/enterprise-deploy.js deploy --interactive

# Direct domain deployment
node bin/deployment/enterprise-deploy.js deploy data-service.greatidude.com

# Deployment with custom validation level
node bin/deployment/enterprise-deploy.js deploy --interactive --validation comprehensive

# Dry run deployment
node bin/deployment/enterprise-deploy.js deploy --interactive --dry-run

# Skip production tests
node bin/deployment/enterprise-deploy.js deploy --interactive --no-tests
```

### **🔒 Security Validation (Critical)**
```bash
# Validate configuration security before deployment
npx lego-security validate customer production

# Generate cryptographically secure keys
npx lego-security generate-key jwt 64
npx lego-security generate-key api content-skimmer

# Deploy with automatic security validation
npx lego-security deploy customer production --dry-run

# Check deployment readiness
npx lego-security check-readiness customer production
```

### **👥 Customer Configuration Management**
```bash
# Create new customer configuration from templates
npm run customer-config create-customer mycompany mycompany.com

# List all configured customers
npm run customer-config list

# Show effective configuration for customer/environment
npm run customer-config show mycompany production

# Validate customer configuration structure
npm run customer-config validate

# Get deployment command for customer
npm run customer-config deploy-command mycompany staging
```

### **Domain Management**
```bash
# List available domains
node bin/deployment/enterprise-deploy.js list

# Discover domain configuration
node bin/deployment/enterprise-deploy.js discover data-service.greatidude.com

# Validate domain setup
node bin/deployment/enterprise-deploy.js validate data-service.greatidude.com
```

### **Multi-Domain Operations**
```bash
# Deploy multiple domains
node bin/deployment/enterprise-deploy.js deploy-multi domain1.com domain2.com

# Deploy entire portfolio
node bin/deployment/enterprise-deploy.js deploy-portfolio
```

## 🔧 Environment Requirements

### **Prerequisites**
```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0
npx (comes with npm)
wrangler >= 3.0.0

# Verify installation
node --version
npm --version
npx wrangler --version
```

### **Cloudflare Setup**
1. **Cloudflare Account**: Active account with API access
2. **API Token**: Token with permissions:
   - `Zone:Read` (for domain discovery)
   - `Zone Resources:Edit` (for worker deployment)
   - `Account:Read` (optional, for enhanced features)
   - `Cloudflare D1:Edit` (optional, for database discovery)
3. **Domain Configuration**: Domains should be added to Cloudflare zones

### **Service Structure**
```
services/
├── data-service/           # Service directory
│   ├── wrangler.toml      # Cloudflare configuration
│   ├── package.json       # Service dependencies
│   └── src/
│       ├── config/domains.js  # Domain configuration
│       └── worker/index.js     # Worker entry point
```

## 🚀 Quick Start

### **1. First Time Setup**
```bash
# Clone the framework
git clone <repository-url>
cd lego-framework

# Install dependencies
npm install

# Ensure wrangler is available
npx wrangler --version
```

### **2. Cloudflare Authentication**
```bash
# Login to Cloudflare (first time only)
npx wrangler auth login

# Or set API token directly (will be prompted automatically)
# The system will securely store your token with encryption
```

### **3. Deploy a Service**
```bash
# Interactive deployment (recommended for first time)
node bin/deployment/enterprise-deploy.js deploy --interactive

# The system will:
# 1. Discover available services
# 2. Let you select a domain
# 3. Validate Cloudflare setup
# 4. Deploy the worker
# 5. Run production tests
# 6. Generate audit reports
```

### **4. Verify Deployment**
The deployment will output the worker URL. Visit it to confirm it's working:
```
✅ Deployment successful: https://your-service.your-domain.com
```

## Project Structure

```
lego-framework/
├── bin/                          # Executable scripts and CLI tools
│   ├── service-management/       # Service creation and initialization
│   ├── deployment/              # Enterprise deployment tools
│   ├── database/                # Database management tools
│   ├── portfolio/               # Multi-service portfolio management
│   └── shared/                  # Shared utility modules
│       └── config/              # Configuration management tools
│           └── customer-cli.js  # Customer configuration CLI
├── scripts/                      # PowerShell scripts and utilities
│   ├── service-management/       # Service setup scripts
│   ├── deployment/              # Deployment scripts
│   ├── testing/                 # Testing utilities
│   └── utilities/               # General utilities
├── services/                     # Generated services directory
│   ├── my-api-service/          # Individual service directories
│   ├── auth-service/            # Auto-organized by init-service
│   └── data-service/            # Each with complete Cloudflare setup
├── docs/                        # Documentation
│   ├── analysis/                # Development analysis and demos
│   ├── api/                     # API documentation
│   ├── examples/                # Usage examples
│   └── guides/                  # User guides
├── test/                        # Test suite
│   └── integration/             # Integration tests
├── src/                         # Framework source code
│   └── config/                  # Configuration management
│       ├── customers.js         # Customer configuration manager
│       ├── domains.js           # Domain configuration system
│       └── features.js          # Feature flag system
├── templates/                   # Service templates
├── config-templates/            # Configuration templates
└── config/                      # Framework configuration
    └── customers/               # Customer configuration templates
        └── template/            # Reusable customer config templates
```

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

### Customer Configuration Management

```javascript
import { CustomerConfigurationManager } from '@tamyla/lego-framework/config';

// Framework-mode customer management (uses mock values for testing)
const customerManager = new CustomerConfigurationManager();

// Create customer configuration from templates
await customerManager.createCustomer('acmecorp', 'acmecorp.com', {
  skipValidation: true,
  isFrameworkMode: true
});

// Show effective configuration
const config = customerManager.showConfig('acmecorp', 'production');

// Validate customer configurations
const validation = await customerManager.validateConfigs();

// Get deployment commands
const deployCmd = customerManager.getDeployCommand('acmecorp', 'staging');
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

## Deployment Workflow

The Lego Framework provides a clear **setup-first, deploy-second** workflow to avoid configuration dependency issues.

### Phase 1: Service Initialization (Setup)

Before deployment, initialize your service to generate required configuration files:

```bash
# Initialize a new service with configuration generation
npx lego-init my-service --type api-gateway --env development

# This creates:
# - wrangler.toml (Cloudflare Workers config)
# - src/config/domains.js (Domain configuration)
# - Validates environment variables
# - Prepares for deployment
```

### Phase 2: Deployment (Deploy)

Once initialized, deploy using the enterprise deployment system:

```bash
# Deploy to production
npx lego-deploy my-service --env production

# Multi-domain deployment
npx lego-deploy-multi api auth data --env staging

# Portfolio deployment (all domains)
npx lego-deploy-portfolio --env production
```

### Environment Variables Required

Set these before deployment:

```bash
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_ZONE_ID="your_zone_id"
export CLOUDFLARE_API_TOKEN="your_api_token"
```

### Workflow Order

1. **Init** → Generate configurations and validate setup
2. **Deploy** → Deploy with enterprise orchestration
3. **Monitor** → Use built-in auditing and rollback features

This ensures configurations exist before deployment attempts, eliminating the "expecting wrangler.toml readily available" issue for first-time deployments.

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

## � Troubleshooting

### **Common Issues & Solutions**

#### **"Service directory not found for domain"**
```bash
# Problem: No service exists for the domain
# Solution: Check available services
node bin/deployment/enterprise-deploy.js list

# Or create a new service (if service creation tools are available)
# Ensure the service has proper domain configuration in src/config/domains.js
```

#### **"API token required for domain verification"**
```bash
# Problem: No Cloudflare authentication
# Solution: The system will automatically prompt for API token
# Or manually set up wrangler auth:
npx wrangler auth login
```

#### **"D1 database discovery requires additional permissions"**
```bash
# This is informational only - deployment continues successfully
# To enable D1 discovery, update your API token with:
# - Account:Read permissions
# - Cloudflare D1:Edit permissions
```

#### **Production tests failing with ENOTFOUND**
```bash
# This is normal for new deployments during DNS propagation
# The system waits 10 seconds but some domains may need longer
# Tests failures don't prevent deployment success
```

#### **"npx command not found" on Windows**
```bash
# Problem: Command configuration for cross-platform compatibility
# Solution: The system uses validation-config.json for command mapping
# Ensure npx is in your PATH or update the config file
```

### **Debug Mode**
```bash
# Run with verbose logging
node bin/deployment/enterprise-deploy.js deploy --interactive --validation comprehensive

# Check specific domain configuration
node bin/deployment/enterprise-deploy.js discover your-domain.com
```

## �📚 Development Insights & Lessons Learned

### **Key Architecture Decisions**

#### **1. Interactive vs Hardcoded Parameters** ✅
- **Problem**: Original system required domain as command argument
- **Solution**: Added `--interactive` flag for domain selection from discovered services
- **Impact**: Much better UX, reduces deployment errors

#### **2. Cross-Platform Command Compatibility** ✅
- **Problem**: Hardcoded commands failed on different platforms (Windows vs Linux)
- **Solution**: Configurable command system via `validation-config.json`
- **Impact**: Seamless cross-platform operation

#### **3. API Token Management** ✅
- **Problem**: OAuth authentication insufficient for API operations
- **Solution**: Secure API token storage with AES-256-CBC encryption
- **Impact**: Reliable authentication with automated prompting

#### **4. Service Discovery Intelligence** ✅
- **Problem**: Expected exact directory names matching domains
- **Solution**: Smart discovery by checking `domains.js` configuration files
- **Impact**: Flexible service organization and deployment

#### **5. Real vs Mock Deployments** ✅
- **Problem**: Mock deployments provided false success with undefined URLs
- **Solution**: Actual wrangler execution with URL extraction
- **Impact**: Real deployment validation and working services

### **Production-Ready Improvements Implemented**

#### **Graceful Error Handling**
```javascript
// D1 database discovery with permission graceful degradation
if (error.message.includes('401') || error.message.includes('Unauthorized')) {
  console.log(`ℹ️ D1 database discovery requires additional API token permissions`);
  console.log(`💡 To enable D1 discovery, ensure your API token has 'Account:Read' or 'Cloudflare D1:Edit' permissions`);
} else {
  console.log(`⚠️ D1 database discovery failed: ${error.message}`);
}
```

#### **Smart Service Directory Discovery**
```javascript
// Find service directory by domain configuration rather than exact name match
for (const serviceDir of serviceDirs) {
  const domainsPath = join(servicesDir, serviceDir, 'src', 'config', 'domains.js');
  if (existsSync(domainsPath)) {
    const domainsContent = await fs.readFile(domainsPath, 'utf8');
    if (domainsContent.includes(domain)) {
      servicePath = join(servicesDir, serviceDir);
      break;
    }
  }
}
```

#### **Production Test Resilience**
```javascript
// Wait for deployment propagation before running tests
if (options.tests !== false && deploymentResult.url) {
  this.logOutput('⏳ Waiting for deployment to propagate...', 'info');
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
  
  const testResult = await this.modules.productionTester.runProductionTests(deploymentUrl, options);
}
```

## 🔮 Future Improvements

### **Phase 1: Service Autonomy** 
**Goal**: Each service becomes completely autonomous

#### **Service-Level Integration**
```javascript
// Each service gets its own deployment module
service-repo/
├── deployment/
│   ├── deploy.js           # Service-specific deployment
│   ├── config.js          # Service deployment config
│   └── validators.js      # Service validation logic
├── src/config/domains.js  # Multi-domain configuration
└── package.json           # Includes lego-framework as dependency
```

#### **Reusable Component Library**
```javascript
import { 
  DomainDiscovery, 
  CloudflareManager, 
  DeploymentValidator,
  ProductionTester 
} from '@tamyla/lego-framework';

// Each service imports only what it needs
const discovery = new DomainDiscovery({ domain: 'my-service.domain.com' });
await discovery.validateCloudflareSetup();
```

### **Phase 2: Advanced Orchestration**
- **Dependency Resolution**: Services declare dependencies on other services
- **Blue-Green Deployments**: Zero-downtime deployment patterns
- **Canary Releases**: Gradual rollout with automatic monitoring
- **Multi-Region Deployment**: Global service distribution

### **Phase 3: Enterprise Features**
- **Service Mesh Integration**: Inter-service communication patterns
- **Centralized Monitoring**: Unified observability across all services
- **Policy Management**: Governance and compliance automation
- **Cost Optimization**: Resource usage monitoring and optimization

### **Current Framework Purpose**

This framework currently serves as:

1. **Development Environment**: Understanding deployment workflows and requirements
2. **Component Testing**: Validating integration patterns and error handling
3. **Template Generation**: Creating reusable patterns for service codebases
4. **Integration Standards**: Defining how autonomous services should operate

**Next Evolution**: Extract successful patterns into lightweight libraries that individual services can import and use independently.

## 🎉 **Recent Major Enhancement: Customer Configuration Management**

The Lego Framework has successfully incorporated **enterprise-grade customer configuration management** capabilities, transforming it from a single-service framework into a **multi-customer, multi-environment enterprise platform**.

### ✅ **Successfully Incorporated Features**

#### **👥 Customer Isolation & Management**
- **Multi-customer support** with isolated configuration namespaces
- **Template-based customer onboarding** from reusable configuration templates
- **Customer registry** with automatic domain registration
- **Framework-safe design** using mock values for development/testing

#### **🏗️ Template-Driven Architecture**
- **Environment-specific templates** (development.env.template, staging.env.template, production.env.template)
- **Variable substitution** with customer-specific placeholders (`{{CUSTOMER_NAME}}`, `{{DOMAIN}}`, etc.)
- **Automated configuration generation** from templates to production-ready configs
- **Template inheritance** supporting cross-customer and cross-environment patterns

#### **🔗 Framework Integration**
- **Domain system integration** - customers automatically registered as domains
- **Feature flag integration** - customer-specific features managed through existing system
- **Validation framework integration** - customer configs validated using existing patterns
- **CLI tool integration** - customer management accessible via `npm run customer-config`

#### **🛠️ Developer Experience**
- **CLI tools**: `create-customer`, `show`, `validate`, `list`, `deploy-command`
- **Programmatic API**: Full TypeScript/JavaScript API for customer management
- **Framework mode**: Mock-friendly for development without real infrastructure
- **Service migration path**: Generated configs can be copied to service repositories

### 🚀 **Impact & Benefits**

#### **For Framework Users**
- **Zero breaking changes** - all existing functionality preserved
- **Enhanced capabilities** - framework now supports enterprise customer scenarios
- **Better testing** - customer scenarios can be tested in framework environment
- **Migration ready** - smooth path from framework testing to service implementation

#### **For Service Developers**
- **Customer-ready services** - framework provides patterns for multi-customer support
- **Automated onboarding** - customer setup becomes template-driven process
- **Consistent patterns** - same customer management approach across all services
- **Reduced duplication** - shared customer configuration logic

#### **For Enterprise Teams**
- **Multi-customer support** - single framework handles multiple customer deployments
- **Environment isolation** - separate configs for dev/staging/production per customer
- **Scalable architecture** - customer management scales with business growth
- **Governance & compliance** - centralized customer configuration management

### 📊 **Technical Implementation Highlights**

#### **Clean Architecture**
- **Separation of concerns**: Framework provides tools, services manage customer data
- **Mock-friendly**: Framework mode uses placeholders, service mode uses real values
- **Composable**: Customer management integrates with existing domain/feature systems
- **Testable**: Full test coverage without requiring real Cloudflare infrastructure

#### **Developer Workflow**
```bash
# Framework development/testing
npm run customer-config create-customer testcorp testcorp.com
npm run customer-config show testcorp production

# Service implementation (copy generated configs)
cp config/customers/testcorp/* my-service/src/config/customers/testcorp/
# Then customize for production infrastructure
```

#### **API Design**
```javascript
// Framework mode (mock values)
const customerManager = new CustomerConfigurationManager();
await customerManager.createCustomer('acmecorp', 'acmecorp.com', {
  skipValidation: true,
  isFrameworkMode: true
});

// Service mode (real infrastructure)
const customerManager = new CustomerConfigurationManager();
await customerManager.createCustomer('acmecorp', 'acmecorp.com', {
  accountId: 'real-cloudflare-account-id',
  zoneId: 'real-cloudflare-zone-id'
});
```

### 🎯 **Mission Accomplished**

The Lego Framework has successfully evolved from a **single-service deployment framework** into a **comprehensive enterprise platform** that supports:

- ✅ **Multi-service orchestration** (existing)
- ✅ **Multi-environment deployment** (existing)  
- ✅ **Multi-customer configuration** (newly added)
- ✅ **Enterprise-grade security** (existing)
- ✅ **Developer experience** (enhanced)

This enhancement maintains backward compatibility while significantly expanding the framework's capabilities for enterprise scenarios. The customer configuration management system is now a core, production-ready feature that enables the framework to support complex, multi-customer enterprise deployments.

**The Lego Framework is now ready to "snap together" not just services, but entire customer ecosystems! 🧱➡️🏢**

## Scripts and Tools

The Lego Framework includes a comprehensive set of scripts and command-line tools, organized by functionality.

### Directory Structure

```
scripts/
├── service-management/     # Service creation and setup
├── deployment/            # Deployment scripts
├── testing/               # Testing utilities
└── utilities/             # General utilities

bin/
├── service-management/    # Service creation tools
├── deployment/            # Enterprise deployment CLI
├── database/              # Database management
├── portfolio/             # Multi-service management
└── shared/                # Shared utility modules
```

### Service Management

**Create services with auto-generated configurations:**
```bash
# Initialize service with multi-domain support
node bin/service-management/init-service.js my-service \
  --type api-gateway \
  --domains "api.example.com:account1:zone1,staging.example.com:account2:zone2"

# Create service from template
node bin/service-management/create-service.js my-service --type data-service
```

**Interactive setup:**
```powershell
.\scripts\service-management\setup-interactive.ps1 -ServiceName my-service
```

### Deployment

**Enterprise deployment:**
```bash
node bin/deployment/enterprise-deploy.js deploy --service my-service --environment production
```

**Domain-specific deployment:**
```powershell
.\scripts\deployment\deploy-domain.ps1 -DomainName api.example.com -Environment production
```

### Testing

**Run tests:**
```powershell
.\scripts\testing\test.ps1
.\scripts\testing\test-first.ps1 -ServiceName my-service
```

### Database Management

**Database operations:**
```bash
node bin/database/enterprise-db-manager.js migrate --service my-service
node bin/database/enterprise-db-manager.js backup --database my-db
```

### Portfolio Management

**Multi-service orchestration:**
```bash
node bin/portfolio/portfolio-manager.js create --name my-portfolio
node bin/portfolio/portfolio-manager.js deploy --portfolio my-portfolio --environment production
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