/**
 * Enhanced Error Handler
 * Comprehensive error reporting and handling utilities
 */

export class ErrorHandler {
  /**
   * Handle deployment errors with detailed reporting
   * @param {Error} error - The error object
   * @param {Object} context - Additional context (customer, environment, etc.)
   */
  static handleDeploymentError(error, context = {}) {
    const { customer, environment, phase } = context;

    console.error(`\n❌ Deployment Error in phase: ${phase || 'unknown'}`);
    console.error(`   Customer: ${customer || 'unknown'}`);
    console.error(`   Environment: ${environment || 'unknown'}`);
    console.error(`   Message: ${error.message}`);

    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }

    // Log additional context if available
    if (context.deploymentUrl) {
      console.error(`   Deployment URL: ${context.deploymentUrl}`);
    }

    // Provide actionable suggestions
    this.provideErrorSuggestions(error, context);
  }

  /**
   * Provide actionable error suggestions
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   */
  static provideErrorSuggestions(error, context) {
    console.error('\n💡 Suggestions:');

    if (error.message.includes('security')) {
      console.error('   - Run security validation: npx clodo-security validate <customer> <environment>');
      console.error('   - Generate secure keys: npx clodo-security generate-key api');
    }

    if (error.message.includes('health check')) {
      console.error('   - Check deployment URL accessibility');
      console.error('   - Verify service is running and responding');
    }

    if (error.message.includes('authentication')) {
      console.error('   - Re-authenticate with Cloudflare: wrangler auth login');
      console.error('   - Check API token validity');
    }

    if (error.message.includes('timeout')) {
      console.error('   - Increase timeout values in configuration');
      console.error('   - Check network connectivity');
    }

    if (error.message.includes('validation')) {
      console.error('   - Review configuration files for errors');
      console.error('   - Run validation checks: npx clodo-config validate');
    }

    console.error('   - Review logs for more details');
  }

  /**
   * Wrap async operations with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Context for error reporting
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
   */
  static handleHealthCheckError(error, url) {
    console.error(`\n❌ Health Check Failed`);
    console.error(`   URL: ${url}`);
    console.error(`   Error: ${error.message}`);

    console.error('\n💡 Health Check Troubleshooting:');
    console.error('   - Verify the service is deployed and running');
    console.error('   - Check if the /health endpoint exists');
    console.error('   - Ensure the service responds with valid JSON');
    console.error('   - Check network connectivity and firewall rules');
    console.error('   - Review service logs for startup errors');
  }

  /**
   * Handle configuration errors
   * @param {Error} error - The configuration error
   * @param {Object} config - The configuration object that failed
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
      suggestions: this.generateSuggestions(error, context)
    };
  }

  /**
   * Generate error suggestions based on error type and context
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {string[]} Array of suggestion strings
   */
  static generateSuggestions(error, context) {
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
      suggestions.push('Re-authenticate with Cloudflare: wrangler auth login');
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
}