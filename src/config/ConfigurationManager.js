/**
 * Interactive Deployment Configuration Manager
 * User input-driven configuration setup for deployment workflows
 */

import { askChoice, askUser } from '../utils/deployment/interactive-prompts.js';

export class InteractiveDeploymentConfigurator {
  /**
   * Generate configuration from user input
   * @param {Object} defaults - Default values
   * @returns {Promise<Object>} User-configured settings
   */
  static async generateFromUserInput(defaults = {}) {
    console.log('🔧 Configuration Setup');
    console.log('======================');

    const config = { ...defaults };

    // Environment selection
    config.environment = await askChoice(
      'Select deployment environment:',
      ['development', 'staging', 'production'],
      2 // Default to production
    );

    // Customer/domain input
    config.customer = await askUser('Enter customer name:', defaults.customer || '');
    config.domain = await askUser('Enter domain:', defaults.domain || '');

    // Security settings
    config.enableSecurityValidation = await askChoice(
      'Enable security validation?',
      ['yes', 'no'],
      0
    ) === 'yes';

    // Deployment options
    config.runTests = await askChoice(
      'Run post-deployment tests?',
      ['yes', 'no'],
      0
    ) === 'yes';

    // Additional deployment settings
    config.dryRun = await askChoice(
      'Perform dry run first?',
      ['yes', 'no'],
      1 // Default to no
    ) === 'yes';

    config.allowInsecure = await askChoice(
      'Allow insecure deployment (not recommended)?',
      ['yes', 'no'],
      1 // Default to no
    ) === 'yes';

    return config;
  }

  /**
   * Validate user-provided configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  static validateConfiguration(config) {
    const errors = [];
    const warnings = [];

    if (!config.customer) {
      errors.push('Customer name is required');
    } else if (config.customer.length < 2) {
      errors.push('Customer name must be at least 2 characters');
    }

    if (!config.domain) {
      errors.push('Domain is required');
    } else if (!this.isValidDomain(config.domain)) {
      errors.push('Domain format is invalid');
    }

    if (!['development', 'staging', 'production'].includes(config.environment)) {
      errors.push('Invalid environment selection');
    }

    // Warnings for potentially risky settings
    if (config.allowInsecure) {
      warnings.push('Insecure deployment allowed - security validations will be bypassed');
    }

    if (!config.enableSecurityValidation) {
      warnings.push('Security validation disabled - deployment may be vulnerable');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0
    };
  }

  /**
   * Validate domain format
   * @param {string} domain - Domain to validate
   * @returns {boolean} True if valid domain format
   */
  static isValidDomain(domain) {
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  /**
   * Generate deployment URL from configuration
   * @param {Object} config - Configuration object
   * @returns {string} Generated deployment URL
   */
  static generateDeploymentUrl(config) {
    const { customer, environment, domain } = config;

    if (domain) {
      return `https://${customer}.${domain}`;
    }

    // Fallback to Cloudflare Workers pattern
    return `https://${customer}-${environment}.workers.dev`;
  }

  /**
   * Create deployment configuration summary
   * @param {Object} config - Configuration object
   * @returns {string} Formatted configuration summary
   */
  static createConfigurationSummary(config) {
    const lines = [
      '📋 Deployment Configuration Summary',
      '====================================',
      '',
      `👤 Customer: ${config.customer}`,
      `🌍 Environment: ${config.environment}`,
      `🔗 Domain: ${config.domain || 'Auto-generated'}`,
      `🔒 Security Validation: ${config.enableSecurityValidation ? 'Enabled' : 'Disabled'}`,
      `🧪 Post-deployment Tests: ${config.runTests ? 'Enabled' : 'Disabled'}`,
      `🧪 Dry Run: ${config.dryRun ? 'Yes' : 'No'}`,
      `⚠️  Allow Insecure: ${config.allowInsecure ? 'Yes' : 'No'}`,
      '',
      `🚀 Deployment URL: ${this.generateDeploymentUrl(config)}`
    ];

    return lines.join('\n');
  }

  /**
   * Interactive configuration wizard
   * @param {Object} defaults - Default configuration values
   * @returns {Promise<Object>} Complete configuration object
   */
  static async runConfigurationWizard(defaults = {}) {
    console.log('\n🚀 CLODO Framework Deployment Configuration Wizard');
    console.log('================================================\n');

    let config;
    let isValid = false;

    do {
      config = await this.generateFromUserInput(defaults);
      const validation = this.validateConfiguration(config);

      if (!validation.valid) {
        console.log('\n❌ Configuration Validation Failed:');
        validation.errors.forEach(error => console.log(`   - ${error}`));
        console.log('\nPlease correct the errors and try again.\n');
        continue;
      }

      if (validation.hasWarnings) {
        console.log('\n⚠️  Configuration Warnings:');
        validation.warnings.forEach(warning => console.log(`   - ${warning}`));

        const proceed = await askChoice(
          '\nProceed with deployment despite warnings?',
          ['yes', 'no'],
          1 // Default to no
        );

        if (proceed === 'no') {
          console.log('Configuration cancelled. Please adjust settings.\n');
          continue;
        }
      }

      isValid = true;

    } while (!isValid);

    console.log('\n✅ Configuration Complete!');
    console.log(this.createConfigurationSummary(config));

    const confirm = await askChoice(
      '\nDeploy with this configuration?',
      ['yes', 'no'],
      0 // Default to yes
    );

    if (confirm === 'no') {
      throw new Error('Deployment cancelled by user');
    }

    return config;
  }
}