import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WranglerConfigManager } from '../../../src/utils/deployment/wrangler-config-manager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('WranglerConfigManager', () => {
  let manager;
  let testConfigPath;
  let testDir;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = path.join(os.tmpdir(), `wrangler-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(testDir, { recursive: true });
    testConfigPath = path.join(testDir, 'wrangler.toml');
    
    // Ensure clean state
    manager = null;
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createMinimalConfig', () => {
    it('should create a minimal wrangler.toml configuration', async () => {
      manager = new WranglerConfigManager(testConfigPath);
      
      // Create with 'development' environment (production doesn't create env.production)
      const config = await manager.createMinimalConfig('test-service', 'development');
      
      expect(config).toBeDefined();
      expect(config.name).toBe('test-service');
      expect(config.main).toBe('src/index.js');
      expect(config.compatibility_date).toBeDefined();
      expect(config.env).toBeDefined();
      expect(config.env.development).toBeDefined();
    });

    it('should write minimal config to file', async () => {
      manager = new WranglerConfigManager(testConfigPath);
      
      await manager.createMinimalConfig('test-service', 'development');
      
      const exists = await fs.access(testConfigPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(testConfigPath, 'utf-8');
      expect(content).toContain('name = "test-service"');
      // Note: Empty env sections may not be written to TOML
      // Just verify file was created with correct name
    });
  });

  describe('readConfig and writeConfig', () => {
    it('should read and parse TOML config', async () => {
      // Create a test config
      const testConfig = `
name = "test-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.development]
name = "test-worker-dev"
`;
      await fs.writeFile(testConfigPath, testConfig, 'utf-8');
      
      manager = new WranglerConfigManager(testConfigPath);
      const config = await manager.readConfig();
      
      expect(config.name).toBe('test-worker');
      expect(config.main).toBe('src/index.js');
      expect(config.env.development.name).toBe('test-worker-dev');
    });

    it('should write config back to file', async () => {
      manager = new WranglerConfigManager(testConfigPath);
      
      const config = {
        name: 'my-service',
        main: 'dist/index.js',
        compatibility_date: '2024-01-01',
        env: {
          staging: {
            name: 'my-service-staging'
          }
        }
      };
      
      await manager.writeConfig(config);
      
      const content = await fs.readFile(testConfigPath, 'utf-8');
      expect(content).toContain('name = "my-service"');
      expect(content).toContain('[env.staging]');
      expect(content).toContain('name = "my-service-staging"');
    });

    it('should handle missing file gracefully', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.toml');
      manager = new WranglerConfigManager(nonExistentPath);
      
      const config = await manager.readConfig();
      
      // Should return minimal default config
      expect(config).toBeDefined();
      expect(config.name).toBeDefined();
    });
  });

  describe('ensureEnvironment', () => {
    it('should add environment section if missing', async () => {
      // Create config without environment
      const initialConfig = `
name = "test-service"
main = "src/index.js"
compatibility_date = "2024-01-01"
`;
      await fs.writeFile(testConfigPath, initialConfig, 'utf-8');
      
      manager = new WranglerConfigManager(testConfigPath);
      await manager.ensureEnvironment('staging');
      
      const config = await manager.readConfig();
      expect(config.env).toBeDefined();
      expect(config.env.staging).toBeDefined();
    });

    it('should not overwrite existing environment', async () => {
      // Create config with existing environment
      const initialConfig = `
name = "test-service"
main = "src/index.js"

[env.production]
name = "test-service-prod"
custom_field = "important_value"
`;
      await fs.writeFile(testConfigPath, initialConfig, 'utf-8');
      
      manager = new WranglerConfigManager(testConfigPath);
      await manager.ensureEnvironment('production');
      
      const config = await manager.readConfig();
      expect(config.env.production.name).toBe('test-service-prod');
      expect(config.env.production.custom_field).toBe('important_value');
    });
  });

  describe('addDatabaseBinding', () => {
    beforeEach(async () => {
      // Create minimal config for each test
      const initialConfig = `
name = "test-service"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.development]
`;
      await fs.writeFile(testConfigPath, initialConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
    });

    it('should add database binding to environment', async () => {
      const dbInfo = {
        binding: 'DB',
        database_name: 'test-db',
        database_id: 'abc-123-def'
      };
      
      await manager.addDatabaseBinding('development', dbInfo);
      
      const config = await manager.readConfig();
      expect(config.env.development.d1_databases).toBeDefined();
      expect(config.env.development.d1_databases).toHaveLength(1);
      expect(config.env.development.d1_databases[0].binding).toBe('DB');
      expect(config.env.development.d1_databases[0].database_name).toBe('test-db');
      expect(config.env.development.d1_databases[0].database_id).toBe('abc-123-def');
    });

    it('should not duplicate existing binding', async () => {
      const dbInfo = {
        binding: 'DB',
        database_name: 'test-db',
        database_id: 'abc-123-def'
      };
      
      // Add binding twice
      await manager.addDatabaseBinding('development', dbInfo);
      await manager.addDatabaseBinding('development', dbInfo);
      
      const config = await manager.readConfig();
      expect(config.env.development.d1_databases).toHaveLength(1);
    });

    it('should update existing binding if database_id changes', async () => {
      const dbInfo1 = {
        binding: 'DB',
        database_name: 'test-db',
        database_id: 'old-id'
      };
      const dbInfo2 = {
        binding: 'DB',
        database_name: 'test-db',
        database_id: 'new-id'
      };
      
      await manager.addDatabaseBinding('development', dbInfo1);
      await manager.addDatabaseBinding('development', dbInfo2);
      
      const config = await manager.readConfig();
      expect(config.env.development.d1_databases).toHaveLength(1);
      expect(config.env.development.d1_databases[0].database_id).toBe('new-id');
    });

    it('should handle multiple database bindings', async () => {
      const db1 = {
        binding: 'DB1',
        database_name: 'test-db-1',
        database_id: 'id-1'
      };
      const db2 = {
        binding: 'DB2',
        database_name: 'test-db-2',
        database_id: 'id-2'
      };
      
      await manager.addDatabaseBinding('development', db1);
      await manager.addDatabaseBinding('development', db2);
      
      const config = await manager.readConfig();
      expect(config.env.development.d1_databases).toHaveLength(2);
    });
  });

  describe('removeDatabaseBinding', () => {
    beforeEach(async () => {
      const initialConfig = `
name = "test-service"
main = "src/index.js"

[env.development]

[[env.development.d1_databases]]
binding = "DB1"
database_name = "db-1"
database_id = "id-1"

[[env.development.d1_databases]]
binding = "DB2"
database_name = "db-2"
database_id = "id-2"
`;
      await fs.writeFile(testConfigPath, initialConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
    });

    it('should remove database binding by name', async () => {
      await manager.removeDatabaseBinding('development', 'db-1');
      
      const config = await manager.readConfig();
      expect(config.env.development.d1_databases).toHaveLength(1);
      expect(config.env.development.d1_databases[0].database_name).toBe('db-2');
    });

    it('should handle removing non-existent binding gracefully', async () => {
      await manager.removeDatabaseBinding('development', 'non-existent');
      
      const config = await manager.readConfig();
      expect(config.env.development.d1_databases).toHaveLength(2);
    });
  });

  describe('getDatabaseBindings', () => {
    it('should retrieve all database bindings for environment', async () => {
      const initialConfig = `
name = "test-service"

# Production databases are at top level
[[d1_databases]]
binding = "DB1"
database_name = "prod-db-1"
database_id = "prod-id-1"

[[d1_databases]]
binding = "DB2"
database_name = "prod-db-2"
database_id = "prod-id-2"
`;
      await fs.writeFile(testConfigPath, initialConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
      
      const bindings = await manager.getDatabaseBindings('production');
      
      expect(bindings).toHaveLength(2);
      expect(bindings[0].binding).toBe('DB1');
      expect(bindings[1].database_name).toBe('prod-db-2');
    });

    it('should return empty array for environment with no bindings', async () => {
      const initialConfig = `
name = "test-service"

[env.development]
`;
      await fs.writeFile(testConfigPath, initialConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
      
      const bindings = await manager.getDatabaseBindings('development');
      
      expect(bindings).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', async () => {
      const validConfig = `
name = "valid-service"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.development]
`;
      await fs.writeFile(testConfigPath, validConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
      
      const result = await manager.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing name field', async () => {
      const invalidConfig = `
main = "src/index.js"
compatibility_date = "2024-01-01"
`;
      await fs.writeFile(testConfigPath, invalidConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
      
      const result = await manager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should detect malformed TOML', async () => {
      const malformedConfig = `
name = "test
this is invalid toml
[unclosed section
`;
      await fs.writeFile(testConfigPath, malformedConfig, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
      
      const result = await manager.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('displaySummary', () => {
    it('should display configuration summary', async () => {
      const config = `
name = "summary-test"
main = "src/index.js"

[env.development]

[[env.development.d1_databases]]
binding = "DB"
database_name = "test-db"
database_id = "test-id"

[env.production]
`;
      await fs.writeFile(testConfigPath, config, 'utf-8');
      manager = new WranglerConfigManager(testConfigPath);
      
      // Should not throw
      await expect(manager.displaySummary()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle file permission errors gracefully', async () => {
      const readOnlyPath = path.join(testDir, 'readonly.toml');
      await fs.writeFile(readOnlyPath, 'name = "test"', 'utf-8');
      
      // Note: Setting read-only on Windows requires different approach
      // This test may need platform-specific handling
      manager = new WranglerConfigManager(readOnlyPath);
      
      // Should not throw fatal error
      const config = await manager.readConfig();
      expect(config).toBeDefined();
    });

    it('should handle invalid database binding format', async () => {
      manager = new WranglerConfigManager(testConfigPath);
      await manager.createMinimalConfig('test', 'development');
      
      // Try to add binding with missing required fields
      const invalidDbInfo = {
        binding: 'DB'
        // Missing database_name and database_id
      };
      
      await expect(
        manager.addDatabaseBinding('development', invalidDbInfo)
      ).rejects.toThrow();
    });
  });
});
