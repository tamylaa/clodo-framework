/**
 * Tests for SiteConfigGenerator
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { SiteConfigGenerator } from '../../../src/service-management/generators/core/SiteConfigGenerator.js';

describe('SiteConfigGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new SiteConfigGenerator();
  });

  describe('Constructor', () => {
    test('should create instance with default name', () => {
      expect(generator.name).toBe('SiteConfigGenerator');
    });
  });

  describe('generate()', () => {
    test('should generate [site] config for static-site service', async () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        }
      };

      const config = await generator.generate(context);

      expect(config).toContain('[site]');
      expect(config).toContain('bucket = "./public"');
      expect(config).toContain('include = ["**/*"]');
      expect(config).toContain('exclude =');
      expect(config).toContain('node_modules/**');
    });

    test('should return empty string for non-static-site service', async () => {
      const context = {
        coreInputs: {
          serviceType: 'data'
        }
      };

      const config = await generator.generate(context);
      expect(config).toBe('');
    });

    test('should use custom bucket path if provided', async () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        },
        siteConfig: {
          bucket: './dist'
        }
      };

      const config = await generator.generate(context);
      expect(config).toContain('bucket = "./dist"');
    });

    test('should use custom include patterns if provided', async () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        },
        siteConfig: {
          include: ['*.html', '*.css', '*.js']
        }
      };

      const config = await generator.generate(context);
      expect(config).toContain('include = ["*.html","*.css","*.js"]');
    });

    test('should use custom exclude patterns if provided', async () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        },
        siteConfig: {
          exclude: ['*.log', 'temp/**']
        }
      };

      const config = await generator.generate(context);
      expect(config).toContain('exclude = ["*.log","temp/**"]');
    });

    test('should handle missing coreInputs gracefully', async () => {
      // With dual convention support, missing serviceType returns empty string
      const result = await generator.generate({});
      expect(result).toBe('');
    });
  });

  describe('buildSiteConfig()', () => {
    test('should build default site config', () => {
      const config = generator.buildSiteConfig();

      expect(config).toContain('[site]');
      expect(config).toContain('bucket = "./public"');
      expect(config).toContain('Workers Sites configuration');
    });

    test('should build config with custom bucket', () => {
      const config = generator.buildSiteConfig({ bucket: './build' });
      expect(config).toContain('bucket = "./build"');
    });

    test('should build config with custom include', () => {
      const config = generator.buildSiteConfig({
        include: ['assets/**', 'index.html']
      });
      expect(config).toContain('include = ["assets/**","index.html"]');
    });

    test('should build config with custom exclude', () => {
      const config = generator.buildSiteConfig({
        exclude: ['*.tmp']
      });
      expect(config).toContain('exclude = ["*.tmp"]');
    });

    test('should include comments', () => {
      const config = generator.buildSiteConfig();
      expect(config).toContain('# Workers Sites configuration');
      expect(config).toContain('# Serves static assets from the bucket directory');
    });
  });

  describe('getDefaultExcludes()', () => {
    test('should return default exclusion patterns', () => {
      const excludes = generator.getDefaultExcludes();

      expect(excludes).toContain('node_modules/**');
      expect(excludes).toContain('.git/**');
      expect(excludes).toContain('.env*');
      expect(excludes).toContain('secrets/**');
      expect(excludes).toContain('wrangler.toml');
      expect(excludes).toContain('package.json');
    });

    test('should include lock files', () => {
      const excludes = generator.getDefaultExcludes();

      expect(excludes).toContain('package-lock.json');
      expect(excludes).toContain('yarn.lock');
      expect(excludes).toContain('pnpm-lock.yaml');
    });

    test('should exclude hidden files', () => {
      const excludes = generator.getDefaultExcludes();
      expect(excludes).toContain('.*');
    });

    test('should exclude markdown files', () => {
      const excludes = generator.getDefaultExcludes();
      expect(excludes).toContain('*.md');
    });
  });

  describe('shouldGenerate()', () => {
    test('should return true for static-site service', () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        }
      };

      expect(generator.shouldGenerate(context)).toBe(true);
    });

    test('should return false for data service', () => {
      const context = {
        coreInputs: {
          serviceType: 'data'
        }
      };

      expect(generator.shouldGenerate(context)).toBe(false);
    });

    test('should return false for auth service', () => {
      const context = {
        coreInputs: {
          serviceType: 'auth'
        }
      };

      expect(generator.shouldGenerate(context)).toBe(false);
    });

    test('should return false for missing context', () => {
      expect(generator.shouldGenerate({})).toBe(false);
      expect(generator.shouldGenerate(null)).toBe(false);
    });
  });

  describe('validateSiteConfig()', () => {
    test('should validate valid site config', () => {
      const result = generator.validateSiteConfig({
        bucket: './public',
        include: ['**/*'],
        exclude: ['node_modules/**']
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid bucket type', () => {
      const result = generator.validateSiteConfig({
        bucket: 123
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('bucket must be a string path');
    });

    test('should reject invalid include type', () => {
      const result = generator.validateSiteConfig({
        include: 'not-an-array'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('include must be an array of glob patterns');
    });

    test('should reject invalid exclude type', () => {
      const result = generator.validateSiteConfig({
        exclude: { invalid: true }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('exclude must be an array of glob patterns');
    });

    test('should collect multiple errors', () => {
      const result = generator.validateSiteConfig({
        bucket: 123,
        include: 'invalid',
        exclude: { invalid: true }
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    test('should validate empty config as valid', () => {
      const result = generator.validateSiteConfig({});
      expect(result.valid).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should generate complete TOML section', async () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        },
        siteConfig: {
          bucket: './dist',
          include: ['*.html', 'assets/**'],
          exclude: ['*.log', 'temp/**']
        }
      };

      const config = await generator.generate(context);

      // Verify structure
      expect(config).toContain('[site]');
      expect(config).toContain('bucket = "./dist"');
      expect(config).toContain('include = ["*.html","assets/**"]');
      expect(config).toContain('exclude = ["*.log","temp/**"]');
      expect(config).toContain('Workers Sites configuration');

      // Verify it's valid TOML format
      expect(config.split('\n').filter(line => line.includes('=')).length).toBeGreaterThan(0);
    });

    test('should not generate for non-static services', async () => {
      const serviceTypes = ['data', 'auth', 'content', 'api-gateway', 'generic'];

      for (const serviceType of serviceTypes) {
        const context = {
          coreInputs: { serviceType }
        };

        const config = await generator.generate(context);
        expect(config).toBe('');
      }
    });
  });
});
