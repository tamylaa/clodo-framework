/**
 * Configuration Cache
 *
 * Basic configuration caching implementation for enterprise modules
 */

export class ConfigurationCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.options = {
      maxSize: options.maxSize || 1000,
      ttl: options.ttl || 3600000, // 1 hour default
      ...options
    };
  }

  async set(key, value, ttl = null) {
    const expiry = ttl || this.options.ttl;
    const entry = {
      value,
      expiry: Date.now() + expiry,
      created: Date.now()
    };

    // Simple LRU: if at max size, remove oldest entry
    if (this.cache.size >= this.options.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, entry);
    return true;
  }

  async get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async delete(key) {
    return this.cache.delete(key);
  }

  async clear() {
    this.cache.clear();
    return true;
  }

  async size() {
    // Clean expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }

  async keys() {
    const now = Date.now();
    const validKeys = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now <= entry.expiry) {
        validKeys.push(key);
      } else {
        this.cache.delete(key);
      }
    }
    return validKeys;
  }
}