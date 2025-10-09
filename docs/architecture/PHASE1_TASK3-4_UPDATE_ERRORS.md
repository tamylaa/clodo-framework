# Phase 1 Task 3-4: Update Capability & Error Handling

## Overview

Enhanced the Clodo Framework CLI with comprehensive **update capabilities** and **error handling/failure capture** system to address service lifecycle management challenges.

## Update Capability (`clodo-service update`)

### Features

#### Interactive Update Mode
```bash
clodo-service update
# or from within a service directory
cd my-service && clodo-service update
```

**Update Options:**
1. **Domain Configuration** - Update domain name and URLs
2. **Cloudflare Settings** - Modify API tokens, account/zone IDs
3. **Environment Settings** - Change deployment environment
4. **Feature Flags** - Add/remove service features
5. **Regenerate All Configs** - Recreate all configuration files
6. **Fix Configuration Errors** - Attempt automatic error correction

#### Non-Interactive Update Mode
```bash
# Update domain
clodo-service update --domain-name new-domain.com

# Update Cloudflare settings
clodo-service update --cloudflare-token new-token --cloudflare-account-id new-id

# Update environment
clodo-service update --environment production

# Modify features
clodo-service update --add-feature authentication
clodo-service update --remove-feature caching

# Regenerate configurations
clodo-service update --regenerate-configs

# Fix errors automatically
clodo-service update --fix-errors
```

#### Auto-Detection
- Automatically detects service directory from current working directory
- Searches parent directories if not found in current location
- Provides clear error messages if service cannot be located

### Implementation Details

#### Service Configuration Loading
- Parses `package.json` for service metadata
- Extracts configuration from `src/config/domains.js`
- Validates current state before applying updates
- Preserves existing settings not being updated

#### Configuration Updates
- **Domain Config**: Updates domain names, URLs, and identifiers
- **Cloudflare Config**: Modifies API tokens and account/zone IDs
- **Environment Config**: Changes deployment targets in `wrangler.toml`
- **Feature Flags**: Adds/removes features in domain configuration
- **File Regeneration**: Recreates all configuration files from templates

## Error Handling & Failure Capture System

### Comprehensive Error Tracking (`ErrorTracker.js`)

#### Error Capture Features
- **Context Preservation**: Captures input state, user selections, and operation context
- **Severity Classification**: Critical, High, Medium, Low severity levels
- **Recovery Suggestions**: Automated generation of fix recommendations
- **Persistent Logging**: Saves error history to `clodo-service-errors.log`

#### Error Categories & Recovery

##### Network/API Errors
```
Error: Failed to connect to Cloudflare API
Recovery:
• Check your internet connection
• Verify Cloudflare API token is valid and has required permissions
• Confirm Cloudflare account and zone IDs are correct
```

##### Authentication Errors
```
Error: Invalid API token
Recovery:
• Verify Cloudflare API token has not expired
• Check that the token has permissions for the required operations
• Regenerate API token if necessary
```

##### File System Errors
```
Error: Permission denied
Recovery:
• Check file permissions on the service directory
• Ensure you have write access to the target directory
• Verify the service path exists and is accessible
```

##### Validation Errors
```
Error: Invalid service name format
Recovery:
• Review input values for correctness
• Use clodo-service validate <path> to check service configuration
• Run clodo-service diagnose <path> for detailed issue analysis
```

##### Configuration Errors
```
Error: Missing required configuration
Recovery:
• Run clodo-service update --fix-errors to attempt automatic fixes
• Check domain configuration in src/config/domains.js
• Verify package.json has all required fields
```

### Error Reporting & Analysis

#### Command: `clodo-service diagnose`
```bash
# Diagnose current service
clodo-service diagnose

# Diagnose specific service
clodo-service diagnose /path/to/service

# Deep analysis with dependency checks
clodo-service diagnose --deep-scan

# Export diagnostic report
clodo-service diagnose --export-report diagnosis.json
```

**Diagnostic Output:**
```
🔍 Diagnostic Report
Service: my-service
Path: /path/to/service

❌ Critical Errors:
  • Missing required file: src/worker/index.js
    Location: /path/to/service
    💡 Run 'clodo-service update --regenerate-configs' to recreate missing files

⚠️  Warnings:
  • Domain configuration may not be using Clodo Framework schema
    Location: src/config/domains.js
    💡 Ensure domain config uses createDomainConfigSchema from @tamyla/clodo-framework

💡 Recommendations:
  • Consider running tests to validate service functionality
  • Check Cloudflare authentication if deployment fails
  • Verify all dependencies are installed with npm install
```

#### Error Log Analysis
- **Persistent Error Log**: `clodo-service-errors.log` contains detailed error history
- **Error Summary**: Aggregated statistics on error types and frequencies
- **Trend Analysis**: Identifies most problematic commands and common failure patterns

### Recovery Mechanisms

#### Automatic Error Recovery
- **Permission Fixes**: Attempts to resolve file access issues
- **Configuration Fixes**: Auto-corrects common configuration problems
- **Template Regeneration**: Recreates corrupted configuration files
- **Dependency Validation**: Checks and reports missing dependencies

#### Manual Recovery Guidance
- **Step-by-Step Instructions**: Clear guidance for manual fixes
- **Alternative Approaches**: Suggests different ways to achieve the same goal
- **Support Resources**: Links to documentation and help resources

### Integration with Three-Tier System

#### Error Context Preservation
- **Tier 1 Errors**: Captures validation failures during input collection
- **Tier 2 Errors**: Tracks confirmation and derivation failures
- **Tier 3 Errors**: Logs generation and configuration failures

#### Recovery at Each Tier
- **Input Recovery**: Allows users to correct invalid inputs and retry
- **Confirmation Recovery**: Enables re-derivation of failed confirmations
- **Generation Recovery**: Supports partial regeneration of failed components

## Usage Examples

### Complete Service Update Workflow
```bash
# 1. Diagnose current issues
clodo-service diagnose

# 2. Attempt automatic fixes
clodo-service update --fix-errors

# 3. Update domain configuration
clodo-service update --domain-name new-domain.com

# 4. Update Cloudflare settings
clodo-service update --cloudflare-token $(cat new-token.txt)

# 5. Regenerate all configurations
clodo-service update --regenerate-configs

# 6. Validate final configuration
clodo-service validate
```

### Error Recovery Workflow
```bash
# Service creation failed
clodo-service create --service-name my-service
# Error: Invalid Cloudflare token

# Diagnose the issue
clodo-service diagnose my-service

# Update with correct token
clodo-service update my-service --cloudflare-token correct-token

# Continue with configuration
clodo-service update my-service --regenerate-configs
```

## Technical Implementation

### ErrorTracker Class
- **Error Storage**: In-memory error history with file persistence
- **Context Tracking**: Captures command, inputs, and operation state
- **Recovery Engine**: Generates contextual fix suggestions
- **Reporting**: Exports detailed error reports and summaries

### ServiceOrchestrator Updates
- **Update Methods**: Interactive and non-interactive update workflows
- **Configuration Parsing**: Extracts current settings from service files
- **Validation Integration**: Uses existing validation with enhanced error reporting
- **Recovery Integration**: Applies ErrorTracker suggestions during updates

### CLI Enhancements
- **Update Command**: Full-featured service modification interface
- **Diagnose Command**: Comprehensive issue detection and reporting
- **Error Display**: Rich error messages with recovery suggestions
- **Progress Tracking**: Clear feedback during long-running operations

## Benefits

### For Users
- **Resilient Operations**: Continue working even when errors occur
- **Clear Guidance**: Understand what went wrong and how to fix it
- **Flexible Updates**: Modify services without complete recreation
- **Problem Prevention**: Early detection of configuration issues

### For Development
- **Debugging Support**: Detailed error context for troubleshooting
- **Failure Analysis**: Understand patterns in service creation issues
- **Automated Recovery**: Reduce manual intervention requirements
- **Quality Assurance**: Validate service health before deployment

This implementation transforms the Clodo Framework CLI from a basic creation tool into a comprehensive service lifecycle management system with robust error handling and recovery capabilities.</content>
<parameter name="filePath">c:\Users\Admin\Documents\coding\tamyla\clodo-framework\docs\architecture\PHASE1_TASK3-4_UPDATE_ERRORS.md