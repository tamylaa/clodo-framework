#!/usr/bin/env node

/**
 * Domain Discovery Module
 * Enterprise-grade runtime domain configuration discovery and management
 * 
 * Extracted from dynamic-config-builder.js with enhancements
 */

import { readFile, writeFile, access, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Advanced Domain Discovery Manager
 * Discovers and manages domain configurations across Cloudflare infrastructure
 */
export class DomainDiscovery {
  constructor(options = {}) {
    this.apiToken = options.apiToken;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    
    // Configuration cache and templates
    this.configCache = new Map();
    this.discoveredConfigs = new Map();
    this.templates = new Map();
    
    // Paths for configuration management
    this.configPaths = {
      domains: join(__dirname, '..', '..', 'src', 'config', 'domains.js'),
      runtime: join(__dirname, '..', '..', 'runtime-config'),
      templates: join(__dirname, '..', '..', 'config-templates'),
      cache: join(__dirname, '..', '..', '.config-cache')
    };
  }

  /**
   * Initialize the discovery system asynchronously
   */
  async initialize() {
    // Ensure directories exist
    await this.ensureDirectories();
    await this.initializeDiscovery();
  }

  /**
   * Ensure all required directories exist
   */
  async ensureDirectories() {
    for (const path of Object.values(this.configPaths)) {
      if (path.endsWith('.js')) continue; // Skip files
      try {
        await access(path);
      } catch {
        await mkdir(path, { recursive: true });
      }
    }
  }

  /**
   * Initialize discovery system
   */
  async initializeDiscovery() {
    console.log('🔍 Domain Discovery System v1.0');
    console.log('===============================');
    console.log(`⚙️ API Token: ${this.apiToken ? 'Configured' : 'Not set'}`);
    console.log(`📁 Cache Directory: ${this.configPaths.cache}`);
    console.log(`🔄 Retry Attempts: ${this.retryAttempts}`);
    console.log('');

    // Load cached configurations
    await this.loadConfigCache();
    
    // Load configuration templates
    this.loadConfigTemplates();
  }

  /**
   * Discover complete domain configuration from Cloudflare
   * @param {string} domainName - Domain to discover
   * @param {string} apiToken - Cloudflare API token (optional if set in constructor)
   * @returns {Promise<Object>} Complete domain configuration
   */
  async discoverDomainConfig(domainName, apiToken = null) {
    const token = apiToken || this.apiToken;
    if (!token) {
      throw new Error('Cloudflare API token is required for domain discovery');
    }

    console.log(`🔍 Discovering configuration for ${domainName}...`);

    // Check cache first
    const cacheKey = `${domainName}-${this.getCacheKeyHash(token)}`;
    if (this.configCache.has(cacheKey)) {
      const cached = this.configCache.get(cacheKey);
      const age = Date.now() - cached.timestamp;
      
      // Use cached config if less than 1 hour old
      if (age < 3600000) {
        console.log(`   📋 Using cached configuration (${Math.round(age / 60000)}m old)`);
        return cached.config;
      }
    }

    try {
      // Discovery process
      const discoveredConfig = await this.performDomainDiscovery(domainName, token);
      
      // Cache the result
      this.cacheConfiguration(cacheKey, discoveredConfig);
      
      // Store in discovered configs
      this.discoveredConfigs.set(domainName, discoveredConfig);
      
      console.log(`✅ Configuration discovered for ${domainName}`);
      console.log(`   📊 Account: ${discoveredConfig.accountName}`);
      console.log(`   🌐 Zone: ${discoveredConfig.zoneName}`);
      console.log(`   🆔 Zone ID: ${discoveredConfig.zoneId}`);
      
      return discoveredConfig;

    } catch (error) {
      console.error(`❌ Failed to discover configuration for ${domainName}:`, error.message);
      throw new Error(`Domain discovery failed: ${error.message}`);
    }
  }

  /**
   * Perform the actual domain discovery process
   * @param {string} domainName - Domain name
   * @param {string} apiToken - API token
   * @returns {Promise<Object>} Discovered configuration
   */
  async performDomainDiscovery(domainName, apiToken) {
    // Step 1: Get Cloudflare accounts
    const accounts = await this.fetchCloudflareAccounts(apiToken);
    if (!accounts.length) {
      throw new Error('No Cloudflare accounts found');
    }

    // Use first account or find specific one
    const account = accounts[0];
    console.log(`   ✅ Found account: ${account.name} (${account.id})`);

    // Step 2: Get zones for account
    const zones = await this.fetchAccountZones(account.id, apiToken);
    
    // Step 3: Find zone for domain
    const zone = zones.find(z => z.name === domainName || domainName.endsWith(z.name));
    if (!zone) {
      throw new Error(`No zone found for domain: ${domainName}. Available zones: ${zones.map(z => z.name).join(', ')}`);
    }

    console.log(`   ✅ Found zone: ${zone.name} (${zone.id})`);

    // Step 4: Build comprehensive configuration
    const discoveredConfig = await this.buildDomainConfiguration(domainName, account, zone, apiToken);
    
    return discoveredConfig;
  }

  /**
   * Fetch Cloudflare accounts
   * @param {string} apiToken - API token
   * @returns {Promise<Array>} Account list
   */
  async fetchCloudflareAccounts(apiToken) {
    console.log('   🔍 Fetching Cloudflare accounts...');
    
    const response = await this.makeCloudflareRequest(
      'https://api.cloudflare.com/client/v4/accounts',
      apiToken
    );

    if (!response.success || !response.result.length) {
      throw new Error('No Cloudflare accounts accessible with this token');
    }

    return response.result;
  }

  /**
   * Fetch zones for account
   * @param {string} accountId - Account ID
   * @param {string} apiToken - API token
   * @returns {Promise<Array>} Zone list
   */
  async fetchAccountZones(accountId, apiToken) {
    console.log('   🌐 Fetching account zones...');
    
    const response = await this.makeCloudflareRequest(
      `https://api.cloudflare.com/client/v4/zones?account.id=${accountId}`,
      apiToken
    );

    if (!response.success) {
      throw new Error('Failed to fetch zones for account');
    }

    return response.result;
  }

  /**
   * Build complete domain configuration
   * @param {string} domainName - Domain name
   * @param {Object} account - Cloudflare account
   * @param {Object} zone - Cloudflare zone
   * @param {string} apiToken - API token
   * @returns {Promise<Object>} Complete configuration
   */
  async buildDomainConfiguration(domainName, account, zone, apiToken) {
    const cleanDomainName = domainName.replace('.com', '').replace(/[^a-zA-Z0-9]/g, '');
    
    const config = {
      // Basic domain information
      name: cleanDomainName,
      displayName: this.capitalizeFirst(cleanDomainName),
      fullDomain: domainName,
      
      // Cloudflare infrastructure
      accountId: account.id,
      accountName: account.name,
      zoneId: zone.id,
      zoneName: zone.name,
      
      // Discovery metadata
      discoveredAt: new Date().toISOString(),
      discoveryVersion: '1.0',
      
      // Multi-environment domains
      domains: {
        production: domainName,
        staging: `staging.${domainName}`,
        development: `dev.${domainName}`
      },

      // Service URLs
      services: {
        frontend: {
          production: `https://${domainName}`,
          staging: `https://staging.${domainName}`,
          development: `https://dev.${domainName}`
        },
        api: {
          production: `https://api.${domainName}`,
          staging: `https://api-staging.${domainName}`,
          development: `https://api-dev.${domainName}`
        },
        auth: {
          production: `https://auth.${domainName}`,
          staging: `https://auth-staging.${domainName}`,
          development: `https://auth-dev.${domainName}`
        }
      },

      // CORS configuration
      corsOrigins: {
        production: [`https://${domainName}`, `https://*.${domainName}`],
        staging: [`https://staging.${domainName}`, `https://*.staging.${domainName}`],
        development: [`http://localhost:*`, `https://dev.${domainName}`]
      },

      // Database configuration
      databases: {
        production: { 
          name: `${cleanDomainName}-auth-db`, 
          id: null,
          binding: 'DB'
        },
        staging: { 
          name: `${cleanDomainName}-auth-db-staging`, 
          id: null,
          binding: 'DB'
        },
        development: { 
          name: `${cleanDomainName}-auth-db-local`, 
          id: null,
          binding: 'DB'
        }
      },

      // Worker configuration
      workers: {
        production: {
          name: `${cleanDomainName}-data-service`,
          routes: [`${domainName}/api/*`, `api.${domainName}/*`]
        },
        staging: {
          name: `${cleanDomainName}-data-service-staging`,
          routes: [`staging.${domainName}/api/*`, `api-staging.${domainName}/*`]
        },
        development: {
          name: `${cleanDomainName}-data-service-dev`,
          routes: []
        }
      },

      // Feature flags
      features: {
        magicLinkAuth: true,
        fileStorage: true,
        userProfiles: true,
        logging: true,
        webhooks: true,
        enhancedFramework: true,
        crossDomainAuth: true
      },

      // Application settings
      settings: {
        magicLinkExpiryMinutes: 15,
        rateLimitWindowMs: 900000,
        rateLimitMax: 100,
        maxFileSize: 26214400,
        allowedFileTypes: [
          'image/jpeg', 'image/png', 'image/webp', 'image/gif',
          'application/pdf',
          'video/mp4', 'video/webm',
          'audio/mpeg', 'audio/wav',
          'text/plain', 'application/json'
        ],
        sessionExpiryHours: 24,
        maxConcurrentSessions: 5
      }
    };

    // Discover existing infrastructure if available
    await this.discoverExistingInfrastructure(config, apiToken);
    
    return config;
  }

  /**
   * Discover existing Cloudflare infrastructure for domain
   * @param {Object} config - Configuration to enhance
   * @param {string} apiToken - API token
   */
  async discoverExistingInfrastructure(config, apiToken) {
    try {
      console.log('   🔍 Discovering existing infrastructure...');
      
      // Discover D1 databases
      await this.discoverD1Databases(config, apiToken);
      
      // Discover Workers
      await this.discoverWorkers(config, apiToken);
      
      // Discover KV namespaces (if needed)
      await this.discoverKVNamespaces(config, apiToken);
      
    } catch (error) {
      console.log(`   ⚠️ Infrastructure discovery failed: ${error.message}`);
    }
  }

  /**
   * Discover existing D1 databases
   * @param {Object} config - Configuration object
   * @param {string} apiToken - API token
   */
  async discoverD1Databases(config, apiToken) {
    try {
      const response = await this.makeCloudflareRequest(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database`,
        apiToken
      );

      if (response.success) {
        const databases = response.result;
        
        // Match databases by name
        Object.keys(config.databases).forEach(env => {
          const expectedName = config.databases[env].name;
          const foundDb = databases.find(db => db.name === expectedName);
          
          if (foundDb) {
            config.databases[env].id = foundDb.uuid;
            console.log(`     📋 Found ${env} database: ${foundDb.name}`);
          }
        });
      }
    } catch (error) {
      console.log(`     ⚠️ D1 database discovery failed: ${error.message}`);
    }
  }

  /**
   * Discover existing Workers
   * @param {Object} config - Configuration object  
   * @param {string} apiToken - API token
   */
  async discoverWorkers(config, apiToken) {
    try {
      const response = await this.makeCloudflareRequest(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts`,
        apiToken
      );

      if (response.success) {
        const workers = response.result;
        
        // Match workers by name
        Object.keys(config.workers).forEach(env => {
          const expectedName = config.workers[env].name;
          const foundWorker = workers.find(w => w.id === expectedName);
          
          if (foundWorker) {
            config.workers[env].exists = true;
            config.workers[env].createdAt = foundWorker.created_on;
            console.log(`     ⚡ Found ${env} worker: ${foundWorker.id}`);
          }
        });
      }
    } catch (error) {
      console.log(`     ⚠️ Worker discovery failed: ${error.message}`);
    }
  }

  /**
   * Discover KV namespaces (placeholder for future enhancement)
   * @param {Object} config - Configuration object
   * @param {string} apiToken - API token
   */
  async discoverKVNamespaces(config, apiToken) {
    // Placeholder for KV namespace discovery if needed
    console.log('     🗂️ KV namespace discovery (not implemented)');
  }

  /**
   * Generate domain configuration from template
   * @param {string} domainName - Domain name
   * @param {string} templateName - Template name
   * @returns {Object} Generated configuration
   */
  generateConfigFromTemplate(domainName, templateName = 'standard') {
    console.log(`🏗️ Generating configuration for ${domainName} using template: ${templateName}`);
    
    const template = this.templates.get(templateName) || this.getStandardTemplate();
    const cleanDomainName = domainName.replace('.com', '').replace(/[^a-zA-Z0-9]/g, '');
    
    // Replace template variables
    const configStr = JSON.stringify(template)
      .replace(/{DOMAIN_NAME}/g, domainName)
      .replace(/{CLEAN_DOMAIN_NAME}/g, cleanDomainName)
      .replace(/{DISPLAY_NAME}/g, this.capitalizeFirst(cleanDomainName))
      .replace(/{TIMESTAMP}/g, new Date().toISOString());
    
    const config = JSON.parse(configStr);
    
    console.log(`✅ Configuration generated from template`);
    return config;
  }

  /**
   * Validate domain configuration
   * @param {string} domainName - Domain name
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateDomainConfig(domainName, config) {
    console.log(`🔍 Validating configuration for ${domainName}...`);
    
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!config.accountId) errors.push('Missing Cloudflare account ID');
    if (!config.zoneId) errors.push('Missing Cloudflare zone ID');
    if (!config.domains?.production) errors.push('Missing production domain URL');
    
    // Services validation
    const requiredServices = ['frontend', 'api', 'auth'];
    for (const service of requiredServices) {
      if (!config.services?.[service]?.production) {
        errors.push(`Missing ${service} production URL`);
      }
    }

    // Database validation
    const environments = ['production', 'staging', 'development'];
    environments.forEach(env => {
      if (!config.databases?.[env]?.name) {
        errors.push(`Missing ${env} database name`);
      }
    });

    // Worker validation
    environments.forEach(env => {
      if (!config.workers?.[env]?.name) {
        errors.push(`Missing ${env} worker name`);
      }
    });

    // CORS validation
    if (!config.corsOrigins?.production?.length) {
      warnings.push('No CORS origins configured for production');
    }

    // Feature validation
    if (!config.features) {
      warnings.push('No feature flags configured');
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateConfigScore(config, errors, warnings)
    };

    if (result.valid) {
      console.log(`✅ Configuration validation passed (Score: ${result.score}/100)`);
    } else {
      console.log(`❌ Configuration validation failed (${errors.length} errors, ${warnings.length} warnings)`);
    }

    return result;
  }

  /**
   * Calculate configuration quality score
   * @param {Object} config - Configuration
   * @param {Array} errors - Validation errors
   * @param {Array} warnings - Validation warnings
   * @returns {number} Quality score (0-100)
   */
  calculateConfigScore(config, errors, warnings) {
    let score = 100;
    
    // Deduct for errors and warnings
    score -= errors.length * 20;
    score -= warnings.length * 5;
    
    // Bonus for completeness
    if (config.databases?.production?.id) score += 5;
    if (config.workers?.production?.exists) score += 5;
    if (config.features && Object.keys(config.features).length > 5) score += 5;
    if (config.settings && Object.keys(config.settings).length > 5) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Utility methods

  async makeCloudflareRequest(url, apiToken) {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
        
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        console.log(`   ⚠️ Request attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async cacheConfiguration(key, config) {
    this.configCache.set(key, {
      config,
      timestamp: Date.now()
    });
    
    // Save to disk cache
    const cacheFile = join(this.configPaths.cache, `${key}.json`);
    await writeFile(cacheFile, JSON.stringify({
      config,
      timestamp: Date.now()
    }, null, 2));
  }

  async loadConfigCache() {
    try {
      await access(this.configPaths.cache);
    } catch {
      return;
    }
    
    const files = await readdir(this.configPaths.cache);
    let loaded = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(await readFile(join(this.configPaths.cache, file), 'utf8'));
          const key = file.replace('.json', '');
          this.configCache.set(key, content);
          loaded++;
        } catch (error) {
          console.warn(`⚠️ Failed to load cache file ${file}`);
        }
      }
    }
    
    if (loaded > 0) {
      console.log(`📋 Loaded ${loaded} cached configurations`);
    }
  }

  loadConfigTemplates() {
    // Load standard template
    this.templates.set('standard', this.getStandardTemplate());
    
    // TODO: Load custom templates from templates directory
    console.log(`📋 Loaded ${this.templates.size} configuration templates`);
  }

  getStandardTemplate() {
    return {
      name: '{CLEAN_DOMAIN_NAME}',
      displayName: '{DISPLAY_NAME}',
      fullDomain: '{DOMAIN_NAME}',
      templateVersion: '1.0',
      generatedAt: '{TIMESTAMP}'
    };
  }

  getCacheKeyHash(token) {
    // Simple hash of token for cache key (first 8 chars)
    return token.substring(0, 8);
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default DomainDiscovery;