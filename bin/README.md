# Lego Framework Binaries

This directory contains executable scripts and command-line tools for the Lego Framework.

## Categories

### service-management/
Command-line tools for creating and initializing services.

- `create-service.js` - Create services from templates
- `init-service.js` - Initialize services with auto-generated configurations

### deployment/
Enterprise deployment and orchestration tools.

- `enterprise-deploy.js` - Advanced enterprise deployment CLI
- `master-deploy.js` - Master deployment orchestration

### database/
Database management and operations tools.

- `enterprise-db-manager.js` - Enterprise database management CLI

### portfolio/
Portfolio and multi-service management tools.

- `portfolio-manager.js` - Portfolio management and orchestration

### shared/
Shared utility modules used by other scripts.

Contains various utility modules for:
- Cloudflare operations
- Configuration management
- Database connections
- Deployment auditing
- Domain discovery
- Error recovery
- Health checking
- Multi-domain orchestration
- Production monitoring
- Rollback management
- Secret management
- And more...

## Usage

Run scripts from the project root:

```bash
# Service management
node bin/service-management/init-service.js my-service --type api-gateway

# Deployment
node bin/deployment/enterprise-deploy.js

# Database
node bin/database/enterprise-db-manager.js
```

## Global Installation

For global installation, you can create symlinks or add to PATH:

```bash
# Create symlinks (Linux/Mac)
ln -s $(pwd)/bin/service-management/init-service.js /usr/local/bin/init-service

# Or add to PATH
export PATH="$PATH:$(pwd)/bin/service-management"
```