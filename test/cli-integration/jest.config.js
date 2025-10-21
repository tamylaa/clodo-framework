/**
 * CLI Integration Test Suite Configuration
 * 
 * Jest configuration specific to CLI integration tests
 */

export default {
  displayName: 'CLI Integration Tests',
  testEnvironment: 'node',
  testMatch: ['**/test/cli-integration/**/*.test.js'],
  testTimeout: 120000, // 2 minutes per test (CLI operations can be slow)
  maxWorkers: 1, // Run tests serially to avoid test environment conflicts
  verbose: true,
  collectCoverage: false, // Disable coverage for integration tests
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
};
