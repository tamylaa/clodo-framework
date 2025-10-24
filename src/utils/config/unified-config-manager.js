#!/usr/bin/env node

/**
 * Unified Configuration Manager
 * Single source of truth for customer .env configuration operations
 * 
 * Consolidates functionality from:
 * - CustomerConfigLoader (loading configs)
 * - ConfigPersistenceManager (saving configs)
 * 
 * Eliminates duplicate .env parsing and provides clean, unified API
 * 
 * @module UnifiedConfigManager
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { getDirname } from '../esm-helper.js';

const __dirname = getDirname(import.meta.url, 'src/utils/config');

// Simple inline logger to avoid circular dependency with index.js
const logger = {
  info: (message, ...args) => console.log(`[UnifiedConfigManager] ${message}`, ...args),
  error: (message, ...args) => console.error(`[UnifiedConfigManager] ${message}`, ...args)
};

/**
 * UnifiedConfigManager
 * Manages customer configuration loading, saving, and operations
 */
export class UnifiedConfigManager {
  constructor(options = {}) {
    this.configDir = options.configDir || resolve(__dirname, '..', '..', '..', 'config', 'customers');
    this.verbose = options.verbose || false;
  }

  /**
   * Load customer configuration from .env file
   * Returns null if not found or is a template
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment (development, staging, production)
   * @returns {Object|null} - Parsed config or null
   */
  loadCustomerConfig(customer, environment) {
    const configPath = resolve(this.configDir, customer, `${environment}.env`);
    
    if (!existsSync(configPath)) {
      if (this.verbose) {
        logger.info(`Config not found: ${configPath}`);
      }
      return null;
    }
    
    try {
      const envVars = this._parseEnvFile(configPath);
      
      // Check if this is a template (not real data)
      if (this.isTemplateConfig(envVars)) {
        if (this.verbose) {
          logger.info(`Skipping template config for ${customer}/${environment}`);
        }
        return null;
      }
      
      // Convert to standard format
      return this.parseToStandardFormat(envVars, customer, environment);
    } catch (error) {
      logger.error(`Failed to load config for ${customer}/${environment}:`, error.message);
      return null;
    }
  }

  /**
   * Load customer config safely - never throws, always returns object
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @returns {Object} - Parsed config or defaults
   */
  loadCustomerConfigSafe(customer, environment) {
    const config = this.loadCustomerConfig(customer, environment);
    
    if (!config) {
      // Return minimal defaults
      return {
        customer: customer,
        environment: environment,
        serviceName: customer,
        serviceType: 'generic',
        domainName: null,
        cloudflareToken: process.env.CLOUDFLARE_API_TOKEN || null,
        cloudflareAccountId: null,
        cloudflareZoneId: null,
        envVars: {}
      };
    }
    
    return config;
  }

  /**
   * Parse env vars into standard format matching InputCollector output
   * Ensures compatibility between stored configs and collected inputs
   * 
   * @param {Object} envVars - Environment variables from .env file
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @returns {Object} - Standardized configuration object
   */
  parseToStandardFormat(envVars, customer, environment) {
    return {
      customer: customer,
      serviceName: envVars.SERVICE_NAME || customer,
      serviceType: envVars.SERVICE_TYPE || 'generic',
      domainName: envVars.DOMAIN || envVars.CUSTOMER_DOMAIN,
      cloudflareToken: envVars.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN,
      cloudflareAccountId: envVars.CLOUDFLARE_ACCOUNT_ID,
      cloudflareZoneId: envVars.CLOUDFLARE_ZONE_ID,
      environment: environment,
      
      // Additional fields
      displayName: envVars.DISPLAY_NAME || customer,
      description: envVars.DESCRIPTION,
      workerName: envVars.WORKER_NAME,
      databaseName: envVars.DATABASE_NAME || envVars.D1_DATABASE_NAME,
      deploymentUrl: envVars.DEPLOYMENT_URL || envVars.API_DOMAIN,
      healthCheckPath: envVars.HEALTH_CHECK_PATH || '/health',
      apiBasePath: envVars.API_BASE_PATH || '/api/v1',
      logLevel: envVars.LOG_LEVEL || 'info',
      nodeCompatibility: envVars.NODE_COMPATIBILITY || 'v18',
      
      // Keep raw env vars for access
      envVars: envVars
    };
  }

  /**
   * Save deployment configuration to customer .env file
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @param {Object} deploymentData - Complete deployment data
   * @param {Object} deploymentData.coreInputs - Tier 1 core inputs
   * @param {Object} deploymentData.confirmations - Tier 2 confirmations
   * @param {Object} deploymentData.result - Deployment result (optional)
   * @returns {string} - Path to saved file
   */
  async saveCustomerConfig(customer, environment, deploymentData) {
    if (!customer || !environment) {
      throw new Error('Customer and environment are required');
    }

    // Create customer directory if it doesn't exist
    const customerDir = join(this.configDir, customer);
    if (!existsSync(customerDir)) {
      mkdirSync(customerDir, { recursive: true });
      logger.info(`Created customer directory: ${customerDir}`);
    }

    // Generate .env file content
    const envContent = this._generateEnvContent({
      customer,
      environment,
      ...deploymentData
    });

    // Write to customer environment file
    const envFile = join(customerDir, `${environment}.env`);
    writeFileSync(envFile, envContent, 'utf8');

    logger.info(`Configuration saved: ${envFile}`);

    return envFile;
  }

  /**
   * List all configured customers
   * 
   * @returns {Array<string>} - List of customer names
   */
  listCustomers() {
    if (!existsSync(this.configDir)) {
      return [];
    }

    const entries = readdirSync(this.configDir);
    
    // Filter to only directories
    const customers = entries.filter(entry => {
      const fullPath = join(this.configDir, entry);
      return statSync(fullPath).isDirectory();
    });

    return customers.sort();
  }

  /**
   * Display customer configuration for review
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   */
  displayCustomerConfig(customer, environment) {
    const config = this.loadCustomerConfig(customer, environment);
    
    if (!config) {
      console.log(`\n⚠️  No configuration found for ${customer}/${environment}`);
      return;
    }

    console.log(`\n📋 Configuration for ${customer} (${environment})`);
    console.log('='.repeat(60));
    
    console.log('\n🏢 Customer Identity:');
    console.log(`   Customer: ${config.customer}`);
    console.log(`   Service Name: ${config.serviceName}`);
    console.log(`   Service Type: ${config.serviceType}`);
    
    if (config.domainName) {
      console.log('\n🌐 Domain Configuration:');
      console.log(`   Domain: ${config.domainName}`);
      console.log(`   Deployment URL: ${config.deploymentUrl || 'Not set'}`);
    }
    
    if (config.cloudflareAccountId) {
      console.log('\n☁️  Cloudflare Configuration:');
      console.log(`   Account ID: ${config.cloudflareAccountId}`);
      console.log(`   Zone ID: ${config.cloudflareZoneId || 'Not set'}`);
    }
    
    if (config.databaseName) {
      console.log('\n🗄️  Database Configuration:');
      console.log(`   Database: ${config.databaseName}`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Check if configuration is a template (not real data)
   * 
   * @param {Object} envVars - Environment variables
   * @returns {boolean} - True if template
   */
  isTemplateConfig(envVars) {
    return (
      envVars.CUSTOMER_NAME?.includes('{{') ||
      envVars.CLOUDFLARE_ACCOUNT_ID === '00000000000000000000000000000000' ||
      !envVars.CLOUDFLARE_ACCOUNT_ID ||
      !envVars.DOMAIN
    );
  }

  /**
   * Check if customer configuration exists
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @returns {boolean} - True if exists
   */
  configExists(customer, environment) {
    const configPath = resolve(this.configDir, customer, `${environment}.env`);
    return existsSync(configPath);
  }

  /**
   * Get missing fields from configuration
   * 
   * @param {Object} config - Configuration object
   * @param {Array<string>} requiredFields - Required field names
   * @returns {Array<string>} - Missing field names
   */
  getMissingFields(config, requiredFields = []) {
    const missing = [];
    
    for (const field of requiredFields) {
      if (!config[field] || config[field] === null || config[field] === '') {
        missing.push(field);
      }
    }
    
    return missing;
  }

  /**
   * Validate static-site specific configuration
   * 
   * @param {Object} config - Configuration object
   * @returns {Object} - Validation result {valid: boolean, errors: Array<string>}
   */
  validateStaticSiteConfig(config) {
    const errors = [];
    
    if (config.serviceType !== 'static-site') {
      errors.push('Service type must be "static-site"');
    }
    
    // Domain is required for static sites
    if (!config.domainName) {
      errors.push('Domain name is required for static-site services');
    }
    
    // Cloudflare config is required for deployment
    if (!config.cloudflareAccountId) {
      errors.push('Cloudflare Account ID is required for static-site deployment');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get static-site specific configuration defaults
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @returns {Object} - Static-site defaults
   */
  getStaticSiteDefaults(customer, environment) {
    return {
      publicDir: 'public',
      indexFile: 'index.html',
      errorFile: '404.html',
      cacheControl: 'public, max-age=31536000, immutable',
      spaFallback: true,
      cleanUrls: true,
      compressText: true,
      corsEnabled: true,
      siteConfig: {
        bucket: './public',
        include: ['**/*'],
        exclude: [
          'node_modules/**',
          '.git/**',
          '.DS_Store',
          '*.log',
          'wrangler.toml',
          'package.json',
          'package-lock.json'
        ]
      }
    };
  }

  /**
   * Load static-site configuration with defaults applied
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @returns {Object} - Static-site configuration with defaults
   */
  loadStaticSiteConfig(customer, environment) {
    const baseConfig = this.loadCustomerConfigSafe(customer, environment);
    
    // Validate it's a static-site service
    if (baseConfig.serviceType !== 'static-site') {
      throw new Error(`Service type for ${customer}/${environment} is not 'static-site' (found: ${baseConfig.serviceType})`);
    }
    
    // Get defaults and merge
    const defaults = this.getStaticSiteDefaults(customer, environment);
    
    return {
      ...baseConfig,
      ...defaults,
      // Override with any custom static-site settings from env vars
      publicDir: baseConfig.envVars.PUBLIC_DIR || defaults.publicDir,
      indexFile: baseConfig.envVars.INDEX_FILE || defaults.indexFile,
      errorFile: baseConfig.envVars.ERROR_FILE || defaults.errorFile,
      cacheControl: baseConfig.envVars.CACHE_CONTROL || defaults.cacheControl,
      spaFallback: baseConfig.envVars.SPA_FALLBACK !== 'false', // Default true
      cleanUrls: baseConfig.envVars.CLEAN_URLS !== 'false', // Default true
      compressText: baseConfig.envVars.COMPRESS_TEXT !== 'false', // Default true
      corsEnabled: baseConfig.envVars.CORS_ENABLED !== 'false' // Default true
    };
  }

  /**
   * Save static-site specific configuration
   * 
   * @param {string} customer - Customer name
   * @param {string} environment - Environment
   * @param {Object} staticSiteConfig - Static-site specific configuration
   * @returns {string} - Path to saved file
   */
  async saveStaticSiteConfig(customer, environment, staticSiteConfig) {
    // Validate the configuration
    const validation = this.validateStaticSiteConfig(staticSiteConfig);
    if (!validation.valid) {
      throw new Error(`Invalid static-site configuration: ${validation.errors.join(', ')}`);
    }
    
    // Prepare deployment data for base save method
    const deploymentData = {
      coreInputs: {
        serviceName: staticSiteConfig.serviceName || customer,
        serviceType: 'static-site',
        domainName: staticSiteConfig.domainName,
        cloudflareAccountId: staticSiteConfig.cloudflareAccountId,
        cloudflareZoneId: staticSiteConfig.cloudflareZoneId,
        cloudflareToken: staticSiteConfig.cloudflareToken
      },
      confirmations: {
        displayName: staticSiteConfig.displayName || customer,
        description: staticSiteConfig.description || 'Static site service',
        healthCheckPath: '/health',
        apiBasePath: '/', // Static sites serve from root
        logLevel: staticSiteConfig.logLevel || 'info',
        nodeCompatibility: staticSiteConfig.nodeCompatibility || 'v18'
      }
    };
    
    // Save base configuration
    const configPath = await this.saveCustomerConfig(customer, environment, deploymentData);
    
    // Add static-site specific environment variables
    const staticSiteEnvVars = [
      '',
      '# ============================================',
      '# Static-Site Configuration',
      '# ============================================',
      `PUBLIC_DIR=${staticSiteConfig.publicDir || 'public'}`,
      `INDEX_FILE=${staticSiteConfig.indexFile || 'index.html'}`,
      `ERROR_FILE=${staticSiteConfig.errorFile || '404.html'}`,
      `CACHE_CONTROL=${staticSiteConfig.cacheControl || 'public, max-age=31536000, immutable'}`,
      `SPA_FALLBACK=${staticSiteConfig.spaFallback !== false ? 'true' : 'false'}`,
      `CLEAN_URLS=${staticSiteConfig.cleanUrls !== false ? 'true' : 'false'}`,
      `COMPRESS_TEXT=${staticSiteConfig.compressText !== false ? 'true' : 'false'}`,
      `CORS_ENABLED=${staticSiteConfig.corsEnabled !== false ? 'true' : 'false'}`,
      ''
    ].join('\n');
    
    // Append to the config file
    const existingContent = readFileSync(configPath, 'utf-8');
    writeFileSync(configPath, existingContent + staticSiteEnvVars, 'utf8');
    
    logger.info(`Static-site configuration saved: ${configPath}`);
    
    return configPath;
  }

  /**
   * Parse .env file into key-value pairs
   * PRIVATE - Consolidated implementation from both old managers
   * 
   * @param {string} filePath - Path to .env file
   * @returns {Object} - Parsed environment variables
   */
  _parseEnvFile(filePath) {
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
   * Generate .env file content from deployment data
   * PRIVATE - From ConfigPersistenceManager
   * 
   * @param {Object} data - Deployment data
   * @returns {string} - .env file content
   */
  _generateEnvContent(data) {
    const { customer, environment, coreInputs = {}, confirmations = {}, result = {} } = data;
    const timestamp = new Date().toISOString();

    const lines = [
      `# Deployment Configuration - ${customer} (${environment})`,
      `# Last Updated: ${timestamp}`,
      `# Auto-generated by Clodo Framework deployment`,
      '',
      '# ============================================',
      '# Core Customer Identity',
      '# ============================================',
      `CUSTOMER_ID=${customer}`,
      `CUSTOMER_NAME=${customer}`,
      `ENVIRONMENT=${environment}`,
      ''
    ];

    // Cloudflare Configuration
    if (coreInputs.cloudflareAccountId || coreInputs.cloudflareZoneId) {
      lines.push('# ============================================');
      lines.push('# Cloudflare Configuration');
      lines.push('# ============================================');
      
      if (coreInputs.cloudflareAccountId) {
        lines.push(`CLOUDFLARE_ACCOUNT_ID=${coreInputs.cloudflareAccountId}`);
      }
      if (coreInputs.cloudflareZoneId) {
        lines.push(`CLOUDFLARE_ZONE_ID=${coreInputs.cloudflareZoneId}`);
      }
      if (coreInputs.cloudflareToken) {
        lines.push(`CLOUDFLARE_API_TOKEN=${coreInputs.cloudflareToken}`);
      }
      lines.push('');
    }

    // Service Configuration
    lines.push('# ============================================');
    lines.push('# Service Configuration');
    lines.push('# ============================================');
    
    if (coreInputs.serviceName) {
      lines.push(`SERVICE_NAME=${coreInputs.serviceName}`);
    }
    if (coreInputs.serviceType) {
      lines.push(`SERVICE_TYPE=${coreInputs.serviceType}`);
    }
    if (confirmations.displayName) {
      lines.push(`DISPLAY_NAME=${confirmations.displayName}`);
    }
    if (confirmations.description) {
      lines.push(`DESCRIPTION=${confirmations.description}`);
    }
    lines.push('');

    // Domain Configuration
    if (coreInputs.domainName || confirmations.deploymentUrl) {
      lines.push('# ============================================');
      lines.push('# Domain Configuration');
      lines.push('# ============================================');
      
      if (coreInputs.domainName) {
        lines.push(`DOMAIN=${coreInputs.domainName}`);
        lines.push(`CUSTOMER_DOMAIN=${coreInputs.domainName}`);
      }
      if (confirmations.deploymentUrl) {
        lines.push(`DEPLOYMENT_URL=${confirmations.deploymentUrl}`);
        lines.push(`API_DOMAIN=${confirmations.deploymentUrl}`);
      }
      lines.push('');
    }

    // Database Configuration
    if (result.databaseName || confirmations.databaseName) {
      lines.push('# ============================================');
      lines.push('# Database Configuration');
      lines.push('# ============================================');
      
      const dbName = result.databaseName || confirmations.databaseName;
      lines.push(`DATABASE_NAME=${dbName}`);
      lines.push(`D1_DATABASE_NAME=${dbName}`);
      
      if (result.databaseId) {
        lines.push(`D1_DATABASE_ID=${result.databaseId}`);
      }
      lines.push('');
    }

    // Worker Configuration
    if (confirmations.workerName || result.workerUrl) {
      lines.push('# ============================================');
      lines.push('# Worker Configuration');
      lines.push('# ============================================');
      
      if (confirmations.workerName) {
        lines.push(`WORKER_NAME=${confirmations.workerName}`);
      }
      if (result.workerUrl) {
        lines.push(`WORKER_URL=${result.workerUrl}`);
      }
      lines.push('');
    }

    // Deployment Result
    if (result.url || result.deploymentId) {
      lines.push('# ============================================');
      lines.push('# Deployment Information');
      lines.push('# ============================================');
      
      if (result.url) {
        lines.push(`DEPLOYMENT_URL=${result.url}`);
      }
      if (result.deploymentId) {
        lines.push(`DEPLOYMENT_ID=${result.deploymentId}`);
      }
      if (result.timestamp) {
        lines.push(`DEPLOYED_AT=${result.timestamp}`);
      }
      lines.push('');
    }

    // Additional Configuration
    lines.push('# ============================================');
    lines.push('# Additional Configuration');
    lines.push('# ============================================');
    lines.push(`HEALTH_CHECK_PATH=${confirmations.healthCheckPath || '/health'}`);
    lines.push(`API_BASE_PATH=${confirmations.apiBasePath || '/api/v1'}`);
    lines.push(`LOG_LEVEL=${confirmations.logLevel || 'info'}`);
    lines.push(`NODE_COMPATIBILITY=${confirmations.nodeCompatibility || 'v18'}`);
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * Factory function for convenience
 */
export function createUnifiedConfigManager(options = {}) {
  return new UnifiedConfigManager(options);
}

// Export singleton instance for convenience
export const unifiedConfigManager = new UnifiedConfigManager();
