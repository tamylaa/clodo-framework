/**
 * Interactive Domain Selector
 *
 * Enterprise-grade interactive domain selection system providing intelligent
 * domain discovery, user-friendly prompts, service creation workflows, and
 * comprehensive domain verification for enterprise deployment scenarios.
 *
 * @author Clodo Framework Team
 * @version 2.0.0
 * @since 2025-10-29
 */

import { EventEmitter } from 'events';

// Enterprise utility imports
import { Logger } from '../logging/Logger.js';
import { ErrorClassifier } from '../error-handling/error-classifier.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { CloudflareAPI } from '../../../src/utils/cloudflare/api.js';

// Interactive utilities
import { askChoice, askUser, closePrompts } from '../utils/interactive-prompts.js';

// Core domain modules
import { DomainDiscovery } from '../cloudflare/domain-discovery.js';
import { CloudflareDomainManager } from '../cloudflare/domain-manager.js';

/**
 * Interactive Domain Selection Configuration
 * @typedef {Object} InteractiveDomainConfig
 * @property {boolean} enableServiceCreation - Allow service creation during selection
 * @property {boolean} enableDomainVerification - Enable Cloudflare domain verification
 * @property {Array<string>} preferredDomains - List of preferred domains
 * @property {Object} discovery - Domain discovery configuration
 * @property {Object} validation - Domain validation rules
 * @property {Object} prompts - Interactive prompt configuration
 */

/**
 * Domain Selection Context
 * @typedef {Object} DomainSelectionContext
 * @property {string} sessionId - Unique selection session ID
 * @property {string} purpose - Selection purpose (deployment, testing, etc.)
 * @property {Array<string>} availableDomains - Discovered available domains
 * @property {Object} userPreferences - User selection preferences
 * @property {Date} startTime - Selection start time
 */

/**
 * Domain Selection Result
 * @typedef {Object} DomainSelectionResult
 * @property {boolean} success - Whether selection succeeded
 * @property {string} selectedDomain - Selected domain name
 * @property {boolean} serviceCreated - Whether a new service was created
 * @property {Object} domainInfo - Domain information and verification results
 * @property {Array} interactionLog - Log of user interactions
 * @property {number} duration - Selection duration
 */

/**
 * Interactive Domain Selector
 *
 * Provides intelligent, user-friendly domain selection with enterprise features
 * including automatic discovery, service creation workflows, domain verification,
 * and comprehensive error handling.
 */
export class InteractiveDomainSelector extends EventEmitter {
  /**
   * Create Interactive Domain Selector
   * @param {InteractiveDomainConfig} config - Selector configuration
   */
  constructor(config = {}) {
    super();

    // Initialize core configuration
    this.config = this._initializeConfiguration(config);

    // Initialize core components
    this.logger = new Logger({
      level: this.config.logging?.level || 'info',
      prefix: '[Interactive-Selector]',
      enableFileLogging: this.config.logging?.enableFileLogging || false
    });

    this.errorClassifier = new ErrorClassifier();
    this.configManager = new ConfigurationManager();

    // Initialize selection state
    this.selectionSessions = new Map();
    this.domainCache = new Map();
    this.interactionHistory = [];

    // Initialize metrics
    this.metrics = {
      totalSelections: 0,
      successfulSelections: 0,
      serviceCreations: 0,
      averageDuration: 0,
      lastSelectionTime: null
    };

    this.logger.info('Interactive Domain Selector initialized', {
      enableServiceCreation: this.config.enableServiceCreation,
      enableDomainVerification: this.config.enableDomainVerification
    });
  }

  /**
   * Initialize configuration with enterprise defaults
   * @private
   * @param {Object} userConfig - User-provided configuration
   * @returns {InteractiveDomainConfig} Complete configuration
   */
  _initializeConfiguration(userConfig) {
    const defaults = {
      enableServiceCreation: true,
      enableDomainVerification: true,
      preferredDomains: [],
      discovery: {
        enableCaching: true,
        cacheTimeout: 300000, // 5 minutes
        maxDiscoveryAttempts: 3
      },
      validation: {
        requireVerification: true,
        allowUnavailableDomains: false,
        checkExistingServices: true
      },
      prompts: {
        showDomainStatus: true,
        showServiceInfo: true,
        enableAdvancedOptions: true,
        timeout: 300000 // 5 minutes
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        logDirectory: './logs/domain-selection'
      }
    };

    return this.configManager.mergeConfigurations(defaults, userConfig);
  }

  /**
   * Initialize selector components
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing Interactive Domain Selector components...');

      // Initialize domain discovery
      this.domainDiscovery = new DomainDiscovery({
        enableCaching: this.config.discovery.enableCaching,
        cacheTimeout: this.config.discovery.cacheTimeout
      });

      // Initialize Cloudflare domain manager
      this.domainManager = new CloudflareDomainManager();

      // Initialize Cloudflare API if available
      if (this.config.enableDomainVerification) {
        this.cloudflareAPI = new CloudflareAPI({
          timeout: 30000,
          retries: 2
        });
      }

      // Initialize domain discovery
      await this.domainDiscovery.initializeDiscovery();

      this.logger.info('Interactive Domain Selector initialization completed');

    } catch (error) {
      this.logger.error('Failed to initialize Interactive Domain Selector', { error: error.message });
      throw this.errorClassifier.classifyError(error, 'selector_initialization');
    }
  }

  /**
   * Perform interactive domain selection
   * @param {Object} options - Selection options
   * @returns {Promise<DomainSelectionResult>} Selection result
   */
  async selectDomain(options = {}) {
    const sessionId = this._generateSessionId();
    const context = this._createSelectionContext(sessionId, options);

    this.logger.info('Starting interactive domain selection', { sessionId });

    try {
      // Track active session
      this.selectionSessions.set(sessionId, { status: 'initializing', context });

      // Emit selection started event
      this.emit('selectionStarted', context);

      // Phase 1: Discover available domains
      const availableDomains = await this._discoverAvailableDomains(context);

      // Phase 2: Present domain selection interface
      const selectionResult = await this._presentDomainSelection(availableDomains, context);

      // Phase 3: Handle service creation if needed
      const finalResult = await this._handleServiceCreationWorkflow(selectionResult, context);

      // Phase 4: Finalize selection
      const completedResult = await this._finalizeDomainSelection(finalResult, context);

      // Update metrics
      this._updateMetrics(completedResult);

      this.logger.info('Interactive domain selection completed successfully', {
        sessionId,
        selectedDomain: completedResult.selectedDomain,
        serviceCreated: completedResult.serviceCreated,
        duration: completedResult.duration
      });

      return completedResult;

    } catch (error) {
      this.logger.error('Interactive domain selection failed', {
        sessionId,
        error: error.message,
        stack: error.stack
      });

      // Create failure result
      const failureResult = this._createFailureResult(sessionId, error, context);

      // Update metrics
      this._updateMetrics(failureResult);

      throw failureResult;

    } finally {
      // Cleanup
      this.selectionSessions.delete(sessionId);
      this.emit('selectionCompleted', context);
    }
  }

  /**
   * Discover available domains
   * @private
   * @param {DomainSelectionContext} context - Selection context
   * @returns {Promise<Array>} Available domains
   */
  async _discoverAvailableDomains(context) {
    this.logger.info('Discovering available domains');

    this.emit('domainDiscoveryStarted', context);

    try {
      // Try cache first
      const cacheKey = 'available_domains';
      let domains = this.domainCache.get(cacheKey);

      if (!domains || this._isCacheExpired(cacheKey)) {
        // Discover domains from various sources
        domains = await this._performDomainDiscovery();

        // Cache results
        this.domainCache.set(cacheKey, {
          domains,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.config.discovery.cacheTimeout
        });
      }

      // Filter and prioritize domains
      const filteredDomains = this._filterAndPrioritizeDomains(domains, context);

      this.logger.info(`Domain discovery completed: ${filteredDomains.length} domains available`);
      this.emit('domainDiscoveryCompleted', { domains: filteredDomains, context });

      return filteredDomains;

    } catch (error) {
      this.logger.error('Domain discovery failed', { error: error.message });
      this.emit('domainDiscoveryFailed', { context, error });
      throw error;
    }
  }

  /**
   * Perform comprehensive domain discovery
   * @private
   * @returns {Promise<Array>} Discovered domains
   */
  async _performDomainDiscovery() {
    const discoveredDomains = new Set();

    // Method 1: Cloudflare domain discovery
    try {
      const cloudflareDomains = await this.domainDiscovery.discoverAllDomains();
      cloudflareDomains.forEach(domain => discoveredDomains.add(domain));
    } catch (error) {
      this.logger.warn('Cloudflare domain discovery failed', { error: error.message });
    }

    // Method 2: Configuration-based domains
    try {
      const configDomains = await this._loadConfiguredDomains();
      configDomains.forEach(domain => discoveredDomains.add(domain));
    } catch (error) {
      this.logger.warn('Configuration domain loading failed', { error: error.message });
    }

    // Method 3: Preferred domains
    this.config.preferredDomains.forEach(domain => discoveredDomains.add(domain));

    return Array.from(discoveredDomains);
  }

  /**
   * Load domains from configuration
   * @private
   * @returns {Promise<Array>} Configured domains
   */
  async _loadConfiguredDomains() {
    // This would integrate with domain configuration management
    // For now, return empty array
    return [];
  }

  /**
   * Filter and prioritize domains
   * @private
   * @param {Array} domains - Raw domains
   * @param {DomainSelectionContext} context - Selection context
   * @returns {Array} Filtered and prioritized domains
   */
  _filterAndPrioritizeDomains(domains, context) {
    // Apply filters and sorting
    let filtered = [...domains];

    // Remove invalid domains
    filtered = filtered.filter(domain => this._isValidDomainName(domain));

    // Prioritize preferred domains
    filtered.sort((a, b) => {
      const aPreferred = this.config.preferredDomains.includes(a);
      const bPreferred = this.config.preferredDomains.includes(b);

      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;

      // Alphabetical sort as secondary
      return a.localeCompare(b);
    });

    return filtered.slice(0, 50); // Limit to top 50
  }

  /**
   * Validate domain name format
   * @private
   * @param {string} domain - Domain name
   * @returns {boolean} Whether domain is valid
   */
  _isValidDomainName(domain) {
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * Check if cache is expired
   * @private
   * @param {string} cacheKey - Cache key
   * @returns {boolean} Whether cache is expired
   */
  _isCacheExpired(cacheKey) {
    const cached = this.domainCache.get(cacheKey);
    return !cached || Date.now() > cached.expiresAt;
  }

  /**
   * Present domain selection interface
   * @private
   * @param {Array} domains - Available domains
   * @param {DomainSelectionContext} context - Selection context
   * @returns {Promise<Object>} Selection result
   */
  async _presentDomainSelection(domains, context) {
    this.logger.info(`Presenting domain selection for ${domains.length} domains`);

    this.emit('domainSelectionPresented', { domains, context });

    // Create selection options
    const options = domains.map((domain, index) => ({
      name: this._formatDomainOption(domain, index),
      value: domain
    }));

    // Add additional options
    options.push(
      { name: '🔍 Search for a specific domain', value: 'search' },
      { name: '🏗️  Create a new service', value: 'create' },
      { name: '❌ Cancel selection', value: 'cancel' }
    );

    const choice = await askChoice(
      'Select a domain for deployment:',
      options.map(opt => opt.name),
      0
    );

    const selectedValue = options[choice].value;

    // Handle special selections
    if (selectedValue === 'search') {
      return await this._handleDomainSearch(context);
    } else if (selectedValue === 'create') {
      return { action: 'create_service', domain: null };
    } else if (selectedValue === 'cancel') {
      throw new Error('Domain selection cancelled by user');
    }

    return {
      action: 'select_domain',
      domain: selectedValue,
      domainInfo: await this._getDomainInfo(selectedValue)
    };
  }

  /**
   * Format domain option for display
   * @private
   * @param {string} domain - Domain name
   * @param {number} index - Option index
   * @returns {string} Formatted option
   */
  _formatDomainOption(domain, index) {
    let option = `${index + 1}. ${domain}`;

    if (this.config.prompts.showDomainStatus) {
      const status = this._getDomainStatusIndicator(domain);
      option = `${status} ${option}`;
    }

    if (this.config.preferredDomains.includes(domain)) {
      option = `⭐ ${option}`;
    }

    return option;
  }

  /**
   * Get domain status indicator
   * @private
   * @param {string} domain - Domain name
   * @returns {string} Status indicator
   */
  _getDomainStatusIndicator(domain) {
    // This would check actual domain status
    // For now, return generic indicators
    const cached = this.domainCache.get(`domain_${domain}`);
    if (cached?.status === 'verified') return '✅';
    if (cached?.status === 'unavailable') return '❌';
    return '❓';
  }

  /**
   * Handle domain search
   * @private
   * @param {DomainSelectionContext} context - Selection context
   * @returns {Promise<Object>} Search result
   */
  async _handleDomainSearch(context) {
    const searchTerm = await askUser('Enter domain name to search for:');

    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Search term is required');
    }

    // Search for matching domains
    const allDomains = await this._discoverAvailableDomains(context);
    const matches = allDomains.filter(domain =>
      domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matches.length === 0) {
      const createNew = await askChoice(
        `No domains found matching "${searchTerm}". What would you like to do?`,
        ['Try a different search', 'Create a new service', 'Cancel'],
        0
      );

      if (createNew === 0) {
        return await this._handleDomainSearch(context);
      } else if (createNew === 1) {
        return { action: 'create_service', domain: searchTerm };
      } else {
        throw new Error('Domain selection cancelled');
      }
    }

    // Present matches
    return await this._presentDomainSelection(matches, context);
  }

  /**
   * Get domain information
   * @private
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Domain information
   */
  async _getDomainInfo(domain) {
    try {
      if (this.config.enableDomainVerification) {
        const verification = await this.domainManager.verifyDomainWorkflow(domain);
        return {
          name: domain,
          verified: true,
          status: verification.domainStatus,
          recommendedAction: verification.recommendedAction,
          existingServices: verification.existingServices || []
        };
      }

      return {
        name: domain,
        verified: false,
        status: 'unknown'
      };

    } catch (error) {
      this.logger.warn(`Failed to get domain info for ${domain}`, { error: error.message });
      return {
        name: domain,
        verified: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Handle service creation workflow
   * @private
   * @param {Object} selectionResult - Selection result
   * @param {DomainSelectionContext} context - Selection context
   * @returns {Promise<Object>} Final selection result
   */
  async _handleServiceCreationWorkflow(selectionResult, context) {
    if (selectionResult.action !== 'create_service') {
      return selectionResult;
    }

    if (!this.config.enableServiceCreation) {
      throw new Error('Service creation is not enabled');
    }

    this.logger.info('Starting service creation workflow');
    this.emit('serviceCreationStarted', context);

    try {
      // Get service name
      const serviceName = await this._promptForServiceName();

      // Get domain name
      const domainName = selectionResult.domain || await this._promptForDomainName();

      // Create service
      const serviceResult = await this._createNewService(serviceName, domainName, context);

      this.logger.info('Service creation completed', {
        serviceName,
        domainName,
        serviceCreated: true
      });

      this.emit('serviceCreationCompleted', { serviceResult, context });

      return {
        action: 'service_created',
        domain: domainName,
        serviceCreated: true,
        serviceInfo: serviceResult
      };

    } catch (error) {
      this.logger.error('Service creation failed', { error: error.message });
      this.emit('serviceCreationFailed', { context, error });
      throw error;
    }
  }

  /**
   * Prompt for service name
   * @private
   * @returns {Promise<string>} Service name
   */
  async _promptForServiceName() {
    while (true) {
      const serviceName = await askUser('Enter service name (lowercase letters, numbers, hyphens only):');

      if (!serviceName || serviceName.trim() === '') {
        console.log('❌ Service name is required');
        continue;
      }

      const trimmed = serviceName.trim();
      if (!/^[a-z0-9-]+$/.test(trimmed)) {
        console.log('❌ Service name must contain only lowercase letters, numbers, and hyphens');
        console.log('💡 Example: data-service, user-auth, content-api');
        continue;
      }

      return trimmed;
    }
  }

  /**
   * Prompt for domain name
   * @private
   * @returns {Promise<string>} Domain name
   */
  async _promptForDomainName() {
    while (true) {
      const domainName = await askUser('Enter domain name for this service (e.g., api.example.com):');

      if (!domainName || domainName.trim() === '') {
        console.log('❌ Domain name is required');
        continue;
      }

      const trimmed = domainName.trim();
      if (!this._isValidDomainName(trimmed)) {
        console.log('❌ Invalid domain name format');
        continue;
      }

      return trimmed;
    }
  }

  /**
   * Create new service
   * @private
   * @param {string} serviceName - Service name
   * @param {string} domainName - Domain name
   * @param {DomainSelectionContext} context - Selection context
   * @returns {Promise<Object>} Service creation result
   */
  async _createNewService(serviceName, domainName, context) {
    // This would integrate with the service creation system
    // For now, simulate service creation
    this.logger.info(`Creating new service: ${serviceName} for domain: ${domainName}`);

    // Simulate service creation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const serviceResult = {
      serviceName,
      domainName,
      created: true,
      createdAt: new Date(),
      status: 'initialized'
    };

    // Update metrics
    this.metrics.serviceCreations++;

    return serviceResult;
  }

  /**
   * Finalize domain selection
   * @private
   * @param {Object} selectionResult - Selection result
   * @param {DomainSelectionContext} context - Selection context
   * @returns {DomainSelectionResult} Final result
   */
  async _finalizeDomainSelection(selectionResult, context) {
    const finalResult = {
      success: true,
      selectedDomain: selectionResult.domain,
      serviceCreated: selectionResult.serviceCreated || false,
      domainInfo: selectionResult.domainInfo || {},
      interactionLog: this.interactionHistory.slice(-10), // Last 10 interactions
      duration: Date.now() - context.startTime.getTime()
    };

    this.emit('domainSelectionFinalized', { result: finalResult, context });
    return finalResult;
  }

  /**
   * Create selection context
   * @private
   * @param {string} sessionId - Session ID
   * @param {Object} options - Options
   * @returns {DomainSelectionContext} Context
   */
  _createSelectionContext(sessionId, options) {
    return {
      sessionId,
      purpose: options.purpose || 'deployment',
      availableDomains: [],
      userPreferences: options.preferences || {},
      startTime: new Date()
    };
  }

  /**
   * Create failure result
   * @private
   * @param {string} sessionId - Session ID
   * @param {Error} error - Error
   * @param {DomainSelectionContext} context - Context
   * @returns {DomainSelectionResult} Failure result
   */
  _createFailureResult(sessionId, error, context) {
    return {
      success: false,
      selectedDomain: null,
      serviceCreated: false,
      domainInfo: {},
      interactionLog: this.interactionHistory.slice(-10),
      duration: Date.now() - context.startTime.getTime(),
      error: this.errorClassifier.classifyError(error, 'domain_selection_failure')
    };
  }

  /**
   * Update selection metrics
   * @private
   * @param {DomainSelectionResult} result - Result
   */
  _updateMetrics(result) {
    this.metrics.totalSelections++;
    this.metrics.lastSelectionTime = new Date();

    if (result.success) {
      this.metrics.successfulSelections++;
    }

    // Update average duration
    const totalDuration = this.metrics.averageDuration * (this.metrics.totalSelections - 1) + result.duration;
    this.metrics.averageDuration = totalDuration / this.metrics.totalSelections;
  }

  /**
   * Generate unique session ID
   * @private
   * @returns {string} Session ID
   */
  _generateSessionId() {
    return `domain-select-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get selector metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.selectionSessions.size,
      cacheSize: this.domainCache.size,
      uptime: process.uptime()
    };
  }

  /**
   * Clear domain cache
   */
  clearCache() {
    this.domainCache.clear();
    this.logger.info('Domain cache cleared');
  }

  /**
   * Shutdown selector
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Shutting down Interactive Domain Selector...');

    // Close interactive prompts
    try {
      await closePrompts();
    } catch (error) {
      this.logger.warn('Failed to close prompts', { error: error.message });
    }

    this.logger.info('Interactive Domain Selector shutdown completed');
    this.emit('selectorShutdown');
  }
}

export default InteractiveDomainSelector;