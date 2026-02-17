/**
 * Security Features Tests
 *
 * Tests for token scope validation and secrets baseline scanning
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Store mock references before importing
const mockFs = {
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn()
};

// Mock fs/promises before any imports
await jest.unstable_mockModule('fs/promises', () => ({
  default: mockFs,
  ...mockFs
}));

// Dynamic import AFTER mocks are set up
const { ValidationHandler } = await import('../../src/service-management/handlers/ValidationHandler.js');
import path from 'path';

// Alias for convenience
const fs = mockFs;

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Security Features', () => {
  let handler;
  let mockServicePath;

  beforeEach(() => {
    handler = new ValidationHandler();
    mockServicePath = '/mock/service/path';

    // Reset mocks
    jest.clearAllMocks();

    // Default mock behaviors
    fs.access.mockResolvedValue();
    fs.readFile.mockResolvedValue('');
    fs.writeFile.mockResolvedValue();
    fs.readdir.mockResolvedValue([]);
    fs.stat.mockResolvedValue({ isDirectory: () => false, size: 100 });
  });

  describe('Token Scope Validation', () => {
    test('should pass when token has all required scopes', async () => {
      // fetch is called twice: once for accounts, once for zones
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [{ id: 'acc1' }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [{ id: 'zone1' }] })
        });

      process.env.CLOUDFLARE_API_TOKEN = 'test-token-123';

      const result = await handler.checkTokenScopes();

      expect(result.status).toBe('passed');
      expect(result.message).toContain('validated');
      expect(result.details.some(d => d.includes('Workers:Edit'))).toBe(true);
    });

    test('should report warnings when some scopes are missing', async () => {
      // accounts succeeds (gives workers read+edit), zones fails (no zone read)
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [{ id: 'acc1' }] })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false })
        });

      process.env.CLOUDFLARE_API_TOKEN = 'test-token-123';

      const result = await handler.checkTokenScopes();

      // Workers permissions present, but Zone:Read is missing -> warning
      expect(result.severity).toBe('warning');
      expect(result.details.some(d => d.includes('Zone:Read'))).toBe(true);
    });

    test('should fail when no token is provided', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;
      delete process.env.CF_API_TOKEN;

      const result = await handler.checkTokenScopes();

      expect(result.status).toBe('failed');
      expect(result.severity).toBe('error');
      expect(result.details.some(d => d.includes('No Cloudflare API token found'))).toBe(true);
      expect(result.fixSuggestions).toContain('Set CLOUDFLARE_API_TOKEN or CF_API_TOKEN environment variable');
    });

    test('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network timeout'));
      process.env.CLOUDFLARE_API_TOKEN = 'test-token-123';

      const result = await handler.checkTokenScopes();

      // validateCloudflareToken catches network errors internally and returns empty permissions
      // Then checkTokenScopes sequentially sets status: first 'failed' for missing WorkersEdit,
      // then OVERWRITES to 'warning' for missing WorkersRead and ZoneRead
      expect(result.status).toBe('warning');
      expect(result.details.some(d => d.includes('Workers:Edit'))).toBe(true);
    });
  });

  describe('Secrets Baseline Scanning', () => {
    test('should pass when no secrets are found', async () => {
      // readdir returns entries with withFileTypes shape
      fs.readdir.mockResolvedValue([
        { name: 'index.js', isDirectory: () => false, isFile: () => true },
        { name: 'config.js', isDirectory: () => false, isFile: () => true }
      ]);
      fs.readFile.mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.secrets.baseline')) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve('console.log("Hello World");');
      });

      const result = await handler.checkSecretsBaseline(mockServicePath);

      expect(result.status).toBe('passed');
      expect(result.details.some(d => d.includes('No potential secrets found'))).toBe(true);
    });

    test('should detect potential secrets in files', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'config.js', isDirectory: () => false, isFile: () => true }
      ]);
      fs.readFile.mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.secrets.baseline')) {
          return Promise.resolve(JSON.stringify([]));
        }
        if (typeof filePath === 'string' && filePath.includes('config.js')) {
          // Use patterns the real scanner looks for (20+ char values for api_key/secret/token)
          return Promise.resolve(
            'const api_key = "abcdefghij1234567890klmn";\n' +
            'const password = "SuperSecretPassword123";\n'
          );
        }
        return Promise.resolve('');
      });

      const result = await handler.checkSecretsBaseline(mockServicePath);

      expect(result.status).toBe('failed');
      expect(result.severity).toBe('critical');
      expect(result.details.length).toBeGreaterThan(0);
    });
  });

  describe('Secrets Detection Patterns', () => {
    test('should detect AWS access key pattern', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'env.js', isDirectory: () => false, isFile: () => true }
      ]);
      fs.readFile.mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.secrets.baseline')) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve('const key = "AKIAIOSFODNN7QWERTY12";');
      });

      const result = await handler.checkSecretsBaseline(mockServicePath);
      expect(result.status).toBe('failed');
    });

    test('should detect private key pattern', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'cert.js', isDirectory: () => false, isFile: () => true }
      ]);
      fs.readFile.mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.secrets.baseline')) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve('const pk = "-----BEGIN PRIVATE KEY-----";');
      });

      const result = await handler.checkSecretsBaseline(mockServicePath);
      expect(result.status).toBe('failed');
    });

    test('should not flag normal content as secrets', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'app.js', isDirectory: () => false, isFile: () => true }
      ]);
      fs.readFile.mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.secrets.baseline')) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve('const version = "1.0.0";\nconst name = "my-app";');
      });

      const result = await handler.checkSecretsBaseline(mockServicePath);
      expect(result.status).toBe('passed');
    });
  });
});
