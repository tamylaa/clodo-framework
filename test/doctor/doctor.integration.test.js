/**
 * Doctor CLI Integration Tests
 *
 * Real-world testing of doctor CLI command using actual command-line arguments
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TestEnvironment, TestEnvironmentManager } from '../cli-integration/setup-test-environment.js';

describe('Doctor CLI Integration Tests', () => {
  let envManager;

  beforeAll(() => {
    envManager = new TestEnvironmentManager();
  });

  afterAll(async () => {
    await envManager.cleanupAll();
  });

  describe('Help and Documentation', () => {
    test('should display help information', async () => {
      const env = await envManager.create({
        name: 'doctor-help',
        verbose: false
      });

      const result = await env.runCLI('clodo-service doctor --help');
      expect(result.stdout).toMatch(/doctor/i);
      expect(result.stdout).toMatch(/preflight/i);
      console.log(`✅ Doctor help displayed correctly`);
    }, 60000);
  });

  describe('Doctor Command Execution', () => {
    test('should run doctor command and produce structured output', async () => {
      const env = await envManager.create({
        name: 'doctor-basic',
        verbose: false
      });

      // Create a basic service structure
      env.createFile('package.json', JSON.stringify({
        name: 'test-service',
        version: '1.0.0',
        type: 'module',
        main: 'src/worker/index.js',
        dependencies: {
          '@tamyla/clodo-framework': '^4.0.0'
        }
      }));

      env.createFile('wrangler.toml', `
name = "test-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"
      `);

      env.createFile('src/config/domains.js', 'export const domains = [];');
      env.createFile('src/worker/index.js', 'export default {};');

      // Doctor may exit non-zero in test env (no tokens, etc.)
      const result = await env.runCLI('clodo-service doctor', { expectFailure: true });
      const output = result.stdout || result.stderr || '';
      expect(output).toMatch(/Clodo Doctor|timestamp/i);
    }, 60000);

    test('should return JSON output when --json flag is used', async () => {
      const env = await envManager.create({
        name: 'doctor-json',
        verbose: false
      });

      env.createFile('package.json', JSON.stringify({
        name: 'test-service',
        version: '1.0.0',
        type: 'module',
        main: 'src/worker/index.js'
      }));

      env.createFile('wrangler.toml', `
name = "test-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"
      `);

      env.createFile('src/config/domains.js', 'export const domains = [];');

      const result = await env.runCLI('clodo-service doctor --json', { expectFailure: true });
      const output = result.stdout || result.stderr || '';

      // Find and parse the JSON object from the output
      const jsonMatch = output.match(/\{[\s\S]*"timestamp"[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();

      const jsonOutput = JSON.parse(jsonMatch[0]);
      expect(jsonOutput).toHaveProperty('timestamp');
      expect(jsonOutput).toHaveProperty('checks');
      expect(jsonOutput).toHaveProperty('summary');
      expect(Array.isArray(jsonOutput.checks)).toBe(true);
    }, 60000);

    test('should handle --strict flag', async () => {
      const env = await envManager.create({
        name: 'doctor-strict',
        verbose: false
      });

      env.createFile('package.json', JSON.stringify({
        name: 'test-service',
        version: '1.0.0',
        type: 'module'
      }));

      env.createFile('wrangler.toml', `
name = "test-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"
      `);

      // In strict mode, warnings cause non-zero exit
      const result = await env.runCLI('clodo-service doctor --strict', { expectFailure: true });
      expect(result.exitCode).toBeGreaterThan(0);
    }, 60000);

    test('should handle custom service path', async () => {
      const env = await envManager.create({
        name: 'doctor-custom-path',
        verbose: false
      });

      const serviceDir = 'my-service';
      env.createDir(serviceDir);

      env.createFile(`${serviceDir}/package.json`, JSON.stringify({
        name: 'test-service',
        version: '1.0.0',
        type: 'module',
        main: 'src/worker/index.js'
      }));

      env.createFile(`${serviceDir}/wrangler.toml`, `
name = "test-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"
      `);

      env.createFile(`${serviceDir}/src/config/domains.js`, 'export const domains = [];');

      const result = await env.runCLI(`clodo-service doctor --service-path ${serviceDir}`, { expectFailure: true });
      const output = result.stdout || result.stderr || '';
      expect(output).toMatch(/Clodo Doctor|timestamp/i);
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle missing service files gracefully', async () => {
      const env = await envManager.create({
        name: 'doctor-missing-files',
        verbose: false
      });

      // Create minimal package.json only
      env.createFile('package.json', JSON.stringify({
        name: 'test-service',
        version: '1.0.0'
      }));

      const result = await env.runCLI('clodo-service doctor', { expectFailure: true });
      const output = result.stdout || result.stderr || '';

      // Should still run but report errors
      expect(output).toMatch(/Clodo Doctor|timestamp/i);
      expect(result.exitCode).toBeGreaterThan(0);
    }, 60000);

    test('should handle invalid service path', async () => {
      const env = await envManager.create({
        name: 'doctor-invalid-path',
        verbose: false
      });

      const result = await env.runCLI('clodo-service doctor --service-path /nonexistent/path', { expectFailure: true });

      // Should handle gracefully
      expect(result.exitCode).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Integration with Existing Validation', () => {
    test('should integrate with existing service validation', async () => {
      const env = await envManager.create({
        name: 'doctor-validation-integration',
        verbose: false
      });

      // Create service with validation issues
      env.createFile('package.json', JSON.stringify({
        name: 'test-service',
        version: '1.0.0',
        type: 'module'
        // Missing required dependency
      }));

      env.createFile('wrangler.toml', `
name = "test-service"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"
      `);

      const result = await env.runCLI('clodo-service doctor', { expectFailure: true });
      const output = result.stdout || result.stderr || '';
      expect(output).toMatch(/service-validation|failed|error/i);
    }, 60000);
  });
});
