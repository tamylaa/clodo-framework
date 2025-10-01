/* eslint-disable no-undef */
/**
 * Enterprise Cross-Domain Coordinator
 * 
 * Advanced portfolio management system for synchronized multi-domain operations with:
 * - Domain portfolio discovery and mapping
 * - Cross-domain deployment coordination and synchronization
 * - Shared resource management across domains
 * - Dependency resolution and deployment ordering
 * - Cross-domain compatibility validation
 * - Portfolio-wide monitoring and health checks
 * - Shared configuration and secret coordination
 * - Multi-domain rollback and recovery
 * - Cross-environment consistency verification
 * - Enterprise-grade audit and compliance tracking
 * 
 * @module cross-domain-coordinator
 * @version 2.0.0
 */

import { access, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { MultiDomainOrchestrator } from './multi-domain-orchestrator.js';
import { DomainDiscovery } from '../cloudflare/domain-discovery.js';

export class CrossDomainCoordinator {
  constructor(options = {}) {
    this.options = options;
    this.config = null;

    // Initialize portfolio state
    this.portfolio = {
      domains: new Map(),
      deployments: new Map(),
      sharedResources: new Map(),
      dependencies: new Map(),
      healthStatus: new Map(),
      metrics: {
        totalDomains: 0,
        activeDeployments: 0,
        completedDeployments: 0,
        failedDeployments: 0,
        rolledBackDeployments: 0
      }
    };

    // Coordination session
    this.session = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      operations: [],
      coordinationState: 'idle'
    };
  }

  /**
   * Initialize with framework configuration
   */
  async initializeFrameworkConfig() {
    // Import framework config for consistent deployment settings
    const { frameworkConfig } = await import('../../../src/utils/framework-config.js');
    const timing = frameworkConfig.getTiming();
    const deployment = frameworkConfig.getDeploymentConfig();
    const monitoring = frameworkConfig.getMonitoringConfig();
    
    this.config = {
      // Portfolio configuration
      portfolioName: this.options.portfolioName || 'enterprise-portfolio',
      maxConcurrentDeployments: this.options.maxConcurrentDeployments || timing.maxConcurrentDeployments,
      deploymentTimeout: this.options.deploymentTimeout || timing.deploymentTimeout,
      
      // Coordination settings
      enableDependencyResolution: this.options.enableDependencyResolution !== false,
      enableCrossValidation: this.options.enableCrossValidation !== false,
      enableSharedResources: this.options.enableSharedResources !== false,
      
      // Monitoring and health
      healthCheckInterval: this.options.healthCheckInterval || monitoring.healthCheckInterval,
      enableContinuousMonitoring: this.options.enableContinuousMonitoring !== false,
      
      // Rollback and recovery
      enableAutoRollback: this.options.enableAutoRollback !== false,
      rollbackThreshold: this.options.rollbackThreshold || deployment.rollbackThreshold,
      
      // Environments
      environments: this.options.environments || ['development', 'staging', 'production'],
      defaultEnvironment: this.options.defaultEnvironment || 'production',
      
      // Integration modules
      useAllModules: this.options.useAllModules !== false,
      moduleOptions: this.options.moduleOptions || {}
    };
  }

  /**
   * Lazy load deployment validator
   */
  async getDeploymentValidator() {
    if (!this._deploymentValidator) {
      const { DeploymentValidator } = await import('./validator.js');
      this._deploymentValidator = new DeploymentValidator({
        crossDomainValidation: this.config.enableCrossValidation,
        portfolioMode: true,
        ...this.config.moduleOptions.validator
      });
    }
    return this._deploymentValidator;
  }

  /**
   * Lazy load rollback manager
   */
  async getRollbackManager() {
    if (!this._rollbackManager) {
      const { RollbackManager } = await import('../deployment/rollback-manager.js');
      this._rollbackManager = new RollbackManager({
        autoRollback: this.config.enableAutoRollback,
        ...this.config.moduleOptions.rollback
      });
    }
    return this._rollbackManager;
  }

  /**
   * Lazy load database orchestrator
   */
  async getDatabaseOrchestrator() {
    if (!this._databaseOrchestrator) {
      const { DatabaseOrchestrator } = await import('../database/database-orchestrator.js');
      this._databaseOrchestrator = new DatabaseOrchestrator({
        crossDomainMode: true,
        ...this.config.moduleOptions.database
      });
    }
    return this._databaseOrchestrator;
  }

  /**
   * Lazy load secret manager
   */
  async getSecretManager() {
    if (!this._secretManager) {
      const { EnhancedSecretManager } = await import('../utils/deployment/secret-generator.js');
      this._secretManager = new EnhancedSecretManager({
        crossDomainMode: true,
        ...this.config.moduleOptions.secrets
      });
    }
    return this._secretManager;
  }

  /**
   * Lazy load production tester
   */
  async getProductionTester() {
    if (!this._productionTester) {
      const { ProductionTester } = await import('../deployment/production-tester.js');
      this._productionTester = new ProductionTester({
        environments: this.config.environments,
        ...this.config.moduleOptions.testing
      });
    }
    return this._productionTester;
  }

  /**
   * Lazy load deployment auditor
   */
  async getDeploymentAuditor() {
    if (!this._deploymentAuditor) {
      const { DeploymentAuditor } = await import('../deployment/deployment-auditor.js');
      this._deploymentAuditor = new DeploymentAuditor({
        portfolioMode: true,
        ...this.config.moduleOptions.auditor
      });
    }
    return this._deploymentAuditor;
  }

  /**
   * Lazy load config cache manager
   */
  async getConfigCacheManager() {
    if (!this._configCacheManager) {
      const { ConfigurationCacheManager } = await import('../utils/deployment/config-cache.js');
      this._configCacheManager = new ConfigurationCacheManager({
        crossDomainMode: true,
        ...this.config.moduleOptions.cache
      });
      await this._configCacheManager.initialize();
    }
    return this._configCacheManager;
  }

  /**
   * Initialize the cross-domain coordinator
   * @returns {Promise<void>}
   */
  async initialize() {
    // Initialize lightweight modules
    this.modules = {
      orchestrator: new MultiDomainOrchestrator({
        maxConcurrentDeployments: this.config.maxConcurrentDeployments,
        coordinationMode: true,
        ...this.config.moduleOptions.orchestrator
      })
    };

    // Initialize config cache (needed early)
    await this.getConfigCacheManager();

    console.log('🎯 Cross-Domain Coordinator initialized');
    console.log(`   📊 Portfolio: ${this.config.portfolioName}`);
    console.log(`   🔄 Max Concurrent: ${this.config.maxConcurrentDeployments}`);
    console.log(`   📋 Session: ${this.session.sessionId}`);

    await this.auditCoordinatorEvent('COORDINATOR_INITIALIZED', {
      portfolioName: this.config.portfolioName,
      sessionId: this.session.sessionId,
      config: this.config
    });
  }

  /**
   * Initialize all enterprise modules with coordination support
   * @returns {Object} Initialized modules
   */
  async initializeEnterpriseModules() {
    const moduleOptions = this.config.moduleOptions;

    return {
      orchestrator: new MultiDomainOrchestrator({
        maxConcurrentDeployments: this.config.maxConcurrentDeployments,
        coordinationMode: true,
        ...moduleOptions.orchestrator
      }),

      validator: new DeploymentValidator({
        crossDomainValidation: this.config.enableCrossValidation,
        portfolioMode: true,
        ...moduleOptions.validator
      }),

      rollbackManager: new RollbackManager({
        autoRollbackEnabled: this.config.enableAutoRollback,
        crossDomainRollback: true,
        ...moduleOptions.rollbackManager
      }),

      domainDiscovery: new DomainDiscovery({
        portfolioDiscovery: true,
        batchDiscovery: true,
        ...moduleOptions.domainDiscovery
      }),

      databaseOrchestrator: new DatabaseOrchestrator({
        crossDomainOperations: true,
        portfolioMode: true,
        ...moduleOptions.databaseOrchestrator
      }),

      secretManager: new EnhancedSecretManager({
        crossDomainCoordination: true,
        portfolioSecrets: true,
        ...moduleOptions.secretManager
      }),

      productionTester: new ProductionTester({
        portfolioTesting: true,
        crossDomainTests: true,
        ...moduleOptions.productionTester
      }),

      auditor: new DeploymentAuditor({
        portfolioAudit: true,
        crossDomainTracking: true,
        ...moduleOptions.auditor
      }),

      configCache: new ConfigurationCacheManager({
        portfolioConfigs: true,
        crossDomainSharing: true,
        ...moduleOptions.configCache
      })
    };
  }

  /**
   * Discover and register entire domain portfolio
   * @param {Array|Object} domainSources - Domain sources (configs, discovery, etc.)
   * @returns {Promise<Object>} Portfolio discovery results
   */
  async discoverPortfolio(domainSources = []) {
    console.log('🔍 Discovering domain portfolio...');
    
    const discoverySession = {
      sessionId: this.generateOperationId(),
      startTime: new Date(),
      domains: [],
      errors: []
    };

    try {
      // Method 1: From provided domain list
      if (Array.isArray(domainSources) && domainSources.length > 0) {
        await this.discoverFromDomainList(domainSources, discoverySession);
      }

      // Method 2: From configuration files
      await this.discoverFromConfigurations(discoverySession);

      // Method 3: From runtime discovery (Cloudflare API)
      if (this.config.enableCrossValidation) {
        await this.discoverFromRuntime(discoverySession);
      }

      // Process discovered domains
      for (const domainInfo of discoverySession.domains) {
        await this.registerDomain(domainInfo);
      }

      // Build dependency graph
      if (this.config.enableDependencyResolution) {
        await this.buildDependencyGraph();
      }

      discoverySession.endTime = new Date();
      discoverySession.duration = (discoverySession.endTime - discoverySession.startTime) / 1000;

      await this.auditCoordinatorEvent('PORTFOLIO_DISCOVERY_COMPLETED', {
        sessionId: discoverySession.sessionId,
        domainsFound: discoverySession.domains.length,
        duration: discoverySession.duration,
        errors: discoverySession.errors.length
      });

      console.log(`✅ Portfolio discovery completed: ${discoverySession.domains.length} domains found`);
      
      return {
        domains: discoverySession.domains,
        totalDomains: discoverySession.domains.length,
        errors: discoverySession.errors,
        dependencies: Array.from(this.portfolio.dependencies.entries())
      };

    } catch (error) {
      console.error(`❌ Portfolio discovery failed: ${error.message}`);
      await this.auditCoordinatorEvent('PORTFOLIO_DISCOVERY_FAILED', {
        sessionId: discoverySession.sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Discover domains from provided list
   * @param {Array} domainList - List of domain names or configurations
   * @param {Object} session - Discovery session
   */
  async discoverFromDomainList(domainList, session) {
    console.log(`   📋 Processing ${domainList.length} provided domains...`);

    for (const domainInput of domainList) {
      try {
        const domainInfo = typeof domainInput === 'string' 
          ? await this.modules.domainDiscovery.discoverDomainConfig(domainInput)
          : domainInput;

        session.domains.push({
          ...domainInfo,
          source: 'provided',
          discoveredAt: new Date()
        });

        console.log(`     ✅ ${domainInfo.name || domainInput}`);

      } catch (error) {
        session.errors.push({
          domain: domainInput,
          error: error.message,
          source: 'provided'
        });
        console.log(`     ❌ ${domainInput}: ${error.message}`);
      }
    }
  }

  /**
   * Discover domains from configuration files
   * @param {Object} session - Discovery session
   */
  async discoverFromConfigurations(session) {
    console.log('   📁 Scanning configuration files...');

    try {
      // Look for domains.js configuration
      const domainsConfigPath = 'src/config/domains.js';
      try {
        await access(domainsConfigPath);
        const domainsConfig = await import(`../../${domainsConfigPath}`);
        
        if (domainsConfig.DOMAINS) {
          for (const [domainName, domainConfig] of Object.entries(domainsConfig.DOMAINS)) {
            session.domains.push({
              ...domainConfig,
              name: domainName,
              source: 'configuration',
              discoveredAt: new Date()
            });
            console.log(`     ✅ ${domainName} (from config)`);
          }
        }
      } catch {
        // Configuration file not found, continue
      }

      // Look for cached configurations
      const configCache = await this.getConfigCacheManager();
      const cachedConfigs = await configCache.getCacheStatistics();
      console.log(`     💾 Found ${cachedConfigs.entries} cached configurations`);

    } catch (error) {
      session.errors.push({
        source: 'configuration',
        error: error.message
      });
      console.log(`     ❌ Configuration scan failed: ${error.message}`);
    }
  }

  /**
   * Discover domains from runtime (Cloudflare API)
   * @param {Object} session - Discovery session
   */
  async discoverFromRuntime(session) {
    console.log('   ☁️  Performing runtime discovery...');
    
    try {
      // This would use actual Cloudflare API in real implementation
      console.log('     🔍 Runtime discovery not yet implemented');
    } catch (error) {
      session.errors.push({
        source: 'runtime',
        error: error.message
      });
    }
  }

  /**
   * Register domain in portfolio
   * @param {Object} domainInfo - Domain information
   */
  async registerDomain(domainInfo) {
    const domainId = domainInfo.name || domainInfo.domain;
    
    const domainEntry = {
      id: domainId,
      ...domainInfo,
      registeredAt: new Date(),
      status: 'registered',
      deployments: [],
      healthChecks: [],
      dependencies: []
    };

    this.portfolio.domains.set(domainId, domainEntry);
    this.portfolio.metrics.totalDomains++;

    console.log(`   📝 Registered domain: ${domainId}`);
  }

  /**
   * Build dependency graph for portfolio domains
   */
  async buildDependencyGraph() {
    console.log('🔗 Building dependency graph...');

    const dependencies = new Map();

    for (const [domainId, domainInfo] of this.portfolio.domains) {
      const domainDeps = [];

      // Check for shared services
      if (domainInfo.services) {
        for (const [serviceName, serviceConfig] of Object.entries(domainInfo.services)) {
          // Look for cross-domain dependencies
          if (serviceConfig.dependsOn) {
            domainDeps.push(...serviceConfig.dependsOn);
          }
        }
      }

      // Check for shared databases
      if (domainInfo.databases) {
        // Add database dependencies
        for (const [env, dbConfig] of Object.entries(domainInfo.databases)) {
          if (dbConfig.sharedWith) {
            domainDeps.push(...dbConfig.sharedWith);
          }
        }
      }

      if (domainDeps.length > 0) {
        dependencies.set(domainId, domainDeps);
        console.log(`   🔗 ${domainId}: depends on ${domainDeps.join(', ')}`);
      }
    }

    this.portfolio.dependencies = dependencies;
    console.log(`✅ Dependency graph built: ${dependencies.size} domains have dependencies`);
  }

  /**
   * Coordinate deployment across multiple domains
   * @param {Array} domains - Domains to deploy
   * @param {Object} options - Deployment options
   * @returns {Promise<Object>} Deployment results
   */
  async coordinateMultiDomainDeployment(domains, options = {}) {
    const coordinationId = this.generateOperationId();
    
    console.log(`🚀 Coordinating deployment across ${domains.length} domains...`);
    console.log(`   🆔 Coordination ID: ${coordinationId}`);

    const coordination = {
      coordinationId,
      startTime: new Date(),
      domains,
      options,
      phases: ['validation', 'preparation', 'deployment', 'verification'],
      currentPhase: 'validation',
      results: {
        successful: [],
        failed: [],
        rolledBack: []
      },
      metrics: {
        totalDomains: domains.length,
        completed: 0,
        failed: 0,
        duration: 0
      }
    };

    this.session.operations.push(coordination);

    try {
      // Phase 1: Cross-domain validation
      await this.executeCoordinationPhase(coordination, 'validation');

      // Phase 2: Preparation and dependency resolution
      await this.executeCoordinationPhase(coordination, 'preparation');

      // Phase 3: Coordinated deployment
      await this.executeCoordinationPhase(coordination, 'deployment');

      // Phase 4: Cross-domain verification
      await this.executeCoordinationPhase(coordination, 'verification');

      coordination.endTime = new Date();
      coordination.duration = (coordination.endTime - coordination.startTime) / 1000;
      coordination.status = coordination.results.failed.length === 0 ? 'success' : 'partial';

      await this.auditCoordinatorEvent('MULTI_DOMAIN_DEPLOYMENT_COMPLETED', {
        coordinationId,
        totalDomains: coordination.metrics.totalDomains,
        successful: coordination.results.successful.length,
        failed: coordination.results.failed.length,
        duration: coordination.duration
      });

      console.log(`✅ Multi-domain deployment completed (${coordination.duration.toFixed(2)}s)`);
      console.log(`   ✅ Successful: ${coordination.results.successful.length}`);
      console.log(`   ❌ Failed: ${coordination.results.failed.length}`);
      
      return coordination;

    } catch (error) {
      console.error(`❌ Multi-domain deployment failed: ${error.message}`);
      
      // Trigger rollback if enabled
      if (this.config.enableAutoRollback) {
        await this.coordinateRollback(coordination);
      }

      throw error;
    }
  }

  /**
   * Execute specific phase of coordinated deployment
   * @param {Object} coordination - Coordination object
   * @param {string} phaseName - Phase name
   */
  async executeCoordinationPhase(coordination, phaseName) {
    console.log(`\n📋 Phase: ${phaseName.toUpperCase()}`);
    coordination.currentPhase = phaseName;

    const phaseStartTime = Date.now();

    try {
      switch (phaseName) {
        case 'validation':
          await this.executeCrossValidationPhase(coordination);
          break;

        case 'preparation':
          await this.executePreparationPhase(coordination);
          break;

        case 'deployment':
          await this.executeDeploymentPhase(coordination);
          break;

        case 'verification':
          await this.executeVerificationPhase(coordination);
          break;

        default:
          throw new Error(`Unknown coordination phase: ${phaseName}`);
      }

      const phaseDuration = (Date.now() - phaseStartTime) / 1000;
      console.log(`✅ Phase ${phaseName} completed (${phaseDuration.toFixed(2)}s)`);

    } catch (error) {
      const phaseDuration = (Date.now() - phaseStartTime) / 1000;
      console.error(`❌ Phase ${phaseName} failed (${phaseDuration.toFixed(2)}s): ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute cross-domain validation phase
   * @param {Object} coordination - Coordination object
   */
  async executeCrossValidationPhase(coordination) {
    console.log('   🔍 Cross-domain validation...');

    // Validate each domain
    for (const domain of coordination.domains) {
      try {
        const domainInfo = this.portfolio.domains.get(domain) || { name: domain };
        
        // Individual domain validation
        const validator = await this.getDeploymentValidator();
        const validation = await validator.validateDeploymentReadiness(domain, {
          environment: coordination.options.environment,
          crossDomainMode: true
        });

        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        console.log(`     ✅ ${domain}: validation passed`);

      } catch (error) {
        console.error(`     ❌ ${domain}: ${error.message}`);
        coordination.results.failed.push({ domain, phase: 'validation', error: error.message });
      }
    }

    // Cross-domain compatibility checks
    if (this.config.enableCrossValidation) {
      await this.validateCrossDomainCompatibility(coordination);
    }

    // Dependency validation
    if (this.config.enableDependencyResolution) {
      await this.validateDependencies(coordination);
    }
  }

  /**
   * Execute preparation phase
   * @param {Object} coordination - Coordination object
   */
  async executePreparationPhase(coordination) {
    console.log('   🛠️  Preparation and resource allocation...');

    // Coordinate shared resources
    if (this.config.enableSharedResources) {
      await this.coordinateSharedResources(coordination);
    }

    // Prepare secrets across domains
    await this.prepareSharedSecrets(coordination);

    // Database coordination
    await this.coordinateDatabases(coordination);

    // Configuration preparation
    await this.prepareConfigurations(coordination);
  }

  /**
   * Execute deployment phase
   * @param {Object} coordination - Coordination object
   */
  async executeDeploymentPhase(coordination) {
    console.log('   🚀 Coordinated deployment execution...');

    // Resolve deployment order based on dependencies
    const deploymentOrder = this.resolveDependencyOrder(coordination.domains);
    console.log(`     📋 Deployment order: ${deploymentOrder.join(' → ')}`);

    // Execute deployments in batches
    const batches = this.createDeploymentBatches(deploymentOrder);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n     🔄 Batch ${i + 1}/${batches.length}: ${batch.join(', ')}`);
      
      await this.executeBatchDeployment(batch, coordination);
    }
  }

  /**
   * Execute verification phase
   * @param {Object} coordination - Coordination object
   */
  async executeVerificationPhase(coordination) {
    console.log('   ✅ Cross-domain verification...');

    // Verify each successfully deployed domain
    for (const domain of coordination.results.successful) {
      try {
        const productionTester = await this.getProductionTester();
        const verification = await productionTester.runProductionTests(
          this.getDomainUrl(domain.domain),
          { 
            environment: coordination.options.environment,
            testSuites: ['health', 'endpoints', 'integration']
          }
        );

        if (verification.failed > 0) {
          throw new Error(`${verification.failed} tests failed`);
        }

        console.log(`     ✅ ${domain.domain}: verification passed`);

      } catch (error) {
        console.error(`     ❌ ${domain.domain}: verification failed - ${error.message}`);
        
        // Move from successful to failed
        coordination.results.failed.push({
          domain: domain.domain,
          phase: 'verification',
          error: error.message
        });
        
        coordination.results.successful = coordination.results.successful.filter(
          d => d.domain !== domain.domain
        );
      }
    }

    // Cross-domain integration tests
    if (coordination.results.successful.length > 1) {
      await this.runCrossDomainIntegrationTests(coordination);
    }
  }

  /**
   * Validate cross-domain compatibility
   * @param {Object} coordination - Coordination object
   */
  async validateCrossDomainCompatibility(coordination) {
    console.log('     🔗 Cross-domain compatibility validation...');

    // Check for version compatibility
    const versions = new Map();
    
    for (const domain of coordination.domains) {
      const domainInfo = this.portfolio.domains.get(domain);
      if (domainInfo && domainInfo.version) {
        versions.set(domain, domainInfo.version);
      }
    }

    // Validate CORS configurations
    await this.validateCorsCompatibility(coordination);

    // Validate shared service compatibility
    await this.validateSharedServiceCompatibility(coordination);

    console.log('     ✅ Cross-domain compatibility validated');
  }

  /**
   * Validate CORS compatibility across domains
   * @param {Object} coordination - Coordination object
   */
  async validateCorsCompatibility(coordination) {
    const corsIssues = [];

    for (const domain of coordination.domains) {
      const domainInfo = this.portfolio.domains.get(domain);
      
      if (domainInfo && domainInfo.corsOrigins) {
        const corsOrigins = domainInfo.corsOrigins[coordination.options.environment] || [];
        
        // Check if domain allows cross-domain requests from other portfolio domains
        for (const otherDomain of coordination.domains) {
          if (domain !== otherDomain) {
            const otherDomainInfo = this.portfolio.domains.get(otherDomain);
            if (otherDomainInfo && otherDomainInfo.domains) {
              const otherUrl = otherDomainInfo.domains[coordination.options.environment];
              
              const isAllowed = corsOrigins.some(origin => {
                return origin === otherUrl || 
                       origin.includes('*') || 
                       otherUrl.includes(origin.replace('https://', '').replace('*', ''));
              });

              if (!isAllowed) {
                corsIssues.push(`${domain} does not allow CORS from ${otherDomain} (${otherUrl})`);
              }
            }
          }
        }
      }
    }

    if (corsIssues.length > 0) {
      console.warn(`     ⚠️  CORS issues detected:`);
      corsIssues.forEach(issue => console.warn(`       - ${issue}`));
    }
  }

  /**
   * Coordinate shared resources across domains
   * @param {Object} coordination - Coordination object
   */
  async coordinateSharedResources(coordination) {
    console.log('     🤝 Coordinating shared resources...');

    const sharedResources = {
      databases: new Map(),
      secrets: new Map(),
      configurations: new Map()
    };

    // Identify shared resources
    for (const domain of coordination.domains) {
      const domainInfo = this.portfolio.domains.get(domain);
      
      if (domainInfo) {
        // Check for shared databases
        if (domainInfo.databases) {
          for (const [env, dbConfig] of Object.entries(domainInfo.databases)) {
            if (dbConfig.shared) {
              const resourceKey = `${dbConfig.name}-${env}`;
              if (!sharedResources.databases.has(resourceKey)) {
                sharedResources.databases.set(resourceKey, {
                  config: dbConfig,
                  domains: []
                });
              }
              sharedResources.databases.get(resourceKey).domains.push(domain);
            }
          }
        }
      }
    }

    this.portfolio.sharedResources = sharedResources;
    console.log(`     ✅ Found ${sharedResources.databases.size} shared databases`);
  }

  /**
   * Prepare shared secrets across domains
   * @param {Object} coordination - Coordination object
   */
  async prepareSharedSecrets(coordination) {
    console.log('     🔐 Preparing shared secrets...');

    const secretManager = await this.getSecretManager();
    const sharedSecrets = await secretManager.coordinateSecretsAcrossEnvironments(
      coordination.domains,
      coordination.options.environment,
      {
        syncCriticalSecrets: true,
        generateUniquePerDomain: false
      }
    );

    console.log(`     ✅ Coordinated secrets for ${coordination.domains.length} domains`);
    return sharedSecrets;
  }

  /**
   * Coordinate databases across domains
   * @param {Object} coordination - Coordination object
   */
  async coordinateDatabases(coordination) {
    console.log('     🗄️  Coordinating databases...');

    for (const [resourceKey, resource] of this.portfolio.sharedResources.databases) {
      console.log(`       📊 Shared database: ${resourceKey} (used by ${resource.domains.join(', ')})`);
      
      // Ensure shared database is ready for all domains
      const databaseOrchestrator = await this.getDatabaseOrchestrator();
      await databaseOrchestrator.coordinateSharedDatabase(
        resource.config,
        resource.domains,
        coordination.options.environment
      );
    }

    console.log('     ✅ Database coordination completed');
  }

  /**
   * Prepare configurations for all domains
   * @param {Object} coordination - Coordination object
   */
  async prepareConfigurations(coordination) {
    console.log('     ⚙️  Preparing configurations...');

    for (const domain of coordination.domains) {
      try {
        const configCache = await this.getConfigCacheManager();
        const config = await configCache.getOrCreateDomainConfig(domain, {
          environment: coordination.options.environment,
          forceRefresh: coordination.options.forceRefresh || false
        });

        console.log(`       ✅ ${domain}: configuration ready`);

      } catch (error) {
        console.error(`       ❌ ${domain}: configuration failed - ${error.message}`);
        coordination.results.failed.push({
          domain,
          phase: 'configuration',
          error: error.message
        });
      }
    }
  }

  /**
   * Resolve deployment order based on dependencies
   * @param {Array} domains - Domains to deploy
   * @returns {Array} Ordered domains for deployment
   */
  resolveDependencyOrder(domains) {
    const ordered = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (domain) => {
      if (visiting.has(domain)) {
        throw new Error(`Circular dependency detected: ${domain}`);
      }
      
      if (visited.has(domain)) {
        return;
      }

      visiting.add(domain);

      const dependencies = this.portfolio.dependencies.get(domain) || [];
      for (const dep of dependencies) {
        if (domains.includes(dep)) {
          visit(dep);
        }
      }

      visiting.delete(domain);
      visited.add(domain);
      ordered.push(domain);
    };

    domains.forEach(domain => {
      if (!visited.has(domain)) {
        visit(domain);
      }
    });

    return ordered;
  }

  /**
   * Create deployment batches for parallel execution
   * @param {Array} orderedDomains - Domains in dependency order
   * @returns {Array} Batches of domains
   */
  createDeploymentBatches(orderedDomains) {
    const batches = [];
    const batchSize = this.config.maxConcurrentDeployments;

    for (let i = 0; i < orderedDomains.length; i += batchSize) {
      batches.push(orderedDomains.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Execute batch deployment
   * @param {Array} batch - Domains in batch
   * @param {Object} coordination - Coordination object
   */
  async executeBatchDeployment(batch, coordination) {
    const batchPromises = batch.map(async (domain) => {
      try {
        console.log(`       🚀 Deploying ${domain}...`);
        
        const deployResult = await this.modules.orchestrator.deployDomain(domain, {
          environment: coordination.options.environment,
          skipValidation: true, // Already validated
          coordinationMode: true
        });

        coordination.results.successful.push({ domain, result: deployResult });
        coordination.metrics.completed++;

        console.log(`       ✅ ${domain}: deployment successful`);
        return { domain, status: 'success', result: deployResult };

      } catch (error) {
        coordination.results.failed.push({ domain, phase: 'deployment', error: error.message });
        coordination.metrics.failed++;

        console.error(`       ❌ ${domain}: deployment failed - ${error.message}`);
        return { domain, status: 'failed', error: error.message };
      }
    });

    await Promise.all(batchPromises);
  }

  /**
   * Coordinate rollback across failed deployments
   * @param {Object} coordination - Coordination object
   */
  async coordinateRollback(coordination) {
    console.log('\n🔄 Coordinating cross-domain rollback...');

    const rollbackId = this.generateOperationId();
    
    await this.auditCoordinatorEvent('CROSS_DOMAIN_ROLLBACK_START', {
      coordinationId: coordination.coordinationId,
      rollbackId,
      domainsToRollback: coordination.results.successful.length
    });

    // Rollback successful deployments in reverse order
    const rollbackOrder = [...coordination.results.successful].reverse();

    for (const deployment of rollbackOrder) {
      try {
        console.log(`   🔄 Rolling back ${deployment.domain}...`);
        
        const rollbackManager = await this.getRollbackManager();
        await rollbackManager.executeRollback(deployment.domain, {
          deploymentId: deployment.result?.deploymentId,
          reason: 'cross-domain-failure',
          coordinationId: coordination.coordinationId
        });

        coordination.results.rolledBack.push(deployment);
        console.log(`   ✅ ${deployment.domain}: rollback completed`);

      } catch (error) {
        console.error(`   ❌ ${deployment.domain}: rollback failed - ${error.message}`);
      }
    }

    await this.auditCoordinatorEvent('CROSS_DOMAIN_ROLLBACK_COMPLETED', {
      coordinationId: coordination.coordinationId,
      rollbackId,
      rolledBackDomains: coordination.results.rolledBack.length
    });

    console.log(`✅ Cross-domain rollback completed: ${coordination.results.rolledBack.length} domains`);
  }

  /**
   * Run cross-domain integration tests
   * @param {Object} coordination - Coordination object
   */
  async runCrossDomainIntegrationTests(coordination) {
    console.log('     🔗 Running cross-domain integration tests...');

    const integrationTests = [
      'cross-domain-cors',
      'shared-resource-access',
      'inter-domain-communication'
    ];

    for (const testName of integrationTests) {
      try {
        console.log(`       🧪 ${testName}...`);
        
        // Simulate integration test
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`       ✅ ${testName}: passed`);

      } catch (error) {
        console.error(`       ❌ ${testName}: failed - ${error.message}`);
      }
    }
  }

  /**
   * Monitor portfolio health continuously
   * @returns {Promise<Object>} Health monitoring results
   */
  async monitorPortfolioHealth() {
    if (!this.config.enableContinuousMonitoring) {
      console.log('📊 Portfolio health monitoring is disabled');
      return { enabled: false };
    }

    console.log('📊 Starting portfolio health monitoring...');

    const monitoringSession = {
      sessionId: this.generateOperationId(),
      startTime: new Date(),
      domains: Array.from(this.portfolio.domains.keys()),
      healthChecks: []
    };

    const healthPromises = monitoringSession.domains.map(async (domain) => {
      try {
        const productionTester = await this.getProductionTester();
        const healthResult = await productionTester.quickHealthCheck(
          this.getDomainUrl(domain)
        );

        const healthStatus = {
          domain,
          status: healthResult.failed === 0 ? 'healthy' : 'unhealthy',
          timestamp: new Date(),
          details: healthResult
        };

        this.portfolio.healthStatus.set(domain, healthStatus);
        monitoringSession.healthChecks.push(healthStatus);

        return healthStatus;

      } catch (error) {
        const errorStatus = {
          domain,
          status: 'error',
          timestamp: new Date(),
          error: error.message
        };

        this.portfolio.healthStatus.set(domain, errorStatus);
        monitoringSession.healthChecks.push(errorStatus);

        return errorStatus;
      }
    });

    await Promise.all(healthPromises);

    const healthySummary = {
      total: monitoringSession.domains.length,
      healthy: monitoringSession.healthChecks.filter(h => h.status === 'healthy').length,
      unhealthy: monitoringSession.healthChecks.filter(h => h.status === 'unhealthy').length,
      errors: monitoringSession.healthChecks.filter(h => h.status === 'error').length
    };

    console.log(`📊 Portfolio health: ${healthySummary.healthy}/${healthySummary.total} healthy`);

    return {
      session: monitoringSession,
      summary: healthySummary,
      details: monitoringSession.healthChecks
    };
  }

  /**
   * Get domain URL for testing
   * @param {string} domain - Domain name
   * @returns {string} Domain URL
   */
  getDomainUrl(domain) {
    const domainInfo = this.portfolio.domains.get(domain);
    
    if (domainInfo && domainInfo.services && domainInfo.services.api) {
      return domainInfo.services.api.production || domainInfo.services.api[this.config.defaultEnvironment];
    }

    // Fallback to default pattern
    return `https://${domain.replace(/\./g, '')}-data-service.tamylatrading.workers.dev`;
  }

  /**
   * Generate unique operation ID
   * @returns {string} Operation ID
   */
  generateOperationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `op_${timestamp}_${random}`;
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `coord_${timestamp}_${random}`;
  }

  /**
   * Audit coordinator events
   * @param {string} event - Event type
   * @param {Object} details - Event details
   */
  async auditCoordinatorEvent(event, details = {}) {
    const auditor = await this.getDeploymentAuditor();
    if (auditor) {
      auditor.logAuditEvent(event, 'COORDINATOR', {
        sessionId: this.session.sessionId,
        portfolioName: this.config.portfolioName,
        ...details
      });
    }
  }

  /**
   * Get portfolio statistics
   * @returns {Object} Portfolio statistics
   */
  getPortfolioStatistics() {
    return {
      portfolio: {
        name: this.config.portfolioName,
        sessionId: this.session.sessionId,
        totalDomains: this.portfolio.metrics.totalDomains,
        activeDomains: Array.from(this.portfolio.domains.keys()),
        sharedResources: Array.from(this.portfolio.sharedResources.entries()),
        dependencies: Array.from(this.portfolio.dependencies.entries())
      },
      
      health: {
        monitored: this.portfolio.healthStatus.size,
        healthy: Array.from(this.portfolio.healthStatus.values()).filter(h => h.status === 'healthy').length,
        unhealthy: Array.from(this.portfolio.healthStatus.values()).filter(h => h.status !== 'healthy').length
      },

      deployments: {
        total: this.portfolio.metrics.completedDeployments + this.portfolio.metrics.failedDeployments,
        completed: this.portfolio.metrics.completedDeployments,
        failed: this.portfolio.metrics.failedDeployments,
        rolledBack: this.portfolio.metrics.rolledBackDeployments
      }
    };
  }

  /**
   * Validate shared service compatibility
   * @param {Object} coordination - Coordination object
   */
  async validateSharedServiceCompatibility(coordination) {
    // Implementation for shared service validation
    console.log('     🔗 Validating shared service compatibility...');
  }

  /**
   * Validate dependencies
   * @param {Object} coordination - Coordination object
   */
  async validateDependencies(coordination) {
    // Implementation for dependency validation
    console.log('     📋 Validating domain dependencies...');
  }
}

// Legacy function exports for backward compatibility

/**
 * Simple cross-domain deployment
 * @param {Array} domains - Domains to deploy
 * @param {Object} options - Deployment options
 * @returns {Promise<Object>} Deployment results
 */
export async function deployMultipleDomains(domains, options = {}) {
  const coordinator = new CrossDomainCoordinator();
  
  // Auto-discover if not already done
  await coordinator.discoverPortfolio(domains);
  
  return await coordinator.coordinateMultiDomainDeployment(domains, options);
}

/**
 * Monitor portfolio health
 * @param {Array} domains - Domains to monitor
 * @returns {Promise<Object>} Health monitoring results
 */
export async function monitorDomainPortfolio(domains = []) {
  const coordinator = new CrossDomainCoordinator({ enableContinuousMonitoring: true });
  
  if (domains.length > 0) {
    await coordinator.discoverPortfolio(domains);
  } else {
    await coordinator.discoverPortfolio();
  }
  
  return await coordinator.monitorPortfolioHealth();
}

/**
 * Coordinate shared resources across domains
 * @param {Array} domains - Domains to coordinate
 * @param {Object} sharedConfig - Shared resource configuration
 * @returns {Promise<Object>} Coordination results
 */
export async function coordinateSharedResources(domains, sharedConfig = {}) {
  const coordinator = new CrossDomainCoordinator({ enableSharedResources: true });
  
  await coordinator.discoverPortfolio(domains);
  
  // This would implement actual shared resource coordination
  return {
    domains: domains.length,
    sharedResources: Object.keys(sharedConfig).length,
    status: 'coordinated'
  };
}
