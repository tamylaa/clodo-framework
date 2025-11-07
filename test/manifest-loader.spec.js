/**
 * Tests for ManifestLoader
 * Tests manifest detection, loading, and validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ManifestLoader } from '../lib/shared/config/manifest-loader.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ManifestLoader', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `manifest-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('loadAndValidateCloudflareService', () => {
    it('should load Clodo manifest from root', async () => {
      const manifest = {
        serviceName: 'test-service',
        serviceType: 'data-service',
        version: '1.0.0'
      };

      writeFileSync(
        join(testDir, 'clodo-service-manifest.json'),
        JSON.stringify(manifest)
      );

      const result = await ManifestLoader.loadAndValidateCloudflareService(testDir);

      expect(result.manifest).toBeDefined();
      expect(result.manifest.serviceName).toBe('test-service');
      expect(result.isClodo).toBe(true);
    });

    it('should load manifest from .clodo/ directory', async () => {
      const manifest = { serviceName: 'test', serviceType: 'generic' };

      mkdirSync(join(testDir, '.clodo'), { recursive: true });
      writeFileSync(
        join(testDir, '.clodo/service-manifest.json'),
        JSON.stringify(manifest)
      );

      const result = await ManifestLoader.loadAndValidateCloudflareService(testDir);

      expect(result.manifest).toBeDefined();
      expect(result.manifest._location).toContain('.clodo');
      expect(result.isClodo).toBe(true);
    });

    it('should detect non-Cloudflare service', async () => {
      const result = await ManifestLoader.loadAndValidateCloudflareService(testDir);

      expect(result.manifest).toBeNull();
      expect(result.error).toBe('NOT_A_CLOUDFLARE_SERVICE');
      expect(result.isClodo).toBe(false);
    });

    it('should detect and build config from valid Cloudflare service', async () => {
      writeFileSync(
        join(testDir, 'wrangler.toml'),
        `
name = "my-api"
main = "src/index.js"
      `
      );

      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'my-api',
          version: '1.0.0'
        })
      );

      mkdirSync(join(testDir, 'src'), { recursive: true });
      writeFileSync(join(testDir, 'src/index.js'), 'export default {}');

      const result = await ManifestLoader.loadAndValidateCloudflareService(testDir);

      expect(result.manifest).toBeDefined();
      expect(result.manifest.serviceName).toBe('my-api');
      expect(result.manifest.isValidCloudflareService).toBe(true);
      expect(result.isClodo).toBe(false);
    });

    it('should fail for malformed Cloudflare service', async () => {
      writeFileSync(join(testDir, 'wrangler.toml'), 'invalid [[[');
      writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');

      const result = await ManifestLoader.loadAndValidateCloudflareService(testDir);

      expect(result.manifest).toBeNull();
      expect(result.error).toBe('CLOUDFLARE_SERVICE_INVALID');
    });

    it('should handle malformed manifest JSON', async () => {
      writeFileSync(
        join(testDir, 'clodo-service-manifest.json'),
        'invalid json {'
      );

      const fn = async () => {
        await ManifestLoader.loadAndValidateCloudflareService(testDir);
      };

      await expect(fn()).rejects.toThrow();
    });

    it('should prioritize Clodo manifest over Cloudflare files', async () => {
      // Create both Clodo manifest and Cloudflare files
      writeFileSync(
        join(testDir, 'clodo-service-manifest.json'),
        JSON.stringify({
          serviceName: 'clodo-service',
          serviceType: 'data-service'
        })
      );

      writeFileSync(
        join(testDir, 'wrangler.toml'),
        'name = "wrangler-service"'
      );

      writeFileSync(join(testDir, 'package.json'), '{"name": "pkg-service"}');

      const result = await ManifestLoader.loadAndValidateCloudflareService(testDir);

      expect(result.manifest.serviceName).toBe('clodo-service');
      expect(result.isClodo).toBe(true);
    });
  });

  describe('buildFromCloudflareService', () => {
    it('should build config from validation result', () => {
      const validationResult = {
        canDeploy: true,
        reason: 'SERVICE_VALID',
        validation: {
          wranglerConfig: {
            name: 'test-service'
          },
          packageJson: {
            name: 'test-service',
            version: '2.0.0'
          }
        },
        deploymentHistory: {
          hasDeploymentHistory: true
        }
      };

      const config = ManifestLoader.buildFromCloudflareService(validationResult, testDir);

      expect(config.serviceName).toBe('test-service');
      expect(config.serviceType).toBe('cloudflare-workers-service');
      expect(config.version).toBe('2.0.0');
      expect(config.isValidCloudflareService).toBe(true);
    });

    it('should handle missing package name', () => {
      const validationResult = {
        canDeploy: true,
        validation: {
          wranglerConfig: { name: 'wrangler-name' },
          packageJson: { version: '1.0.0' }
        },
        deploymentHistory: { hasDeploymentHistory: false }
      };

      const config = ManifestLoader.buildFromCloudflareService(validationResult, testDir);

      expect(config.serviceName).toBe('wrangler-name');
    });
  });

  describe('validateDeploymentReady', () => {
    it('should validate manifest with required fields', () => {
      const manifest = {
        serviceName: 'test',
        deployment: {
          domains: [
            { name: 'example.com', cloudflareZoneId: 'zone1' }
          ]
        }
      };

      const result = ManifestLoader.validateDeploymentReady(manifest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should error on missing serviceName', () => {
      const manifest = {
        deployment: { domains: [] }
      };

      const result = ManifestLoader.validateDeploymentReady(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing: serviceName');
    });

    it('should error on missing deployment config', () => {
      const manifest = { serviceName: 'test' };

      const result = ManifestLoader.validateDeploymentReady(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing: deployment configuration');
    });

    it('should error on missing domains for Clodo service', () => {
      const manifest = {
        serviceName: 'test',
        isClodoService: true,
        deployment: { domains: [] }
      };

      const result = ManifestLoader.validateDeploymentReady(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('deployment.domains'))).toBe(true);
    });
  });

  describe('printManifestInfo', () => {
    it('should print manifest info without errors', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const manifest = {
        serviceName: 'test-service',
        serviceType: 'data-service',
        _source: 'clodo-manifest',
        deployment: {
          domains: [
            { name: 'api.example.com', environment: 'production' }
          ]
        }
      };

      ManifestLoader.printManifestInfo(manifest);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call =>
        String(call[0]).includes('Service Name:')
      )).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
