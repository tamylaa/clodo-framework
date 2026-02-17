/**
 * Doctor --fix Functionality Tests
 *
 * Tests for the automatic fix functionality in ValidationHandler
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import path from 'path';

// Create mock functions
const mockAccess = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockExecSync = jest.fn();

// Mock modules before importing ValidationHandler
await jest.unstable_mockModule('fs/promises', () => ({
  default: { access: mockAccess, readFile: mockReadFile, writeFile: mockWriteFile, mkdir: mockMkdir },
  access: mockAccess,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir
}));

await jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

// Dynamic import AFTER mocks are set up (static imports are hoisted before mocks)
const { ValidationHandler } = await import('../../src/service-management/handlers/ValidationHandler.js');

// Create a reference object for test assertions
const fs = {
  access: mockAccess,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir
};

describe('Doctor --fix Functionality', () => {
  let handler;
  let mockServicePath;

  beforeEach(() => {
    handler = new ValidationHandler();
    mockServicePath = '/mock/service/path';

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockAccess.mockResolvedValue();

    mockReadFile.mockImplementation((filePath) => {
      if (filePath.includes('package.json')) {
        return Promise.resolve(JSON.stringify({
          name: 'test-service',
          version: '1.0.0'
        }));
      }
      return Promise.resolve('');
    });

    mockWriteFile.mockResolvedValue();
    mockMkdir.mockResolvedValue();
    mockExecSync.mockReturnValue('');
  });

  describe('Fix Suggestions Generation', () => {
    test('should generate fix suggestions for missing main field', () => {
      const issues = ['package.json: Missing required field: main'];
      const suggestions = handler.generateFixSuggestions(issues);

      expect(suggestions).toContain('Add main field to package.json');
    });

    test('should generate fix suggestions for missing dependencies', () => {
      const issues = ['package.json: Missing required dependency: @tamyla/clodo-framework'];
      const suggestions = handler.generateFixSuggestions(issues);

      expect(suggestions).toContain('package.json: Missing required dependency: @tamyla/clodo-framework');
    });

    test('should generate fix suggestions for module type', () => {
      const issues = ['package.json: Should use "type": "module" for ES modules'];
      const suggestions = handler.generateFixSuggestions(issues);

      expect(suggestions).toContain('Set package.json type to module');
    });
  });

  describe('Specific Fix Methods', () => {
    test('should add main field to package.json', async () => {
      const packageJsonPath = path.join(mockServicePath, 'package.json');
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        name: 'test-service',
        version: '1.0.0'
      }));

      await handler.fixAddMainField(mockServicePath);

      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        JSON.stringify({
          name: 'test-service',
          version: '1.0.0',
          main: 'src/worker/index.js'
        }, null, 2)
      );
    });

    test('should set package.json type to module', async () => {
      const packageJsonPath = path.join(mockServicePath, 'package.json');
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        name: 'test-service',
        version: '1.0.0'
      }));

      await handler.fixSetModuleType(mockServicePath);

      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        JSON.stringify({
          name: 'test-service',
          version: '1.0.0',
          type: 'module'
        }, null, 2)
      );
    });

    test('should add missing dependency to package.json', async () => {
      const packageJsonPath = path.join(mockServicePath, 'package.json');
      const suggestion = 'package.json: Missing required dependency: @tamyla/clodo-framework';

      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        name: 'test-service',
        version: '1.0.0'
      }));

      const result = await handler.fixMissingDependency(suggestion, mockServicePath);

      expect(result).toBe('Added @tamyla/clodo-framework to package.json dependencies');
      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        JSON.stringify({
          name: 'test-service',
          version: '1.0.0',
          dependencies: {
            '@tamyla/clodo-framework': '^4.5.0'
          }
        }, null, 2)
      );
    });

    test('should create wrangler.toml configuration', async () => {
      const fileName = 'wrangler.toml';
      const filePath = path.join(mockServicePath, fileName);

      const result = await handler.fixCreateConfigFile(fileName, mockServicePath);

      expect(result).toBe('Created wrangler.toml with basic configuration');
      expect(mockMkdir).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(filePath, expect.stringContaining('name = "my-clodo-service"'));
    });

    test('should create worker index.js file', async () => {
      const fileName = 'src/worker/index.js';
      const filePath = path.join(mockServicePath, fileName);

      const result = await handler.fixCreateConfigFile(fileName, mockServicePath);

      expect(result).toBe('Created src/worker/index.js with basic configuration');
      expect(mockMkdir).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(filePath, expect.stringContaining('createServiceRouter'));
    });

    test('should create domain configuration file', async () => {
      const fileName = 'src/config/domains.js';
      const filePath = path.join(mockServicePath, fileName);

      const result = await handler.fixCreateConfigFile(fileName, mockServicePath);

      expect(result).toBe('Created basic domain configuration file');
      expect(mockMkdir).toHaveBeenCalledWith(path.dirname(filePath), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(filePath, expect.stringContaining('createDomainConfigSchema'));
    });

    test('should install wrangler CLI globally', async () => {
      const { execSync } = await import('child_process');
      execSync.mockResolvedValue();

      const result = await handler.fixInstallWrangler();

      expect(result).toBe('Installed wrangler CLI globally');
      expect(execSync).toHaveBeenCalledWith('npm install -g wrangler', { stdio: 'inherit' });
    });
  });

  describe('Apply Fixes Integration', () => {
    test('should apply fixes for service validation issues', async () => {
      // Mock validation results with issues
      const mockResults = {
        checks: [
          {
            name: 'service-validation',
            status: 'failed',
            fixSuggestions: ['Add main field to package.json', 'package.json: Missing required dependency: @tamyla/clodo-framework']
          }
        ]
      };

      // Mock package.json read
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('package.json')) {
          return Promise.resolve(JSON.stringify({
            name: 'test-service',
            version: '1.0.0'
          }));
        }
        return Promise.resolve('');
      });

      const fixesApplied = await handler.applyFixes(mockResults, mockServicePath);

      expect(fixesApplied).toHaveLength(2);
      expect(fixesApplied).toContain('service-validation: Added main field to package.json');
      expect(fixesApplied).toContain('service-validation: Added @tamyla/clodo-framework to package.json dependencies');
    });

    test('should apply fixes for config presence issues', async () => {
      const mockResults = {
        checks: [
          {
            name: 'config-presence',
            status: 'failed',
            fixSuggestions: ['Create wrangler.toml or ensure it exists']
          }
        ]
      };

      const fixesApplied = await handler.applyFixes(mockResults, mockServicePath);

      expect(fixesApplied).toHaveLength(1);
      expect(fixesApplied).toContain('config-presence: Created wrangler.toml with basic configuration');
    });
  });

  describe('Version Comparison', () => {
    test('should correctly compare version strings', () => {
      expect(handler.isVersionSufficient('v18.0.0', '18.0.0')).toBe(true);
      expect(handler.isVersionSufficient('v20.0.0', '18.0.0')).toBe(true);
      expect(handler.isVersionSufficient('v16.0.0', '18.0.0')).toBe(false);
      expect(handler.isVersionSufficient('v18.1.0', '18.0.0')).toBe(true);
      expect(handler.isVersionSufficient('v18.0.0', '18.1.0')).toBe(false);
    });
  });
});