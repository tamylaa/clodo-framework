# Testing Scripts

Scripts for testing Lego Framework services and functionality.

## Scripts

### test.ps1
Basic test runner for services.

**Usage:**
```powershell
.\scripts\testing\test.ps1
```

### test-first.ps1
Test the first service or item in a collection.

**Features:**
- Focused testing on initial items
- Quick validation of basic functionality
- Useful for CI/CD pipelines

**Usage:**
```powershell
.\scripts\testing\test-first.ps1 -ServiceName my-service
```

### test-first50.ps1
Test the first 50 services or items.

**Features:**
- Batch testing of multiple items
- Performance validation
- Scalability testing

**Usage:**
```powershell
.\scripts\testing\test-first50.ps1 -ServiceType api-gateway
```

## Common Parameters

All testing scripts support:
- `ServiceName` - Name of the service to test
- `ServiceType` - Type of service to test
- `DomainName` - Domain to test against
- `NonInteractive` - Run without user interaction
- `TemplatePath` - Path to test templates
- `OutputPath` - Output directory for test results