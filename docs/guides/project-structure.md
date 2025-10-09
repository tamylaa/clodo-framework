# LEGO Framework Project Structure Guide

This document defines the organization standards and directory structure guidelines for the LEGO Framework.

## Directory Structure Overview

```
lego-framework/
├── src/                    # Core framework source code
├── bin/                    # CLI tools and shared utilities
├── docs/                   # All documentation
├── test/                   # All test files
├── config/                 # Configuration templates
├── examples/               # Usage examples
├── scripts/                # Utility scripts
├── templates/              # Code generation templates
└── types/                  # TypeScript definitions
```

## Source Code Organization (`src/`)

### Core Principles
- **Single Responsibility**: Each directory has a clear, single purpose
- **Canonical Imports**: Use `src/` as the canonical source for framework modules
- **Modular Architecture**: Components are loosely coupled and highly cohesive

### Directory Structure
```
src/
├── config/                 # Configuration management
├── database/               # Database orchestration
├── deployment/             # Deployment utilities
├── handlers/               # Request handlers
├── migration/              # Migration utilities
├── modules/                # Framework modules
├── orchestration/          # Service orchestration
│   └── modules/            # Orchestration components
├── routing/                # Routing logic
├── schema/                 # Schema management
├── security/               # Security components
├── service-management/     # Service lifecycle management
│   └── handlers/           # Service management handlers
├── services/               # Core services
├── utils/                  # Utility functions
│   └── deployment/         # Deployment-specific utilities
├── version/                # Version management
└── worker/                 # Worker utilities
```

## CLI Tools Organization (`bin/`)

### Purpose
The `bin/` directory contains CLI tools and their shared utilities, optimized for command-line operations.

### Structure
```
bin/
├── lego-service.js         # Main service CLI
├── enterprise-deploy.js    # Enterprise deployment CLI
├── master-deploy.js        # Master deployment CLI
├── portfolio-manager.js    # Portfolio management CLI
└── shared/                 # CLI-specific utilities
    ├── cloudflare/         # Cloudflare integrations
    ├── config/             # Configuration utilities
    ├── database/           # Database utilities
    ├── deployment/         # Deployment utilities
    ├── monitoring/         # Monitoring utilities
    ├── production-tester/  # Production testing
    ├── security/           # Security utilities
    └── utils/              # General utilities
```

### Key Insight: CLI Utilities are Canonical
The `bin/shared/` utilities are the canonical implementations:
- More comprehensive than `src/utils/` equivalents
- Optimized for CLI operations
- Used by multiple CLI tools

## Documentation Organization (`docs/`)

### Structure
```
docs/
├── api/                    # API documentation
├── architecture/           # Architecture analysis and reports
├── deployment/             # Deployment guides
├── examples/               # Code examples
├── guides/                 # User and developer guides
├── *.md                    # Framework overviews and specs
```

### Documentation Types
- **Architecture Reports**: Analysis, audits, and design documents → `docs/architecture/`
- **User Guides**: Getting started, deployment, integration → `docs/guides/`
- **API Documentation**: Interface specifications → `docs/api/`
- **Examples**: Code samples and tutorials → `docs/examples/`

## Test Organization (`test/`)

### Naming Convention
- **Unit tests**: `*.test.js` (e.g., `generation-engine.test.js`)
- **Integration tests**: `*.spec.js` (e.g., `comprehensive-suite.spec.js`)
- **End-to-end tests**: `*.e2e.js`

### Structure
```
test/
├── config/                 # Test configuration
├── integration/            # Integration tests
├── src/                    # Unit tests mirroring src/ structure
├── *.test.js               # Specific component tests
└── *.spec.js               # Test suites
```

## Import Path Standards

### Framework Modules
```javascript
// ✅ Correct: Use src/ canonical paths
import { MultiDomainOrchestrator } from '../src/orchestration/multi-domain-orchestrator.js';

// ❌ Incorrect: Avoid bin/shared paths in src/
import { MultiDomainOrchestrator } from '../bin/shared/orchestration/orchestrator.js';
```

### CLI Utilities
```javascript
// ✅ Correct: CLI tools use bin/shared
import { HealthChecker } from './shared/monitoring/health-checker.js';

// ✅ Also correct: Cross-reference when needed
import { DatabaseOrchestrator } from '../src/database/database-orchestrator.js';
```

### Utility Consolidation
When utilities exist in both locations:
1. **CLI Version is Canonical**: Use `bin/shared/` as the source of truth
2. **Framework Imports**: Point `src/utils/` to `bin/shared/` when possible
3. **Avoid Duplication**: Eliminate redundant implementations

## File Organization Rules

### Root Directory
Keep minimal:
- `package.json`, `README.md`, `LICENSE`
- Configuration files: `babel.config.js`, `eslint.config.js`, etc.
- **NO** analysis reports (→ `docs/architecture/`)
- **NO** test files (→ `test/`)

### File Naming
- **kebab-case**: For directories and files
- **PascalCase**: For class files and components
- **camelCase**: For utility functions and modules

### Documentation Files
- **ALL-CAPS**: For major documentation (`README.md`, `CHANGELOG.md`)
- **kebab-case**: For specific guides (`project-structure.md`)
- **Category prefixes**: For related docs (`PHASE1_*.md` → group together)

## Migration Guidelines

When reorganizing files:
1. **Update imports first**: Check all references before moving
2. **Test after moving**: Verify functionality is preserved
3. **Update documentation**: Keep guides current
4. **Batch similar changes**: Group related file moves

## Maintenance Standards

### Regular Reviews
- **Monthly**: Check for new duplication patterns
- **Per feature**: Evaluate new file placement
- **Major releases**: Comprehensive structure audit

### Quality Metrics
- **Zero duplication**: No identical utility functions
- **Clear paths**: Intuitive file locations
- **Minimal root**: Keep root directory clean
- **Consistent imports**: Follow canonical path standards

## Best Practices

1. **Think Hierarchically**: Organize by domain, then by function
2. **Minimize Depth**: Avoid deeply nested directories (max 3-4 levels)
3. **Group Related**: Keep related functionality together
4. **Separate Concerns**: CLI vs framework vs documentation
5. **Document Decisions**: Update this guide when making structural changes

---

*This guide should be updated whenever significant structural changes are made to the project.*