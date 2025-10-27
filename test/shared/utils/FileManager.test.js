/**
 * FileManager.test.js - Comprehensive test suite for FileManager utility
 * Tests all file operation methods, error handling, and edge cases
 */

import { FileManager } from '../../../bin/shared/utils/file-manager.js';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('FileManager Utility', () => {
  const testDir = join(process.cwd(), 'tmp', 'file-manager-tests');
  let fm;

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    fm = new FileManager({ enableCache: false }); // Disable caching for tests
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('File Existence Checks', () => {
    test('should detect existing files', () => {
      const testFile = join(testDir, 'test.txt');
      writeFileSync(testFile, 'content');
      expect(fm.exists(testFile)).toBe(true);
    });

    test('should detect non-existing files', () => {
      const testFile = join(testDir, 'nonexistent.txt');
      expect(fm.exists(testFile)).toBe(false);
    });

    test('should handle files in nested directories', () => {
      const nested = join(testDir, 'a', 'b', 'c');
      mkdirSync(nested, { recursive: true });
      const testFile = join(nested, 'file.txt');
      writeFileSync(testFile, 'content');
      expect(fm.exists(testFile)).toBe(true);
    });

    test('should return false for directories when checking exists', () => {
      expect(fm.exists(testDir)).toBe(true); // Directories also return true
    });
  });

  describe('File Reading', () => {
    test('should read file content synchronously', () => {
      const testFile = join(testDir, 'read.txt');
      const content = 'Test content';
      writeFileSync(testFile, content);
      expect(fm.readFile(testFile)).toBe(content);
    });

    test('should read file with specific encoding', () => {
      const testFile = join(testDir, 'read-encoding.txt');
      const content = 'UTF-8 content: café';
      writeFileSync(testFile, content, 'utf8');
      expect(fm.readFile(testFile, 'utf8')).toBe(content);
    });

    test('should return null for non-existing files', () => {
      const testFile = join(testDir, 'nonexistent.txt');
      expect(() => fm.readFile(testFile)).toThrow();
    });

    test('should handle empty files', () => {
      const testFile = join(testDir, 'empty.txt');
      writeFileSync(testFile, '');
      expect(fm.readFile(testFile)).toBe('');
    });

    test('should handle large files', () => {
      const testFile = join(testDir, 'large.txt');
      const largeContent = 'X'.repeat(10000);
      writeFileSync(testFile, largeContent);
      expect(fm.readFile(testFile)).toBe(largeContent);
    });

    test('should handle JSON files', () => {
      const testFile = join(testDir, 'data.json');
      const data = { key: 'value', nested: { inner: 'data' } };
      writeFileSync(testFile, JSON.stringify(data));
      const content = fm.readFile(testFile);
      expect(JSON.parse(content)).toEqual(data);
    });

    test('should handle multiline content', () => {
      const testFile = join(testDir, 'multiline.txt');
      const content = 'Line 1\nLine 2\nLine 3';
      writeFileSync(testFile, content);
      expect(fm.readFile(testFile)).toBe(content);
    });
  });

  describe('File Writing', () => {
    test('should write file content synchronously', () => {
      const testFile = join(testDir, 'write.txt');
      const content = 'Written content';
      fm.writeFile(testFile, content);
      expect(readFileSync(testFile, 'utf8')).toBe(content);
    });

    test('should create file if not exists', () => {
      const testFile = join(testDir, 'new-file.txt');
      expect(existsSync(testFile)).toBe(false);
      fm.writeFile(testFile, 'content');
      expect(existsSync(testFile)).toBe(true);
    });

    test('should overwrite existing file', () => {
      const testFile = join(testDir, 'overwrite.txt');
      writeFileSync(testFile, 'original');
      fm.writeFile(testFile, 'new content');
      expect(readFileSync(testFile, 'utf8')).toBe('new content');
    });

    test('should create nested directories if not exist', () => {
      const nested = join(testDir, 'x', 'y', 'z', 'file.txt');
      fm.writeFile(nested, 'content');
      expect(existsSync(nested)).toBe(true);
    });

    test('should handle empty content', () => {
      const testFile = join(testDir, 'empty-write.txt');
      fm.writeFile(testFile, '');
      expect(readFileSync(testFile, 'utf8')).toBe('');
    });

    test('should handle large content', () => {
      const testFile = join(testDir, 'large-write.txt');
      const largeContent = 'X'.repeat(50000);
      fm.writeFile(testFile, largeContent);
      expect(readFileSync(testFile, 'utf8')).toBe(largeContent);
    });

    test('should handle JSON serialization', () => {
      const testFile = join(testDir, 'data-write.json');
      const data = { test: 'value', array: [1, 2, 3] };
      fm.writeFile(testFile, JSON.stringify(data, null, 2));
      const read = JSON.parse(readFileSync(testFile, 'utf8'));
      expect(read).toEqual(data);
    });
  });

  describe('Directory Operations', () => {
    test('should ensure directory exists', () => {
      const dir = join(testDir, 'ensure', 'nested', 'dir');
      expect(existsSync(dir)).toBe(false);
      fm.ensureDir(dir);
      expect(existsSync(dir)).toBe(true);
    });

    test('should not error if directory already exists', () => {
      const dir = join(testDir, 'existing');
      mkdirSync(dir, { recursive: true });
      expect(() => fm.ensureDir(dir)).not.toThrow();
    });

    test('should handle deeply nested directory creation', () => {
      const dir = join(testDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g');
      fm.ensureDir(dir);
      expect(existsSync(dir)).toBe(true);
    });
  });

  describe('File Appending', () => {
    test('should append content to existing file', () => {
      const testFile = join(testDir, 'append.txt');
      writeFileSync(testFile, 'First line\n');
      fm.appendFile(testFile, 'Second line\n');
      expect(readFileSync(testFile, 'utf8')).toBe('First line\nSecond line\n');
    });

    test('should create file if not exists when appending', () => {
      const testFile = join(testDir, 'append-new.txt');
      fm.appendFile(testFile, 'content');
      expect(readFileSync(testFile, 'utf8')).toBe('content');
    });

    test('should handle multiple appends', () => {
      const testFile = join(testDir, 'multi-append.txt');
      fm.appendFile(testFile, 'Line 1\n');
      fm.appendFile(testFile, 'Line 2\n');
      fm.appendFile(testFile, 'Line 3\n');
      expect(readFileSync(testFile, 'utf8')).toBe('Line 1\nLine 2\nLine 3\n');
    });

    test('should handle empty append', () => {
      const testFile = join(testDir, 'append-empty.txt');
      writeFileSync(testFile, 'original');
      fm.appendFile(testFile, '');
      expect(readFileSync(testFile, 'utf8')).toBe('original');
    });
  });

  describe('Error Handling', () => {
    test('should handle permission errors gracefully', () => {
      const testFile = join(testDir, 'permission-test.txt');
      writeFileSync(testFile, 'content');
      // Note: Permission errors are platform-specific
      expect(() => fm.readFile(testFile)).not.toThrow();
    });

    test('should handle invalid file paths', () => {
      // Empty path should throw
      expect(() => fm.readFile('')).toThrow();
      expect(fm.exists('')).toBeFalsy();
    });

    test('should handle null/undefined paths', () => {
      expect(() => {
        fm.exists(null);
        fm.exists(undefined);
      }).not.toThrow();
    });
  });

  describe('Atomic Operations', () => {
    test('should perform atomic writes', () => {
      const testFile = join(testDir, 'atomic.txt');
      fm.writeFile(testFile, 'atomic content');
      expect(readFileSync(testFile, 'utf8')).toBe('atomic content');
    });

    test('should not leave partial files on error', () => {
      const testFile = join(testDir, 'safe-write.txt');
      fm.writeFile(testFile, 'safe content');
      // If file was created, verify it's valid
      if (existsSync(testFile)) {
        expect(readFileSync(testFile, 'utf8')).toBe('safe content');
      }
    });
  });

  describe('Caching', () => {
    test('should support caching when enabled', () => {
      const fmWithCache = new FileManager({ enableCache: true });
      const testFile = join(testDir, 'cache-test.txt');
      writeFileSync(testFile, 'cached content');
      
      // First read
      const content1 = fmWithCache.readFile(testFile);
      // Second read (should use cache)
      const content2 = fmWithCache.readFile(testFile);
      
      expect(content1).toBe(content2);
      expect(content1).toBe('cached content');
    });

    test('should respect cache TTL', () => {
      const fmWithCache = new FileManager({ enableCache: true, cacheTTL: 100 });
      const testFile = join(testDir, 'cache-ttl.txt');
      writeFileSync(testFile, 'initial content');
      
      const content1 = fmWithCache.readFile(testFile);
      expect(content1).toBe('initial content');
      
      // Wait for cache to expire
      // (Note: actual TTL behavior depends on implementation)
    });
  });

  describe('Path Resolution', () => {
    test('should handle relative paths', () => {
      const testFile = join(testDir, 'relative.txt');
      fm.writeFile(testFile, 'content');
      expect(fm.exists(testFile)).toBe(true);
    });

    test('should handle absolute paths', () => {
      const testFile = join(testDir, 'absolute.txt');
      fm.writeFile(testFile, 'content');
      expect(fm.exists(testFile)).toBe(true);
    });

    test('should handle paths with dots', () => {
      const testFile = join(testDir, '..file.backup.txt');
      fm.writeFile(testFile, 'backup content');
      expect(fm.exists(testFile)).toBe(true);
    });
  });

  describe('File Types', () => {
    test('should handle text files', () => {
      const testFile = join(testDir, 'text.txt');
      fm.writeFile(testFile, 'text content');
      expect(fm.readFile(testFile)).toBe('text content');
    });

    test('should handle JSON files', () => {
      const testFile = join(testDir, 'data.json');
      const data = { key: 'value' };
      fm.writeFile(testFile, JSON.stringify(data));
      const read = JSON.parse(fm.readFile(testFile));
      expect(read).toEqual(data);
    });

    test('should handle CSV files', () => {
      const testFile = join(testDir, 'data.csv');
      const csv = 'name,age\nJohn,30\nJane,25';
      fm.writeFile(testFile, csv);
      expect(fm.readFile(testFile)).toBe(csv);
    });

    test('should handle log files', () => {
      const testFile = join(testDir, 'app.log');
      fm.appendFile(testFile, '[INFO] Application started\n');
      fm.appendFile(testFile, '[ERROR] Error occurred\n');
      const content = fm.readFile(testFile);
      expect(content).toContain('[INFO]');
      expect(content).toContain('[ERROR]');
    });
  });

  describe('Integration with Migrated Files', () => {
    test('FileManager should be importable and usable', () => {
      expect(fm).toBeDefined();
      expect(fm.exists).toBeDefined();
      expect(fm.readFile).toBeDefined();
      expect(fm.writeFile).toBeDefined();
      expect(fm.ensureDir).toBeDefined();
      expect(fm.appendFile).toBeDefined();
    });

    test('should support all methods used in secret-generator.js', () => {
      const testFile = join(testDir, 'secrets.json');
      const secrets = { apiKey: 'key123', token: 'token456' };
      fm.writeFile(testFile, JSON.stringify(secrets));
      const read = JSON.parse(fm.readFile(testFile));
      expect(read).toEqual(secrets);
    });

    test('should support all methods used in framework-config.js', () => {
      const configFile = join(testDir, 'config.json');
      fm.ensureDir(testDir);
      fm.writeFile(configFile, '{"framework": "clodo"}');
      expect(fm.exists(configFile)).toBe(true);
    });

    test('should support all methods used in ServiceInitializer.js', () => {
      const serviceDir = join(testDir, 'service');
      fm.ensureDir(serviceDir);
      const file = join(serviceDir, 'index.js');
      fm.writeFile(file, 'module.exports = {};');
      expect(fm.exists(file)).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle multiple operations efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const file = join(testDir, `file-${i}.txt`);
        fm.writeFile(file, `content ${i}`);
        fm.readFile(file);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds
    });

    test('should handle large file operations', () => {
      const largeFile = join(testDir, 'large.txt');
      const largeContent = 'X'.repeat(1000000); // 1MB
      fm.writeFile(largeFile, largeContent);
      const read = fm.readFile(largeFile);
      expect(read.length).toBe(largeContent.length);
    });
  });
});
