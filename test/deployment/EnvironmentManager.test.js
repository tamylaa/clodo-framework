/**
 * EnvironmentManager Consolidation Tests
 * Tests for consolidated environment setup from enterprise-deploy.js and master-deploy.js
 */

import { EnvironmentManager } from '../../lib/deployment/modules/EnvironmentManager.js';

describe('EnvironmentManager - Consolidation Tests', () => {
  let manager;

  beforeEach(() => {
    manager = new EnvironmentManager({
      environment: 'production',
      deploymentMode: 'single',
      domain: 'testdomain'
    });
  });

  describe('CLI Option Definition Consolidation', () => {
    test('should provide unified environment option definition', () => {
      const envOption = EnvironmentManager.getEnvironmentOption();
      
      expect(envOption).toHaveProperty('flag', '-e, --env');
      expect(envOption).toHaveProperty('description');
      expect(envOption).toHaveProperty('default', 'production');
      expect(envOption).toHaveProperty('validate');
    });

    test('environment option should validate correct environments', () => {
      const envOption = EnvironmentManager.getEnvironmentOption();
      
      expect(envOption.validate('production')).toBe('production');
      expect(envOption.validate('staging')).toBe('staging');
      expect(envOption.validate('development')).toBe('development');
      expect(envOption.validate('preview')).toBe('preview');
    });

    test('environment option should reject invalid environments', () => {
      const envOption = EnvironmentManager.getEnvironmentOption();
      
      expect(() => envOption.validate('invalid')).toThrow();
      expect(() => envOption.validate('prod')).toThrow();
      expect(() => envOption.validate('test')).toThrow();
    });

    test('should provide unified deployment mode option definition', () => {
      const modeOption = EnvironmentManager.getDeploymentModeOption();
      
      expect(modeOption).toHaveProperty('flag', '--mode');
      expect(modeOption).toHaveProperty('description');
      expect(modeOption).toHaveProperty('default', 'single');
      expect(modeOption).toHaveProperty('choices');
      expect(modeOption.choices).toContain('single');
      expect(modeOption.choices).toContain('multi-domain');
      expect(modeOption.choices).toContain('portfolio');
    });

    test('deployment mode option should validate correctly', () => {
      const modeOption = EnvironmentManager.getDeploymentModeOption();
      
      expect(modeOption.validate('single')).toBe('single');
      expect(modeOption.validate('multi-domain')).toBe('multi-domain');
      expect(modeOption.validate('portfolio')).toBe('portfolio');
    });

    test('deployment mode option should reject invalid modes', () => {
      const modeOption = EnvironmentManager.getDeploymentModeOption();
      
      expect(() => modeOption.validate('invalid')).toThrow();
      expect(() => modeOption.validate('monolithic')).toThrow();
    });
  });

  describe('CLI Argument Parsing - From enterprise-deploy.js Consolidation', () => {
    test('should parse environment from CLI arguments', () => {
      expect(EnvironmentManager.parseEnvironmentFromArgs({ env: 'staging' }))
        .toBe('staging');
      
      expect(EnvironmentManager.parseEnvironmentFromArgs({ environment: 'development' }))
        .toBe('development');
    });

    test('should default to production if no environment specified', () => {
      expect(EnvironmentManager.parseEnvironmentFromArgs({}))
        .toBe('production');
    });

    test('should handle DEPLOY_ENV environment variable', () => {
      process.env.DEPLOY_ENV = 'staging';
      
      expect(EnvironmentManager.parseEnvironmentFromArgs({}))
        .toBe('staging');
      
      delete process.env.DEPLOY_ENV;
    });

    test('should sanitize invalid environments to production', () => {
      expect(EnvironmentManager.parseEnvironmentFromArgs({ env: 'invalid' }))
        .toBe('production');
    });

    test('should parse deployment mode from CLI arguments', () => {
      expect(EnvironmentManager.parseDeploymentModeFromArgs({ mode: 'multi-domain' }))
        .toBe('multi-domain');
      
      expect(EnvironmentManager.parseDeploymentModeFromArgs({ deploymentMode: 'portfolio' }))
        .toBe('portfolio');
    });

    test('should default to single mode if not specified', () => {
      expect(EnvironmentManager.parseDeploymentModeFromArgs({}))
        .toBe('single');
    });

    test('should sanitize invalid modes to single', () => {
      expect(EnvironmentManager.parseDeploymentModeFromArgs({ mode: 'invalid' }))
        .toBe('single');
    });
  });

  describe('Factory Method - fromCLIArgs', () => {
    test('should create EnvironmentManager from CLI arguments', () => {
      const manager = EnvironmentManager.fromCLIArgs({
        env: 'staging',
        mode: 'multi-domain'
      });

      expect(manager).toBeInstanceOf(EnvironmentManager);
      expect(manager.config.environment).toBe('staging');
      expect(manager.config.deploymentMode).toBe('multi-domain');
    });

    test('should set sensible defaults in factory', () => {
      const manager = EnvironmentManager.fromCLIArgs({});

      expect(manager.config.environment).toBe('production');
      expect(manager.config.deploymentMode).toBe('single');
      expect(manager.config.enableRollback).toBe(true);
      expect(manager.config.enableTesting).toBe(true);
    });

    test('should respect disabling flags', () => {
      const manager = EnvironmentManager.fromCLIArgs({
        enableRollback: false,
        enableTesting: false
      });

      expect(manager.config.enableRollback).toBe(false);
      expect(manager.config.enableTesting).toBe(false);
    });

    test('should merge additional options', () => {
      const manager = EnvironmentManager.fromCLIArgs({
        env: 'development',
        customOption: 'customValue'
      });

      expect(manager.config.customOption).toBe('customValue');
    });
  });

  describe('Environment Selection - From master-deploy.js Consolidation', () => {
    test('should store supported environments', () => {
      const envs = manager.getSupportedEnvironments();
      
      expect(envs).toContain('production');
      expect(envs).toContain('staging');
      expect(envs).toContain('development');
      expect(envs).toContain('preview');
      expect(envs).toHaveLength(4);
    });

    test('should provide supported environments as class method', () => {
      const manager = EnvironmentManager.fromCLIArgs({});
      const envs = manager.getSupportedEnvironments();
      
      expect(Array.isArray(envs)).toBe(true);
      expect(envs.length).toBeGreaterThan(0);
    });
  });

  describe('Deployment Mode Consolidation', () => {
    test('should store supported deployment modes', () => {
      const modes = manager.getSupportedDeploymentModes();
      
      expect(modes).toContain('single');
      expect(modes).toContain('multi-domain');
      expect(modes).toContain('portfolio');
      expect(modes).toHaveLength(3);
    });

    test('should provide deployment modes as class method', () => {
      const manager = EnvironmentManager.fromCLIArgs({});
      const modes = manager.getSupportedDeploymentModes();
      
      expect(Array.isArray(modes)).toBe(true);
      expect(modes.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Retrieval', () => {
    test('should retrieve current environment configuration', () => {
      const config = manager.getEnvironmentConfig();
      
      expect(config.environment).toBe('production');
      expect(config.deploymentMode).toBe('single');
      expect(config.domain).toBe('testdomain');
    });

    test('should include all required fields in config retrieval', () => {
      const config = manager.getEnvironmentConfig();
      
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('deploymentMode');
      expect(config).toHaveProperty('domain');
      expect(config).toHaveProperty('worker');
      expect(config).toHaveProperty('orchestrator');
      expect(config).toHaveProperty('coordinator');
      expect(config).toHaveProperty('domainDiscovery');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing options gracefully', () => {
      const manager = EnvironmentManager.fromCLIArgs({});
      
      expect(manager.config.environment).toBe('production');
      expect(manager.config.deploymentMode).toBe('single');
    });

    test('should handle undefined environment', () => {
      const env = EnvironmentManager.parseEnvironmentFromArgs({ env: undefined });
      
      expect(env).toBe('production');
    });

    test('should handle empty object options', () => {
      const manager = EnvironmentManager.fromCLIArgs({});
      
      expect(manager).toBeInstanceOf(EnvironmentManager);
      expect(manager.config).toBeDefined();
    });
  });

  describe('Consolidation Integration', () => {
    test('should consolidate all three deployment system patterns', () => {
      // Pattern 1: enterprise-deploy.js CLI options
      const envOption = EnvironmentManager.getEnvironmentOption();
      expect(envOption.flag).toBe('-e, --env');

      // Pattern 2: master-deploy.js mode selection
      const modes = manager.getSupportedDeploymentModes();
      expect(modes).toContain('single');

      // Pattern 3: modular-enterprise-deploy.js factory method
      const manager2 = EnvironmentManager.fromCLIArgs({ env: 'staging' });
      expect(manager2).toBeInstanceOf(EnvironmentManager);
    });

    test('should eliminate duplication across deployment systems', () => {
      // Before consolidation: 3 separate CLI option handlers
      // After consolidation: 1 unified option definition

      const envOption1 = EnvironmentManager.getEnvironmentOption();
      const envOption2 = EnvironmentManager.getEnvironmentOption();

      // Same option definition structure for all deployment systems
      expect(envOption1.flag).toEqual(envOption2.flag);
      expect(envOption1.description).toEqual(envOption2.description);
      expect(envOption1.default).toEqual(envOption2.default);
      expect(typeof envOption1.validate).toBe('function');
    });

    test('should support all three deployment system initialization patterns', () => {
      // Pattern from enterprise-deploy.js
      const manager1 = new EnvironmentManager({ environment: 'production' });
      expect(manager1.config.environment).toBe('production');

      // Pattern from master-deploy.js
      const manager2 = EnvironmentManager.fromCLIArgs({ env: 'staging' });
      expect(manager2.config.environment).toBe('staging');

      // Pattern from modular-enterprise-deploy.js
      const manager3 = new EnvironmentManager({ 
        environment: 'development',
        deploymentMode: 'multi-domain'
      });
      expect(manager3.config.deploymentMode).toBe('multi-domain');
    });
  });
});
