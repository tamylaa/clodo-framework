# Lego Framework - Integration Guide for Service Developers

## Overview

The Lego Framework enables **service autonomy** - each service can discover, validate, and deploy itself independently to Cloudflare Workers + D1. This guide explains how to properly integrate the framework into your services.

## Architecture Overview

### Two Runtime Environments

**🚀 Deployment Time (Your Machine):**
- Node.js environment during development/build
- Uses: File system, child processes, network calls
- Components: Orchestration, validation, deployment scripts
- Purpose: Build and deploy your service

**☁️ Runtime (Cloudflare Workers):**
- V8 isolate environment
- Limitations: No file system, no child processes
- Components: Data services, routing, schema validation
- Purpose: Handle requests in production

### Service Autonomy Philosophy

> **Each service discovers and deploys itself independently**

Your service should **embed deployment capabilities**, not call external CLI tools.

## Integration Patterns

### ❌ WRONG: Calling Bin Scripts Externally
```bash
# DON'T DO THIS - Bin scripts have import issues when called from node_modules
npm install @tamyla/lego-framework
# Then in package.json:
"scripts": {
  "deploy": "node node_modules/@tamyla/lego-framework/bin/enterprise-deploy.js deploy --interactive"
}
```

### ✅ CORRECT: Embed Deployment Logic

**1. Add Framework as Dependency:**
```json
// package.json
{
  "name": "my-data-service",
  "dependencies": {
    "@tamyla/lego-framework": "^1.3.2"
  },
  "scripts": {
    "deploy": "node scripts/deploy.js",
    "dev": "node scripts/dev.js"
  }
}
```

**2. Create Service Structure:**
```
my-data-service/
├── src/
│   ├── config/
│   │   ├── domains.js     # Domain configuration
│   │   └── schema.js      # Data models
│   └── worker/
│       └── index.js       # Cloudflare Worker entry
├── scripts/
│   ├── deploy.js          # Deployment script
│   └── dev.js            # Development server
├── wrangler.toml         # Cloudflare config
└── package.json
```

**3. Domain Configuration:**
```javascript
// src/config/domains.js
export const domains = {
  'my-service.com': {
    name: 'my-service',
    displayName: 'My Data Service',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    domains: {
      production: 'api.my-service.com',
      staging: 'staging-api.my-service.com'
    },
    features: {
      dataService: true,
      logging: true,
      cors: true
    }
  }
};
```

**4. Schema Definition:**
```javascript
// src/config/schema.js
import { schemaManager } from '@tamyla/lego-framework/schema';

schemaManager.registerModel('users', {
  columns: {
    id: { type: 'string', primary: true },
    email: { type: 'string', required: true, unique: true },
    name: { type: 'string', required: true },
    created_at: { type: 'datetime', default: 'now' },
    updated_at: { type: 'datetime', default: 'now' }
  }
});

schemaManager.registerModel('posts', {
  columns: {
    id: { type: 'string', primary: true },
    user_id: { type: 'string', required: true, references: 'users.id' },
    title: { type: 'string', required: true },
    content: { type: 'text' },
    created_at: { type: 'datetime', default: 'now' }
  }
});
```

**5. Cloudflare Worker (Runtime):**
```javascript
// src/worker/index.js
import { initializeService, COMMON_FEATURES } from '@tamyla/lego-framework';
import { GenericDataService } from '@tamyla/lego-framework/services';
import { EnhancedRouter } from '@tamyla/lego-framework/routing';
import { domains } from '../config/domains.js';
import '../config/schema.js'; // Register schemas

export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize service context
      const service = initializeService(env, domains);

      // Create data services
      const userService = new GenericDataService(env.DB, 'users');
      const postService = new GenericDataService(env.DB, 'posts');

      // Create router
      const router = new EnhancedRouter();

      // Health check
      router.get('/health', async () => {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: service.domain,
          environment: service.environment,
          features: service.features,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      });

      // API routes
      router.get('/api/users', async () => {
        const users = await userService.findAll();
        return new Response(JSON.stringify(users), {
          headers: { 'Content-Type': 'application/json' }
        });
      });

      router.post('/api/users', async (request) => {
        const data = await request.json();
        const user = await userService.create(data);
        return new Response(JSON.stringify(user), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      router.get('/api/users/:id', async (request, params) => {
        const user = await userService.findById(params.id);
        if (!user) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify(user), {
          headers: { 'Content-Type': 'application/json' }
        });
      });

      // Handle request
      return await router.handle(request, env, ctx);

    } catch (error) {
      console.error('Worker error:', error);

      // Log errors if logging is enabled
      if (service?.features?.includes(COMMON_FEATURES.LOGGING)) {
        console.error('Request failed:', request.url, error.message);
      }

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
```

**6. Deployment Script (Build Time):**
```javascript
// scripts/deploy.js
import { MultiDomainOrchestrator, DeploymentValidator, WranglerDeployer } from '@tamyla/lego-framework/orchestration';
import { DomainDiscovery } from '@tamyla/lego-framework/config/discovery';
import { askChoice, askUser } from '@tamyla/lego-framework/utils/interactive';
import { domains } from '../src/config/domains.js';

async function deploy() {
  try {
    console.log('🚀 Lego Framework Deployment');
    console.log('==========================');

    // Select environment
    const environment = await askChoice(
      'Select deployment environment:',
      ['development', 'staging', 'production'],
      2 // Default to production
    );

    // Select domain
    const domainNames = Object.keys(domains);
    const selectedDomain = await askChoice(
      'Select domain to deploy:',
      domainNames,
      0
    );
    const domain = domainNames[selectedDomain];

    console.log(`\n🌍 Deploying ${domain} to ${environment}`);
    console.log('=====================================');

    // Initialize deployment components
    const discovery = new DomainDiscovery({
      enableCaching: true
    });

    const validator = new DeploymentValidator({
      validationLevel: 'comprehensive',
      environment
    });

    const orchestrator = new MultiDomainOrchestrator({
      domains: [domain],
      environment,
      dryRun: false,
      parallelDeployments: 1
    });

    // Validate domain
    console.log('🔍 Validating domain configuration...');
    await discovery.initializeDiscovery();
    const domainConfig = await discovery.getDomainConfig(domain);

    if (!domainConfig) {
      throw new Error(`Domain ${domain} not found in configuration`);
    }

    // Validate deployment readiness
    console.log('✅ Running pre-deployment validation...');
    const validation = await validator.validateDeploymentReadiness(domain, {
      environment,
      skipEndpointCheck: environment === 'development'
    });

    if (!validation.valid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Deploy
    console.log('🚀 Starting deployment...');
    await orchestrator.initialize();
    const result = await orchestrator.deploySingleDomain(domain);

    console.log('✅ Deployment successful!');
    console.log(`🌐 Service URL: ${result.url}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
```

**7. Development Script:**
```javascript
// scripts/dev.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Lego Framework Development Server');
console.log('===========================================');

// Start Wrangler dev server
const wrangler = spawn('npx', ['wrangler', 'dev'], {
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

wrangler.on('close', (code) => {
  console.log(`\nWrangler exited with code ${code}`);
});

wrangler.on('error', (error) => {
  console.error('Failed to start Wrangler:', error);
  process.exit(1);
});
```

## Configuration Files

### wrangler.toml
```toml
name = "my-data-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "my-data-service-db"
database_id = "your-database-id"

[build]
command = "npm run build"
```

### Environment Variables
```bash
# Required for deployment
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_ZONE_ID="your_zone_id"
export CLOUDFLARE_API_TOKEN="your_api_token"

# Optional
export ENVIRONMENT="production"
```

## Usage Commands

### Development
```bash
# Start development server
npm run dev

# Test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/api/users
```

### Deployment
```bash
# Deploy to production
npm run deploy

# Deploy to staging
ENVIRONMENT=staging npm run deploy
```

### Validation
```bash
# Validate configuration
node -e "
import { DeploymentValidator } from '@tamyla/lego-framework/orchestration';
const validator = new DeploymentValidator();
validator.validateDeploymentReadiness('my-service.com').then(console.log);
"
```

## Common Mistakes to Avoid

### 1. Don't Call Bin Scripts Externally
```javascript
// ❌ WRONG
"scripts": {
  "deploy": "node node_modules/@tamyla/lego-framework/bin/enterprise-deploy.js deploy --interactive"
}

// ✅ CORRECT
"scripts": {
  "deploy": "node scripts/deploy.js"
}
```

### 2. Don't Use Deployment Components in Workers
```javascript
// ❌ WRONG - Won't work in Cloudflare Workers
import { MultiDomainOrchestrator } from '@tamyla/lego-framework/orchestration';

export default {
  fetch(request, env) {
    const orchestrator = new MultiDomainOrchestrator(); // Uses fs, child_process
  }
}

// ✅ CORRECT - Use only runtime components
import { GenericDataService } from '@tamyla/lego-framework/services';
```

### 3. Always Handle Async Operations
```javascript
// ❌ WRONG
router.get('/api/data', () => {
  const data = await dataService.findAll(); // await in non-async function
  return new Response(JSON.stringify(data));
});

// ✅ CORRECT
router.get('/api/data', async () => {
  const data = await dataService.findAll();
  return new Response(JSON.stringify(data));
});
```

### 4. Always Return Response Objects
```javascript
// ❌ WRONG
export default {
  fetch(request, env) {
    return { status: 'ok' }; // Not a Response object
  }
}

// ✅ CORRECT
export default {
  fetch(request, env) {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## Component Reference

### Runtime Components (Worker-Compatible)
- `initializeService()` - Service context initialization
- `GenericDataService` - D1 database operations
- `schemaManager` - Data validation and modeling
- `EnhancedRouter` - HTTP request routing
- `COMMON_FEATURES` - Feature flag constants

### Deployment Components (Build-Time Only)
- `MultiDomainOrchestrator` - Deployment orchestration
- `DeploymentValidator` - Pre-deployment validation
- `DomainDiscovery` - Cloudflare domain discovery
- `WranglerDeployer` - **Intelligent wrangler CLI execution with auto-discovery**
- `ProductionTester` - Post-deployment testing

## Advanced WranglerDeployer Features

The `WranglerDeployer` is designed to be maximally generic and intelligent:

### 🔍 **Automatic Configuration Discovery**
- **Multi-config support**: Automatically detects `wrangler.toml` vs `config/wrangler.toml`
- **Environment detection**: Discovers environment-specific configurations
- **Service information**: Extracts worker names, routes, and settings from config files

### 🌍 **Intelligent Environment Detection**
```javascript
// Automatically detects environment from:
const deployer = new WranglerDeployer();
// - Environment variables (NODE_ENV, ENVIRONMENT)
// - Git branch (main/master → production, develop → development)
// - Cloudflare Pages branch (CF_PAGES_BRANCH)
console.log(deployer.environment); // 'production', 'staging', or 'development'
```

### 🔧 **Real-time Environment Variable Integration**
Automatically includes relevant environment variables in deployments:
```javascript
// Cloudflare variables
CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CF_API_TOKEN

// Service variables  
SERVICE_DOMAIN, SERVICE_NAME, LOG_LEVEL, CORS_ORIGINS
DATA_SERVICE_URL, AUTH_SERVICE_URL, CONTENT_STORE_SERVICE_URL

// Environment-specific
PRODUCTION_URL, STAGING_DOMAIN, CF_DEVELOPMENT_TOKEN
```

### 📋 **Smart URL Extraction**
Multiple strategies for extracting deployment URLs:
1. **Direct parsing** from wrangler output patterns
2. **Route-based** URLs from wrangler.toml configuration  
3. **Worker name construction** for workers.dev domains
4. **Environment-aware** URL validation

### ✅ **Enhanced Validation**
```javascript
const validation = await deployer.validateWranglerSetup('production');
// Returns detailed config info, account details, and actionable suggestions
```

## Intelligent Deployment Example

```javascript
import { WranglerDeployer } from '@tamyla/lego-framework/deployment';

async function deploy() {
  // Create deployer - automatically detects environment and service info
  const deployer = new WranglerDeployer({
    cwd: process.cwd(),
    timeout: 300000
  });

  console.log(`🌍 Detected environment: ${deployer.environment}`);
  console.log(`📦 Service: ${deployer.serviceInfo.name} v${deployer.serviceInfo.version}`);

  // Validate setup with intelligent discovery
  const validation = await deployer.validateWranglerSetup(deployer.environment);
  if (!validation.valid) {
    console.error('❌ Setup issues:', validation.error);
    console.log('💡 Suggestions:', validation.suggestions);
    return;
  }

  // Deploy with automatic configuration discovery
  const result = await deployer.deploy(deployer.environment);
  
  console.log(`✅ Deployed to: ${result.url}`);
  console.log(`⏱️ Duration: ${result.duration}ms`);
  console.log(`🔧 Config used: ${result.config.configPath}`);
}
```

## Troubleshooting

### "require is not defined"
- **Cause**: Using deployment components in Worker runtime
- **Fix**: Only use runtime components in `src/worker/index.js`

### "Cannot read properties of undefined (reading 'valid')"
- **Cause**: Validator method not returning expected result
- **Fix**: Ensure proper error handling in deployment scripts

### "Service directory not found"
- **Cause**: Domain configuration mismatch
- **Fix**: Verify `src/config/domains.js` has correct domain entries

### Import Errors
- **Cause**: Wrong import paths or missing dependencies
- **Fix**: Use exact import paths from framework documentation

### "Environment auto-detection failed"
- **Cause**: WranglerDeployer couldn't determine the target environment
- **Fix**: Set explicit environment variables or pass environment to constructor
```bash
export ENVIRONMENT=production
# or
export NODE_ENV=production
```

### "Configuration discovery failed"
- **Cause**: No wrangler.toml found or parsing failed
- **Fix**: Ensure wrangler.toml exists and has correct format
```bash
wrangler init  # Creates basic wrangler.toml
# or create config/wrangler.toml for environment-specific config
```

### "URL extraction failed"
- **Cause**: Wrangler output format changed or no valid URL found
- **Fix**: Check wrangler output manually or ensure routes are defined in wrangler.toml

## Best Practices

1. **Service Autonomy**: Each service manages its own deployment
2. **Configuration First**: Define domains and schemas before implementing logic
3. **Error Handling**: Always wrap routes in try-catch blocks
4. **Feature Flags**: Use `service.features` for conditional logic
5. **Validation**: Validate data before database operations
6. **Logging**: Use feature guards for logging in production

## Migration from External Scripts

If you're currently calling bin scripts externally:

1. **Remove external script calls** from package.json
2. **Add framework as dependency** in package.json
3. **Create internal deployment script** in `scripts/deploy.js`
4. **Move domain configuration** to `src/config/domains.js`
5. **Update import statements** to use framework modules
6. **Test deployment** from your service directory

This approach gives you full control over deployment logic while maintaining the benefits of the Lego Framework's enterprise features.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\docs\INTEGRATION_GUIDE.md