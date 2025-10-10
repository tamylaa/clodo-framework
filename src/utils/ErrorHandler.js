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
   * Handle D1 database related errors specifically
   * @param {Error} error - The D1 database error
   * @param {Object} context - Context information (environment, service, etc.)
   */
  static handleD1DatabaseError(error, context = {}) {
    console.error(`\n❌ D1 Database Error`);
    console.error(`   Environment: ${context.environment || 'unknown'}`);
    console.error(`   Service: ${context.service || 'unknown'}`);
    console.error(`   Error: ${error.message}`);

    const errorMessage = error.message.toLowerCase();

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
      console.error('   - Re-authenticate: wrangler auth login');
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
  }

  /**
   * Analyze error and provide specific D1 recovery suggestions
   * @param {Error} error - The error to analyze
   * @returns {Object} Analysis result with suggestions
   */
  static analyzeD1Error(error) {
    const errorMessage = error.message.toLowerCase();
    const analysis = {
      isD1Error: false,
      category: 'unknown',
      severity: 'medium',
      autoFixable: false,
      suggestions: []
    };

    // Check if this is a D1 related error
    if (errorMessage.includes('d1') || errorMessage.includes('database') || errorMessage.includes('binding')) {
      analysis.isD1Error = true;
    }

    if (errorMessage.includes("couldn't find a d1 db")) {
      analysis.category = 'database_not_found';
      analysis.severity = 'high';
      analysis.autoFixable = true;
      analysis.suggestions = [
        'Run automated D1 recovery: Check available databases and create/configure as needed',
        'Manual fix: wrangler d1 list && wrangler d1 create <name>',
        'Update wrangler.toml with correct database_id'
      ];
    } else if (errorMessage.includes('binding') && errorMessage.includes('not found')) {
      analysis.category = 'binding_configuration';
      analysis.severity = 'medium';
      analysis.autoFixable = true;
      analysis.suggestions = [
        'Run configuration validator to check [[d1_databases]] section',
        'Verify binding name matches code expectations',
        'Update database_name and database_id in wrangler.toml'
      ];
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      analysis.category = 'authentication';
      analysis.severity = 'high';
      analysis.autoFixable = false;
      analysis.suggestions = [
        'Re-authenticate with Cloudflare: wrangler auth login',
        'Check API token permissions include D1 access',
        'Verify correct Cloudflare account is selected'
      ];
    } else if (errorMessage.includes('migration')) {
      analysis.category = 'migration';
      analysis.severity = 'medium';
      analysis.autoFixable = false;
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
        '2. Re-authenticate: wrangler auth login',
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