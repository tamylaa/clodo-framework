/**
 * Lego Framework - Customer Configuration CLI
 * Programmatic API for customer configuration management
 */

import { CustomerConfigurationManager } from '../config/customers.js';

export class CustomerConfigCLI {
  constructor() {
    this.customerManager = new CustomerConfigurationManager();
  }

  /**
   * Initialize the customer manager by loading existing customers
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    try {
      await this.customerManager.loadExistingCustomers();
      return {
        success: true,
        message: 'Customer manager initialized successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new customer configuration
   * @param {string} customerName - Customer name
   * @param {string} domain - Customer domain (optional)
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Creation result
   */
  async createCustomer(customerName, domain, options = {}) {
    try {
      if (!customerName) {
        throw new Error('Customer name is required');
      }

      const customerInfo = await this.customerManager.createCustomer(customerName, domain, {
        skipValidation: true,
        isFrameworkMode: true,
        ...options
      });

      return {
        success: true,
        customer: customerInfo
      };
    } catch (error) {
      return {
        success: false,
        customerName,
        error: error.message
      };
    }
  }

  /**
   * Validate customer configuration structure
   * @returns {Promise<Object>} Validation result
   */
  async validateConfigurations() {
    try {
      const result = await this.customerManager.validateConfigs();

      return {
        success: result.valid,
        valid: result.valid,
        errors: result.errors || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Show effective configuration for a customer and environment
   * @param {string} customerName - Customer name
   * @param {string} environment - Environment name
   * @returns {Object} Configuration display result
   */
  showConfiguration(customerName, environment) {
    try {
      if (!customerName || !environment) {
        throw new Error('Customer name and environment are required');
      }

      const config = this.customerManager.showConfig(customerName, environment);

      return {
        success: true,
        customer: customerName,
        environment,
        config
      };
    } catch (error) {
      return {
        success: false,
        customer: customerName,
        environment,
        error: error.message
      };
    }
  }

  /**
   * Get deployment command for a customer and environment
   * @param {string} customerName - Customer name
   * @param {string} environment - Environment name
   * @returns {Object} Deployment command result
   */
  getDeployCommand(customerName, environment) {
    try {
      if (!customerName || !environment) {
        throw new Error('Customer name and environment are required');
      }

      const deployInfo = this.customerManager.getDeployCommand(customerName, environment);

      return {
        success: true,
        customer: customerName,
        environment,
        command: deployInfo.command,
        configPath: deployInfo.configPath
      };
    } catch (error) {
      return {
        success: false,
        customer: customerName,
        environment,
        error: error.message
      };
    }
  }

  /**
   * List all configured customers
   * @returns {Object} Customer list result
   */
  listCustomers() {
    try {
      const customers = this.customerManager.listCustomers();

      return {
        success: true,
        customers
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available commands
   * @returns {string[]} Array of available commands
   */
  getAvailableCommands() {
    return [
      'create-customer',
      'validate',
      'show',
      'deploy-command',
      'list'
    ];
  }

  /**
   * Get command help
   * @param {string} command - Command name (optional)
   * @returns {string} Help text
   */
  getHelp(command) {
    const help = {
      'create-customer': 'create-customer <name> [domain] - Create new customer config from template',
      'validate': 'validate - Validate configuration structure',
      'show': 'show <customer> <environment> - Show effective configuration',
      'deploy-command': 'deploy-command <customer> <environment> - Get deployment command',
      'list': 'list - List all configured customers'
    };

    if (command && help[command]) {
      return help[command];
    }

    return `Customer Configuration Management Tool

Available commands:
${Object.values(help).map(cmd => `  ${cmd}`).join('\n')}

Examples:
  create-customer acmecorp acmecorp.com
  validate
  show acmecorp production
  list

Integration:
  This tool integrates with Lego Framework domain and feature flag systems.
  Customer configurations are automatically registered as domains.`;
  }
}

// Convenience functions for direct use
export async function createCustomer(customerName, domain, options = {}) {
  const cli = new CustomerConfigCLI();
  await cli.initialize();
  return await cli.createCustomer(customerName, domain, options);
}

export async function validateCustomerConfigs() {
  const cli = new CustomerConfigCLI();
  await cli.initialize();
  return await cli.validateConfigurations();
}

export function showCustomerConfig(customerName, environment) {
  const cli = new CustomerConfigCLI();
  return cli.showConfiguration(customerName, environment);
}

export function getCustomerDeployCommand(customerName, environment) {
  const cli = new CustomerConfigCLI();
  return cli.getDeployCommand(customerName, environment);
}

export function listConfiguredCustomers() {
  const cli = new CustomerConfigCLI();
  return cli.listCustomers();
}