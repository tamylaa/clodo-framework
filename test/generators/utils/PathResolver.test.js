/**
 * Tests for PathResolver
 */
import { describe, test, expect } from '@jest/globals';
import path from 'path';
import { PathResolver } from '../../../src/service-management/generators/utils/PathResolver.js';

describe('PathResolver', () => {
  describe('Constructor', () => {
    test('should create instance with basePath', () => {
      const resolver = new PathResolver({ basePath: '/base/path' });
      expect(resolver.basePath).toBe('/base/path');
    });

    test('should create instance without basePath', () => {
      const resolver = new PathResolver();
      expect(resolver.basePath).toBeUndefined();
    });
  });

  describe('resolve()', () => {
    test('should resolve paths relative to basePath', () => {
      const resolver = new PathResolver({ basePath: '/base' });
      const resolved = resolver.resolve('sub', 'file.txt');
      
      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved).toContain('base');
      expect(resolved).toContain('sub');
      expect(resolved).toContain('file.txt');
    });

    test('should resolve paths without basePath', () => {
      const resolver = new PathResolver();
      const resolved = resolver.resolve('sub', 'file.txt');
      
      expect(path.isAbsolute(resolved)).toBe(true);
    });
  });

  describe('join()', () => {
    test('should join path segments', () => {
      const resolver = new PathResolver();
      const joined = resolver.join('a', 'b', 'c', 'file.txt');
      
      expect(joined).toBe(path.join('a', 'b', 'c', 'file.txt'));
    });

    test('should handle various segment types', () => {
      const resolver = new PathResolver();
      const joined = resolver.join('a', '..', 'b', '.', 'file.txt');
      
      expect(joined).toBe(path.join('a', '..', 'b', '.', 'file.txt'));
    });
  });

  describe('normalize()', () => {
    test('should normalize paths', () => {
      const resolver = new PathResolver();
      const normalized = resolver.normalize('a/b/../c/./file.txt');
      
      expect(normalized).toBe(path.normalize('a/b/../c/./file.txt'));
    });
  });

  describe('relative()', () => {
    test('should calculate relative path', () => {
      const resolver = new PathResolver();
      const rel = resolver.relative('/a/b/c', '/a/b/d/file.txt');
      
      expect(rel).toBe(path.relative('/a/b/c', '/a/b/d/file.txt'));
    });
  });

  describe('dirname()', () => {
    test('should get directory name', () => {
      const resolver = new PathResolver();
      expect(resolver.dirname('/path/to/file.txt')).toBe('/path/to');
    });
  });

  describe('basename()', () => {
    test('should get base name', () => {
      const resolver = new PathResolver();
      expect(resolver.basename('/path/to/file.txt')).toBe('file.txt');
    });

    test('should remove extension if provided', () => {
      const resolver = new PathResolver();
      expect(resolver.basename('/path/to/file.txt', '.txt')).toBe('file');
    });
  });

  describe('extname()', () => {
    test('should get extension', () => {
      const resolver = new PathResolver();
      expect(resolver.extname('file.txt')).toBe('.txt');
      expect(resolver.extname('file.min.js')).toBe('.js');
    });

    test('should return empty string for no extension', () => {
      const resolver = new PathResolver();
      expect(resolver.extname('file')).toBe('');
    });
  });

  describe('isAbsolute()', () => {
    test('should detect absolute paths', () => {
      const resolver = new PathResolver();
      
      if (process.platform === 'win32') {
        expect(resolver.isAbsolute('C:\\path\\to\\file')).toBe(true);
        expect(resolver.isAbsolute('relative\\path')).toBe(false);
      } else {
        expect(resolver.isAbsolute('/path/to/file')).toBe(true);
        expect(resolver.isAbsolute('relative/path')).toBe(false);
      }
    });
  });

  describe('validatePath()', () => {
    test('should allow safe paths', () => {
      const resolver = new PathResolver({ basePath: '/base' });
      expect(resolver.validatePath('sub/file.txt')).toBe(true);
    });

    test('should throw on path traversal', () => {
      const resolver = new PathResolver({ basePath: '/base' });
      expect(() => resolver.validatePath('../outside')).toThrow(/Path traversal detected/);
    });

    test('should return true if no basePath', () => {
      const resolver = new PathResolver();
      expect(resolver.validatePath('../anywhere')).toBe(true);
    });
  });

  describe('toForwardSlashes()', () => {
    test('should convert to forward slashes', () => {
      const resolver = new PathResolver();
      
      if (process.platform === 'win32') {
        expect(resolver.toForwardSlashes('a\\b\\c')).toBe('a/b/c');
      } else {
        expect(resolver.toForwardSlashes('a/b/c')).toBe('a/b/c');
      }
    });
  });

  describe('toNativeSeparators()', () => {
    test('should convert to native separators', () => {
      const resolver = new PathResolver();
      const result = resolver.toNativeSeparators('a/b/c');
      
      expect(result).toBe(path.join('a', 'b', 'c'));
    });
  });

  describe('getSeparator()', () => {
    test('should return platform separator', () => {
      const resolver = new PathResolver();
      expect(resolver.getSeparator()).toBe(path.sep);
    });
  });

  describe('parse()', () => {
    test('should parse path into components', () => {
      const resolver = new PathResolver();
      const parsed = resolver.parse('/path/to/file.txt');
      
      expect(parsed).toHaveProperty('dir');
      expect(parsed).toHaveProperty('base');
      expect(parsed).toHaveProperty('ext');
      expect(parsed).toHaveProperty('name');
      expect(parsed.base).toBe('file.txt');
      expect(parsed.ext).toBe('.txt');
      expect(parsed.name).toBe('file');
    });
  });

  describe('format()', () => {
    test('should format path components', () => {
      const resolver = new PathResolver();
      const formatted = resolver.format({
        dir: '/path/to',
        base: 'file.txt'
      });
      
      expect(formatted).toBe(path.format({
        dir: '/path/to',
        base: 'file.txt'
      }));
    });
  });

  describe('Cross-platform compatibility', () => {
    test('should handle platform-specific paths', () => {
      const resolver = new PathResolver();
      
      if (process.platform === 'win32') {
        // Windows path handling
        expect(resolver.normalize('C:\\Users\\test\\..\\file.txt')).toContain('Users');
        expect(resolver.isAbsolute('C:\\path')).toBe(true);
      } else {
        // Unix path handling
        expect(resolver.normalize('/home/test/../file.txt')).toBe('/home/file.txt');
        expect(resolver.isAbsolute('/path')).toBe(true);
      }
    });
  });
});
