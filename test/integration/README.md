# Integration Tests

This directory contains integration test scripts that validate the Lego Framework's functionality across multiple components.

## Files

### test-integration-runner.js
Comprehensive integration test runner that simulates complete deployment workflows to identify missing dependencies, configuration issues, and practical limitations.

**Test Coverage:**
- Configuration file validation
- Package installation testing
- Deployment validator testing
- Database orchestrator testing
- Wrangler integration testing
- Enterprise deploy CLI testing
- Environment variable validation

**Features:**
- Automated test execution
- Detailed logging and reporting
- JSON report generation
- Error analysis and recommendations
- CI/CD integration ready

## Usage

Run integration tests from the project root:

```bash
# Run all integration tests
node test/integration/test-integration-runner.js

# Check test results
cat test-results/logs/integration-test.log

# View detailed report
cat test-results/test-logs/integration-report.json
```

## Test Structure

The integration tests validate:
1. **Configuration Generation** - Ensures all required config files are created
2. **Package Management** - Validates framework imports and dependencies
3. **Deployment Tools** - Tests deployment validators and orchestrators
4. **Cloudflare Integration** - Validates Wrangler and Cloudflare API integration
5. **CLI Tools** - Tests command-line interfaces and help systems
6. **Environment Setup** - Checks for required environment variables

## Related Directories

- `test-results/` - Test output and logs
- `bin/shared/` - Shared utilities tested by integration tests
- `scripts/testing/` - Additional testing scripts