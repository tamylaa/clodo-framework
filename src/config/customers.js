import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createDomainConfigSchema, validateDomainConfig, createDomainRegistry } from './domains.js';
import { createLogger } from '../utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('CustomerConfig');

/**
 * Customer Configuration Manager
 * Manages multi-environment, multi-customer configuration structure
 * Integrates with existing domain and feature flag systems
 */
export class CustomerConfigurationManager {
  constructor(options = {}) {
    this.configDir = options.configDir || resolve(__dirname, '..', '..', 'config');
    this.environments = options.environments || ['development', 'staging', 'production'];
    this.domainRegistry = createDomainRegistry({});
    this.customers = new Map();
  }

  /**
   * Create a new customer configuration from template
   * @param {string} customerName - Customer identifier
   * @param {string} domain - Customer domain (optional)
   * @param {Object} options - Additional customer options
   */
  async createCustomer(customerName, domain = null, options = {}) {
    logger.info(`Creating customer configuration: ${customerName}`);

    const customerDir = resolve(this.configDir, 'customers', customerName);

    // Create customer directory structure
    if (!existsSync(customerDir)) {
      mkdirSync(customerDir, { recursive: true });
      logger.info(`Created customer directory: ${customerDir}`);
    }

    // Create domain configuration for customer
    const domainConfig = this.createCustomerDomainConfig(customerName, domain, options);
    this.domainRegistry.add(customerName, domainConfig);

    // Create environment-specific configs from templates
    for (const env of this.environments) {
      await this.createCustomerEnvironment(customerName, env, domain, options);
    }

    // Store customer metadata
    this.customers.set(customerName, {
      name: customerName,
      domain: domain,
      createdAt: new Date().toISOString(),
      environments: this.environments,
      ...options
    });

    logger.info(`Customer ${customerName} configuration created successfully`);
    return this.getCustomerInfo(customerName);
  }

  /**
   * Create domain configuration for customer
   */
  createCustomerDomainConfig(customerName, domain, options) {
    const baseConfig = createDomainConfigSchema();

    // Generate customer-specific domain config
    const domainConfig = {
      ...baseConfig,
      name: customerName,
      displayName: options.displayName || this.capitalizeFirst(customerName),
      accountId: options.accountId || '00000000000000000000000000000000', // Placeholder for onboarding
      zoneId: options.zoneId || '00000000000000000000000000000000', // Placeholder for onboarding

      domains: {
        production: domain || `${customerName}.com`,
        staging: `staging.${domain || `${customerName}.com`}`,
        development: `dev.${domain || `${customerName}.com`}`
      },

      features: {
        // Customer-specific feature flags
        customerIsolation: true,
        customDomain: !!domain,
        multiEnvironment: true,
        ...options.features
      },

      settings: {
        ...baseConfig.settings,
        customerName: customerName,
        customerDomain: domain,
        ...options.settings
      }
    };

    // Skip validation during initial creation if using placeholders
    if (options.skipValidation || !options.accountId || !options.zoneId) {
      logger.info(`Created customer domain config for ${customerName} (framework mode - placeholders used)`);
      return domainConfig;
    }

    validateDomainConfig(domainConfig);
    return domainConfig;
  }

  /**
   * Create customer environment config from template
   */
  async createCustomerEnvironment(customerName, environment, domain, options) {
    const templatePath = resolve(this.configDir, 'customers', 'template', `${environment}.env.template`);
    const outputPath = resolve(this.configDir, 'customers', customerName, `${environment}.env`);

    // Check if template exists
    if (!existsSync(templatePath)) {
      logger.warn(`Template not found: ${templatePath}, skipping ${environment} config`);
      return;
    }

    // Skip if config already exists
    if (existsSync(outputPath)) {
      logger.info(`Config already exists: ${outputPath}, skipping`);
      return;
    }

    try {
      // Read template and replace placeholders
      let template = readFileSync(templatePath, 'utf8');

      // Replace customer-specific placeholders
      template = template.replace(/\{\{CUSTOMER_NAME\}\}/g, customerName);
      template = template.replace(/\{\{CUSTOMER_DOMAIN\}\}/g, domain || `${customerName}.com`);
      template = template.replace(/\{\{ENVIRONMENT\}\}/g, environment);

      // Environment-specific domain replacements
      const envDomains = this.getEnvironmentDomains(customerName, domain);
      template = template.replace(/\{\{DOMAIN\}\}/g, envDomains[environment]);

      // Write customer config
      writeFileSync(outputPath, template);
      logger.info(`Created customer config: ${environment}.env for ${customerName}`);

    } catch (error) {
      logger.error(`Failed to create ${environment} config for ${customerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get environment-specific domains for customer
   */
  getEnvironmentDomains(customerName, domain) {
    const baseDomain = domain || `${customerName}.com`;
    return {
      production: baseDomain,
      staging: `staging.${baseDomain}`,
      development: `dev.${baseDomain}`
    };
  }

  /**
   * Validate customer configurations
   */
  async validateConfigs() {
    logger.info('Validating customer configuration structure...');

    let valid = true;
    const errors = [];

    // Validate base configuration files
    const baseFiles = ['wrangler.base.toml', 'variables.base.env'];
    for (const file of baseFiles) {
      const path = resolve(this.configDir, 'base', file);
      if (!existsSync(path)) {
        errors.push(`Missing base config: ${file}`);
        valid = false;
      }
    }

    // Validate environment configs
    for (const env of this.environments) {
      const envFile = `${env}.toml`;
      const path = resolve(this.configDir, 'environments', envFile);
      if (!existsSync(path)) {
        errors.push(`Missing environment config: ${envFile}`);
        valid = false;
      }
    }

    // Validate customer configs
    const customersDir = resolve(this.configDir, 'customers');
    if (existsSync(customersDir)) {
      const customerDirs = this.getCustomerDirectories();

      for (const customerName of customerDirs) {
        const customerValid = await this.validateCustomerConfig(customerName);
        if (!customerValid) {
          valid = false;
        }
      }
    }

    if (errors.length > 0) {
      logger.error('Configuration validation errors:', errors);
    }

    logger.info(`Configuration validation ${valid ? 'passed' : 'failed'}`);
    return { valid, errors };
  }

  /**
   * Validate individual customer configuration
   */
  async validateCustomerConfig(customerName) {
    const customerDir = resolve(this.configDir, 'customers', customerName);
    let valid = true;

    // Check environment files exist
    for (const env of this.environments) {
      const envFile = resolve(customerDir, `${env}.env`);
      if (!existsSync(envFile)) {
        logger.error(`Missing ${env}.env for customer ${customerName}`);
        valid = false;
      }
    }

    // Validate domain configuration (skip in framework mode)
    try {
      const domainConfig = this.domainRegistry.get(customerName);
      if (!domainConfig.settings?.isFrameworkMode) {
        validateDomainConfig(domainConfig);
      } else {
        logger.info(`Skipping domain validation for ${customerName} (framework mode)`);
      }
    } catch (error) {
      logger.error(`Invalid domain config for ${customerName}:`, error.message);
      valid = false;
    }

    return valid;
  }

  /**
   * Show effective configuration for customer/environment
   */
  showConfig(customerName, environment) {
    logger.info(`Showing effective configuration: ${customerName}/${environment}`);

    // Get domain config from registry
    let domainConfig;
    try {
      domainConfig = this.domainRegistry.get(customerName);
    } catch (error) {
      // If not in registry, try to find customer metadata
      const customerMeta = this.customers.get(customerName);
      if (customerMeta) {
        // Recreate domain config from metadata
        domainConfig = this.createCustomerDomainConfig(
          customerName,
          customerMeta.domain,
          customerMeta
        );
      } else {
        throw new Error(`Customer not found: ${customerName}`);
      }
    }

    const config = {
      customer: customerName,
      environment: environment,
      domain: domainConfig,
      variables: {},
      features: {}
    };

    // Load base variables
    const baseVarsPath = resolve(this.configDir, 'base', 'variables.base.env');
    if (existsSync(baseVarsPath)) {
      config.variables.base = this.parseEnvFile(baseVarsPath);
    }

    // Load customer environment variables
    const customerConfigPath = resolve(this.configDir, 'customers', customerName, `${environment}.env`);
    if (existsSync(customerConfigPath)) {
      config.variables.customer = this.parseEnvFile(customerConfigPath);
    }

    // Get domain features
    config.features = domainConfig.features || {};

    return config;
  }

  /**
   * Generate deployment command for customer/environment
   */
  getDeployCommand(customerName, environment) {
    const commands = {
      development: `wrangler dev --config config/environments/development.toml`,
      staging: `wrangler deploy --config config/environments/staging.toml --env staging`,
      production: `wrangler deploy --env production`
    };

    const command = commands[environment];
    if (!command) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    logger.info(`Generated deploy command for ${customerName}/${environment}`);
    return {
      command: command,
      customer: customerName,
      environment: environment,
      configPath: `config/customers/${customerName}/${environment}.env`
    };
  }

  /**
   * Get customer information
   */
  getCustomerInfo(customerName) {
    const domainConfig = this.domainRegistry.get(customerName);
    const customerMeta = this.customers.get(customerName);

    return {
      ...customerMeta,
      domainConfig: domainConfig,
      configPath: resolve(this.configDir, 'customers', customerName)
    };
  }

  /**
   * List all customers
   */
  listCustomers() {
    return Array.from(this.customers.keys()).map(name => ({
      name: name,
      ...this.getCustomerInfo(name)
    }));
  }

  /**
   * Load existing customers from filesystem
   */
  async loadExistingCustomers() {
    const customersDir = resolve(this.configDir, 'customers');
    if (!existsSync(customersDir)) {
      return;
    }

    try {
      // Read customer directories
      const customerDirs = this.getCustomerDirectories();

      for (const customerName of customerDirs) {
        // Skip template directory
        if (customerName === 'template') continue;

        const customerDir = resolve(customersDir, customerName);

        // Try to load customer metadata from a metadata file or infer from configs
        const metadata = {
          name: customerName,
          createdAt: new Date().toISOString(), // Placeholder
          environments: this.environments
        };

        // Try to infer domain from production config
        const prodConfigPath = resolve(customerDir, 'production.env');
        if (existsSync(prodConfigPath)) {
          try {
            const prodConfig = this.parseEnvFile(prodConfigPath);
            if (prodConfig.DOMAIN) {
              metadata.domain = prodConfig.DOMAIN.replace(/^https?:\/\//, '');
            }
          } catch (error) {
            logger.warn(`Could not parse production config for ${customerName}:`, error.message);
          }
        }

        // Register customer
        this.customers.set(customerName, metadata);

        // Try to register domain config
        try {
          const domainConfig = this.createCustomerDomainConfig(customerName, metadata.domain, {
            skipValidation: true,
            isFrameworkMode: true
          });
          this.domainRegistry.add(customerName, domainConfig);
        } catch (error) {
          logger.warn(`Could not register domain for existing customer ${customerName}:`, error.message);
        }

        logger.info(`Loaded existing customer: ${customerName}`);
      }
    } catch (error) {
      logger.error('Error loading existing customers:', error.message);
    }
  }

  /**
   * Get customer directories from filesystem
   */
  getCustomerDirectories() {
    const customersDir = resolve(this.configDir, 'customers');
    if (!existsSync(customersDir)) {
      return [];
    }

    try {
      // Read directory contents
      const items = readdirSync(customersDir);
      return items.filter(item => {
        const itemPath = resolve(customersDir, item);
        return statSync(itemPath).isDirectory() && item !== 'template';
      });
    } catch (error) {
      logger.error('Error reading customer directories:', error.message);
      return [];
    }
  }

  /**
   * Parse environment file
   */
  parseEnvFile(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const variables = {};

    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          variables[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return variables;
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Default instance
export const customerConfigManager = new CustomerConfigurationManager();

// Convenience functions
export const createCustomer = (name, domain, options) =>
  customerConfigManager.createCustomer(name, domain, options);

export const validateCustomerConfigs = () =>
  customerConfigManager.validateConfigs();

export const showCustomerConfig = (customer, env) =>
  customerConfigManager.showConfig(customer, env);

export const getCustomerDeployCommand = (customer, env) =>
  customerConfigManager.getDeployCommand(customer, env);