# Clodo Framework Integration Prompt

## Context
You are helping a developer integrate the Clodo Framework into their Cloudflare Worker service. The Clodo Framework enables "service autonomy" where each service can discover, validate, and deploy itself independently.

## Key Principles
1. **Service Autonomy**: Services embed deployment logic internally, not call external CLI tools
2. **Runtime vs Build Time**: Worker-compatible components only in runtime code
3. **Configuration First**: Define domains and schemas before implementing business logic
4. **Error Handling**: Always handle async operations and return Response objects

## User's Service Context
- Service Name: [USER_SERVICE_NAME]
- Primary Domain: [USER_DOMAIN]
- Database Models: [USER_MODELS] (e.g., users, posts, products)
- Required Features: [USER_FEATURES] (e.g., data-service, logging, cors)

## Required Implementation Steps

### 1. Project Structure Setup
Create this directory structure in the user's service:
```
[USER_SERVICE]/
├── src/
│   ├── config/
│   │   ├── domains.js     # Domain configuration
│   │   └── schema.js      # Data model definitions
│   └── worker/
│       └── index.js       # Cloudflare Worker entry point
├── scripts/
│   ├── deploy.js          # Internal deployment script
│   └── dev.js            # Development server script
├── wrangler.toml         # Cloudflare Workers config
└── package.json          # Updated with Clodo Framework dependency
```

### 2. Package.json Updates
Add to package.json:
```json
{
  "dependencies": {
    "@tamyla/clodo-framework": "^1.3.2"
  },
  "scripts": {
    "deploy": "node scripts/deploy.js",
    "dev": "node scripts/dev.js"
  }
}
```

### 3. Domain Configuration (src/config/domains.js)
```javascript
export const domains = {
  '[USER_DOMAIN]': {
    name: '[USER_SERVICE_NAME]',
    displayName: '[USER_DISPLAY_NAME]',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    domains: {
      production: '[USER_DOMAIN]',
      staging: 'staging.[USER_DOMAIN]'
    },
    features: {
      [USER_FEATURES]
    }
  }
};
```

### 4. Schema Definitions (src/config/schema.js)
```javascript
import { schemaManager } from '@tamyla/clodo-framework/schema';

// Register each model from USER_MODELS
schemaManager.registerModel('[MODEL_NAME]', {
  columns: {
    id: { type: 'string', primary: true },
    // ... model fields
    created_at: { type: 'datetime', default: 'now' },
    updated_at: { type: 'datetime', default: 'now' }
  }
});
```

### 5. Cloudflare Worker (src/worker/index.js)
```javascript
import { initializeService, COMMON_FEATURES } from '@tamyla/clodo-framework';
import { GenericDataService } from '@tamyla/clodo-framework/services';
import { EnhancedRouter } from '@tamyla/clodo-framework/routing';
import { domains } from '../config/domains.js';
import '../config/schema.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize service
      const service = initializeService(env, domains);

      // Create data services for each model
      const dataServices = {};
      // Initialize dataServices for each USER_MODEL

      // Create router
      const router = new EnhancedRouter();

      // Health check endpoint
      router.get('/health', async () => {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: service.domain,
          environment: service.environment,
          features: service.features
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      });

      // API routes for each model
      // GET /api/[model] - list all
      // POST /api/[model] - create new
      // GET /api/[model]/:id - get by id
      // PUT /api/[model]/:id - update
      // DELETE /api/[model]/:id - delete

      return await router.handle(request, env, ctx);

    } catch (error) {
      console.error('Worker error:', error);
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

### 6. Deployment Script (scripts/deploy.js)
```javascript
import { MultiDomainOrchestrator, DeploymentValidator } from '@tamyla/clodo-framework/orchestration';
import { DomainDiscovery } from '@tamyla/clodo-framework/config/discovery';
import { askChoice } from '@tamyla/clodo-framework/utils/interactive';
import { domains } from '../src/config/domains.js';

async function deploy() {
  try {
    console.log('🚀 Clodo Framework Deployment');

    // Environment selection
    const environment = await askChoice(
      'Select environment:',
      ['development', 'staging', 'production'],
      2
    );

    // Domain selection
    const domainNames = Object.keys(domains);
    const selectedDomain = await askChoice(
      'Select domain:',
      domainNames,
      0
    );
    const domain = domainNames[selectedDomain];

    // Initialize components
    const discovery = new DomainDiscovery({ enableCaching: true });
    const validator = new DeploymentValidator({
      validationLevel: 'comprehensive',
      environment
    });
    const orchestrator = new MultiDomainOrchestrator({
      domains: [domain],
      environment,
      dryRun: false
    });

    // Validate and deploy
    await discovery.initializeDiscovery();
    const validation = await validator.validateDeploymentReadiness(domain, { environment });
    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      process.exit(1);
    }

    await orchestrator.initialize();
    const result = await orchestrator.deploySingleDomain(domain);

    console.log('✅ Deployment successful:', result.url);

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
```

### 7. Development Script (scripts/dev.js)
```javascript
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Wrangler dev server
const wrangler = spawn('npx', ['wrangler', 'dev'], {
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

wrangler.on('close', (code) => {
  console.log(`Wrangler exited with code ${code}`);
});
```

### 8. Wrangler Configuration (wrangler.toml)
```toml
name = "[USER_SERVICE_NAME]"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "[USER_SERVICE_NAME]-db"
database_id = "[DATABASE_ID]"

[build]
command = "npm run build"
```

## Common Implementation Issues

### Issue: "require is not defined"
**Cause**: Using deployment components in Worker runtime
**Fix**: Only import runtime components in src/worker/index.js

### Issue: "Cannot read properties of undefined"
**Cause**: Missing error handling or incorrect async usage
**Fix**: Always use async/await and proper error handling

### Issue: "Service directory not found"
**Cause**: Domain configuration mismatch
**Fix**: Ensure domains.js has correct domain entries

### Issue: Import errors
**Cause**: Wrong import paths
**Fix**: Use exact paths from framework documentation

## Validation Checklist

- [ ] Framework added as dependency
- [ ] Project structure created
- [ ] Domain configuration defined
- [ ] Schema models registered
- [ ] Worker implements all required routes
- [ ] Deployment script handles validation and orchestration
- [ ] Development script starts Wrangler
- [ ] Wrangler.toml configured correctly
- [ ] Environment variables documented
- [ ] Error handling implemented
- [ ] Async operations properly handled

## Testing Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Test health endpoint
curl http://localhost:8787/health

# Test API endpoints
curl http://localhost:8787/api/[model]

# Deploy
npm run deploy
```

## Success Criteria

1. **Development server starts** without import errors
2. **Health endpoint returns** valid JSON with service info
3. **API endpoints work** for all defined models
4. **Deployment script runs** validation and orchestration
5. **Service deploys successfully** to Cloudflare Workers
6. **Production endpoints** respond correctly

## Next Steps After Implementation

1. **Test locally** with `npm run dev`
2. **Validate API endpoints** with curl/Postman
3. **Configure environment variables** for Cloudflare
4. **Run deployment** with `npm run deploy`
5. **Verify production deployment** works correctly
6. **Set up monitoring** and logging as needed

This implementation provides a complete, autonomous service that can discover, validate, and deploy itself using the Clodo Framework's enterprise capabilities.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\clodo-framework\docs\INTEGRATION_PROMPT.md