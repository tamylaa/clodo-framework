# End-to-End Test Suite

This directory contains comprehensive end-to-end tests for the Clodo Framework, covering all major capabilities from CLI commands to full integration scenarios.

## Structure

```
test/e2e/
├── cli/                    # Tests for CLI commands
│   └── deploy.test.js      # Deploy command e2e tests
├── lib/                    # Tests for library modules (to be added)
├── scripts/                # Tests for utility scripts (to be added)
└── integration/            # Full workflow integration tests
    ├── comprehensive-validation-test.js    # Complete service validation
    ├── e2e-test.js                         # Service creation and deployment
    ├── test-imports.js                     # Import validation
    ├── test-service-enhancements.js        # Service enhancement tests
    └── test-three-tier-process.js          # Three-tier process validation
```

## Test Categories

### CLI Tests (`cli/`)
Tests for individual CLI commands, ensuring they work end-to-end with real file system operations and external service interactions.

### Library Tests (`lib/`)
Tests for core library modules and APIs, focusing on functionality without CLI wrappers.

### Script Tests (`scripts/`)
Tests for utility scripts and automation tools.

### Integration Tests (`integration/`)
Full workflow tests that validate complete user journeys, from service creation through deployment and validation.

## Running Tests

### Run All E2E Tests
```bash
npm test -- test/e2e/
```

### Run Specific Category
```bash
# CLI tests only
npm test -- test/e2e/cli/

# Integration tests only
npm test -- test/e2e/integration/
```

### Run Individual Test File
```bash
npm test -- test/e2e/cli/deploy.test.js
```

## Test Guidelines

### CLI Tests
- Use real file system operations where possible
- Mock external APIs (Cloudflare, databases) for reliability
- Test both success and failure scenarios
- Validate command outputs and side effects

### Integration Tests
- Test complete workflows from start to finish
- Include cleanup operations to avoid test pollution
- Use realistic test data and configurations
- Validate end-to-end functionality

### General
- All tests should be idempotent and not depend on external state
- Use descriptive test names that explain the scenario
- Include proper error handling and validation
- Clean up test artifacts after completion

## Adding New Tests

1. Determine the appropriate category (cli/lib/scripts/integration)
2. Create the test file with descriptive naming
3. Follow Jest conventions for test structure
4. Include proper setup/teardown for test isolation
5. Add documentation comments explaining the test scenario

## Coverage Goals

- **CLI Commands**: All commands (create, deploy, validate, etc.)
- **Library Modules**: Core APIs and utilities
- **Scripts**: Automation and utility scripts
- **Integration**: Full service lifecycles and complex workflows
- **Error Scenarios**: Failure modes and recovery
- **Edge Cases**: Boundary conditions and unusual inputs