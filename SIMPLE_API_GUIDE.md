# Clodo Framework - Simple API Examples

## Overview

The Clodo Framework now provides a **Simple API** that dramatically simplifies common operations while maintaining all the power and flexibility of the advanced APIs.

## Before vs After

### Service Creation

**Before (Complex):**
```javascript
import { ServiceOrchestrator } from '@tamyla/clodo-framework';

const orchestrator = new ServiceOrchestrator({
  interactive: false,
  outputPath: './my-service'
});

const coreInputs = {
  serviceName: 'my-api',
  serviceType: 'api-gateway',
  domainName: 'api.example.com',
  environment: 'production',
  cloudflareToken: 'token123',
  cloudflareAccountId: 'account123',
  cloudflareZoneId: 'zone123'
};

await orchestrator.runNonInteractive(coreInputs);
```

**After (Simple):**
```javascript
import { createService } from '@tamyla/clodo-framework';

await createService({
  name: 'my-api',
  type: 'api-gateway',
  domain: 'api.example.com',
  environment: 'production',
  credentials: {
    token: 'token123',
    accountId: 'account123',
    zoneId: 'zone123'
  }
});
```

### Service Deployment

**Before (Complex):**
```javascript
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework';

const orchestrator = new MultiDomainOrchestrator({
  environment: 'production',
  servicePath: './my-service',
  cloudflareToken: 'token123',
  cloudflareAccountId: 'account123',
  cloudflareZoneId: 'zone123',
  domains: ['api.example.com']
});

await orchestrator.initialize();
const result = await orchestrator.deployPortfolio();
```

**After (Simple):**
```javascript
import { deploy } from '@tamyla/clodo-framework';

await deploy({
  servicePath: './my-service',
  environment: 'production',
  domain: 'api.example.com',
  credentials: {
    token: 'token123',
    accountId: 'account123',
    zoneId: 'zone123'
  }
});
```

### Service Validation

**Before (Complex):**
```javascript
import { ServiceOrchestrator } from '@tamyla/clodo-framework';

const orchestrator = new ServiceOrchestrator();
const result = await orchestrator.validateService('./my-service', {
  exportReport: true
});

if (!result.valid) {
  console.log('Issues:', result.issues);
}
```

**After (Simple):**
```javascript
import { validate } from '@tamyla/clodo-framework';

const result = await validate({
  servicePath: './my-service',
  exportReport: true
});

if (!result.success) {
  console.log('Issues:', result.issues);
}
```

### Worker Integration

**Before (Complex):**
```javascript
import { initializeService } from '@tamyla/clodo-framework';

const domainConfigs = {
  'api.example.com': {
    name: 'api.example.com',
    environment: 'production',
    features: ['api-gateway', 'authentication']
  }
};

const context = initializeService(env, domainConfigs);
```

**After (Simple):**
```javascript
import { initialize } from '@tamyla/clodo-framework';

const context = initialize(env, {
  domainConfigs: {
    'api.example.com': {
      name: 'api.example.com',
      environment: 'production',
      features: ['api-gateway', 'authentication']
    }
  }
});
```

## CLI Usage

### Simple CLI Commands

The framework now includes simplified CLI commands:

```bash
# Create a service
npx clodo-simple create my-api --domain api.example.com

# Deploy a service
npx clodo-simple deploy --env production

# Validate a service
npx clodo-simple validate

# Show framework info
npx clodo-simple info
```

### Before vs After CLI

**Before (Complex):**
```bash
npx clodo-service create \
  --service-name my-api \
  --service-type api-gateway \
  --domain-name api.example.com \
  --environment production \
  --cloudflare-token token123 \
  --cloudflare-account-id account123 \
  --cloudflare-zone-id zone123 \
  --output-path ./my-service \
  --non-interactive
```

**After (Simple):**
```bash
npx clodo-simple create my-api \
  --domain api.example.com \
  --env production \
  --token token123 \
  --account-id account123 \
  --zone-id zone123
```

## Migration Guide

### For Existing Users

1. **Update imports**: Replace complex class instantiations with simple function calls
2. **Simplify options**: Use the simplified option structure with sensible defaults
3. **Use CLI**: Switch to `clodo-simple` commands for common operations
4. **Gradual migration**: The advanced APIs remain available for complex use cases

### Backward Compatibility

- All existing APIs continue to work unchanged
- Advanced features still available through the full APIs
- No breaking changes to existing code

## Benefits

- **80% less code** for common operations
- **Fewer configuration options** to manage
- **Sensible defaults** reduce decision fatigue
- **Consistent API patterns** across all operations
- **Better error messages** and validation
- **Easier testing** and development

## When to Use Simple API

Use the Simple API for:
- Quick prototyping
- Standard service setups
- CI/CD pipelines
- Learning the framework
- Most common use cases

Use the Advanced APIs for:
- Complex multi-domain deployments
- Custom orchestration logic
- Specialized configurations
- Framework extensions