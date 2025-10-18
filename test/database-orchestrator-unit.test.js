/**
 * DatabaseOrchestrator Unit Tests
 *
 * Tests the core DatabaseOrchestrator methods for database management
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('../src/utils/cloudflare/index.js');

// Import mocked modules
import { databaseExists, createDatabase } from '../src/utils/cloudflare/index.js';

// Import the DatabaseOrchestrator class
import { DatabaseOrchestrator } from '../src/database/database-orchestrator.js';

describe('DatabaseOrchestrator Unit Tests', () => {
  let dbOrchestrator;
  let mockExec;

  const mockOptions = {
    projectRoot: '/test/project',
    dryRun: false,
    environment: 'development'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock exec with proper callback signature for promisify
    // exec() is promisified in DatabaseOrchestrator, so it needs to work with both callback and promise
    mockExec = jest.fn((cmd, options, callback) => {
      // Handle both (cmd, callback) and (cmd, options, callback) signatures
      const actualCallback = typeof options === 'function' ? options : callback;
      
      // Call callback asynchronously to simulate real exec behavior
      if (actualCallback) {
        process.nextTick(() => actualCallback(null, 'stdout output', ''));
      }
      
      // exec doesn't return anything, it uses callbacks
      return undefined;
    });
    exec.mockImplementation(mockExec);

    // Mock fs operations
    fs.access = jest.fn().mockResolvedValue();
    fs.mkdir = jest.fn().mockResolvedValue();
    fs.writeFile = jest.fn().mockResolvedValue();
    fs.appendFile = jest.fn().mockResolvedValue();
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock cloudflare functions
    databaseExists.mockResolvedValue(false);
    createDatabase.mockResolvedValue({ success: true, databaseId: 'test-db-id' });

    // Create DatabaseOrchestrator instance
    dbOrchestrator = new DatabaseOrchestrator(mockOptions);
    
    // Spy on executeWithRetry to mock command execution
    jest.spyOn(dbOrchestrator, 'executeWithRetry').mockResolvedValue('Applied 3 migrations successfully');
  });

  describe('constructor', () => {
    test('should initialize with provided options', () => {
      expect(dbOrchestrator.projectRoot).toBe('/test/project');
      expect(dbOrchestrator.dryRun).toBe(false);
      expect(dbOrchestrator.options).toEqual(mockOptions);
    });

    test('should detect project root if not provided', () => {
      const orchestrator = new DatabaseOrchestrator();
      expect(orchestrator.projectRoot).toBeDefined();
    });
  });

  describe('applyDatabaseMigrations', () => {
    const databaseName = 'test-db';
    const environment = 'development';
    const isRemote = false;

    test('should apply migrations successfully when database exists', async () => {
      databaseExists.mockResolvedValue(true);

      const result = await dbOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote);

      expect(databaseExists).toHaveBeenCalled();
      expect(createDatabase).not.toHaveBeenCalled();
      expect(dbOrchestrator.executeWithRetry).toHaveBeenCalled();
      expect(result.status).toBe('completed');
      expect(result.databaseName).toBe(databaseName);
    });

    test('should throw error when database does not exist', async () => {
      databaseExists.mockResolvedValue(false);

      await expect(dbOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote))
        .rejects.toThrow('Database test-db does not exist');
    });

    test('should handle migration execution failure', async () => {
      databaseExists.mockResolvedValue(true);
      dbOrchestrator.executeWithRetry.mockRejectedValue(new Error('Migration command failed'));

      await expect(dbOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote))
        .rejects.toThrow('Migration failed for test-db: Migration command failed');
    });

    test('should skip operations in dry run mode', async () => {
      const dryRunOrchestrator = new DatabaseOrchestrator({ ...mockOptions, dryRun: true });

      const result = await dryRunOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote);

      expect(databaseExists).not.toHaveBeenCalled();
      expect(createDatabase).not.toHaveBeenCalled();
      expect(mockExec).not.toHaveBeenCalled();
      expect(result.status).toBe('dry-run');
      expect(result.databaseName).toBe(databaseName);
    });
  });

  describe('applyEnvironmentMigrations', () => {
    const environment = 'development';
    const domainConfigs = [{
      name: 'test.example.com',
      databases: {
        development: { name: 'test-db' }
      },
      cloudflare: { accountId: 'test-account', token: 'test-token' }
    }];

    test('should apply environment migrations successfully', async () => {
      databaseExists.mockResolvedValue(true);

      const result = await dbOrchestrator.applyEnvironmentMigrations(environment, domainConfigs);

      expect(result.environment).toBe(environment);
      expect(result.databases).toBeDefined();
      expect(result.migrationsApplied).toBeGreaterThanOrEqual(0);
    });

    test('should handle migration failures', async () => {
      databaseExists.mockRejectedValue(new Error('Migration failed'));

      await expect(dbOrchestrator.applyEnvironmentMigrations(environment, domainConfigs))
        .rejects.toThrow('Migration failed');
    });
  });

  describe('Error Handling', () => {
    test('should handle command execution errors', async () => {
      databaseExists.mockResolvedValue(true);
      dbOrchestrator.executeWithRetry.mockRejectedValue(new Error('Command execution failed'));

      const databaseName = 'test-db';
      const environment = 'development';
      const isRemote = false;

      await expect(dbOrchestrator.applyDatabaseMigrations(databaseName, environment, isRemote))
        .rejects.toThrow('Migration failed for test-db: Command execution failed');
    });

    test('should handle database operations errors', async () => {
      databaseExists.mockRejectedValue(new Error('Database check failed'));

      await expect(dbOrchestrator.applyDatabaseMigrations('test-db', 'DB', 'development', false))
        .rejects.toThrow('Migration failed for test-db: Database check failed');
    });
  });

  describe('Environment Handling', () => {
    test('should handle different environments correctly', () => {
      const devOrchestrator = new DatabaseOrchestrator({ environment: 'development' });
      const prodOrchestrator = new DatabaseOrchestrator({ environment: 'production' });

      expect(devOrchestrator.options.environment).toBe('development');
      expect(prodOrchestrator.options.environment).toBe('production');
    });

    test('should use correct environment-specific settings', async () => {
      databaseExists.mockResolvedValue(true);

      const result = await dbOrchestrator.applyDatabaseMigrations('staging-db', 'DB', 'staging', false);

      expect(result.status).toBe('completed');
      expect(result.databaseName).toBe('staging-db');
    });
  });
});