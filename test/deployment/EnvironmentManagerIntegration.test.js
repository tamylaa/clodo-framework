/**
 * EnvironmentManager Integration Tests - Phase 3.3.5d
 * 
 * Tests that verify the consolidated EnvironmentManager is properly integrated
 * into the deployment systems and eliminates scattered environment option definitions.
 */

import { EnvironmentManager } from '../../bin/deployment/modules/EnvironmentManager.js';

describe('Phase 3.3.5d: EnvironmentManager Integration', () => {
  
  describe('Consolidated CLI Option Definition', () => {
    
    it('should provide unified environment option definition', () => {
      const envOpt = EnvironmentManager.getEnvironmentOption();
      
      expect(envOpt).toBeDefined();
      expect(envOpt.flag).toBe('-e, --env');
      expect(envOpt.description).toBe('deployment environment');
      expect(envOpt.default).toBe('production');
      expect(typeof envOpt.validate).toBe('function');
    });

    it('should validate environment options correctly', () => {
      const envOpt = EnvironmentManager.getEnvironmentOption();
      
      // Valid environments
      expect(envOpt.validate('production')).toBe('production');
      expect(envOpt.validate('staging')).toBe('staging');
      expect(envOpt.validate('development')).toBe('development');
      expect(envOpt.validate('preview')).toBe('preview');
    });

    it('should reject invalid environment values', () => {
      const envOpt = EnvironmentManager.getEnvironmentOption();
      
      expect(() => envOpt.validate('invalid-env')).toThrow();
      expect(() => envOpt.validate('production-new')).toThrow();
    });

  });

  describe('Deployment Mode Option Definition', () => {
    
    it('should provide unified deployment mode option definition', () => {
      const modeOpt = EnvironmentManager.getDeploymentModeOption();
      
      expect(modeOpt).toBeDefined();
      expect(modeOpt.flag).toBe('--mode');
      expect(modeOpt.description).toBe('deployment mode');
      expect(modeOpt.default).toBe('single');
      expect(modeOpt.choices).toEqual(['single', 'multi-domain', 'portfolio']);
    });

    it('should validate deployment mode options correctly', () => {
      const modeOpt = EnvironmentManager.getDeploymentModeOption();
      
      expect(modeOpt.validate('single')).toBe('single');
      expect(modeOpt.validate('multi-domain')).toBe('multi-domain');
      expect(modeOpt.validate('portfolio')).toBe('portfolio');
    });

    it('should reject invalid deployment modes', () => {
      const modeOpt = EnvironmentManager.getDeploymentModeOption();
      
      expect(() => modeOpt.validate('invalid-mode')).toThrow();
      expect(() => modeOpt.validate('dual')).toThrow();
    });

  });

  describe('Environment Parsing from CLI Arguments', () => {
    
    it('should parse environment from CLI options', () => {
      const options = { env: 'staging', mode: 'multi-domain' };
      const env = EnvironmentManager.parseEnvironmentFromArgs(options);
      
      expect(env).toBe('staging');
    });

    it('should fall back to environment variable if no CLI option', () => {
      const originalEnv = process.env.DEPLOY_ENV;
      try {
        process.env.DEPLOY_ENV = 'development';
        const options = {};
        const env = EnvironmentManager.parseEnvironmentFromArgs(options);
        
        expect(env).toBe('development');
      } finally {
        process.env.DEPLOY_ENV = originalEnv;
      }
    });

    it('should default to production if no option or env var', () => {
      const originalEnv = process.env.DEPLOY_ENV;
      try {
        delete process.env.DEPLOY_ENV;
        const options = {};
        const env = EnvironmentManager.parseEnvironmentFromArgs(options);
        
        expect(env).toBe('production');
      } finally {
        process.env.DEPLOY_ENV = originalEnv;
      }
    });

    it('should handle alternative option names', () => {
      const options1 = { environment: 'staging' };
      const env1 = EnvironmentManager.parseEnvironmentFromArgs(options1);
      
      expect(env1).toBe('staging');
    });

    it('should warn and default on invalid environment', () => {
      const options = { env: 'invalid-env' };
      const env = EnvironmentManager.parseEnvironmentFromArgs(options);
      
      expect(env).toBe('production');
      // Verify that invalid environments result in production default
    });

  });

  describe('Deployment Mode Parsing from CLI Arguments', () => {
    
    it('should parse deployment mode from CLI options', () => {
      const options = { mode: 'portfolio' };
      const mode = EnvironmentManager.parseDeploymentModeFromArgs(options);
      
      expect(mode).toBe('portfolio');
    });

    it('should default to single mode if no option', () => {
      const options = {};
      const mode = EnvironmentManager.parseDeploymentModeFromArgs(options);
      
      expect(mode).toBe('single');
    });

    it('should handle alternative option names', () => {
      const options = { deploymentMode: 'multi-domain' };
      const mode = EnvironmentManager.parseDeploymentModeFromArgs(options);
      
      expect(mode).toBe('multi-domain');
    });

    it('should warn and default on invalid mode', () => {
      const options = { mode: 'invalid-mode' };
      const mode = EnvironmentManager.parseDeploymentModeFromArgs(options);
      
      expect(mode).toBe('single');
      // Verify that invalid modes result in single default
    });

  });

  describe('Factory Method fromCLIArgs', () => {
    
    it('should create EnvironmentManager from CLI arguments', () => {
      const options = {
        env: 'staging',
        mode: 'portfolio',
        validationLevel: 'comprehensive'
      };
      
      const manager = EnvironmentManager.fromCLIArgs(options);
      
      expect(manager).toBeInstanceOf(EnvironmentManager);
      expect(manager.config.environment).toBe('staging');
      expect(manager.config.deploymentMode).toBe('portfolio');
      expect(manager.config.validationLevel).toBe('comprehensive');
    });

    it('should apply defaults when CLI args are partial', () => {
      const options = { env: 'development' };
      const manager = EnvironmentManager.fromCLIArgs(options);
      
      expect(manager.config.environment).toBe('development');
      expect(manager.config.deploymentMode).toBe('single');
      expect(manager.config.enableRollback).toBe(true);
      expect(manager.config.enableTesting).toBe(true);
    });

    it('should preserve all provided options', () => {
      const options = {
        env: 'production',
        mode: 'multi-domain',
        validationLevel: 'basic',
        auditLevel: 'minimal',
        enableRollback: false,
        enableTesting: false,
        customOption: 'custom-value'
      };
      
      const manager = EnvironmentManager.fromCLIArgs(options);
      
      expect(manager.config.environment).toBe('production');
      expect(manager.config.deploymentMode).toBe('multi-domain');
      expect(manager.config.validationLevel).toBe('basic');
      expect(manager.config.auditLevel).toBe('minimal');
      expect(manager.config.enableRollback).toBe(false);
      expect(manager.config.enableTesting).toBe(false);
      expect(manager.config.customOption).toBe('custom-value');
    });

  });

  describe('Consolidation Verification', () => {
    
    it('should provide all required methods for consolidation', () => {
      expect(typeof EnvironmentManager.getEnvironmentOption).toBe('function');
      expect(typeof EnvironmentManager.getDeploymentModeOption).toBe('function');
      expect(typeof EnvironmentManager.parseEnvironmentFromArgs).toBe('function');
      expect(typeof EnvironmentManager.parseDeploymentModeFromArgs).toBe('function');
      expect(typeof EnvironmentManager.fromCLIArgs).toBe('function');
    });

    it('should eliminate scattered environment option definitions', () => {
      // Verify that EnvironmentManager provides the canonical source for these definitions
      const envOpt = EnvironmentManager.getEnvironmentOption();
      const modeOpt = EnvironmentManager.getDeploymentModeOption();
      
      // All deployments should use these unified definitions
      expect(envOpt.flag).toBeDefined();
      expect(envOpt.description).toBeDefined();
      expect(envOpt.validate).toBeDefined();
      
      expect(modeOpt.flag).toBeDefined();
      expect(modeOpt.description).toBeDefined();
      expect(modeOpt.validate).toBeDefined();
    });

  });

  describe('Real-World Integration Scenarios', () => {
    
    it('should handle typical CLI deployment scenario', () => {
      const cliArgs = {
        env: 'production',
        mode: 'portfolio',
        dryRun: true,
        force: false
      };
      
      const manager = EnvironmentManager.fromCLIArgs(cliArgs);
      
      expect(manager.config.environment).toBe('production');
      expect(manager.config.deploymentMode).toBe('portfolio');
      expect(manager.config.dryRun).toBe(true);
      expect(manager.config.force).toBe(false);
    });

    it('should handle minimal CLI arguments with defaults', () => {
      const cliArgs = {};
      const manager = EnvironmentManager.fromCLIArgs(cliArgs);
      
      expect(manager.config.environment).toBe('production');
      expect(manager.config.deploymentMode).toBe('single');
      expect(manager.config.enableRollback).toBe(true);
      expect(manager.config.enableTesting).toBe(true);
    });

    it('should support staging deployment with multi-domain', () => {
      const cliArgs = {
        env: 'staging',
        mode: 'multi-domain'
      };
      
      const manager = EnvironmentManager.fromCLIArgs(cliArgs);
      
      expect(manager.config.environment).toBe('staging');
      expect(manager.config.deploymentMode).toBe('multi-domain');
    });

    it('should support development single-service deployments', () => {
      const cliArgs = {
        env: 'development',
        mode: 'single'
      };
      
      const manager = EnvironmentManager.fromCLIArgs(cliArgs);
      
      expect(manager.config.environment).toBe('development');
      expect(manager.config.deploymentMode).toBe('single');
    });

  });

});
