/**
 * Domain Resolver Module
 * Handles domain discovery, validation, and configuration generation
 * Extracted from MultiDomainOrchestrator for focused responsibility
 */

export class DomainResolver {
  constructor(options = {}) {
    this.environment = options.environment || 'production';
    this.validationLevel = options.validationLevel || 'basic';
    this.cacheEnabled = options.cacheEnabled !== false;
    this.domainCache = new Map();
  }

  /**
   * Generate standardized domain configuration
   * @param {string} domain - Domain name
   * @returns {Object} Domain configuration object
   */
  generateDomainConfig(domain) {
    if (this.cacheEnabled && this.domainCache.has(domain)) {
      return this.domainCache.get(domain);
    }

    const cleanDomain = domain.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    
    const config = {
      name: domain,
      cleanName: cleanDomain,
      productionName: `${cleanDomain}-data-service`,
      database: {
        name: `${cleanDomain}-auth-db`,
        id: null // Will be discovered/created
      },
      worker: {
        name: `${cleanDomain}-data-service`
      },
      environments: {
        production: domain,
        staging: `staging.${domain}`,
        development: `dev.${domain}`
      },
      metadata: {
        generated: new Date().toISOString(),
        environment: this.environment
      }
    };

    if (this.cacheEnabled) {
      this.domainCache.set(domain, config);
    }

    return config;
  }

  /**
   * Validate domain prerequisites
   * @param {string} domain - Domain to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateDomainPrerequisites(domain) {
    console.log(`   🔍 Validating ${domain} prerequisites...`);
    
    const validation = {
      domain,
      valid: true,
      issues: [],
      warnings: []
    };

    try {
      // Validate Cloudflare token
      if (!process.env.CLOUDFLARE_API_TOKEN) {
        validation.warnings.push('CLOUDFLARE_API_TOKEN not yet configured (will be set during deployment)');
      }
      
      // Validate Cloudflare account ID
      if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
        validation.warnings.push('CLOUDFLARE_ACCOUNT_ID not yet configured (will be set during deployment)');
      }
      
      // Validate domain format
      if (!this.isValidDomainFormat(domain)) {
        validation.valid = false;
        validation.issues.push(`Invalid domain format: ${domain}`);
      }

      // Additional validation based on level
      if (this.validationLevel === 'comprehensive') {
        await this.performComprehensiveValidation(domain, validation);
      }

    } catch (error) {
      validation.valid = false;
      validation.issues.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Resolve multiple domains with their configurations
   * @param {Array} domains - Array of domain names
   * @returns {Promise<Array>} Array of resolved domain configurations
   */
  async resolveMultipleDomains(domains) {
    const resolved = [];
    
    for (const domain of domains) {
      const config = this.generateDomainConfig(domain);
      const validation = await this.validateDomainPrerequisites(domain);
      
      resolved.push({
        ...config,
        validation,
        isValid: validation.valid
      });
    }

    return resolved;
  }

  /**
   * Discover domains from configuration files or runtime
   * @param {Object} options - Discovery options
   * @returns {Promise<Array>} Discovered domains
   */
  async discoverDomains(options = {}) {
    const discovered = [];
    
    if (options.sources?.includes('config')) {
      const configDomains = await this.discoverFromConfig();
      discovered.push(...configDomains);
    }

    if (options.sources?.includes('runtime')) {
      const runtimeDomains = await this.discoverFromRuntime();
      discovered.push(...runtimeDomains);
    }

    // Remove duplicates and validate
    const uniqueDomains = [...new Set(discovered)];
    return await this.resolveMultipleDomains(uniqueDomains);
  }

  /**
   * Check if domain format is valid
   * @param {string} domain - Domain to check
   * @returns {boolean} Valid status
   */
  isValidDomainFormat(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  /**
   * Perform comprehensive domain validation
   * @param {string} domain - Domain to validate
   * @param {Object} validation - Validation object to update
   */
  async performComprehensiveValidation(domain, validation) {
    // Check domain accessibility (basic DNS check)
    try {
      // Note: In a real implementation, this would do DNS lookups
      // For now, just simulate validation
      if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
        validation.warnings.push('Using local domain - may not be accessible externally');
      }
    } catch (error) {
      validation.warnings.push(`DNS validation failed: ${error.message}`);
    }
  }

  /**
   * Discover domains from configuration files
   * @returns {Promise<Array>} Configuration-based domains
   */
  async discoverFromConfig() {
    // Placeholder - would read from actual config files
    console.log('   📂 Discovering domains from configuration...');
    return [];
  }

  /**
   * Discover domains from runtime (e.g., Cloudflare API)
   * @returns {Promise<Array>} Runtime-discovered domains
   */
  async discoverFromRuntime() {
    // Placeholder - would query Cloudflare API or other runtime sources
    console.log('   🌐 Discovering domains from runtime...');
    return [];
  }

  /**
   * Clear domain configuration cache
   */
  clearCache() {
    this.domainCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.domainCache.size,
      enabled: this.cacheEnabled
    };
  }
}
