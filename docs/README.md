# 📚 Clodo Framework Documentation

> **Public Documentation** - Developer-focused guides and API references for using the Clodo Framework
> **📦 Included in NPM Package** | **🌐 Developer Portal**

[![npm version](https://badge.fury.io/js/%40tamyla%2Fclodo-framework.svg)](https://badge.fury.io/js/%40tamyla%2Fclodo-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Public](https://img.shields.io/badge/Access-Public-green.svg)
![NPM](https://img.shields.io/badge/Included-NPM_Package-blue.svg)

## 🚀 Quick Start

```bash
npm install @tamyla/clodo-framework
```

```javascript
import { createServiceProgrammatic } from '@tamyla/clodo-framework/programmatic';
import { validateServicePayload } from '@tamyla/clodo-framework/validation';

const result = await createServiceProgrammatic({
  serviceName: 'my-api',
  serviceType: 'api-service',
  domain: 'api.example.com',
  features: ['d1', 'metrics']
});
```

## 📖 Documentation Guide

### 🎯 **Start Here**
- **[Overview](overview.md)** - Framework philosophy and core concepts
- **[Getting Started](HOWTO_CONSUME_CLODO_FRAMEWORK.md)** - Quick start guide
- **[Migration Guide](MIGRATION.md)** - Migrating from CLI to programmatic APIs

### 🔧 **API Reference**
- **[Programmatic API](api/PROGRAMMATIC_API.md)** - Complete programmatic usage guide
- **[Parameter Reference](api/parameter_reference.md)** - All parameters and validation rules
- **[API Reference](api-reference.md)** - Traditional API documentation

### 🛠️ **Integration & Development**
- **[Simple API Guide](SIMPLE_API_GUIDE.md)** - Simple API usage patterns
- **[Integration Guide](integration/README.md)** - Advanced integration patterns
- **[Security](SECURITY.md)** - Security considerations and best practices

### 📋 **Error Handling**
- **[Error Reference](errors.md)** - Complete error codes and troubleshooting

### 🏗️ **Architecture & Migration**
- **[Framework Evolution](FRAMEWORK_EVOLUTION_NARRATIVE.md)** - Development history and validation
- **[Architecture Overview](architecture/README.md)** - Technical architecture
- **[Migration Guide](MIGRATION.md)** - Breaking changes and migration steps

## 📂 Directory Structure

```
docs/
├── README.md                 # This documentation index
├── overview.md              # Framework overview and philosophy
├── HOWTO_CONSUME_...md      # Getting started guide
├── MIGRATION.md             # Migration and breaking changes
├── SECURITY.md              # Security documentation
├── SIMPLE_API_GUIDE.md      # Simple API usage
├── FRAMEWORK_EVOLUTION...md # Development narrative
├── errors.md                # Error reference
├── api-reference.md         # Traditional API docs
├── api/                     # API documentation
│   ├── PROGRAMMATIC_API.md  # Programmatic API guide
│   └── parameter_reference.md # Parameter specifications
├── integration/             # Integration guides
├── architecture/            # Architecture documentation
└── phases/                  # Development phases
```

## 🔍 **Finding What You Need**

| I want to... | Start with... |
|-------------|---------------|
| **Get started quickly** | [HOWTO_CONSUME_CLODO_FRAMEWORK.md](HOWTO_CONSUME_CLODO_FRAMEWORK.md) |
| **Use programmatic APIs** | [api/PROGRAMMATIC_API.md](api/PROGRAMMATIC_API.md) |
| **Migrate from CLI** | [MIGRATION.md](MIGRATION.md) |
| **Handle errors** | [errors.md](errors.md) |
| **Understand parameters** | [api/parameter_reference.md](api/parameter_reference.md) |
| **See examples** | [SIMPLE_API_GUIDE.md](SIMPLE_API_GUIDE.md) |
| **Learn architecture** | [overview.md](overview.md) |

## 🏷️ **Document Types**

### 📘 **Guides** (How-to)
- **Getting Started**: Step-by-step tutorials
- **Integration**: Advanced usage patterns
- **Migration**: Breaking changes and upgrades

### 📖 **References** (What)
- **API Reference**: Complete API documentation
- **Parameter Reference**: All parameters and validation
- **Error Reference**: Error codes and solutions

### 🏛️ **Architecture** (Why)
- **Overview**: Framework philosophy and concepts
- **Evolution**: Development history and decisions
- **Security**: Security considerations

## 🎯 **Developer Experience**

### **Progressive Disclosure**
- **Quick Start**: Get running in 5 minutes
- **Deep Dives**: Comprehensive references available
- **Migration Path**: Clear upgrade guidance

### **Multiple Entry Points**
- **CLI Users**: Start with migration guide
- **API Users**: Start with programmatic API guide
- **New Users**: Start with getting started guide

### **Clear Navigation**
- **This index** provides overview and navigation
- **Cross-references** link related documents
- **Breadcrumbs** show document location in hierarchy

## 📋 **Contributing to Documentation**

This documentation is automatically included in the npm package. For comprehensive internal documentation, see the `i-docs/` folder (internal only).

### **Documentation Standards**
- Public docs focus on **developer usage** and **API reference**
- Internal docs (`i-docs/`) contain **implementation details** and **planning**
- Clear separation maintains **professional presentation**

## 🆘 **Getting Help**

- **Framework Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- **API Questions**: See [API Reference](api-reference.md)
- **Security Concerns**: Review [Security Documentation](SECURITY.md)
- **Migration Help**: See [Migration Guide](MIGRATION.md)

## 📦 **Package Information**

- **Version**: See package.json
- **License**: MIT
- **Repository**: [GitHub](https://github.com/tamylaa/clodo-framework)

---

**For internal documentation and development guides, see the `i-docs/` folder.**