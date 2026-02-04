# 📋 Documentation Organization Guide

## Overview

The Clodo Framework maintains a clear separation between **public documentation** (for developers using the framework) and **internal documentation** (for framework maintainers and planning). This guide explains the organization and ensures proper access control.

## 🏗️ Documentation Structure

### 📖 Public Documentation (`docs/`)
**Purpose**: Developer-facing documentation included in the NPM package
**Access**: Public - Available to all framework users
**Location**: `docs/` folder
**Distribution**: Included in `@tamyla/clodo-framework` NPM package

#### What's Included:
- **API References** - Complete programmatic API documentation
- **Getting Started Guides** - Tutorials and quick starts
- **Migration Guides** - Upgrading from CLI to programmatic APIs
- **Error References** - Troubleshooting and error codes
- **Security Documentation** - Security considerations
- **Framework Overview** - Philosophy and core concepts

#### Key Files:
- `docs/README.md` - Documentation index and navigation
- `docs/00_START_HERE.md` - Developer quick start (5 minutes)
- `docs/api/PROGRAMMATIC_API.md` - Complete API usage guide
- `docs/api/parameter_reference.md` - All parameters and validation
- `docs/errors.md` - Error codes and troubleshooting

### 🔒 Internal Documentation (`i-docs/`)
**Purpose**: Confidential internal documentation for framework development
**Access**: Private - Framework maintainers and contributors only
**Location**: `i-docs/` folder
**Distribution**: ❌ Excluded from NPM package

#### What's Included:
- **Business Strategy** - Commercialization plans, pricing, market analysis
- **Technical Architecture** - Internal design decisions and implementation details
- **Development Planning** - Roadmaps, task breakdowns, strategic planning
- **Analysis Reports** - Code analysis, optimization findings, validation results
- **Session Reports** - Development history and progress tracking

#### Key Categories:
- `i-docs/commercialization/` - Business strategy and monetization
- `i-docs/roadmap/` - Development planning and roadmaps
- `i-docs/analysis/` - Technical analysis and optimization
- `i-docs/architecture/` - Internal architecture decisions

## 🏷️ Access Control & Security

### NPM Package Exclusion
- **`.npmignore`** excludes `i-docs/` folder entirely
- **`package.json`** `files` array only includes specific public docs
- **Build Process** ensures no internal docs leak into distribution

### Repository Organization
- **Clear Folder Naming**: `docs/` (public) vs `i-docs/` (internal)
- **README Markers**: Clear badges indicating access level
- **Content Warnings**: Internal docs have confidentiality notices

### Developer Experience
- **Public docs** are easily discoverable and well-organized
- **Internal docs** are clearly marked as private
- **Navigation** guides developers to appropriate resources

## 📚 Developer Journey

### For New Developers (Using the Framework)
1. **Start**: `docs/00_START_HERE.md` (5-minute quick start)
2. **Learn**: `docs/README.md` (documentation index)
3. **API**: `docs/api/PROGRAMMATIC_API.md` (complete API guide)
4. **Reference**: `docs/api/parameter_reference.md` (all parameters)
5. **Troubleshoot**: `docs/errors.md` (error codes and solutions)

### For Contributors (Developing the Framework)
1. **Public Interface**: Review `docs/` for API consistency
2. **Internal Planning**: Check `i-docs/commercialization/` for business context
3. **Technical Decisions**: Review `i-docs/analysis/` for architecture rationale
4. **Development Tasks**: Check `i-docs/roadmap/` for planning

## 🔍 Finding Documentation

### Quick Lookup Table

| I Need... | Public Docs | Internal Docs |
|-----------|-------------|---------------|
| **API Usage** | `docs/api/PROGRAMMATIC_API.md` | - |
| **Parameter Reference** | `docs/api/parameter_reference.md` | - |
| **Getting Started** | `docs/00_START_HERE.md` | - |
| **Error Codes** | `docs/errors.md` | - |
| **Business Strategy** | - | `i-docs/commercialization/` |
| **Technical Architecture** | `docs/overview.md` | `i-docs/architecture/` |
| **Development Planning** | - | `i-docs/roadmap/` |
| **Code Analysis** | - | `i-docs/analysis/` |

### Search Patterns
- **Public docs**: Focus on usage, APIs, examples, troubleshooting
- **Internal docs**: Focus on planning, analysis, business strategy, implementation details

## 📋 Maintenance Guidelines

### Adding Public Documentation
- Place in `docs/` folder with appropriate subfolder
- Update `docs/README.md` navigation
- Ensure included in `package.json` files array
- Test that it appears in NPM package

### Adding Internal Documentation
- Place in appropriate `i-docs/` subfolder
- Update `i-docs/README.md` index
- Verify excluded from NPM (check `.npmignore`)
- Mark with appropriate confidentiality level

### Content Standards
- **Public**: Developer-focused, API reference, examples, troubleshooting
- **Internal**: Business strategy, implementation details, planning documents
- **Cross-references**: Link between related docs when appropriate
- **Versioning**: Keep docs current with framework changes

## 🚨 Security & Compliance

### Confidentiality Requirements
- **Internal docs** may contain business-sensitive information
- **Access control** prevents accidental public exposure
- **Distribution checks** ensure proper exclusion from public packages

### Quality Assurance
- **Regular audits** of documentation organization
- **Access reviews** for internal documentation
- **Publication checks** before NPM releases

## 📞 Support & Questions

- **Using the Framework**: Check public `docs/` folder
- **Contributing**: Review internal `i-docs/` for context
- **Documentation Issues**: Check appropriate folder's README

---

**This organization ensures developers can easily find what they need while maintaining proper separation between public and confidential information.**</content>
<parameter name="filePath">g:\coding\tamyla\lego-framework\clodo-framework\issues\30thjan2026clodo-application\DOCUMENTATION_ORGANIZATION.md