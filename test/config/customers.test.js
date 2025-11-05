import { jest } from '@jest/globals';

import fs from 'fs';
import toml from '@iarna/toml';
import { CustomerConfigurationManager } from '../../src/config/customers.js';
import { resolve } from 'path';
import { createDomainConfigSchema, validateDomainConfig, createDomainRegistry } from '../../src/config/domains.js';
import { getDirname } from '../../src/utils/esm-helper.js';

describe('CustomerConfigurationManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on fs methods and set up mocks
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{}');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
    jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true });

    // Spy on toml methods
    jest.spyOn(toml, 'parse').mockReturnValue({});
    jest.spyOn(toml, 'stringify').mockReturnValue('mocked toml content');

    manager = new CustomerConfigurationManager({
      configDir: '/test/config',
      environments: ['development', 'staging', 'production']
    });
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new CustomerConfigurationManager();

      expect(defaultManager.configDir).toContain('config');
      expect(defaultManager.environments).toEqual(['development', 'staging', 'production']);
      expect(defaultManager.customers).toBeInstanceOf(Map);
    });

    test('should initialize with custom options', () => {
      expect(manager.configDir).toBe('/test/config');
      expect(manager.environments).toEqual(['development', 'staging', 'production']);
    });
  });

  describe('createCustomer', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
    });

    test('should create customer directory structure', async () => {
      fs.existsSync.mockReturnValue(false);

      await manager.createCustomer('test-customer', 'test.com');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        resolve('/test/config', 'customers', 'test-customer'),
        { recursive: true }
      );
    });

    test('should create customer domain config', async () => {
      const result = await manager.createCustomer('test-customer', 'test.com');

      expect(result.name).toBe('test-customer');
      expect(result.domain).toBe('test.com');
      expect(result.environments).toEqual(['development', 'staging', 'production']);
    });

    test('should store customer metadata', async () => {
      await manager.createCustomer('test-customer', 'test.com', { customOption: true });

      const customer = manager.customers.get('test-customer');
      expect(customer).toBeDefined();
      expect(customer.name).toBe('test-customer');
      expect(customer.domain).toBe('test.com');
      expect(customer.customOption).toBe(true);
    });
  });

  describe('createCustomerDomainConfig', () => {
    test('should create domain config with customer details', () => {
      const config = manager.createCustomerDomainConfig('test-customer', 'test.com', {});

      expect(config.name).toBe('test-customer');
      expect(config.displayName).toBe('Test-customer');
      expect(config.domains.production).toBe('test.com');
      expect(config.domains.staging).toBe('staging.test.com');
      expect(config.domains.development).toBe('dev.test.com');
      expect(config.features.customerIsolation).toBe(true);
      expect(config.features.multiEnvironment).toBe(true);
    });

    test('should use default domain when none provided', () => {
      const config = manager.createCustomerDomainConfig('test-customer', null, {});

      expect(config.domains.production).toBe('test-customer.com');
    });

    test('should include custom features', () => {
      const config = manager.createCustomerDomainConfig('test-customer', 'test.com', {
        features: { customFeature: true }
      });

      expect(config.features.customFeature).toBe(true);
      expect(config.features.customerIsolation).toBe(true);
    });
  });

  describe('getEnvironmentDomains', () => {
    test('should return environment-specific domains', () => {
      const domains = manager.getEnvironmentDomains('test-customer', 'test.com');

      expect(domains).toEqual({
        production: 'test.com',
        staging: 'staging.test.com',
        development: 'dev.test.com'
      });
    });

    test('should use default domain when none provided', () => {
      const domains = manager.getEnvironmentDomains('test-customer', null);

      expect(domains.production).toBe('test-customer.com');
    });
  });

  describe('validateConfigs', () => {
    test('should validate configuration structure', async () => {
      fs.existsSync.mockReturnValue(true);

      const result = await manager.validateConfigs();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });

    test('should report missing base config files', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await manager.validateConfigs();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing base config: wrangler.base.toml');
      expect(result.errors).toContain('Missing base config: variables.base.env');
    });

    test('should report missing environment configs', async () => {
      fs.existsSync.mockImplementation((path) => {
        // Return false for environment config files
        return !path.includes('environments');
      });

      const result = await manager.validateConfigs();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Missing environment config'))).toBe(true);
    });
  });

  describe('showConfig', () => {
    test('should show effective configuration', () => {
      manager.customers.set('test-customer', {
        name: 'test-customer',
        domain: 'test.com'
      });

      const config = manager.showConfig('test-customer', 'production');

      expect(config.customer).toBe('test-customer');
      expect(config.environment).toBe('production');
      expect(config.domain).toBeDefined();
      expect(config.variables).toBeDefined();
      expect(config.features).toBeDefined();
    });

    test('should throw error for non-existent customer', () => {
      expect(() => {
        manager.showConfig('non-existent', 'production');
      }).toThrow('Customer not found: non-existent');
    });
  });

  describe('getDeployCommand', () => {
    test('should generate deploy command for development', () => {
      const result = manager.getDeployCommand('test-customer', 'development');

      expect(result.command).toContain('wrangler dev');
      expect(result.customer).toBe('test-customer');
      expect(result.environment).toBe('development');
    });

    test('should generate deploy command for staging', () => {
      const result = manager.getDeployCommand('test-customer', 'staging');

      expect(result.command).toContain('wrangler deploy');
      expect(result.command).toContain('--env staging');
      expect(result.environment).toBe('staging');
    });

    test('should generate deploy command for production', () => {
      const result = manager.getDeployCommand('test-customer', 'production');

      expect(result.command).toContain('wrangler deploy --env production');
      expect(result.environment).toBe('production');
    });

    test('should throw error for unknown environment', () => {
      expect(() => {
        manager.getDeployCommand('test-customer', 'unknown');
      }).toThrow('Unknown environment: unknown');
    });
  });

  describe('listCustomers', () => {
    test('should list all customers', () => {
      // Mock the domain registry get method
      manager.domainRegistry.get = jest.fn((name) => ({ name, domain: `${name}.com` }));
      
      manager.customers.set('customer1', { name: 'customer1' });
      manager.customers.set('customer2', { name: 'customer2' });

      const customers = manager.listCustomers();

      expect(customers).toHaveLength(2);
      expect(customers.map(c => c.name)).toEqual(['customer1', 'customer2']);
    });

    test('should return empty array when no customers', () => {
      const customers = manager.listCustomers();

      expect(customers).toEqual([]);
    });
  });

  describe('Utility Methods', () => {
    describe('capitalizeFirst', () => {
      test('should capitalize first letter', () => {
        expect(manager.capitalizeFirst('test')).toBe('Test');
        expect(manager.capitalizeFirst('CUSTOMER')).toBe('CUSTOMER');
        expect(manager.capitalizeFirst('a')).toBe('A');
      });
    });

    describe('deepMergeConfig', () => {
      test('should merge objects deeply', () => {
        const target = { a: 1, b: { c: 2 } };
        const source = { b: { d: 3 }, e: 4 };

        const result = manager.deepMergeConfig(target, source);

        expect(result).toEqual({
          a: 1,
          b: { c: 2, d: 3 },
          e: 4
        });
      });

      test('should overwrite arrays and primitives', () => {
        const target = { a: [1, 2], b: 'old' };
        const source = { a: [3, 4], b: 'new' };

        const result = manager.deepMergeConfig(target, source);

        expect(result.a).toEqual([3, 4]);
        expect(result.b).toBe('new');
      });
    });
  });

  describe('File Operations', () => {
    describe('updateWranglerToml', () => {
      test('should update wrangler.toml file', () => {
        fs.readFileSync.mockReturnValue('existing: content');
        toml.parse.mockReturnValue({ existing: 'content' });

        const result = manager.updateWranglerToml('/path/to/wrangler.toml', { newField: 'value' });

        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      test('should handle file operation errors', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('File not found');
        });
        // Make existsSync return true so it tries to read the file
        fs.existsSync.mockReturnValue(true);

        const result = manager.updateWranglerToml('/invalid/path.toml', {});

        expect(result).toBe(false);
      });
    });

    describe('addD1Database', () => {
      test('should add D1 database to environment', () => {
        fs.readFileSync.mockReturnValue('existing: content');
        toml.parse.mockReturnValue({
          env: {
            production: {}
          }
        });

        const dbConfig = {
          binding: 'DB',
          database_name: 'test-db',
          database_id: 'db-123'
        };

        const result = manager.addD1Database('/path/to/wrangler.toml', 'production', dbConfig);

        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      test('should update existing database binding', () => {
        fs.readFileSync.mockReturnValue('existing: content');
        toml.parse.mockReturnValue({
          env: {
            production: {
              d1_databases: [{ binding: 'DB', database_name: 'old-db' }]
            }
          }
        });

        const dbConfig = {
          binding: 'DB',
          database_name: 'new-db',
          database_id: 'db-456'
        };

        manager.addD1Database('/path/to/wrangler.toml', 'production', dbConfig);

        expect(toml.stringify).toHaveBeenCalled();
      });
    });
  });
});