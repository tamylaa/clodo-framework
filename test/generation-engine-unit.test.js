/**
 * GenerationEngine Unit Tests
 *
 * Tests the core GenerationEngine methods for service generation
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
jest.mock('../src/service-management/ServiceInitializer.js');
jest.mock('../bin/database/wrangler-d1-manager.js');
jest.mock('../bin/shared/security/secret-generator.js');

// Mock file system operations
jest.mock('fs/promises');
// DON'T mock 'path' - it breaks join() in constructor!

// Mock synchronous fs methods globally
global.existsSync = jest.fn();
global.writeFileSync = jest.fn();
global.mkdirSync = jest.fn();
global.readFileSync = jest.fn();
global.readdirSync = jest.fn();
global.statSync = jest.fn();

// Import mocked modules
import { ServiceInitializer } from '../src/service-management/ServiceInitializer.js';
import { WranglerD1Manager } from '../bin/database/wrangler-d1-manager.js';
import { EnhancedSecretManager } from '../bin/shared/security/secret-generator.js';

// Import the GenerationEngine class
import { GenerationEngine } from '../src/service-management/GenerationEngine.js';

describe('GenerationEngine Unit Tests', () => {
  let generationEngine;
  let mockServiceInitializer;
  let mockWranglerD1Manager;
  let mockSecretManager;
  const mockEnv = { DB: {} };

  const mockCoreInputs = {
    serviceName: 'test-service',
    serviceType: 'generic',
    domainName: 'test.example.com',
    cloudflareToken: 'test-token',
    cloudflareAccountId: 'test-account-id',
    cloudflareZoneId: 'test-zone-id',
    environment: 'development'
  };

  const mockConfirmedValues = {
    displayName: 'Test Service',
    description: 'A test service',
    version: '1.0.0',
    author: 'Test Author',
    productionUrl: 'https://test.example.com',
    stagingUrl: 'https://staging.test.example.com',
    developmentUrl: 'https://dev.test.example.com',
    features: {},
    databaseName: 'test-db',
    workerName: 'test-worker',
    packageName: 'test-package',
    gitRepositoryUrl: 'https://github.com/test/test-service',
    documentationUrl: 'https://docs.test.com',
    healthCheckPath: '/health',
    apiBasePath: '/api'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup synchronous fs mocks
    global.existsSync.mockReturnValue(true);
    global.mkdirSync.mockReturnValue(undefined);
    global.writeFileSync.mockReturnValue(undefined);
    global.readFileSync.mockReturnValue('mock content');
    global.readdirSync.mockReturnValue([]);
    global.statSync.mockReturnValue({ isDirectory: () => true });

    // Setup mock instances
    mockServiceInitializer = {
      initializeService: jest.fn().mockResolvedValue({ success: true }),
      generateCoreFiles: jest.fn().mockResolvedValue({ success: true }),
      generatePackageJson: jest.fn().mockResolvedValue({ success: true }),
      generateWranglerConfig: jest.fn().mockReturnValue({ 'wrangler.toml': 'mock config' }),
      generateDomainsConfig: jest.fn().mockReturnValue('mock domains config')
    };

    mockWranglerD1Manager = {
      createDatabase: jest.fn().mockResolvedValue({ success: true, databaseId: 'test-db-id' })
    };

    mockSecretManager = {
      generateSecrets: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock the constructors
    ServiceInitializer.mockImplementation(() => mockServiceInitializer);
    WranglerD1Manager.mockImplementation(() => mockWranglerD1Manager);
    EnhancedSecretManager.mockImplementation(() => mockSecretManager);

    // Create GenerationEngine instance
    generationEngine = new GenerationEngine({
      templatesDir: '/templates',
      outputDir: '/output',
      force: false
    });
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const engine = new GenerationEngine();
      console.log('Engine templatesDir:', engine.templatesDir);
      console.log('Engine outputDir:', engine.outputDir);
      console.log('Engine force:', engine.force);
      expect(engine.templatesDir).toBeDefined();
      expect(engine.outputDir).toBe(process.cwd());
      expect(engine.force).toBe(false);
    });

    test('should initialize with custom options', () => {
      const customOptions = {
        templatesDir: '/custom/templates',
        outputDir: '/custom/output',
        force: true
      };
      const engine = new GenerationEngine(customOptions);
      expect(engine.templatesDir).toBe('/custom/templates');
      expect(engine.outputDir).toBe('/custom/output');
      expect(engine.force).toBe(true);
    });
  });

  describe('generateService', () => {
    test('should generate service successfully', async () => {
      const result = await generationEngine.generateService(mockCoreInputs, mockConfirmedValues);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.serviceName).toBe(mockCoreInputs.serviceName);
      expect(result.generatedFiles).toBeDefined();
      expect(Array.isArray(result.generatedFiles)).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });

    test('should generate service even with empty serviceName', async () => {
      const invalidInputs = { ...mockCoreInputs, serviceName: '' };

      const result = await generationEngine.generateService(invalidInputs, mockConfirmedValues);
      
      expect(result.success).toBe(true);
      expect(result.serviceName).toBe('');
    });
  });

  describe('generateAllFiles', () => {
    test('should generate all files successfully', async () => {
      const servicePath = path.join(__dirname, '../test-output/test-service');
      
      // Create directory structure first (this is what generateService does)
      generationEngine.createDirectoryStructure(servicePath);
      
      const result = await generationEngine.generateAllFiles(mockCoreInputs, mockConfirmedValues, servicePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle file generation with invalid path', async () => {
      // Mock writeFileSync to throw error
      global.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(generationEngine.generateAllFiles(mockCoreInputs, mockConfirmedValues, '/invalid'))
        .rejects.toThrow();
    });
  });

  // NOTE: CRUD operations (executeQuery, getById, create, update, delete) are part of 
  // the generated service template code, not the GenerationEngine itself.
  // They should be tested in the generated service's test suite, not here.
});