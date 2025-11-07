/**
 * Tests for CloudflareServiceValidator
 * Tests detection and validation of Cloudflare Workers services
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CloudflareServiceValidator } from '../lib/shared/config/cloudflare-service-validator.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CloudflareServiceValidator', () => {
  let testDir;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `clodo-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectCloudflareService', () => {
    it('should detect valid Cloudflare service with wrangler.toml and package.json', () => {
      // Create required files
      writeFileSync(join(testDir, 'wrangler.toml'), 'name = "test-service"');
      writeFileSync(join(testDir, 'package.json'), '{"name": "test-service"}');

      const result = CloudflareServiceValidator.detectCloudflareService(testDir);

      expect(result.isCloudflareService).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.wranglerPath).toBeTruthy();
      expect(result.packagePath).toBeTruthy();
    });

    it('should detect missing wrangler.toml', () => {
      writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');

      const result = CloudflareServiceValidator.detectCloudflareService(testDir);

      expect(result.isCloudflareService).toBe(false);
      expect(result.errors).toContain('Missing wrangler.toml');
    });

    it('should detect missing package.json', () => {
      writeFileSync(join(testDir, 'wrangler.toml'), 'name = "test"');

      const result = CloudflareServiceValidator.detectCloudflareService(testDir);

      expect(result.isCloudflareService).toBe(false);
      expect(result.errors).toContain('Missing package.json');
    });

    it('should detect missing both files', () => {
      const result = CloudflareServiceValidator.detectCloudflareService(testDir);

      expect(result.isCloudflareService).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateServiceStructure', () => {
    it('should validate well-formed service', () => {
      const wranglerPath = join(testDir, 'wrangler.toml');
      const packagePath = join(testDir, 'package.json');

      writeFileSync(
        wranglerPath,
        `
name = "my-service"
main = "src/index.js"

[env.production]
name = "my-service-prod"
      `
      );

      writeFileSync(
        packagePath,
        JSON.stringify({
          name: 'my-service',
          version: '1.0.0',
          dependencies: { wrangler: '^3.0.0' }
        })
      );

      // Create entry point
      mkdirSync(join(testDir, 'src'), { recursive: true });
      writeFileSync(join(testDir, 'src/index.js'), 'export default {}');

      const result = CloudflareServiceValidator.validateServiceStructure(
        testDir,
        wranglerPath,
        packagePath
      );

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify missing name in wrangler.toml', () => {
      const wranglerPath = join(testDir, 'wrangler.toml');
      const packagePath = join(testDir, 'package.json');

      writeFileSync(wranglerPath, 'main = "src/index.js"');
      writeFileSync(packagePath, '{"name": "test"}');

      const result = CloudflareServiceValidator.validateServiceStructure(
        testDir,
        wranglerPath,
        packagePath
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('wrangler.toml: Missing "name" field');
    });

    it('should warn about missing entry point', () => {
      const wranglerPath = join(testDir, 'wrangler.toml');
      const packagePath = join(testDir, 'package.json');

      writeFileSync(wranglerPath, 'name = "test-service"');
      writeFileSync(packagePath, '{"name": "test-service"}');

      const result = CloudflareServiceValidator.validateServiceStructure(
        testDir,
        wranglerPath,
        packagePath
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should parse malformed TOML gracefully', () => {
      const wranglerPath = join(testDir, 'wrangler.toml');
      const packagePath = join(testDir, 'package.json');

      writeFileSync(wranglerPath, 'invalid toml [[[');
      writeFileSync(packagePath, '{"name": "test"}');

      const result = CloudflareServiceValidator.validateServiceStructure(
        testDir,
        wranglerPath,
        packagePath
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('detectExistingDeployments', () => {
    it('should detect .wrangler deployment marker', () => {
      mkdirSync(join(testDir, '.wrangler'));

      const result = CloudflareServiceValidator.detectExistingDeployments(testDir);

      expect(result.hasDeploymentHistory).toBe(true);
      expect(result.deploymentMarkers).toContain(join(testDir, '.wrangler'));
    });

    it('should detect dist/ deployment marker', () => {
      mkdirSync(join(testDir, 'dist'));

      const result = CloudflareServiceValidator.detectExistingDeployments(testDir);

      expect(result.hasDeploymentHistory).toBe(true);
    });

    it('should detect multiple deployment markers', () => {
      mkdirSync(join(testDir, '.wrangler'));
      mkdirSync(join(testDir, 'build'));

      const result = CloudflareServiceValidator.detectExistingDeployments(testDir);

      expect(result.hasDeploymentHistory).toBe(true);
      expect(result.deploymentMarkers.length).toBeGreaterThanOrEqual(2);
    });

    it('should return false when no deployments exist', () => {
      const result = CloudflareServiceValidator.detectExistingDeployments(testDir);

      expect(result.hasDeploymentHistory).toBe(false);
      expect(result.deploymentMarkers).toHaveLength(0);
    });
  });

  describe('validateForDeployment', () => {
    it('should detect not a Cloudflare service', () => {
      const result = CloudflareServiceValidator.validateForDeployment(testDir);

      expect(result.canDeploy).toBe(false);
      expect(result.reason).toBe('NOT_A_CLOUDFLARE_SERVICE');
    });

    it('should validate complete deployment-ready service', () => {
      writeFileSync(join(testDir, 'wrangler.toml'), 'name = "test"');
      writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');
      mkdirSync(join(testDir, 'src'), { recursive: true });
      writeFileSync(join(testDir, 'src/index.js'), 'export default {}');

      const result = CloudflareServiceValidator.validateForDeployment(testDir);

      expect(result.canDeploy).toBe(true);
    });

    it('should detect invalid service configuration', () => {
      writeFileSync(join(testDir, 'wrangler.toml'), 'invalid [[[');
      writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');

      const result = CloudflareServiceValidator.validateForDeployment(testDir);

      expect(result.canDeploy).toBe(false);
      expect(result.reason).toBe('SERVICE_CONFIGURATION_INVALID');
    });
  });
});
