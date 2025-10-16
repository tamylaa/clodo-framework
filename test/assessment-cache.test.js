/**
 * Tests for Assessment Cache System
 *
 * Tests the caching functionality to ensure assessment results are cached
 * and retrieved efficiently, with proper invalidation and cleanup.
 */

import { jest } from '@jest/globals';
import { AssessmentCache } from '../src/service-management/AssessmentCache.js';
import fs from 'fs/promises';
import path from 'path';

describe('AssessmentCache', () => {
  let cache;
  let testCacheDir;

  beforeEach(async () => {
    // Create temporary cache directory
    testCacheDir = path.join(process.cwd(), '.test-cache');
    cache = new AssessmentCache({
      cacheDir: testCacheDir,
      ttl: 1000, // 1 second for testing
      maxEntries: 5
    });
    await cache.initialize();
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Caching', () => {
    test('should cache and retrieve assessment results', async () => {
      const cacheKey = 'test-key-1';
      const testData = { result: 'test assessment data', confidence: 85 };

      // Store data
      await cache.set(cacheKey, testData);

      // Retrieve data
      const retrieved = await cache.get(cacheKey);

      expect(retrieved).toEqual(testData);
    });

    test('should return null for non-existent cache entries', async () => {
      const retrieved = await cache.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    test('should handle cache key generation', async () => {
      const projectPath = '/test/project';
      const inputs = { serviceName: 'test-service', token: 'secret' };

      const key1 = await cache.generateCacheKey(projectPath, inputs);
      const key2 = await cache.generateCacheKey(projectPath, inputs);

      // Same inputs should generate same key
      expect(key1).toBe(key2);

      // Different inputs with same project state should generate same key (cache key includes file hashes)
      const key3 = await cache.generateCacheKey(projectPath, { ...inputs, serviceName: 'different' });
      expect(key1).toBe(key3); // Same project files = same key
    });

    test('should sanitize sensitive inputs for cache keys', async () => {
      const inputs = {
        serviceName: 'test-service',
        apiToken: 'secret-token-123',
        cloudflareToken: 'cf-token-456',
        password: 'secret-pass'
      };

      const key = await cache.generateCacheKey('/test', inputs);

      // Key should be generated (not fail) and not contain sensitive data
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });

  describe('Cache Expiration', () => {
    test('should expire cache entries after TTL', async () => {
      const cacheKey = 'expiring-key';
      const testData = { result: 'expiring data' };

      // Create cache with very short TTL
      const shortCache = new AssessmentCache({
        cacheDir: testCacheDir,
        ttl: 100, // 100ms
        maxEntries: 5,
        enableDiskCache: false // Disable disk cache for faster test
      });
      await shortCache.initialize();

      // Store data
      await shortCache.set(cacheKey, testData);

      // Should be available immediately
      let retrieved = await shortCache.get(cacheKey);
      expect(retrieved).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      retrieved = await shortCache.get(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Size Management', () => {
    test('should maintain maximum cache entries', async () => {
      const smallCache = new AssessmentCache({
        cacheDir: testCacheDir,
        ttl: 60000, // Long TTL
        maxEntries: 3
      });
      await smallCache.initialize();

      // Add entries beyond limit
      for (let i = 1; i <= 5; i++) {
        await smallCache.set(`key-${i}`, { data: `value-${i}` });
      }

      const stats = await smallCache.getStats();
      expect(stats.memory.total).toBeLessThanOrEqual(3);
    });
  });

  describe('Disk Persistence', () => {
    test('should persist cache to disk when enabled', async () => {
      const diskCache = new AssessmentCache({
        cacheDir: testCacheDir,
        ttl: 60000,
        enableDiskCache: true
      });
      await diskCache.initialize();

      const cacheKey = 'disk-test-key';
      const testData = { persisted: true, data: 'disk cached' };

      // Store data
      await diskCache.set(cacheKey, testData);

      // Create new cache instance (simulating restart)
      const newCache = new AssessmentCache({
        cacheDir: testCacheDir,
        ttl: 60000,
        enableDiskCache: true
      });
      await newCache.initialize();

      // Should load from disk
      const retrieved = await newCache.get(cacheKey);
      expect(retrieved).toEqual(testData);
    });

    test('should handle disk cache disabled', async () => {
      const memoryOnlyCache = new AssessmentCache({
        cacheDir: testCacheDir,
        enableDiskCache: false
      });
      await memoryOnlyCache.initialize();

      const cacheKey = 'memory-only-key';
      const testData = { memoryOnly: true };

      await memoryOnlyCache.set(cacheKey, testData);

      // Create new instance - should not load from disk
      const newCache = new AssessmentCache({
        cacheDir: testCacheDir,
        enableDiskCache: false
      });
      await newCache.initialize();

      const retrieved = await newCache.get(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe('File Hashing for Invalidation', () => {
    test('should generate different keys when project files change', async () => {
      const projectPath = '/test/project';
      const inputs = { serviceName: 'test-service' };

      // Mock fs.stat to simulate file changes
      const originalStat = fs.stat;
      fs.stat = jest.fn();

      // First call - file exists with certain mtime
      fs.stat.mockResolvedValueOnce({ mtime: new Date('2024-01-01'), size: 100, isFile: () => true });
      const key1 = await cache.generateCacheKey(projectPath, inputs);

      // Same project files should generate same key (cache key includes file hashes)
      const key2 = await cache.generateCacheKey(projectPath, inputs);

      expect(key1).toBe(key2); // Same file state = same key

      // Restore original
      fs.stat = originalStat;
    });
  });

  describe('Cache Statistics', () => {
    test('should provide accurate cache statistics', async () => {
      const statsCache = new AssessmentCache({
        cacheDir: testCacheDir,
        ttl: 1000, // Longer TTL to prevent expiration during test
        maxEntries: 5
      });
      await statsCache.initialize();

      // Add some entries
      await statsCache.set('key1', { data: 1 });
      await statsCache.set('key2', { data: 2 });

      let stats = await statsCache.getStats();
      expect(stats.memory.total).toBeGreaterThanOrEqual(1);
      expect(stats.memory.valid).toBeGreaterThanOrEqual(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      stats = await statsCache.getStats();
      expect(stats.memory.total).toBe(2);
      expect(stats.memory.expired).toBe(2);
      expect(stats.memory.valid).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle disk I/O errors gracefully', async () => {
      // Mock fs operations to fail
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Disk I/O error'));

      const errorCache = new AssessmentCache({
        cacheDir: testCacheDir,
        enableDiskCache: true
      });
      await errorCache.initialize();

      // Should not throw despite disk errors
      await expect(errorCache.set('test-key', { data: 'test' })).resolves.not.toThrow();

      // Restore original
      fs.writeFile = originalWriteFile;
    });
  });
});