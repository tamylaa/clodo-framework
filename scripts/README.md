# Lego Framework Scripts

This directory contains organized scripts for the Lego Framework, categorized by functionality.

## Categories

### service-management/
Scripts for creating and setting up new services.

- `setup-interactive.ps1` - Interactive service setup wizard

### deployment/
Scripts for deploying services to various environments.

- `deploy-domain.ps1` - Deploy services to specific domains

### testing/
Scripts for testing services and functionality.

- `test.ps1` - Basic test runner
- `test-first.ps1` - Test first service/item
- `test-first50.ps1` - Test first 50 services/items

### utilities/
General utility scripts for maintenance and operations.

- `check-bundle.js` - Bundle validation script
- `cleanup-cli.js` - CLI cleanup utilities
- `generate-secrets.js` - Secret generation utilities
- `validate-schema.js` - Schema validation tools

### database/
Database-related scripts and utilities.

*(Currently empty - database scripts are in bin/database/)*

## Usage

Run scripts from the project root using relative paths:

```powershell
# Service management
.\scripts\service-management\setup-interactive.ps1

# Deployment
.\scripts\deployment\deploy-domain.ps1 -DomainName example.com

# Testing
.\scripts\testing\test.ps1
```