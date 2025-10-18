# Clodo Framework: CLI vs Embedded Deployment Architecture

## Overview

The Clodo Framework supports **two complementary patterns** for deployment:

1. **CLI Tools** - Scaffolding and utilities for developers
2. **Embedded Logic** - Services deploy themselves autonomously

This document clarifies when to use each pattern and how they work together.

---

## Pattern 1: CLI Tools (Scaffolding & Utilities)

### Purpose
Quick scaffolding, key generation, and administrative tasks

### Published Commands

| Command | Use Case | When to Use |
|---------|----------|-------------|
| `clodo-service` | Interactive service creation | Creating new projects |
| `clodo-create-service` | Template-based generation | Quick service scaffolding |
| `clodo-init-service` | Service initialization | Setting up configurations |
| `clodo-security` | Security utilities | Generating keys, validating configs |
| `clodo-customer-config` | Customer management | Multi-tenant setup |

### Usage Pattern

```bash
# One-time scaffolding
npx @tamyla/clodo-framework clodo-service create my-service

# Generates a service with embedded deployment logic
# You won't need the CLI tool again for deployment
```

### Import Resolution

```javascript
// CLI entry point: bin/clodo-service.js
import { ServiceOrchestrator } from '../dist/service-management/ServiceOrchestrator.js';
//                                    ^^^^^^ Must import from dist/
```

**Why `dist/`?**
- Published npm package only includes `dist/` (transpiled code)
- `src/` is not included in the package
- CLI tools must reference compiled code

---

## Pattern 2: Embedded Deployment (Service Autonomy)

### Purpose
Services deploy themselves without external CLI tools

### Generated Service Structure

```
my-service/
├── src/
│   ├── config/
│   │   ├── domains.js      # Service-specific domain config
│   │   └── schema.js       # Data models
│   └── worker/
│       └── index.js        # Cloudflare Worker
├── scripts/
│   ├── deploy.js           # ⭐ Service's own deployment script
│   └── dev.js
└── package.json
```

### Service's Deploy Script

```javascript
// my-service/scripts/deploy.js
import { 
  MultiDomainOrchestrator,
  deployWithSecurity 
} from '@tamyla/clodo-framework/deployment';

// Service deploys ITSELF using framework utilities
const orchestrator = new MultiDomainOrchestrator(domains);
await orchestrator.deploy();
```

### Import Resolution

```javascript
// In user's service
import { orchestrator } from '@tamyla/clodo-framework/deployment';
//                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 
//                           Framework export path (resolves to dist/)
```

**Why this works:**
- Framework's `package.json` exports point to `dist/`
- User imports via package exports, not direct file paths
- Framework handles the `dist/` resolution internally

---

## Complete Workflow

### Step 1: Scaffold with CLI
```bash
npx @tamyla/clodo-framework clodo-service create my-data-service
```

**What happens:**
- CLI tool runs from framework's `bin/clodo-service.js`
- Imports from `../dist/` to access `ServiceOrchestrator`
- Generates service with embedded deployment logic

### Step 2: Service Deploys Itself
```bash
cd my-data-service
npm install  # Installs @tamyla/clodo-framework as dependency
npm run deploy  # Runs scripts/deploy.js
```

**What happens:**
- Service's `deploy.js` imports framework utilities
- Uses package exports: `@tamyla/clodo-framework/deployment`
- Framework exports resolve to `dist/` internally
- Service deploys autonomously

### Step 3: Generate Secrets (Optional)
```bash
npx @tamyla/clodo-framework clodo-security generate-key jwt
```

**What happens:**
- CLI utility runs for one-off key generation
- Copies generated key into service's `.env`
- Service continues to deploy itself

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Framework Repository (@tamyla/clodo-framework)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/                          bin/                         │
│  ├── service-management/       ├── clodo-service.js ────┐   │
│  ├── orchestration/            ├── service-management/  │   │
│  ├── security/                 ├── security/            │   │
│  └── deployment/               └── shared/config/       │   │
│                                                          │   │
│  ↓ babel build                                          │   │
│                                                          │   │
│  dist/                         Published CLI Tools ─────┘   │
│  ├── service-management/       (import from dist/)          │
│  ├── orchestration/                                         │
│  ├── security/                                              │
│  └── deployment/                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ npm install
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ User's Service (my-data-service)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  scripts/deploy.js                                          │
│  ┌────────────────────────────────────────────────┐        │
│  │ import { MultiDomainOrchestrator }             │        │
│  │ from '@tamyla/clodo-framework/deployment';     │        │
│  │                                                 │        │
│  │ // Service deploys itself                      │        │
│  │ await orchestrator.deploy();                   │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
│  src/config/domains.js                                      │
│  ┌────────────────────────────────────────────────┐        │
│  │ export const domains = {                       │        │
│  │   'my-service.com': {                          │        │
│  │     name: 'my-service',                        │        │
│  │     features: { dataService: true }            │        │
│  │   }                                             │        │
│  │ };                                             │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Import Path Rules

### For Framework CLI Tools (`bin/`)

```javascript
// ✅ CORRECT - Published package includes dist/
import { ServiceOrchestrator } from '../dist/service-management/ServiceOrchestrator.js';

// ❌ WRONG - src/ is not published
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';
```

### For User Services (generated code)

```javascript
// ✅ CORRECT - Use package exports
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/deployment';

// ❌ WRONG - Don't import from dist directly
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/dist/orchestration/multi-domain-orchestrator.js';
```

### For Framework Internal Development (`bin/deployment/`)

```javascript
// ✅ CORRECT - Internal scripts can import from src/
import { MultiDomainOrchestrator } from '../../src/orchestration/multi-domain-orchestrator.js';

// These scripts are NOT published as CLI commands
// They're for framework development only
```

---

## Package.json Configuration

### Framework's package.json

```json
{
  "bin": {
    "clodo-service": "./bin/clodo-service.js",
    "clodo-security": "./bin/security/security-cli.js"
  },
  "exports": {
    "./deployment": "./dist/deployment/index.js",
    "./orchestration": "./dist/orchestration/index.js",
    "./security": "./dist/security/index.js"
  },
  "files": [
    "dist",
    "bin/clodo-service.js",
    "bin/service-management",
    "bin/security",
    "bin/shared/config"
  ]
}
```

**Key points:**
- `bin` - CLI commands exposed to users
- `exports` - Module imports for user services
- `files` - What gets published to npm

---

## When to Use Each Pattern

### Use CLI Tools When:
- Creating new projects
- Generating secure keys
- Setting up customer configurations
- Validating configuration files
- One-off administrative tasks

### Use Embedded Deployment When:
- Deploying an existing service
- Running in CI/CD pipelines
- Automated deployment workflows
- Service self-healing/updates
- Production deployments

---

## Best Practices

### For Framework Maintainers

1. **CLI entry points** (`bin/`) must import from `dist/`
2. **Internal scripts** can import from `src/` (not published as CLI)
3. **Always run build** before testing CLI tools
4. **Test with `npm pack`** before publishing

### For Framework Users

1. **Use CLI for scaffolding** only
2. **Embed deployment logic** in your services
3. **Import via package exports** not direct paths
4. **Service autonomy** - don't call external CLI tools for deployment

---

## Testing Your Changes

### Test CLI Tools Locally
```bash
# Build framework
npm run build

# Test CLI commands
node bin/clodo-service.js --help
node bin/security/security-cli.js generate-key jwt

# Test package structure
npm pack --dry-run
```

### Test Service Generation
```bash
# Generate a service
npx @tamyla/clodo-framework clodo-service create test-service

# Test service deployment
cd test-service
npm install
npm run deploy
```

---

## Common Mistakes

### ❌ Mistake 1: CLI importing from src/
```javascript
// bin/clodo-service.js
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';
// ERROR: Module not found (src/ not published)
```

### ✅ Fix: Import from dist/
```javascript
import { ServiceOrchestrator } from '../dist/service-management/ServiceOrchestrator.js';
```

---

### ❌ Mistake 2: User service importing from dist/
```javascript
// user-service/scripts/deploy.js
import { orchestrator } from '@tamyla/clodo-framework/dist/deployment/index.js';
// WORKS but breaks abstraction
```

### ✅ Fix: Use package exports
```javascript
import { orchestrator } from '@tamyla/clodo-framework/deployment';
```

---

### ❌ Mistake 3: Calling CLI tools from service code
```javascript
// user-service/scripts/deploy.js
import { exec } from 'child_process';
exec('npx @tamyla/clodo-framework clodo-service deploy');
// DON'T DO THIS - defeats service autonomy
```

### ✅ Fix: Import and use framework modules
```javascript
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/deployment';
await orchestrator.deploy();
```

---

## Conclusion

The Clodo Framework architecture supports both:
- **Quick scaffolding via CLI tools** (one-time setup)
- **Service autonomy via embedded logic** (ongoing deployments)

This dual approach provides:
- ✅ Developer convenience (CLI for quick starts)
- ✅ Production reliability (services deploy themselves)
- ✅ CI/CD compatibility (no external CLI dependencies)
- ✅ Service autonomy (each service is self-contained)

Remember: **CLI for scaffolding, embedded logic for deployment.**
