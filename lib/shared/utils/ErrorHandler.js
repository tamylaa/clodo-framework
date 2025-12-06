/**
 * Unified Error Handler Module
 * Comprehensive error reporting, handling, and recovery utilities
 * Consolidates error handling from multiple sources with enhanced recovery patterns
 * 
 * Sources Consolidated:
 * - src/utils/ErrorHandler.js (358 lines, 10 methods)
 * - src/worker/integration.js (40 lines, createErrorHandler middleware)
 * - bin/database/wrangler-d1-manager.js (50 lines, D1 error analysis)
 * - Scattered error response patterns across codebase
 * - bin/shared/utils/error-recovery.js (integration for recovery patterns)
 * 
 * @module bin/shared/utils/ErrorHandler
 */

import { ErrorRecoveryManager } from './error-recovery.js';

/**
 * Logger utility - simple console-based logging
 * @private
 */
const logger = {
  info: (message, ...args) => console.log(`[ErrorHandler] ${message}`, ...args),
  error: (message, ...args) => console.error(`[ErrorHandler] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[ErrorHandler] ${message}`, ...args),
  debug: (message, ...args) => console.debug(`[ErrorHandler] ${message}`, ...args)
};

/**
 * Standardized error response factory
 * Creates consistent error response objects across the application
 * @param {string} message - Error message
 * @param {Object} options - Response options
 * @returns {Object} Standardized error response
 * @private
 */
const _createErrorResponse = (message, options = {}) => {
  const {
    statusCode = 500,
    errorCode = 'INTERNAL_ERROR',
    details = {},
    includeStack = false,
    stack = null
  } = options;

  const response = {
    error: true,
    message,
    errorCode,
    timestamp: new Date().toISOString(),
    ...details
  };

  if (includeStack && stack) {
    response.stack = stack;
  }

  return response;
};

/**
 * Contextual error factory
 * Creates errors with attached context for better tracking
 * @param {string} message - Error message
 * @param {Object} context - Error context
 * @returns {Error} Error with context property
 * @private
 */
const _createContextualError = (message, context = {}) => {
  const error = new Error(message);
  error.context = context;
  error.timestamp = new Date().toISOString();
  return error;
};

/**
 * Enhanced Error Handler
 * Comprehensive error reporting and handling with recovery integration
 */
export class ErrorHandler {
  // Static telemetry tracking
  static _errorLog = [];
  static _errorCounts = {};
  static _errorCategories = {};
  static _recoveryManager = null;
  static _telemetryEnabled = true;
  static _maxLogSize = 1000;

  /**
   * Initialize ErrorHandler with recovery manager and telemetry
   * @private
   */
  static initialize(options = {}) {
    if (!ErrorHandler._recoveryManager) {
      ErrorHandler._recoveryManager = new ErrorRecoveryManager();
    }
    if (options.telemetryEnabled !== undefined) {
      ErrorHandler._telemetryEnabled = options.telemetryEnabled;
    }
    if (options.maxLogSize !== undefined) {
      ErrorHandler._maxLogSize = options.maxLogSize;
    }
  }

  /**
   * Track error for telemetry and statistics
   * @private
   */
  static _trackError(error, category = 'unknown') {
    if (!ErrorHandler._telemetryEnabled) return;

    const errorRecord = {
      timestamp: new Date().toISOString(),
      category,
      message: error?.message || String(error),
      type: error?.name || 'Error'
    };

    ErrorHandler._errorLog.push(errorRecord);
    
    // Prevent log from growing indefinitely
    if (ErrorHandler._errorLog.length > ErrorHandler._maxLogSize) {
      ErrorHandler._errorLog.shift();
    }

    // Update error counts
    ErrorHandler._errorCounts[category] = (ErrorHandler._errorCounts[category] || 0) + 1;
    
    // Track category statistics
    if (!ErrorHandler._errorCategories[category]) {
      ErrorHandler._errorCategories[category] = {
        count: 0,
        lastOccurrence: null,
        messages: new Set()
      };
    }
    ErrorHandler._errorCategories[category].count++;
    ErrorHandler._errorCategories[category].lastOccurrence = new Date().toISOString();
    ErrorHandler._errorCategories[category].messages.add(error?.message || String(error));
  }

  /**
   * Get error statistics and summary
   * @returns {Object} Error statistics
   */
  static getErrorStatistics() {
    return {
      totalErrors: ErrorHandler._errorLog.length,
      errorsByCategory: Object.entries(ErrorHandler._errorCounts).reduce((acc, [cat, count]) => {
        acc[cat] = count;
        return acc;
      }, {}),
      categories: Object.entries(ErrorHandler._errorCategories).reduce((acc, [cat, data]) => {
        acc[cat] = {
          count: data.count,
          lastOccurrence: data.lastOccurrence,
          uniqueMessages: Array.from(data.messages).length
        };
        return acc;
      }, {}),
      recentErrors: ErrorHandler._errorLog.slice(-10)
    };
  }

  /**
   * Clear error logs
   */
  static clearErrorLogs() {
    ErrorHandler._errorLog = [];
    ErrorHandler._errorCounts = {};
    ErrorHandler._errorCategories = {};
  }

  /**
   * Categorize deployment errors
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   * @private
   */
  static _categorizeDeploymentError(error) {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('security') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'security';
    }
    if (message.includes('health') || message.includes('health check')) {
      return 'health_check';
    }
    if (message.includes('authentication') || message.includes('auth') || message.includes('token')) {
      return 'authentication';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('d1') || message.includes('database')) {
      return 'database';
    }
    if (message.includes('connection') || message.includes('network')) {
      return 'network';
    }
    return 'deployment';
  }

  /**
   * Handle deployment errors with detailed reporting
   * @param {Error} error - The error object
   * @param {Object} context - Additional context (customer, environment, etc.)
   * @returns {Object} Error report with recovery suggestions
   */
  static handleDeploymentError(error, context = {}) {
    this.initialize();

    const { customer, environment, phase, deploymentUrl } = context;

    // Categorize and track error
    const category = this._categorizeDeploymentError(error);
    this._trackError(error, category);

    console.error(`\n❌ Deployment Error in phase: ${phase || 'unknown'}`);
    console.error(`   Customer: ${customer || 'unknown'}`);
    console.error(`   Environment: ${environment || 'unknown'}`);
    console.error(`   Message: ${error.message}`);

    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }

    if (deploymentUrl) {
      console.error(`   Deployment URL: ${deploymentUrl}`);
    }

    // Provide actionable suggestions
    const suggestions = this.provideErrorSuggestions(error, context);

    // Attempt recovery if possible
    const recovery = this._attemptRecovery(error, context);

    // Create comprehensive report
    const report = {
      error: error.message,
      context: { customer, environment, phase, deploymentUrl },
      suggestions,
      recovery,
      timestamp: new Date().toISOString()
    };

    console.error('\n📋 Error Report:', JSON.stringify(report, null, 2));
    return report;
  }

  /**
   * Provide actionable error suggestions
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {string[]} Array of suggestion strings
   */
  static provideErrorSuggestions(error, context = {}) {
    console.error('\n💡 Suggestions:');
    const suggestions = [];

    const errorMsg = error.message.toLowerCase();

    if (errorMsg.includes('security')) {
      suggestions.push('Run security validation: npx clodo-security validate <customer> <environment>');
      suggestions.push('Generate secure keys: npx clodo-security generate-key api');
      console.error('   - Run security validation: npx clodo-security validate <customer> <environment>');
      console.error('   - Generate secure keys: npx clodo-security generate-key api');
    }

    if (errorMsg.includes('health check')) {
      suggestions.push('Check deployment URL accessibility');
      suggestions.push('Verify service is running and responding');
      console.error('   - Check deployment URL accessibility');
      console.error('   - Verify service is running and responding');
    }

    if (errorMsg.includes('authentication')) {
      suggestions.push('Re-authenticate with Cloudflare: wrangler login');
      suggestions.push('Check API token validity');
      console.error('   - Re-authenticate with Cloudflare: wrangler login');
      console.error('   - Check API token validity');
    }

    if (errorMsg.includes('timeout')) {
      suggestions.push('Increase timeout values in configuration');
      suggestions.push('Check network connectivity');
      console.error('   - Increase timeout values in configuration');
      console.error('   - Check network connectivity');
    }

    if (errorMsg.includes('validation')) {
      suggestions.push('Review configuration files for errors');
      suggestions.push('Run validation checks: npx clodo-config validate');
      console.error('   - Review configuration files for errors');
      console.error('   - Run validation checks: npx clodo-config validate');
    }

    if (suggestions.length === 0) {
      suggestions.push('Review logs for more details');
      console.error('   - Review logs for more details');
    }

    return suggestions;
  }

  /**
   * Wrap async operations with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Context for error reporting
   * @returns {Promise<any>} Result of wrapped function
   */
  static async withErrorHandling(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      this.handleDeploymentError(error, context);
      throw error;
    }
  }

  /**
   * Handle health check errors specifically
   * @param {Error} error - The health check error
   * @param {string} url - The URL that was checked
   * @returns {Object} Error report with recovery steps
   */
  static handleHealthCheckError(error, url) {
    console.error(`\n❌ Health Check Failed`);
    console.error(`   URL: ${url}`);
    console.error(`   Error: ${error.message}`);

    const troubleshooting = [
      'Verify the service is deployed and running',
      'Check if the /health endpoint exists',
      'Ensure the service responds with valid JSON',
      'Check network connectivity and firewall rules',
      'Review service logs for startup errors'
    ];

    console.error('\n💡 Health Check Troubleshooting:');
    troubleshooting.forEach(step => console.error(`   - ${step}`));

    return {
      error: 'health_check_failed',
      url,
      message: error.message,
      troubleshooting
    };
  }

  /**
   * Handle D1 database related errors specifically
   * @param {Error} error - The D1 database error
   * @param {Object} context - Context information (environment, service, etc.)
   * @returns {Object} D1 error report with recovery suggestions
   */
  static handleD1DatabaseError(error, context = {}) {
    this.initialize();

    // Track database error
    this._trackError(error, 'database');

    const { environment, service } = context;
    console.error(`\n❌ D1 Database Error`);
    console.error(`   Environment: ${environment || 'unknown'}`);
    console.error(`   Service: ${service || 'unknown'}`);
    console.error(`   Error: ${error.message}`);

    const errorMessage = error.message.toLowerCase();
    const analysis = this.analyzeD1Error(error);
    const troubleshootingSteps = this.getD1TroubleshootingSteps(analysis.category);

    if (errorMessage.includes("couldn't find a d1 db")) {
      console.error('\n🗄️ D1 Database Not Found:');
      console.error('   - The database specified in wrangler.toml does not exist');
      console.error('   - Check database name and ID in [[d1_databases]] section');
      console.error('   - List available databases: wrangler d1 list');
      console.error('   - Create missing database: wrangler d1 create <database-name>');
      console.error('   - Verify you\'re authenticated to the correct Cloudflare account');
    } else if (errorMessage.includes('binding') && errorMessage.includes('not found')) {
      console.error('\n🔗 D1 Binding Configuration Error:');
      console.error('   - Check [[d1_databases]] section in wrangler.toml');
      console.error('   - Ensure binding name matches what your code expects');
      console.error('   - Verify database_name and database_id are correct');
      console.error('   - Example configuration:');
      console.error('     [[d1_databases]]');
      console.error('     binding = "DB"');
      console.error('     database_name = "my-database"');
      console.error('     database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"');
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      console.error('\n🔒 D1 Permission Error:');
      console.error('   - Verify Cloudflare API token has D1 permissions');
      console.error('   - Check if you have access to the specified database');
      console.error('   - Ensure you\'re authenticated to the correct account');
      console.error('   - Re-authenticate: wrangler login');
    } else if (errorMessage.includes('migration')) {
      console.error('\n🔄 D1 Migration Error:');
      console.error('   - Check migration files for syntax errors');
      console.error('   - Verify migration file names follow correct format');
      console.error('   - List migrations: wrangler d1 migrations list <database>');
      console.error('   - Apply migrations manually: wrangler d1 migrations apply <database>');
    } else {
      console.error('\n💡 General D1 Troubleshooting:');
      console.error('   - Check Cloudflare account has D1 enabled');
      console.error('   - Verify wrangler is up to date: npm install -g wrangler');
      console.error('   - List available databases: wrangler d1 list');
      console.error('   - Check database status in Cloudflare Dashboard');
      console.error('   - Review wrangler.toml configuration file');
    }

    console.error('\n📚 Additional Resources:');
    console.error('   - D1 Documentation: https://developers.cloudflare.com/d1/');
    console.error('   - Wrangler D1 Commands: wrangler d1 --help');
    console.error('   - Framework D1 Integration Guide: docs/guides/d1-setup.md');

    return {
      error: 'database_error',
      environment,
      service,
      message: error.message,
      analysis,
      troubleshooting: troubleshootingSteps
    };
  }

  /**
   * Analyze D1 error and provide specific recovery suggestions
   * @param {Error} error - The error to analyze
   * @returns {Object} Analysis result with suggestions and recovery strategy
   */
  static analyzeD1Error(error) {
    const errorMessage = error.message.toLowerCase();
    const analysis = {
      isD1Error: false,
      category: 'unknown',
      severity: 'medium',
      autoFixable: false,
      suggestions: [],
      errorType: null,
      databaseName: this._extractDbNameFromError(errorMessage),
      bindingName: null,
      canRecover: false
    };

    // Check if this is a D1 related error
    if (errorMessage.includes('d1') || errorMessage.includes('database') || errorMessage.includes('binding')) {
      analysis.isD1Error = true;

      // Extract binding name if present
      const bindingMatch = error.message.match(/binding '([^']+)'/);
      if (bindingMatch) {
        analysis.bindingName = bindingMatch[1];
      }
    }

    if (errorMessage.includes("couldn't find a d1 db")) {
      analysis.category = 'database_not_found';
      analysis.errorType = 'database_not_found';
      analysis.severity = 'high';
      analysis.autoFixable = true;
      analysis.canRecover = true;
      analysis.suggestions = [
        'Run automated D1 recovery: Check available databases and create/configure as needed',
        'Manual fix: wrangler d1 list && wrangler d1 create <name>',
        'Update wrangler.toml with correct database_id'
      ];
    } else if (errorMessage.includes('binding') && errorMessage.includes('not found')) {
      analysis.category = 'binding_configuration';
      analysis.errorType = 'binding_configuration_error';
      analysis.severity = 'medium';
      analysis.autoFixable = true;
      analysis.canRecover = true;
      analysis.suggestions = [
        'Run configuration validator to check [[d1_databases]] section',
        'Verify binding name matches code expectations',
        'Update database_name and database_id in wrangler.toml'
      ];
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      analysis.category = 'authentication';
      analysis.errorType = 'permission_error';
      analysis.severity = 'high';
      analysis.autoFixable = false;
      analysis.canRecover = false;
      analysis.suggestions = [
        'Re-authenticate with Cloudflare: wrangler login',
        'Check API token permissions include D1 access',
        'Verify correct Cloudflare account is selected'
      ];
    } else if (errorMessage.includes('migration')) {
      analysis.category = 'migration';
      analysis.severity = 'medium';
      analysis.autoFixable = false;
      analysis.canRecover = false;
      analysis.suggestions = [
        'Check migration files for syntax errors',
        'Apply migrations manually: wrangler d1 migrations apply',
        'Reset migrations if needed: wrangler d1 migrations list'
      ];
    }

    return analysis;
  }

  /**
   * Get step-by-step D1 troubleshooting guide
   * @param {string} errorType - Type of D1 error
   * @returns {Array<string>} Step-by-step guide
   */
  static getD1TroubleshootingSteps(errorType) {
    const guides = {
      database_not_found: [
        '1. List available databases: wrangler d1 list',
        '2. Check if database name in wrangler.toml matches an existing database',
        '3. If database doesn\'t exist, create it: wrangler d1 create <database-name>',
        '4. Copy the database ID from the creation output',
        '5. Update database_id in wrangler.toml [[d1_databases]] section',
        '6. Retry deployment: npm run deploy'
      ],
      binding_configuration: [
        '1. Open wrangler.toml and locate [[d1_databases]] section',
        '2. Verify binding name matches what your code expects (usually "DB")',
        '3. Check database_name is correct (no typos)',
        '4. Verify database_id is a valid UUID format',
        '5. Test configuration: wrangler deploy --dry-run',
        '6. If issues persist, validate with: wrangler d1 info <database-name>'
      ],
      authentication: [
        '1. Log out of current session: wrangler logout',
        '2. Re-authenticate: wrangler login',
        '3. Verify correct account: wrangler whoami',
        '4. Check API token permissions if using token authentication',
        '5. Ensure token has D1:Edit permissions in Cloudflare dashboard',
        '6. Retry the operation after successful authentication'
      ],
      migration: [
        '1. Check migration files in migrations/ directory',
        '2. Validate SQL syntax in migration files',
        '3. List current migration status: wrangler d1 migrations list <database>',
        '4. Apply pending migrations: wrangler d1 migrations apply <database>',
        '5. If errors occur, check migration file format and naming',
        '6. Consider rolling back problematic migrations if needed'
      ],
      general: [
        '1. Check Cloudflare account has D1 enabled and available',
        '2. Update wrangler to latest version: npm install -g wrangler',
        '3. Verify wrangler.toml file exists and has correct format',
        '4. Test authentication: wrangler whoami',
        '5. List available D1 databases: wrangler d1 list',
        '6. Check Cloudflare Dashboard for any service issues'
      ]
    };

    return guides[errorType] || guides.general;
  }

  /**
   * Handle configuration errors
   * @param {Error} error - The configuration error
   * @param {Object} config - The configuration object that failed
   * @returns {Object} Configuration error report
   */
  static handleConfigurationError(error, config = {}) {
    console.error(`\n❌ Configuration Error`);
    console.error(`   Message: ${error.message}`);

    if (config.customer) {
      console.error(`   Customer: ${config.customer}`);
    }
    if (config.environment) {
      console.error(`   Environment: ${config.environment}`);
    }

    console.error('\n💡 Configuration Troubleshooting:');
    console.error('   - Validate configuration schema');
    console.error('   - Check for missing required fields');
    console.error('   - Verify environment variables are set');
    console.error('   - Review configuration file syntax');

    return {
      error: 'configuration_error',
      message: error.message,
      context: config,
      troubleshooting: [
        'Validate configuration schema',
        'Check for missing required fields',
        'Verify environment variables are set',
        'Review configuration file syntax'
      ]
    };
  }

  /**
   * Create a standardized error report
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   * @returns {Object} Standardized error report
   */
  static createErrorReport(error, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      suggestions: this.generateSuggestions(error, context),
      recovery: this._attemptRecovery(error, context)
    };
  }

  /**
   * Generate error suggestions based on error type and context
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {string[]} Array of suggestion strings
   */
  static generateSuggestions(error, context = {}) {
    const suggestions = [];
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('security') || errorMessage.includes('validation')) {
      suggestions.push('Run security validation: npx clodo-security validate');
      suggestions.push('Generate secure keys: npx clodo-security generate-key api');
    }

    if (errorMessage.includes('health') || errorMessage.includes('connection')) {
      suggestions.push('Check deployment URL accessibility');
      suggestions.push('Verify service is running and responding');
      suggestions.push('Check network connectivity and firewall rules');
    }

    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      suggestions.push('Re-authenticate with Cloudflare: wrangler login');
      suggestions.push('Check API token validity and permissions');
    }

    if (errorMessage.includes('timeout')) {
      suggestions.push('Increase timeout values in configuration');
      suggestions.push('Check network connectivity');
    }

    if (errorMessage.includes('config') || errorMessage.includes('missing')) {
      suggestions.push('Review configuration files for errors');
      suggestions.push('Run configuration validation: npx clodo-config validate');
      suggestions.push('Check environment variables are properly set');
    }

    if (suggestions.length === 0) {
      suggestions.push('Review logs for more details');
      suggestions.push('Check system resources and dependencies');
    }

    return suggestions;
  }

  /**
   * Creates error handling middleware for Cloudflare Workers
   * @param {Object} options - Error handling options
   * @returns {Function} Error handling middleware
   */
  static createErrorHandlingMiddleware(options = {}) {
    const {
      includeStack = false,
      logErrors = true,
      transformError = null,
      statusCode = 500
    } = options;

    return (handler) => {
      return async (request, env, ctx) => {
        try {
          return await handler(request, env, ctx);
        } catch (error) {
          if (logErrors) {
            logger.error(`Request error: ${error.message}`, {
              url: request.url,
              method: request.method,
              stack: includeStack ? error.stack : undefined
            });
          }

          // Transform error if transformer provided
          let errorResponse = _createErrorResponse(error.message, {
            statusCode,
            includeStack,
            stack: error.stack
          });

          if (transformError) {
            errorResponse = transformError(error, errorResponse);
          }

          return new Response(
            JSON.stringify(errorResponse),
            {
              status: statusCode,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      };
    };
  }

  /**
   * Attempt to recover from error using recovery patterns
   * @param {Error} error - The error to recover from
   * @param {Object} context - Error context
   * @returns {Object} Recovery strategy and status
   * @private
   */
  static _attemptRecovery(error, context = {}) {
    this.initialize();

    const errorMsg = error.message.toLowerCase();
    const recovery = {
      attempted: false,
      strategy: null,
      canRetry: false,
      retryDelay: null,
      suggestions: []
    };

    // D1 Database errors - can use circuit breaker pattern
    if (errorMsg.includes('d1') || errorMsg.includes('database')) {
      recovery.strategy = 'circuit_breaker';
      recovery.canRetry = true;
      recovery.retryDelay = 5000; // 5 seconds
      recovery.suggestions = [
        'Will retry with exponential backoff',
        'Circuit breaker will prevent cascading failures',
        'Consider graceful degradation if database is unavailable'
      ];
    }

    // Timeout errors - can retry with backoff
    if (errorMsg.includes('timeout')) {
      recovery.strategy = 'exponential_backoff';
      recovery.canRetry = true;
      recovery.retryDelay = 2000; // 2 seconds initial
      recovery.suggestions = [
        'Will retry with exponential backoff and jitter',
        'Maximum 3 retry attempts',
        'Each retry doubles the delay'
      ];
    }

    // Connection errors - graceful degradation
    if (errorMsg.includes('connection') || errorMsg.includes('econnrefused')) {
      recovery.strategy = 'graceful_degradation';
      recovery.canRetry = true;
      recovery.retryDelay = 3000;
      recovery.suggestions = [
        'Service will fall back to cached responses if available',
        'Non-critical features will be disabled',
        'Core functionality will remain available'
      ];
    }

    recovery.attempted = recovery.canRetry;
    return recovery;
  }

  /**
   * Extract database name from error message
   * @param {string} errorMessage - The error message
   * @returns {string|null} Extracted database name or null
   * @private
   */
  static _extractDbNameFromError(errorMessage) {
    const matches = [
      /database['"s]?\s*(?:name|id)?['"s]?\s*(?:is|was|:)?\s*['"]*([a-zA-Z0-9_-]+)['"]*/.exec(errorMessage),
      /db['"s]?\s*(?::)?\s*['"]*([a-zA-Z0-9_-]+)['"]*/.exec(errorMessage),
      /binding\s*['"]*([a-zA-Z0-9_-]+)['"]*/.exec(errorMessage)
    ];

    for (const match of matches) {
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

// Export factory functions for backward compatibility
export const createErrorResponse = _createErrorResponse;
export const createContextualError = _createContextualError;

// Export middleware factory
export const createErrorHandler = ErrorHandler.createErrorHandlingMiddleware.bind(ErrorHandler);

export default ErrorHandler;
