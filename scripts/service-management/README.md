# Service Management Scripts

Scripts for creating, initializing, and setting up Lego Framework services.

## Scripts

### setup-interactive.ps1
Interactive service setup wizard that guides users through creating new services.

**Features:**
- Interactive prompts for service configuration
- Template selection and customization
- Domain configuration setup
- Automatic dependency installation

**Usage:**
```powershell
.\scripts\service-management\setup-interactive.ps1 -ServiceName my-service -ServiceType api-gateway
```

**Parameters:**
- `ServiceName` - Name of the service to create
- `ServiceType` - Type of service (data-service, auth-service, content-service, api-gateway, generic)
- `DomainName` - Domain name for the service
- `NonInteractive` - Skip interactive prompts
- `TemplatePath` - Path to service templates
- `OutputPath` - Output directory for the service