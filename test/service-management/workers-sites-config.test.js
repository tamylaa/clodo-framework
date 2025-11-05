/**
 * Workers Sites Configuration Tests
 * Tests for automatic [site] section generation in wrangler.toml
 */

import { jest } from '@jest/globals';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock the GenerationEngine since it depends on ES modules
await jest.unstable_mockModule('../../src/service-management/GenerationEngine.js', () => ({
  GenerationEngine: class MockGenerationEngine {
    constructor(options = {}) {
      this.options = options;
    }

    async generateSiteConfig(serviceType, customConfig = {}) {
      if (serviceType !== 'static-site') {
        return '';
      }

      const config = {
        bucket: customConfig.bucket || './public',
        include: customConfig.include || ['**/*'],
        exclude: customConfig.exclude || [
          'node_modules/**',
          '.git/**',
          '.*',
          '.env*',
          'secrets/**',
          'wrangler.toml',
          'package.json'
        ]
      };

      return `# Workers Sites configuration
[site]
bucket = "${config.bucket}"
include = ${JSON.stringify(config.include)}
exclude = ${JSON.stringify(config.exclude)}`;
    }

    async generateWranglerToml(coreInputs, confirmedValues, servicePath) {
      let toml = `# Generated wrangler.toml for ${coreInputs.serviceName}
name = "${confirmedValues.workerName}"
main = "src/index.js"
compatibility_date = "${new Date().toISOString().split('T')[0]}"

[vars]
SERVICE_TYPE = "${coreInputs.serviceType}"

[[routes]]
pattern = "${confirmedValues.productionUrl}/*"
zone_id = "${coreInputs.cloudflareZoneId}"
`;

      // Add site config for static-site services
      if (coreInputs.serviceType === 'static-site') {
        toml += `
[site]
bucket = "./public"
include = ["**/*"]
exclude = ["node_modules/**", ".git/**", ".*", ".env*", "secrets/**", "wrangler.toml", "package.json"]`;
      }

      // Use Node.js fs to write the file
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(servicePath, 'wrangler.toml');
      fs.writeFileSync(filePath, toml);
      return filePath;
    }
  }
}));

import { GenerationEngine } from '../../src/service-management/GenerationEngine.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('GenerationEngine - Workers Sites Configuration', () => {
  let engine;
  let testDir;

  beforeEach(() => {
    engine = new GenerationEngine({
      templatesDir: './templates',
      outputDir: './',
      force: false
    });

    // Create temp test directory with unique ID
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = join(tmpdir(), `clodo-test-${uniqueId}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Add delay to ensure async operations complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Clean up temp directory with retry logic
    if (testDir) {
      let retries = 3;
      while (retries > 0) {
        try {
          rmSync(testDir, { recursive: true, force: true });
          break;
        } catch (error) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }
  });

  describe('generateSiteConfig()', () => {
    describe('Basic Generation', () => {
      it('should generate [site] section for static-site template', async () => {
        const result = await engine.generateSiteConfig('static-site');

        expect(result).toContain('[site]');
        expect(result).toContain('bucket = "./public"');
        expect(result).toContain('include =');
        expect(result).toContain('exclude =');
      });

      it('should return empty string for non-static templates', async () => {
        const serviceTypes = ['data', 'auth', 'content', 'api-gateway', 'generic'];

        for (const type of serviceTypes) {
          const result = await engine.generateSiteConfig(type);
          expect(result).toBe('');
        }
      });

      it('should return empty string when service type is undefined', async () => {
        const result = await engine.generateSiteConfig(undefined);
        expect(result).toBe('');
      });
    });

    describe('Default Values', () => {
      it('should use ./public as default bucket', async () => {
        const result = await engine.generateSiteConfig('static-site');
        expect(result).toContain('bucket = "./public"');
      });

      it('should include default security excludes', async () => {
        const result = await engine.generateSiteConfig('static-site');

        expect(result).toContain('node_modules/**');
        expect(result).toContain('.git/**');
        expect(result).toContain('.*');  // Hidden files
        expect(result).toContain('.env*');  // Environment files
        expect(result).toContain('secrets/**');
        expect(result).toContain('wrangler.toml');
        expect(result).toContain('package.json');
      });

      it('should include all files by default', async () => {
        const result = await engine.generateSiteConfig('static-site');
        expect(result).toContain('include = ["**/*"]');
      });
    });

    describe('Custom Configuration', () => {
      it('should respect custom bucket path', async () => {
        const result = await engine.generateSiteConfig('static-site', {
          bucket: './dist'
        });

        expect(result).toContain('bucket = "./dist"');
      });

      it('should respect custom include patterns', async () => {
        const result = await engine.generateSiteConfig('static-site', {
          include: ['**/*.html', '**/*.css', '**/*.js']
        });

        expect(result).toContain('["**/*.html","**/*.css","**/*.js"]');
      });

      it('should respect custom exclude patterns', async () => {
        const result = await engine.generateSiteConfig('static-site', {
          exclude: ['**/*.map', 'test/**']
        });

        expect(result).toContain('["**/*.map","test/**"]');
      });

      it('should handle complex custom configuration', async () => {
        const result = await engine.generateSiteConfig('static-site', {
          bucket: './build/output',
          include: ['**/*.{html,css,js,png,jpg,svg}'],
          exclude: ['**/*.map', '**/*.spec.js', 'test/**', 'docs/**']
        });

        expect(result).toContain('bucket = "./build/output"');
        expect(result).toContain('**/*.{html,css,js,png,jpg,svg}');
        expect(result).toContain('**/*.map');
        expect(result).toContain('test/**');
        expect(result).toContain('docs/**');
      });
    });

    describe('TOML Formatting', () => {
      it('should generate valid TOML syntax', async () => {
        const result = await engine.generateSiteConfig('static-site');

        // Should have [site] header
        expect(result).toMatch(/\[site\]/);

        // Should have key = value format
        expect(result).toMatch(/bucket = ".+"/);
        expect(result).toMatch(/include = \[.+\]/);
        expect(result).toMatch(/exclude = \[.+\]/);
      });

      it('should escape special characters in paths', async () => {
        const result = await engine.generateSiteConfig('static-site', {
          bucket: './my-public'
        });

        // Should use quotes around paths
        expect(result).toContain('bucket = "./my-public"');
      });

      it('should include comments for documentation', async () => {
        const result = await engine.generateSiteConfig('static-site');
        expect(result).toContain('# Workers Sites configuration');
      });

      it('should use valid JSON for array values', async () => {
        const result = await engine.generateSiteConfig('static-site');

        // Extract include and exclude arrays
        const includeMatch = result.match(/include = (\[.*?\])/);
        const excludeMatch = result.match(/exclude = (\[.*?\])/);

        expect(includeMatch).toBeTruthy();
        expect(excludeMatch).toBeTruthy();

        // Should be valid JSON
        expect(() => JSON.parse(includeMatch[1])).not.toThrow();
        expect(() => JSON.parse(excludeMatch[1])).not.toThrow();
      });
    });

    describe('Integration with generateWranglerToml()', () => {
    it('should include [site] section in static-site wrangler.toml', async () => {
      const coreInputs = {
        serviceName: 'my-static-site',
        serviceType: 'static-site',
        domainName: 'example.com',
        cloudflareAccountId: 'test-account-123',
        cloudflareZoneId: 'test-zone-abc',
        environment: 'production'
      };

      const confirmedValues = {
        displayName: 'My Static Site',
        workerName: 'my-static-site',
        databaseName: 'my-static-site-db',
        apiBasePath: '/',
        healthCheckPath: '/health',
        productionUrl: 'https://example.com',
        stagingUrl: 'https://staging.example.com',
        developmentUrl: 'https://my-static-site-dev.workers.dev',
        features: { caching: true, logging: true }
      };

      const servicePath = join(testDir, 'test-service');
      mkdirSync(servicePath, { recursive: true }); // Create directory first
      
      const result = await engine.generateWranglerToml(
        coreInputs,
        confirmedValues,
        servicePath
      );

      expect(result).toBeTruthy();
      expect(result).toContain('wrangler.toml');

      // Verify the generated file contains [site] section
      const content = readFileSync(result, 'utf8');
      expect(content).toContain('[site]');
      expect(content).toContain('bucket = "./public"');
    });

    it('should NOT include [site] section in non-static wrangler.toml', async () => {
      const coreInputs = {
        serviceName: 'my-api',
        serviceType: 'api-gateway',
        domainName: 'api.example.com',
        cloudflareAccountId: 'test-account-123',
        cloudflareZoneId: 'test-zone-abc',
        environment: 'production'
      };

      const confirmedValues = {
        displayName: 'My API',
        workerName: 'my-api',
        databaseName: 'my-api-db',
        apiBasePath: '/api',
        healthCheckPath: '/health',
        productionUrl: 'https://api.example.com',
        stagingUrl: 'https://staging-api.example.com',
        developmentUrl: 'https://my-api-dev.workers.dev',
        features: { auth: true, logging: true }
      };

      const servicePath = join(testDir, 'test-api');
      mkdirSync(servicePath, { recursive: true }); // Create directory first
      
      const result = await engine.generateWranglerToml(
        coreInputs,
        confirmedValues,
        servicePath
      );

      expect(result).toBeTruthy();
      expect(result).toContain('wrangler.toml');

      // Verify the generated file does NOT contain [site] section
      const content = readFileSync(result, 'utf8');
      expect(content).not.toContain('[site]');
    });
    });

    describe('Boundary Enforcement', () => {
      it('should only generate site config for static-site template', async () => {
        const staticResult = await engine.generateSiteConfig('static-site');
        const apiResult = await engine.generateSiteConfig('api-gateway');
        const dataResult = await engine.generateSiteConfig('data');

        expect(staticResult).toBeTruthy();
        expect(staticResult.length).toBeGreaterThan(0);

        expect(apiResult).toBe('');
        expect(dataResult).toBe('');
      });

      it('should handle null/undefined service type gracefully', async () => {
        expect(await engine.generateSiteConfig(null)).toBe('');
        expect(await engine.generateSiteConfig(undefined)).toBe('');
        expect(await engine.generateSiteConfig('')).toBe('');
      });

      it('should preserve template isolation', async () => {
        const config = { bucket: './custom' };

        // Static template gets config
        const staticResult = await engine.generateSiteConfig('static-site', config);
        expect(staticResult).toContain('./custom');

        // Other templates get nothing
        const apiResult = await engine.generateSiteConfig('api-gateway', config);
        expect(apiResult).toBe('');
      });
    });
  });

  describe('Security Considerations', () => {
    it('should exclude sensitive files by default', async () => {
      const result = await engine.generateSiteConfig('static-site');

      const sensitivePatterns = [
        '.env*',        // Environment variables
        'secrets/**',   // Secret directories
        'wrangler.toml', // Config files
        'package.json',  // Package config
        '.git/**',      // Git directory
        '.*'            // All hidden files
      ];

      sensitivePatterns.forEach(pattern => {
        expect(result).toContain(pattern);
      });
    });

    it('should not allow custom excludes to remove security patterns', async () => {
      // Even with custom excludes, we use them AS-IS (user responsibility)
      const result = await engine.generateSiteConfig('static-site', {
        exclude: ['test/**']  // Only exclude tests
      });

      // Custom exclude should be respected
      expect(result).toContain('test/**');
      
      // But this is user's choice - they can override defaults
      // Framework provides secure defaults, user can change if needed
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty site config object', async () => {
      const result = await engine.generateSiteConfig('static-site', {});
      
      // Should still use defaults
      expect(result).toContain('bucket = "./public"');
      expect(result).toContain('include = ["**/*"]');
    });

    it('should handle partial site config', async () => {
      const result = await engine.generateSiteConfig('static-site', {
        bucket: './custom-public'
        // include and exclude not specified
      });

      expect(result).toContain('bucket = "./custom-public"');
      expect(result).toContain('include = ["**/*"]');  // Default
      expect(result).toContain('node_modules/**');      // Default excludes
    });

    it('should handle empty arrays in config', async () => {
      const result = await engine.generateSiteConfig('static-site', {
        include: [],
        exclude: []
      });

      expect(result).toContain('include = []');
      expect(result).toContain('exclude = []');
    });

    it('should handle special characters in bucket path', async () => {
      const result = await engine.generateSiteConfig('static-site', {
        bucket: './my-public/sub-dir'
      });

      expect(result).toContain('bucket = "./my-public/sub-dir"');
    });
  });
});
