/**
 * Clodo Framework - Security CLI
 * Programmatic API for security operations
 */

import { ConfigurationValidator } from '../security/ConfigurationValidator.js';
import { SecretGenerator } from '../security/SecretGenerator.js';
// DeploymentManager removed - was simulated deployment only
// Use MultiDomainOrchestrator for real deployments

export class SecurityCLI {
  constructor() {
    // Initialize with default settings
  }

  /**
   * Validate configuration security for a customer and environment
   * @param {string} customer - Customer name
   * @param {string} environment - Environment name
   * @returns {Object} Validation result
   */
  async validateConfiguration(customer, environment) {
    try {
      if (!customer || !environment) {
        throw new Error('Customer and environment are required');
      }

      const result = ConfigurationValidator.validateConfiguration(customer, environment);

      return {
        success: result.valid,
        customer,
        environment,
        valid: result.valid,
        securityIssues: result.securityIssues || [],
        message: result.valid ? 'Security validation passed' : 'Security issues found'
      };
    } catch (error) {
      return {
        success: false,
        customer,
        environment,
        error: error.message
      };
    }
  }

  /**
   * Generate a secure key
   * @param {string} type - Key type ('api', 'jwt', or custom prefix)
   * @param {number} length - Key length (optional)
   * @returns {Object} Key generation result
   */
  generateKey(type = 'api', length) {
    try {
      let key;
      let keyType;

      if (type === 'jwt') {
        key = SecretGenerator.generateSecureJwtSecret(length);
        keyType = 'JWT secret';
      } else {
        const prefix = type && type !== 'api' ? type : '';
        key = SecretGenerator.generateSecureApiKey(length || 32, prefix);
        keyType = 'API key';
      }

      return {
        success: true,
        type: keyType,
        key,
        length: key.length
      };
    } catch (error) {
      return {
        success: false,
        type,
        error: error.message
      };
    }
  }

  /**
   * Deploy with security validation
   * @deprecated Use MultiDomainOrchestrator for real deployments
   * @param {string} customer - Customer name
   * @param {string} environment - Environment name
   * @param {Object} options - Deployment options
   * @param {boolean} options.dryRun - Perform dry run (default: false)
   * @returns {Object} Deployment result
   */
  async deployWithSecurity(customer, environment, options = {}) {
    throw new Error('deployWithSecurity is deprecated. DeploymentManager was simulated deployment only. Use MultiDomainOrchestrator for real deployments.');
  }

  /**
   * Generate secure configuration
   * @deprecated Use UnifiedConfigManager for configuration management
   * @param {string} customer - Customer name
   * @param {string} environment - Environment name
   * @returns {Object} Configuration generation result
   */
  generateSecureConfig(customer, environment) {
    throw new Error('generateSecureConfig is deprecated. Use UnifiedConfigManager for configuration management.');
  }

  /**
   * Check deployment readiness
   * @deprecated Use MultiDomainOrchestrator's validation instead
   * @param {string} customer - Customer name
   * @param {string} environment - Environment name
   * @returns {Object} Readiness check result
   */
  checkDeploymentReadiness(customer, environment) {
    throw new Error('checkDeploymentReadiness is deprecated. Use MultiDomainOrchestrator validation instead.');
  }

  /**
   * Get available commands
   * @returns {string[]} Array of available commands
   */
  getAvailableCommands() {
    return [
      'validate',
      'generate-key',
      'deploy',
      'generate-config',
      'check-readiness'
    ];
  }

  /**
   * Get command help
   * @param {string} command - Command name (optional)
   * @returns {string} Help text
   */
  getHelp(command) {
    const help = {
      validate: 'validate <customer> <environment> - Validate configuration security',
      'generate-key': 'generate-key [type] [length] - Generate secure key (api/jwt)',
      deploy: 'deploy <customer> <environment> - Deploy with security validation',
      'generate-config': 'generate-config <customer> <environment> - Generate secure configuration',
      'check-readiness': 'check-readiness <customer> <environment> - Check deployment readiness'
    };

    if (command && help[command]) {
      return help[command];
    }

    return `Clodo Framework Security CLI

Commands:
${Object.values(help).map(cmd => `  ${cmd}`).join('\n')}

Examples:
  validate tamyla production
  generate-key jwt 64
  generate-key content-skimmer
  deploy tamyla staging --dry-run`;
  }
}

// Convenience functions for direct use
export async function validateSecurity(customer, environment) {
  const cli = new SecurityCLI();
  return await cli.validateConfiguration(customer, environment);
}

export function generateSecureKey(type = 'api', length) {
  const cli = new SecurityCLI();
  return cli.generateKey(type, length);
}

export async function deployWithSecurity(customer, environment, options = {}) {
  const cli = new SecurityCLI();
  return await cli.deployWithSecurity(customer, environment, options);
}

export function generateSecureConfig(customer, environment) {
  const cli = new SecurityCLI();
  return cli.generateSecureConfig(customer, environment);
}

export function checkDeploymentReadiness(customer, environment) {
  const cli = new SecurityCLI();
  return cli.checkDeploymentReadiness(customer, environment);
}