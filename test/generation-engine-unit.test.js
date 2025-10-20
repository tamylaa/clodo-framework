/**
 * GenerationEngine Unit Tests
 *
 * Tests the core GenerationEngine methods for service generation
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ES module equivalent of __dirname - use process.cwd() for test
const __dirname = process.cwd();

// Mock dependencies
await jest.unstable_mockModule('../src/service-management/ServiceInitializer.js', () => ({
  ServiceInitializer: class {
    generateWranglerConfig() {
      return { 'wrangler.toml': 'mock config' };
    }
    generateDomainsConfig() {
      return 'mock domains config';
    }
    generatePackageJson() {
      return 'mock package json';
    }
  }
}));
await jest.unstable_mockModule('../bin/database/wrangler-d1-manager.js', () => ({
  WranglerD1Manager: jest.fn()
}));
await jest.unstable_mockModule('../bin/shared/security/secret-generator.js', () => ({
  EnhancedSecretManager: jest.fn()
}));

// Mock file system operations
await jest.unstable_mockModule('fs/promises', () => ({
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  cp: jest.fn()
}));

// Mock synchronous fs methods
await jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  cpSync: jest.fn()
}));

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

    // The constructors are already mocked to return the mock objects

    // Create GenerationEngine instance with temp directory
    const tempDir = path.join(os.tmpdir(), 'generation-engine-test');
    generationEngine = new GenerationEngine({
      templatesDir: path.join(__dirname, '../templates'),
      outputDir: tempDir,
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
  });

  // NOTE: CRUD operations (executeQuery, getById, create, update, delete) are part of 
  // the generated service template code, not the GenerationEngine itself.
  // They should be tested in the generated service's test suite, not here.
});