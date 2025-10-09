# Deployment Scripts

Scripts for deploying Clodo Framework services to various environments and platforms.

## Scripts

### deploy-domain.ps1
Deploy services to specific domains with comprehensive validation and testing.

**Features:**
- Domain-specific deployment configuration
- Pre-deployment validation
- Automated testing (optional)
- Environment-specific settings
- Rollback capabilities

**Usage:**
```powershell
.\scripts\deployment\deploy-domain.ps1 -DomainName api.example.com -ServiceName my-api -Environment production
```

**Parameters:**
- `DomainName` - Target domain for deployment (required)
- `ServiceName` - Name of the service to deploy
- `Environment` - Target environment (development, staging, production)
- `SkipTests` - Skip automated testing
- `SkipValidation` - Skip pre-deployment validation
- `DryRun` - Show what would be deployed without actually deploying
- `ConfigPath` - Path to domain configuration file
- `WranglerPath` - Path to wrangler configuration file
- `PackagePath` - Path to package.json file