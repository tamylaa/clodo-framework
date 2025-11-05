# Clodo Framework CLI Tools (Private Implementation)# Clodo Framework Binaries



⚠️ **IMPORTANT: This directory contains CLI implementation details and is NOT meant for programmatic import by framework users.**This directory contains executable scripts and command-line tools for the Clodo Framework.



## For Framework Users## Categories



If you're using `@tamyla/clodo-framework` in your project, **do not import from `dist/bin/`**. ### service-management/

Command-line tools for creating and initializing services.

Use the public API exported via package.json:

- `create-service.js` - Create services from templates

```javascript- `init-service.js` - Initialize services with auto-generated configurations

// ✅ CORRECT - Use public framework API

import { GenericDataService } from '@tamyla/clodo-framework/services';### deployment/

import { EnhancedRouter } from '@tamyla/clodo-framework/routing';Enterprise deployment and orchestration tools.

import { CloudflareAPI } from '@tamyla/clodo-framework/utils/cloudflare';

import { DeploymentOrchestrator } from '@tamyla/clodo-framework/deployment';- `enterprise-deploy.js` - Advanced enterprise deployment CLI

- `master-deploy.js` - Master deployment orchestration

// ❌ WRONG - Don't import CLI internals

import { healthCheckWithBackoff } from '@tamyla/clodo-framework/dist/bin/shared/monitoring/health-checker.js';### database/

import { deploymentUI } from '@tamyla/clodo-framework/dist/bin/commands/helpers/deployment-ui.js';Database management and operations tools.

```

- `enterprise-db-manager.js` - Enterprise database management CLI

## For CLI Users

### portfolio/

The CLI tools are accessed via the installed commands:Portfolio and multi-service management tools.



```bash- `portfolio-manager.js` - Portfolio management and orchestration

# Main service CLI

clodo-service deploy### shared/

clodo-service validateShared utility modules used by other scripts.

clodo-service update

Contains various utility modules for:

# Service creation- Cloudflare operations

clodo-create-service my-new-service- Configuration management

- Database connections

# Service initialization- Deployment auditing

clodo-init-service- Domain discovery

- Error recovery

# Security auditing- Health checking

clodo-security audit- Multi-domain orchestration

```- Production monitoring

- Rollback management

## Directory Structure (Private Implementation)- Secret management

- And more...

```

bin/## Usage

├── clodo-service.js              # Main CLI entry point

├── commands/                     # Command implementationsRun scripts from the project root:

│   ├── deploy.js                 # Deployment command

│   ├── validate.js               # Validation command```bash

│   └── helpers/                  # UI-specific helpers# Service management

│       ├── deployment-ui.js      # Terminal prompts & formattingnode bin/service-management/init-service.js my-service --type api-gateway

│       ├── error-recovery.js     # Interactive error recovery

│       ├── deployment-verification.js  # Health check prompts# Deployment

│       └── resource-detection.js # Resource display logicnode bin/deployment/enterprise-deploy.js

├── shared/                       # Shared CLI infrastructure

│   ├── monitoring/# Database

│   │   └── health-checker.js     # Health checks with terminal outputnode bin/database/enterprise-db-manager.js

│   ├── error-handling/```

│   │   └── error-classifier.js   # Error classification for CLI

│   ├── cloudflare/## Global Installation

│   │   └── ops.js                # Cloudflare operations (wrangler wrappers)

│   └── deployment/               # Deployment utilitiesFor global installation, you can create symlinks or add to PATH:

└── service-management/           # Service creation/init CLIs

``````bash

# Create symlinks (Linux/Mac)

## Architectural Principle: Separation of Concernsln -s $(pwd)/bin/service-management/init-service.js /usr/local/bin/init-service



### `src/` Directory = Public Framework API# Or add to PATH

- **Purpose**: Clean, programmatic, reusable library codeexport PATH="$PATH:$(pwd)/bin/service-management"

- **Consumers**: Other projects importing @tamyla/clodo-framework```
- **Exports**: Defined explicitly in package.json `exports` field
- **Style**: No terminal UI, pure business logic
- **Example**: `CloudflareAPI`, `GenericDataService`, `EnhancedRouter`

### `bin/` Directory = Private CLI Implementation
- **Purpose**: Terminal-focused, interactive command-line tools
- **Consumers**: CLI users running `clodo-service` commands
- **Exports**: Only the 4 executable commands in package.json `bin` field
- **Style**: Uses chalk, readline, prompts - designed for human interaction
- **Example**: Deployment prompts, health check spinners, error recovery menus

### The CLI is a Consumer of the Framework

The `bin/` directory imports from `src/` to build CLI commands:

```javascript
// bin/commands/deploy.js
import { DeploymentOrchestrator } from '../../../src/deployment/index.js';
import { CloudflareAPI } from '../../../src/utils/cloudflare/api.js';
import { confirmDeployment } from './helpers/deployment-ui.js';  // CLI-specific UI

// CLI adds terminal UI on top of framework logic
const orchestrator = new DeploymentOrchestrator(config);
const confirmed = await confirmDeployment(options);  // Interactive prompt
await orchestrator.deploy();  // Framework business logic
```

## Why This Separation Matters

1. **Clarity**: Framework users know exactly what's public API (via `exports`)
2. **Stability**: CLI internals can change without breaking framework consumers
3. **Flexibility**: CLI can use interactive libraries (chalk, inquirer) without polluting framework
4. **Reusability**: Framework `src/` code is pure, testable, and importable anywhere

## What Belongs Where?

### Put in `src/` if:
- ✅ Reusable business logic
- ✅ API wrappers (Cloudflare, D1, etc.)
- ✅ Data structures and models
- ✅ Algorithms and utilities
- ✅ No terminal-specific code (no chalk, no prompts)

### Put in `bin/` if:
- ✅ Command implementations
- ✅ Terminal UI (prompts, spinners, formatting)
- ✅ CLI-specific workflows
- ✅ Interactive error recovery
- ✅ Uses chalk, readline, inquirer, ora, etc.

## Contributing

When adding new functionality:

1. **Business logic**: Add to `src/`, export via package.json
2. **CLI command**: Add to `bin/commands/`
3. **CLI helpers**: Add to `bin/commands/helpers/` (UI only, delegate to `src/`)
4. **Shared CLI utils**: Add to `bin/shared/` (only if truly CLI-specific)

Remember: `bin/` should be thin UI wrappers around the rich framework in `src/`.

## Configuration System

### Framework Configuration (`validation-config.json`)

The framework includes a comprehensive configuration file at `config/validation-config.json` with:
- **Timing settings**: Timeouts, retry delays, intervals
- **Command definitions**: Platform-specific commands (wrangler, npm, etc.)
- **Network endpoints**: API endpoints for validation
- **Environment settings**: Production, staging, development presets

### Service-Level Configuration (Optional)

**Most services DON'T need their own config** - the framework provides sensible defaults.

However, if you need to customize settings for your service:

```bash
# Initialize configuration in your service directory
npx clodo-service init-config

# This copies the framework's config to your service directory
# Edit validation-config.json to customize
```

**When to use custom config:**
- Custom timeout values for your specific use case
- Additional service-specific endpoints to validate
- Platform-specific command overrides
- Environment-specific requirements

**Config priority:**
1. Service's `validation-config.json` (if exists)
2. Framework's `config/validation-config.json` (bundled)
3. Hardcoded defaults (fallback)

