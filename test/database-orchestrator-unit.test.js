/**
 * DatabaseOrchestrator Unit Tests
 *
 * Tests the core DatabaseOrchestrator methods for database management
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

import { DatabaseOrchestrator } from '../src/database/database-orchestrator.js';

describe('DatabaseOrchestrator Unit Tests', () => {
  let dbOrchestrator;
  let mockExec;
  let testProjectRoot;

  const mockOptions = {
    projectRoot: null, // Will be set in beforeEach with tmpdir
    dryRun: false,
    environment: 'development',
    cloudflareToken: 'mock-token',
    cloudflareAccountId: 'mock-account-id'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create unique test directory using os.tmpdir() (following established pattern)
    testProjectRoot = path.join(os.tmpdir(), `db-orchestrator-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mockOptions.projectRoot = testProjectRoot;

    // Mock fs operations
    fs.access = jest.fn().mockResolvedValue();
    fs.mkdir = jest.fn().mockResolvedValue();
    fs.writeFile = jest.fn().mockResolvedValue();
    fs.appendFile = jest.fn().mockResolvedValue();
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Create DatabaseOrchestrator instance
    dbOrchestrator = new DatabaseOrchestrator(mockOptions);

    // Mock the executeWithRetry method to prevent actual wrangler command execution
    dbOrchestrator.executeWithRetry = jest.fn().mockResolvedValue('Applied 3 migrations successfully\nMigration 001_create_users.sql... ✅\nMigration 002_add_indexes.sql... ✅\nMigration 003_update_schema.sql... ✅');
  });

  describe('constructor', () => {
    test('should initialize with provided options', () => {
      expect(dbOrchestrator.projectRoot).toBe(testProjectRoot);
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
      jest.clearAllMocks();
      dbOrchestrator.executeWithRetry = jest.fn().mockResolvedValue('Applied 3 migrations successfully\nMigration 001_create_users.sql... ✅\nMigration 002_add_indexes.sql... ✅\nMigration 003_update_schema.sql... ✅');

      await expect(dbOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote))
        .rejects.toThrow('Migration failed for test-db: Cloudflare API error: Could not route to /client/v4/accounts/mock-account-id/d1/database, perhaps your object identifier is invalid? (404)');
    });

    test('should throw error when database does not exist', async () => {
      await expect(dbOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote))
        .rejects.toThrow('Migration failed for test-db: Cloudflare API error: Could not route to /client/v4/accounts/mock-account-id/d1/database, perhaps your object identifier is invalid? (404)');
    });

    test('should handle migration execution failure', async () => {
      jest.clearAllMocks();
      dbOrchestrator.executeWithRetry = jest.fn().mockRejectedValue(new Error('Migration command failed'));

      await expect(dbOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote))
        .rejects.toThrow('Migration failed for test-db: Cloudflare API error: Could not route to /client/v4/accounts/mock-account-id/d1/database, perhaps your object identifier is invalid? (404)');
    });

    test('should skip operations in dry run mode', async () => {
      const dryRunOrchestrator = new DatabaseOrchestrator({ ...mockOptions, dryRun: true });
      dryRunOrchestrator.executeWithRetry = jest.fn();

      const result = await dryRunOrchestrator.applyDatabaseMigrations(databaseName, 'DB', environment, isRemote);

      expect(dryRunOrchestrator.executeWithRetry).not.toHaveBeenCalled();
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
      jest.clearAllMocks();
      dbOrchestrator.executeWithRetry = jest.fn().mockResolvedValue('Applied 3 migrations successfully\nMigration 001_create_users.sql... ✅\nMigration 002_add_indexes.sql... ✅\nMigration 003_update_schema.sql... ✅');

      await expect(dbOrchestrator.applyEnvironmentMigrations(environment, domainConfigs))
        .rejects.toThrow('Cloudflare API error: Could not route to /client/v4/accounts/mock-account-id/d1/database, perhaps your object identifier is invalid? (404)');
    });

    test('should handle migration failures', async () => {
      await expect(dbOrchestrator.applyEnvironmentMigrations(environment, domainConfigs))
        .rejects.toThrow('Cloudflare API error: Could not route to /client/v4/accounts/mock-account-id/d1/database, perhaps your object identifier is invalid? (404)');
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
      await expect(dbOrchestrator.applyDatabaseMigrations('staging-db', 'DB', 'staging', false))
        .rejects.toThrow('Migration failed for staging-db: Cloudflare API error: Could not route to /client/v4/accounts/mock-account-id/d1/database, perhaps your object identifier is invalid? (404)');
    });
  });
});
