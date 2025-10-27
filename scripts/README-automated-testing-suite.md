# Clodo Framework Automated Testing Suite

A comprehensive automated testing system for the entire clodo-framework that tests all CLI commands, deployment processes, service lifecycle, integrations, performance, and prevents regressions.

## Overview

The automated testing suite provides systematic testing across multiple categories with **comprehensive coverage of the `clodo-service deploy` command's 3-level input processing**:

- **CLI Tests**: All `clodo-service` commands and help systems
- **Deployment Tests**: Complete `clodo-service deploy` command validation (Service Detection → Credential Gathering → Configuration Extraction)
- **Lifecycle Tests**: Complete service create → validate → deploy → update cycle
- **Integration Tests**: Cross-component functionality and build processes
- **Performance Tests**: Build and test execution timing
- **Regression Tests**: Prevention of known issues

## Quick Start

```bash
# Run all tests (recommended)
node scripts/automated-testing-suite.js

# Run specific test categories
node scripts/automated-testing-suite.js cli deployment

# Run with verbose output
node scripts/automated-testing-suite.js --verbose

# Run only CLI tests
node scripts/automated-testing-suite.js cli
```

## Test Categories

### CLI Tests (`cli`)
Tests all command-line interface functionality:
- Help commands and usage information
- Command availability and error handling
- Option parsing and validation

### Deployment Tests (`deployment`)
Comprehensive testing of the `clodo-service deploy` command covering all **3 levels of input processing**:

#### Level 1: Service Detection
- Validates presence of `clodo-service-manifest.json`
- Tests error handling when manifest is missing
- Verifies service type and configuration detection

#### Level 2: Credential Gathering
- Tests credential priority: command flags → environment variables → failure
- Validates credential validation and error messages
- Tests different credential input methods (flags, env vars)

#### Level 3: Configuration Extraction
- Tests manifest parsing and configuration extraction
- Validates domain, environment, and deployment settings
- Tests deployment plan generation and validation

**Test Coverage**: 8 deployment tests including real service manifests, credential scenarios, and error conditions.

### Lifecycle Tests (`lifecycle`)
Tests complete service lifecycle:
- Service creation with different types
- Service validation
- Deployment dry-run testing
- Service updates and management

### Integration Tests (`integration`)
Tests cross-component functionality:
- Full npm test suite execution
- Build and type checking
- Linting and unit test integration
- Dependency validation

### Performance Tests (`performance`)
Measures system performance:
- Build execution time
- Test suite performance
- Resource usage monitoring

### Regression Tests (`regression`)
Prevents known issues from reoccurring:
- Missing dependency detection
- Build completeness validation
- CLI command availability
- Framework integrity checks

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--test-dir <path>` | Directory for test artifacts | `./test-automation` |
| `--verbose` | Detailed logging and output | `false` |
| `--no-clean` | Keep test artifacts after run | `false` (cleans by default) |
| `--parallel` | Run tests in parallel | `false` (future feature) |
| `--categories <list>` | Comma-separated categories | `all` |
| `--timeout <ms>` | Individual test timeout | `300000` (5 minutes) |
| `--help` | Show help message | - |

## Usage Examples

### Development Testing
```bash
# Quick CLI validation during development
node scripts/automated-testing-suite.js cli --verbose

# Test deployment logic
node scripts/automated-testing-suite.js deployment

# Full integration test
node scripts/automated-testing-suite.js integration
```

### CI/CD Integration
```bash
# Run all tests in CI environment
node scripts/automated-testing-suite.js --verbose --no-clean

# Quick smoke test for PR validation
node scripts/automated-testing-suite.js cli deployment --timeout 60000

# Performance regression testing
node scripts/automated-testing-suite.js performance
```

### Debugging and Investigation
```bash
# Isolate failing tests
node scripts/automated-testing-suite.js cli --verbose

# Test specific functionality
node scripts/automated-testing-suite.js lifecycle --test-dir ./debug-tests

# Full diagnostic run
node scripts/automated-testing-suite.js all --verbose --no-clean
```

## Test Output and Reports

### Console Output
The suite provides real-time feedback:
```
[14:23:15] 🚀 Starting Clodo Framework Automated Testing Suite
[14:23:15] 🧪 Test Directory: C:\path\to\test-automation
[14:23:15] 🧪 Categories: all
[14:23:15] 🧪 Parallel Execution: false

[14:23:15] 🚀 Running CLI Command Tests
[14:23:15] 🧪 Running: clodo-service --help
[14:23:15] ✅ clodo-service --help (45ms)
[14:23:15] 🧪 Running: clodo-service list-types
[14:23:15] ✅ clodo-service list-types (23ms)
...
[14:23:20] 🎉 Automated Testing Suite Complete

📊 Test Summary:
  Total Tests: 24
  Passed: 22
  Failed: 2
  Skipped: 0
  Duration: 4521ms

📋 Category Results:
  cli: ✅ 5/5 passed
  deployment: ✅ 4/4 passed
  lifecycle: ❌ 2/3 passed
  integration: ✅ 3/3 passed
  performance: ✅ 2/2 passed
  regression: ✅ 4/4 passed
```

### Detailed Report
A JSON report is automatically saved to `test-automation/test-report.json`:
```json
{
  "timestamp": "2025-10-27T14:23:20.000Z",
  "summary": {
    "total": 24,
    "passed": 22,
    "failed": 2,
    "skipped": 0,
    "duration": 4521
  },
  "categories": {
    "cli": {
      "tests": [...],
      "passed": 5,
      "failed": 0
    }
  },
  "failures": [...],
  "options": {...},
  "environment": {...}
}
```

## Test Environment

### Automatic Setup
- Creates isolated test directory (`./test-automation` by default)
- Builds framework if needed
- Manages temporary test services
- Cleans up after completion (unless `--no-clean`)

### Test Isolation
- Each test runs in clean environment
- Temporary services are tracked and removed
- No interference with development environment
- Safe for parallel development

## Integration with Development Workflow

### Pre-commit Hooks
```bash
# Add to package.json scripts
"pre-commit": "node scripts/automated-testing-suite.js cli --timeout 30000"
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Run Automated Tests
  run: node scripts/automated-testing-suite.js --verbose --no-clean

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-automation/
```

### Development Scripts
```json
{
  "scripts": {
    "test:automated": "node scripts/automated-testing-suite.js",
    "test:cli": "node scripts/automated-testing-suite.js cli",
    "test:deployment": "node scripts/automated-testing-suite.js deployment",
    "test:smoke": "node scripts/automated-testing-suite.js cli deployment --timeout 30000"
  }
}
```

## Extending the Test Suite

### Adding New Test Categories
```javascript
async runCustomTests() {
  this.log('Running Custom Tests', 'phase');
  const category = 'custom';
  this.testResults.categories[category] = { tests: [], passed: 0, failed: 0 };

  const customTests = [
    {
      name: 'my-custom-test',
      command: 'node my-custom-test.js',
      expectSuccess: true,
      description: 'Custom test description'
    }
  ];

  for (const test of customTests) {
    await this.runIndividualTest(category, test);
  }
}
```

### Adding New Tests to Existing Categories
```javascript
const cliTests = [
  // existing tests...
  {
    name: 'new-cli-command',
    command: 'node bin/clodo-service.js new-command --help',
    expectSuccess: true,
    description: 'Test new CLI command'
  }
];
```

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout: `--timeout 600000`
- Check for hanging processes
- Run individual categories to isolate

**Permission errors**
- Ensure script has execute permissions
- Check file system permissions for test directory
- Run as appropriate user

**Build failures in tests**
- Ensure dependencies are installed: `npm install`
- Check Node.js version compatibility
- Verify build scripts in package.json

**Test directory conflicts**
- Use `--test-dir ./custom-test-dir`
- Remove conflicting directories manually
- Use `--no-clean` to preserve for debugging

### Debugging Failed Tests
```bash
# Run with maximum verbosity
node scripts/automated-testing-suite.js --verbose --no-clean

# Test individual categories
node scripts/automated-testing-suite.js cli --verbose

# Check detailed report
cat test-automation/test-report.json | jq '.failures'
```

## Performance Considerations

### Test Execution Time
- **Full suite**: ~3-5 minutes
- **CLI only**: ~30 seconds
- **Individual categories**: ~1-2 minutes

### Resource Usage
- **Memory**: ~100-200MB peak
- **Disk**: ~50-100MB for test artifacts
- **Network**: Minimal (mock deployments)

### Optimization Tips
- Run specific categories for faster feedback
- Use `--no-clean` during development
- Parallel execution support (future feature)
- CI caching for dependencies

## Related Files

- `scripts/test-clodo-deployment.js` - Individual deployment testing
- `test/` - Unit and integration tests
- `package.json` - Test scripts and configuration
- `jest.config.js` - Test framework configuration

## Contributing

When adding new functionality:
1. Add corresponding tests to the automated suite
2. Update this documentation
3. Ensure tests pass in CI/CD
4. Consider performance impact

## Future Enhancements

- Parallel test execution
- Web dashboard for results
- Historical trend analysis
- Performance regression detection
- Automated issue creation for failures
- Integration with external monitoring tools