// Simple inline logger to avoid circular dependency with index.js
const logger = {
  info: (message, ...args) => console.log(`[DomainConfig] ${message}`, ...args),
  error: (message, ...args) => console.error(`[DomainConfig] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[DomainConfig] ${message}`, ...args),
  debug: (message, ...args) => console.debug(`[DomainConfig] ${message}`, ...args)
};

/**
 * Creates a base domain configuration schema
 * @returns {Object} Base domain configuration template
 */
export const createDomainConfigSchema = () => ({
  name: '',
  displayName: '',
  accountId: '',
  zoneId: '',
  domains: {
    production: '',
    staging: '',
    development: ''
  },
  services: {},
  databases: {},
  features: {},
  settings: {
    environment: 'development',
    logLevel: 'info',
    corsOrigins: ['*']
  }
});

/**
 * Validates a domain configuration object
 * @param {Object} config - Domain configuration to validate
 * @throws {Error} If validation fails
 */
export const validateDomainConfig = (config) => {
  try {
    // Required top-level fields
    validateRequired(config, ['name', 'accountId', 'zoneId']);

    // Validate Cloudflare IDs format (basic check)
    if (!/^[a-f0-9]{32}$/.test(config.accountId)) {
      throw new Error('accountId must be a valid Cloudflare account ID (32 hex characters)');
    }

    if (!/^[a-f0-9]{32}$/.test(config.zoneId)) {
      throw new Error('zoneId must be a valid Cloudflare zone ID (32 hex characters)');
    }

    // Validate domains structure
    if (!config.domains || typeof config.domains !== 'object') {
      throw new Error('domains must be an object with production/staging/development keys');
    }

    // At least one domain should be configured
    const hasDomain = Object.values(config.domains).some(domain => domain && domain.trim());
    if (!hasDomain) {
      throw new Error('At least one domain (production, staging, or development) must be configured');
    }

    // Validate domain formats (basic URL validation)
    Object.entries(config.domains).forEach(([env, domain]) => {
      if (domain && domain.trim()) {
        try {
          new URL(`https://${domain}`);
        } catch {
          throw new Error(`Invalid domain format for ${env}: ${domain}`);
        }
      }
    });

    logger.info(`Domain configuration validated: ${config.name}`);
  } catch (error) {
    logger.error(`Domain configuration validation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Merges base domain config with service-specific extensions
 * @param {Object} baseConfig - Base domain configuration
 * @param {Object} serviceConfig - Service-specific configuration extensions
 * @returns {Object} Merged configuration
 */
export const mergeDomainConfigs = (baseConfig, serviceConfig) => {
  if (!baseConfig || !serviceConfig) {
    throw new Error('Both baseConfig and serviceConfig are required for merging');
  }

  const merged = deepMerge(baseConfig, serviceConfig);

  // Validate the merged configuration
  validateDomainConfig(merged);

  logger.info(`Domain configurations merged: ${baseConfig.name}`);
  return merged;
};

/**
 * Creates a domain configuration registry
 * @param {Object} domainConfigs - Object containing domain configurations
 * @returns {Object} Domain registry with lookup methods
 */
export const createDomainRegistry = (domainConfigs) => {
  const registry = { ...domainConfigs };

  return {
    get: (domainName) => {
      const config = registry[domainName];
      if (!config) {
        throw new Error(`Domain not found: ${domainName}`);
      }
      return config;
    },

    list: () => Object.keys(registry),

    validateAll: () => {
      Object.values(registry).forEach(validateDomainConfig);
      logger.info(`All ${Object.keys(registry).length} domain configurations validated`);
    },

    add: (domainName, config) => {
      validateDomainConfig(config);
      registry[domainName] = config;
      logger.info(`Domain added to registry: ${domainName}`);
    },

    remove: (domainName) => {
      if (!registry[domainName]) {
        throw new Error(`Domain not found: ${domainName}`);
      }
      delete registry[domainName];
      logger.info(`Domain removed from registry: ${domainName}`);
    }
  };
};

/**
 * Gets domain configuration from environment variables
 * @param {Object} env - Environment variables
 * @param {Object} domainConfigs - Available domain configurations
 * @returns {Object} Domain configuration for current environment
 */
export const getDomainFromEnv = (env, domainConfigs) => {
  const domainName = env.DOMAIN_NAME || env.CF_DOMAIN_NAME || 'default';

  if (!domainConfigs[domainName]) {
    logger.warn(`Domain not found: ${domainName}, using default`);
    return domainConfigs.default || Object.values(domainConfigs)[0];
  }

  return domainConfigs[domainName];
};

/**
 * Creates environment-specific configuration overrides
 * @param {Object} baseConfig - Base domain configuration
 * @param {string} environment - Target environment (production, staging, development)
 * @returns {Object} Environment-specific configuration
 */
export const createEnvironmentConfig = (baseConfig, environment = 'development') => {
  const envConfig = { ...baseConfig };

  // Set environment-specific settings
  envConfig.settings = {
    ...envConfig.settings,
    environment,
    isProduction: environment === 'production',
    isStaging: environment === 'staging',
    isDevelopment: environment === 'development'
  };

  // Environment-specific domain selection
  if (envConfig.domains[environment]) {
    envConfig.currentDomain = envConfig.domains[environment];
  }

  // Environment-specific feature overrides
  if (environment === 'production') {
    // Ensure critical features are enabled in production
    envConfig.features = {
      ...envConfig.features,
      errorReporting: true,
      monitoring: true
    };
  }

  logger.info(`Environment config created for ${baseConfig.name} (${environment})`);
  return envConfig;
};