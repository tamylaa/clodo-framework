/**
 * Tests for FileWriter
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FileWriter } from '../../../src/service-management/generators/utils/FileWriter.js';

describe('FileWriter', () => {
  let tempDir;
  let writer;

  beforeEach(async () => {
    // Use system temp directory with unique identifier to avoid conflicts
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    tempDir = path.join(os.tmpdir(), `clodo-filewriter-test-${uniqueId}`);
    await fs.mkdir(tempDir, { recursive: true });
    writer = new FileWriter({ basePath: tempDir });
  });

  afterEach(async () => {
    if (tempDir) {
      // Add delay to ensure file operations complete before cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('Constructor', () => {
    test('should create instance with options', () => {
      expect(writer.basePath).toBe(tempDir);
      expect(writer.dryRun).toBe(false);
      expect(writer.writtenFiles).toEqual([]);
    });

    test('should enable dry run mode if specified', () => {
      const dryWriter = new FileWriter({ dryRun: true });
      expect(dryWriter.dryRun).toBe(true);
    });
  });

  describe('writeFile()', () => {
    test('should write file', async () => {
      const result = await writer.writeFile('test.txt', 'Hello World!');
      
      expect(result.written).toBe(true);
      expect(result.path).toBe(path.join(tempDir, 'test.txt'));
      
      const content = await fs.readFile(path.join(tempDir, 'test.txt'), 'utf8');
      expect(content).toBe('Hello World!');
    });

    test('should create parent directories', async () => {
      await writer.writeFile('nested/deep/test.txt', 'Content');
      
      const content = await fs.readFile(path.join(tempDir, 'nested', 'deep', 'test.txt'), 'utf8');
      expect(content).toBe('Content');
    });

    test('should overwrite existing files by default', async () => {
      await writer.writeFile('test.txt', 'First');
      await writer.writeFile('test.txt', 'Second');
      
      const content = await fs.readFile(path.join(tempDir, 'test.txt'), 'utf8');
      expect(content).toBe('Second');
    });

    test('should skip existing files if overwrite is false', async () => {
      await writer.writeFile('test.txt', 'First');
      const result = await writer.writeFile('test.txt', 'Second', { overwrite: false });
      
      expect(result.written).toBe(false);
      expect(result.reason).toContain('File exists');
      
      const content = await fs.readFile(path.join(tempDir, 'test.txt'), 'utf8');
      expect(content).toBe('First');
    });

    test('should detect path traversal', async () => {
      await expect(
        writer.writeFile('../outside.txt', 'Bad')
      ).rejects.toThrow(/Path traversal detected/);
    });

    test('should work in dry run mode', async () => {
      const dryWriter = new FileWriter({ basePath: tempDir, dryRun: true });
      
      const result = await dryWriter.writeFile('test.txt', 'Content');
      
      expect(result.written).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(dryWriter.getWrittenFiles()).toContain(path.join(tempDir, 'test.txt'));
      
      // File should not actually exist
      await expect(fs.access(path.join(tempDir, 'test.txt'))).rejects.toThrow();
    });

    test('should track written files', async () => {
      await writer.writeFile('file1.txt', 'Content1');
      await writer.writeFile('file2.txt', 'Content2');
      
      const written = writer.getWrittenFiles();
      expect(written).toHaveLength(2);
      expect(written).toContain(path.join(tempDir, 'file1.txt'));
      expect(written).toContain(path.join(tempDir, 'file2.txt'));
    });
  });

  describe('ensureDirectory()', () => {
    test('should create directory', async () => {
      await writer.ensureDirectory(path.join(tempDir, 'newdir'));
      
      const stats = await fs.stat(path.join(tempDir, 'newdir'));
      expect(stats.isDirectory()).toBe(true);
    });

    test('should create nested directories', async () => {
      await writer.ensureDirectory(path.join(tempDir, 'a', 'b', 'c'));
      
      const stats = await fs.stat(path.join(tempDir, 'a', 'b', 'c'));
      expect(stats.isDirectory()).toBe(true);
    });

    test('should not throw if directory already exists', async () => {
      await writer.ensureDirectory(path.join(tempDir, 'existing'));
      await expect(writer.ensureDirectory(path.join(tempDir, 'existing'))).resolves.not.toThrow();
    });
  });

  describe('fileExists()', () => {
    test('should return true for existing file', async () => {
      await fs.writeFile(path.join(tempDir, 'exists.txt'), 'Content', 'utf8');
      
      const exists = await writer.fileExists(path.join(tempDir, 'exists.txt'));
      expect(exists).toBe(true);
    });

    test('should return false for missing file', async () => {
      const exists = await writer.fileExists(path.join(tempDir, 'missing.txt'));
      expect(exists).toBe(false);
    });
  });

  describe('deleteFile()', () => {
    test('should delete existing file', async () => {
      await fs.writeFile(path.join(tempDir, 'todelete.txt'), 'Content', 'utf8');
      
      const deleted = await writer.deleteFile('todelete.txt');
      expect(deleted).toBe(true);
      
      const exists = await writer.fileExists(path.join(tempDir, 'todelete.txt'));
      expect(exists).toBe(false);
    });

    test('should return false for missing file', async () => {
      const deleted = await writer.deleteFile('missing.txt');
      expect(deleted).toBe(false);
    });

    test('should work in dry run mode', async () => {
      const dryWriter = new FileWriter({ basePath: tempDir, dryRun: true });
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'Content', 'utf8');
      
      const deleted = await dryWriter.deleteFile('file.txt');
      expect(deleted).toBe(true);
      
      // File should still exist
      const exists = await dryWriter.fileExists(path.join(tempDir, 'file.txt'));
      expect(exists).toBe(true);
    });
  });

  describe('History Management', () => {
    test('should clear written files history', async () => {
      await writer.writeFile('file1.txt', 'Content1');
      await writer.writeFile('file2.txt', 'Content2');
      
      expect(writer.getWrittenFiles()).toHaveLength(2);
      
      writer.clearHistory();
      expect(writer.getWrittenFiles()).toHaveLength(0);
    });

    test('should provide statistics', async () => {
      await writer.writeFile('file1.txt', 'Content');
      await writer.writeFile('file2.txt', 'Content');
      
      const stats = writer.getStats();
      expect(stats.filesWritten).toBe(2);
      expect(stats.dryRun).toBe(false);
      expect(stats.basePath).toBe(tempDir);
    });
  });

  describe('Integration', () => {
    test('should handle complete workflow', async () => {
      // Write multiple files
      await writer.writeFile('config.json', '{"name":"test"}');
      await writer.writeFile('src/index.js', 'console.log("Hello");');
      await writer.writeFile('README.md', '# Test Project');
      
      // Verify all written
      expect(writer.getWrittenFiles()).toHaveLength(3);
      
      // Verify files exist
      expect(await writer.fileExists(path.join(tempDir, 'config.json'))).toBe(true);
      expect(await writer.fileExists(path.join(tempDir, 'src/index.js'))).toBe(true);
      expect(await writer.fileExists(path.join(tempDir, 'README.md'))).toBe(true);
      
      // Delete one
      await writer.deleteFile('config.json');
      expect(await writer.fileExists(path.join(tempDir, 'config.json'))).toBe(false);
    });
  });
});
