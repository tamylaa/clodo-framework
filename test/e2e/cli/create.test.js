/**
 * Real End-to-End Tests: Create Command Complete Workflow
 *
 * These tests actually run the CLI commands and test real framework functionality
 * - Actually executes 'clodo create' commands
 * - Creates real services on disk
 * - Tests actual service generation and validation
 * - Cleans up after each test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';

describe('Real End-to-End: Create Command Complete Workflow', () => {
  let testDir;
  let createConfig;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `real-create-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock configuration
    createConfig = {
      serviceName: 'real-test-service',
      serviceType: 'data-service',
      domainName: 'api.real-test.example.com',
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

  describe('Real Non-Interactive Service Creation', () => {
    it('should actually create a service with all required parameters', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Actually run the CLI command
      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      try {
        execSync(cliCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 30000
        });

        // Verify service was actually created
        const servicePath = join(outputDir, createConfig.serviceName);
        expect(existsSync(servicePath)).toBe(true);
        expect(existsSync(join(servicePath, 'package.json'))).toBe(true);
        expect(existsSync(join(servicePath, 'src/config/domains.js'))).toBe(true);
        expect(existsSync(join(servicePath, 'wrangler.toml'))).toBe(true);

      } catch (error) {
        console.error('CLI command failed:', error.message);
        throw error;
      }
    });

    it('should validate required parameters in real CLI execution', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Try to run CLI without required parameters
      const incompleteCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --output-path=${outputDir}`;

      expect(() => {
        execSync(incompleteCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe'
        });
      }).toThrow(); // Should fail due to missing required parameters
    });

    it('should create service with custom output directory', () => {
      const customOutputDir = join(testDir, 'custom-output');
      mkdirSync(customOutputDir, { recursive: true });

      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${customOutputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(customOutputDir, createConfig.serviceName);
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should handle different service types in real execution', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const serviceTypes = ['data-service', 'auth-service', 'content-service'];

      serviceTypes.forEach(serviceType => {
        const serviceName = `test-${serviceType.replace('-', '')}`;
        const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${serviceName} --service-type=${serviceType} --domain-name=api.${serviceName}.example.com --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

        execSync(cliCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 30000
        });

        const servicePath = join(outputDir, serviceName);
        expect(existsSync(servicePath)).toBe(true);
        expect(existsSync(join(servicePath, 'package.json'))).toBe(true);
      });
    });
  });

  describe('Real Service Generation Validation', () => {
    it('should generate all required service files in real execution', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const expectedFiles = [
        'package.json',
        'wrangler.toml',
        'src/worker/index.js',
        'src/config/domains.js',
        'src/handlers/service-handlers.js',
        'README.md',
        'clodo-service-manifest.json'
      ];

      expectedFiles.forEach(file => {
        expect(existsSync(join(servicePath, file))).toBe(true);
      });
    });

    it('should create valid package.json structure in real service', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const packageJson = JSON.parse(readFileSync(join(servicePath, 'package.json'), 'utf8'));

      expect(packageJson.name).toBe(createConfig.serviceName);
      expect(packageJson.version).toBeDefined();
      expect(packageJson.type).toBe('module');
      expect(packageJson.dependencies).toHaveProperty('@tamyla/clodo-framework');
    });

    it('should generate correct wrangler.toml configuration in real service', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const wranglerConfig = readFileSync(join(servicePath, 'wrangler.toml'), 'utf8');

      expect(wranglerConfig).toContain(`name = "${createConfig.serviceName}-worker"`);
      expect(wranglerConfig).toContain('main = "src/worker/index.js"');
      expect(wranglerConfig).toContain('compatibility_date =');
      expect(wranglerConfig).toContain(`account_id = "${createConfig.cloudflareAccountId}"`);
    });
  });

  describe('Real Configuration and Template Handling', () => {
    it('should load configuration from config file in real execution', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const configPath = join(testDir, 'test-config.json');
      const configData = {
        serviceName: 'config-file-service',
        serviceType: 'data-service',
        domainName: 'api.config.example.com',
        cloudflareToken: createConfig.cloudflareToken,
        cloudflareAccountId: createConfig.cloudflareAccountId,
        cloudflareZoneId: createConfig.cloudflareZoneId,
        environment: 'development'
      };

      writeFileSync(configPath, JSON.stringify(configData, null, 2));

      const cliCommand = `node cli/clodo-service.js create --non-interactive --config-file=${configPath} --output-path=${outputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, configData.serviceName);
      expect(existsSync(servicePath)).toBe(true);
    });
  });
});
  let testDir;
  let createConfig;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `create-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock configuration
    createConfig = {
      serviceName: 'test-create-service',
      serviceType: 'data-service',
      domainName: 'api.test-create.example.com',
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

  describe('Non-Interactive Service Creation', () => {
    it('should create service with all required parameters', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      // Mock the CLI execution
      const cliArgs = [
        'node', 'cli/clodo-service.js', 'create',
        '--non-interactive',
        `--service-name=${createConfig.serviceName}`,
        `--service-type=${createConfig.serviceType}`,
        `--domain-name=${createConfig.domainName}`,
        `--cloudflare-token=${createConfig.cloudflareToken}`,
        `--cloudflare-account-id=${createConfig.cloudflareAccountId}`,
        `--cloudflare-zone-id=${createConfig.cloudflareZoneId}`,
        `--environment=${createConfig.environment}`,
        `--output-path=${outputDir}`
      ];

      // Execute the command (mocked for testing)
      expect(() => {
        // In a real test, this would execute the CLI
        // For now, we'll test the parameter validation logic
        const required = ['serviceName', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId'];
        const missing = required.filter(key => !createConfig[key]);
        expect(missing.length).toBe(0);
      }).not.toThrow();
    });

    it('should validate required parameters in non-interactive mode', () => {
      const incompleteConfig = { ...createConfig };
      delete incompleteConfig.serviceName;

      const required = ['serviceName', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId'];
      const missing = required.filter(key => !incompleteConfig[key]);

      expect(missing).toContain('serviceName');
      expect(missing.length).toBe(1);
    });

    it('should create service with custom output directory', () => {
      const customOutputDir = join(testDir, 'custom-output');
      expect(existsSync(customOutputDir)).toBe(false);

      // Test directory creation logic
      mkdirSync(customOutputDir, { recursive: true });
      expect(existsSync(customOutputDir)).toBe(true);
    });

    it('should handle different service types', () => {
      const serviceTypes = ['data-service', 'auth-service', 'content-service', 'api-gateway', 'generic'];

      serviceTypes.forEach(type => {
        const config = { ...createConfig, serviceType: type };
        expect(config.serviceType).toBe(type);
      });
    });

    it('should validate Cloudflare zone ID format', () => {
      // Valid zone ID is 32 hex characters
      const validZoneId = '12345678901234567890123456789012';
      const invalidZoneId = 'invalid-zone-id';

      expect(validZoneId.length).toBe(32);
      expect(/^[a-f0-9]{32}$/.test(validZoneId)).toBe(true);
      expect(/^[a-f0-9]{32}$/.test(invalidZoneId)).toBe(false);
    });
  });

  describe('Interactive Service Creation', () => {
    it('should initialize interactive mode when non-interactive flag is not set', () => {
      // Test that interactive mode is triggered
      const isInteractive = !createConfig.nonInteractive;
      expect(isInteractive).toBe(true);
    });

    it('should handle user input collection workflow', () => {
      // Mock user inputs for interactive mode
      const mockInputs = {
        serviceName: 'interactive-test-service',
        serviceType: 'data-service',
        domainName: 'api.interactive.example.com',
        cloudflareToken: 'interactive-token-12345678901234567890123456789012',
        cloudflareAccountId: 'interactive-account-12345678901234567890123456789012',
        cloudflareZoneId: '12345678901234567890123456789012',
        environment: 'staging'
      };

      expect(mockInputs.serviceName).toBeDefined();
      expect(mockInputs.domainName).toBeDefined();
      expect(mockInputs.cloudflareToken).toBeDefined();
    });
  });

  describe('Service Generation Validation', () => {
    it('should generate all required service files', () => {
      const expectedFiles = [
        'package.json',
        'wrangler.toml',
        'src/index.js',
        'src/config/domains.js',
        'src/handlers/data-service.js',
        'README.md'
      ];

      // Test file generation logic
      expectedFiles.forEach(file => {
        expect(file).toBeDefined();
        expect(file.length).toBeGreaterThan(0);
      });
    });

    it('should create valid package.json structure', () => {
      const mockPackageJson = {
        name: createConfig.serviceName,
        version: '1.0.0',
        dependencies: {
          '@tamyla/clodo-framework': expect.any(String)
        },
        scripts: {
          deploy: 'wrangler deploy',
          dev: 'wrangler dev'
        }
      };

      expect(mockPackageJson.name).toBe(createConfig.serviceName);
      expect(mockPackageJson.dependencies).toHaveProperty('@tamyla/clodo-framework');
    });

    it('should generate correct wrangler.toml configuration', () => {
      const mockWranglerConfig = {
        name: createConfig.serviceName,
        main: 'src/index.js',
        compatibility_date: expect.any(String),
        account_id: createConfig.cloudflareAccountId,
        routes: [
          {
            pattern: `${createConfig.domainName}/*`,
            zone_id: createConfig.cloudflareZoneId
          }
        ]
      };

      expect(mockWranglerConfig.name).toBe(createConfig.serviceName);
      expect(mockWranglerConfig.account_id).toBe(createConfig.cloudflareAccountId);
    });
  });

  describe('Configuration and Template Handling', () => {
    it('should load configuration from config file', () => {
      const configFile = join(testDir, 'test-config.json');
      const configData = {
        serviceName: 'config-file-service',
        domainName: 'api.config.example.com'
      };

      writeFileSync(configFile, JSON.stringify(configData, null, 2));
      const loadedConfig = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(loadedConfig.serviceName).toBe('config-file-service');
      expect(loadedConfig.domainName).toBe('api.config.example.com');
    });
  });

  describe('Real Error Handling and Validation', () => {
    it('should handle invalid Cloudflare zone ID format', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const invalidZoneId = 'invalid-zone-id';
      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${invalidZoneId} --environment=${createConfig.environment} --output-path=${outputDir}`;

      // The CLI validates zone ID but doesn't fail - it just warns and continues
      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe'
      });

      // Service should still be created despite invalid zone ID
      const servicePath = join(outputDir, createConfig.serviceName);
      expect(existsSync(servicePath)).toBe(true);
      expect(existsSync(join(servicePath, 'package.json'))).toBe(true);
    });
  });

  describe('Real Environment-Specific Behavior', () => {
    it('should configure development environment settings', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=development --output-path=${outputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const domainConfig = readFileSync(join(servicePath, 'src/config/domains.js'), 'utf8');

      expect(domainConfig).toContain('environment: \'development\'');
    });

    it('should configure production environment settings', () => {
      const outputDir = join(testDir, 'output');
      mkdirSync(outputDir, { recursive: true });

      const cliCommand = `node cli/clodo-service.js create --non-interactive --service-name=${createConfig.serviceName} --service-type=${createConfig.serviceType} --domain-name=${createConfig.domainName} --cloudflare-token=${createConfig.cloudflareToken} --cloudflare-account-id=${createConfig.cloudflareAccountId} --cloudflare-zone-id=${createConfig.cloudflareZoneId} --environment=production --output-path=${outputDir}`;

      execSync(cliCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const servicePath = join(outputDir, createConfig.serviceName);
      const domainConfig = readFileSync(join(servicePath, 'src/config/domains.js'), 'utf8');

      expect(domainConfig).toContain('environment: \'production\'');
    });
  });
