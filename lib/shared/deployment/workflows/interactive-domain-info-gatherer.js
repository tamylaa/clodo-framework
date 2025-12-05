/**
 * Interactive Domain Info Gatherer Module
 * 
 * Provides reusable domain configuration gathering workflows.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module interactive-domain-info-gatherer
 */

import { askUser, askYesNo, askChoice } from '../../utils/interactive-prompts.js';

/**
 * Interactive Domain Info Gatherer
 * Handles domain information gathering with configuration discovery
 */
export class InteractiveDomainInfoGatherer {
  /**
   * @param {Object} options - Configuration options
   * @param {Object} options.configCache - ConfigurationCacheManager instance
   * @param {boolean} options.interactive - Enable interactive prompts
   */
  constructor(options = {}) {
    this.configCache = options.configCache;
    this.interactive = options.interactive !== false;
  }

  /**
   * Gather single domain information
   * 
   * @param {Object} config - Configuration object to populate
   * @returns {Promise<Object>} Updated configuration
   */
  async gatherSingleDomainInfo(config) {
    console.log('\n📱 Single Domain Configuration');
    console.log('------------------------------');

    // Domain name with enhanced validation
    config.domain = await this.promptForDomain();

    console.log(`\n✅ Domain: ${config.domain}`);

    // Try configuration discovery if available
    if (this.configCache) {
      const discovered = await this.tryConfigurationDiscovery(config.domain);
      if (discovered) {
        this.applyDiscoveredConfig(config, discovered);
      }
    }

    // Environment selection
    config.environment = await this.selectEnvironment();
    console.log(`✅ Environment: ${config.environment}`);

    // Generate worker configuration
    await this.configureWorker(config);

    return config;
  }

  /**
   * Prompt for domain name
   * 
   * @returns {Promise<string>} Domain name
   */
  async promptForDomain() {
    const domain = await askUser(
      'Enter the domain name for deployment (e.g., "newclient", "democorp")'
    );

    if (!domain || domain.trim().length === 0) {
      throw new Error('Domain name is required');
    }

    return domain.trim();
  }

  /**
   * Select deployment environment
   * 
   * @returns {Promise<string>} Selected environment
   */
  async selectEnvironment() {
    const environments = ['production', 'staging', 'development'];
    
    if (!this.interactive) {
      return environments[0]; // Default to production in non-interactive mode
    }

    const envChoice = await askChoice(
      'Select deployment environment:', 
      environments,
      0
    );
    
    return environments[envChoice];
  }

  /**
   * Configure worker settings
   * 
   * @param {Object} config - Configuration object
   * @returns {Promise<void>}
   */
  async configureWorker(config) {
    // Generate default worker configuration
    config.worker = config.worker || {};
    config.worker.name = `${config.domain}-data-service`;
    config.worker.url = `https://${config.worker.name}.tamylatrading.workers.dev`;
    
    console.log(`\n🔧 Generated Configuration:`);
    console.log(`   Worker Name: ${config.worker.name}`);  
    console.log(`   Worker URL: ${config.worker.url}`);

    if (!this.interactive) {
      return; // Use defaults in non-interactive mode
    }

    const confirmWorkerConfig = await askYesNo(
      'Is this worker configuration correct?', 
      'y'
    );

    if (!confirmWorkerConfig) {
      config.worker.name = await askUser(
        'Enter custom worker name', 
        config.worker.name
      );
      config.worker.url = `https://${config.worker.name}.tamylatrading.workers.dev`;
      console.log(`\n✅ Updated worker configuration`);
    }
  }

  /**
   * Try to discover existing configuration for domain
   * 
   * @param {string} domain - Domain name
   * @returns {Promise<Object|null>} Discovered configuration or null
   */
  async tryConfigurationDiscovery(domain) {
    if (!this.configCache) {
      return null;
    }

    if (!this.interactive) {
      // Non-interactive mode: silently try discovery
      try {
        return await this.configCache.getOrCreateDomainConfig(
          domain,
          { environment: 'production', forceRefresh: false }
        );
      } catch (error) {
        return null;
      }
    }

    // Interactive mode: ask user
    const tryDiscovery = await askYesNo(
      '🔍 Try to discover existing configuration for this domain?',
      'y'
    );

    if (!tryDiscovery) {
      return null;
    }

    try {
      console.log('\n🔍 Attempting configuration discovery...');
      
      const discoveredConfig = await this.configCache.getOrCreateDomainConfig(
        domain,
        { environment: 'production', forceRefresh: false }
      );

      if (discoveredConfig) {
        console.log('\n✅ Found existing configuration!');
        console.log(`   📝 Type: ${discoveredConfig.metadata?.type || 'unknown'}`);
        console.log(`   📅 Last updated: ${discoveredConfig.metadata?.timestamp || 'unknown'}`);
        
        const useDiscovered = await askYesNo('Use discovered configuration?', 'y');
        if (useDiscovered) {
          return discoveredConfig;
        }
      } else {
        console.log('   ℹ️  No existing configuration found, will generate new one');
      }
    } catch (error) {
      console.log(`   ⚠️  Discovery failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Apply discovered configuration to config object
   * 
   * @param {Object} config - Configuration object to update
   * @param {Object} discovered - Discovered configuration
   */
  applyDiscoveredConfig(config, discovered) {
    if (discovered.worker) {
      config.worker = config.worker || {};
      config.worker.name = discovered.worker.name || `${config.domain}-data-service`;
      config.worker.url = discovered.worker.url;
    }
    
    if (discovered.database) {
      config.database = config.database || {};
      config.database.name = discovered.database.name;
      config.database.id = discovered.database.id;
    }

    if (discovered.environment) {
      config.environment = discovered.environment;
    }

    console.log('\n✅ Applied discovered configuration');
  }

  /**
   * Gather multi-domain information
   * 
   * @returns {Promise<Object>} Multi-domain configuration
   */
  async gatherMultiDomainInfo() {
    console.log('\n🌍 Multi-Domain Configuration');
    console.log('-----------------------------');
    console.log('This feature allows coordinated deployment across multiple domains');
    
    const domainCount = await askUser('How many domains to deploy? (2-10)', '2');
    const count = parseInt(domainCount, 10);

    if (isNaN(count) || count < 2 || count > 10) {
      throw new Error('Domain count must be between 2 and 10');
    }

    console.log(`\n✅ Multi-domain mode: ${count} domains`);

    const domains = [];
    for (let i = 0; i < count; i++) {
      const domain = await askUser(`Enter domain ${i + 1} name:`);
      domains.push(domain);
    }

    return {
      mode: 'multi-domain',
      count,
      domains
    };
  }

  /**
   * Gather portfolio information
   * 
   * @returns {Promise<Object>} Portfolio configuration
   */
  async gatherPortfolioInfo() {
    console.log('\n📊 Portfolio Management Configuration');
    console.log('------------------------------------');
    console.log('This feature provides advanced portfolio management capabilities');
    
    const portfolioName = await askUser('Enter portfolio name:', 'default-portfolio');
    
    console.log(`\n✅ Portfolio mode activated: ${portfolioName}`);

    return {
      mode: 'portfolio',
      name: portfolioName
    };
  }

  /**
   * Get domain info summary
   * 
   * @param {Object} config - Configuration
   * @returns {string} Summary message
   */
  getSummary(config) {
    const parts = [
      `Domain: ${config.domain}`,
      `Environment: ${config.environment}`,
      `Worker: ${config.worker?.name}`
    ];

    if (config.database?.name) {
      parts.push(`Database: ${config.database.name}`);
    }

    return `✅ Domain configuration: ${parts.join(' | ')}`;
  }
}
