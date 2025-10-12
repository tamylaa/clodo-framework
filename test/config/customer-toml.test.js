/**
 * Basic Tests for Customer Configuration TOML Management
 * 
 * Validates that the customer configuration module loads correctly
 */

import { CustomerConfigurationManager } from '../../src/config/customers.js';
import { CustomerConfigCLI } from '../../src/config/CustomerConfigCLI.js';

describe('Customer Configuration Module', () => {
  describe('exports', () => {
    it('should export CustomerConfigurationManager', () => {
      expect(CustomerConfigurationManager).toBeDefined();
      expect(typeof CustomerConfigurationManager).toBe('function');
    });
  });

  describe('CustomerConfigurationManager', () => {
    it('should create instance with default config directory', () => {
      const manager = new CustomerConfigurationManager();
      expect(manager).toBeDefined();
      expect(manager.configDir).toBeDefined();
    });

    it('should create instance with custom options', () => {
      const manager = new CustomerConfigurationManager({ configDir: '/test/path' });
      expect(manager).toBeDefined();
      expect(manager.configDir).toBe('/test/path');
    });

    it('should have required methods', () => {
      const manager = new CustomerConfigurationManager();
      expect(typeof manager.createCustomer).toBe('function');
      expect(typeof manager.loadExistingCustomers).toBe('function');
      expect(typeof manager.getCustomerInfo).toBe('function');
    });
  });

  describe('CustomerConfigCLI', () => {
    it('should create instance successfully', () => {
      const cli = new CustomerConfigCLI();
      expect(cli).toBeDefined();
      expect(cli.customerManager).toBeDefined();
    });

    it('should accept configDir option', () => {
      const cli = new CustomerConfigCLI({ configDir: '/custom/path' });
      expect(cli).toBeDefined();
      expect(cli.customerManager).toBeDefined();
    });
  });
});
