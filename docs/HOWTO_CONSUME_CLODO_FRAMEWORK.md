# How to Consume Clodo Framework

## 🎯 What Clodo Framework Does

### Middleware Architecture (v4.1+)

Starting in v4.1 (contract-first default), Clodo Framework generates lightweight middleware contracts and uses a shared runtime composition model to reduce duplication across services. Key points:

- **Default Strategy**: `contract` — services receive a minimal class skeleton that implements the `IServiceMiddleware` contract and an easy `registerMiddleware(registry, serviceName)` helper.
- **Legacy Compatibility**: Use the CLI flag `--middleware-strategy legacy` during `create` to generate the legacy `createServiceMiddleware()` factory, or run the migration utility `scripts/migration/migrate-middleware-legacy-to-contract.js <servicePath> [serviceName]` to convert existing services.
- **Runtime**: Generated workers import a small middleware runtime (`MiddlewareRegistry` + `MiddlewareComposer`) and support both the new contract and the legacy factory via an adapter.

Benefit: smaller bundles, clearer contracts, easier testing, and incremental migrations.



**Clodo Framework** is your automation powerhouse for Cloudflare Workers + D1 development. It eliminates manual toil by providing:

- **🔄 Automation**: One-command service creation with 28+ production-ready files
- **🎼 Orchestration**: Intelligent multi-domain service management and deployment
- **⚙️ Configuration**: Smart defaults with environment-specific overrides
- **✅ Validation**: Built-in quality checks and deployment verification
- **📏 Consistency**: Standardized patterns across all your services

Whether you're a newbie learning Cloudflare Workers or an expert managing enterprise deployments, Clodo Framework ensures you ship reliable, scalable services faster.

## 🚀 Quick Start by Experience Level

### Newbie (First Time with Cloudflare Workers)
```bash
# Install and create your first service
npm install -g @tamyla/clodo-framework
npx clodo-service create
# Follow the interactive prompts - no Cloudflare knowledge needed!
```

**What happens**: Framework generates a complete service with database, API endpoints, deployment scripts, and documentation.

### Intermediate (Know Cloudflare basics)
```bash
# Create a specific service type
npx clodo-service create --type data-service --name my-api --domain myapp.com

# Deploy it
npx clodo-service deploy --environment production
```

**What you get**: Pre-configured service with validation, security, and monitoring built-in.

### Expert (Need advanced orchestration)
```javascript
import { Clodo } from '@tamyla/clodo-framework';

// Programmatic multi-service orchestration
const services = await Clodo.createService({
  name: 'api-gateway',
  type: 'api-gateway',
  domain: 'api.example.com',
  environment: 'production'
});

await Clodo.deploy({
  servicePath: './api-gateway',
  environment: 'production'
});
```

**Why it matters**: Maintains consistency across complex architectures while giving you full control.

## 🧠 Core Concepts You Need to Understand

### Automation: From Idea to Deployed Service
Clodo Framework automates the entire service lifecycle:

1. **Input Collection**: Smart prompts gather requirements
2. **Code Generation**: Creates 28+ files instantly
3. **Configuration**: Auto-generates environment configs
4. **Validation**: Ensures everything works before deploy
5. **Deployment**: One-command production deployment

**Benefit**: What takes days manually happens in minutes.

### Orchestration: Managing Service Ecosystems
Handle complex multi-service architectures:

- **Multi-Domain Support**: Deploy across different domains
- **Service Dependencies**: Automatic dependency management
- **Cross-Service Communication**: Built-in service discovery
- **Environment Consistency**: Same patterns across dev/staging/prod

**Benefit**: Scale from single service to enterprise architecture seamlessly.

### Configuration: Smart Defaults + Overrides
- **Convention over Configuration**: Sensible defaults for 80% of cases
- **Environment-Specific**: Automatic config generation per environment
- **Validation**: Catches config errors before deployment
- **Inheritance**: Share configs across similar services

**Benefit**: No more "works on my machine" issues.

### Validation: Quality Assurance Built-In
- **Pre-Deploy Checks**: Structure, dependencies, security
- **Runtime Validation**: Service health and functionality
- **Deployment Verification**: Confirms successful deployment
- **Continuous Monitoring**: Health checks and diagnostics

**Benefit**: Catch issues early, deploy with confidence.

### Consistency: Standardized Excellence
- **Code Patterns**: Same structure across all services
- **Naming Conventions**: Predictable resource names
- **Security Standards**: Built-in security best practices
- **Documentation**: Auto-generated API docs and guides

**Benefit**: Team can focus on business logic, not infrastructure.

## 📋 Usage Patterns by Scenario

### Scenario 1: Building a New Service from Scratch
```bash
# Interactive creation (recommended for learning)
npx clodo-service create

# Or programmatic for CI/CD
import { Clodo } from '@tamyla/clodo-framework';
await Clodo.createService({
  name: 'user-service',
  type: 'data-service',
  domain: 'users.myapp.com'
});
```

### Scenario 2: Deploying to Multiple Environments
```bash
# Development
npx clodo-service deploy --environment development

# Staging with validation
npx clodo-service validate
npx clodo-service deploy --environment staging

# Production with extra checks
npx clodo-service assess --service-path ./my-service
npx clodo-service deploy --environment production
```

### Scenario 3: Managing Multiple Services
```javascript
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/orchestration';

const orchestrator = new MultiDomainOrchestrator();
await orchestrator.deployMultiple([
  { path: './api', domain: 'api.example.com' },
  { path: './auth', domain: 'auth.example.com' },
  { path: './files', domain: 'files.example.com' }
]);
```

### Scenario 4: Customizing Generated Services
```javascript
// Use the framework's components for custom logic
import { GenericDataService } from '@tamyla/clodo-framework/services';
import { SchemaManager } from '@tamyla/clodo-framework/schema';

const service = new GenericDataService();
const schema = new SchemaManager();

// Add your custom business logic here
```

## 🛠️ Installation & Setup

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (or yarn/pnpm)
- **Cloudflare Account**: Active account with Workers and D1 enabled
- **Operating System**: Windows, macOS, or Linux

### Basic Installation
```bash
# For one-time use
npx @tamyla/clodo-framework create

# For repeated use
npm install -g @tamyla/clodo-framework
```

### Environment Setup
The framework auto-detects your Cloudflare credentials, but you can configure explicitly:

```bash
# Initialize configuration
npx clodo-service init-config

# Or set environment variables
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### Verification
```bash
# Check installation
npx clodo-service --version

# Test simple API
node -e "import { Clodo } from '@tamyla/clodo-framework'; console.log(Clodo.getInfo())"
```

### Version Information
- **Current Version**: 4.0.12
- **Node.js Compatibility**: 18.0.0+
- **Cloudflare Workers Runtime**: Latest
- **D1 Database**: Fully supported

## 🔧 Available Tools & Commands

### CLI Tools
- **`clodo-service`**: Main CLI for service lifecycle management
- **`clodo-simple`**: Streamlined CLI for basic operations
- **`clodo-security`**: Security-focused operations

### Service Types Available
The framework supports these service types:
- **`data-service`**: CRUD operations with D1 database integration
- **`auth-service`**: Authentication and authorization services
- **`content-service`**: Content management and delivery
- **`api-gateway`**: API routing and orchestration
- **`generic`**: Custom service template for specialized needs

### Key Commands
```bash
# Service Creation & Management
npx clodo-service create          # Interactive service creation
npx clodo-service validate        # Validate service configuration
npx clodo-service update          # Update existing service

# Deployment & Orchestration
npx clodo-service deploy          # Deploy service
npx clodo-service diagnose        # Troubleshoot issues
npx clodo-service assess          # Capability assessment

# Utilities
npx clodo-service init-config     # Initialize configuration
npx clodo-service list-types      # Show available service types
```

### Programmatic API
```javascript
import { Clodo } from '@tamyla/clodo-framework';

// Simple operations
await Clodo.createService(options);
await Clodo.deploy(options);
await Clodo.validate(options);

// Advanced orchestration
import { ServiceOrchestrator } from '@tamyla/clodo-framework/service-management';
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/orchestration';
```

## 🎓 Learning Path

### Level 1: Getting Started (30 minutes)
- Run `npx clodo-service create`
- Follow prompts to create your first service
- Deploy with `npx clodo-service deploy`
- **Goal**: Have a working Cloudflare service

### Level 2: Understanding Automation (1 hour)
- Learn what files are generated (check the 28+ files)
- Customize generated services (modify handlers, middleware)
- Use validation commands (`npx clodo-service validate`)
- **Goal**: Understand and modify generated code

### Level 3: Orchestration Basics (2 hours)
- Create multiple services
- Deploy to different environments (dev/staging/prod)
- Use the simple programmatic API
- **Goal**: Manage multi-service applications

### Level 4: Advanced Orchestration (4+ hours)
- Multi-domain deployments
- Custom service types and templates
- Integration with existing workflows
- **Goal**: Enterprise-scale deployments

### Level 5: Expert Customization (Ongoing)
- Extend framework components
- Build custom service templates
- Contribute to the framework
- **Goal**: Framework expert and contributor

## 💰 Cost & Licensing

### Framework Licensing
- **License**: MIT License (free and open source)
- **Usage**: Commercial and personal use allowed
- **Support**: Community-driven (GitHub issues/discussions)

### Cloudflare Costs
The framework itself is free, but deploying services incurs Cloudflare costs:
- **Workers**: $0.30 per million requests (first 10 million free)
- **D1 Database**: $0.75 per GB stored + $1.25 per million queries
- **Domains**: Standard Cloudflare domain pricing

**Tip**: Start with Cloudflare's free tier for development and testing.

## 🔗 Integrations & CI/CD

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Create Service
  run: npx clodo-service create --type data-service --name api --domain myapp.com

- name: Validate Service
  run: npx clodo-service validate

- name: Deploy to Production
  run: npx clodo-service deploy --environment production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Popular Framework Integrations
- **Next.js**: Use as API backend for serverless functions
- **Remix**: Deploy data services alongside Remix applications
- **Astro**: Content services for static site generation
- **SvelteKit**: API services for Svelte applications

## 🌐 Community & Support

### Getting Help
- **📖 Documentation**: This guide and generated service READMEs
- **🐛 Issues**: [GitHub Issues](https://github.com/tamyla/clodo-framework/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/tamyla/clodo-framework/discussions)
- **📧 Email**: For enterprise support inquiries

### Contributing
- **Code**: PRs welcome for bug fixes and features
- **Documentation**: Help improve guides and examples
- **Templates**: Submit new service templates
- **Testing**: Add test cases and integration tests

## 📚 API Reference

### Public Exports
- `@tamyla/clodo-framework` - Simple API (recommended)
- `@tamyla/clodo-framework/service-management` - Service creation & orchestration
- `@tamyla/clodo-framework/orchestration` - Multi-domain management
- `@tamyla/clodo-framework/deployment` - Deployment utilities
- `@tamyla/clodo-framework/security` - Security components
- `@tamyla/clodo-framework/config` - Configuration management

### Simple API Methods
- `Clodo.createService(options)` - Create new service
- `Clodo.deploy(options)` - Deploy service
- `Clodo.validate(options)` - Validate service
- `Clodo.getInfo()` - Framework information

## 🎯 Best Practices

### For Teams
- Use consistent naming conventions
- Leverage environment-specific configurations
- Run validation in CI/CD pipelines
- Document customizations

### For Production
- Always run validation before deployment
- Use staging environments for testing
- Monitor deployed services health
- Keep framework updated

### For Development
- Use local development environment
- Test services individually before orchestration
- Leverage auto-generated documentation
- Customize incrementally

---

**Remember**: Clodo Framework handles the complexity so you can focus on your business logic. Start simple, scale with confidence!
- docs/HOWTO_CONSUME_CLODO_FRAMEWORK.md (this file)
- README.md — add a short link & one-line example (CLI and import). 
- CHANGELOG.md — add an entry describing the consumer docs, and the release note that packaging fixes were applied (e.g., v4.0.13: fixed dist import paths, added packaged-artifact smoke test).
- clodo.dev website — add a "Consume" landing page that mirrors this content and includes CLI and programmatic examples.
- Release notes / GitHub release — include the same consumer-facing bullets.

## 11) Suggested release note (short)
```
Fix: packaging & consumer experience
- Fix dist import paths that caused runtime errors for installed packages (ERR_MODULE_NOT_FOUND).
- Add pre-publish packaged-artifact smoke tests to avoid regressions.
- Document "How to consume clodo-framework" with clear CLI and library usage.
```

---

**Remember**: Clodo Framework handles the complexity so you can focus on your business logic. Start simple, scale with confidence!