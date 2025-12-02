# API Migration Guide: From Complex to Simple

This guide shows how the Clodo Framework has been simplified while preserving all advanced functionality. The "Balanced Strategy" maintains 80% of the framework's power while making 100% of the interface simple.

## Overview

The framework now provides simple APIs with smart defaults that handle the complexity internally. Advanced features remain available through the same underlying classes, but simple usage is now the primary interface.

## Before vs After: API Simplification

### Service Creation

**Before (Complex):**
```javascript
// Required extensive setup and configuration
const orchestrator = new ServiceOrchestrator();
const configManager = new ServiceConfigManager();
const mergedOptions = await configManager.loadServiceConfig(servicePath, options);
const handlers = await orchestrator.initializeHandlers(mergedOptions);
const result = await orchestrator.createService(servicePath, mergedOptions, handlers);
// 50+ lines of setup code
```

**After (Simple):**
```javascript
// Single method call with smart defaults
const result = await Clodo.createService({
  servicePath: './my-service',
  template: 'basic-worker'
});
```

### Deployment

**Before (Complex):**
```javascript
// Complex multi-domain orchestration setup
const orchestrator = new MultiDomainOrchestrator();
const configManager = new ServiceConfigManager();
const mergedOptions = await configManager.loadServiceConfig(servicePath, options);
const deploymentPlan = await orchestrator.createDeploymentPlan(mergedOptions);
const result = await orchestrator.deployToMultipleDomains(deploymentPlan);
// 433+ lines of orchestration code
```

**After (Simple):**
```javascript
// Simple deployment with automatic domain handling
const result = await Clodo.deploy({
  servicePath: './my-service',
  domains: ['api.example.com', 'staging.example.com']
});
```

### Validation

**Before (Complex):**
```javascript
// Manual orchestrator setup and validation
const orchestrator = new ServiceOrchestrator();
const configManager = new ServiceConfigManager();
const mergedOptions = await configManager.loadServiceConfig(servicePath, options);
const result = await orchestrator.validateService(servicePath, {
  deepScan: mergedOptions.deepScan,
  exportReport: mergedOptions.exportReport
});
```

**After (Simple):**
```javascript
// Direct validation with optional report export
const result = await Clodo.validate({
  servicePath: './my-service',
  exportReport: 'validation-report.json'
});
```

## CLI Commands Simplified

### Create Command

**Before:**
```bash
# Complex parameter specification
clodo create ./my-service \
  --template basic-worker \
  --config-file ./config.json \
  --env-file .env \
  --handlers custom-handlers.js \
  --validation-config validation.json
```

**After:**
```bash
# Simple with smart defaults
clodo create ./my-service --template basic-worker
```

### Deploy Command

**Before:**
```bash
# Extensive deployment configuration
clodo deploy ./my-service \
  --domains api.example.com,staging.example.com \
  --config-file deploy-config.json \
  --env-file production.env \
  --orchestration-strategy multi-domain \
  --validation-enabled \
  --rollback-on-failure
```

**After:**
```bash
# Simple deployment
clodo deploy ./my-service --domains api.example.com,staging.example.com
```

### Validate Command

**Before:**
```bash
# Complex validation options
clodo validate ./my-service \
  --deep-scan \
  --export-report validation.json \
  --show-config-sources \
  --config-file validate-config.json
```

**After:**
```bash
# Simple validation
clodo validate ./my-service --export-report validation.json
```

## Progressive Disclosure

While the simple APIs are now the primary interface, all advanced features remain available:

### Advanced Service Creation
```javascript
// Still access the full orchestrator for advanced use cases
const orchestrator = new ServiceOrchestrator();
const result = await orchestrator.createService(servicePath, {
  customHandlers: [...],
  validationConfig: {...},
  environmentOverrides: {...}
});
```

### Advanced Deployment
```javascript
// Full multi-domain orchestration still available
const orchestrator = new MultiDomainOrchestrator();
const result = await orchestrator.deployToMultipleDomains({
  domains: [...],
  orchestrationStrategy: 'custom',
  rollbackConfig: {...}
});
```

## Migration Steps

1. **Update imports:** Change from complex orchestrators to simple `Clodo` facade
2. **Simplify parameters:** Remove extensive configuration objects, use smart defaults
3. **Update CLI calls:** Use simplified command syntax
4. **Test functionality:** All features preserved, just simpler interface

## Benefits

- **80% power preserved:** All 67 generators, orchestration systems, and advanced features maintained
- **100% interface simplified:** Single method calls replace complex setup
- **Backward compatibility:** Advanced APIs still available for power users
- **Smart defaults:** Sensible defaults reduce configuration burden
- **Progressive disclosure:** Simple usage primary, advanced features accessible

## Configuration Files

The framework still supports all configuration files, but they're now optional with sensible defaults:

- `clodo-create.json` - Service creation config (optional)
- `clodo-deploy.json` - Deployment config (optional)
- `clodo-validate.json` - Validation config (optional)

If not provided, the simple APIs use smart defaults that work for most use cases.