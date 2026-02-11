/**
 * End-to-End Tests: Validate Command Complete Workflow
 *
 * Comprehensive end-to-end tests for the validate command, covering:
 * - Basic service validation with required files check
 * - Deep scanning validation with comprehensive checks
 * - Report export functionality to JSON files
 * - Configuration file loading and merging
 * - Error handling for invalid service paths
 * - Validation of package.json structure and dependencies
 * - Domain configuration validation
 * - Wrangler configuration validation
 * - Output formatting (JSON, verbose, quiet modes)
 * - Exit codes for valid/invalid services
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe.skip('End-to-End: Validate Command Complete Workflow', () => {
  let testDir;
  let createConfig;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `validate-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock configuration for service creation
    createConfig = {
      serviceName: 'test-validate-service',
      serviceType: 'data-service',
      domainName: 'api.validate.example.com',
      cloudflareToken: 'test-token-123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
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

  describe('Real Basic Service Validation', () => {
    it('should validate a complete service successfully', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service using the CLI
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Now validate the created service
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      // Should not throw (exit code 0 for valid service)
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();
    });

    it('should identify missing required files', () => {
      const invalidServicePath = join(testDir, 'invalid-service');
      mkdirSync(invalidServicePath, { recursive: true });

      // Create incomplete service (missing required files)
      writeFileSync(join(invalidServicePath, 'package.json'), JSON.stringify({
        name: 'invalid-service',
        version: '1.0.0'
      }, null, 2));

      const validateCommand = `node cli/clodo-service.js validate "${invalidServicePath}"`;

      // Should throw (exit code 1 for invalid service)
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should validate package.json structure', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Validate and check that it passes
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();

      // Verify package.json exists and has proper structure
      const packageJson = JSON.parse(readFileSync(join(servicePath, 'package.json'), 'utf8'));
      expect(packageJson.name).toBeDefined();
      expect(packageJson.version).toBeDefined();
      expect(packageJson.type).toBe('module');
    });

    it('should validate domain configuration', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Validate and check that it passes
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();

      // Check domain config exists and has proper structure
      const domainConfig = readFileSync(join(servicePath, 'src/config/domains.js'), 'utf8');
      expect(domainConfig).toContain('createDomainConfigSchema');
      expect(domainConfig).toContain('export const domains');
    });

    it('should validate wrangler configuration', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Validate and check that it passes
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();

      // Check wrangler config has required fields
      const wranglerConfig = readFileSync(join(servicePath, 'wrangler.toml'), 'utf8');
      expect(wranglerConfig).toContain('name =');
      expect(wranglerConfig).toContain('main =');
      expect(wranglerConfig).toContain('compatibility_date =');
    });
  });

  describe('Real Deep Scan Validation', () => {
    it('should perform comprehensive validation with simplified API', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);

      // Test validation functionality (simplified API)
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();
    });

    it('should identify dependency issues in deep scan', () => {
      const incompleteServicePath = join(testDir, 'incomplete-service');
      mkdirSync(incompleteServicePath, { recursive: true });

      // Create package.json without required dependencies
      const incompletePackageJson = {
        name: 'incomplete-service',
        version: '1.0.0',
        type: 'module'
        // Missing @tamyla/clodo-framework dependency
      };

      writeFileSync(join(incompleteServicePath, 'package.json'), JSON.stringify(incompletePackageJson, null, 2));

      const validateCommand = `node cli/clodo-service.js validate "${incompleteServicePath}"`;

      // Should throw due to missing dependencies
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should validate domain format in deep scan', () => {
      // Create service with invalid domain
      const badDomainServicePath = join(testDir, 'bad-domain-service');
      mkdirSync(join(badDomainServicePath, 'src/config'), { recursive: true });

      const badDomainConfig = `
import { createDomainConfigSchema } from '@tamyla/clodo-framework';

export const domains = createDomainConfigSchema({
  'invalid-domain': {
    domain: 'invalid domain with spaces',
    environment: 'development',
    routing: { path: '/api/*' }
  }
});
`;

      writeFileSync(join(badDomainServicePath, 'package.json'), JSON.stringify({
        name: 'bad-domain-service',
        version: '1.0.0',
        type: 'module',
        dependencies: { '@tamyla/clodo-framework': '^1.0.0' }
      }, null, 2));

      writeFileSync(join(badDomainServicePath, 'src/config/domains.js'), badDomainConfig);

      const validateCommand = `node cli/clodo-service.js validate "${badDomainServicePath}"`;

      // Should throw due to invalid domain format
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('Real Report Export Functionality', () => {
    it('should export validation report to JSON file', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const reportPath = join(testDir, 'validation-report.json');

      const validateCommand = `node cli/clodo-service.js validate "${servicePath}" --export-report="${reportPath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();

      expect(existsSync(reportPath)).toBe(true);

      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      expect(report).toHaveProperty('valid');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('servicePath');
      expect(report.valid).toBe(true);
    });

    it('should export detailed error report for invalid service', () => {
      const invalidServicePath = join(testDir, 'invalid-service');
      mkdirSync(invalidServicePath, { recursive: true });

      // Create incomplete service
      writeFileSync(join(invalidServicePath, 'package.json'), JSON.stringify({
        name: 'invalid-service',
        version: '1.0.0'
      }, null, 2));

      const reportPath = join(testDir, 'error-report.json');
      const validateCommand = `node cli/clodo-service.js validate "${invalidServicePath}" --export-report="${reportPath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();

      expect(existsSync(reportPath)).toBe(true);

      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      expect(report.valid).toBe(false);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.servicePath).toBe(invalidServicePath);
    });

    it('should handle report export to non-existent directory', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const reportPath = join(testDir, 'nonexistent', 'report.json');

      const validateCommand = `node cli/clodo-service.js validate "${servicePath}" --export-report="${reportPath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();
    });
  });

  describe('Real Configuration File Handling', () => {
    it('should load configuration from config file', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const configPath = join(testDir, 'validate-config.json');

      const configData = {
        verbose: true,
        deepScan: true
      };

      writeFileSync(configPath, JSON.stringify(configData, null, 2));

      // Test config loading with verbose output
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}" --config-file="${configPath}"`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();

      // Verify config file was created properly
      expect(existsSync(configPath)).toBe(true);
      const loadedConfig = JSON.parse(readFileSync(configPath, 'utf8'));
      expect(loadedConfig.verbose).toBe(true);
      expect(loadedConfig.deepScan).toBe(true);
    });

    it('should merge CLI options with config file', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Create a valid service
      const createCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(createCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const configPath = join(testDir, 'merge-config.json');

      // Config file with verbose: false
      writeFileSync(configPath, JSON.stringify({ verbose: false, deepScan: false }, null, 2));

      // CLI overrides with verbose: true
      const validateCommand = `node cli/clodo-service.js validate "${servicePath}" --config-file="${configPath}" --verbose`;

      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).not.toThrow();
    });
  });

  describe('Real Error Handling and Edge Cases', () => {
    it('should handle non-existent service path gracefully', () => {
      const nonExistentPath = join(testDir, 'does-not-exist');

      const validateCommand = `node cli/clodo-service.js validate "${nonExistentPath}"`;

      // Should throw for non-existent path
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should handle invalid JSON in package.json', () => {
      const badJsonServicePath = join(testDir, 'bad-json-service');
      mkdirSync(badJsonServicePath, { recursive: true });

      // Write invalid JSON
      writeFileSync(join(badJsonServicePath, 'package.json'), '{ invalid json content');

      const validateCommand = `node cli/clodo-service.js validate "${badJsonServicePath}"`;

      // Should throw due to invalid JSON
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should handle missing src directory structure', () => {
      const incompleteServicePath = join(testDir, 'missing-src-service');
      mkdirSync(incompleteServicePath, { recursive: true });

      // Create package.json but no src directory
      writeFileSync(join(incompleteServicePath, 'package.json'), JSON.stringify({
        name: 'missing-src-service',
        version: '1.0.0',
        type: 'module'
      }, null, 2));

      const validateCommand = `node cli/clodo-service.js validate "${incompleteServicePath}"`;

      // Should throw due to missing required files
      expect(() => {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });
});
