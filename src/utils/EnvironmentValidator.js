/**
 * Environment Variable Validator
 * Validates required environment variables at runtime
 */

/**
 * Environment Variable Validation
 */
export class EnvironmentValidator {

  /**
   * Common required environment variables for Cloudflare services
   */
  static COMMON_REQUIRED_VARS = [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN'
  ];

  /**
   * Validate that all required environment variables are set
   * @param {string[]} requiredVars - Array of required environment variable names
   * @param {Object} env - Environment object (defaults to process.env)
   * @throws {Error} Throws descriptive error if any required vars are missing
   */
  static validateRequired(requiredVars, env = process.env) {
    const missing = [];
    const empty = [];

    for (const varName of requiredVars) {
      const value = env[varName];

      if (value === undefined || value === null) {
        missing.push(varName);
      } else if (typeof value === 'string' && value.trim() === '') {
        empty.push(varName);
      }
    }

    if (missing.length > 0 || empty.length > 0) {
      const errors = [];

      if (missing.length > 0) {
        errors.push(`Missing required environment variables: ${missing.join(', ')}`);
      }

      if (empty.length > 0) {
        errors.push(`Empty required environment variables: ${empty.join(', ')}`);
      }

      const errorMessage = `Environment validation failed:\n${errors.join('\n')}\n\nPlease set these variables in your wrangler.toml or deployment environment.`;

      throw new Error(errorMessage);
    }
  }

  /**
   * Validate Cloudflare-specific environment variables
   * @param {Object} env - Environment object (defaults to process.env)
   * @throws {Error} Throws error if Cloudflare vars are missing
   */
  static validateCloudflareVars(env = process.env) {
    const cloudflareVars = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN'
    ];

    this.validateRequired(cloudflareVars, env);
  }

  /**
   * Validate service-specific environment variables
   * @param {string[]} serviceVars - Service-specific required variables
   * @param {Object} env - Environment object (defaults to process.env)
   * @throws {Error} Throws error if service vars are missing
   */
  static validateServiceVars(serviceVars, env = process.env) {
    this.validateRequired(serviceVars, env);
  }

  /**
   * Validate all environment variables for a service
   * @param {Object} config - Service configuration with required vars
   * @param {Object} env - Environment object (defaults to process.env)
   * @throws {Error} Throws error if any vars are missing
   */
  static validateServiceConfig(config, env = process.env) {
    const requiredVars = [];

    // Add common Cloudflare vars
    requiredVars.push(...this.COMMON_REQUIRED_VARS);

    // Add service-specific vars from config
    if (config.requiredEnvironmentVars) {
      requiredVars.push(...config.requiredEnvironmentVars);
    }

    // Add feature-specific vars
    if (config.features) {
      if (config.features.d1) {
        // D1 might require additional vars, but usually handled by wrangler
      }
      if (config.features.kv) {
        // KV vars are usually handled by wrangler binding
      }
      if (config.features.r2) {
        // R2 vars are usually handled by wrangler binding
      }
    }

    this.validateRequired(requiredVars, env);
  }

  /**
   * Get a summary of environment variable status
   * @param {string[]} vars - Variables to check
   * @param {Object} env - Environment object (defaults to process.env)
   * @returns {Object} Status summary
   */
  static getStatus(vars, env = process.env) {
    const status = {
      total: vars.length,
      set: 0,
      missing: [],
      empty: []
    };

    for (const varName of vars) {
      const value = env[varName];

      if (value === undefined || value === null) {
        status.missing.push(varName);
      } else if (typeof value === 'string' && value.trim() === '') {
        status.empty.push(varName);
      } else {
        status.set++;
      }
    }

    status.valid = status.missing.length === 0 && status.empty.length === 0;

    return status;
  }

  /**
   * Log environment variable validation results
   * @param {string[]} vars - Variables that were checked
   * @param {Object} status - Status from getStatus()
   */
  static logValidationResults(vars, status) {
    console.log('\n🌍 Environment Variable Validation');
    console.log('=' .repeat(40));

    if (status.valid) {
      console.log(`✅ PASSED - All ${status.total} variables are set`);
    } else {
      console.log(`❌ ISSUES - ${status.missing.length + status.empty.length} problems found`);

      if (status.missing.length > 0) {
        console.log('\n📭 MISSING VARIABLES:');
        status.missing.forEach(variable => console.log(`   - ${variable}`));
      }

      if (status.empty.length > 0) {
        console.log('\n📝 EMPTY VARIABLES:');
        status.empty.forEach(variable => console.log(`   - ${variable}`));
      }

      console.log('\n💡 Set these in your wrangler.toml [vars] section or deployment environment');
    }
  }
}