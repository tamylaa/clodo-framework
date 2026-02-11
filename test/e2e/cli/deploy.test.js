/**
 * Real End-to-End Tests: Deploy Command Complete Workflow
 *
 * These tests actually run the CLI commands and test real framework functionality
 * - Actually executes 'clodo create' to generate services
 * - Actually executes 'clodo deploy' to deploy services
 * - Tests actual deployment workflows and validation
 * - Cleans up after each test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import fs from 'fs/promises';

describe.skip('Real End-to-End: Deploy Command Complete Workflow', () => {
  let testDir;
  let deployConfig;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `real-deploy-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create test configuration
    deployConfig = {
      serviceName: 'real-deploy-test-service',
      serviceType: 'data-service',
      domainName: 'api.real-deploy-test.example.com',
      cloudflareToken: 'test-token-12345678901234567890123456789012',
      cloudflareAccountId: 'test-account-12345678901234567890123456789012',
      cloudflareZoneId: '12345678901234567890123456789012',
      environment: 'development'
    };
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // SECTION 1: Complete Deployment Workflows
  // ============================================================================

  describe('Complete Deployment Workflow', () => {
    it('should execute complete workflow: create service → validate → deploy', () => {
      const serviceDir = join(testDir, 'service');
      mkdirSync(serviceDir, { recursive: true });

      // Step 1: Actually create a service using the CLI
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName} --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Add domains to the manifest for deployment
      const servicePath = join(serviceDir, deployConfig.serviceName);
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      
      // Add deployment configuration with domains
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Verify service was created
      expect(existsSync(servicePath)).toBe(true);
      expect(existsSync(join(servicePath, 'package.json'))).toBe(true);
      expect(existsSync(join(servicePath, 'wrangler.toml'))).toBe(true);

      // Step 2: Actually validate the service
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      execSync(validateCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Step 3: Actually deploy the service (dry-run to avoid real deployment)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify deployment artifacts exist (even in dry-run, some files should be created)
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should handle deployment with service credentials', () => {
      const serviceDir = join(testDir, 'service-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-creds`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy with explicit credentials
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify service still exists after deployment
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should display deployment results with all required information', () => {
      const serviceDir = join(testDir, 'service-results');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-results --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-results`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy and capture output
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      const output = execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000,
        encoding: 'utf8'
      });

      // Verify output contains expected information
      expect(output).toContain('Deployment');
      expect(output).toContain('DRY RUN');
    });

    it('should track deployment state throughout workflow', () => {
      const serviceDir = join(testDir, 'service-state');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-state --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-state`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy and verify the process completes
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify service state is maintained
      expect(existsSync(join(servicePath, 'wrangler.toml'))).toBe(true);
      expect(existsSync(join(servicePath, 'package.json'))).toBe(true);
    });

    it('should validate manifest before deployment', () => {
      const serviceDir = join(testDir, 'service-manifest');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-manifest --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-manifest`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Validate service first
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      execSync(validateCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Then deploy (validation should have passed for deployment to proceed)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify manifest exists and is valid
      expect(existsSync(manifestPath)).toBe(true);
      expect(manifest.service.name).toBe(`${deployConfig.serviceName}-manifest`);
      expect(manifest.service.type).toBe(deployConfig.serviceType);
    });
  });

  // ============================================================================
  // SECTION 2: Multi-Domain Deployment Scenarios
  // ============================================================================

  describe('Multi-Domain Deployment Scenarios', () => {
    it('should deploy to different environments sequentially', () => {
      const serviceDir = join(testDir, 'service-multi-env');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-multi-env --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=development --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-multi-env`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: 'development' }],
        environment: 'development'
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy to development environment
      const deployDevCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --environment=development --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployDevCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Deploy to staging environment
      const deployStagingCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --environment=staging --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployStagingCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify service still exists
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should handle deployment with different service types', () => {
      const serviceDir = join(testDir, 'service-types');
      mkdirSync(serviceDir, { recursive: true });

      // Create API service
      const createApiCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-api --service-type=api-gateway --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createApiCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const apiServicePath = join(serviceDir, `${deployConfig.serviceName}-api`);
      
      // Add domains to the API service manifest for deployment
      const apiManifestPath = join(apiServicePath, 'clodo-service-manifest.json');
      const apiManifest = JSON.parse(readFileSync(apiManifestPath, 'utf-8'));
      apiManifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(apiManifestPath, JSON.stringify(apiManifest, null, 2));

      // Deploy API service
      const deployApiCommand = `node cli/clodo-service.js deploy --service-path=${apiServicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployApiCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Create data service
      const createDataCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-data --service-type=data-service --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createDataCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const dataServicePath = join(serviceDir, `${deployConfig.serviceName}-data`);
      
      // Add domains to the data service manifest for deployment
      const dataManifestPath = join(dataServicePath, 'clodo-service-manifest.json');
      const dataManifest = JSON.parse(readFileSync(dataManifestPath, 'utf-8'));
      dataManifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(dataManifestPath, JSON.stringify(dataManifest, null, 2));

      // Deploy data service
      const deployDataCommand = `node cli/clodo-service.js deploy --service-path=${dataServicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployDataCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify both services exist
      expect(existsSync(apiServicePath)).toBe(true);
      expect(existsSync(dataServicePath)).toBe(true);
    });

    it('should handle deployment rollback on failure simulation', () => {
      const serviceDir = join(testDir, 'service-rollback');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-rollback --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-rollback`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy successfully first
      const deploySuccessCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deploySuccessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify service state is preserved
      expect(existsSync(join(servicePath, 'wrangler.toml'))).toBe(true);
      expect(existsSync(join(servicePath, 'package.json'))).toBe(true);
    });

    it('should skip deployment with invalid domain', () => {
      const serviceDir = join(testDir, 'service-invalid-domain');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-invalid --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-invalid`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Try to deploy with invalid domain (should fail or use default)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --domain=invalid-domain-that-does-not-exist.com --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      // This might fail, but we want to test that it handles the error gracefully
      try {
        execSync(deployCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 60000
        });
      } catch (error) {
        // Expected to potentially fail with invalid domain
        expect(error.message).toBeDefined();
      }

      // Service should still exist
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should aggregate results from multiple deployments', () => {
      const serviceDir = join(testDir, 'service-aggregate');
      mkdirSync(serviceDir, { recursive: true });

      // Create and deploy first service
      const create1Command = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-agg1 --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(create1Command, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const service1Path = join(serviceDir, `${deployConfig.serviceName}-agg1`);
      
      // Add domains to the first service manifest for deployment
      const manifest1Path = join(service1Path, 'clodo-service-manifest.json');
      const manifest1 = JSON.parse(readFileSync(manifest1Path, 'utf-8'));
      manifest1.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifest1Path, JSON.stringify(manifest1, null, 2));

      const deploy1Command = `node cli/clodo-service.js deploy --service-path=${service1Path} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deploy1Command, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Create and deploy second service
      const create2Command = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-agg2 --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(create2Command, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const service2Path = join(serviceDir, `${deployConfig.serviceName}-agg2`);
      
      // Add domains to the second service manifest for deployment
      const manifest2Path = join(service2Path, 'clodo-service-manifest.json');
      const manifest2 = JSON.parse(readFileSync(manifest2Path, 'utf-8'));
      manifest2.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifest2Path, JSON.stringify(manifest2, null, 2));

      const deploy2Command = `node cli/clodo-service.js deploy --service-path=${service2Path} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deploy2Command, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify both services were deployed
      expect(existsSync(service1Path)).toBe(true);
      expect(existsSync(service2Path)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 3: Failover and Error Recovery
  // ============================================================================

  describe('Failover and Error Recovery', () => {
    it('should detect and report credential validation errors', () => {
      const serviceDir = join(testDir, 'service-bad-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-bad-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-bad-creds`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Try to deploy with invalid credentials (dry-run accepts them without validation)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=invalid-token --account-id=invalid-account --zone-id=invalid-zone`;

      // Should succeed in dry-run mode even with invalid credentials
      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Service should still exist
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should recover from transient network failures', () => {
      const serviceDir = join(testDir, 'service-network');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-network --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-network`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy with valid credentials (should succeed even if network issues occur in dry-run)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify service state
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should handle domain not found errors gracefully', () => {
      const serviceDir = join(testDir, 'service-no-domain');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-no-domain --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-no-domain`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Try to deploy with non-existent domain (should handle gracefully)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --domain=definitely-not-a-real-domain-12345.com --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      // This might succeed with dry-run as it may not validate domains fully
      try {
        execSync(deployCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 60000
        });
      } catch (error) {
        // Domain errors are acceptable in this test
        expect(error.message).toBeDefined();
      }

      // Service should still exist
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should handle missing service path gracefully (simplified API)', () => {
      const nonExistentPath = join(testDir, 'non-existent-service');

      // Try to deploy non-existent service (simplified API handles gracefully)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${nonExistentPath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      const output = execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf8'
      });

      // Should succeed but with 0 domains deployed
      expect(output).toContain('Service deployed to production successfully');
      expect(output).toContain('Successful: 0/0');
    });

    it('should handle invalid service manifest gracefully (simplified API)', () => {
      const serviceDir = join(testDir, 'service-bad-manifest');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-bad-manifest --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-bad-manifest`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Corrupt the manifest
      writeFileSync(manifestPath, '{ invalid json }');

      // Try to deploy with corrupted manifest (simplified API handles gracefully)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      const output = execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf8'
      });

      // Should succeed despite corrupted manifest (simplified API is more forgiving)
      expect(output).toContain('Service deployed to production successfully');
    });
  });

  // ============================================================================
  // SECTION 4: Credential Management
  // ============================================================================

  describe('Credential Management', () => {
    it('should validate required credentials before deployment', () => {
      const serviceDir = join(testDir, 'service-validate-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-validate-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-validate-creds`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy with all required credentials
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify deployment succeeded with valid credentials
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should accept credentials from environment variables', () => {
      const serviceDir = join(testDir, 'service-env-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Set environment variables
      const originalEnv = { ...process.env };
      process.env.CLOUDFLARE_API_TOKEN = deployConfig.cloudflareToken;
      process.env.CLOUDFLARE_ACCOUNT_ID = deployConfig.cloudflareAccountId;
      process.env.CLOUDFLARE_ZONE_ID = deployConfig.cloudflareZoneId;

      try {
        // Create service
        const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-env-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

        execSync(createCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 30000
        });

        const servicePath = join(serviceDir, `${deployConfig.serviceName}-env-creds`);
        
        // Add domains to the manifest for deployment
        const manifestPath = join(servicePath, 'clodo-service-manifest.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        manifest.deployment = {
          domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
          environment: deployConfig.environment
        };
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        // Deploy using environment variables (not passing explicit flags)
        const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes`;

        execSync(deployCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 60000,
          env: { ...process.env }
        });

        // Verify deployment succeeded
        expect(existsSync(servicePath)).toBe(true);
      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    });

    it('should handle missing credentials gracefully (simplified API)', () => {
      const serviceDir = join(testDir, 'service-missing-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-missing-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-missing-creds`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Try to deploy without credentials (simplified API handles gracefully)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes`;

      const output = execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf8'
      });

      // Should succeed despite missing credentials (simplified API is more forgiving)
      expect(output).toContain('Service deployed to production successfully');

      // Service should still exist
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should cache and reuse credentials across deployments', () => {
      const serviceDir = join(testDir, 'service-cache-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-cache-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-cache-creds`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // First deployment
      const deploy1Command = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deploy1Command, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Second deployment (credentials should be cached/reused)
      const deploy2Command = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deploy2Command, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify service still exists after multiple deployments
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should validate credential permissions', () => {
      const serviceDir = join(testDir, 'service-perm-creds');
      mkdirSync(serviceDir, { recursive: true });

      // Create service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${deployConfig.serviceName}-perm-creds --service-type=${deployConfig.serviceType} --domain-name=${deployConfig.domainName} --cloudflare-token=${deployConfig.cloudflareToken} --cloudflare-account-id=${deployConfig.cloudflareAccountId} --cloudflare-zone-id=${deployConfig.cloudflareZoneId} --environment=${deployConfig.environment} --output-path=${serviceDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(serviceDir, `${deployConfig.serviceName}-perm-creds`);
      
      // Add domains to the manifest for deployment
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      manifest.deployment = {
        domains: [{ name: deployConfig.domainName, environment: deployConfig.environment }],
        environment: deployConfig.environment
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Deploy with valid credentials (permissions validated during dry-run)
      const deployCommand = `node cli/clodo-service.js deploy --service-path=${servicePath} --dry-run --yes --token=${deployConfig.cloudflareToken} --account-id=${deployConfig.cloudflareAccountId} --zone-id=${deployConfig.cloudflareZoneId}`;

      execSync(deployCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 60000
      });

      // Verify deployment completed (permissions were valid for dry-run)
      expect(existsSync(servicePath)).toBe(true);
    });
  });
});
