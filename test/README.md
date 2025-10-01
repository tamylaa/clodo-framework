# Test Suite

This directory contains the complete test suite for the Lego Framework, organized by test type and purpose.

## Directory Structure

### integration/
Integration tests that validate end-to-end functionality across multiple components.

- `test-integration-runner.js` - Comprehensive integration test suite
- `README.md` - Integration test documentation

## Test Categories

### Unit Tests
Located in `src/` directories alongside the code they test.

### Integration Tests
Located in `test/integration/` - validate complete workflows and component interactions.

### End-to-End Tests
Located in `test/e2e/` (planned) - full deployment and runtime testing.

## Running Tests

```bash
# Run all tests
npm test

# Run integration tests only
node test/integration/test-integration-runner.js

# Run with coverage
npm run test:coverage
```

## Test Results

Test outputs are stored in `test-results/`:
- `logs/` - Test execution logs
- `metrics/` - Performance and coverage metrics
- `reports/` - Detailed test reports
- `screenshots/` - UI test screenshots (if applicable)

## CI/CD Integration

Tests are designed to run in CI/CD environments:
- No external dependencies required for basic tests
- Environment variables for Cloudflare integration
- JUnit XML output for CI systems
- Parallel test execution support