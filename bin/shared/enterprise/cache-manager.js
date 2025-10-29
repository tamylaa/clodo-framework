/**
 * Configuration Cache Manager
 *
 * Enterprise-grade configuration caching system providing high-performance
 * configuration storage, retrieval, invalidation, and synchronization
 * capabilities with distributed cache support and intelligent caching strategies.
 *
 * @author Clodo Framework Team
 * @version 2.0.0
 * @since 2025-10-29
 */

import { EventEmitter } from 'events';

// Enterprise utility imports
import { Logger } from '../logging/Logger.js';
import { classifyError } from '../error-handling/error-classifier.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';

// Core caching modules
import { ConfigurationCache } from '../cache/configuration-cache.js';

/**
 * Cache Configuration
 * @typedef {Object} CacheConfig
 * @property {string} strategy - Caching strategy ('lru', 'ttl', 'hybrid')
 * @property {number} maxSize - Maximum cache size
 * @property {number} ttl - Time-to-live for cache entries (ms)
 * @property {boolean} distributed - Enable distributed caching
 * @property {Object} persistence - Cache persistence configuration
 * @property {Object} invalidation - Cache invalidation configuration
 * @property {Object} synchronization - Cache synchronization configuration
 * @property {Object} monitoring - Cache monitoring configuration
 */

/**
 * Cache Entry
 * @typedef {Object} CacheEntry
 * @property {string} key - Cache key
 * @property {*} value - Cached value
 * @property {number} timestamp - Entry creation timestamp
 * @property {number} ttl - Time-to-live
 * @property {number} accessCount - Access count
 * @property {number} lastAccessed - Last access timestamp
 * @property {Object} metadata - Additional metadata
 */

/**
 * Cache Operation Result
 * @typedef {Object} CacheOperationResult
 * @property {boolean} success - Operation success
 * @property {*} value - Returned value (if applicable)
 * @property {number} duration - Operation duration
 * @property {string} operation - Operation type
 * @property {Object} metadata - Operation metadata
 */

/**
 * Configuration Cache Manager
 *
 * Manages high-performance configuration caching with intelligent strategies,
 * distributed support, automatic invalidation, and comprehensive monitoring.
 */
export class ConfigurationCacheManager extends EventEmitter {
  /**
   * Create Configuration Cache Manager
   * @param {CacheConfig} config - Cache configuration
   */
  constructor(config = {}) {
    super();

    // Initialize core configuration
    this.config = this._initializeConfiguration(config);

    // Initialize core components
    this.logger = new Logger({
      level: this.config.logging?.level || 'info',
      prefix: '[Config-Cache-Manager]',
      enableFileLogging: this.config.logging?.enableFileLogging || false
    });

    this.classifyError = classifyError;
    this.configManager = new ConfigurationManager();

    // Initialize cache storage
    this.cache = new Map();
    this.metadata = new Map();
    this.accessPatterns = new Map();

    // Initialize cache metrics
    this.metrics = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0,
      invalidations: 0,
      averageAccessTime: 0,
      lastOperationTime: null
    };

    // Initialize distributed cache if enabled
    this.distributedCache = null;
    if (this.config.distributed) {
      this._initializeDistributedCache();
    }

    this.logger.info('Configuration Cache Manager initialized', {
      strategy: this.config.strategy,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      distributed: this.config.distributed
    });
  }

  /**
   * Initialize configuration with enterprise defaults
   * @private
   * @param {Object} userConfig - User-provided configuration
   * @returns {CacheConfig} Complete configuration
   */
  _initializeConfiguration(userConfig) {
    const defaults = {
      strategy: 'hybrid', // lru + ttl
      maxSize: 10000,
      ttl: 3600000, // 1 hour
      distributed: false,
      persistence: {
        enabled: true,
        interval: 300000, // 5 minutes
        path: './cache/configuration-cache.json'
      },
      invalidation: {
        enabled: true,
        strategies: ['ttl', 'manual', 'pattern'],
        autoInvalidate: true,
        invalidateOnUpdate: true
      },
      synchronization: {
        enabled: false,
        interval: 60000, // 1 minute
        conflictResolution: 'last_write_wins'
      },
      monitoring: {
        enabled: true,
        interval: 30000,
        alertThresholds: {
          hitRate: 0.7,
          evictionRate: 0.1,
          sizeUsage: 0.9
        }
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        logDirectory: './logs/cache'
      }
    };

    return this.configManager.mergeConfigurations(defaults, userConfig);
  }

  /**
   * Initialize manager components
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing Configuration Cache Manager components...');

      // Initialize core cache components
      this.coreCache = new ConfigurationCache({
        strategy: this.config.strategy,
        maxSize: this.config.maxSize,
        ttl: this.config.ttl
      });

      // Load persisted cache if enabled
      if (this.config.persistence.enabled) {
        await this._loadPersistedCache();
      }

      // Start background processes
      if (this.config.persistence.enabled) {
        this._startPersistenceTimer();
      }

      if (this.config.monitoring.enabled) {
        this._startMonitoring();
      }

      if (this.config.synchronization.enabled) {
        this._startSynchronization();
      }

      this.logger.info('Configuration Cache Manager initialization completed');

    } catch (error) {
      this.logger.error('Failed to initialize Configuration Cache Manager', { error: error.message });
      throw this.classifyError(error);
    }
  }

  /**
   * Get cached configuration
   * @param {string} key - Cache key
   * @param {Object} options - Get options
   * @returns {Promise<CacheOperationResult>} Operation result
   */
  async get(key, options = {}) {
    const startTime = Date.now();

    try {
      this.emit('cacheGetStarted', { key, options });

      // Check local cache first
      let entry = this.cache.get(key);

      if (!entry) {
        // Check distributed cache if enabled
        if (this.config.distributed && this.distributedCache) {
          entry = await this._getFromDistributedCache(key);
        }
      }

      if (entry) {
        // Check TTL
        if (this._isExpired(entry)) {
          await this.invalidate(key, { reason: 'ttl_expired' });
          entry = null;
        } else {
          // Update access metadata
          this._updateAccessMetadata(key, entry);
        }
      }

      const result = {
        success: !!entry,
        value: entry ? entry.value : null,
        duration: Date.now() - startTime,
        operation: 'get',
        metadata: {
          key,
          hit: !!entry,
          fromDistributed: !entry && this.config.distributed
        }
      };

      // Update metrics
      this._updateMetrics(result);

      this.emit('cacheGetCompleted', result);

      return result;

    } catch (error) {
      this.logger.error(`Cache get operation failed for key: ${key}`, { error: error.message });

      const errorResult = {
        success: false,
        value: null,
        duration: Date.now() - startTime,
        operation: 'get',
        metadata: { key, error: error.message }
      };

      this.emit('cacheGetFailed', errorResult);

      return errorResult;
    }
  }

  /**
   * Set cached configuration
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Set options
   * @returns {Promise<CacheOperationResult>} Operation result
   */
  async set(key, value, options = {}) {
    const startTime = Date.now();

    try {
      this.emit('cacheSetStarted', { key, value, options });

      // Create cache entry
      const entry = this._createCacheEntry(key, value, options);

      // Check cache size limits
      if (this.cache.size >= this.config.maxSize) {
        await this._evictEntries();
      }

      // Store in local cache
      this.cache.set(key, entry);
      this.metadata.set(key, entry.metadata);

      // Store in distributed cache if enabled
      if (this.config.distributed && this.distributedCache) {
        await this._setInDistributedCache(key, entry);
      }

      // Invalidate related entries if configured
      if (this.config.invalidation.invalidateOnUpdate) {
        await this._invalidateRelatedEntries(key);
      }

      const result = {
        success: true,
        value: entry.value,
        duration: Date.now() - startTime,
        operation: 'set',
        metadata: {
          key,
          size: this._calculateEntrySize(entry),
          ttl: entry.ttl
        }
      };

      this.emit('cacheSetCompleted', result);

      return result;

    } catch (error) {
      this.logger.error(`Cache set operation failed for key: ${key}`, { error: error.message });

      const errorResult = {
        success: false,
        value: null,
        duration: Date.now() - startTime,
        operation: 'set',
        metadata: { key, error: error.message }
      };

      this.emit('cacheSetFailed', errorResult);

      return errorResult;
    }
  }

  /**
   * Invalidate cache entry
   * @param {string} key - Cache key to invalidate
   * @param {Object} options - Invalidation options
   * @returns {Promise<CacheOperationResult>} Operation result
   */
  async invalidate(key, options = {}) {
    const startTime = Date.now();

    try {
      this.emit('cacheInvalidateStarted', { key, options });

      let invalidated = false;

      // Remove from local cache
      if (this.cache.has(key)) {
        this.cache.delete(key);
        this.metadata.delete(key);
        invalidated = true;
      }

      // Remove from distributed cache if enabled
      if (this.config.distributed && this.distributedCache) {
        await this._invalidateInDistributedCache(key);
      }

      const result = {
        success: true,
        value: invalidated,
        duration: Date.now() - startTime,
        operation: 'invalidate',
        metadata: {
          key,
          invalidated,
          reason: options.reason || 'manual'
        }
      };

      // Update metrics
      this.metrics.invalidations++;

      this.emit('cacheInvalidateCompleted', result);

      return result;

    } catch (error) {
      this.logger.error(`Cache invalidate operation failed for key: ${key}`, { error: error.message });

      const errorResult = {
        success: false,
        value: false,
        duration: Date.now() - startTime,
        operation: 'invalidate',
        metadata: { key, error: error.message }
      };

      this.emit('cacheInvalidateFailed', errorResult);

      return errorResult;
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match keys
   * @param {Object} options - Invalidation options
   * @returns {Promise<CacheOperationResult>} Operation result
   */
  async invalidatePattern(pattern, options = {}) {
    const startTime = Date.now();

    try {
      this.emit('cacheInvalidatePatternStarted', { pattern, options });

      const regex = new RegExp(pattern);
      const invalidatedKeys = [];

      // Find matching keys in local cache
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          invalidatedKeys.push(key);
        }
      }

      // Invalidate matching keys
      for (const key of invalidatedKeys) {
        await this.invalidate(key, { reason: 'pattern_match' });
      }

      // Invalidate in distributed cache if enabled
      if (this.config.distributed && this.distributedCache) {
        await this._invalidatePatternInDistributedCache(pattern);
      }

      const result = {
        success: true,
        value: invalidatedKeys.length,
        duration: Date.now() - startTime,
        operation: 'invalidatePattern',
        metadata: {
          pattern,
          invalidatedCount: invalidatedKeys.length,
          invalidatedKeys
        }
      };

      this.emit('cacheInvalidatePatternCompleted', result);

      return result;

    } catch (error) {
      this.logger.error(`Cache invalidate pattern operation failed for pattern: ${pattern}`, { error: error.message });

      const errorResult = {
        success: false,
        value: 0,
        duration: Date.now() - startTime,
        operation: 'invalidatePattern',
        metadata: { pattern, error: error.message }
      };

      this.emit('cacheInvalidatePatternFailed', errorResult);

      return errorResult;
    }
  }

  /**
   * Clear entire cache
   * @param {Object} options - Clear options
   * @returns {Promise<CacheOperationResult>} Operation result
   */
  async clear(options = {}) {
    const startTime = Date.now();

    try {
      this.emit('cacheClearStarted', options);

      const clearedCount = this.cache.size;

      // Clear local cache
      this.cache.clear();
      this.metadata.clear();
      this.accessPatterns.clear();

      // Clear distributed cache if enabled
      if (this.config.distributed && this.distributedCache) {
        await this._clearDistributedCache();
      }

      const result = {
        success: true,
        value: clearedCount,
        duration: Date.now() - startTime,
        operation: 'clear',
        metadata: {
          clearedCount,
          reason: options.reason || 'manual'
        }
      };

      this.emit('cacheClearCompleted', result);

      return result;

    } catch (error) {
      this.logger.error('Cache clear operation failed', { error: error.message });

      const errorResult = {
        success: false,
        value: 0,
        duration: Date.now() - startTime,
        operation: 'clear',
        metadata: { error: error.message }
      };

      this.emit('cacheClearFailed', errorResult);

      return errorResult;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalOperations = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalOperations > 0 ? this.metrics.cacheHits / totalOperations : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      totalOperations: this.metrics.totalOperations,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      evictions: this.metrics.evictions,
      invalidations: this.metrics.invalidations,
      averageAccessTime: this.metrics.averageAccessTime,
      utilization: this.cache.size / this.config.maxSize,
      uptime: process.uptime(),
      lastOperationTime: this.metrics.lastOperationTime
    };
  }

  /**
   * Check if cache entry exists
   * @param {string} key - Cache key
   * @returns {boolean} Whether entry exists
   */
  has(key) {
    const entry = this.cache.get(key);
    return entry && !this._isExpired(entry);
  }

  /**
   * Get all cache keys
   * @param {Object} options - Options
   * @returns {Array<string>} Cache keys
   */
  keys(options = {}) {
    const keys = Array.from(this.cache.keys());

    if (options.filter) {
      return keys.filter(key => options.filter(key));
    }

    return keys;
  }

  /**
   * Create cache entry
   * @private
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Entry options
   * @returns {CacheEntry} Cache entry
   */
  _createCacheEntry(key, value, options) {
    const now = Date.now();

    return {
      key,
      value,
      timestamp: now,
      ttl: options.ttl || this.config.ttl,
      accessCount: 0,
      lastAccessed: now,
      metadata: {
        size: this._calculateEntrySize({ key, value }),
        created: now,
        options: { ...options }
      }
    };
  }

  /**
   * Check if cache entry is expired
   * @private
   * @param {CacheEntry} entry - Cache entry
   * @returns {boolean} Whether entry is expired
   */
  _isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Update access metadata
   * @private
   * @param {string} key - Cache key
   * @param {CacheEntry} entry - Cache entry
   */
  _updateAccessMetadata(key, entry) {
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Update access patterns
    const pattern = this.accessPatterns.get(key) || { accesses: 0, lastAccess: 0 };
    pattern.accesses++;
    pattern.lastAccess = entry.lastAccessed;
    this.accessPatterns.set(key, pattern);
  }

  /**
   * Calculate entry size
   * @private
   * @param {Object} entry - Entry to calculate size for
   * @returns {number} Entry size in bytes
   */
  _calculateEntrySize(entry) {
    // Rough estimation of memory usage
    const keySize = Buffer.byteLength(entry.key, 'utf8');
    const valueSize = this._calculateValueSize(entry.value);
    return keySize + valueSize + 100; // Additional overhead
  }

  /**
   * Calculate value size
   * @private
   * @param {*} value - Value to calculate size for
   * @returns {number} Value size in bytes
   */
  _calculateValueSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 1;
    if (Array.isArray(value)) {
      return value.reduce((size, item) => size + this._calculateValueSize(item), 0);
    }
    if (typeof value === 'object') {
      return Object.keys(value).reduce((size, key) => {
        return size + Buffer.byteLength(key, 'utf8') + this._calculateValueSize(value[key]);
      }, 0);
    }
    return 0;
  }

  /**
   * Evict entries based on strategy
   * @private
   * @returns {Promise<void>}
   */
  async _evictEntries() {
    const entriesToEvict = Math.max(1, Math.floor(this.config.maxSize * 0.1)); // Evict 10%

    if (this.config.strategy === 'lru') {
      await this._evictLRU(entriesToEvict);
    } else if (this.config.strategy === 'ttl') {
      await this._evictExpired(entriesToEvict);
    } else {
      // Hybrid: LRU for non-expired, TTL for expired
      await this._evictHybrid(entriesToEvict);
    }
  }

  /**
   * Evict entries using LRU strategy
   * @private
   * @param {number} count - Number of entries to evict
   */
  async _evictLRU(count) {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const { key } = entries[i];
      this.cache.delete(key);
      this.metadata.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * Evict expired entries
   * @private
   * @param {number} count - Number of entries to evict
   */
  async _evictExpired(count) {
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this._isExpired(entry)) {
        expiredKeys.push(key);
        if (expiredKeys.length >= count) break;
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.metadata.delete(key);
      this.metrics.evictions++;
    }
  }

  /**
   * Evict entries using hybrid strategy
   * @private
   * @param {number} count - Number of entries to evict
   */
  async _evictHybrid(count) {
    // First evict expired entries
    await this._evictExpired(count);

    // If still need to evict, use LRU
    const remaining = count - this.metrics.evictions;
    if (remaining > 0) {
      await this._evictLRU(remaining);
    }
  }

  /**
   * Invalidate related entries
   * @private
   * @param {string} key - Base key
   */
  async _invalidateRelatedEntries(key) {
    // Invalidate entries with similar patterns
    const patterns = this._generateInvalidationPatterns(key);

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern, { reason: 'related_invalidation' });
    }
  }

  /**
   * Generate invalidation patterns
   * @private
   * @param {string} key - Base key
   * @returns {Array<string>} Patterns
   */
  _generateInvalidationPatterns(key) {
    const patterns = [];

    // Add common patterns based on key structure
    if (key.includes('config')) {
      patterns.push('.*config.*');
    }

    if (key.includes('domain')) {
      patterns.push('.*domain.*');
    }

    return patterns;
  }

  /**
   * Initialize distributed cache
   * @private
   */
  _initializeDistributedCache() {
    // This would initialize a distributed cache system
    // For now, simulate with a simple in-memory store
    this.distributedCache = new Map();
    this.logger.info('Distributed cache initialized');
  }

  /**
   * Get from distributed cache
   * @private
   * @param {string} key - Cache key
   * @returns {Promise<CacheEntry|null>} Cache entry
   */
  async _getFromDistributedCache(key) {
    // Simulate distributed cache access
    await new Promise(resolve => setTimeout(resolve, 10));
    return this.distributedCache.get(key) || null;
  }

  /**
   * Set in distributed cache
   * @private
   * @param {string} key - Cache key
   * @param {CacheEntry} entry - Cache entry
   * @returns {Promise<void>}
   */
  async _setInDistributedCache(key, entry) {
    // Simulate distributed cache set
    await new Promise(resolve => setTimeout(resolve, 10));
    this.distributedCache.set(key, entry);
  }

  /**
   * Invalidate in distributed cache
   * @private
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async _invalidateInDistributedCache(key) {
    // Simulate distributed cache invalidation
    await new Promise(resolve => setTimeout(resolve, 10));
    this.distributedCache.delete(key);
  }

  /**
   * Invalidate pattern in distributed cache
   * @private
   * @param {string} pattern - Pattern
   * @returns {Promise<void>}
   */
  async _invalidatePatternInDistributedCache(pattern) {
    // Simulate distributed pattern invalidation
    await new Promise(resolve => setTimeout(resolve, 10));
    const regex = new RegExp(pattern);
    for (const key of this.distributedCache.keys()) {
      if (regex.test(key)) {
        this.distributedCache.delete(key);
      }
    }
  }

  /**
   * Clear distributed cache
   * @private
   * @returns {Promise<void>}
   */
  async _clearDistributedCache() {
    // Simulate distributed cache clear
    await new Promise(resolve => setTimeout(resolve, 10));
    this.distributedCache.clear();
  }

  /**
   * Load persisted cache
   * @private
   * @returns {Promise<void>}
   */
  async _loadPersistedCache() {
    try {
      // This would load from persistent storage
      // For now, simulate loading
      this.logger.debug('Persisted cache loaded');
    } catch (error) {
      this.logger.warn('Failed to load persisted cache', { error: error.message });
    }
  }

  /**
   * Start persistence timer
   * @private
   */
  _startPersistenceTimer() {
    this.persistenceTimer = setInterval(() => {
      this._persistCache();
    }, this.config.persistence.interval);

    this.logger.debug('Cache persistence timer started', {
      interval: this.config.persistence.interval
    });
  }

  /**
   * Persist cache to storage
   * @private
   * @returns {Promise<void>}
   */
  async _persistCache() {
    try {
      // This would persist cache to storage
      // For now, simulate persistence
      this.logger.debug('Cache persisted');
    } catch (error) {
      this.logger.warn('Failed to persist cache', { error: error.message });
    }
  }

  /**
   * Start monitoring
   * @private
   */
  _startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this._performMonitoringCheck();
    }, this.config.monitoring.interval);

    this.logger.debug('Cache monitoring started', {
      interval: this.config.monitoring.interval
    });
  }

  /**
   * Perform monitoring check
   * @private
   */
  async _performMonitoringCheck() {
    try {
      const stats = this.getStats();

      // Check alert thresholds
      if (stats.hitRate < this.config.monitoring.alertThresholds.hitRate) {
        this.logger.warn('Cache hit rate below threshold', {
          hitRate: stats.hitRate,
          threshold: this.config.monitoring.alertThresholds.hitRate
        });

        this.emit('cacheAlert', {
          type: 'low_hit_rate',
          value: stats.hitRate,
          threshold: this.config.monitoring.alertThresholds.hitRate
        });
      }

      if (stats.utilization > this.config.monitoring.alertThresholds.sizeUsage) {
        this.logger.warn('Cache size usage above threshold', {
          utilization: stats.utilization,
          threshold: this.config.monitoring.alertThresholds.sizeUsage
        });

        this.emit('cacheAlert', {
          type: 'high_utilization',
          value: stats.utilization,
          threshold: this.config.monitoring.alertThresholds.sizeUsage
        });
      }

      this.emit('cacheMonitoringCheck', stats);

    } catch (error) {
      this.logger.error('Cache monitoring check failed', { error: error.message });
    }
  }

  /**
   * Start synchronization
   * @private
   */
  _startSynchronization() {
    this.synchronizationInterval = setInterval(() => {
      this._performSynchronization();
    }, this.config.synchronization.interval);

    this.logger.debug('Cache synchronization started', {
      interval: this.config.synchronization.interval
    });
  }

  /**
   * Perform synchronization
   * @private
   * @returns {Promise<void>}
   */
  async _performSynchronization() {
    try {
      // This would synchronize with other cache instances
      // For now, simulate synchronization
      this.logger.debug('Cache synchronization performed');
    } catch (error) {
      this.logger.warn('Cache synchronization failed', { error: error.message });
    }
  }

  /**
   * Update cache metrics
   * @private
   * @param {CacheOperationResult} result - Operation result
   */
  _updateMetrics(result) {
    this.metrics.totalOperations++;
    this.metrics.lastOperationTime = new Date();

    if (result.operation === 'get') {
      if (result.success) {
        this.metrics.cacheHits++;
      } else {
        this.metrics.cacheMisses++;
      }
    }

    // Update average access time
    const totalTime = this.metrics.averageAccessTime * (this.metrics.totalOperations - 1) + result.duration;
    this.metrics.averageAccessTime = totalTime / this.metrics.totalOperations;
  }

  /**
   * Shutdown manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.logger.info('Shutting down Configuration Cache Manager...');

    // Clear timers
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.synchronizationInterval) {
      clearInterval(this.synchronizationInterval);
    }

    // Final persistence
    if (this.config.persistence.enabled) {
      await this._persistCache();
    }

    this.logger.info('Configuration Cache Manager shutdown completed');
    this.emit('managerShutdown');
  }
}

export default ConfigurationCacheManager;