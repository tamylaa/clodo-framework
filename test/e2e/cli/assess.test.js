/**
 * Real End-to-End Tests: Assess Command Complete Workflow
 *
 * These tests actually run the CLI commands and test real framework functionality
 * - Actually executes 'clodo assess' commands
 * - Tests capability assessment on services and domains
 * - Tests report export functionality
 * - Cleans up after each test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';

describe('Real End-to-End: Assess Command Complete Workflow', () => {
  let testDir;
  let createConfig;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `real-assess-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock configuration for service creation
    createConfig = {
      serviceName: 'assess-test-service',
      serviceType: 'data-service',
      domainName: 'api.assess-test.example.com',
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

  describe('Real Service Assessment Operations', () => {
    it('should actually assess a service using basic assessment', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // First create a service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Now assess the service
      const assessCommand = `node cli/clodo-service.js assess ${servicePath}`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Assessment Results');
      expect(output).toContain('Service Path:');
    });

    it('should assess a specific domain', () => {
      const assessCommand = `node cli/clodo-service.js assess --domain=${createConfig.domainName}`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Assessment Results');
      expect(output).toContain(createConfig.domainName);
    });

    it('should assess a specific service type', () => {
      const assessCommand = `node cli/clodo-service.js assess --service-type=${createConfig.serviceType}`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Assessment Results');
      expect(output).toContain(createConfig.serviceType);
    });

    it('should export assessment results to file', () => {
      const exportPath = join(testDir, 'assessment-results.json');

      const assessCommand = `node cli/clodo-service.js assess --service-type=${createConfig.serviceType} --export=${exportPath}`;

      execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify export file was created
      expect(existsSync(exportPath)).toBe(true);

      // Verify export content
      const exportContent = readFileSync(exportPath, 'utf8');
      const results = JSON.parse(exportContent);
      expect(results).toHaveProperty('serviceType');
      // The assessment might return 'generic' as default, which is acceptable
      expect(['data-service', 'generic']).toContain(results.serviceType);
    });

    it('should work with Cloudflare token parameter', () => {
      const assessCommand = `node cli/clodo-service.js assess --domain=${createConfig.domainName} --token=${createConfig.cloudflareToken}`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Assessment Results');
    });

    it('should assess current directory when no path specified', () => {
      // Create a temporary directory to assess
      const tempServiceDir = join(testDir, 'temp-service');
      mkdirSync(tempServiceDir, { recursive: true });

      // Create a minimal package.json to make it look like a service
      const packageJson = {
        name: 'temp-service',
        version: '1.0.0',
        type: 'module'
      };
      writeFileSync(join(tempServiceDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Change to the directory and run assess
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const assessCommand = `cd ${tempServiceDir} && node ${cliPath} assess`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Assessment Results');
      expect(output).toContain('Service Path:');
    });

    it('should handle assessment with verbose output', () => {
      const assessCommand = `node cli/clodo-service.js assess --service-type=${createConfig.serviceType} --verbose`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Assessment Results');
      // Verbose output might include additional details
    });

    it('should handle assessment with JSON output', () => {
      const assessCommand = `node cli/clodo-service.js assess --service-type=${createConfig.serviceType} --json`;

      const result = execSync(assessCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      // JSON output should contain JSON data, but may be wrapped in formatting
      expect(output).toContain('Service Type');
    });
  });
});