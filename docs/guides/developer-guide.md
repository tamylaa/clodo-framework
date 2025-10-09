# Lego Framework - Comprehensive Developer Guide

## Overview

The Lego Framework is a comprehensive toolkit for building enterprise-grade software architecture on Cloudflare Workers + D1. It enables rapid development of autonomous, domain-specific services while maintaining consistency and reusability across your ecosystem.

This guide is designed for external developers who want to leverage the full potential of the Lego Framework in their applications. It focuses on public APIs and best practices, while avoiding internal implementation details that could cause confusion.

## Table of Contents

1. [Installation](#installation)
2. [Architecture Overview](#architecture-overview)
3. [Creating Your First Service](#creating-your-first-service)
4. [Domain Configuration](#domain-configuration)
5. [Schema Management](#schema-management)
6. [Building Worker Code](#building-worker-code)
7. [Deployment](#deployment)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

## Installation

### Prerequisites

- **Node.js**: 18.0.0 or later
- **npm**: 8.0.0 or later
- **Cloudflare Account**: With API access
- **Wrangler CLI**: For Cloudflare Workers development
- **TypeScript**: 5.0.0 or later (recommended for enhanced development experience)

```bash
# Install Wrangler globally
npm install -g wrangler
wrangler login

# Optional: Install TypeScript for type safety
npm install -g typescript
```

### Install Lego Framework

```bash
# Install as a dependency in your project
npm install @tamyla/clodo-framework

# Or install globally for CLI tools
npm install -g @tamyla/clodo-framework
```

## Architecture Overview

The Lego Framework operates in two distinct runtime environments:

### 🚀 Deployment Time (Your Development Machine)
- **Environment**: Node.js with full filesystem and network access
- **Purpose**: Build, validate, and deploy your service
- **Components**: Orchestration, validation, deployment logic
- **Limitations**: None (full Node.js capabilities)

### ☁️ Runtime (Cloudflare Workers)
- **Environment**: V8 isolate with limited APIs
- **Purpose**: Handle production requests
- **Components**: Data services, routing, business logic
- **Limitations**: No filesystem, no child processes, limited network

**Key Principle**: Each service should embed its deployment capabilities rather than relying on external CLI tools.

## TypeScript Support

The Lego Framework provides comprehensive TypeScript support with 500+ lines of type definitions for complete type safety and enhanced developer experience.

### **TypeScript Benefits**
- **Complete Type Coverage**: All APIs are fully typed with comprehensive interfaces
- **IDE Integration**: Full IntelliSense, auto-completion, and refactoring support
- **Enhanced Reliability**: Catch errors at compile-time rather than runtime
- **Better Documentation**: Self-documenting code with type hints

### **Using with TypeScript**
```typescript
import { 
  SchemaManager, 
  GenericDataService, 
  EnhancedRouter,
  CustomerConfigurationManager,
  ValidationResult,
  FieldConfig 
} from '@tamyla/clodo-framework';

// Fully typed schema definition
const userSchema: SchemaDefinition = {
  tableName: 'users',
  columns: {
    id: { type: 'string', primaryKey: true },
    email: { type: 'string', required: true, unique: true },
    name: { type: 'string', required: true }
  }
};

// Type-safe service instantiation
const userService = new GenericDataService(d1Client, 'users');
const router = new EnhancedRouter(d1Client);
```

### **Type Definitions Available**
- `SchemaDefinition` - Data model schemas
- `ValidationResult` - Validation outcomes with detailed errors
- `FieldConfig` - Column/field configuration
- `CacheEntry<T>` - Generic caching interface
- `CustomerConfigurationManager` - Customer management API
- And many more...

## Creating Your First Service

### Using the CLI (Recommended)

```bash
# Create a new service
lego-create-service my-awesome-service --type data-service

# Navigate to the service
cd my-awesome-service

# Install dependencies
npm install
```

### Manual Setup

If you prefer manual setup:

```bash
# Create project structure
mkdir my-awesome-service
cd my-awesome-service
npm init -y
npm install @tamyla/lego-framework
```

Create the basic structure:

```
my-awesome-service/
├── src/
│   ├── config/
│   │   ├── domains.js
│   │   └── schema.js
│   └── worker/
│       └── index.js
├── scripts/
│   ├── deploy.js
│   └── dev.js
├── package.json
├── wrangler.toml
└── README.md
```

## Domain Configuration

Domain configuration defines your service's identity, environment, and capabilities.

```javascript
// src/config/domains.js
import { createDomainConfigSchema } from '@tamyla/lego-framework/config';

export const domains = {
  'my-awesome-service.com': {
    ...createDomainConfigSchema(),
    name: 'my-awesome-service',
    displayName: 'My Awesome Service',

    // Cloudflare configuration
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,

    // Domain mappings
    domains: {
      production: 'api.my-awesome-service.com',
      staging: 'staging-api.my-awesome-service.com',
      development: 'my-awesome-service.your-subdomain.workers.dev'
    },

    // Feature flags
    features: {
      dataService: true,
      authentication: true,
      logging: true,
      cors: true,
      rateLimiting: false
    },

    // Environment settings
    settings: {
      environment: 'development',
      debug: true,
      cache: {
        ttl: 300,
        enabled: true
      }
    }
  }
};
```

### Environment Variables

Set up your environment variables:

```bash
# .env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
```

## Schema Management

Define your data models using the Schema Manager:

```javascript
// src/config/schema.js
import { schemaManager } from '@tamyla/lego-framework/schema';

// User model
schemaManager.registerModel('users', {
  columns: {
    id: { type: 'string', primary: true },
    email: { type: 'string', required: true, unique: true },
    name: { type: 'string', required: true },
    role: { type: 'string', default: 'user', enum: ['admin', 'user', 'moderator'] },
    created_at: { type: 'datetime', default: 'now' },
    updated_at: { type: 'datetime', default: 'now' }
  },
  indexes: [
    { columns: ['email'], unique: true },
    { columns: ['role'] }
  ]
});

// Posts model with relationships
schemaManager.registerModel('posts', {
  columns: {
    id: { type: 'string', primary: true },
    user_id: { type: 'string', required: true, references: 'users.id' },
    title: { type: 'string', required: true, maxLength: 200 },
    content: { type: 'text' },
    status: { type: 'string', default: 'draft', enum: ['draft', 'published', 'archived'] },
    tags: { type: 'json', default: [] },
    created_at: { type: 'datetime', default: 'now' },
    updated_at: { type: 'datetime', default: 'now' }
  },
  indexes: [
    { columns: ['user_id'] },
    { columns: ['status'] },
    { columns: ['created_at'] }
  ]
});
```

## Building Worker Code

Your Cloudflare Worker handles all runtime logic:

```javascript
// src/worker/index.js
import { initializeService, COMMON_FEATURES } from '@tamyla/lego-framework';
import { GenericDataService } from '@tamyla/lego-framework/services';
import { EnhancedRouter } from '@tamyla/lego-framework/routing';
import { GenericRouteHandler } from '@tamyla/lego-framework/handlers';
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

      // Create router with middleware
      const router = new EnhancedRouter();

      // Apply global middleware
      if (service.features.includes(COMMON_FEATURES.CORS)) {
        router.use(corsMiddleware);
      }

      if (service.features.includes(COMMON_FEATURES.LOGGING)) {
        router.use(loggingMiddleware);
      }

      // Health check endpoint
      router.get('/health', async () => {
        const health = await checkServiceHealth(env.DB);
        return new Response(JSON.stringify({
          status: health ? 'healthy' : 'unhealthy',
          service: service.domain,
          environment: service.environment,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      });

      // User API endpoints
      router.get('/api/users', async (request) => {
        try {
          const users = await userService.findAll({
            limit: 50,
            orderBy: 'created_at',
            order: 'desc'
          });
          return new Response(JSON.stringify(users), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      router.post('/api/users', async (request) => {
        try {
          const data = await request.json();
          const user = await userService.create(data);
          return new Response(JSON.stringify(user), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      router.get('/api/users/:id', async (request, params) => {
        try {
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
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      // Posts API with user relationship
      router.get('/api/posts', async (request) => {
        try {
          const posts = await postService.findAll({
            include: ['user'],
            limit: 20,
            orderBy: 'created_at',
            order: 'desc'
          });
          return new Response(JSON.stringify(posts), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      // Handle the request
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

// Middleware functions
function corsMiddleware(request, env, ctx, next) {
  // CORS handling
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const response = await next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}

function loggingMiddleware(request, env, ctx, next) {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);

  const response = await next();

  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${response.status} ${duration}ms`);

  return response;
}

async function checkServiceHealth(db) {
  try {
    // Simple health check - try to query the database
    await db.prepare('SELECT 1').first();
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
```

## Deployment

**Important**: Always embed deployment logic in your service rather than calling external CLI tools.

### Deployment Script

Create `scripts/deploy.js`:

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

    // Interactive environment selection
    const environment = await askChoice(
      'Select deployment environment:',
      ['development', 'staging', 'production'],
      2 // Default to production
    );

    // Interactive domain selection
    const domainNames = Object.keys(domains);
    const selectedDomainIndex = await askChoice(
      'Select domain to deploy:',
      domainNames.map(name => `${name} (${domains[name].displayName})`),
      0
    );
    const domain = domainNames[selectedDomainIndex];

    console.log(`\n🌍 Deploying ${domain} to ${environment}`);
    console.log('=====================================');

    // Initialize deployment components
    const discovery = new DomainDiscovery({
      enableCaching: true,
      cacheTimeout: 300000 // 5 minutes
    });

    const validator = new DeploymentValidator({
      validationLevel: 'comprehensive',
      environment,
      skipTests: environment === 'development'
    });

    const orchestrator = new MultiDomainOrchestrator({
      domains: [domain],
      environment,
      dryRun: false,
      parallelDeployments: 1
    });

    // Validate domain configuration
    console.log('🔍 Validating domain configuration...');
    await discovery.initializeDiscovery();
    const domainConfig = await discovery.getDomainConfig(domain);

    if (!domainConfig) {
      throw new Error(`Domain ${domain} not found in configuration`);
    }

    // Pre-deployment validation
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

    // Execute deployment
    console.log('🚀 Starting deployment...');
    await orchestrator.initialize();
    const result = await orchestrator.deploySingleDomain(domain);

    console.log('✅ Deployment successful!');
    console.log(`🌐 Service URL: ${result.url}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📊 Environment: ${environment}`);

    if (result.tests && result.tests.length > 0) {
      console.log('\n🧪 Production Tests:');
      result.tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${test.duration}ms`);
      });
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

deploy();
```

### Development Script

Create `scripts/dev.js` for local development:

```javascript
// scripts/dev.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Lego Framework Development Server');
console.log('===========================================');

// Start Wrangler development server
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

### Wrangler Configuration

Configure `wrangler.toml`:

```toml
name = "my-awesome-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "my-awesome-service-db"
database_id = "your-database-id"

[build]
command = "npm run build"

# Environment-specific overrides
[env.staging]
vars.ENVIRONMENT = "staging"

[env.development]
vars.ENVIRONMENT = "development"
```

### Package.json Scripts

```json
{
  "name": "my-awesome-service",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Build step if needed'",
    "deploy": "node scripts/deploy.js",
    "dev": "node scripts/dev.js",
    "test": "echo 'Add your tests here'"
  },
  "dependencies": {
    "@tamyla/lego-framework": "^1.3.3"
  }
}
```

## Best Practices

### 1. Service Autonomy
- Each service should be self-contained and independently deployable
- Embed deployment logic rather than calling external tools
- Include all configuration and scripts within the service repository

### 2. Environment Management
- Use environment variables for sensitive configuration
- Maintain separate configurations for development, staging, and production
- Validate environment-specific settings during deployment

### 3. Error Handling
- Implement comprehensive error handling in workers
- Use appropriate HTTP status codes
- Log errors appropriately based on environment
- Provide meaningful error messages to clients

### 4. Security
- Validate all input data
- Use parameterized queries to prevent SQL injection
- Implement authentication and authorization as needed
- Keep sensitive data in environment variables

### 5. Performance
- Use caching strategically
- Optimize database queries
- Minimize payload sizes
- Consider rate limiting for public APIs

### 6. Testing
- Test your deployment scripts locally
- Validate API endpoints after deployment
- Include health checks
- Test error scenarios

## What to Avoid

### ❌ Don't Call Internal Bin Scripts Directly
```bash
# WRONG - Don't do this
npm install @tamyla/lego-framework
# Then in package.json:
"scripts": {
  "deploy": "node node_modules/@tamyla/lego-framework/bin/deployment/enterprise-deploy.js deploy --interactive"
}
```

### ❌ Don't Rely on External CLI Tools
```bash
# WRONG - Don't do this
"scripts": {
  "deploy": "lego-deploy my-service"
}
```

### ✅ Do Embed Deployment Logic
```javascript
// scripts/deploy.js
import { MultiDomainOrchestrator } from '@tamyla/lego-framework/orchestration';
// ... embed the logic
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure you're using ES modules (`"type": "module"` in package.json)
   - Check that all imports use the correct paths from the framework exports

2. **Deployment Failures**
   - Verify Cloudflare credentials and permissions
   - Check domain configuration and zone IDs
   - Ensure D1 database is properly configured

3. **Runtime Errors**
   - Check worker logs in Cloudflare dashboard
   - Validate environment variables are set correctly
   - Test database connectivity

4. **Build Issues**
   - Clear node_modules and reinstall if needed
   - Check Node.js and npm versions meet requirements
   - Verify wrangler is properly installed and authenticated

### Getting Help

- Check the [Integration Guide](./../INTEGRATION_GUIDE.md) for detailed examples
- Review the [API Reference](#api-reference) below
- Check Cloudflare Workers documentation for platform-specific issues

## API Reference

### Core Modules

#### Services
- `GenericDataService`: CRUD operations for D1 databases
- `GenericRouteHandler`: Standardized request/response handling

#### Routing
- `EnhancedRouter`: Advanced routing with middleware support

#### Schema
- `schemaManager`: Data model definition and validation

#### Configuration
- `createDomainConfigSchema`: Domain configuration helper
- `DomainDiscovery`: Domain validation and discovery

#### Orchestration
- `MultiDomainOrchestrator`: Multi-environment deployment
- `DeploymentValidator`: Pre-deployment validation
- `WranglerDeployer`: Cloudflare Workers deployment

#### Utils
- Interactive utilities for CLI prompts
- Deployment helpers
- Error handling utilities

### Exported Paths

```javascript
import { GenericDataService } from '@tamyla/lego-framework/services';
import { EnhancedRouter } from '@tamyla/lego-framework/routing';
import { schemaManager } from '@tamyla/lego-framework/schema';
import { initializeService } from '@tamyla/lego-framework';
import { MultiDomainOrchestrator } from '@tamyla/lego-framework/orchestration';
import { DomainDiscovery } from '@tamyla/lego-framework/config/discovery';
```

This guide covers the essential aspects of using the Lego Framework effectively. Remember to always embed deployment logic in your services and leverage the framework's public APIs for maximum benefit and maintainability.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\docs\guides\developer-guide.md