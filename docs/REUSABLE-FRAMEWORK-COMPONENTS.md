# Reusable Lego Framework Package

## Overview
A framework package that enables any service to implement the same domain configuration, feature flags, and deployment automation pattern we've built for the data service.

## Reusable Components

### 1. Domain Configuration Framework
**File**: `src/config/domains.js` (reusable template)

```javascript
// Generic domain configuration schema
export const DOMAIN_CONFIGS = {
  // Service-specific domain configs go here
};

// Reusable functions
export function getDomainConfig(domainName)
export function getAvailableDomains()
export function createDomainConfig(domainName, overrides)
export function validateDomainConfig(config)
```

### 2. Feature Flag System
**File**: `src/config/features.js` (reusable template)

```javascript
// Generic feature flag system
export function setCurrentDomain(domainName)
export function isFeatureEnabled(featureName, defaultValue)
export function getAllEnabledFeatures()

// Service-specific feature constants
export const FEATURES = {
  // Define service-specific features here
};
```

### 3. Worker Integration Pattern
**File**: `src/worker/index.js` (integration template)

```javascript
// Standard integration pattern
import { initializeFeatureFlags, isFeatureEnabled, FEATURES } from '../config/features.js';

// In fetch handler:
initializeFeatureFlags(env);

// Feature-gated functionality:
if (isFeatureEnabled(FEATURES.SOME_FEATURE)) {
  // Feature-specific logic
}
```

### 4. Deployment Automation Framework
**File**: `scripts/deploy-domain.ps1` (reusable template)

```powershell
# Generic deployment script that:
# - Reads domain configs
# - Generates service-specific wrangler.toml
# - Creates databases (if needed)
# - Deploys worker
# - Runs tests
```

### 5. Interactive Setup Framework
**File**: `scripts/setup-domain-interactive.ps1` (reusable template)

```powershell
# Generic setup script that:
# - Prompts for Cloudflare credentials
# - Discovers accounts/zones
# - Updates domain configs
# - Generates secrets
# - Calls deployment
```

## Service-Specific Customizations

### Configuration Schema Extension
Each service extends the base configuration:

```javascript
// For auth-service
export const AUTH_FEATURES = {
  MAGIC_LINK: 'magicLinkAuth',
  PASSWORD_RESET: 'passwordReset',
  SOCIAL_LOGIN: 'socialLogin'
};

// For content-service
export const CONTENT_FEATURES = {
  FILE_UPLOAD: 'fileUpload',
  CDN_DELIVERY: 'cdnDelivery',
  IMAGE_PROCESSING: 'imageProcessing'
};
```

### Feature Implementation
Services implement features based on flags:

```javascript
// In service worker
if (isFeatureEnabled(AUTH_FEATURES.SOCIAL_LOGIN)) {
  // Enable social login routes
}

if (isFeatureEnabled(CONTENT_FEATURES.IMAGE_PROCESSING)) {
  // Enable image processing middleware
}
```

## Package Structure

```
lego-framework/
├── src/
│   ├── config/
│   │   ├── domains.js          # Base domain config framework
│   │   └── features.js         # Base feature flag system
│   └── worker/
│       └── integration.js      # Worker integration helpers
├── scripts/
│   ├── deploy-domain.ps1       # Generic deployment script
│   └── setup-interactive.ps1   # Generic setup script
├── templates/
│   ├── service-template/       # New service starter template
│   └── domain-config.json      # Domain config template
└── package.json
```

## Usage for New Services

### 1. Install Framework
```bash
npm install @yourcompany/lego-framework
```

### 2. Extend Configuration
```javascript
// In new service: src/config/domains.js
import { DOMAIN_CONFIGS, getDomainConfig } from '@yourcompany/lego-framework';

export const MY_SERVICE_CONFIGS = {
  ...DOMAIN_CONFIGS,
  // Add service-specific configs
};
```

### 3. Define Features
```javascript
// In new service: src/config/features.js
import { isFeatureEnabled } from '@yourcompany/lego-framework';

export const MY_FEATURES = {
  FEATURE_ONE: 'featureOne',
  FEATURE_TWO: 'featureTwo'
};
```

### 4. Use in Worker
```javascript
// In new service: src/worker/index.js
import { initializeFeatureFlags, isFeatureEnabled } from '@yourcompany/lego-framework';
import { MY_FEATURES } from '../config/features.js';

export default {
  async fetch(request, env, ctx) {
    initializeFeatureFlags(env);

    if (isFeatureEnabled(MY_FEATURES.FEATURE_ONE)) {
      // Feature-specific logic
    }
  }
};
```

### 5. Deploy
```bash
# Uses the same deployment framework
npm run domain:setup -- myservice.com
```

## Benefits

1. **Consistency**: All services follow the same patterns
2. **Reusability**: Domain configs, deployment, feature flags work everywhere
3. **Maintainability**: Framework updates benefit all services
4. **Developer Experience**: Familiar patterns across services
5. **Scalability**: Easy to add new services and domains

## Implementation Plan

1. **Extract Framework**: Create separate `lego-framework` package
2. **Template Generation**: Create service starter templates
3. **Documentation**: Comprehensive setup and usage guides
4. **Migration Path**: Migrate existing services to use framework
5. **CI/CD Integration**: Automated testing and deployment pipelines</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\data-service\REUSABLE-FRAMEWORK-COMPONENTS.md