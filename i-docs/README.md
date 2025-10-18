# Internal Documentation (i-docs)

This folder contains **internal-only documentation** that is not intended for public consumption. These documents are for framework maintainers, contributors, and internal planning purposes only.

## 📁 Contents

### Enterprise Planning
- **`ENTERPRISE_READINESS_ROADMAP.md`** - 12-month roadmap for enterprise maturation
- **`CRITICAL_PATH_TO_CONFIDENCE.md`** - 8-week immediate action plan for confidence building

### Architecture & Implementation
- **`FRAMEWORK-ARCHITECTURE-ANALYSIS.md`** - Deep architectural analysis and decisions
- **`LEGO-OF-SOFTWARE-ARCHITECTURE.md`** - Core architectural philosophy and design
- **`REUSABLE-FRAMEWORK-COMPONENTS.md`** - Component reusability analysis
- **`ARCHITECTURE_AUDIT_REPORT.md`** - Architecture audit findings
- **`BRIDGE_PATTERN_DESIGN.md`** - Bridge pattern implementation design
- **`deployment-architecture-analysis.md`** - Deployment architecture analysis
- **`IMPORT_STANDARDIZATION_REPORT.md`** - Import standardization analysis
- **`INTEGRATION_STRATEGY.md`** - Integration strategy and planning
- **`wrangler-deployer-modularization-plan.md`** - Wrangler deployer modularization plan

### Development Reports & Summaries
- **`integration-improvements-summary.md`** - Integration improvements summary
- **`interactive-base-improvement-summary.md`** - Interactive base improvements
- **`modularization-completion-summary.md`** - Modularization completion report
- **`PHASE1_ANALYSIS.md`** - Phase 1 development analysis
- **`PHASE1_TASK2_DESIGN.md`** - Phase 1 task 2 design document
- **`PHASE1_TASK3-4_UPDATE_ERRORS.md`** - Phase 1 error analysis and updates
- **`PHASE3_COMPLETION_REPORT.md`** - Phase 3 completion report

### Development Planning
- **`FRAMEWORK-EXTRACTION-PLAN.md`** - Framework extraction and modularization strategy
- **`WORKFLOW-ORDER-ANALYSIS.md`** - Development workflow optimization
- **`decision-framework.md`** - Decision-making framework for development choices

### User Guides & Tutorials
- **`FRAMEWORK-ARCHITECTURE-OVERVIEW.md`** - Detailed architecture overview (internal version)
- **`INTEGRATION_GUIDE.md`** - Comprehensive integration guide (internal version)
- **`cli-tutorial.md`** - CLI usage tutorial (internal version)
- **`examples-gallery.md`** - Examples gallery (internal version)
- **`getting-started.md`** - Getting started guide (internal version)

### Configuration & Deployment
- **`customer-config-framework.md`** - Customer configuration framework
- **`customer-config.md`** - Customer configuration guide
- **`deployment-requirements.md`** - Deployment requirements guide
- **`deployment/`** - Deployment guides and documentation

### Developer Resources
- **`examples/`** - Code examples and samples
- **`guides/`** - Developer guides and tutorials
- **`quickstart-templates/`** - Quickstart project templates
- **`api/`** - API documentation (detailed internal version)

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