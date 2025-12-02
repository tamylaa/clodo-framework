/**
 * Domain Router
 * CLI wrapper layer for domain routing, auto-detection, and multi-domain deployments
 * 
 * REFACTORED (Task 3.1): Now delegates to MultiDomainOrchestrator for actual deployment logic
 * 
 * Features:
 * - Auto-detect available domains from configuration
 * - Smart domain selection based on environment
 * - Environment-specific routing strategies
 * - Delegates multi-domain deployments to MultiDomainOrchestrator
 * - CLI-friendly interface for domain selection and config loading
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { MultiDomainOrchestrator } from '../deployment/index.js';

export class DomainRouter {
  constructor(options = {}) {
    this.configPath = options.configPath || './config/domains.json';
    this.cloudflareAPI = options.cloudflareAPI || null;
    this.verbose = options.verbose || false;
    this.environment = options.environment || 'development';
    this.domains = [];
    this.routes = {};
    this.failoverStrategies = {};
    this.loadedConfig = null;
    
    // Initialize MultiDomainOrchestrator for delegation
    // Only creates if orchestrator options provided
    this.orchestrator = null;
    this.disableOrchestrator = options.disableOrchestrator || false; // For testing
    this.orchestratorOptions = options.orchestratorOptions || {
      dryRun: options.dryRun || false,
      skipTests: options.skipTests || false,
      parallelDeployments: options.parallelDeployments || 3,
      servicePath: options.servicePath || process.cwd(),
      cloudflareToken: options.cloudflareToken || null,
      cloudflareAccountId: options.cloudflareAccountId || null,
      enablePersistence: options.enablePersistence !== false,
      rollbackEnabled: options.rollbackEnabled !== false
    };
  }

  /**
   * Initialize the orchestrator for multi-domain deployments
   * REFACTORED (Task 3.1): Delegates to MultiDomainOrchestrator
   * @param {Object} options - Orchestrator initialization options
   * @returns {Promise<void>}
   */
  async initializeOrchestrator(options = {}) {
    if (this.orchestrator) {
      return; // Already initialized
    }

    const orchestratorConfig = {
      ...this.orchestratorOptions,
      ...options,
      domains: this.domains,
      environment: this.environment
    };

    try {
      this.orchestrator = new MultiDomainOrchestrator(orchestratorConfig);
      await this.orchestrator.initialize();

      if (this.verbose) {
        console.log('✅ Multi-Domain Orchestrator initialized');
      }
    } catch (error) {
      throw new Error(`Failed to initialize orchestrator: ${error.message}`);
    }
  }

  /**
   * Load domain configuration from file or API
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Loaded configuration
   */
  async loadConfiguration(options = {}) {
    try {
      // Try loading from file first
      if (options.configPath && existsSync(options.configPath)) {
        const content = readFileSync(options.configPath, 'utf-8');
        this.loadedConfig = JSON.parse(content);
        if (this.verbose) {
          console.log(`📋 Loaded domain config from: ${options.configPath}`);
        }
        return this.loadedConfig;
      }

      // If no file, try Cloudflare API
      if (this.cloudflareAPI && options.useCloudflareAPI) {
        this.loadedConfig = await this.cloudflareAPI.getDomainsConfiguration();
        if (this.verbose) {
          console.log('📋 Loaded domain config from Cloudflare API');
        }
        return this.loadedConfig;
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to load domain configuration: ${error.message}`);
    }
  }

  /**
   * Detect available domains from configuration or environment
   * @param {Object} options - Detection options
   * @returns {Promise<Array<string>>} Array of discovered domains
   */
  async detectDomains(options = {}) {
    const config = options.config || this.loadedConfig || {};
    const domains = [];

    // Extract from config
    if (config.domains) {
      if (Array.isArray(config.domains)) {
        domains.push(...config.domains);
      } else if (typeof config.domains === 'object') {
        // Handle environment-keyed domains: { production: 'api.example.com', staging: 'staging-api.example.com' }
        for (const [env, domainList] of Object.entries(config.domains)) {
          if (Array.isArray(domainList)) {
            domains.push(...domainList);
          } else if (typeof domainList === 'string') {
            domains.push(domainList);
          }
        }
      }
    }

    // Extract from environment variable
    const envDomains = process.env.CLODO_DOMAINS;
    if (envDomains) {
      domains.push(...envDomains.split(',').map(d => d.trim()));
    }

    // Deduplicate and sort
    const uniqueDomains = [...new Set(domains)].sort();

    if (this.verbose) {
      console.log(`🔍 Detected ${uniqueDomains.length} domains: ${uniqueDomains.join(', ')}`);
    }

    this.domains = uniqueDomains;
    return uniqueDomains;
  }

  /**
   * Select the appropriate domain for deployment based on environment and options
   * @param {Object} options - Selection criteria
   * @returns {string|Array<string>} Selected domain(s)
   */
  selectDomain(options = {}) {
    const { 
      specificDomain, 
      environment = this.environment,
      selectAll = false,
      environmentMap = {}
    } = options;

    // If specific domain requested, validate and return it
    if (specificDomain) {
      if (this.domains.includes(specificDomain)) {
        if (this.verbose) {
          console.log(`✓ Selected domain: ${specificDomain}`);
        }
        return specificDomain;
      } else {
        throw new Error(`Domain '${specificDomain}' not found in available domains: ${this.domains.join(', ')}`);
      }
    }

    // If returning all domains
    if (selectAll) {
      if (this.verbose) {
        console.log(`✓ Selected all ${this.domains.length} domains`);
      }
      return this.domains;
    }

    // Select based on environment mapping
    const envMap = environmentMap[environment];
    if (envMap) {
      const selectedDomain = Array.isArray(envMap) ? envMap[0] : envMap;
      if (this.domains.includes(selectedDomain)) {
        if (this.verbose) {
          console.log(`✓ Selected domain for ${environment}: ${selectedDomain}`);
        }
        return selectedDomain;
      }
    }

    // Default to first available domain
    if (this.domains.length > 0) {
      if (this.verbose) {
        console.log(`✓ Selected default domain: ${this.domains[0]}`);
      }
      return this.domains[0];
    }

    throw new Error('No domains available for selection');
  }

  /**
   * Get environment-specific routing configuration
   * @param {string} domain - Domain name
   * @param {string} environment - Environment (development, staging, production)
   * @returns {Object} Routing configuration
   */
  getEnvironmentRouting(domain, environment = this.environment) {
    const config = this.loadedConfig || {};
    const domainConfig = config[domain] || config.routing || {};

    const environmentRouting = {
      domain,
      environment,
      endpoints: [],
      strategies: [],
      rateLimit: 1000,
      timeout: 30000,
      retries: 3,
      cacheTTL: 3600,
      corsEnabled: false,
      customHeaders: {},
      ...domainConfig[environment] // Allow environment-specific overrides
    };

    // Add default endpoints for environment
    if (environment === 'production') {
      environmentRouting.rateLimit = 10000;
      environmentRouting.cacheTTL = 86400; // 24 hours
      environmentRouting.strategies = ['load-balance', 'geo-route'];
    } else if (environment === 'staging') {
      environmentRouting.rateLimit = 5000;
      environmentRouting.cacheTTL = 3600; // 1 hour
      environmentRouting.strategies = ['round-robin'];
    } else {
      // development
      environmentRouting.rateLimit = 100;
      environmentRouting.cacheTTL = 300; // 5 minutes
      environmentRouting.strategies = ['direct'];
    }

    if (this.verbose) {
      console.log(`🛣️  Environment routing for ${domain} (${environment}): ${environmentRouting.strategies.join(', ')}`);
    }

    return environmentRouting;
  }

  /**
   * Get failover strategy for domain
   * @param {string} domain - Domain name
   * @returns {Object} Failover configuration
   */
  getFailoverStrategy(domain) {
    if (this.failoverStrategies[domain]) {
      return this.failoverStrategies[domain];
    }

    const config = this.loadedConfig || {};
    const domainConfig = config[domain] || {};

    const strategy = {
      domain,
      primaryEndpoint: domainConfig.primaryEndpoint || null,
      secondaryEndpoints: domainConfig.secondaryEndpoints || [],
      healthCheckInterval: domainConfig.healthCheckInterval || 30000,
      healthCheckPath: domainConfig.healthCheckPath || '/health',
      failoverThreshold: domainConfig.failoverThreshold || 3,
      autoFailover: domainConfig.autoFailover !== false,
      maxRetries: domainConfig.maxRetries || 5,
      rollbackOnFailure: domainConfig.rollbackOnFailure !== false,
      notifications: domainConfig.notifications || []
    };

    this.failoverStrategies[domain] = strategy;

    if (this.verbose) {
      console.log(`⚡ Failover strategy for ${domain}: ${strategy.autoFailover ? 'auto' : 'manual'} with ${strategy.secondaryEndpoints.length} backups`);
    }

    return strategy;
  }

  /**
   * Validate domain configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result { valid, errors }
   */
  validateConfiguration(config) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!config) {
      result.valid = false;
      result.errors.push('Configuration cannot be empty');
      return result;
    }

    if (!config.domains || (Array.isArray(config.domains) && config.domains.length === 0)) {
      result.valid = false;
      result.errors.push('At least one domain must be specified');
    }

    // Validate each domain has required fields
    if (Array.isArray(config.domains)) {
      config.domains.forEach(domain => {
        if (!domain || typeof domain !== 'string') {
          result.errors.push('All domains must be non-empty strings');
          result.valid = false;
        }
      });
    }

    // Check for environment-specific configurations
    if (config.environments) {
      const validEnvs = ['development', 'staging', 'production'];
      for (const env of Object.keys(config.environments)) {
        if (!validEnvs.includes(env)) {
          result.warnings.push(`Unknown environment: ${env}`);
        }
      }
    }

    if (this.verbose && result.errors.length > 0) {
      console.log(`❌ Configuration validation failed: ${result.errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Plan multi-domain deployment
   * REFACTORED (Task 3.1): Delegates to MultiDomainOrchestrator
   * @param {Array<string>} domains - Domains to deploy
   * @param {Object} options - Deployment options
   * @returns {Object} Deployment plan
   */
  planMultiDomainDeployment(domains, options = {}) {
    if (!this.orchestrator) {
      // Fallback to basic planning if orchestrator not initialized
      const {
        parallelDeployments = 3,
        environment = this.environment,
        validateBeforeDeploy = true,
        rollbackOnError = true
      } = options;

      // Validate all domains
      const invalidDomains = domains.filter(d => !this.domains.includes(d));
      if (invalidDomains.length > 0) {
        throw new Error(`Invalid domains: ${invalidDomains.join(', ')}`);
      }

      // Create deployment batches
      const batches = [];
      for (let i = 0; i < domains.length; i += parallelDeployments) {
        batches.push(domains.slice(i, i + parallelDeployments));
      }

      return {
        totalDomains: domains.length,
        batches,
        parallelDeployments,
        environment,
        phases: [
          { phase: 'validation', domains },
          { phase: 'preparation', domains },
          { phase: 'deployment', domains, batches },
          { phase: 'verification', domains },
          { phase: 'rollback', domains, enabled: rollbackOnError }
        ],
        estimatedDuration: domains.length * 5 * 60 * 1000,
        rollbackOnError,
        validateBeforeDeploy
      };
    }

    // Delegate to orchestrator's batch creation
    const batches = this.orchestrator.createDeploymentBatches();
    
    if (this.verbose) {
      console.log(`📊 Deployment plan created: ${batches.length} batches for ${domains.length} domains`);
    }

    return {
      totalDomains: domains.length,
      batches,
      parallelDeployments: this.orchestratorOptions.parallelDeployments,
      environment: this.environment,
      orchestratorManaged: true
    };
  }

  /**
   * Execute multi-domain deployment with coordination
   * REFACTORED (Task 3.1): Delegates to MultiDomainOrchestrator for actual deployment
   * @param {Array<string>} domains - Domains to deploy
   * @param {Function} deployFn - Async function to deploy a single domain (legacy support)
   * @param {Object} options - Deployment options
   * @returns {Promise<Object>} Deployment results
   */
  async deployAcrossDomains(domains, deployFn, options = {}) {
    // For tests or when explicitly disabled, use legacy mode without orchestrator
    if (this.disableOrchestrator) {
      return this._deployAcrossDomainsLegacy(domains, deployFn, options);
    }

    // Ensure orchestrator is initialized
    if (!this.orchestrator) {
      await this.initializeOrchestrator();
    }

    try {
      // If deployFn provided, use orchestrator's delegated deployment with custom handler
      if (deployFn && typeof deployFn === 'function') {
        if (this.verbose) {
          console.log('🚀 Using custom deployment function with orchestrator coordination');
        }

        // Validate domains
        const invalidDomains = domains.filter(d => !this.domains.includes(d));
        if (invalidDomains.length > 0) {
          throw new Error(`Invalid domains: ${invalidDomains.join(', ')}`);
        }

        // Execute with plan
        const plan = this.planMultiDomainDeployment(domains, options);
        const results = {
          successful: [],
          failed: [],
          skipped: [],
          duration: 0,
          startTime: new Date(),
          orchestratorManaged: true
        };

        // Phase 1: Validation
        if (plan.validateBeforeDeploy !== false) {
          for (const domain of domains) {
            const validation = this.validateConfiguration({ domains: [domain] });
            if (!validation.valid) {
              results.failed.push({ domain, error: validation.errors.join(', ') });
            }
          }

          if (results.failed.length > 0 && (options.rollbackOnError !== false)) {
            throw new Error(`Validation failed for ${results.failed.length} domain(s)`);
          }
        }

        // Phase 2: Batch deployment via orchestrator
        for (const batch of plan.batches) {
          const deployPromises = batch.map(domain =>
            this.orchestrator.deploySingleDomain(domain, options)
              .then(result => {
                results.successful.push({ domain, ...result });
              })
              .catch(error => {
                results.failed.push({ domain, error: error.message });
                if (options.rollbackOnError !== false) {
                  throw error;
                }
              })
          );

          try {
            await Promise.all(deployPromises);
          } catch (error) {
            if (options.rollbackOnError !== false) {
              results.duration = Date.now() - results.startTime.getTime();
              throw new Error(`Deployment failed at batch. Completed: ${results.successful.length}, Failed: ${results.failed.length}`);
            }
          }
        }

        results.duration = Date.now() - results.startTime.getTime();

        if (this.verbose) {
          console.log(`✅ Multi-domain deployment complete: ${results.successful.length} successful, ${results.failed.length} failed in ${Math.ceil(results.duration / 1000)}s`);
        }

        return results;
      } else {
        // No custom function provided - use orchestrator's portfolio deployment
        if (this.verbose) {
          console.log('🚀 Using orchestrator portfolio deployment');
        }

        const startTime = Date.now();
        const results = await this.orchestrator.deployPortfolio();
        const duration = Date.now() - startTime;

        return {
          ...results,
          duration,
          orchestratorManaged: true
        };
      }
    } catch (error) {
      if (this.verbose) {
        console.log(`❌ Deployment failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Legacy deployment logic for testing or when orchestrator is disabled
   * @private
   * @param {Array<string>} domains - Domains to deploy
   * @param {Function} deployFn - Async function to deploy a single domain
   * @param {Object} options - Deployment options
   * @returns {Promise<Object>} Deployment results
   */
  async _deployAcrossDomainsLegacy(domains, deployFn, options = {}) {
    const plan = this.planMultiDomainDeployment(domains, options);
    const results = {
      successful: [],
      failed: [],
      skipped: [],
      duration: 0,
      startTime: new Date()
    };

    try {
      // Phase 1: Validation
      if (plan.validateBeforeDeploy) {
        for (const domain of domains) {
          const routing = this.getEnvironmentRouting(domain, options.environment || this.environment);
          const validation = this.validateConfiguration({ domains: [domain], ...routing });
          if (!validation.valid) {
            results.failed.push({ domain, error: validation.errors.join(', ') });
          }
        }

        if (results.failed.length > 0 && plan.rollbackOnError) {
          throw new Error(`Validation failed for ${results.failed.length} domain(s)`);
        }
      }

      // Phase 2: Batch deployment
      for (const batch of plan.batches) {
        const deployPromises = batch.map(domain =>
          deployFn(domain, options)
            .then(result => {
              results.successful.push({ domain, ...result });
            })
            .catch(error => {
              results.failed.push({ domain, error: error.message });
              if (plan.rollbackOnError) {
                throw error;
              }
            })
        );

        try {
          await Promise.all(deployPromises);
        } catch (error) {
          if (plan.rollbackOnError) {
            results.duration = Date.now() - results.startTime.getTime();
            throw new Error(`Deployment failed at batch. Completed: ${results.successful.length}, Failed: ${results.failed.length}`);
          }
        }
      }

      results.duration = Date.now() - results.startTime.getTime();

      if (this.verbose) {
        console.log(`✅ Deployment complete: ${results.successful.length} successful, ${results.failed.length} failed in ${Math.ceil(results.duration / 1000)}s`);
      }

      return results;
    } catch (error) {
      results.duration = Date.now() - results.startTime.getTime();
      if (this.verbose) {
        console.log(`❌ Deployment failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get routing summary for debugging
   * @returns {Object} Routing summary
   */
  getSummary() {
    const summary = {
      totalDomains: this.domains.length,
      domains: this.domains,
      environment: this.environment,
      routing: {},
      failover: {}
    };

    for (const domain of this.domains) {
      summary.routing[domain] = this.getEnvironmentRouting(domain);
      summary.failover[domain] = this.getFailoverStrategy(domain);
    }

    return summary;
  }
}
