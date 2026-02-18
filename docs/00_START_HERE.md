# 🚀 Clodo Framework - Developer Quick Start

> **Get started with Clodo Framework in 5 minutes**

## 📦 Installation

```bash
npm install @tamyla/clodo-framework
```

## 🎯 Three Ways to Use Clodo Framework

### 1. **Programmatic API** (Recommended)

```javascript
import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

const result = await createServiceProgrammatic({
  serviceName: 'my-api-service',
  serviceType: 'api-service',
  domain: 'api.example.com',
  features: ['d1', 'metrics']
});

if (result.success) {
  console.log('✅ Service created:', result.servicePath);
} else {
  console.error('❌ Creation failed:', result.errors);
}
```

### 2. **Simple API** (Quick & Easy)

```javascript
import { createService } from '@tamyla/clodo-framework';

const result = await createService({
  serviceName: 'quick-api',
  serviceType: 'api-service',
  domain: 'quick.example.com'
});
```

### 3. **CLI** (Interactive)

```bash
# Create a new service
npx clodo-service create

# Deploy a service
npx clodo-service deploy

# Run preflight health checks
npx clodo-service doctor

# Scan for leaked secrets
npx clodo-service secrets scan

# Validate config files against schemas
npx clodo-service config-schema validate clodo-deploy.json
```

## 🔧 Core Concepts

### Service Types
- **`api-service`** - REST API endpoints
- **`data-service`** - Data processing and APIs
- **`worker`** - Background processing
- **`pages`** - Static site generation
- **`gateway`** - API gateway and routing

### Features
- **`d1`** - Cloudflare D1 database
- **`upstash`** - Redis database
- **`r2`** - Object storage
- **`durableObject`** - Durable Objects
- **`metrics`** - Monitoring and metrics
- **`ws`** - WebSocket support

## 📚 Essential Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[Programmatic API Guide](api/PROGRAMMATIC_API.md)** | Complete API usage | Building integrations |
| **[Parameter Reference](api/parameter_reference.md)** | All parameters & validation | Understanding options |
| **[Migration Guide](MIGRATION.md)** | CLI to programmatic | Upgrading existing code |
| **[Error Reference](errors.md)** | Error codes & solutions | Troubleshooting |
| **[Simple API Guide](SIMPLE_API_GUIDE.md)** | Quick examples | Getting started |
| **[Security](SECURITY.md)** | Security features & secret scanning | Security review |

## 🩺 Validate Your Setup

Before deploying, run the doctor command to check your environment:

```bash
npx clodo-service doctor
```

This checks Node.js version, dependencies, environment variables, Cloudflare connectivity, config schemas, and secret baselines.

## 🛠️ Development Workflow

### 1. **Validate Your Payload**
```javascript
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

const validation = validateServicePayload({
  serviceName: 'my-service',
  serviceType: 'api-service',
  domain: 'example.com'
});

if (!validation.valid) {
  console.log('Fix these errors:', validation.errors);
}
```

### 2. **Create Service**
```javascript
const result = await createServiceProgrammatic(payload, {
  outputDir: './services',
  dryRun: false  // Set to true for testing
});
```

### 3. **Handle Results**
```javascript
if (result.success) {
  console.log(`Service created at: ${result.servicePath}`);
  console.log(`Generated ${result.fileCount} files`);
} else {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

## 🔍 Framework Capabilities

Check what the framework supports:

```javascript
import { getFrameworkCapabilities } from '@tamyla/clodo-framework/api';

const capabilities = getFrameworkCapabilities();
console.log('Version:', capabilities.version);
console.log('Supported service types:', capabilities.supportedServiceTypes);
console.log('Supported features:', capabilities.supportedFeatures);
```

## 🧪 Testing Your Integration

Use the mock framework for testing:

```javascript
import { createMockFramework } from '@tamyla/clodo-framework/testing';

const mockFramework = createMockFramework();
const result = await mockFramework.createService(payload);
expect(result.success).toBe(true);
```

## 🚨 Common Issues & Solutions

### "Invalid serviceType"
```javascript
// Wrong
serviceType: 'api'

// Right
serviceType: 'api-service'
```

### "serviceName format invalid"
```javascript
// Wrong
serviceName: 'My Service'

// Right
serviceName: 'my-service'
```

### "domain format invalid"
```javascript
// Wrong
domain: 'localhost'

// Right
domain: 'api.example.com'
```

## 📞 Getting Help

- **Quick Reference**: [Parameter Reference](api/parameter_reference.md)
- **API Examples**: [Programmatic API Guide](api/PROGRAMMATIC_API.md)
- **Error Help**: [Error Reference](errors.md)
- **Migration**: [Migration Guide](MIGRATION.md)

## 🎯 Next Steps

1. **Read the [Overview](overview.md)** to understand the philosophy
2. **Try the [Simple API Guide](SIMPLE_API_GUIDE.md)** for examples
3. **Check the [Programmatic API Guide](api/PROGRAMMATIC_API.md)** for advanced usage
4. **Review [Security](SECURITY.md)** considerations
5. **Run `clodo-service doctor`** to validate your environment
6. **Run `clodo-service secrets scan`** to check for leaked secrets

---

**Happy coding with Clodo Framework! 🎉**


