/**
 * Production Testing Suite - Entry Point
 * Exports the core ProductionTester class with lazy-loaded modules
 */

// Re-export the core ProductionTester class
export { ProductionTester } from './core.js';

// Export individual testing modules for granular usage
export { ApiTester } from './api-tester.js';
export { AuthTester } from './auth-tester.js';
export { DatabaseTester } from './database-tester.js';
export { PerformanceTester } from './performance-tester.js';
export { LoadTester } from './load-tester.js';

// ESLint doesn't recognize re-exported classes in function scope
/* eslint-disable no-undef */

// Legacy function exports for backward compatibility

/**
 * Quick production health check
 * @param {string} baseUrl - Base URL to test
 * @returns {Promise<Object>} Health check results
 */
export async function quickHealthCheck(baseUrl) {
  const tester = new ProductionTester({
    verbose: false,
    generateReport: false,
    exportMetrics: false
  });
  await tester.initialize();

  return await tester.runProductionTests(baseUrl, {
    testSuites: ['health']
  });
}

/**
 * Run authentication tests
 * @param {string} baseUrl - Base URL to test
 * @param {Object} testUser - Test user configuration
 * @returns {Promise<Object>} Authentication test results
 */
export async function testAuthenticationFlow(baseUrl, testUser) {
  const tester = new ProductionTester({
    verbose: true,
    generateReport: false
  });
  await tester.initialize();

  return await tester.runProductionTests(baseUrl, {
    testSuites: ['authentication'],
    testUser
  });
}

/**
 * Run comprehensive production validation
 * @param {string} baseUrl - Base URL to test
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Complete test results
 */
export async function validateProduction(baseUrl, options = {}) {
  const tester = new ProductionTester({
    verbose: true,
    generateReport: true,
    exportMetrics: true,
    ...options
  });
  await tester.initialize();

  return await tester.runProductionTests(baseUrl, {
    testSuites: ['health', 'authentication', 'endpoints', 'database', 'performance', 'regression', 'integration'],
    ...options
  });
}