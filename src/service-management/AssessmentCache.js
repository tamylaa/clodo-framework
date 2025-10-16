/**
 * Assessment Cache System
 *
 * Caches assessment results to avoid redundant analysis of project artifacts.
 * Provides intelligent cache invalidation based on file changes and time-based expiration.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export class AssessmentCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || './.clodo-cache/assessment';
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxEntries = options.maxEntries || 50;
    this.enableDiskCache = options.enableDiskCache !== false;
    this.memoryCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the cache system
   */
  async initialize() {
    if (this.initialized) return;

    if (this.enableDiskCache) {
      await this.ensureCacheDirectory();
      await this.loadFromDisk();
    }

    this.initialized = true;
  }

  /**
   * Generate cache key from project state and inputs
   */
  async generateCacheKey(projectPath, inputs = {}) {
    const keyData = {
      projectPath: path.resolve(projectPath),
      inputs: this.sanitizeInputs(inputs),
      projectFiles: await this.getProjectFileHashes(projectPath)
    };

    const keyString = JSON.stringify(keyData, Object.keys(keyData).sort());
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Sanitize inputs for cache key generation (remove sensitive data)
   */
  sanitizeInputs(inputs) {
    const sanitized = { ...inputs };

    // Remove sensitive fields but keep their presence for cache invalidation
    const sensitiveFields = ['apiToken', 'cloudflareToken', 'token', 'secret', 'password'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = 'present'; // Just mark presence, not value
      }
    });

    return sanitized;
  }

  /**
   * Get hashes of relevant project files for cache invalidation
   */
  async getProjectFileHashes(projectPath) {
    const relevantFiles = [
      'package.json',
      'wrangler.toml',
      'src/index.js',
      'src/worker.js',
      'dist/index.js'
    ];

    const hashes = {};

    for (const file of relevantFiles) {
      const filePath = path.join(projectPath, file);
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        hashes[file] = {
          mtime: stats.mtime.getTime(),
          size: stats.size,
          hash: crypto.createHash('md5').update(content).digest('hex').substring(0, 8)
        };
      } catch (error) {
        // File doesn't exist, that's fine
        hashes[file] = null;
      }
    }

    return hashes;
  }

  /**
   * Get cached assessment result
   */
  async get(cacheKey) {
    await this.initialize();

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data;
    }

    // Check disk cache if enabled
    if (this.enableDiskCache) {
      const diskEntry = await this.loadFromDiskCache(cacheKey);
      if (diskEntry && !this.isExpired(diskEntry)) {
        // Restore to memory cache
        this.memoryCache.set(cacheKey, diskEntry);
        return diskEntry.data;
      }
    }

    return null;
  }

  /**
   * Store assessment result in cache
   */
  async set(cacheKey, data) {
    await this.initialize();

    const entry = {
      data,
      timestamp: Date.now(),
      key: cacheKey
    };

    // Store in memory
    this.memoryCache.set(cacheKey, entry);

    // Store on disk if enabled
    if (this.enableDiskCache) {
      await this.saveToDiskCache(cacheKey, entry);
    }

    // Maintain cache size limits
    await this.cleanup();
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Clear expired entries and maintain size limits
   */
  async cleanup() {
    const now = Date.now();
    const validEntries = new Map();

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (!this.isExpired(entry)) {
        validEntries.set(key, entry);
      }
    }

    // If still too many entries, remove oldest
    if (validEntries.size > this.maxEntries) {
      const sortedEntries = Array.from(validEntries.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toKeep = sortedEntries.slice(-this.maxEntries);
      validEntries.clear();
      toKeep.forEach(([key, entry]) => validEntries.set(key, entry));
    }

    this.memoryCache = validEntries;

    // Clean disk cache
    if (this.enableDiskCache) {
      await this.cleanupDiskCache();
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    this.memoryCache.clear();

    if (this.enableDiskCache) {
      await this.clearDiskCache();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const now = Date.now();
    const memoryEntries = Array.from(this.memoryCache.values());

    return {
      memory: {
        total: memoryEntries.length,
        valid: memoryEntries.filter(entry => !this.isExpired(entry)).length,
        expired: memoryEntries.filter(entry => this.isExpired(entry)).length
      },
      disk: this.enableDiskCache ? await this.getDiskStats() : null,
      ttl: this.ttl,
      maxEntries: this.maxEntries
    };
  }

  // Disk cache implementation
  async ensureCacheDirectory() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }
  }

  getCacheFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async saveToDiskCache(key, entry) {
    try {
      const filePath = this.getCacheFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      // Disk cache failure shouldn't break functionality
      console.warn('Failed to save to disk cache:', error.message);
    }
  }

  async loadFromDiskCache(key) {
    try {
      const filePath = this.getCacheFilePath(key);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async loadFromDisk() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.json'));

      for (const file of cacheFiles) {
        const key = file.replace('.json', '');
        const entry = await this.loadFromDiskCache(key);
        if (entry && !this.isExpired(entry)) {
          this.memoryCache.set(key, entry);
        }
      }
    } catch (error) {
      // Disk cache loading failure is not critical
    }
  }

  async cleanupDiskCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.json'));

      for (const file of cacheFiles) {
        const key = file.replace('.json', '');
        const entry = await this.loadFromDiskCache(key);

        if (!entry || this.isExpired(entry)) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      // Cleanup failure is not critical
    }
  }

  async clearDiskCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      // Clear failure is not critical
    }
  }

  async getDiskStats() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.json'));

      let valid = 0;
      let expired = 0;

      for (const file of cacheFiles) {
        const key = file.replace('.json', '');
        const entry = await this.loadFromDiskCache(key);

        if (entry) {
          if (this.isExpired(entry)) {
            expired++;
          } else {
            valid++;
          }
        }
      }

      return { total: cacheFiles.length, valid, expired };
    } catch (error) {
      return { total: 0, valid: 0, expired: 0 };
    }
  }
}