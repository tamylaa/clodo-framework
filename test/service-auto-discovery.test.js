/**
 * Unit Tests for ServiceAutoDiscovery
 * Tests the intelligent service discovery capabilities
 */

import { jest } from '@jest/globals';
import { ServiceAutoDiscovery } from '../src/service-management/ServiceAutoDiscovery.js';
import fs from 'fs';
import path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('ServiceAutoDiscovery', () => {
  let discovery;
  let mockWranglerConfigManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock the WranglerConfigManager
    mockWranglerConfigManager = {
      parseWranglerConfig: jest.fn()
    };

    // Mock path.join to return predictable paths
    path.join.mockImplementation((...args) => args.join('/'));

    // Create instance with mocked dependencies
    discovery = new ServiceAutoDiscovery('/test/service/path');
    discovery.wranglerConfigManager = mockWranglerConfigManager;
  });

  describe('constructor', () => {
    test('should initialize with provided service path', () => {
      const customPath = '/custom/path';
      const instance = new ServiceAutoDiscovery(customPath);
      expect(instance.servicePath).toBe(customPath);
    });

    test('should default to current working directory', () => {
      const instance = new ServiceAutoDiscovery();
      expect(instance.servicePath).toBe(process.cwd());
    });
  });

  describe('discoverServiceCapabilities', () => {
    test('should perform comprehensive service discovery', async () => {
      // Mock successful file operations
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock file content');

      mockWranglerConfigManager.parseWranglerConfig.mockReturnValue({
        name: 'test-worker',
        main: 'src/index.js'
      });

      const result = await discovery.discoverServiceCapabilities();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('servicePath', '/test/service/path');
      expect(result).toHaveProperty('artifacts');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('assessment');
      expect(result).toHaveProperty('recommendations');
    });

    test('should handle discovery errors gracefully', async () => {
      // Mock file operations to throw errors
      fs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await discovery.discoverServiceCapabilities();

      expect(result).toHaveProperty('error', 'File system error');
      expect(result).toHaveProperty('capabilities');
    });
  });

  describe('analyzeWranglerConfig', () => {
    test('should analyze wrangler.toml when file exists', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('name = "test-worker"\nmain = "src/index.js"');

      mockWranglerConfigManager.parseWranglerConfig.mockReturnValue({
        name: 'test-worker',
        main: 'src/index.js',
        compatibility_date: '2024-01-01'
      });

      const result = await discovery.analyzeWranglerConfig();

      expect(result).toEqual({
        exists: true,
        config: {
          name: 'test-worker',
          main: 'src/index.js',
          compatibility_date: '2024-01-01'
        },
        capabilities: expect.any(Array),
        bindings: expect.any(Object),
        environments: expect.any(Object)
      });
    });

    test('should return empty result when wrangler.toml does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await discovery.analyzeWranglerConfig();

      expect(result).toEqual({
        exists: false,
        capabilities: []
      });
    });

    test('should handle wrangler config parsing errors', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid toml content');
      mockWranglerConfigManager.parseWranglerConfig.mockImplementation(() => {
        throw new Error('Invalid TOML');
      });

      const result = await discovery.analyzeWranglerConfig();

      expect(result).toEqual({
        exists: true,
        error: 'Invalid TOML',
        capabilities: []
      });
    });
  });

  describe('analyzeApiTokenPermissions', () => {
    test('should analyze available API token permissions', async () => {
      // Mock environment variable
      process.env.CLOUDFLARE_API_TOKEN = 'test-token';

      const result = await discovery.analyzeApiTokenPermissions();

      expect(result).toEqual({
        available: true,
        token: 'test-token...',
        permissions: expect.any(Array),
        capabilities: expect.any(Object)
      });
    });

    test('should return unavailable when no token found', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;

      const result = await discovery.analyzeApiTokenPermissions();

      expect(result).toEqual({
        available: false,
        permissions: []
      });
    });

    test('should handle token parsing errors', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'invalid-token';

      // Mock the parsing to throw an error
      const originalParse = discovery.parseTokenPermissions;
      discovery.parseTokenPermissions = jest.fn(() => {
        throw new Error('Token parsing failed');
      });

      const result = await discovery.analyzeApiTokenPermissions();

      expect(result).toEqual({
        available: false,
        error: 'Token parsing failed',
        permissions: []
      });

      // Restore original method
      discovery.parseTokenPermissions = originalParse;
    });
  });

  describe('parseTokenPermissions', () => {
    test('should parse full permissions token', () => {
      const token = 'full-permissions-token';
      const permissions = discovery.parseTokenPermissions(token);

      expect(permissions).toContain('D1:Edit');
      expect(permissions).toContain('Workers R2 Storage:Edit');
      expect(permissions).toContain('Workers Scripts:Edit');
      expect(permissions).toHaveLength(11);
    });

    test('should parse limited permissions token', () => {
      const token = 'limited_token';
      const permissions = discovery.parseTokenPermissions(token);

      expect(permissions).toEqual([
        'Workers Scripts:Edit',
        'Workers Routes:Edit',
        'Account Settings:Read'
      ]);
    });
  });

  describe('mapPermissionsToCapabilities', () => {
    test('should map full permissions to all capabilities', () => {
      const permissions = [
        'D1:Edit',
        'Workers R2 Storage:Edit',
        'Workers KV Storage:Edit',
        'Workers Scripts:Edit',
        'Workers Observability:Edit',
        'Cloudflare Pages:Edit',
        'Workers Agents Configuration:Edit'
      ];

      const capabilities = discovery.mapPermissionsToCapabilities(permissions);

      expect(capabilities.database.possible).toBe(true);
      expect(capabilities.storage.possible).toBe(true);
      expect(capabilities.kv.possible).toBe(true);
      expect(capabilities.deployment.possible).toBe(true);
      expect(capabilities.observability.possible).toBe(true);
      expect(capabilities.pages.possible).toBe(true);
      expect(capabilities.ai.possible).toBe(true);
    });

    test('should map limited permissions correctly', () => {
      const permissions = ['Workers Scripts:Edit', 'Workers Routes:Edit'];

      const capabilities = discovery.mapPermissionsToCapabilities(permissions);

      expect(capabilities.database.possible).toBe(false);
      expect(capabilities.storage.possible).toBe(false);
      expect(capabilities.deployment.possible).toBe(true);
      expect(capabilities.observability.possible).toBe(false);
    });
  });

  describe('getTokenFromConfig', () => {
    test('should find token in environment variable', async () => {
      // This test is actually testing the analyzeApiTokenPermissions method
      // which checks env vars first, not getTokenFromConfig
      process.env.CLOUDFLARE_API_TOKEN = 'env-token';

      // Test the method that actually uses env vars
      const result = await discovery.analyzeApiTokenPermissions();

      expect(result.available).toBe(true);
      // Clean up
      delete process.env.CLOUDFLARE_API_TOKEN;
    });

    test('should find token in wrangler.toml', () => {
      delete process.env.CLOUDFLARE_API_TOKEN;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('api_token = "wrangler-token"');

      const token = discovery.getTokenFromConfig();

      expect(token).toBe('wrangler-token');
    });

    test('should return null when no token found', () => {
      delete process.env.CLOUDFLARE_API_TOKEN;
      fs.existsSync.mockReturnValue(false);

      const token = discovery.getTokenFromConfig();

      expect(token).toBeNull();
    });
  });
});