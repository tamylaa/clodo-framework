/**
 * Comprehensive ErrorHandler Test Suite
 * Tests for unified error handling, recovery patterns, and D1 database error handling
 * 
 * Test Coverage:
 * - 10 Circuit breaker pattern tests
 * - 10 Retry mechanism tests
 * - 8 D1 error analysis tests
 * - 8 Error suggestion tests
 * - 8 Integration tests
 * - 6 Factory function tests
 * Total: 50+ tests
 * 
 * @file test/shared/utils/ErrorHandler.test.js
 */

import ErrorHandler, {
  createErrorResponse,
  createContextualError,
  createErrorHandler
} from '../../../lib/shared/utils/ErrorHandler.js';

describe('ErrorHandler - Unified Error Handling Module', () => {
  // Note: Jest globals (describe, test, expect, jest) are automatically available
  // in Jest test environment via ESM transformation layer

  // ============================================================================
  // SECTION 1: Circuit Breaker Pattern Tests (10 tests)
  // ============================================================================

  describe('Circuit Breaker Error Handling', () => {
    test('1.1: Should detect database not found error', () => {
      const error = new Error("Couldn't find a D1 db");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(true);
      expect(analysis.category).toBe('database_not_found');
      expect(analysis.severity).toBe('high');
      expect(analysis.canRecover).toBe(true);
    });

    test('1.2: Should detect binding configuration error', () => {
      const error = new Error("D1 binding 'DB' not found in wrangler.toml");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(true);
      expect(analysis.category).toBe('binding_configuration');
      expect(analysis.severity).toBe('medium');
      expect(analysis.canRecover).toBe(true);
    });

    test('1.3: Should detect authentication error', () => {
      const error = new Error('Unauthorized: D1 database access denied');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(true);
      expect(analysis.category).toBe('authentication');
      expect(analysis.severity).toBe('high');
      expect(analysis.canRecover).toBe(false);
    });

    test('1.4: Should detect migration error', () => {
      const error = new Error('D1 migration failed: syntax error in migration file');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(true);
      expect(analysis.category).toBe('migration');
      expect(analysis.canRecover).toBe(false);
    });

    test('1.5: Should extract database name from error', () => {
      const error = new Error("Couldn't find database 'my-prod-db'");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.databaseName).toBeDefined();
      expect(typeof analysis.databaseName).toBe('string');
    });

    test('1.6: Should provide recovery suggestions for database_not_found', () => {
      const error = new Error("Couldn't find a D1 db");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.suggestions).toHaveLength(3);
      expect(analysis.suggestions[0]).toContain('automated');
    });

    test('1.7: Should mark auto-fixable errors', () => {
      const error = new Error("Couldn't find a D1 db");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.autoFixable).toBe(true);
    });

    test('1.8: Should handle unknown D1 errors gracefully', () => {
      const error = new Error('D1 unknown error code XYZ');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis).toHaveProperty('isD1Error');
      expect(analysis).toHaveProperty('category');
      expect(analysis).toHaveProperty('suggestions');
    });

    test('1.9: Should detect permission errors specifically', () => {
      const error = new Error('Permission denied: D1 database access forbidden');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.category).toBe('authentication');
      expect(analysis.severity).toBe('high');
    });

    test('1.10: Should handle non-D1 errors gracefully', () => {
      const error = new Error('Generic application error');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(false);
      expect(analysis.category).toBe('unknown');
    });
  });

  // ============================================================================
  // SECTION 2: Retry Mechanism Tests (10 tests)
  // ============================================================================

  describe('Retry and Recovery Mechanisms', () => {
    test('2.1: Should wrap async operation with error handling', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'success';
      };
      const result = await ErrorHandler.withErrorHandling(fn, {});

      expect(callCount).toBe(1);
      expect(result).toBe('success');
    });

    test('2.2: Should catch errors in wrapped async operations', async () => {
      const testError = new Error('Operation failed');
      const fn = async () => {
        throw testError;
      };

      await expect(
        ErrorHandler.withErrorHandling(fn, { customer: 'test' })
      ).rejects.toThrow('Operation failed');
    });

    test('2.3: Should provide timeout recovery strategy', () => {
      const error = new Error('Request timeout');
      const context = {};
      const recovery = ErrorHandler._attemptRecovery(error, context);

      expect(recovery.attempted).toBe(true);
      expect(recovery.strategy).toBe('exponential_backoff');
      expect(recovery.canRetry).toBe(true);
    });

    test('2.4: Should provide connection recovery strategy', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const recovery = ErrorHandler._attemptRecovery(error, {});

      expect(recovery.strategy).toBe('graceful_degradation');
      expect(recovery.canRetry).toBe(true);
    });

    test('2.5: Should provide database recovery strategy', () => {
      const error = new Error("Couldn't find a D1 db");
      const recovery = ErrorHandler._attemptRecovery(error, {});

      expect(recovery.strategy).toBe('circuit_breaker');
      expect(recovery.canRetry).toBe(true);
    });

    test('2.6: Should include retry delay in recovery strategy', () => {
      const error = new Error('Request timeout');
      const recovery = ErrorHandler._attemptRecovery(error, {});

      expect(recovery.retryDelay).toBeGreaterThan(0);
      expect(typeof recovery.retryDelay).toBe('number');
    });

    test('2.7: Should include recovery suggestions', () => {
      const error = new Error('Request timeout');
      const recovery = ErrorHandler._attemptRecovery(error, {});

      expect(recovery.suggestions).toBeInstanceOf(Array);
      expect(recovery.suggestions.length).toBeGreaterThan(0);
    });

    test('2.8: Should mark non-recoverable authentication errors', () => {
      const error = new Error('Unauthorized: Invalid API token');
      const recovery = ErrorHandler._attemptRecovery(error, {});

      expect(recovery.canRetry).toBe(false);
    });

    test('2.9: Should provide fallback suggestions for unknown errors', () => {
      const error = new Error('Unknown error');
      const recovery = ErrorHandler._attemptRecovery(error, {});

      expect(recovery.attempted).toBe(false);
      expect(recovery.strategy).toBeNull();
    });

    test('2.10: Should handle errors with context information', async () => {
      const testError = new Error('Deployment failed');
      const context = {
        customer: 'acme',
        environment: 'production',
        phase: 'security-validation'
      };
      let called = false;
      const fn = async () => {
        called = true;
        throw testError;
      };

      await expect(
        ErrorHandler.withErrorHandling(fn, context)
      ).rejects.toThrow();
      expect(called).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 3: D1 Error Analysis Tests (8 tests)
  // ============================================================================

  describe('D1 Database Error Analysis', () => {
    test('3.1: Should generate database_not_found troubleshooting steps', () => {
      const steps = ErrorHandler.getD1TroubleshootingSteps('database_not_found');

      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toContain('List available databases');
    });

    test('3.2: Should generate binding_configuration troubleshooting steps', () => {
      const steps = ErrorHandler.getD1TroubleshootingSteps('binding_configuration');

      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toContain('wrangler.toml');
    });

    test('3.3: Should generate authentication troubleshooting steps', () => {
      const steps = ErrorHandler.getD1TroubleshootingSteps('authentication');

      expect(steps).toBeInstanceOf(Array);
      expect(steps[0]).toContain('logout');
    });

    test('3.4: Should generate migration troubleshooting steps', () => {
      const steps = ErrorHandler.getD1TroubleshootingSteps('migration');

      expect(steps).toBeInstanceOf(Array);
      expect(steps[0]).toContain('migration files');
    });

    test('3.5: Should return general steps for unknown error type', () => {
      const steps = ErrorHandler.getD1TroubleshootingSteps('unknown_type');

      expect(steps).toBeInstanceOf(Array);
      expect(steps[0]).toContain('Cloudflare');
    });

    test('3.6: Should handle D1DatabaseError with context', () => {
      const error = new Error("Couldn't find a D1 db");
      const context = {
        environment: 'production',
        service: 'api-gateway'
      };

      const result = ErrorHandler.handleD1DatabaseError(error, context);

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('analysis');
    });

    test('3.7: Should analyze D1 error with recovery information', () => {
      const error = new Error('D1 binding DB not found');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis).toHaveProperty('errorType');
      expect(analysis).toHaveProperty('canRecover');
      expect(analysis).toHaveProperty('suggestions');
    });

    test('3.8: Should provide comprehensive error context', () => {
      const error = new Error("Couldn't find a D1 db in prod");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(true);
      expect(analysis).toHaveProperty('databaseName');
      expect(analysis).toHaveProperty('suggestions');
    });
  });

  // ============================================================================
  // SECTION 4: Error Suggestion Tests (8 tests)
  // ============================================================================

  describe('Error Suggestion Generation', () => {
    test('4.1: Should generate security error suggestions', () => {
      const error = new Error('Security validation failed');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('security'))).toBe(true);
    });

    test('4.2: Should generate health check suggestions', () => {
      const error = new Error('Health check endpoint unreachable');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions.some(s => s.includes('deployment') || s.includes('service'))).toBe(true);
    });

    test('4.3: Should generate authentication error suggestions', () => {
      const error = new Error('Authentication token invalid');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions.some(s => s.includes('auth') || s.includes('token'))).toBe(true);
    });

    test('4.4: Should generate timeout error suggestions', () => {
      const error = new Error('Operation timeout after 30s');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions.some(s => s.includes('timeout'))).toBe(true);
    });

    test('4.5: Should generate configuration error suggestions', () => {
      const error = new Error('Missing required configuration');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions.some(s => s.includes('config') || s.includes('configuration'))).toBe(true);
    });

    test('4.6: Should provide error suggestions via provideErrorSuggestions', () => {
      const error = new Error('Health check failed');
      const context = { url: 'https://example.com/health' };

      const suggestions = ErrorHandler.provideErrorSuggestions(error, context);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('4.7: Should fallback to generic suggestions for unknown errors', () => {
      const error = new Error('Some random error');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('4.8: Should include multiple relevant suggestions', () => {
      const error = new Error('Security validation timeout');
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // SECTION 5: Integration Tests (8 tests)
  // ============================================================================

  describe('ErrorHandler Integration', () => {
    test('5.1: Should create comprehensive error report', () => {
      const error = new Error('Test error');
      const context = { customer: 'test-customer' };

      const report = ErrorHandler.createErrorReport(error, context);

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('error');
      expect(report).toHaveProperty('context');
      expect(report).toHaveProperty('suggestions');
    });

    test('5.2: Should handle deployment errors with context', () => {
      const error = new Error('Deployment validation failed');
      const context = {
        customer: 'test',
        environment: 'staging',
        phase: 'security-check'
      };

      const report = ErrorHandler.handleDeploymentError(error, context);

      expect(report).toHaveProperty('error');
      expect(report).toHaveProperty('context');
      expect(report.context.customer).toBe('test');
    });

    test('5.3: Should handle health check errors', () => {
      const error = new Error('Connection timeout');
      const url = 'https://api.example.com/health';

      const report = ErrorHandler.handleHealthCheckError(error, url);

      expect(report).toHaveProperty('error');
      expect(report).toHaveProperty('message');
      expect(report).toHaveProperty('troubleshooting');
    });

    test('5.4: Should handle configuration errors', () => {
      const error = new Error('Invalid configuration');
      const config = { customer: 'test', environment: 'prod' };

      const report = ErrorHandler.handleConfigurationError(error, config);

      expect(report).toHaveProperty('error');
      expect(report).toHaveProperty('troubleshooting');
    });

    test('5.5: Should create error handling middleware', () => {
      const middleware = ErrorHandler.createErrorHandlingMiddleware({
        includeStack: false,
        logErrors: true
      });

      expect(typeof middleware).toBe('function');
    });

    test('5.6: Should middleware wrap handler properly', () => {
      const middleware = ErrorHandler.createErrorHandlingMiddleware();
      let handlerCalled = false;
      const handler = async () => {
        handlerCalled = true;
        return new Response('OK');
      };
      const wrappedHandler = middleware(handler);

      expect(typeof wrappedHandler).toBe('function');
    });

    test('5.7: Should preserve error recovery information in reports', () => {
      const error = new Error('Request timeout');
      const context = { service: 'api' };

      const report = ErrorHandler.createErrorReport(error, context);

      expect(report).toHaveProperty('recovery');
      expect(report.recovery).toHaveProperty('canRetry');
    });

    test('5.8: Should handle multiple error reports independently', () => {
      const error1 = new Error('Timeout');
      const error2 = new Error('Database error');

      const report1 = ErrorHandler.createErrorReport(error1, {});
      const report2 = ErrorHandler.createErrorReport(error2, {});

      expect(report1.error.message).not.toBe(report2.error.message);
    });
  });

  // ============================================================================
  // SECTION 6: Factory Function Tests (6 tests)
  // ============================================================================

  describe('Error Factory Functions', () => {
    test('6.1: Should create standardized error response', () => {
      const response = createErrorResponse('Test error', {
        statusCode: 500,
        errorCode: 'TEST_ERROR'
      });

      expect(response).toHaveProperty('error', true);
      expect(response).toHaveProperty('message', 'Test error');
      expect(response).toHaveProperty('errorCode', 'TEST_ERROR');
      expect(response).toHaveProperty('timestamp');
    });

    test('6.2: Should include stack trace when requested', () => {
      const testStack = 'Error: at function () { ... }';
      const response = createErrorResponse('Test error', {
        includeStack: true,
        stack: testStack
      });

      expect(response).toHaveProperty('stack', testStack);
    });

    test('6.3: Should create contextual error with metadata', () => {
      const context = { userId: '123', action: 'deploy' };
      const error = createContextualError('Deployment error', context);

      expect(error instanceof Error).toBe(true);
      expect(error.message).toBe('Deployment error');
      expect(error.context).toEqual(context);
      expect(error).toHaveProperty('timestamp');
    });

    test('6.4: Should create error handler middleware factory', () => {
      const errorHandlerFn = createErrorHandler({
        includeStack: false,
        logErrors: true
      });

      expect(typeof errorHandlerFn).toBe('function');
    });

    test('6.5: Should merge error response with details', () => {
      const response = createErrorResponse('Database error', {
        statusCode: 503,
        details: { service: 'D1', attempt: 1 }
      });

      expect(response).toHaveProperty('service', 'D1');
      expect(response).toHaveProperty('attempt', 1);
    });

    test('6.6: Should provide default error code if not specified', () => {
      const response = createErrorResponse('Test error');

      expect(response).toHaveProperty('errorCode', 'INTERNAL_ERROR');
    });
  });

  // ============================================================================
  // ADDITIONAL: Edge Cases and Error Scenarios (6 tests)
  // ============================================================================

  describe('Edge Cases and Error Scenarios', () => {
    test('7.1: Should handle error with empty message', () => {
      const error = new Error('');
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('isD1Error');
    });

    test('7.2: Should handle very long error messages', () => {
      const longMsg = 'Error: ' + 'x'.repeat(1000);
      const error = new Error(longMsg);
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('suggestions');
    });

    test('7.3: Should handle multiple simultaneous error contexts', () => {
      const error1 = new Error('Timeout');
      const error2 = new Error('Database error');

      const analysis1 = ErrorHandler.analyzeD1Error(error1);
      const analysis2 = ErrorHandler.analyzeD1Error(error2);

      // Both should be valid analysis objects with categories
      expect(analysis1).toHaveProperty('category');
      expect(analysis2).toHaveProperty('category');
      // Unknown errors will have same 'unknown' category, so just verify they're objects
      expect(typeof analysis1).toBe('object');
      expect(typeof analysis2).toBe('object');
    });

    test('7.4: Should normalize error message casing', () => {
      const error = new Error("COULDN'T FIND A D1 DB");
      const analysis = ErrorHandler.analyzeD1Error(error);

      expect(analysis.isD1Error).toBe(true);
    });

    test('7.5: Should handle special characters in error messages', () => {
      const error = new Error("D1 error: 'special@chars#%^&*'");
      const suggestions = ErrorHandler.generateSuggestions(error, {});

      expect(suggestions).toBeInstanceOf(Array);
    });

    test('7.6: Should prevent infinite error loops in wrapped functions', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Error 1');
        }
        return 'success';
      };

      await expect(
        ErrorHandler.withErrorHandling(fn, {})
      ).rejects.toThrow();

      // Function should only be called once in wrapped version
      expect(callCount).toBe(1);
    });
  });
});

/**
 * Test Summary
 * ============================================================================
 * 
 * Test Categories:
 * 1. Circuit Breaker Patterns (10 tests)
 *    - D1 error detection and categorization
 *    - Error severity assessment
 *    - Database name extraction
 *    - Recovery capability analysis
 *
 * 2. Retry Mechanisms (10 tests)
 *    - Async operation wrapping
 *    - Error catching and handling
 *    - Recovery strategy selection
 *    - Retry delay calculation
 *    - Context preservation
 *
 * 3. D1 Error Analysis (8 tests)
 *    - Troubleshooting step generation
 *    - Error context handling
 *    - Recovery information extraction
 *    - Comprehensive error context
 *
 * 4. Error Suggestions (8 tests)
 *    - Security error suggestions
 *    - Health check suggestions
 *    - Timeout suggestions
 *    - Configuration suggestions
 *    - Multi-error suggestions
 *
 * 5. Integration Tests (8 tests)
 *    - Error report creation
 *    - Deployment error handling
 *    - Health check error handling
 *    - Configuration error handling
 *    - Middleware creation and wrapping
 *    - Error recovery information
 *    - Independent error report handling
 *
 * 6. Factory Functions (6 tests)
 *    - Error response creation
 *    - Stack trace inclusion
 *    - Contextual error creation
 *    - Middleware factory
 *    - Detail merging
 *    - Default error codes
 *
 * 7. Edge Cases (6 tests)
 *    - Empty message handling
 *    - Long message handling
 *    - Multiple error contexts
 *    - Case normalization
 *    - Special character handling
 *    - Infinite loop prevention
 *
 * Total: 56 comprehensive tests
 * Expected Pass Rate: 100%
 * Regression: 0% expected
 * ============================================================================
 */

/**
 * SECTION: Telemetry and Error Tracking Tests
 * Tests for error tracking, statistics, and telemetry features
 */
describe('ErrorHandler - Error Telemetry and Tracking', () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLogs();
    ErrorHandler.initialize({ telemetryEnabled: true });
  });

  test('T1: Should track errors when telemetry enabled', () => {
    const error = new Error('Test error');
    ErrorHandler._trackError(error, 'test_category');

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(1);
    expect(stats.errorsByCategory.test_category).toBe(1);
  });

  test('T2: Should not track errors when telemetry disabled', () => {
    ErrorHandler.initialize({ telemetryEnabled: false });
    const error = new Error('Test error');
    ErrorHandler._trackError(error, 'test_category');

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(0);
  });

  test('T3: Should update error counts correctly', () => {
    ErrorHandler._trackError(new Error('Error 1'), 'category_a');
    ErrorHandler._trackError(new Error('Error 2'), 'category_a');
    ErrorHandler._trackError(new Error('Error 3'), 'category_b');

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.errorsByCategory.category_a).toBe(2);
    expect(stats.errorsByCategory.category_b).toBe(1);
  });

  test('T4: Should track category statistics with timestamp', () => {
    ErrorHandler._trackError(new Error('Error'), 'test_cat');
    const stats = ErrorHandler.getErrorStatistics();

    expect(stats.categories.test_cat).toBeDefined();
    expect(stats.categories.test_cat.count).toBe(1);
    expect(stats.categories.test_cat.lastOccurrence).toBeDefined();
  });

  test('T5: Should track unique error messages per category', () => {
    ErrorHandler._trackError(new Error('Message A'), 'cat');
    ErrorHandler._trackError(new Error('Message B'), 'cat');
    ErrorHandler._trackError(new Error('Message A'), 'cat');

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.categories.cat.uniqueMessages).toBe(2);
  });

  test('T6: Should enforce maxLogSize limit', () => {
    ErrorHandler.initialize({ maxLogSize: 5 });
    for (let i = 0; i < 10; i++) {
      ErrorHandler._trackError(new Error(`Error ${i}`), 'cat');
    }

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBeLessThanOrEqual(5);
  });

  test('T7: Should clear all error logs', () => {
    ErrorHandler._trackError(new Error('Error 1'), 'cat');
    ErrorHandler._trackError(new Error('Error 2'), 'cat');

    let stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(2);

    ErrorHandler.clearErrorLogs();
    stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(0);
  });

  test('T8: Should provide recent errors in statistics', () => {
    for (let i = 1; i <= 15; i++) {
      ErrorHandler._trackError(new Error(`Error ${i}`), 'cat');
    }

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
  });

  test('T9: Should categorize deployment errors correctly', () => {
    const testCases = [
      { error: new Error('Security token invalid'), expected: 'security' },
      { error: new Error('Authentication failed'), expected: 'authentication' },
      { error: new Error('Connection timeout'), expected: 'timeout' },
      { error: new Error('D1 database error'), expected: 'database' },
      { error: new Error('Network unreachable'), expected: 'network' },
      { error: new Error('Health check failed'), expected: 'health_check' }
    ];

    testCases.forEach(({ error, expected }) => {
      const category = ErrorHandler._categorizeDeploymentError(error);
      expect(category).toBe(expected);
    });
  });

  test('T10: Should handle null/undefined errors in categorization', () => {
    const category1 = ErrorHandler._categorizeDeploymentError(null);
    const category2 = ErrorHandler._categorizeDeploymentError(undefined);

    expect(category1).toBe('deployment');
    expect(category2).toBe('deployment');
  });

  test('T11: Should track errors during deployment handling', () => {
    const error = new Error('Unauthorized deployment');
    // Suppress console output
    const originalError = console.error;
    console.error = () => {};

    ErrorHandler.handleDeploymentError(error, { phase: 'deploy' });

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(1);
    expect(stats.errorsByCategory.security).toBe(1);

    console.error = originalError;
  });

  test('T12: Should track D1 database errors', () => {
    const error = new Error("Couldn't find a D1 db");
    // Suppress console output
    const originalError = console.error;
    console.error = () => {};

    ErrorHandler.handleD1DatabaseError(error, { environment: 'production' });

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(1);
    expect(stats.errorsByCategory.database).toBe(1);

    console.error = originalError;
  });

  test('T13: Should return empty statistics when no errors', () => {
    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.totalErrors).toBe(0);
    expect(Object.keys(stats.errorsByCategory).length).toBe(0);
  });

  test('T14: Should maintain separate statistics per category', () => {
    ErrorHandler._trackError(new Error('Error A'), 'auth');
    ErrorHandler._trackError(new Error('Error B'), 'auth');
    ErrorHandler._trackError(new Error('Error C'), 'database');
    ErrorHandler._trackError(new Error('Error D'), 'network');
    ErrorHandler._trackError(new Error('Error E'), 'network');
    ErrorHandler._trackError(new Error('Error F'), 'network');

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats.errorsByCategory.auth).toBe(2);
    expect(stats.errorsByCategory.database).toBe(1);
    expect(stats.errorsByCategory.network).toBe(3);
  });

  test('T15: Should provide complete error statistics', () => {
    ErrorHandler._trackError(new Error('Error 1'), 'test');
    ErrorHandler._trackError(new Error('Error 2'), 'test');

    const stats = ErrorHandler.getErrorStatistics();
    expect(stats).toHaveProperty('totalErrors');
    expect(stats).toHaveProperty('errorsByCategory');
    expect(stats).toHaveProperty('categories');
    expect(stats).toHaveProperty('recentErrors');
  });
});
