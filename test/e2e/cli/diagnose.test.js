/**
 * Real End-to-End Tests: Diagnose Command Complete Workflow
 *
 * These tests actually run the CLI commands and test real framework functionality
 * - Actually executes 'clodo diagnose' commands
 * - Tests diagnostic scanning on real services
 * - Tests report export functionality
 * - Cleans up after each test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';

describe('Real End-to-End: Diagnose Command Complete Workflow', () => {
  let testDir;
  let createConfig;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `real-diagnose-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock configuration for service creation
    createConfig = {
      serviceName: 'diagnose-test-service',
      serviceType: 'data-service',
      domainName: 'api.diagnose-test.example.com',
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

  describe('Real Service Diagnostic Operations', () => {
    it('should actually diagnose a healthy service', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // First create a healthy service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Now diagnose the service
      const diagnoseCommand = `node cli/clodo-service.js diagnose ${servicePath}`;

      const result = execSync(diagnoseCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Diagnostic Report');
      expect(output).toContain('Service:');
      expect(output).toContain('Path:');
    });

    it('should perform deep scan when requested', () => {
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

      // Diagnose with deep scan
      const diagnoseCommand = `node cli/clodo-service.js diagnose ${servicePath} --deep-scan`;

      const result = execSync(diagnoseCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Diagnostic Report');
      // Deep scan might include additional checks
    });

    it('should export diagnostic report to file', () => {
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
      const reportPath = join(testDir, 'diagnostic-report.json');

      // Diagnose and export report
      const diagnoseCommand = `node cli/clodo-service.js diagnose ${servicePath} --export-report=${reportPath}`;

      execSync(diagnoseCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify report was created
      expect(existsSync(reportPath)).toBe(true);

      // Verify report content
      const reportContent = readFileSync(reportPath, 'utf8');
      const report = JSON.parse(reportContent);
      expect(report).toHaveProperty('serviceName');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('recommendations');
    });

    it('should include fix suggestions when requested', () => {
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

      // Diagnose with fix suggestions
      const diagnoseCommand = `node cli/clodo-service.js diagnose ${servicePath} --fix-suggestions`;

      const result = execSync(diagnoseCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Diagnostic Report');
      // Fix suggestions might be included in the output
    });

    it('should auto-detect service path when not provided', () => {
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

      // Change to service directory and run diagnose without path
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const diagnoseCommand = `cd ${servicePath} && node ${cliPath} diagnose`;

      const result = execSync(diagnoseCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Diagnostic Report');
      expect(output).toContain('Service:');
    });

    it('should fail when diagnosing non-existent service', () => {
      const fakeServicePath = join(testDir, 'non-existent-service');

      const diagnoseCommand = `node cli/clodo-service.js diagnose ${fakeServicePath}`;

      expect(() => {
        execSync(diagnoseCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });
});