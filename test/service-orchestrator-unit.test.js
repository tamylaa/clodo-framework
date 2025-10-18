/**
 * ServiceOrchestrator Unit Tests - Core Methods
 *
 * Tests the core ServiceOrchestrator methods that don't depend on ES module imports
 * that cause initialization issues in the test environment.
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Mock all the problematic handler imports
jest.mock('../src/service-management/handlers/InputHandler.js');
jest.mock('../src/service-management/handlers/ConfirmationHandler.js');
jest.mock('../src/service-management/handlers/GenerationHandler.js', () => ({
  GenerationHandler: jest.fn()
}));
jest.mock('../src/utils/deployment/wrangler-config-manager.js'); // Updated from ConfigMutator
jest.mock('../src/service-management/handlers/ValidationHandler.js');

// Mock legacy imports
jest.mock('../src/service-management/ServiceCreator.js', () => ({
  ServiceCreator: jest.fn()
}));
jest.mock('../src/service-management/ErrorTracker.js');

// Mock chalk to avoid console output issues
jest.mock('chalk', () => ({
  cyan: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  white: jest.fn((text) => text),
  gray: jest.fn((text) => text)
}));

// Import mocked classes
import { InputHandler } from '../src/service-management/handlers/InputHandler.js';
import { ConfirmationHandler } from '../src/service-management/handlers/ConfirmationHandler.js';
import { GenerationHandler } from '../src/service-management/handlers/GenerationHandler.js';
import { WranglerConfigManager } from '../src/utils/deployment/wrangler-config-manager.js'; // Updated from ConfigMutator
import { ValidationHandler } from '../src/service-management/handlers/ValidationHandler.js';
import { ServiceCreator } from '../src/service-management/ServiceCreator.js';
import { ErrorTracker } from '../src/service-management/ErrorTracker.js';

// Import chalk after mocking
import chalk from 'chalk';

// Import the ServiceOrchestrator class
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';

describe('ServiceOrchestrator Core Methods', () => {
  let orchestrator;
  let mockInputHandler;
  let mockConfirmationHandler;
  let mockGenerationHandler;
  let mockWranglerConfigManager; // Updated from mockConfigMutator
  let mockValidationHandler;
  let mockServiceCreator;
  let mockErrorTracker;

  beforeEach(() => {
    // Create mock instances
    mockInputHandler = {
      collectCoreInputs: jest.fn(),
      validateCoreInputs: jest.fn()
    };
    mockConfirmationHandler = {
      generateAndConfirm: jest.fn(),
      promptHandler: { prompt: jest.fn() }
    };
    mockGenerationHandler = {
      generateService: jest.fn()
    };
    // WranglerConfigManager methods (deprecated methods in ServiceOrchestrator now throw errors)
    mockWranglerConfigManager = {
      ensureEnvironment: jest.fn(),
      addDatabaseBinding: jest.fn()
    };
    mockValidationHandler = {
      validateService: jest.fn(),
      diagnoseService: jest.fn()
    };
    mockServiceCreator = {};
    mockErrorTracker = {
      captureError: jest.fn()
    };

    // Mock the constructors
    InputHandler.mockImplementation(() => mockInputHandler);
    ConfirmationHandler.mockImplementation(() => mockConfirmationHandler);
    GenerationHandler.mockImplementation(() => mockGenerationHandler);
    WranglerConfigManager.mockImplementation(() => mockWranglerConfigManager);
    ValidationHandler.mockImplementation(() => mockValidationHandler);
    ServiceCreator.mockImplementation(() => mockServiceCreator);
    ErrorTracker.mockImplementation(() => mockErrorTracker);

    // Create orchestrator instance
    orchestrator = new ServiceOrchestrator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Utility Methods', () => {
    test('escapeRegExp should escape special regex characters', () => {
      expect(orchestrator.escapeRegExp('test.string*+?^${}()|[]\\'))
        .toBe('test\\.string\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    test('extractServiceTypeFromConfig should return generic', () => {
      expect(orchestrator.extractServiceTypeFromConfig('')).toBe('generic');
    });

    test('extractDomainFromConfig should return unknown', () => {
      expect(orchestrator.extractDomainFromConfig('')).toBe('unknown');
    });

    test('extractEnvironmentFromConfig should return development', () => {
      expect(orchestrator.extractEnvironmentFromConfig('')).toBe('development');
    });

    test('extractCloudflareAccountId should return null', () => {
      expect(orchestrator.extractCloudflareAccountId('')).toBeNull();
    });

    test('extractCloudflareZoneId should return null', () => {
      expect(orchestrator.extractCloudflareZoneId('')).toBeNull();
    });

    test('extractFeaturesFromConfig should return empty array', () => {
      expect(orchestrator.extractFeaturesFromConfig('')).toEqual([]);
    });
  });

  describe('displayResults()', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    test('should display new GenerationEngine format results', () => {
      const mockResult = {
        serviceName: 'test-service',
        servicePath: './test-service',
        fileCount: 19,
        generatedFiles: ['package.json', 'src/worker/index.js'],
        serviceManifest: 'clodo-service-manifest.json'
      };

      orchestrator.displayResults(mockResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Service Generation Complete'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-service'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('19'));
    });

    test('should display legacy format results', () => {
      const legacyResult = {
        serviceName: 'legacy-service',
        serviceType: 'api',
        domainName: 'example.com',
        environment: 'production',
        generatedFiles: ['file1.js', 'file2.js'],
        features: ['auth', 'database']
      };

      orchestrator.displayResults(legacyResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('legacy-service'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('api'));
    });
  });

  describe('detectServicePath()', () => {
    beforeEach(() => {
      jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');
      jest.spyOn(orchestrator, 'isServiceDirectory').mockResolvedValue(false);
    });

    afterEach(() => {
      process.cwd.mockRestore();
      orchestrator.isServiceDirectory.mockRestore();
    });

    test('should return current directory if it is a service', async () => {
      orchestrator.isServiceDirectory.mockResolvedValueOnce(true);

      const result = await orchestrator.detectServicePath();

      expect(result).toBe('/current/dir');
    });

    test('should check parent directories', async () => {
      orchestrator.isServiceDirectory
        .mockResolvedValueOnce(false) // current dir
        .mockResolvedValueOnce(true); // parent dir

      const result = await orchestrator.detectServicePath();

      expect(orchestrator.isServiceDirectory).toHaveBeenCalledWith('/current');
    });

    test('should return null if no service directory found', async () => {
      const result = await orchestrator.detectServicePath();

      expect(result).toBeNull();
    });
  });

  describe('isServiceDirectory()', () => {
    beforeEach(() => {
      jest.spyOn(fs, 'access').mockResolvedValue();
    });

    afterEach(() => {
      fs.access.mockRestore();
    });

    test('should return true for valid service directory', async () => {
      const result = await orchestrator.isServiceDirectory('/path/to/service');

      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(path.join('/path/to/service', 'package.json'));
    });

    test('should return false when required files missing', async () => {
      fs.access.mockRejectedValue(new Error('File not found'));

      const result = await orchestrator.isServiceDirectory('/path/to/service');

      expect(result).toBe(false);
    });
  });

  describe('loadServiceConfiguration()', () => {
    beforeEach(() => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify({
        name: 'test-service',
        version: '1.0.0'
      }));
    });

    afterEach(() => {
      fs.readFile.mockRestore();
    });

    test('should load and parse service configuration', async () => {
      const config = await orchestrator.loadServiceConfiguration('/path/to/service');

      expect(config.serviceName).toBe('test-service');
      expect(fs.readFile).toHaveBeenCalledWith(path.join('/path/to/service', 'package.json'), 'utf8');
    });

    test('should throw error when package.json is invalid', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(orchestrator.loadServiceConfiguration('/path/to/service'))
        .rejects.toThrow('Failed to load service configuration');
    });
  });
});