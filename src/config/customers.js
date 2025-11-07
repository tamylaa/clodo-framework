import fs from 'fs';
// eslint-disable-next-line no-unused-vars
import { resolve, join } from 'path';
import toml from '@iarna/toml';
import { createDomainConfigSchema, validateDomainConfig, createDomainRegistry } from './domains.js';
import { getDirname } from '../utils/esm-helper.js';

const __dirname = getDirname(import.meta.url, 'src/config');

// Simple inline logger to avoid circular dependency with index.js
const logger = {
  info: (message, ...args) => console.log(`[CustomerConfig] ${message}`, ...args),
  error: (message, ...args) => console.error(`[CustomerConfig] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[CustomerConfig] ${message}`, ...args),
  debug: (message, ...args) => console.debug(`[CustomerConfig] ${message}`, ...args)
};

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
    console.log(`DEBUG: Checking if directory exists: ${customerDir}`);
    if (!fs.existsSync(customerDir)) {
      console.log(`DEBUG: Creating directory: ${customerDir}`);
      fs.mkdirSync(customerDir, { recursive: true });
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
  // eslint-disable-next-line no-unused-vars
  async createCustomerEnvironment(customerName, environment, domain, options) {
    const templatePath = resolve(this.configDir, 'customers', 'template', `${environment}.env.template`);
    const outputPath = resolve(this.configDir, 'customers', customerName, `${environment}.env`);

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      logger.warn(`Template not found: ${templatePath}, skipping ${environment} config`);
      return;
    }

    // Skip if config already exists
    if (fs.existsSync(outputPath)) {
      logger.info(`Config already exists: ${outputPath}, skipping`);
      return;
    }

    try {
      // Read template and replace placeholders
      let template = fs.readFileSync(templatePath, 'utf8');

      // Replace customer-specific placeholders
      template = template.replace(/\{\{CUSTOMER_NAME\}\}/g, customerName);
      template = template.replace(/\{\{CUSTOMER_DOMAIN\}\}/g, domain || `${customerName}.com`);
      template = template.replace(/\{\{ENVIRONMENT\}\}/g, environment);

      // Environment-specific domain replacements
      const envDomains = this.getEnvironmentDomains(customerName, domain);
      template = template.replace(/\{\{DOMAIN\}\}/g, envDomains[environment]);

      // Write customer config
      fs.writeFileSync(outputPath, template);
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
      if (!fs.existsSync(path)) {
        errors.push(`Missing base config: ${file}`);
        valid = false;
      }
    }

    // Validate environment configs
    for (const env of this.environments) {
      const envFile = `${env}.toml`;
      const path = resolve(this.configDir, 'environments', envFile);
      if (!fs.existsSync(path)) {
        errors.push(`Missing environment config: ${envFile}`);
        valid = false;
      }
    }

    // Validate customer configs
    const customersDir = resolve(this.configDir, 'customers');
    if (fs.existsSync(customersDir)) {
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
      if (!fs.existsSync(envFile)) {
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
    if (fs.existsSync(baseVarsPath)) {
      config.variables.base = this.parseEnvFile(baseVarsPath);
    }

    // Load customer environment variables
    const customerConfigPath = resolve(this.configDir, 'customers', customerName, `${environment}.env`);
    if (fs.existsSync(customerConfigPath)) {
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
    if (!fs.existsSync(customersDir)) {
      return;
    }

    try {
      // First, try to read from root wrangler.toml (real deployment config)
      const rootWranglerPath = resolve(this.configDir, '..', 'wrangler.toml');
      let wranglerConfig = null;
      let globalAccountId = null;
      
      if (fs.existsSync(rootWranglerPath)) {
        try {
          const wranglerContent = fs.readFileSync(rootWranglerPath, 'utf8');
          wranglerConfig = toml.parse(wranglerContent);
          globalAccountId = wranglerConfig.account_id;
          logger.info(`Loaded wrangler.toml with account_id: ${globalAccountId ? globalAccountId.substring(0, 8) + '...' : 'not found'}`);
        } catch (error) {
          logger.warn('Could not parse root wrangler.toml:', error.message);
        }
      }

      // Read customer directories
      const customerDirs = this.getCustomerDirectories();

      for (const customerName of customerDirs) {
        // Skip template directory
        if (customerName === 'template') continue;

        const customerDir = resolve(customersDir, customerName);

        // Initialize customer metadata
        const metadata = {
          name: customerName,
          createdAt: new Date().toISOString(),
          environments: this.environments,
          accountId: globalAccountId // Start with global account ID
        };

        // Try to load from wrangler.toml [env.production] section
        if (wranglerConfig && wranglerConfig.env && wranglerConfig.env.production) {
          const prodEnv = wranglerConfig.env.production;
          
          // Extract SERVICE_DOMAIN (maps to customer name usually)
          if (prodEnv.vars && prodEnv.vars.SERVICE_DOMAIN) {
            metadata.serviceDomain = prodEnv.vars.SERVICE_DOMAIN;
            
            // If SERVICE_DOMAIN matches customer name, this is their config
            if (prodEnv.vars.SERVICE_DOMAIN === customerName) {
              // Extract database info
              if (prodEnv.d1_databases && prodEnv.d1_databases.length > 0) {
                const db = prodEnv.d1_databases[0];
                metadata.databaseId = db.database_id;
                metadata.databaseName = db.database_name;
              }
              
              // Extract zone_id if present
              if (prodEnv.zone_id) {
                metadata.zoneId = prodEnv.zone_id;
              }
              
              // Extract route to infer domain
              if (prodEnv.route) {
                // Route format: "example.com/*" or "*.example.com/*"
                const domain = prodEnv.route.replace(/\/\*$/, '').replace(/^\*\./, '');
                metadata.domain = domain;
              }
            }
          }
        }

        // Read customer-specific env file to get CUSTOMER_DOMAIN and other info
        const prodConfigPath = resolve(customerDir, 'production.env');
        if (fs.existsSync(prodConfigPath)) {
          try {
            const prodConfig = this.parseEnvFile(prodConfigPath);
            
            // Use CUSTOMER_DOMAIN (correct field name in real configs)
            if (prodConfig.CUSTOMER_DOMAIN) {
              metadata.customerDomain = prodConfig.CUSTOMER_DOMAIN.replace(/^https?:\/\//, '');
              // If we didn't get domain from wrangler.toml, use this
              if (!metadata.domain) {
                metadata.domain = metadata.customerDomain;
              }
            }
            
            // Also check old DOMAIN field for backward compatibility
            if (!metadata.domain && prodConfig.DOMAIN) {
              metadata.domain = prodConfig.DOMAIN.replace(/^https?:\/\//, '');
            }
            
            // Extract customer ID
            if (prodConfig.CUSTOMER_ID) {
              metadata.customerId = prodConfig.CUSTOMER_ID;
            }
            
          } catch (error) {
            logger.warn(`Could not parse customer env for ${customerName}:`, error.message);
          }
        }

        // Check if secrets exist (we can't read them, but can note they should be set)
        // In a real system, you'd run: wrangler secret list --env production
        // For now, we just note that secrets should be managed separately
        metadata.hasSecrets = true; // Assume secrets are managed via wrangler secret commands

        // Register customer
        this.customers.set(customerName, metadata);

        // Try to register domain config
        try {
          const domainConfig = this.createCustomerDomainConfig(customerName, metadata.domain, {
            skipValidation: true,
            isFrameworkMode: true,
            accountId: metadata.accountId,
            zoneId: metadata.zoneId
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
    if (!fs.existsSync(customersDir)) {
      return [];
    }

    try {
      // Read directory contents
      const items = fs.readdirSync(customersDir);
      return items.filter(item => {
        const itemPath = resolve(customersDir, item);
        return fs.statSync(itemPath).isDirectory() && item !== 'template';
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
    const content = fs.readFileSync(filePath, 'utf8');
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
   * Update wrangler.toml with new configuration
   * @param {string} wranglerPath - Path to wrangler.toml
   * @param {Object} updates - Configuration updates to merge
   * @returns {boolean} Success status
   */
  updateWranglerToml(wranglerPath, updates) {
    try {
      let existingConfig = {};
      
      // Read existing config if file exists
      if (fs.existsSync(wranglerPath)) {
        const content = fs.readFileSync(wranglerPath, 'utf8');
        existingConfig = toml.parse(content);
      }

      // Deep merge updates into existing config
      const mergedConfig = this.deepMergeConfig(existingConfig, updates);

      // Write back to file
      const tomlContent = toml.stringify(mergedConfig);
      fs.writeFileSync(wranglerPath, tomlContent, 'utf8');

      logger.info(`Updated wrangler.toml: ${wranglerPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update wrangler.toml: ${error.message}`);
      return false;
    }
  }

  /**
   * Deep merge two configuration objects
   * @private
   */
  deepMergeConfig(target, source) {
    const output = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        // Recursively merge objects
        output[key] = this.deepMergeConfig(target[key] || {}, source[key]);
      } else {
        // Overwrite arrays and primitives
        output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Create or update environment section in wrangler.toml
   * @param {string} wranglerPath - Path to wrangler.toml
   * @param {string} environment - Environment name (production, staging, development)
   * @param {Object} envConfig - Environment configuration
   * @returns {boolean} Success status
   */
  updateEnvironmentConfig(wranglerPath, environment, envConfig) {
    const updates = {
      env: {
        [environment]: envConfig
      }
    };

    return this.updateWranglerToml(wranglerPath, updates);
  }

  /**
   * Add D1 database binding to environment
   * @param {string} wranglerPath - Path to wrangler.toml
   * @param {string} environment - Environment name
   * @param {Object} databaseConfig - Database configuration
   * @returns {boolean} Success status
   */
  addD1Database(wranglerPath, environment, databaseConfig) {
    try {
      const content = fs.readFileSync(wranglerPath, 'utf8');
      const config = toml.parse(content);

      // Ensure env section exists
      if (!config.env) config.env = {};
      if (!config.env[environment]) config.env[environment] = {};

      // Ensure d1_databases array exists
      if (!config.env[environment].d1_databases) {
        config.env[environment].d1_databases = [];
      }

      // Add or update database
      const existingIndex = config.env[environment].d1_databases.findIndex(
        db => db.binding === databaseConfig.binding
      );

      if (existingIndex >= 0) {
        config.env[environment].d1_databases[existingIndex] = databaseConfig;
      } else {
        config.env[environment].d1_databases.push(databaseConfig);
      }

      // Write back
      fs.writeFileSync(wranglerPath, toml.stringify(config), 'utf8');
      logger.info(`Added D1 database to ${environment} environment`);
      return true;
    } catch (error) {
      logger.error(`Failed to add D1 database: ${error.message}`);
      return false;
    }
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

