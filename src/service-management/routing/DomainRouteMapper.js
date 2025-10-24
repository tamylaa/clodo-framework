/**
 * DomainRouteMapper - Maps domain configurations to route patterns
 * 
 * Handles the business logic of converting domain metadata into
 * Cloudflare Workers route patterns with proper specificity ordering.
 * 
 * @module service-management/routing/DomainRouteMapper
 */

import { frameworkConfig } from '../../utils/framework-config.js';

export class DomainRouteMapper {
  constructor(options = {}) {
    // Load environment-specific routing config
    this.frameworkConfig = frameworkConfig;
    this.options = options;
  }

  /**
   * Map domain configuration to route patterns
   * 
   * @param {Object} domainConfig - Domain configuration object
   * @param {Object} domainConfig.domains - Domain URLs by environment
   * @param {string} domainConfig.zoneId - Cloudflare zone ID
   * @param {string} domainConfig.apiBasePath - API base path (optional)
   * @param {string} environment - Target environment (production|staging|development)
   * 
   * @returns {Object} Route mapping with patterns and zone_id
   * @returns {Array<string>} returns.patterns - Route patterns (ordered by specificity)
   * @returns {string} returns.zoneId - Cloudflare zone ID
   * @returns {string} returns.environment - Environment name
   * 
   * @example
   * const mapper = new DomainRouteMapper();
   * const routes = mapper.mapDomainToRoutes(
   *   {
   *     domains: { production: 'api.example.com' },
   *     zoneId: 'xyz789...',
   *     apiBasePath: '/api'
   *   },
   *   'production'
   * );
   * // Returns:
   * // {
   * //   patterns: ['api.example.com/*', 'example.com/api/*'],
   * //   zoneId: 'xyz789...',
   * //   environment: 'production'
   * // }
   */
  mapDomainToRoutes(domainConfig, environment) {
    const domainUrl = domainConfig.domains[environment];

    if (!domainUrl) {
      return {
        patterns: [],
        zoneId: domainConfig.zoneId,
        environment
      };
    }

    // Skip workers.dev subdomains (no routes needed)
    const routingConfig = this.frameworkConfig.getRoutingConfig();
    const workersDomain = routingConfig.domains.workersDomain;
    if (domainUrl.includes(workersDomain)) {
      return {
        patterns: [],
        zoneId: domainConfig.zoneId,
        environment
      };
    }

    // Generate route patterns based on environment
    let patterns;
    switch (environment) {
      case 'production':
        patterns = this.generateProductionRoutes(domainUrl, domainConfig);
        break;
      case 'staging':
        patterns = this.generateStagingRoutes(domainUrl, domainConfig);
        break;
      case 'development':
        patterns = this.generateDevelopmentRoutes(domainUrl, domainConfig);
        break;
      default:
        patterns = this._generateGenericRoutes(domainUrl, domainConfig);
    }

    return {
      patterns,
      zoneId: domainConfig.zoneId,
      environment
    };
  }

  /**
   * Generate production environment routes
   * 
   * Creates subdomain pattern and root domain fallback
   * 
   * @param {string} domain - Domain URL (e.g., api.example.com)
   * @param {Object} config - Domain configuration
   * @returns {Array<string>} Route patterns (ordered by specificity)
   * 
   * @example
   * mapper.generateProductionRoutes('api.example.com', { apiBasePath: '/api' })
   * // Returns: ['api.example.com/*', 'example.com/api/*']
   */
  generateProductionRoutes(domain, config = {}) {
    const patterns = [];

    // Check if it's a subdomain
    const isSubdomain = this._isSubdomain(domain);

    if (isSubdomain) {
      // 1. Subdomain wildcard (most specific)
      patterns.push(`${domain}/*`);

      // 2. Root domain with path fallback
      const rootDomain = this._getRootDomain(domain);
      const pathPrefix = config.apiBasePath || this._getSubdomainPrefix(domain);
      patterns.push(`${rootDomain}${pathPrefix}/*`);
    } else {
      // Root domain only
      const envRouting = this.frameworkConfig.getEnvironmentRoutingConfig('production');
      const pathPrefix = config.apiBasePath || envRouting.defaultPathPrefix;
      patterns.push(`${domain}${pathPrefix}/*`);
    }

    return patterns;
  }

  /**
   * Generate staging environment routes
   * 
   * Similar to production but with staging-specific patterns
   * 
   * @param {string} domain - Domain URL (e.g., staging-api.example.com)
   * @param {Object} config - Domain configuration
   * @returns {Array<string>} Route patterns (ordered by specificity)
   */
  generateStagingRoutes(domain, config = {}) {
    const patterns = [];

    // Check if it's a subdomain
    const isSubdomain = this._isSubdomain(domain);

    if (isSubdomain) {
      // 1. Staging subdomain wildcard
      patterns.push(`${domain}/*`);

      // 2. Root domain with staging path fallback
      const rootDomain = this._getRootDomain(domain);
      const pathPrefix = config.apiBasePath || this._getSubdomainPrefix(domain);
      patterns.push(`${rootDomain}${pathPrefix}/*`);
    } else {
      // Root domain only
      const envRouting = this.frameworkConfig.getEnvironmentRoutingConfig('staging');
      const pathPrefix = config.apiBasePath || envRouting.defaultPathPrefix;
      patterns.push(`${domain}${pathPrefix}/*`);
    }

    return patterns;
  }

  /**
   * Generate development environment routes
   * 
   * Development typically uses workers.dev subdomain (no routes needed)
   * Only generate routes if custom domain explicitly specified
   * 
   * @param {string} domain - Domain URL
   * @param {Object} config - Domain configuration
   * @returns {Array<string>} Route patterns (usually empty)
   */
  generateDevelopmentRoutes(domain, config = {}) {
    // Development typically uses *.workers.dev (no routes needed)
    const routingConfig = this.frameworkConfig.getRoutingConfig();
    const workersDomain = routingConfig.domains.workersDomain;
    if (!domain || domain.includes(workersDomain)) {
      return [];
    }

    // If custom domain specified for development, generate routes
    const patterns = [];
    const isSubdomain = this._isSubdomain(domain);

    if (isSubdomain) {
      patterns.push(`${domain}/*`);
      
      const rootDomain = this._getRootDomain(domain);
      const pathPrefix = config.apiBasePath || this._getSubdomainPrefix(domain);
      patterns.push(`${rootDomain}${pathPrefix}/*`);
    } else {
      const envRouting = this.frameworkConfig.getEnvironmentRoutingConfig('development');
      const pathPrefix = config.apiBasePath || envRouting.defaultPathPrefix;
      patterns.push(`${domain}${pathPrefix}/*`);
    }

    return patterns;
  }

  /**
   * Generate generic routes (for any environment)
   * @private
   */
  _generateGenericRoutes(domain, config = {}) {
    const patterns = [];
    const isSubdomain = this._isSubdomain(domain);

    if (isSubdomain) {
      patterns.push(`${domain}/*`);
      
      const rootDomain = this._getRootDomain(domain);
      const pathPrefix = config.apiBasePath || this._getSubdomainPrefix(domain);
      patterns.push(`${rootDomain}${pathPrefix}/*`);
    } else {
      const envRouting = this.frameworkConfig.getEnvironmentRoutingConfig('production');
      const pathPrefix = config.apiBasePath || envRouting.defaultPathPrefix;
      patterns.push(`${domain}${pathPrefix}/*`);
    }

    return patterns;
  }

  /**
   * Check if domain is a subdomain
   * @private
   * 
   * @param {string} domain - Domain name
   * @returns {boolean} True if subdomain, false if root domain
   * 
   * @example
   * _isSubdomain('api.example.com')  // true
   * _isSubdomain('example.com')      // false
   * _isSubdomain('www.example.com')  // true
   */
  _isSubdomain(domain) {
    if (!domain) return false;

    const parts = domain.split('.');
    
    // At least 3 parts = subdomain (e.g., api.example.com)
    // 2 parts = root domain (e.g., example.com)
    // Account for TLDs like .co.uk (4+ parts)
    return parts.length >= 3;
  }

  /**
   * Extract root domain from subdomain
   * @private
   * 
   * @param {string} domain - Full domain (e.g., api.example.com)
   * @returns {string} Root domain (e.g., example.com)
   * 
   * @example
   * _getRootDomain('api.example.com')          // 'example.com'
   * _getRootDomain('staging-api.example.com')  // 'example.com'
   * _getRootDomain('example.com')              // 'example.com'
   */
  _getRootDomain(domain) {
    if (!domain) return '';

    const parts = domain.split('.');

    // Handle different TLD formats
    if (parts.length <= 2) {
      // Already root domain
      return domain;
    }

    // Extract last 2 parts (handles .com, .org, etc.)
    // TODO: Handle complex TLDs like .co.uk (requires TLD database)
    return parts.slice(-2).join('.');
  }

  /**
   * Extract subdomain prefix and convert to path
   * @private
   * 
   * @param {string} domain - Full domain (e.g., api.example.com)
   * @returns {string} Path prefix (e.g., /api)
   * 
   * @example
   * _getSubdomainPrefix('api.example.com')          // '/api'
   * _getSubdomainPrefix('staging-api.example.com')  // '/staging-api'
   * _getSubdomainPrefix('www.example.com')          // '/www'
   */
  _getSubdomainPrefix(domain) {
    if (!domain) return '';

    const parts = domain.split('.');
    
    if (parts.length < 3) {
      // Not a subdomain
      return '';
    }

    // Get first part (subdomain)
    const subdomain = parts[0];
    
    // Convert to path (add leading slash)
    return `/${subdomain}`;
  }

  /**
   * Get zone ID for domain
   * 
   * Extracts zone_id from coreInputs with validation
   * 
   * @param {string} domain - Domain name
   * @param {Object} coreInputs - Core service inputs
   * @returns {string} Cloudflare zone ID
   * @throws {Error} If zone_id missing or invalid format
   */
  getZoneIdForDomain(domain, coreInputs) {
    if (!coreInputs || !coreInputs.cloudflareZoneId) {
      throw new Error(
        `cloudflareZoneId is required for domain "${domain}" route generation`
      );
    }

    const zoneId = coreInputs.cloudflareZoneId;

    // Validate zone_id format (32 hex characters)
    const zoneIdPattern = /^[a-f0-9]{32}$/;
    if (!zoneIdPattern.test(zoneId)) {
      throw new Error(
        `Invalid zone_id format for domain "${domain}". ` +
        `Expected 32 hex characters, received: "${zoneId}"`
      );
    }

    return zoneId;
  }
}
