/**
 * KV Storage Utilities
 * Convenient wrapper for Cloudflare Workers KV
 * 
 * @example
 * import { KVStorage, KVCache } from '@tamyla/clodo-framework/utilities/kv';
 * 
 * const kv = new KVStorage(env.MY_KV);
 * await kv.set('key', { data: 'value' }, { expirationTtl: 3600 });
 * const data = await kv.get('key');
 */

/**
 * KV Storage wrapper with convenience methods
 */
export class KVStorage {
  /**
   * @param {KVNamespace} namespace - KV namespace binding
   */
  constructor(namespace) {
    if (!namespace) {
      throw new Error('KV namespace binding is required');
    }
    this.kv = namespace;
  }

  /**
   * Get a value from KV
   * @param {string} key - Key to retrieve
   * @param {Object} options - Get options
   * @param {string} options.type - Return type: 'text', 'json', 'arrayBuffer', 'stream'
   * @returns {Promise<*>}
   */
  async get(key, options = {}) {
    const type = options.type || 'json';
    return this.kv.get(key, { type });
  }

  /**
   * Get value with metadata
   * @param {string} key - Key to retrieve
   * @param {Object} options - Get options
   * @returns {Promise<{value: *, metadata: Object}>}
   */
  async getWithMetadata(key, options = {}) {
    const type = options.type || 'json';
    return this.kv.getWithMetadata(key, { type });
  }

  /**
   * Set a value in KV
   * @param {string} key - Key to set
   * @param {*} value - Value to store (objects will be JSON serialized)
   * @param {Object} options - Put options
   * @param {number} options.expirationTtl - TTL in seconds
   * @param {number} options.expiration - Unix timestamp for expiration
   * @param {Object} options.metadata - Custom metadata
   * @returns {Promise<void>}
   */
  async set(key, value, options = {}) {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
    
    const putOptions = {};
    if (options.expirationTtl) putOptions.expirationTtl = options.expirationTtl;
    if (options.expiration) putOptions.expiration = options.expiration;
    if (options.metadata) putOptions.metadata = options.metadata;
    
    await this.kv.put(key, serialized, putOptions);
  }

  /**
   * Delete a key from KV
   * @param {string} key - Key to delete
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.kv.delete(key);
  }

  /**
   * List keys in KV
   * @param {Object} options - List options
   * @param {string} options.prefix - Key prefix to filter by
   * @param {number} options.limit - Maximum keys to return
   * @param {string} options.cursor - Pagination cursor
   * @returns {Promise<{keys: Array, list_complete: boolean, cursor: string}>}
   */
  async list(options = {}) {
    return this.kv.list({
      prefix: options.prefix,
      limit: options.limit || 1000,
      cursor: options.cursor
    });
  }

  /**
   * List all keys (handles pagination)
   * @param {string} prefix - Key prefix to filter by
   * @returns {AsyncGenerator<{name: string, expiration?: number, metadata?: Object}>}
   */
  async *listAll(prefix = '') {
    let cursor;
    
    do {
      const result = await this.list({ prefix, cursor });
      
      for (const key of result.keys) {
        yield key;
      }
      
      cursor = result.list_complete ? null : result.cursor;
    } while (cursor);
  }

  /**
   * Check if a key exists
   * @param {string} key - Key to check
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const value = await this.kv.get(key);
    return value !== null;
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Keys to retrieve
   * @returns {Promise<Map<string, *>>}
   */
  async getMany(keys) {
    const results = new Map();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key);
        results.set(key, value);
      })
    );
    
    return results;
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} entries - Key-value pairs to set
   * @param {Object} options - Put options (applied to all)
   * @returns {Promise<void>}
   */
  async setMany(entries, options = {}) {
    await Promise.all(
      Object.entries(entries).map(([key, value]) => 
        this.set(key, value, options)
      )
    );
  }
}

/**
 * KV-backed cache with TTL and stale-while-revalidate support
 */
export class KVCache {
  constructor(namespace, options = {}) {
    this.kv = new KVStorage(namespace);
    this.prefix = options.prefix || 'cache:';
    this.defaultTTL = options.defaultTTL || 3600;
  }

  /**
   * Get a cached value
   */
  async get(key) {
    return this.kv.get(this.prefix + key);
  }

  /**
   * Set a cached value
   */
  async set(key, value, ttl = this.defaultTTL) {
    await this.kv.set(this.prefix + key, value, { expirationTtl: ttl });
  }

  /**
   * Delete a cached value
   */
  async delete(key) {
    await this.kv.delete(this.prefix + key);
  }

  /**
   * Get or set with loader function
   */
  async getOrSet(key, loader, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Wrap a function with caching
   */
  wrap(fn, keyFn, ttl = this.defaultTTL) {
    return async (...args) => {
      const key = keyFn(...args);
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Invalidate cache entries by prefix
   */
  async invalidatePrefix(prefix) {
    const fullPrefix = this.prefix + prefix;
    
    for await (const key of this.kv.listAll(fullPrefix)) {
      await this.kv.delete(key.name);
    }
  }
}

/**
 * KV with typed metadata for advanced use cases
 */
export class KVWithMetadata {
  constructor(namespace) {
    this.kv = new KVStorage(namespace);
  }

  /**
   * Store value with metadata
   */
  async set(key, value, metadata, options = {}) {
    await this.kv.set(key, value, { ...options, metadata });
  }

  /**
   * Get value and metadata
   */
  async get(key) {
    const { value, metadata } = await this.kv.getWithMetadata(key);
    return { value, metadata: metadata || {} };
  }

  /**
   * Update only metadata (re-stores value)
   */
  async updateMetadata(key, metadataUpdater, options = {}) {
    const { value, metadata } = await this.get(key);
    if (value === null) return false;

    const newMetadata = typeof metadataUpdater === 'function'
      ? metadataUpdater(metadata)
      : { ...metadata, ...metadataUpdater };

    await this.set(key, value, newMetadata, options);
    return true;
  }
}

export default KVStorage;
