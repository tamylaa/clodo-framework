# Clodo Service Deployment Testing Script

A comprehensive local testing script for the clodo-service deployment process that safely simulates the information collection, consolidation, and deployment execution phases without making actual Cloudflare API calls.

## Overview

This script tests the complete deployment workflow by:
1. **Information Collection**: Service detection and manifest parsing
2. **Consolidation**: Credential gathering and configuration validation
3. **Execution**: Simulated deployment with detailed phase-by-phase logging

## Usage

```bash
# Basic test (recommended for development)
node scripts/test-clodo-deployment.js

# Test specific phase only
node scripts/test-clodo-deployment.js --test-phase collection
node scripts/test-clodo-deployment.js --test-phase consolidation
node scripts/test-clodo-deployment.js --test-phase execution

# Advanced options
node scripts/test-clodo-deployment.js --verbose --service-path ./my-service
node scripts/test-clodo-deployment.js --no-mock-credentials  # Requires real credentials
node scripts/test-clodo-deployment.js --no-dry-run          # Actually deploy (dangerous!)
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--service-path <path>` | Path to service directory | Current directory |
| `--dry-run` | Simulate deployment without changes | `true` (safe) |
| `--no-dry-run` | Actually perform deployment | `false` |
| `--verbose` | Detailed logging output | `false` |
| `--mock-credentials` | Use mock credentials for testing | `true` (safe) |
| `--no-mock-credentials` | Require real Cloudflare credentials | `false` |
| `--test-phase <phase>` | Test specific phase: `all`, `collection`, `consolidation`, `execution` | `all` |
| `--help` | Show help message | - |

## Testing Phases

### Phase 1: Information Collection
- Detects if current directory is a Clodo service project
- Parses `clodo-service-manifest.json` for service configuration
- Validates project structure and required files
- Extracts service name, type, domain, and environment

### Phase 2: Consolidation
- Analyzes credential gathering strategy (flags → env vars → prompt)
- Consolidates deployment configuration from multiple sources
- Validates all required information is present
- Creates comprehensive deployment plan

### Phase 3: Execution
- Simulates complete deployment workflow
- Tests each deployment phase with realistic timing
- Validates post-deployment checks
- Generates mock deployment results

## Safety Features

- **Dry Run by Default**: No actual deployments or API calls by default
- **Mock Credentials**: Uses safe test credentials unless explicitly disabled
- **Comprehensive Validation**: Tests all validation logic without side effects
- **Detailed Logging**: Shows exactly what would happen in real deployment

## Example Output

```
[14:23:15] 🚀 Starting Clodo Service Deployment Testing
[14:23:15] 📋 Test Phase: all
[14:23:15] 📋 Service Path: C:\path\to\service
[14:23:15] 📋 Dry Run: true

[14:23:15] 🚀 Phase 1: Information Collection
[14:23:15] 📋 Step 1: Detecting service project...
[14:23:15] ✅ Found existing service manifest
[14:23:15] 📋 Step 2: Parsing service information...
[14:23:15] 📋 Service Name: my-test-service
[14:23:15] 📋 Service Type: data-service
[14:23:15] 📋 Domain: test-service.example.com
[14:23:15] ✅ Information collection completed in 45ms

[14:23:15] 🚀 Phase 2: Information Consolidation
[14:23:15] 📋 Step 1: Analyzing credential gathering strategy...
[14:23:15] 📋 Using mock credentials for testing
[14:23:15] 📋 Credential Sources:
[14:23:15] 📋   Environment Variables: ❌
[14:23:15] 📋   Mock Credentials: ✅
[14:23:15] ✅ Information consolidation completed in 23ms

[14:23:15] 🚀 Phase 3: Deployment Execution Simulation
[14:23:15] 📋 Step 2: Simulating deployment phases...
[14:23:15] 📋   Executing: Initialization...
[14:23:15] ✅ Initialization completed
[14:23:15] 📋   Executing: Configuration Validation...
[14:23:15] ✅ Configuration Validation completed
... (additional phases)
[14:23:16] ✅ Deployment execution simulation completed in 5423ms

[14:23:16] 🎉 Clodo Service Deployment Testing Complete
```

## Use Cases

### Development Testing
```bash
# Test deployment logic during development
node scripts/test-clodo-deployment.js --verbose
```

### CI/CD Integration
```bash
# Validate deployment configuration in CI
node scripts/test-clodo-deployment.js --test-phase collection --test-phase consolidation
```

### Debugging
```bash
# Isolate specific deployment issues
node scripts/test-clodo-deployment.js --test-phase execution --verbose
```

### Service Validation
```bash
# Validate service configuration before deployment
node scripts/test-clodo-deployment.js --service-path ./my-service --test-phase collection
```

## Integration with Real Deployment

The testing script validates the same logic as the actual deployment:

1. **Manifest Parsing**: Same JSON parsing and validation as `deploy.js`
2. **Credential Logic**: Same priority order (flags → env → prompt) as real deployment
3. **Configuration Consolidation**: Same validation and consolidation logic
4. **Deployment Phases**: Simulates the same phases as `ModularEnterpriseDeployer`

## Troubleshooting

### "No manifest found" Error
The script will create a mock manifest for testing. For real services, ensure `clodo-service-manifest.json` exists.

### Credential Issues
Use `--mock-credentials` for testing, or provide real Cloudflare credentials via environment variables.

### Permission Errors
Ensure the script has read/write access to the service directory.

## Related Files

- `bin/commands/deploy.js` - Actual deployment command
- `bin/deployment/modular-enterprise-deploy.js` - Deployment orchestrator
- `clodo-service-manifest.json` - Service configuration file
- `README.md` - General framework documentation