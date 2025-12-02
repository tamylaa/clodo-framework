/**
 * Integration Test: Init-Config → Validate Workflow with Custom Validation Rules
 *
 * Tests the complete workflow where:
 * 1. init-config creates validation-config.json in a service directory
 * 2. validate command auto-loads and uses the custom validation rules
 * 3. Custom validation rules are applied during service validation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('Integration: Init-Config → Validate Workflow with Custom Validation', () => {
  let testDir;
  let serviceDir;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `init-validate-integration-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create a mock service directory
    serviceDir = join(testDir, 'test-service');
    mkdirSync(serviceDir, { recursive: true });

    // Create minimal service files
    writeFileSync(join(serviceDir, 'package.json'), JSON.stringify({
      name: 'test-service',
      version: '1.0.0',
      dependencies: {}
    }, null, 2));

    writeFileSync(join(serviceDir, 'wrangler.toml'), `
name = "test-service"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"
    `.trim());
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Custom Validation Configuration Workflow', () => {
    it('should create validation-config.json and validate service using custom rules', () => {
      // Step 1: Run init-config to create validation-config.json
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${serviceDir} && node ${cliPath} init-config`;

      execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify validation-config.json was created
      const configPath = join(serviceDir, 'validation-config.json');
      expect(existsSync(configPath)).toBe(true);

      // Step 2: Modify the validation config to add custom rules
      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      // Add custom validation rules
      config.validation = {
        ...config.validation,
        requiredFiles: ['package.json', 'wrangler.toml', 'src/index.js'],
        requiredFields: {
          'package.json': ['name', 'version'],
          'wrangler.toml': ['name', 'main']
        }
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Step 3: Run validate command and verify it uses custom config
      const validateCommand = `cd ${serviceDir} && node ${cliPath} validate . --verbose`;

      // Expect this to fail because src/index.js is missing
      let result;
      let output;
      try {
        result = execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 30000
        });
        output = result.toString();
      } catch (error) {
        output = error.stdout ? error.stdout.toString() : error.message;
        // Expected to fail due to missing file
      }

      // Should auto-load the validation config
      expect(output).toContain('Loaded configuration from: ./validation-config.json');

      // Should mention missing required file
      expect(output).toContain('Missing required file') || expect(output).toContain('src/worker/index.js');
    });

    it('should pass validation when using default validation-config.json', () => {
      // Step 1: Run init-config to create validation-config.json
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${serviceDir} && node ${cliPath} init-config`;

      execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify validation-config.json was created with correct defaults
      const configPath = join(serviceDir, 'validation-config.json');
      expect(existsSync(configPath)).toBe(true);

      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      expect(config).toHaveProperty('validation');
      expect(config.validation).toHaveProperty('requiredFiles', ['package.json', 'wrangler.toml']);

      // Step 2: Run validate command with explicit config file
      const validateCommand = `cd ${serviceDir} && node ${cliPath} validate . --verbose --config-file validation-config.json`;

      // Expect this to fail due to missing required fields in package.json
      try {
        execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 30000
        });
        // If it succeeds, that's unexpected
        expect(true).toBe(false);
      } catch (error) {
        const output = error.stdout ? error.stdout.toString() : error.message;
        // Should have auto-loaded the validation config
        expect(output).toContain('Loaded configuration from: ./validation-config.json');
        // Should contain validation errors for package.json fields
        expect(output).toContain('package.json: Missing required field');
      }
    });

    it('should handle missing validation-config.json gracefully', () => {
      // Don't run init-config, just run validate
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const validateCommand = `cd ${serviceDir} && node ${cliPath} validate . --verbose`;

      // This might fail due to validation issues, but should not crash on missing config
      let result;
      let output;
      try {
        result = execSync(validateCommand, {
          cwd: join(process.cwd()),
          stdio: 'pipe',
          timeout: 30000
        });
        output = result.toString();
      } catch (error) {
        output = error.stdout ? error.stdout.toString() : error.message;
      }

      // Should not mention auto-loading since file doesn't exist
      expect(output).not.toContain('Auto-loaded validation config');

      // Should still perform basic validation with defaults
      expect(output).toContain('Missing required file') || expect(output).toContain('package.json: Missing required field');
    });
  });
});