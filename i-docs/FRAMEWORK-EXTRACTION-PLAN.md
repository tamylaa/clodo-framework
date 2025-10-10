# Clodo Framework Extraction Plan

## Phase 1: Framework Core (Week 1-2)

### 1. Create Framework Package Structure
```
packages/clodo-framework/
├── package.json
├── README.md
├── src/
│   ├── config/
│   │   ├── domains.js          # Base domain config framework
│   │   ├── features.js         # Base feature flag system
│   │   └── index.js            # Main exports
│   ├── worker/
│   │   ├── integration.js      # Worker helpers
│   │   └── index.js
│   └── utils/
│       └── index.js
├── scripts/
│   ├── deploy-domain.ps1       # Generic deployment
│   └── setup-interactive.ps1   # Generic setup
└── templates/
    └── service-starter/        # New service template
```

### 2. Extract Core Domain Configuration
```javascript
// packages/clodo-framework/src/config/domains.js
export const createDomainConfigSchema = () => ({
  name: '',
  displayName: '',
  accountId: '',
  zoneId: '',
  domains: {
    production: '',
    staging: ''
  },
  services: {},
  databases: {},
  features: {},
  settings: {}
});

export const validateDomainConfig = (config) => {
  // Validation logic
};

export const mergeDomainConfigs = (baseConfig, serviceConfig) => {
  // Merge logic for service-specific extensions
};
```

### 3. Extract Feature Flag System
```javascript
// packages/clodo-framework/src/config/features.js
export class FeatureFlagManager {
  constructor() {
    this.currentDomain = null;
  }

  setDomain(domainConfig) {
    this.currentDomain = domainConfig;
  }

  isEnabled(featureName, defaultValue = false) {
    if (!this.currentDomain?.features) return defaultValue;
    return this.currentDomain.features[featureName] ?? defaultValue;
  }

  getEnabledFeatures() {
    return Object.entries(this.currentDomain?.features || {})
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
  }
}

export const featureManager = new FeatureFlagManager();
```

### 4. Extract Worker Integration
```javascript
// packages/clodo-framework/src/worker/integration.js
export const initializeService = (env) => {
  // Set up domain from environment
  const domainName = env.DOMAIN_NAME || 'default';
  featureManager.setDomain(getDomainConfig(domainName));

  // Initialize other service components
  return {
    domain: domainName,
    features: featureManager.getEnabledFeatures()
  };
};

export const createFeatureGuard = (featureName) => {
  return (handler) => {
    return (request, env, ctx) => {
      if (!featureManager.isEnabled(featureName)) {
        return new Response('Feature not enabled', { status: 404 });
      }
      return handler(request, env, ctx);
    };
  };
};
```

## Phase 2: Deployment Framework (Week 3-4)

### 1. Generic Deployment Script
```powershell
# packages/clodo-framework/scripts/deploy-domain.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$DomainName,

    [Parameter(Mandatory=$false)]
    [string]$ServiceName = "generic-service",

    [Parameter(Mandatory=$false)]
    [string]$Environment = "staging"
)

# Generic deployment logic that:
# - Loads service-specific domain configs
# - Generates wrangler.toml with service bindings
# - Creates databases if specified
# - Deploys worker
# - Runs service-specific tests
```

### 2. Service Template Generator
```bash
# packages/clodo-framework/bin/create-service.js
#!/usr/bin/env node

const { createService } = require('../src/templates');

const serviceName = process.argv[2];
const serviceType = process.argv[3] || 'generic';

createService(serviceName, serviceType);
// Creates:
// - Service directory structure
// - Base configuration files
// - Worker template
// - Package.json with framework dependencies
// - Deployment scripts
```

## Phase 3: Service Integration (Week 5-6)

### 1. Migrate Data Service
```javascript
// Before (current)
import { getDomainConfig } from './config/domains.js';

// After (framework)
import { getDomainConfig } from '@yourcompany/clodo-framework';
import { DATA_SERVICE_FEATURES } from './config/features.js';
```

### 2. Service-Specific Extensions
```javascript
// services/data-service/src/config/features.js
import { FEATURES } from '@yourcompany/clodo-framework';

export const DATA_SERVICE_FEATURES = {
  ...FEATURES,
  MAGIC_LINK_AUTH: 'magicLinkAuth',
  FILE_STORAGE: 'fileStorage',
  USER_PROFILES: 'userProfiles'
};
```

### 3. Worker Integration
```javascript
// services/data-service/src/worker/index.js
import { initializeService, featureGuard } from '@yourcompany/clodo-framework';
import { DATA_SERVICE_FEATURES } from '../config/features.js';

export default {
  async fetch(request, env, ctx) {
    const service = initializeService(env);

    // Feature-guarded routes
    if (request.url.includes('/auth')) {
      return featureGuard(DATA_SERVICE_FEATURES.MAGIC_LINK_AUTH)(
        handleAuth
      )(request, env, ctx);
    }
  }
};
```

## Phase 4: Ecosystem Building (Week 7-8)

### 1. Service Registry
```javascript
// packages/clodo-framework/src/registry.js
export const SERVICE_REGISTRY = {
  'data-service': {
    features: DATA_SERVICE_FEATURES,
    databases: ['auth-db', 'user-db'],
    endpoints: ['/auth', '/users', '/files']
  },
  'content-service': {
    features: CONTENT_SERVICE_FEATURES,
    databases: ['content-db'],
    endpoints: ['/content', '/media']
  }
};
```

### 2. Cross-Service Communication
```javascript
// packages/clodo-framework/src/communication.js
export const createServiceClient = (serviceName) => {
  const serviceConfig = SERVICE_REGISTRY[serviceName];
  return {
    call: (endpoint, data) => {
      // Service-to-service communication
    }
  };
};
```

### 3. Monitoring & Observability
```javascript
// packages/clodo-framework/src/monitoring.js
export const createMetrics = (serviceName) => {
  return {
    increment: (metric, tags) => {
      // Send metrics to monitoring service
    }
  };
};
```

## Benefits Achieved

### For Individual Services
- **80% less boilerplate** - Framework handles common patterns
- **Consistent architecture** - All services follow same patterns
- **Faster development** - Focus on business logic, not infrastructure
- **Automatic updates** - Framework improvements benefit all services

### For Platform
- **Service consistency** - Standardized patterns across ecosystem
- **Easier maintenance** - Framework fixes apply everywhere
- **Faster onboarding** - New services use familiar patterns
- **Scalable architecture** - Easy to add new services and domains

## Migration Strategy

### Week 1-2: Framework Development
- Build core framework package
- Create service templates
- Test with simple service

### Week 3-4: Data Service Migration
- Migrate data service to use framework
- Update configurations
- Test deployment automation

### Week 5-6: Other Services
- Migrate auth-service, content-skimmer
- Update cross-service communication
- Test integration scenarios

### Week 7-8: Ecosystem Features
- Service registry
- Monitoring integration
- Documentation and training

## Success Metrics

1. **Code Reduction**: 60-70% less boilerplate per service
2. **Deployment Time**: 50% faster service creation
3. **Consistency**: 100% of services use same patterns
4. **Maintenance**: Framework updates benefit all services automatically
5. **Developer Velocity**: New services created in days, not weeks

This framework becomes the **Clodo baseplate** that all your services snap into, enabling the true vision of composable, reusable software architecture.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\data-service\FRAMEWORK-EXTRACTION-PLAN.md