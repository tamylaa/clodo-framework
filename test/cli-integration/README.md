# CLI Integration Tests

Automated, repeatable integration tests for all Clodo Framework CLI commands.

## Overview

These tests validate the real-world effectiveness of CLI commands by:
- Creating isolated test environments
- Installing the local framework package
- Running actual CLI commands with simulated user input
- Validating generated files and configurations
- Testing error scenarios and edge cases

## Test Structure

```
test/cli-integration/
├── setup-test-environment.js     # Test environment manager
├── test-setup.js                 # Global test setup/teardown
├── jest.config.js                # Jest configuration for CLI tests
├── clodo-create-service.test.js  # Service creation tests
├── clodo-init-service.test.js    # Service initialization tests
├── clodo-security.test.js        # Security validation tests
├── e2e-workflows.test.js         # End-to-end workflow tests
└── README.md                     # This file
```

## Running Tests

### Run All CLI Integration Tests
```powershell
npm run test:cli-integration
```

### Run Specific Test Suite
```powershell
# Test service creation
npm run test:cli-create

# Test service initialization
npm run test:cli-init

# Test security validation
npm run test:cli-security

# Test end-to-end workflows
npm run test:cli-e2e
```

### Run with Verbose Output
```powershell
npm run test:cli-integration -- --verbose
```

### Keep Test Environments on Failure
```powershell
# Test environments are automatically kept on failure for inspection
# Find them in: C:\Users\<user>\AppData\Local\Temp\clodo-cli-tests\
```

## Test Coverage

### clodo-create-service
- ✅ Generic service creation
- ✅ Data service with database
- ✅ Auth service with security
- ✅ Content service
- ✅ API gateway service
- ✅ Error handling (empty names, invalid types, conflicts)
- ✅ File validation (67+ files, no placeholders, valid syntax)

### clodo-init-service
- ✅ Fresh service initialization
- ✅ Existing service re-initialization
- ✅ Multi-domain configuration
- ✅ Environment-specific configs
- ✅ Cloudflare API integration (with fallback)
- ✅ Error handling (invalid domains, network failures)
- ✅ Configuration file validation

### clodo-security
- ✅ Security audit
- ✅ Insecure configuration detection
- ✅ Pre-deployment validation
- ✅ Deployment blocking on critical issues
- ✅ Secret generation
- ✅ Audit logging
- ✅ Security pattern validation
- ✅ Exit code validation

### End-to-End Workflows
- ✅ Complete service creation → initialization → validation
- ✅ Data service with database configuration
- ✅ Multi-service portfolio creation
- ✅ Service update and reconfiguration
- ✅ Error recovery
- ✅ Configuration validation chain

## Test Features

### Automatic Test Isolation
Each test runs in a fresh, isolated directory:
```
C:\Users\<user>\AppData\Local\Temp\clodo-cli-tests\
├── cli-test-create-service-generic-<timestamp>/
├── cli-test-init-service-fresh-<timestamp>/
└── cli-test-security-audit-<timestamp>/
```

### Local Package Testing
Tests install the framework from your local workspace:
```javascript
npm install "C:\Users\Admin\Documents\coding\tamyla\lego-framework\clodo-framework"
```

This ensures tests validate your **current code**, not the published npm package.

### Real CLI Execution
Tests run actual CLI commands with simulated input:
```javascript
await env.runCLI('clodo-create-service', {
  input: 'my-service\n1\ny\n'
});
```

### Comprehensive Validation
Tests validate:
- File existence
- File content (no placeholders, valid syntax)
- Configuration correctness
- Error messages
- Exit codes
- Security patterns

## Test Scenarios

### Happy Path Testing
Validates successful execution with valid inputs:
- Service creation with all types
- Domain configuration
- Security validation
- Multi-service creation

### Error Scenario Testing
Validates graceful handling of errors:
- Empty/invalid service names
- Invalid service types
- Directory conflicts
- Network failures
- Authentication failures
- Invalid configurations

### Edge Case Testing
Validates handling of unusual inputs:
- Service names with spaces
- Multiple domains
- Existing configurations
- Missing permissions
- Long paths (Windows 260 char limit)

## Progressive Testing

Tests are designed to be run **repeatedly** during development:

1. **After Code Changes**: Run tests to validate fixes
2. **Before Commits**: Ensure no regressions
3. **During CI/CD**: Automated validation
4. **Before Releases**: Final validation

### Watching for Changes
```powershell
# Run tests on file changes
npm run test:cli-integration -- --watch
```

## Test Environment

### Clean Setup
Each test starts with:
- Fresh directory
- New package.json
- Clean npm install
- No previous state

### Automatic Cleanup
After tests:
- Successful tests: Environment deleted
- Failed tests: Environment preserved for inspection
- All tests complete: Final cleanup

### Manual Cleanup (if needed)
```powershell
Remove-Item -Recurse -Force "$env:TEMP\clodo-cli-tests"
```

## Interpreting Results

### Success Indicators
- ✅ All assertions pass
- ✅ Files generated correctly
- ✅ No placeholders remain
- ✅ Valid syntax/structure
- ✅ Correct exit codes

### Warning Indicators
- ⚠️ Test skipped (feature may not be implemented yet)
- ⚠️ Expected error handled gracefully
- ⚠️ Optional feature not available

### Failure Indicators
- ❌ Assertion failed
- ❌ Unexpected error
- ❌ File validation failed
- ❌ Incorrect exit code

## Troubleshooting

### Test Hangs
If a test hangs, it may be waiting for input:
- Check if CLI has unexpected interactive prompts
- Increase timeout in test configuration
- Add more input lines to simulate user responses

### Test Fails on CI but Passes Locally
- Check file permissions
- Verify Node.js version
- Check for OS-specific path issues
- Ensure npm install completes

### Cannot Find CLI Command
- Verify `bin` entries in package.json
- Check npm install completed successfully
- Ensure framework is installed in test environment

### Test Environment Not Cleaned Up
- Check `keepOnFailure` setting in TestEnvironment
- Manually clean: `Remove-Item -Recurse -Force "$env:TEMP\clodo-cli-tests"`

## Contributing

### Adding New Tests

1. Create test file in `test/cli-integration/`
2. Import TestEnvironment and TestEnvironmentManager
3. Create isolated environment per test
4. Run CLI commands with simulated input
5. Validate outputs and files
6. Add to npm scripts in package.json

Example:
```javascript
import { TestEnvironment, TestEnvironmentManager } from './setup-test-environment.js';

describe('My New CLI Tests', () => {
  let envManager;

  beforeAll(() => {
    envManager = new TestEnvironmentManager();
  });

  afterAll(async () => {
    await envManager.cleanupAll();
  });

  test('should test my CLI feature', async () => {
    const env = await envManager.create({
      name: 'my-test',
      verbose: false
    });

    const input = 'user-input\ny\n';
    await env.runCLI('my-cli-command', { input });

    expect(env.fileExists('expected-file.js')).toBe(true);
  });
});
```

## Performance

### Test Duration
- Individual test: 30-60 seconds
- Test suite: 5-10 minutes
- Full integration suite: 15-20 minutes

### Optimization Tips
- Tests run serially (maxWorkers: 1) to avoid conflicts
- Cleanup happens automatically
- Failed tests preserve environment for inspection

## Next Steps

1. Run all CLI integration tests: `npm run test:cli-integration`
2. Review any failures or warnings
3. Fix issues in CLI implementations
4. Re-run tests to validate fixes
5. Update documentation based on findings

## Related Documentation

- [CLI Testing Plan](../../i-docs/CLI_TESTING_PLAN.md)
- [Competitive Advantage Assessment](../../i-docs/COMPETITIVE_ADVANTAGE_ASSESSMENT.md)
- [CLI Tutorial](../../i-docs/cli-tutorial.md)
- [CLI Architecture](../../i-docs/CLI_ARCHITECTURE.md)
