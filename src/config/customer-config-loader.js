/**
 * CustomerConfigLoader - Reusable Utility for Loading Customer Configurations
 * 
 * This utility:
 * 1. Loads existing customer configs from config/customers/{customer}/{env}.env
 * 2. Provides defaults that can be merged with InputCollector results
 * 3. Works for both service creation and deployment
 * 
 * PATTERN: Separation of Concerns
 * - InputCollector: Collects user inputs (pure, reusable)
 * - CustomerConfigLoader: Loads stored configs (pure, reusable)
 * - ServiceOrchestrator/DeploymentOrchestrator: Uses both to orchestrate workflows
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getDirname } from '../utils/esm-helper.js';
import { createLogger } from '../utils/index.js';
import chalk from 'chalk';

const __dirname = getDirname(import.meta.url, 'src/config');
const logger = createLogger('CustomerConfigLoader');

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const result = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      return;
    }
    
    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
  });
  
  return result;
}

/**
 * Check if config is a template (not real data)
 */
function isTemplateConfig(envVars) {
  return (
    envVars.CUSTOMER_NAME?.includes('{{') ||
    envVars.CLOUDFLARE_ACCOUNT_ID === '00000000000000000000000000000000' ||
    !envVars.CLOUDFLARE_ACCOUNT_ID ||
    !envVars.DOMAIN
  );
}

/**
 * CustomerConfigLoader - Load and parse customer configurations
 */
export class CustomerConfigLoader {
  constructor(options = {}) {
    this.configDir = options.configDir || resolve(__dirname, '..', '..', 'config', 'customers');
  }

  /**
   * Load customer configuration if it exists
   * Returns null if not found or is a template
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment (development, staging, production)
   * @returns {Object|null} - Parsed config or null
   */
  loadConfig(customer, environment) {
    const configPath = resolve(this.configDir, customer, `${environment}.env`);
    
    if (!existsSync(configPath)) {
      logger.debug('Config file not found', { customer, environment, configPath });
      return null;
    }
    
    try {
      const envVars = parseEnvFile(configPath);
      
      // Check if it's a template
      if (isTemplateConfig(envVars)) {
        logger.debug('Config is a template, treating as non-existent', { customer, environment });
        return null;
      }
      
      logger.info('Loaded customer config', { customer, environment });
      
      return {
        customer,
        environment,
        configPath,
        raw: envVars,
        parsed: this.parseToStandardFormat(envVars, customer, environment)
      };
    } catch (error) {
      logger.error('Failed to load config', { customer, environment, error: error.message });
      return null;
    }
  }

  /**
   * Parse env vars into standard format that matches InputCollector output
   * This ensures compatibility between stored configs and collected inputs
   */
  parseToStandardFormat(envVars, customer, environment) {
    return {
      // Core inputs (Tier 1) - matches InputCollector.collectCoreInputs()
      serviceName: envVars.SERVICE_NAME || customer,
      serviceType: envVars.SERVICE_TYPE || 'generic',
      domainName: envVars.DOMAIN || envVars.CUSTOMER_DOMAIN,
      cloudflareToken: envVars.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN,
      cloudflareAccountId: envVars.CLOUDFLARE_ACCOUNT_ID,
      cloudflareZoneId: envVars.CLOUDFLARE_ZONE_ID,
      environment: environment,
      
      // Additional metadata
      customer: customer,
      
      // Deployment-specific (Tier 2 confirmations)
      workerName: envVars.WORKER_NAME,
      databaseName: envVars.DATABASE_NAME || envVars.D1_DATABASE_NAME,
      deploymentUrl: envVars.DEPLOYMENT_URL || envVars.API_DOMAIN,
      healthCheckPath: envVars.HEALTH_CHECK_PATH || '/health',
      apiBasePath: envVars.API_BASE_PATH || '/api/v1',
      logLevel: envVars.LOG_LEVEL || 'info',
      nodeCompatibility: envVars.NODE_COMPATIBILITY || 'v18',
      
      // All raw env vars for other use cases
      envVars: envVars
    };
  }

  /**
   * Load config or return empty defaults
   * Never throws - always returns an object
   */
  loadConfigSafe(customer, environment) {
    const config = this.loadConfig(customer, environment);
    
    if (config) {
      return config.parsed;
    }
    
    // Return defaults if no config found
    return {
      customer,
      environment,
      serviceName: customer,
      serviceType: 'generic',
      domainName: '',
      cloudflareToken: process.env.CLOUDFLARE_API_TOKEN || '',
      cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      envVars: {}
    };
  }

  /**
   * Check if customer config exists (and is not a template)
   */
  hasConfig(customer, environment) {
    return this.loadConfig(customer, environment) !== null;
  }

  /**
   * Display loaded config for user review
   */
  displayConfig(config, options = {}) {
    const { showSecrets = false } = options;
    
    console.log(chalk.cyan('\n📋 Loaded Customer Configuration'));
    console.log(chalk.gray('─'.repeat(60)));
    
    console.log(chalk.white(`Customer:     ${config.customer}`));
    console.log(chalk.white(`Environment:  ${config.environment}`));
    console.log(chalk.white(`Domain:       ${config.domainName}`));
    
    if (showSecrets) {
      console.log(chalk.white(`Account ID:   ${config.cloudflareAccountId}`));
      console.log(chalk.white(`Zone ID:      ${config.cloudflareZoneId}`));
    } else {
      console.log(chalk.white(`Account ID:   ${config.cloudflareAccountId?.substring(0, 8)}...`));
      console.log(chalk.white(`Zone ID:      ${config.cloudflareZoneId?.substring(0, 8)}...`));
    }
    
    if (config.workerName) {
      console.log(chalk.white(`Worker:       ${config.workerName}`));
    }
    
    if (config.databaseName) {
      console.log(chalk.white(`Database:     ${config.databaseName}`));
    }
    
    if (config.deploymentUrl) {
      console.log(chalk.white(`URL:          ${config.deploymentUrl}`));
    }
    
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Merge loaded config with collected inputs
   * Collected inputs take precedence over stored config
   * 
   * @param {Object} storedConfig - Config from file
   * @param {Object} collectedInputs - Inputs from InputCollector
   * @returns {Object} - Merged configuration
   */
  mergeConfigs(storedConfig, collectedInputs) {
    return {
      ...storedConfig,
      ...collectedInputs,
      // Track source of each value
      _sources: {
        storedConfig: Object.keys(storedConfig),
        collectedInputs: Object.keys(collectedInputs)
      }
    };
  }

  /**
   * Get missing fields that need to be collected
   * Compares stored config against required fields
   */
  getMissingFields(config, requiredFields = []) {
    if (!requiredFields.length) {
      // Default required fields for deployment
      requiredFields = [
        'customer',
        'environment',
        'domainName',
        'cloudflareToken',
        'cloudflareAccountId',
        'cloudflareZoneId'
      ];
    }
    
    return requiredFields.filter(field => !config[field] || config[field] === '');
  }
}

/**
 * Factory function for convenience
 */
export function createCustomerConfigLoader(options = {}) {
  return new CustomerConfigLoader(options);
}
