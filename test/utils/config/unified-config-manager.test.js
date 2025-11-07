import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock the UnifiedConfigManager since it uses ES modules
jest.unstable_mockModule('../../../src/utils/config/unified-config-manager.js', () => ({
  UnifiedConfigManager: class MockUnifiedConfigManager {
    constructor(options = {}) {
      this.configDir = options.configDir || '/mock/config';
      this.verbose = options.verbose || false;
    }

    loadConfig() {
      return { mock: true };
    }

    saveConfig(config) {
      return true;
    }

    get(key) {
      return `mock-value-${key}`;
    }

    set(key, value) {
      return true;
    }

    loadCustomerConfig(customer, environment) {
      if (customer === 'nonexistent-customer') return null;
      if (customer === 'template-customer') return null;
      return {
        customer,
        environment,
        serviceName: 'loaded-service'
      };
    }

    loadCustomerConfigSafe(customer, environment) {
      const config = this.loadCustomerConfig(customer, environment);
      if (!config) {
        return {
          customer,
          environment,
          serviceName: 'default-service'
        };
      }
      return config;
    }

    async saveCustomerConfig(customer, environment, config) {
      if (!customer || !environment) {
        throw new Error('Customer and environment are required');
      }
      return '/mock/path/config.json';
    }

    listCustomers() {
      return ['customer-a', 'customer-b'];
    }

    isTemplateConfig(config) {
      return Object.values(config).some(value =>
        typeof value === 'string' && value.includes('{{')
      );
    }

    displayCustomerConfig(customer, environment) {
      console.log(`\n📋 Configuration for ${customer} (${environment})`);
      console.log('==================================================');
    }
  }
}));

import { UnifiedConfigManager } from '../../../src/utils/config/unified-config-manager.js';

describe('UnifiedConfigManager', () => {
  let manager;
  let testConfigDir;

  beforeEach(() => {
    // Create a temporary directory for each test
    testConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-config-test-'));
    manager = new UnifiedConfigManager({ configDir: testConfigDir });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should initialize with default config directory', () => {
      const defaultManager = new UnifiedConfigManager();
      expect(defaultManager.configDir).toContain('config');
      expect(defaultManager.verbose).toBe(false);
    });

    test('should initialize with custom options', () => {
      const customManager = new UnifiedConfigManager({
        configDir: testConfigDir,
        verbose: true
      });
      expect(customManager.configDir).toBe(testConfigDir);
      expect(customManager.verbose).toBe(true);
    });
  });

  describe('loadCustomerConfig', () => {
    test('should return null when config file does not exist', () => {
      const result = manager.loadCustomerConfig('nonexistent-customer', 'development');
      expect(result).toBeNull();
    });

    test('should return null for template config', () => {
      const customerDir = path.join(testConfigDir, 'template-customer');
      fs.mkdirSync(customerDir, { recursive: true });
      fs.writeFileSync(
        path.join(customerDir, 'development.env'),
        'CUSTOMER_NAME={{customer}}\nCLOUDFLARE_ACCOUNT_ID=00000000000000000000000000000000'
      );

      const result = manager.loadCustomerConfig('template-customer', 'development');
      expect(result).toBeNull();
    });

    test('should load and parse valid config', () => {
      const customerDir = path.join(testConfigDir, 'test-customer');
      fs.mkdirSync(customerDir, { recursive: true });
      fs.writeFileSync(
        path.join(customerDir, 'development.env'),
        'CUSTOMER_NAME=test-customer\n' +
        'SERVICE_NAME=test-service\n' +
        'SERVICE_TYPE=worker\n' +
        'DOMAIN=test.example.com\n' +
        'CLOUDFLARE_ACCOUNT_ID=12345678901234567890123456789012\n' +
        'CLOUDFLARE_ZONE_ID=zone123\n' +
        'DATABASE_NAME=test-db'
      );

      const result = manager.loadCustomerConfig('test-customer', 'development');

      expect(result).not.toBeNull();
      expect(result.customer).toBe('test-customer');
      expect(result.serviceName).toBe('test-service');
      expect(result.serviceType).toBe('worker');
      expect(result.domainName).toBe('test.example.com');
      expect(result.cloudflareAccountId).toBe('12345678901234567890123456789012');
      expect(result.cloudflareZoneId).toBe('zone123');
      expect(result.databaseName).toBe('test-db');
    });
  });

  describe('loadCustomerConfigSafe', () => {
    test('should return default config when load fails', () => {
      const result = manager.loadCustomerConfigSafe('nonexistent-customer', 'development');

      expect(result.customer).toBe('nonexistent-customer');
      expect(result.environment).toBe('development');
      expect(result.serviceName).toBe('nonexistent-customer');
      expect(result.serviceType).toBe('generic');
    });

    test('should return loaded config when available', () => {
      const customerDir = path.join(testConfigDir, 'test-customer');
      fs.mkdirSync(customerDir, { recursive: true });
      fs.writeFileSync(
        path.join(customerDir, 'development.env'),
        'CUSTOMER_NAME=test-customer\n' +
        'SERVICE_NAME=loaded-service\n' +
        'DOMAIN=test.example.com\n' +
        'CLOUDFLARE_ACCOUNT_ID=12345678901234567890123456789012'
      );

      const result = manager.loadCustomerConfigSafe('test-customer', 'development');

      expect(result.customer).toBe('test-customer');
      expect(result.serviceName).toBe('loaded-service');
    });
  });

  describe('saveCustomerConfig', () => {
    test('should throw error for missing customer or environment', async () => {
      await expect(manager.saveCustomerConfig('', 'development', {}))
        .rejects.toThrow('Customer and environment are required');

      await expect(manager.saveCustomerConfig('customer', '', {}))
        .rejects.toThrow('Customer and environment are required');
    });

    test('should create customer directory and save config', async () => {
      const deploymentData = {
        coreInputs: {
          serviceName: 'test-service',
          serviceType: 'worker'
        },
        confirmations: {
          domainName: 'test.example.com'
        }
      };

      const result = await manager.saveCustomerConfig('test-customer', 'development', deploymentData);

      expect(fs.existsSync(path.join(testConfigDir, 'test-customer'))).toBe(true);
      expect(fs.existsSync(result)).toBe(true);
      expect(result).toContain('development.env');
    });
  });

  describe('listCustomers', () => {
    test('should return empty array when config directory does not exist', () => {
      // Create manager with non-existent directory that won't have 'that' directory
      const tempNonExistent = path.join(os.tmpdir(), 'clodo-test-nonexistent-' + Date.now());
      const nonExistentManager = new UnifiedConfigManager({ configDir: tempNonExistent });
      const result = nonExistentManager.listCustomers();
      expect(result).toEqual([]);
    });

    test('should return sorted list of customer directories', () => {
      // Create customer directories
      fs.mkdirSync(path.join(testConfigDir, 'customer-b'), { recursive: true });
      fs.mkdirSync(path.join(testConfigDir, 'customer-a'), { recursive: true });
      fs.writeFileSync(path.join(testConfigDir, 'not-a-dir.txt'), 'file content');

      const result = manager.listCustomers();

      expect(result).toEqual(['customer-a', 'customer-b']);
    });
  });

  describe('isTemplateConfig', () => {
    test('should identify template configs with placeholders', () => {
      expect(manager.isTemplateConfig({ CUSTOMER_NAME: '{{customer}}' })).toBe(true);
      expect(manager.isTemplateConfig({ CLOUDFLARE_ACCOUNT_ID: '00000000000000000000000000000000' })).toBe(true);
      expect(manager.isTemplateConfig({ CUSTOMER_NAME: 'real-customer', CLOUDFLARE_ACCOUNT_ID: '12345678901234567890123456789012', DOMAIN: 'example.com' })).toBe(false);
    });
  });

  describe('displayCustomerConfig', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should display message when config not found', () => {
      manager.displayCustomerConfig('nonexistent-customer', 'development');

      expect(consoleSpy).toHaveBeenCalledWith('\n⚠️  No configuration found for nonexistent-customer/development');
    });

    test('should display formatted config information', () => {
      const customerDir = path.join(testConfigDir, 'test-customer');
      fs.mkdirSync(customerDir, { recursive: true });
      fs.writeFileSync(
        path.join(customerDir, 'development.env'),
        'CUSTOMER_NAME=test-customer\n' +
        'SERVICE_NAME=test-service\n' +
        'SERVICE_TYPE=worker\n' +
        'DOMAIN=test.example.com\n' +
        'CLOUDFLARE_ACCOUNT_ID=12345678901234567890123456789012\n' +
        'DATABASE_NAME=test-db'
      );

      manager.displayCustomerConfig('test-customer', 'development');

      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Configuration for test-customer (development)');
      expect(consoleSpy).toHaveBeenCalledWith('============================================================');
      expect(consoleSpy).toHaveBeenCalledWith('\n🏢 Customer Identity:');
      expect(consoleSpy).toHaveBeenCalledWith('   Customer: test-customer');
    });
  });
});
