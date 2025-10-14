/**
 * EnvironmentManager - Manages environment-specific deployment logic and domain orchestration
 * Handles environment configuration, domain mapping, deployment mode selection, and cross-domain coordination
 */

import { MultiDomainOrchestrator } from '../../../dist/orchestration/multi-domain-orchestrator.js';
import { CrossDomainCoordinator } from '../../../dist/orchestration/cross-domain-coordinator.js';
import { DomainDiscovery } from '../../shared/cloudflare/domain-discovery.js';
import { askChoice, askUser, askYesNo, DeploymentInteractiveUtils } from '../../shared/utils/interactive-utils.js';

export class EnvironmentManager {
  constructor(config) {
    this.config = config;
    this.orchestrator = null;
    this.coordinator = null;
    this.domainDiscovery = null;
    
    this.supportedEnvironments = ['production', 'staging', 'development', 'preview'];
    this.deploymentModes = ['single', 'multi-domain', 'portfolio'];
    
    // Enhanced interactive utilities
    this.interactiveUtils = new DeploymentInteractiveUtils({
      enableColors: true,
      enableProgress: true,
      validateInputs: true
    });
  }

  /**
   * Initialize environment-specific components based on configuration
   */
  async initializeEnvironment() {
    console.log('\n🌍 Initializing Environment Manager');
    console.log('===================================');

    // Initialize multi-domain orchestrator if needed
    if (this.config.deploymentMode !== 'single') {
      this.orchestrator = new MultiDomainOrchestrator({
        portfolioName: this.config.portfolioName || 'default-portfolio',
        enableContinuousMonitoring: this.config.deployment?.enableMonitoring || false,
        validationLevel: this.config.deployment?.validationLevel || 'standard',
        environment: this.config.environment
      });
      
      console.log('   ✅ Multi-domain orchestrator initialized');
    }

    // Initialize cross-domain coordinator for portfolio mode
    if (this.config.deploymentMode === 'portfolio') {
      this.coordinator = new CrossDomainCoordinator({
        portfolioName: this.config.portfolioName || 'interactive-portfolio',
        enableContinuousMonitoring: true,
        crossDomainCoordination: this.config.secrets?.crossDomainSharing || false
      });
      
      console.log('   ✅ Cross-domain coordinator initialized');
    }

    // Initialize domain discovery
    this.domainDiscovery = new DomainDiscovery({
      environment: this.config.environment,
      enableConfigDiscovery: true
    });
    
    console.log('   ✅ Domain discovery service initialized');
  }

  /**
   * Interactive deployment mode selection
   */
  async selectDeploymentMode() {
    console.log('\n🎯 Deployment Mode Selection');
    console.log('============================');
    console.log('');
    console.log('The Enterprise Deployment System supports multiple deployment modes:');
    console.log('');
    console.log('📱 Single Domain    - Deploy one domain with full enterprise features');
    console.log('🌍 Multi-Domain     - Deploy multiple domains with coordination');
    console.log('📊 Portfolio Mode   - Manage entire domain portfolio');
    console.log('');

    const modes = [
      'Single Domain (Recommended for first-time users)',
      'Multi-Domain (Deploy multiple domains together)', 
      'Portfolio Mode (Advanced: Full portfolio management)'
    ];

    // Use enhanced deployment mode selector
    const modeChoice = await this.interactiveUtils.askDeploymentMode(0);
    
    switch(modeChoice) {
      case 0:
        this.config.deploymentMode = 'single';
        console.log('\n✅ Selected: Single Domain Deployment');
        break;
      case 1:
        this.config.deploymentMode = 'multi-domain';
        this.config.enterprise = this.config.enterprise || {};
        this.config.enterprise.enableCrossDomainCoordination = true;
        console.log('\n✅ Selected: Multi-Domain Deployment');
        break;
      case 2:
        this.config.deploymentMode = 'portfolio';
        this.config.enterprise = this.config.enterprise || {};
        this.config.enterprise.enableCrossDomainCoordination = true;
        console.log('\n✅ Selected: Portfolio Mode');
        break;
    }

    return this.config.deploymentMode;
  }

  /**
   * Gather configuration based on selected deployment mode
   */
  async gatherEnvironmentConfiguration() {
    console.log('\n📋 Environment Configuration');
    console.log('============================');

    switch(this.config.deploymentMode) {
      case 'single':
        return await this.gatherSingleDomainConfiguration();
      case 'multi-domain':
        return await this.gatherMultiDomainConfiguration();
      case 'portfolio':
        return await this.gatherPortfolioConfiguration();
      default:
        throw new Error(`Unsupported deployment mode: ${this.config.deploymentMode}`);
    }
  }

  /**
   * Gather single domain configuration
   */
  async gatherSingleDomainConfiguration() {
    console.log('\n📱 Single Domain Configuration');
    console.log('------------------------------');

    // Enhanced domain input with built-in validation
    this.config.domain = await this.interactiveUtils.askDomain(
      'Enter the domain name for deployment (e.g., "newclient", "democorp")'
    );

    console.log(`\n✅ Domain: ${this.config.domain}`);

    // Configuration discovery
    const tryDiscovery = await askYesNo(
      '🔍 Try to discover existing configuration for this domain?',
      'y'
    );

    if (tryDiscovery) {
      await this.tryConfigurationDiscovery();
    }

    // Environment selection
    await this.selectEnvironment();

    // Generate worker configuration
    this.generateWorkerConfiguration();

    // Validate configuration
    const confirmConfig = await askYesNo(
      'Is this configuration correct?', 
      'y'
    );

    if (!confirmConfig) {
      throw new Error('Configuration cancelled by user');
    }

    return {
      domain: this.config.domain,
      environment: this.config.environment,
      worker: this.config.worker
    };
  }

  /**
   * Gather multi-domain configuration
   */
  async gatherMultiDomainConfiguration() {
    console.log('\n🌍 Multi-Domain Configuration');
    console.log('-----------------------------');
    console.log('This feature allows coordinated deployment across multiple domains');
    
    const domainCount = parseInt(await askUser('How many domains to deploy? (2-10)', '2'));
    
    if (domainCount < 2 || domainCount > 10) {
      throw new Error('Domain count must be between 2 and 10');
    }

    const domains = [];
    for (let i = 0; i < domainCount; i++) {
      const domain = await askUser(`Enter domain ${i + 1}:`);
      if (!domain || !/^[a-z0-9-]+$/.test(domain)) {
        throw new Error(`Invalid domain format for domain ${i + 1}`);
      }
      domains.push(domain);
    }

    // Environment selection applies to all domains
    await this.selectEnvironment();

    // Configure coordination settings
    const enableSharedSecrets = await askYesNo(
      'Enable shared secrets across domains?',
      'n'
    );

    this.config.domains = domains;
    this.config.secrets = this.config.secrets || {};
    this.config.secrets.crossDomainSharing = enableSharedSecrets;

    console.log(`\n✅ Multi-domain mode: ${domainCount} domains configured`);
    domains.forEach((domain, idx) => {
      console.log(`   ${idx + 1}. ${domain}`);
    });

    return {
      domains: this.config.domains,
      environment: this.config.environment,
      coordination: {
        crossDomainSharing: enableSharedSecrets
      }
    };
  }

  /**
   * Gather portfolio configuration
   */
  async gatherPortfolioConfiguration() {
    console.log('\n📊 Portfolio Management Configuration');
    console.log('------------------------------------');
    console.log('This feature provides advanced portfolio management capabilities');
    
    const portfolioName = await askUser(
      'Enter portfolio name (e.g., "enterprise-suite", "client-portfolio")',
      'default-portfolio'
    );

    if (!/^[a-z0-9-]+$/.test(portfolioName)) {
      throw new Error('Portfolio name must contain only lowercase letters, numbers, and hyphens');
    }

    // Environment selection
    await this.selectEnvironment();

    // Portfolio-specific settings
    const enableContinuousMonitoring = await askYesNo(
      'Enable continuous monitoring for portfolio?',
      'y'
    );

    const enableAutomaticScaling = await askYesNo(
      'Enable automatic scaling across portfolio?',
      'n'
    );

    this.config.portfolioName = portfolioName;
    this.config.portfolio = {
      enableContinuousMonitoring,
      enableAutomaticScaling,
      crossDomainCoordination: true
    };

    console.log('\n✅ Portfolio mode configured:');
    console.log(`   Portfolio: ${portfolioName}`);
    console.log(`   Environment: ${this.config.environment}`);
    console.log(`   Monitoring: ${enableContinuousMonitoring ? 'Enabled' : 'Disabled'}`);

    return {
      portfolioName: this.config.portfolioName,
      environment: this.config.environment,
      portfolio: this.config.portfolio
    };
  }

  /**
   * Enhanced interactive environment selection
   */
  async selectEnvironment() {
    // Use enhanced environment selector with built-in warnings
    const envChoice = await this.interactiveUtils.askEnvironment(0);
    this.config.environment = this.supportedEnvironments[envChoice];
    
    // Environment-specific warnings
    if (this.config.environment === 'production') {
      console.log('\n⚠️  Production Environment Selected:');
      console.log('   - Enhanced security validation will be performed');
      console.log('   - Backup and recovery mechanisms will be enabled');
      console.log('   - Performance monitoring will be activated');
      
      const confirmProd = await askYesNo('Continue with production deployment?', 'y');
      if (!confirmProd) {
        throw new Error('Production deployment cancelled');
      }
    }

    console.log(`✅ Environment: ${this.config.environment}`);
    return this.config.environment;
  }

  /**
   * Generate worker configuration based on domain and environment
   */
  generateWorkerConfiguration() {
    if (!this.config.domain) {
      throw new Error('Domain is required to generate worker configuration');
    }

    const baseName = `${this.config.domain}-data-service`;
    const envSuffix = this.config.environment === 'production' ? '' : `-${this.config.environment}`;
    
    this.config.worker = {
      name: `${baseName}${envSuffix}`,
      url: `https://${baseName}${envSuffix}.tamylatrading.workers.dev`,
      environment: this.config.environment,
      script: `src/workers/${this.config.domain}/index.js`
    };

    console.log(`\n🔧 Generated Worker Configuration:`);
    console.log(`   Name: ${this.config.worker.name}`);
    console.log(`   URL: ${this.config.worker.url}`);
    console.log(`   Script: ${this.config.worker.script}`);

    return this.config.worker;
  }

  /**
   * Try to discover existing configuration for the domain
   */
  async tryConfigurationDiscovery() {
    if (!this.domainDiscovery) {
      console.log('   ⚠️ Domain discovery not available');
      return null;
    }

    try {
      console.log('   🔍 Searching for existing configuration...');
      
      const discoveredConfig = await this.domainDiscovery.discoverConfiguration(this.config.domain);
      
      if (discoveredConfig) {
        console.log('   ✅ Found existing configuration:');
        console.log(`      Worker: ${discoveredConfig.workerName}`);
        console.log(`      Database: ${discoveredConfig.databaseName}`);
        
        const useDiscovered = await askYesNo('Use discovered configuration?', 'y');
        
        if (useDiscovered) {
          this.config.worker = { ...this.config.worker, ...discoveredConfig.worker };
          this.config.database = { ...this.config.database, ...discoveredConfig.database };
          console.log('   ✅ Using discovered configuration');
          return discoveredConfig;
        }
      } else {
        console.log('   ℹ️ No existing configuration found');
      }
    } catch (error) {
      console.log(`   ⚠️ Configuration discovery failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Validate environment configuration
   */
  validateEnvironmentConfiguration() {
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!this.config.environment) {
      errors.push('Environment not selected');
    }

    if (!this.supportedEnvironments.includes(this.config.environment)) {
      errors.push(`Unsupported environment: ${this.config.environment}`);
    }

    if (!this.config.deploymentMode) {
      errors.push('Deployment mode not selected');
    }

    if (!this.deploymentModes.includes(this.config.deploymentMode)) {
      errors.push(`Unsupported deployment mode: ${this.config.deploymentMode}`);
    }

    // Mode-specific validation
    switch (this.config.deploymentMode) {
      case 'single':
        if (!this.config.domain) {
          errors.push('Domain required for single-domain deployment');
        }
        break;
      case 'multi-domain':
        if (!this.config.domains || this.config.domains.length < 2) {
          errors.push('At least 2 domains required for multi-domain deployment');
        }
        break;
      case 'portfolio':
        if (!this.config.portfolioName) {
          errors.push('Portfolio name required for portfolio deployment');
        }
        break;
    }

    // Environment-specific warnings
    if (this.config.environment === 'production' && !this.config.database?.enableBackup) {
      warnings.push('Database backup not enabled for production environment');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    return {
      environment: this.config.environment,
      deploymentMode: this.config.deploymentMode,
      domain: this.config.domain,
      domains: this.config.domains,
      portfolioName: this.config.portfolioName,
      worker: this.config.worker,
      orchestrator: this.orchestrator,
      coordinator: this.coordinator,
      domainDiscovery: this.domainDiscovery
    };
  }

  /**
   * Clean up environment resources
   */
  async cleanup() {
    if (this.coordinator) {
      await this.coordinator.cleanup();
    }
    
    if (this.orchestrator) {
      await this.orchestrator.cleanup();
    }

    console.log('✅ Environment manager cleanup completed');
  }
}