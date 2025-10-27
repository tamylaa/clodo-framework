# Internal Documentation (i-docs)

This folder contains **internal-only documentation** that is not intended for public consumption. These documents are for framework maintainers, contributors, and internal planning purposes only.

## 📁 Contents

### Architecture Documentation (`architecture/`)
Comprehensive architectural analysis and design decisions for the framework.

- **`DOMAIN_ROUTES_AUTOMATION.md`** - Complete domain/routes automation system design, implementation, and usage guide
- **`ROUTING_ARCHITECTURE.md`** - Complete routing architecture assessment, reuse strategy, and implementation guide

### Analysis Documentation (`analysis/`)
Technical analysis, optimization reports, and validation findings.

- **`CODEBASE_OPTIMIZATION.md`** - Comprehensive codebase optimization analysis with executive summary, technical analysis, implementation blueprints, and quick reference
- **`REFACTORING_ANALYSIS.md`** - Complete refactoring technical analysis, progress summary, implementation plan, and validation results
- **`REDUNDANCY_ANALYSIS.md`** - Comprehensive redundancy analysis covering 38+ implementations across 61+ files, consolidation metrics, test results, and implementation strategy
- **`FEATURE_VALIDATION.md`** - Complete feature validation guide with parity audit, detailed findings, and critical validation issues
- **`TEST_ORGANIZATION.md`** - Test organization and coverage analysis with inventory, CLI tests, and coverage metrics

### Deployment Documentation (`deployment/`)
Deployment architecture, configuration, and operational guides.

- **`WORKERS_SITES_CONFIG.md`** - Complete Workers Sites configuration design and user guide
- **`DEPLOYMENT_ARCHITECTURE.md`** - Complete deployment architecture analysis with current state assessment and future modularization strategy

### Developer Guides (`guides/`)
Developer-focused guides, tutorials, and workflow documentation.

- **`DEVELOPMENT_WORKFLOW.md`** - Complete development workflow covering git operations, build processes, distribution, and downstream consumption patterns
- **`DOCUMENTATION_WORKFLOW_GUIDELINES.md`** - Framework for maintaining clean, organized documentation to prevent accumulation
- **`project-structure.md`** - Project structure and organization guide
- **`INTEGRATION_GUIDE.md`** - Comprehensive integration guide
- **`cli-tutorial.md`** - CLI usage tutorial
- **`examples-gallery.md`** - Examples gallery
- **`getting-started.md`** - Getting started guide
- **`customer-config-framework.md`** - Customer configuration framework
- **`customer-config.md`** - Customer configuration guide

### Session Reports (`session-reports/`)
Historical development session summaries and progress reports.

- **`RELEASE_CHECKLIST.md`** - Release preparation checklist with verification steps and deployment procedures

### Roadmap & Planning (`roadmap/`)
Strategic planning and roadmap documentation.

### Commercialization (`commercialization/`)
Business and commercialization strategy documents.

### Examples (`examples/`)
Code examples and implementation samples.

### Quickstart Templates (`quickstart-templates/`)
Project templates and quickstart guides.

### API Documentation (`api/`)
Detailed internal API documentation.

## 🔒 Access Control

These documents contain:
- Internal planning and strategy information
- Unreleased feature discussions
- Security implementation details
- Business-sensitive information
- Raw analysis and decision-making processes

**Do not share externally** without explicit approval from framework maintainers.

## 📦 Package Distribution Policy

**CRITICAL**: Files in this `i-docs/` folder are **NEVER** included in npm package distribution. Only essential, public-facing documentation from `../docs/` is bundled with the package.

The following docs are distributed with the npm package:
- `docs/README.md` - Main documentation index
- `docs/overview.md` - Framework overview
- `docs/SECURITY.md` - Security documentation
- `docs/api-reference.md` - API reference

All other documentation (including this i-docs folder) remains repository-only.

## 📝 Contributing

When adding new internal documentation:
1. Place it in the appropriate subdirectory (`architecture/`, `analysis/`, `deployment/`, `guides/`, etc.)
2. Add a brief description to this README under the relevant section
3. Ensure no sensitive information is included
4. Consider if the document should eventually be moved to public docs when appropriate

## 🔄 Lifecycle

Internal documents may be moved to the public `docs/` folder when:
- Information becomes stable and developer-relevant
- Security reviews are completed
- Business approval is granted
- Content is sanitized for public consumption

## 📊 Recent Changes

**Phase 2 Content Consolidation (October 2025)**:
- Consolidated 40+ scattered documents into 8 comprehensive guides
- Organized content into logical subdirectories (architecture/, analysis/, deployment/, guides/)
- Eliminated redundancy while preserving all valuable technical content
- Improved discoverability and maintenance efficiency

## 🔒 Access Control

These documents contain:
- Internal planning and strategy information
- Unreleased feature discussions
- Security implementation details
- Business-sensitive information
- Raw analysis and decision-making processes

**Do not share externally** without explicit approval from framework maintainers.

## 📦 Package Distribution Policy

**CRITICAL**: Files in this `i-docs/` folder are **NEVER** included in npm package distribution. Only essential, public-facing documentation from `../docs/` is bundled with the package.

The following docs are distributed with the npm package:
- `docs/README.md` - Main documentation index
- `docs/overview.md` - Framework overview
- `docs/SECURITY.md` - Security documentation
- `docs/api-reference.md` - API reference

All other documentation (including this i-docs folder) remains repository-only.

## 📝 Contributing

When adding new internal documentation:
1. Place it in this `i-docs/` folder
2. Add a brief description to this README
3. Ensure no sensitive information is included
4. Consider if the document should eventually be moved to public docs when appropriate

## 🔄 Lifecycle

Internal documents may be moved to the public `docs/` folder when:
- Information becomes stable and developer-relevant
- Security reviews are completed
- Business approval is granted
- Content is sanitized for public consumption</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\lego-framework\i-docs\README.md