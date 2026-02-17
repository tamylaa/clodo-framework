/**
 * Doctor Unit Tests
 *
 * Tests for the ValidationHandler.runDoctor method and related doctor functionality
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock all dependencies before any imports using jest.unstable_mockModule
await jest.unstable_mockModule('../../src/utils/framework-config.js', () => ({
  FrameworkConfig: {
    getInstance: jest.fn(() => ({
      loadConfig: jest.fn(),
      get: jest.fn()
    }))
  }
}));

await jest.unstable_mockModule('../../src/security/ConfigurationValidator.js', () => ({
  ConfigurationValidator: {
    validateServiceConfig: jest.fn()
  }
}));

// Store references to mocks before importing
const mockFs = {
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn()
};

const mockExecSync = jest.fn();

await jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

await jest.unstable_mockModule('fs/promises', () => ({
  default: mockFs,
  ...mockFs
}));

// Dynamic import AFTER mocks are set up (static imports are hoisted before mocks)
const { ValidationHandler } = await import('../../src/service-management/handlers/ValidationHandler.js');
import path from 'path';

// Use stored mock references
const fs = mockFs;
const { execSync } = { execSync: mockExecSync };

describe('Doctor - ValidationHandler.runDoctor', () => {
  let handler;
  let mockServicePath;

  beforeEach(() => {
    handler = new ValidationHandler();
    mockServicePath = '/mock/service/path';

    // Reset mocks
    jest.clearAllMocks();

    // Mock fs.access to simulate file existence
    fs.access.mockResolvedValue();

    // Mock fs.readFile for package.json
    fs.readFile.mockImplementation((filePath) => {
      if (filePath.includes('package.json')) {
        return Promise.resolve(JSON.stringify({
          name: 'test-service',
          version: '1.0.0',
          type: 'module',
          main: 'src/worker/index.js',
          dependencies: {
            '@tamyla/clodo-framework': '^4.0.0'
          }
        }));
      }
      return Promise.resolve('');
    });
  });

  describe('runDoctor basic functionality', () => {
    test('should return valid results for healthy environment', async () => {
      // Mock successful environment checks
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('Wrangler 3.0.0');

      const results = await handler.runDoctor({ servicePath: mockServicePath });

      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('servicePath', mockServicePath);
      expect(results).toHaveProperty('checks');
      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('fixSuggestions');
      expect(results).toHaveProperty('exitCode');

      expect(Array.isArray(results.checks)).toBe(true);
      expect(results.checks.length).toBeGreaterThan(0);
    });

    test('should return JSON output when json option is true', async () => {
      const results = await handler.runDoctor({
        servicePath: mockServicePath,
        json: true
      });

      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('checks');
      expect(typeof results.timestamp).toBe('string');
    });

    test('should handle strict mode correctly', async () => {
      // Mock a warning condition
      const results = await handler.runDoctor({
        servicePath: mockServicePath,
        strict: true
      });

      // With placeholders, we expect warnings which become errors in strict mode
      expect(results.exitCode).toBeGreaterThan(0);
    });
  });

  describe('Environment checks', () => {
    test('should pass when wrangler is available', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('Wrangler 3.0.0');

      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const envCheck = results.checks.find(check => check.name === 'environment');

      expect(envCheck.status).toBe('passed');
      expect(envCheck.details).toContain('Wrangler CLI is available');
    });

    test('should fail when wrangler is not available', async () => {
      const { execSync } = await import('child_process');
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const envCheck = results.checks.find(check => check.name === 'environment');

      expect(envCheck.status).toBe('failed');
      expect(envCheck.details).toContain('Wrangler CLI is not installed or not in PATH');
      expect(envCheck.fixSuggestions).toContain('Install Wrangler CLI: npm install -g wrangler');
    });

    test('should check Node.js version', async () => {
      // Mock process.version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        writable: true
      });

      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const envCheck = results.checks.find(check => check.name === 'environment');

      expect(envCheck.status).toBe('failed');
      expect(envCheck.details.some(detail =>
        detail.includes('Node.js version') && detail.includes('below minimum')
      )).toBe(true);

      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: true
      });
    });
  });

  describe('Config presence checks', () => {
    test('should pass when all required files exist', async () => {
      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const configCheck = results.checks.find(check => check.name === 'config-presence');

      expect(configCheck.status).toBe('passed');
      expect(configCheck.details.some(detail => detail.includes('✓'))).toBe(true);
    });

    test('should fail when required files are missing', async () => {
      // Mock fs.access to throw for missing files
      fs.access.mockImplementation((filePath) => {
        if (filePath.includes('wrangler.toml')) {
          throw new Error('File not found');
        }
        return Promise.resolve();
      });

      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const configCheck = results.checks.find(check => check.name === 'config-presence');

      expect(configCheck.status).toBe('failed');
      expect(configCheck.details.some(detail => detail.includes('✗ wrangler.toml'))).toBe(true);
      expect(configCheck.fixSuggestions.some(suggestion =>
        suggestion.includes('Create wrangler.toml')
      )).toBe(true);
    });
  });

  describe('Service validation integration', () => {
    test('should integrate with existing validateService method', async () => {
      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const serviceCheck = results.checks.find(check => check.name === 'service-validation');

      expect(serviceCheck).toBeDefined();
      expect(serviceCheck.name).toBe('service-validation');
      expect(typeof serviceCheck.status).toBe('string');
    });
  });

  describe('Placeholder validators', () => {
    test('should include token scopes validation', async () => {
      // Mock environment without token
      delete process.env.CLOUDFLARE_API_TOKEN;
      delete process.env.CF_API_TOKEN;

      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const tokenCheck = results.checks.find(check => check.name === 'token-scopes');

      expect(tokenCheck.status).toBe('failed');
      expect(tokenCheck.message).toContain('Cloudflare token scopes validated');
      expect(tokenCheck.details.some(detail => detail.includes('No Cloudflare API token found'))).toBe(true);
      expect(tokenCheck.fixSuggestions).toContain('Set CLOUDFLARE_API_TOKEN or CF_API_TOKEN environment variable');
    });

    test('should include secrets baseline validation', async () => {
      const results = await handler.runDoctor({ servicePath: mockServicePath });
      const secretsCheck = results.checks.find(check => check.name === 'secrets-baseline');

      expect(secretsCheck).toBeDefined();
      expect(secretsCheck.name).toBe('secrets-baseline');
      expect(typeof secretsCheck.status).toBe('string');
    });
  });

  describe('Summary and exit codes', () => {
    test('should calculate summary correctly', async () => {
      const results = await handler.runDoctor({ servicePath: mockServicePath });

      expect(results.summary.total).toBe(results.checks.length);
      expect(results.summary.passed + results.summary.warnings + results.summary.errors).toBe(results.summary.total);
    });

    test('should set exit code appropriately based on validation results', async () => {
      // Mock wrangler availability
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('Wrangler 3.0.0');

      // Mock token environment
      process.env.CLOUDFLARE_API_TOKEN = 'test-token';

      const results = await handler.runDoctor({ servicePath: mockServicePath });

      // In test environment, some validations may fail (service validation, token validation)
      // but the exit code should reflect the actual validation state
      expect(results.exitCode).toBe(results.summary.errors > 0 ? 1 : 0);
      expect(results.summary.total).toBeGreaterThan(0);
    });

    test('should set exit code to 1 when there are errors', async () => {
      const { execSync } = await import('child_process');
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const results = await handler.runDoctor({ servicePath: mockServicePath });

      expect(results.exitCode).toBe(1);
    });
  });
});