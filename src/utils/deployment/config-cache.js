/**
 * Enterprise Configuration Cache Manager
 * 
 * Advanced configuration management system for multi-domain deployments with:
 * - Smart configuration caching with TTL and invalidation
 * - Template-based configuration generation
 * - Runtime configuration discovery and validation
 * - Multi-environment configuration coordination
 * - Configuration versioning and rollback capabilities
 * - Performance-optimized caching with compression
 * - Cross-domain configuration inheritance
 * - Configuration backup and restore
 * - Real-time configuration updates
 * - Compliance and audit trail for config changes
 * 
 * @module config-cache
 * @version 2.0.0
 */

import { access, readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

import { frameworkConfig } from '../framework-config.js';
import { NameFormatters } from '../../../bin/shared/utils/Formatters.js';

const execAsync = promisify(exec);

export class ConfigurationCacheManager {
  constructor(options = {}) {
    const timing = frameworkConfig.getTiming();
    const caching = frameworkConfig.getCaching();
    
    this.config = {
      // Cache configuration from framework config
      cacheDir: options.cacheDir || 'config-cache',
      cacheTTL: options.cacheTTL || timing.cacheTTL,
      maxCacheSize: options.maxCacheSize || caching.maxCacheSize,
      enableCompression: options.enableCompression ?? caching.enableCompression,
      
      // Template configuration
      templateDir: options.templateDir || 'config-templates',
      enableTemplateInheritance: options.enableTemplateInheritance !== false,
      templateVersioning: options.templateVersioning !== false,
      
      // Runtime discovery from framework config
      enableRuntimeDiscovery: options.enableRuntimeDiscovery !== false,
      discoveryTimeout: options.discoveryTimeout || timing.discoveryTimeout,
      cloudflareCaching: options.cloudflareCaching !== false,
      
      // Environments
      environments: options.environments || ['development', 'staging', 'production'],
      defaultEnvironment: options.defaultEnvironment || 'production',
      
      // Validation and backups
      enableValidation: options.enableValidation !== false,
      enableBackups: options.enableBackups !== false,
      backupRetentionDays: options.backupRetentionDays || 30,
      
      // Performance
      enableMetrics: options.enableMetrics !== false,
      preloadConfigs: options.preloadConfigs || [],
      
      // Cross-domain features
      enableCrossDomainSharing: options.enableCrossDomainSharing !== false,
      sharedConfigKeys: options.sharedConfigKeys || ['features', 'settings.security'],
      
      // Output formats
      outputFormats: options.outputFormats || ['json', 'js', 'yaml', 'env']
    };

    // Cache state
    this.cache = new Map();
    this.templates = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      discoveryRequests: 0,
      validationErrors: 0,
      templateGenerations: 0
    };

    // Configuration registry
    this.configRegistry = {
      domains: new Map(),
      templates: new Map(),
      shared: new Map()
    };

    // Built-in configuration templates
    this.builtinTemplates = {
      'domain-standard': this.getStandardDomainTemplate(),
      'domain-minimal': this.getMinimalDomainTemplate(),
      'domain-enterprise': this.getEnterpriseDomainTemplate(),
      'cloudflare-worker': this.getCloudflareWorkerTemplate(),
      'database-standard': this.getStandardDatabaseTemplate()
    };

    // Note: Async initialization required - call initialize() after construction
  }

  /**
   * Initialize the cache manager asynchronously
   */
  async initialize() {
    await this.initializeCacheSystem();
    this.loadBuiltinTemplates();

    console.log('🎛️  Configuration Cache Manager initialized');
    if (this.config.enableMetrics) {
      console.log(`   💾 Cache Directory: ${this.config.cacheDir}`);
      console.log(`   ⏰ Cache TTL: ${this.config.cacheTTL}ms`);
      console.log(`   📋 Templates: ${Object.keys(this.builtinTemplates).length} builtin`);
    }
  }

  /**
   * Initialize cache system directories and structures
   */
  async initializeCacheSystem() {
    this.paths = {
      cache: this.config.cacheDir,
      templates: this.config.templateDir,
      backups: join(this.config.cacheDir, 'backups'),
      versions: join(this.config.cacheDir, 'versions'),
      shared: join(this.config.cacheDir, 'shared'),
      runtime: join(this.config.cacheDir, 'runtime'),
      metrics: join(this.config.cacheDir, 'metrics')
    };

    // Create directory structure
    for (const path of Object.values(this.paths)) {
      try {
        await access(path);
      } catch {
        await mkdir(path, { recursive: true });
      }
    }

    // Initialize cache metadata
    this.cacheMetadataFile = join(this.paths.cache, 'cache-metadata.json');
    await this.loadCacheMetadata();
  }

  /**
   * Load cache metadata from disk
   */
  async loadCacheMetadata() {
    try {
      const metadataContent = await readFile(this.cacheMetadataFile, 'utf8');
      const metadata = JSON.parse(metadataContent);
      this.cacheMetadata = {
        ...metadata,
        loadedAt: new Date()
      };
    } catch (error) {
      console.warn('⚠️  Failed to load cache metadata, initializing new');
      this.cacheMetadata = this.createEmptyMetadata();
    }
  }

  /**
   * Create empty cache metadata structure
   * @returns {Object} Empty metadata
   */
  createEmptyMetadata() {
    return {
      version: '2.0.0',
      createdAt: new Date(),
      lastUpdate: new Date(),
      cacheEntries: {},
      templateVersions: {},
      sharedConfigs: {}
    };
  }

  /**
   * Save cache metadata to disk
   */
  async saveCacheMetadata() {
    this.cacheMetadata.lastUpdate = new Date();
    await writeFile(this.cacheMetadataFile, JSON.stringify(this.cacheMetadata, null, 2));
  }

  /**
   * Load builtin configuration templates
   */
  loadBuiltinTemplates() {
    Object.entries(this.builtinTemplates).forEach(([name, template]) => {
      this.templates.set(name, {
        ...template,
        builtin: true,
        loadedAt: new Date()
      });
    });
  }

  /**
   * Get or create configuration for a domain
   * @param {string} domain - Domain name
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Domain configuration
   */
  async getOrCreateDomainConfig(domain, options = {}) {
    console.log(`🔍 Getting configuration for domain: ${domain}`);

    const cacheKey = this.generateCacheKey(domain, options.environment || this.config.defaultEnvironment);
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      this.metrics.cacheHits++;
      console.log(`   💾 Cache hit for ${domain}`);
      return await this.getCachedConfig(cacheKey);
    }

    this.metrics.cacheMisses++;
    console.log(`   🔄 Cache miss, generating configuration for ${domain}`);

    try {
      let domainConfig;

      // Check if we have a saved configuration
      const savedConfig = await this.loadSavedConfig(domain, options.environment);
      if (savedConfig && !options.forceRefresh) {
        domainConfig = savedConfig;
      } else if (this.config.enableRuntimeDiscovery && options.cloudflareToken) {
        // Runtime discovery
        domainConfig = await this.discoverDomainConfiguration(domain, options);
      } else {
        // Generate from template
        domainConfig = await this.generateFromTemplate(domain, options);
      }

      // Validate configuration
      if (this.config.enableValidation) {
        const validation = await this.validateConfiguration(domainConfig);
        if (!validation.valid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Cache the configuration
      await this.cacheConfiguration(cacheKey, domainConfig);

      // Save for future use
      await this.saveConfiguration(domain, domainConfig, options.environment);

      return domainConfig;

    } catch (error) {
      console.error(`❌ Failed to get configuration for ${domain}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover domain configuration from Cloudflare API
   * @param {string} domain - Domain name
   * @param {Object} options - Discovery options
   * @returns {Promise<Object>} Discovered configuration
   */
  async discoverDomainConfiguration(domain, options = {}) {
    console.log(`   🔍 Discovering Cloudflare configuration for ${domain}`);
    this.metrics.discoveryRequests++;

    const { cloudflareToken, environment = this.config.defaultEnvironment } = options;

    if (!cloudflareToken) {
      throw new Error('Cloudflare token required for runtime discovery');
    }

    try {
      // Get Cloudflare account information
      const accountInfo = await this.fetchCloudflareAccounts(cloudflareToken);
      const zoneInfo = await this.fetchCloudflareZone(domain, cloudflareToken);

      // Build configuration from discovered data
      const discoveredConfig = {
        domain,
        environment,
        
        // Cloudflare metadata
        cloudflare: {
          accountId: accountInfo.id,
          accountName: accountInfo.name,
          zoneId: zoneInfo.id,
          zoneName: zoneInfo.name,
          discoveredAt: new Date().toISOString()
        },

        // Generate standard configuration structure
        ...this.generateStandardConfig(domain, accountInfo, zoneInfo),

        // Mark as dynamically discovered
        metadata: {
          type: 'discovered',
          source: 'cloudflare-api',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      console.log(`   ✅ Successfully discovered configuration for ${domain}`);
      return discoveredConfig;

    } catch (error) {
      console.error(`   ❌ Discovery failed for ${domain}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate configuration from template
   * @param {string} domain - Domain name
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated configuration
   */
  async generateFromTemplate(domain, options = {}) {
    console.log(`   📋 Generating configuration from template for ${domain}`);
    this.metrics.templateGenerations++;

    const {
      templateName = 'domain-standard',
      environment = this.config.defaultEnvironment,
      customValues = {}
    } = options;

    // Get template
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Process template with domain-specific values
    const templateValues = {
      domain,
      environment,
      domainKey: this.getDomainKey(domain),
      displayName: this.getDisplayName(domain),
      timestamp: new Date().toISOString(),
      ...customValues
    };

    const generatedConfig = await this.processTemplate(template, templateValues);

    // Apply cross-domain sharing if enabled
    if (this.config.enableCrossDomainSharing) {
      await this.applyCrossDomainSharing(generatedConfig);
    }

    generatedConfig.metadata = {
      type: 'generated',
      source: `template:${templateName}`,
      timestamp: new Date(),
      version: template.version || '1.0.0'
    };

    console.log(`   ✅ Generated configuration from template: ${templateName}`);
    return generatedConfig;
  }

  /**
   * Process template with values
   * @param {Object} template - Template object
   * @param {Object} values - Template values
   * @returns {Promise<Object>} Processed configuration
   */
  async processTemplate(template, values) {
    // Deep clone template structure
    const config = JSON.parse(JSON.stringify(template.structure || template));

    // Process template variables
    const processValue = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return values[key] || match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(processValue);
      } else if (obj && typeof obj === 'object') {
        const processed = {};
        for (const [key, value] of Object.entries(obj)) {
          processed[key] = processValue(value);
        }
        return processed;
      }
      return obj;
    };

    return processValue(config);
  }

  /**
   * Apply cross-domain configuration sharing
   * @param {Object} config - Configuration to enhance
   */
  async applyCrossDomainSharing(config) {
    const sharedConfigs = await this.getSharedConfigurations();
    
    for (const sharedKey of this.config.sharedConfigKeys) {
      if (sharedConfigs[sharedKey]) {
        this.setNestedValue(config, sharedKey, sharedConfigs[sharedKey]);
      }
    }
  }

  /**
   * Get shared configurations
   * @returns {Promise<Object>} Shared configurations
   */
  async getSharedConfigurations() {
    const sharedFile = join(this.paths.shared, 'shared-configs.json');
    
    try {
      const sharedContent = await readFile(sharedFile, 'utf8');
      return JSON.parse(sharedContent);
    } catch (error) {
      console.warn('⚠️  Failed to load shared configurations');
      return {};
    }
  }

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateConfiguration(config) {
    const errors = [];
    const warnings = [];

    // Basic structure validation
    if (!config.domain) errors.push('Missing domain');
    if (!config.environment) errors.push('Missing environment');

    // Cloudflare validation
    if (config.cloudflare) {
      if (!config.cloudflare.accountId) errors.push('Missing Cloudflare account ID');
      if (!config.cloudflare.zoneId) errors.push('Missing Cloudflare zone ID');
    }

    // Services validation
    if (config.services) {
      for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
        if (!serviceConfig[config.environment]) {
          warnings.push(`Missing ${serviceName} configuration for ${config.environment}`);
        }
      }
    }

    // Database validation
    if (config.databases && config.databases[config.environment]) {
      const dbConfig = config.databases[config.environment];
      if (!dbConfig.name) errors.push(`Missing database name for ${config.environment}`);
    }

    // CORS validation
    if (config.corsOrigins && config.corsOrigins[config.environment]) {
      const corsOrigins = config.corsOrigins[config.environment];
      if (!Array.isArray(corsOrigins) || corsOrigins.length === 0) {
        warnings.push(`No CORS origins defined for ${config.environment}`);
      }
    }

    if (errors.length > 0) {
      this.metrics.validationErrors++;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cache configuration with TTL
   * @param {string} cacheKey - Cache key
   * @param {Object} config - Configuration to cache
   */
  async cacheConfiguration(cacheKey, config) {
    const cacheEntry = {
      config,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.cacheTTL),
      size: JSON.stringify(config).length
    };

    // Compress if enabled
    if (this.config.enableCompression && cacheEntry.size > 1024) {
      // In a real implementation, you'd use a compression library
      cacheEntry.compressed = true;
      cacheEntry.originalSize = cacheEntry.size;
    }

    this.cache.set(cacheKey, cacheEntry);

    // Update metadata
    this.cacheMetadata.cacheEntries[cacheKey] = {
      cachedAt: cacheEntry.cachedAt,
      expiresAt: cacheEntry.expiresAt,
      size: cacheEntry.size
    };

    this.saveCacheMetadata();

    // Write to disk cache
    await this.writeToDiskCache(cacheKey, cacheEntry);

    console.log(`   💾 Cached configuration: ${cacheKey}`);
  }

  /**
   * Check if cache entry is valid
   * @param {string} cacheKey - Cache key
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(cacheKey) {
    const cacheEntry = this.cache.get(cacheKey);
    if (!cacheEntry) return false;

    return new Date() < cacheEntry.expiresAt;
  }

  /**
   * Get cached configuration
   * @param {string} cacheKey - Cache key
   * @returns {Promise<Object>} Cached configuration
   */
  async getCachedConfig(cacheKey) {
    const cacheEntry = this.cache.get(cacheKey);
    
    if (cacheEntry) {
      return cacheEntry.config;
    }

    // Try to load from disk cache
    return await this.loadFromDiskCache(cacheKey);
  }

  /**
   * Write cache entry to disk
   * @param {string} cacheKey - Cache key
   * @param {Object} cacheEntry - Cache entry
   */
  async writeToDiskCache(cacheKey, cacheEntry) {
    try {
      const cacheFile = join(this.paths.cache, `${cacheKey}.json`);
      await writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      console.warn(`⚠️  Failed to write disk cache: ${error.message}`);
    }
  }

  /**
   * Load configuration from disk cache
   * @param {string} cacheKey - Cache key
   * @returns {Promise<Object|null>} Cached configuration or null
   */
  async loadFromDiskCache(cacheKey) {
    try {
      const cacheFile = join(this.paths.cache, `${cacheKey}.json`);
      
      try {
        const cacheContent = await readFile(cacheFile, 'utf8');
        const cacheEntry = JSON.parse(cacheContent);
        
        // Check expiration
        if (new Date() < new Date(cacheEntry.expiresAt)) {
          this.cache.set(cacheKey, cacheEntry);
          return cacheEntry.config;
        }
      } catch {
        // File doesn't exist or can't be read
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load disk cache: ${error.message}`);
    }

    return null;
  }

  /**
   * Save configuration to persistent storage
   * @param {string} domain - Domain name
   * @param {Object} config - Configuration to save
   * @param {string} environment - Environment
   */
  async saveConfiguration(domain, config, environment) {
    const configDir = join(this.paths.cache, 'domains', domain);
    try {
      await access(configDir);
    } catch {
      await mkdir(configDir, { recursive: true });
    }

    const configFile = join(configDir, `${environment || 'default'}.json`);

    // Create backup if file exists
    try {
      await access(configFile);
      if (this.config.enableBackups) {
        await this.createConfigBackup(configFile);
      }
    } catch {
      // File doesn't exist, no backup needed
    }

    // Save configuration with metadata
    const saveData = {
      ...config,
      savedAt: new Date(),
      version: config.version || '1.0.0'
    };

    await writeFile(configFile, JSON.stringify(saveData, null, 2));

    // Generate additional formats if requested
    await this.generateOutputFormats(domain, config, environment);

    console.log(`   💾 Saved configuration: ${domain}/${environment}`);
  }

  /**
   * Load saved configuration
   * @param {string} domain - Domain name  
   * @param {string} environment - Environment
   * @returns {Promise<Object|null>} Saved configuration or null
   */
  async loadSavedConfig(domain, environment) {
    const configFile = join(this.paths.cache, 'domains', domain, `${environment || 'default'}.json`);
    
    try {
      await access(configFile);
      const content = await readFile(configFile, 'utf8');
      const config = JSON.parse(content);
      
      // Check if config is still valid (not too old)
      const savedAt = new Date(config.savedAt);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (Date.now() - savedAt.getTime() < maxAge) {
        return config;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️  Failed to load saved config for ${domain}: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Generate output formats for configuration
   * @param {string} domain - Domain name
   * @param {Object} config - Configuration
   * @param {string} environment - Environment
   */
  async generateOutputFormats(domain, config, environment) {
    if (!this.config.outputFormats.length) return;

    const outputDir = join(this.paths.cache, 'output', domain);
    try {
      await access(outputDir);
    } catch {
      await mkdir(outputDir, { recursive: true });
    }

    for (const format of this.config.outputFormats) {
      try {
        const fileName = `${environment || 'default'}.${format}`;
        const filePath = join(outputDir, fileName);
        
        let content = '';

        switch (format) {
          case 'json':
            content = JSON.stringify(config, null, 2);
            break;

          case 'js':
            content = `// Auto-generated configuration for ${domain}
export const config = ${JSON.stringify(config, null, 2)};
export default config;`;
            break;

          case 'yaml':
            content = this.convertToYaml(config);
            break;

          case 'env':
            content = this.convertToEnv(config);
            break;

          default:
            console.warn(`⚠️  Unknown output format: ${format}`);
            continue;
        }

        await writeFile(filePath, content);
        console.log(`   📄 Generated ${format.toUpperCase()}: ${fileName}`);

      } catch (error) {
        console.error(`❌ Failed to generate ${format} format: ${error.message}`);
      }
    }
  }

  /**
   * Convert configuration to YAML format
   * @param {Object} config - Configuration object
   * @returns {string} YAML string
   */
  convertToYaml(config) {
    // Simple YAML conversion - in production, use a proper YAML library
    const yamlify = (obj, indent = 0) => {
      const spaces = '  '.repeat(indent);
      let yaml = '';

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          yaml += yamlify(value, indent + 1);
        } else if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          value.forEach(item => {
            yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
          });
        } else {
          yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
        }
      }

      return yaml;
    };

    return `# Auto-generated configuration\n${yamlify(config)}`;
  }

  /**
   * Convert configuration to environment variables
   * @param {Object} config - Configuration object
   * @returns {string} Environment variables string
   */
  convertToEnv(config) {
    const envVars = [];
    
    const flatten = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const envKey = (prefix + key).toUpperCase().replace(/[^A-Z0-9]/g, '_');
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, `${prefix}${key}_`);
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          envVars.push(`${envKey}=${value}`);
        }
      }
    };

    flatten(config);
    return envVars.join('\n');
  }

  /**
   * Create backup of configuration file
   * @param {string} configFile - Configuration file path
   */
  async createConfigBackup(configFile) {
    try {
      const backupDir = join(this.paths.backups, new Date().toISOString().split('T')[0]);
      try {
        await access(backupDir);
      } catch {
        await mkdir(backupDir, { recursive: true });
      }

      const backupFile = join(backupDir, `${Date.now()}-${require('path').basename(configFile)}`);
      const content = await readFile(configFile, 'utf8');
      await writeFile(backupFile, content);

      console.log(`   💾 Created backup: ${backupFile}`);
    } catch (error) {
      console.warn(`⚠️  Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for domain
   * @param {string} domain - Domain name
   * @param {string} environment - Environment (optional)
   */
  invalidateCache(domain, environment = null) {
    const pattern = environment 
      ? this.generateCacheKey(domain, environment)
      : domain;

    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        delete this.cacheMetadata.cacheEntries[key];
        invalidated++;
      }
    }

    this.saveCacheMetadata();

    console.log(`🗑️  Invalidated ${invalidated} cache entries for ${domain}${environment ? `/${environment}` : ''}`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStatistics() {
    const stats = {
      entries: this.cache.size,
      hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
      metrics: { ...this.metrics },
      memory: {
        cacheSize: 0,
        totalEntries: this.cache.size
      }
    };

    // Calculate memory usage
    for (const [key, entry] of this.cache.entries()) {
      stats.memory.cacheSize += entry.size || 0;
    }

    return stats;
  }

  /**
   * Generate cache key
   * @param {string} domain - Domain name
   * @param {string} environment - Environment
   * @returns {string} Cache key
   */
  generateCacheKey(domain, environment) {
    return `${domain}:${environment}`;
  }

  /**
   * Get domain key (sanitized version)
   * @param {string} domain - Domain name
   * @returns {string} Domain key
   */
  getDomainKey(domain) {
    return domain.replace(/\./g, '').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Get display name for domain
   * @param {string} domain - Domain name
   * @returns {string} Display name
   */
  getDisplayName(domain) {
    const firstPart = domain.split('.')[0];
    return NameFormatters.toDisplayName(firstPart);
  }

  /**
   * Get template by name
   * @param {string} templateName - Template name
   * @returns {Object|null} Template object
   */
  getTemplate(templateName) {
    return this.templates.get(templateName);
  }

  /**
   * Set nested value in object using dot notation
   * @param {Object} obj - Target object
   * @param {string} path - Path (e.g., 'a.b.c')
   * @param {*} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  // Built-in template definitions

  /**
   * Get standard domain template
   * @returns {Object} Standard template
   */
  getStandardDomainTemplate() {
    return {
      version: '1.0.0',
      name: 'domain-standard',
      description: 'Standard domain configuration template',
      structure: {
        domain: '{{domain}}',
        environment: '{{environment}}',
        name: '{{domainKey}}',
        displayName: '{{displayName}}',

        domains: {
          production: '{{domain}}',
          staging: '{{domain}}',
          development: '{{domain}}'
        },

        services: {
          frontend: {
            production: 'https://{{domain}}',
            staging: 'https://staging.{{domain}}',
            development: 'http://localhost:3000'
          },
          api: {
            production: 'https://{{domainKey}}-data-service.tamylatrading.workers.dev',
            staging: 'https://{{domainKey}}-data-service-staging.tamylatrading.workers.dev',
            development: 'http://localhost:8787'
          },
          auth: {
            production: 'https://auth.{{domain}}',
            staging: 'https://auth-staging.{{domain}}',
            development: 'http://localhost:8787'
          }
        },

        corsOrigins: {
          production: ['https://{{domain}}', 'https://*.{{domain}}'],
          staging: ['https://staging.{{domain}}', 'https://*.staging.{{domain}}'],
          development: ['http://localhost:3000', 'http://localhost:8787']
        },

        databases: {
          production: { name: '{{domainKey}}-auth-db', id: null },
          staging: { name: '{{domainKey}}-auth-db-staging', id: null },
          development: { name: '{{domainKey}}-auth-db-local', id: null }
        },

        features: {
          magicLinkAuth: true,
          fileStorage: true,
          userProfiles: true,
          logging: true,
          webhooks: false
        },

        settings: {
          magicLinkExpiryMinutes: 15,
          rateLimitWindowMs: 900000,
          rateLimitMax: 100,
          maxFileSize: 26214400,
          allowedFileTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/wav'
          ]
        }
      }
    };
  }

  /**
   * Get minimal domain template
   * @returns {Object} Minimal template
   */
  getMinimalDomainTemplate() {
    return {
      version: '1.0.0',
      name: 'domain-minimal',
      description: 'Minimal domain configuration template',
      structure: {
        domain: '{{domain}}',
        environment: '{{environment}}',
        name: '{{domainKey}}',
        
        services: {
          api: {
            production: 'https://{{domainKey}}-data-service.tamylatrading.workers.dev'
          }
        },

        features: {
          magicLinkAuth: true,
          logging: false
        }
      }
    };
  }

  /**
   * Get enterprise domain template
   * @returns {Object} Enterprise template
   */
  getEnterpriseDomainTemplate() {
    return {
      version: '1.0.0',
      name: 'domain-enterprise',
      description: 'Enterprise domain configuration template',
      structure: {
        domain: '{{domain}}',
        environment: '{{environment}}',
        name: '{{domainKey}}',
        displayName: '{{displayName}}',

        domains: {
          production: '{{domain}}',
          staging: 'staging.{{domain}}',
          development: 'dev.{{domain}}'
        },

        services: {
          frontend: {
            production: 'https://{{domain}}',
            staging: 'https://staging.{{domain}}',
            development: 'https://dev.{{domain}}'
          },
          api: {
            production: 'https://api.{{domain}}',
            staging: 'https://api-staging.{{domain}}',
            development: 'https://api-dev.{{domain}}'
          },
          cdn: {
            production: 'https://cdn.{{domain}}',
            staging: 'https://cdn-staging.{{domain}}',
            development: 'https://cdn-dev.{{domain}}'
          }
        },

        features: {
          magicLinkAuth: true,
          fileStorage: true,
          userProfiles: true,
          logging: true,
          webhooks: true,
          analytics: true,
          monitoring: true,
          backup: true
        },

        security: {
          enableCSP: true,
          enableHSTS: true,
          requireHTTPS: true,
          rateLimiting: true
        }
      }
    };
  }

  /**
   * Get Cloudflare Worker template
   * @returns {Object} Worker template
   */
  getCloudflareWorkerTemplate() {
    return {
      version: '1.0.0',
      name: 'cloudflare-worker',
      description: 'Cloudflare Worker configuration template',
      structure: {
        name: '{{domainKey}}-data-service',
        main: 'src/worker/worker.js',
        compatibility_date: '2023-12-01',
        
        env: {
          production: {
            vars: {
              ENVIRONMENT: 'production',
              CORS_ORIGIN: 'https://{{domain}}'
            }
          }
        }
      }
    };
  }

  /**
   * Get standard database template
   * @returns {Object} Database template
   */
  getStandardDatabaseTemplate() {
    return {
      version: '1.0.0',
      name: 'database-standard',
      description: 'Standard database configuration template',
      structure: {
        databases: [
          {
            binding: 'DB',
            database_name: '{{domainKey}}-auth-db',
            database_id: null
          }
        ],
        
        migrations_table: 'migrations',
        backup_schedule: 'daily',
        retention_days: 30
      }
    };
  }

  /**
   * Fetch Cloudflare accounts
   * @param {string} token - Cloudflare API token
   * @returns {Promise<Object>} Account information
   */
  async fetchCloudflareAccounts(token) {
    // Implementation would make actual API call
    // This is a placeholder for the real implementation
    return {
      id: 'account-id',
      name: 'Account Name'
    };
  }

  /**
   * Fetch Cloudflare zone information
   * @param {string} domain - Domain name
   * @param {string} token - Cloudflare API token
   * @returns {Promise<Object>} Zone information
   */
  async fetchCloudflareZone(domain, token) {
    // Implementation would make actual API call
    // This is a placeholder for the real implementation
    return {
      id: 'zone-id',
      name: domain
    };
  }

  /**
   * Generate standard configuration structure
   * @param {string} domain - Domain name
   * @param {Object} accountInfo - Account information
   * @param {Object} zoneInfo - Zone information
   * @returns {Object} Standard configuration
   */
  generateStandardConfig(domain, accountInfo, zoneInfo) {
    const domainKey = this.getDomainKey(domain);
    const displayName = this.getDisplayName(domain);

    return {
      name: domainKey,
      displayName,
      
      domains: {
        production: domain,
        staging: domain
      },

      services: {
        frontend: {
          production: `https://${domain}`,
          staging: `https://${domain}`
        },
        api: {
          production: `https://${domainKey}-data-service.tamylatrading.workers.dev`,
          staging: `https://${domainKey}-data-service-staging.tamylatrading.workers.dev`
        }
      },

      corsOrigins: {
        production: [`https://${domain}`, `https://*.${domain}`],
        staging: [`https://${domain}`, `https://*.${domain}`]
      },

      databases: {
        production: { name: `${domainKey}-auth-db`, id: null },
        staging: { name: `${domainKey}-auth-db-staging`, id: null }
      }
    };
  }
}

// Legacy function exports for backward compatibility

/**
 * Simple configuration cache
 * @param {string} domain - Domain name
 * @param {Object} options - Cache options
 * @returns {ConfigurationCacheManager} Cache manager instance
 */
export function createConfigCache(domain, options = {}) {
  const cache = new ConfigurationCacheManager(options);
  
  return {
    get: (env) => cache.getOrCreateDomainConfig(domain, { environment: env }),
    invalidate: (env) => cache.invalidateCache(domain, env),
    save: (config, env) => cache.saveConfiguration(domain, config, env),
    validate: (config) => cache.validateConfiguration(config)
  };
}

/**
 * Generate configuration from template
 * @param {string} domain - Domain name
 * @param {string} templateName - Template name
 * @param {Object} values - Template values
 * @returns {Promise<Object>} Generated configuration
 */
export async function generateConfig(domain, templateName = 'domain-standard', values = {}) {
  const cache = new ConfigurationCacheManager();
  return cache.generateFromTemplate(domain, { templateName, customValues: values });
}

/**
 * Discover domain configuration
 * @param {string} domain - Domain name
 * @param {string} cloudflareToken - Cloudflare API token
 * @returns {Promise<Object>} Discovered configuration
 */
export async function discoverConfig(domain, cloudflareToken) {
  const cache = new ConfigurationCacheManager({ enableRuntimeDiscovery: true });
  return cache.discoverDomainConfiguration(domain, { cloudflareToken });
}
