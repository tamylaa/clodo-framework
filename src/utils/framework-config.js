/**
 * Enhanced Configuration Manager
 * Centralized configuration loading and management for the Lego Framework
 * 
 * Replaces hardcoded values throughout the codebase with configurable settings
 * from validation-config.json and environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export class FrameworkConfig {
  constructor(configPath = null) {
    this.configPath = configPath || this.findConfigFile();
    this.config = this.loadConfig();
    this.environment = process.env.ENVIRONMENT || 'development';
    
    // Validate environment variables on initialization
    this.validateEnvironmentVariables();
  }

  /**
   * Find the configuration file in standard locations
   */
  findConfigFile() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const possiblePaths = [
      './validation-config.json',
      '../validation-config.json',
      '../../validation-config.json',
      join(process.cwd(), 'validation-config.json'),
      join(__dirname, '..', '..', 'validation-config.json')
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Return null instead of throwing - will use default config
    console.warn('⚠️  validation-config.json not found. Using default configuration values.');
    return null;
  }

  /**
   * Load and parse the configuration file
   */
  loadConfig() {
    // If no config file found, return default configuration
    if (!this.configPath) {
      console.log('📋 Using default framework configuration');
      return this.getDefaultConfig();
    }

    try {
      const configContent = readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configContent);
      console.log(`📋 Loaded configuration from: ${this.configPath}`);
      return config;
    } catch (error) {
      console.warn(`⚠️  Failed to load configuration from ${this.configPath}: ${error.message}`);
      console.log('📋 Falling back to default configuration');
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration when validation-config.json is not available
   */
  getDefaultConfig() {
    return {
      // Timing configuration (all in milliseconds)
      deploymentTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      connectionTimeout: 5000,
      heartbeatInterval: 5000,
      shutdownTimeout: 10000,
      backupTimeout: 15000,
      restoreTimeout: 20000,
      migrationTimeout: 25000,
      validationTimeout: 8000,
      rollbackTimeout: 12000,
      healthCheckInterval: 30000,
      auditInterval: 60000,
      cleanupInterval: 300000,
      monitoringInterval: 15000,
      alertThrottle: 5000,

      // Network configuration
      networking: {
        maxConcurrentConnections: 10,
        connectionPoolSize: 5,
        requestTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
      },

      // Database configuration
      database: {
        connectionTimeout: 10000,
        queryTimeout: 30000,
        transactionTimeout: 60000,
        poolMin: 2,
        poolMax: 10,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      },

      // Environment configuration
      environments: {
        development: {
          logLevel: 'debug',
          debugMode: true,
          dryRun: false
        },
        staging: {
          logLevel: 'info',
          debugMode: false,
          dryRun: false
        },
        production: {
          logLevel: 'warn',
          debugMode: false,
          dryRun: false
        }
      },

      // Path configuration - all generated files go under generated/
      paths: {
        // Base generated directory
        generated: process.env.FRAMEWORK_GENERATED_DIR || 'generated',
        
        // Specific generated subdirectories
        logs: process.env.FRAMEWORK_LOGS_DIR || 'generated/logs',
        auditLogs: process.env.FRAMEWORK_AUDIT_DIR || 'generated/audit/logs',
        backups: process.env.FRAMEWORK_BACKUP_DIR || 'generated/backups',
        configCache: process.env.FRAMEWORK_CONFIG_CACHE_DIR || 'generated/cache/config',
        secureTokens: process.env.FRAMEWORK_TOKEN_DIR || 'generated/cache/tokens',
        auditReports: process.env.FRAMEWORK_REPORTS_DIR || 'generated/audit/reports',
        testResults: process.env.FRAMEWORK_TEST_RESULTS_DIR || 'generated/test-results',
        services: process.env.FRAMEWORK_SERVICES_DIR || 'generated/services',
        temp: process.env.FRAMEWORK_TEMP_DIR || 'generated/temp'
      }
    };
  }

  /**
   * Reload the configuration from file (useful for testing)
   */
  reload() {
    this.config = this.loadConfig();
  }

  /**
   * Get timing configuration with environment variable overrides
   */
  getTiming() {
    const timing = this.config.timing || {};
    return {
      deploymentTimeout: parseInt(process.env.DEPLOYMENT_TIMEOUT) || timing.deploymentTimeout || 300000,
      discoveryTimeout: parseInt(process.env.DISCOVERY_TIMEOUT) || timing.discoveryTimeout || 30000,
      healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || timing.healthCheckTimeout || 10000,
      productionTestTimeout: parseInt(process.env.PRODUCTION_TEST_TIMEOUT) || timing.productionTestTimeout || 30000,
      shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || timing.shutdownTimeout || 30000,
      forceShutdownTimeout: parseInt(process.env.FORCE_SHUTDOWN_TIMEOUT) || timing.forceShutdownTimeout || 5000,
      retryDelay: parseInt(process.env.RETRY_DELAY) || timing.retryDelay || 1000,
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || timing.retryAttempts || 3,
      cacheTTL: parseInt(process.env.CACHE_TTL) || timing.cacheTTL || 3600000,
      maxAge: parseInt(process.env.MAX_AGE) || timing.maxAge || 86400000,
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || timing.rateLimitWindow || 60000,
      circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || timing.circuitBreakerTimeout || 60000,
      circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || timing.circuitBreakerThreshold || 5,
      deploymentInterval: parseInt(process.env.DEPLOYMENT_INTERVAL) || timing.deploymentInterval || 5000,
      endpointValidationTimeout: parseInt(process.env.ENDPOINT_VALIDATION_TIMEOUT) || timing.endpointValidationTimeout || 5000,
      maxConcurrentDeployments: parseInt(process.env.MAX_CONCURRENT_DEPLOYMENTS) || timing.maxConcurrentDeployments || 3
    };
  }

  /**
   * Get networking configuration
   */
  getNetworking() {
    const networking = this.config.networking || {};
    return {
      endpoints: networking.endpoints || {},
      development: networking.development || {},
      rateLimiting: {
        defaultRequests: parseInt(process.env.RATE_LIMIT_REQUESTS) || networking.rateLimiting?.defaultRequests || 100,
        defaultWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || networking.rateLimiting?.defaultWindow || 60000,
        burstLimit: parseInt(process.env.RATE_LIMIT_BURST) || networking.rateLimiting?.burstLimit || 200,
        strictMode: process.env.RATE_LIMIT_STRICT === 'true' || networking.rateLimiting?.strictMode || false
      }
    };
  }



  /**
   * Get database naming configuration
   */
  getDatabaseConfig() {
    const database = this.config.database || {};
    const naming = database.namingConvention || {};
    
    return {
      naming: {
        development: naming.development || '{service}-dev',
        staging: naming.staging || '{service}-staging',
        production: naming.production || '{service}'
      },
      migration: database.migration || {},
      connection: {
        timeout: parseInt(process.env.DB_TIMEOUT) || database.connection?.timeout || 30000,
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS) || database.connection?.retryAttempts || 3,
        poolSize: parseInt(process.env.DB_POOL_SIZE) || database.connection?.poolSize || 10
      }
    };
  }

  /**
   * Get development ports configuration
   */
  getDevelopmentPorts() {
    const networking = this.config.networking || {};
    const development = networking.development || {};
    const defaultPorts = development.defaultPorts || {};
    
    return {
      frontend: parseInt(process.env.FRONTEND_PORT) || defaultPorts.frontend || 3000,
      api: parseInt(process.env.API_PORT) || defaultPorts.api || 8787,
      worker: parseInt(process.env.WORKER_PORT) || defaultPorts.worker || 8787,
      preview: parseInt(process.env.PREVIEW_PORT) || defaultPorts.preview || 8788
    };
  }

  /**
   * Get caching configuration
   */
  getCaching() {
    const caching = this.config.caching || {};
    
    return {
      maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE) || caching.maxCacheSize || 52428800,
      compressionThreshold: parseInt(process.env.COMPRESSION_THRESHOLD) || caching.compressionThreshold || 1024,
      cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || caching.cleanupInterval || 3600000,
      enableCompression: process.env.ENABLE_COMPRESSION === 'true' || caching.enableCompression || true,
      maxEntries: parseInt(process.env.MAX_CACHE_ENTRIES) || caching.maxEntries || 1000
    };
  }

  /**
   * Get monitoring configuration
   */
  getMonitoring() {
    const monitoring = this.config.monitoring || {};
    
    return {
      healthCheck: monitoring.healthCheck || {},
      metrics: monitoring.metrics || {},
      logging: monitoring.logging || {}
    };
  }

  /**
   * Get security configuration
   */
  getSecurity() {
    const security = this.config.security || {};
    
    return {
      requiredEnvironmentVars: security.requiredEnvironmentVars || [],
      optionalEnvironmentVars: security.optionalEnvironmentVars || [],
      secretsConfig: security.secretsConfig || {}
    };
  }

  /**
   * Get path configuration with environment variable overrides
   * All generated files are organized under the generated/ folder by default
   */
  getPaths() {
    const paths = this.config.paths || {};
    
    return {
      // Base generated directory
      generated: process.env.FRAMEWORK_GENERATED_DIR || paths.generated || 'generated',
      
      // Specific generated subdirectories
      logs: process.env.FRAMEWORK_LOGS_DIR || paths.logs || 'generated/logs',
      auditLogs: process.env.FRAMEWORK_AUDIT_DIR || paths.auditLogs || 'generated/audit/logs',
      backups: process.env.FRAMEWORK_BACKUP_DIR || paths.backups || 'generated/backups',
      configCache: process.env.FRAMEWORK_CONFIG_CACHE_DIR || paths.configCache || 'generated/cache/config',
      secureTokens: process.env.FRAMEWORK_TOKEN_DIR || paths.secureTokens || 'generated/cache/tokens',
      auditReports: process.env.FRAMEWORK_REPORTS_DIR || paths.auditReports || 'generated/audit/reports',
      testResults: process.env.FRAMEWORK_TEST_RESULTS_DIR || paths.testResults || 'generated/test-results',
      services: process.env.FRAMEWORK_SERVICES_DIR || paths.services || 'generated/services',
      temp: process.env.FRAMEWORK_TEMP_DIR || paths.temp || 'generated/temp'
    };
  }

  /**
   * Get a clean command for removing all generated files
   */
  getCleanupCommand() {
    const paths = this.getPaths();
    return `rm -rf ${paths.generated}`;
  }

  /**
   * Get environment configuration with validation
   */
  getEnvironmentConfig(environment = null) {
    const env = environment || this.environment;
    const environments = this.config.environments || {};
    const envConfig = environments[env] || environments.development || {};
    
    if (!envConfig || Object.keys(envConfig).length === 0) {
      console.warn(`⚠️  No configuration found for environment: ${env}. Using development defaults.`);
      return {
        domainTemplate: process.env.DOMAIN_TEMPLATE || '{service}.{domain}',
        workerSuffix: process.env.WORKER_SUFFIX || '',
        databaseSuffix: process.env.DATABASE_SUFFIX || '',
        logLevel: this.validateLogLevel(process.env.LOG_LEVEL) || 'info',
        enableMetrics: process.env.ENABLE_METRICS === 'true' || true,
        strictValidation: process.env.STRICT_VALIDATION === 'true' || false,
        debugMode: env === 'development',
        dryRun: false
      };
    }

    return {
      domainTemplate: process.env.DOMAIN_TEMPLATE || envConfig.domainTemplate || '{service}.{domain}',
      workerSuffix: process.env.WORKER_SUFFIX || envConfig.workerSuffix || '',
      databaseSuffix: process.env.DATABASE_SUFFIX || envConfig.databaseSuffix || '',
      logLevel: this.validateLogLevel(process.env.LOG_LEVEL) || this.validateLogLevel(envConfig.logLevel) || 'info',
      enableMetrics: process.env.ENABLE_METRICS === 'true' || envConfig.enableMetrics || true,
      strictValidation: process.env.STRICT_VALIDATION === 'true' || envConfig.strictValidation || false,
      debugMode: envConfig.debugMode || false,
      dryRun: envConfig.dryRun || false
    };
  }

  /**
   * Validate LOG_LEVEL environment variable
   */
  validateLogLevel(level) {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!level) return null;
    
    const normalizedLevel = level.toLowerCase();
    if (!validLevels.includes(normalizedLevel)) {
      console.warn(`⚠️  Invalid LOG_LEVEL "${level}". Valid values: ${validLevels.join(', ')}. Using 'info'.`);
      return 'info';
    }
    
    return normalizedLevel;
  }

  /**
   * Validate required environment variables
   */
  validateEnvironmentVariables() {
    const errors = [];
    const warnings = [];
    
    // Validate LOG_LEVEL if present
    if (process.env.LOG_LEVEL) {
      this.validateLogLevel(process.env.LOG_LEVEL);
    }
    
    // Validate ENVIRONMENT if present
    if (process.env.ENVIRONMENT) {
      const validEnvironments = ['development', 'staging', 'production'];
      if (!validEnvironments.includes(process.env.ENVIRONMENT)) {
        warnings.push(`Invalid ENVIRONMENT "${process.env.ENVIRONMENT}". Valid values: ${validEnvironments.join(', ')}`);
      }
    }
    
    // Validate framework-specific environment variables
    const frameworkEnvVars = [
      'FRAMEWORK_LOGS_DIR',
      'FRAMEWORK_AUDIT_DIR',
      'FRAMEWORK_BACKUP_DIR',
      'FRAMEWORK_CONFIG_CACHE_DIR',
      'FRAMEWORK_TOKEN_DIR',
      'FRAMEWORK_REPORTS_DIR'
    ];
    
    frameworkEnvVars.forEach(varName => {
      if (process.env[varName]) {
        // Validate path doesn't contain dangerous characters
        const value = process.env[varName];
        if (value.includes('..') || value.includes('~')) {
          warnings.push(`Environment variable ${varName} contains potentially dangerous path: ${value}`);
        }
      }
    });

    // Log validation results
    if (warnings.length > 0) {
      console.warn('⚠️  Environment variable validation warnings:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
    
    if (errors.length > 0) {
      console.error('❌ Environment variable validation errors:');
      errors.forEach(error => console.error(`   - ${error}`));
      throw new Error('Environment variable validation failed');
    }

    if (warnings.length === 0 && errors.length === 0) {
      console.log('✅ Environment variables validated successfully');
    }

    return { errors, warnings };
  }

  /**
   * Get testing configuration
   */
  getTesting() {
    const testing = this.config.testing || {};
    
    return {
      production: {
        enabled: process.env.PRODUCTION_TESTS === 'true' || testing.production?.enabled || true,
        lightweight: process.env.LIGHTWEIGHT_TESTS === 'true' || testing.production?.lightweight || true,
        skipHeavyTests: process.env.SKIP_HEAVY_TESTS === 'true' || testing.production?.skipHeavyTests || true,
        generateReports: process.env.GENERATE_REPORTS === 'true' || testing.production?.generateReports || false,
        testTimeout: parseInt(process.env.TEST_TIMEOUT) || testing.production?.testTimeout || 30000
      },
      integration: testing.integration || {}
    };
  }

  /**
   * Generate database name based on service and environment
   */
  generateDatabaseName(serviceName, environment = this.environment) {
    const dbConfig = this.getDatabaseConfig();
    const template = dbConfig.naming[environment] || dbConfig.naming.production || '{service}';
    
    return template.replace('{service}', serviceName);
  }

  /**
   * Generate development URLs based on service and configuration
   */
  generateDevelopmentUrls(serviceName) {
    const ports = this.getDevelopmentPorts();
    
    return {
      frontend: `http://localhost:${ports.frontend}`,
      api: `http://localhost:${ports.api}`,
      worker: `http://localhost:${ports.worker}`,
      preview: `http://localhost:${ports.preview}`
    };
  }

  /**
   * Validate environment variables
   */
  validateEnvironment() {
    const security = this.getSecurity();
    const missing = [];
    
    for (const envVar of security.requiredEnvironmentVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Get all configuration for easy access
   */
  getAll() {
    return {
      timing: this.getTiming(),
      networking: this.getNetworking(),
      environment: this.getEnvironmentConfig(),
      database: this.getDatabaseConfig(),
      ports: this.getDevelopmentPorts(),
      caching: this.getCaching(),
      monitoring: this.getMonitoring(),
      security: this.getSecurity(),
      testing: this.getTesting()
    };
  }
}

// Export singleton instance for easy access
export const frameworkConfig = new FrameworkConfig();

// Export utility functions
export const getFrameworkConfig = (configPath = null) => {
  return configPath ? new FrameworkConfig(configPath) : frameworkConfig;
};

export default FrameworkConfig;