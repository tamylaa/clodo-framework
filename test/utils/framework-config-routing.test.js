/**
 * FrameworkConfig Routing Configuration Tests
 * 
 * Tests for config-driven routing behavior
 * Verifies path prefixes, workers.dev domain, and defaults are read from config
 * 
 * @jest-environment node
 */

import { FrameworkConfig } from '../../src/utils/framework-config.js';

describe('FrameworkConfig - Routing Configuration', () => {
  let config;

  beforeEach(() => {
    config = new FrameworkConfig();
  });

  describe('getRoutingConfig()', () => {
    it('should load routing configuration from validation-config.json', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig).toBeDefined();
      expect(routingConfig.defaults).toBeDefined();
      expect(routingConfig.domains).toBeDefined();
      expect(routingConfig.validation).toBeDefined();
      expect(routingConfig.comments).toBeDefined();
    });

    it('should include default routing options', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig.defaults.includeComments).toBe(true);
      expect(routingConfig.defaults.includeZoneId).toBe(true);
      expect(routingConfig.defaults.targetEnvironment).toBe('all');
      expect(routingConfig.defaults.orderStrategy).toBe('most-specific-first');
    });

    it('should include workers.dev domain from templates', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig.domains.workersDomain).toBe('workers.dev');
    });

    it('should include skip patterns configuration', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig.domains.skipPatterns).toBeDefined();
      expect(Array.isArray(routingConfig.domains.skipPatterns)).toBe(true);
    });

    it('should include complex TLD configuration', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig.domains.complexTLDs).toBeDefined();
      expect(routingConfig.domains.complexTLDs).toContain('.co.uk');
      expect(routingConfig.domains.complexTLDs).toContain('.com.au');
    });

    it('should include validation patterns', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig.validation.zoneIdPattern).toBe('^[a-f0-9]{32}$');
      expect(routingConfig.validation.domainPattern).toBe('^[a-z0-9.-]+$');
      expect(routingConfig.validation.strictMode).toBe(true);
    });

    it('should include comment templates for each environment', () => {
      const routingConfig = config.getRoutingConfig();

      expect(routingConfig.comments.enabled).toBe(true);
      expect(routingConfig.comments.templates.production).toBeDefined();
      expect(routingConfig.comments.templates.staging).toBeDefined();
      expect(routingConfig.comments.templates.development).toBeDefined();
    });
  });

  describe('getEnvironmentRoutingConfig()', () => {
    it('should return production routing config', () => {
      const envConfig = config.getEnvironmentRoutingConfig('production');

      expect(envConfig.defaultPathPrefix).toBe('/api');
      expect(envConfig.wildcardPattern).toBe('/*');
      expect(envConfig.generateFallbackRoute).toBe(true);
      expect(envConfig.nestedInToml).toBe(false); // Production is top-level
    });

    it('should return staging routing config', () => {
      const envConfig = config.getEnvironmentRoutingConfig('staging');

      expect(envConfig.defaultPathPrefix).toBe('/staging-api');
      expect(envConfig.wildcardPattern).toBe('/*');
      expect(envConfig.generateFallbackRoute).toBe(true);
    });

    it('should return development routing config', () => {
      const envConfig = config.getEnvironmentRoutingConfig('development');

      expect(envConfig.defaultPathPrefix).toBe('/dev-api');
      expect(envConfig.wildcardPattern).toBe('/*');
      expect(envConfig.generateFallbackRoute).toBe(true);
    });

    it('should provide fallback defaults for missing environment', () => {
      const envConfig = config.getEnvironmentRoutingConfig('custom-env');

      expect(envConfig.defaultPathPrefix).toBeDefined();
      expect(envConfig.wildcardPattern).toBe('/*');
      expect(envConfig.generateFallbackRoute).toBe(true);
    });

    it('should use default environment when no parameter provided', () => {
      const envConfig = config.getEnvironmentRoutingConfig();

      expect(envConfig).toBeDefined();
      expect(envConfig.defaultPathPrefix).toBeDefined();
    });
  });

  describe('getEnvironmentNames()', () => {
    it('should return array of environment names from config', () => {
      const envNames = config.getEnvironmentNames();

      expect(Array.isArray(envNames)).toBe(true);
      expect(envNames).toContain('production');
      expect(envNames).toContain('staging');
      expect(envNames).toContain('development');
    });

    it('should return default environments if config is empty', () => {
      // Create config with empty environments
      const emptyConfig = new FrameworkConfig();
      emptyConfig.config.environments = {};

      const envNames = emptyConfig.getEnvironmentNames();

      expect(envNames).toContain('development');
      expect(envNames).toContain('staging');
      expect(envNames).toContain('production');
    });
  });

  describe('Integration with getAll()', () => {
    it('should include routing config in getAll() output', () => {
      const allConfig = config.getAll();

      expect(allConfig.routing).toBeDefined();
      expect(allConfig.routing.defaults).toBeDefined();
      expect(allConfig.routing.domains).toBeDefined();
    });
  });
});
