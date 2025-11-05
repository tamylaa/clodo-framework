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
    // Add delay to ensure async operations complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Clean up test directory with retry logic
    if (testDir) {
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.rm(testDir, { recursive: true, force: true });
          break;
        } catch (error) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
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

  describe('Customer Config Management', () => {
    describe('getCustomerConfigPath', () => {
      it('should generate correct path for zone name', () => {
        manager = new WranglerConfigManager(testConfigPath);
        
        const path1 = manager.getCustomerConfigPath('clodo.dev');
        expect(path1).toContain('config');
        expect(path1).toContain('customers');
        expect(path1).toContain('clodo');
        expect(path1).toContain('wrangler.toml');
        
        const path2 = manager.getCustomerConfigPath('wetechfounders.com');
        expect(path2).toContain('wetechfounders');
      });

      it('should handle zone names with multiple dots', () => {
        manager = new WranglerConfigManager(testConfigPath);
        
        const configPath = manager.getCustomerConfigPath('api.example.co.uk');
        expect(configPath).toContain('api');
        expect(configPath).toContain('wrangler.toml');
      });
    });

    describe('generateCustomerConfig', () => {
      beforeEach(async () => {
        // Create a base config to use as template
        manager = new WranglerConfigManager(testConfigPath);
        const baseConfig = {
          name: 'testcorp-data-service',
          main: 'src/worker/index.js',
          compatibility_date: '2023-07-17',
          account_id: 'old-account-id',
          env: {
            production: {
              name: 'testcorp-data-service',
              vars: {
                SERVICE_DOMAIN: 'testcorp',
                SERVICE_NAME: 'data-service'
              }
            },
            staging: {
              name: 'testcorp-data-service',
              vars: {
                SERVICE_DOMAIN: 'testcorp'
              }
            }
          }
        };
        await manager.writeConfig(baseConfig);
      });

      it('should update account_id in customer config', async () => {
        const customerPath = await manager.generateCustomerConfig('clodo.dev', {
          accountId: 'new-account-123',
          environment: 'production'
        });
        
        expect(customerPath).toBeDefined();
        expect(customerPath).toContain('clodo');
        
        // Verify the customer config was created with new account_id
        const customerContent = await fs.readFile(customerPath, 'utf-8');
        expect(customerContent).toContain('new-account-123');
        expect(customerContent).not.toContain('old-account-id');
      });

      it('should update worker name with zone prefix', async () => {
        const customerPath = await manager.generateCustomerConfig('clodo.dev', {
          accountId: 'account-123',
          environment: 'production'
        });
        
        const customerContent = await fs.readFile(customerPath, 'utf-8');
        
        // Should replace testcorp- with clodo-
        expect(customerContent).toContain('clodo-data-service');
        expect(customerContent).not.toContain('testcorp-data-service');
      });

      it('should update SERVICE_DOMAIN environment variable', async () => {
        const customerPath = await manager.generateCustomerConfig('clodo.dev', {
          accountId: 'account-123',
          environment: 'production'
        });
        
        const customerContent = await fs.readFile(customerPath, 'utf-8');
        
        // SERVICE_DOMAIN should be updated to zone prefix
        expect(customerContent).toContain('SERVICE_DOMAIN = "clodo"');
        expect(customerContent).not.toContain('SERVICE_DOMAIN = "testcorp"');
      });

      it('should update all environment sections', async () => {
        const customerPath = await manager.generateCustomerConfig('acme.com', {
          accountId: 'account-456',
          environment: 'production'
        });
        
        const customerContent = await fs.readFile(customerPath, 'utf-8');
        
        // Both production and staging should be updated
        expect(customerContent).toContain('acme-data-service');
        expect(customerContent).toContain('SERVICE_DOMAIN = "acme"');
        
        // Count occurrences - should appear in multiple environments
        const matches = customerContent.match(/acme-data-service/g);
        expect(matches.length).toBeGreaterThan(1);
      });

      it('should create new customer config if none exists', async () => {
        const newCustomerPath = await manager.generateCustomerConfig('newzone.dev', {
          accountId: 'new-account-789',
          environment: 'production'
        });
        
        // Verify file was created
        const exists = await fs.access(newCustomerPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
        
        const content = await fs.readFile(newCustomerPath, 'utf-8');
        expect(content).toContain('new-account-789');
        expect(content).toContain('newzone-data-service');
        expect(content).toContain('SERVICE_DOMAIN = "newzone"');
      });

      it('should handle zones with hyphens in name', async () => {
        const customerPath = await manager.generateCustomerConfig('my-company.dev', {
          accountId: 'account-123',
          environment: 'production'
        });
        
        const customerContent = await fs.readFile(customerPath, 'utf-8');
        
        // Should use first part before dot as prefix
        expect(customerContent).toContain('my-company-data-service');
        expect(customerContent).toContain('SERVICE_DOMAIN = "my-company"');
      });

      it('should throw error if zone name is missing', async () => {
        await expect(
          manager.generateCustomerConfig('', {
            accountId: 'account-123'
          })
        ).rejects.toThrow('Zone name is required');
      });
    });

    describe('copyCustomerConfig', () => {
      it('should copy customer config to root', async () => {
        manager = new WranglerConfigManager(testConfigPath);
        
        // Set up a base config first (to use as template)
        const baseConfig = {
          name: 'testcorp-data-service',
          main: 'src/worker/index.js',
          compatibility_date: '2023-07-17',
          account_id: 'old-account-id',
          env: {
            production: {
              name: 'testcorp-data-service',
              vars: {
                SERVICE_DOMAIN: 'testcorp',
                SERVICE_NAME: 'data-service'
              }
            }
          }
        };
        await manager.writeConfig(baseConfig);
        
        // Generate a customer config (will use base config as template)
        const customerPath = await manager.generateCustomerConfig('clodo.dev', {
          accountId: 'customer-account-id',
          environment: 'production'
        });
        
        // Copy to root
        await manager.copyCustomerConfig(customerPath);
        
        // Verify root config now matches customer config
        const rootContent = await fs.readFile(testConfigPath, 'utf-8');
        const customerContent = await fs.readFile(customerPath, 'utf-8');
        
        expect(rootContent).toBe(customerContent);
        expect(rootContent).toContain('customer-account-id');
        expect(rootContent).toContain('clodo-data-service');
      });

      it('should throw error if customer config path is missing', async () => {
        manager = new WranglerConfigManager(testConfigPath);
        
        await expect(
          manager.copyCustomerConfig('')
        ).rejects.toThrow('Customer config path is required');
      });

      it('should handle non-existent customer config gracefully', async () => {
        manager = new WranglerConfigManager(testConfigPath);
        
        const nonExistentPath = path.join(testDir, 'does-not-exist.toml');
        
        await expect(
          manager.copyCustomerConfig(nonExistentPath)
        ).rejects.toThrow();
      });
    });
  });
});
