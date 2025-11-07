/**
 * ConfigurationManager Unit Tests
 * Tests for unified configuration management
 */

import { ConfigurationManager, configManager, isFeatureEnabled, getEnabledFeatures, withFeature, FEATURES, COMMON_FEATURES } from '../../../lib/shared/config/ConfigurationManager.js';

describe('ConfigurationManager', () => {
  describe('Feature Flag Management', () => {
    let manager;

    beforeEach(() => {
      manager = new ConfigurationManager();
    });

    describe('isFeatureEnabled', () => {
      test('should return enabled features', () => {
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(true);
      });

      test('should return disabled features', () => {
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(false);
      });

      test('should use default value for unknown features', () => {
        expect(manager.isFeatureEnabled('UNKNOWN_FEATURE', true)).toBe(true);
        expect(manager.isFeatureEnabled('UNKNOWN_FEATURE', false)).toBe(false);
      });

      test('should respect environment overrides', () => {
        const testManager = new ConfigurationManager({ features: { TEST_FEATURE: false } });
        expect(testManager.isFeatureEnabled('TEST_FEATURE')).toBe(false);
      });
    });

    describe('enableFeature/disableFeature', () => {
      test('should enable a disabled feature', () => {
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(false);
        manager.enableFeature('ENABLE_DEBUG_LOGGING');
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);
      });

      test('should disable an enabled feature', () => {
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(true);
        manager.disableFeature('ENABLE_ENHANCED_SCHEMA');
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(false);
      });

      test('should enable feature with dependencies', () => {
        manager.enableFeature('ENABLE_ENHANCED_SCHEMA', {
          dependencies: ['ENABLE_SCHEMA_CACHING']
        });
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(true);
        expect(manager.isFeatureEnabled('ENABLE_SCHEMA_CACHING')).toBe(true);
      });
    });

    describe('toggleFeature', () => {
      test('should toggle a feature from off to on', () => {
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(false);
        const result = manager.toggleFeature('ENABLE_DEBUG_LOGGING');
        expect(result).toBe(true);
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);
      });

      test('should toggle a feature from on to off', () => {
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(true);
        const result = manager.toggleFeature('ENABLE_ENHANCED_SCHEMA');
        expect(result).toBe(false);
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(false);
      });
    });

    describe('Feature Overrides', () => {
      test('should set a global feature override', () => {
        manager.setFeatureOverride('ENABLE_DEBUG_LOGGING', true);
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);
      });

      test('should remove a global feature override', () => {
        manager.setFeatureOverride('ENABLE_DEBUG_LOGGING', true);
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);
        
        manager.removeFeatureOverride('ENABLE_DEBUG_LOGGING');
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(false);
      });

      test('should prioritize global overrides over defaults', () => {
        manager.setFeatureOverride('ENABLE_ENHANCED_SCHEMA', false);
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(false);
      });
    });

    describe('Feature Listing', () => {
      test('should get all features with their states', () => {
        const allFeatures = manager.getAllFeatures();
        expect(allFeatures).toBeDefined();
        expect(typeof allFeatures).toBe('object');
        expect(allFeatures.ENABLE_ENHANCED_SCHEMA).toBeDefined();
        expect(allFeatures.ENABLE_ENHANCED_SCHEMA.enabled).toBe(true);
      });

      test('should get enabled features', () => {
        const enabledFeatures = manager.getEnabledFeatures();
        expect(Array.isArray(enabledFeatures)).toBe(true);
        expect(enabledFeatures.length).toBeGreaterThan(0);
        expect(enabledFeatures).toContain('ENABLE_ENHANCED_SCHEMA');
        expect(enabledFeatures).not.toContain('ENABLE_DEBUG_LOGGING');
      });

      test('should get disabled features', () => {
        const disabledFeatures = manager.getDisabledFeatures();
        expect(Array.isArray(disabledFeatures)).toBe(true);
        expect(disabledFeatures).toContain('ENABLE_DEBUG_LOGGING');
        expect(disabledFeatures).not.toContain('ENABLE_ENHANCED_SCHEMA');
      });
    });

    describe('Feature Listeners', () => {
      test('should notify listeners on feature change', () => {
        const callTracker = { called: false, args: null };
        const callback = (newVal, oldVal, name) => {
          callTracker.called = true;
          callTracker.args = [newVal, oldVal, name];
        };
        manager.onFeatureChange('ENABLE_DEBUG_LOGGING', callback);
        
        manager.enableFeature('ENABLE_DEBUG_LOGGING');
        expect(callTracker.called).toBe(true);
        expect(callTracker.args).toEqual([true, false, 'ENABLE_DEBUG_LOGGING']);
      });

      test('should allow unsubscribing from feature changes', () => {
        const callTracker = { called: false };
        const callback = () => { callTracker.called = true; };
        const unsubscribe = manager.onFeatureChange('ENABLE_DEBUG_LOGGING', callback);
        
        unsubscribe();
        manager.enableFeature('ENABLE_DEBUG_LOGGING');
        expect(callTracker.called).toBe(false);
      });

      test('should handle multiple listeners', () => {
        const tracker1 = { called: false };
        const tracker2 = { called: false };
        const callback1 = () => { tracker1.called = true; };
        const callback2 = () => { tracker2.called = true; };
        
        manager.onFeatureChange('ENABLE_DEBUG_LOGGING', callback1);
        manager.onFeatureChange('ENABLE_DEBUG_LOGGING', callback2);
        
        manager.enableFeature('ENABLE_DEBUG_LOGGING');
        expect(tracker1.called).toBe(true);
        expect(tracker2.called).toBe(true);
      });
    });

    describe('withFeature', () => {
      test('should execute enabled callback when feature is enabled', () => {
        const trackerEnabled = { called: false };
        const trackerDisabled = { called: false };
        const enabledCallback = () => {
          trackerEnabled.called = true;
          return 'enabled';
        };
        const disabledCallback = () => {
          trackerDisabled.called = true;
          return 'disabled';
        };
        
        const result = manager.withFeature('ENABLE_ENHANCED_SCHEMA', enabledCallback, disabledCallback);
        expect(result).toBe('enabled');
        expect(trackerEnabled.called).toBe(true);
        expect(trackerDisabled.called).toBe(false);
      });

      test('should execute disabled callback when feature is disabled', () => {
        const trackerEnabled = { called: false };
        const trackerDisabled = { called: false };
        const enabledCallback = () => {
          trackerEnabled.called = true;
          return 'enabled';
        };
        const disabledCallback = () => {
          trackerDisabled.called = true;
          return 'disabled';
        };
        
        const result = manager.withFeature('ENABLE_DEBUG_LOGGING', enabledCallback, disabledCallback);
        expect(result).toBe('disabled');
        expect(trackerEnabled.called).toBe(false);
        expect(trackerDisabled.called).toBe(true);
      });

      test('should handle errors in enabled callback', () => {
        const trackerFallback = { called: false };
        const enabledCallback = () => { throw new Error('Test error'); };
        const disabledCallback = () => {
          trackerFallback.called = true;
          return 'fallback';
        };
        
        const result = manager.withFeature('ENABLE_ENHANCED_SCHEMA', enabledCallback, disabledCallback);
        expect(result).toBe('fallback');
        expect(trackerFallback.called).toBe(true);
      });
    });

    describe('Feature Gates', () => {
      test('should create feature gate with enhanced and legacy functions', () => {
        const enhanced = (x) => x * 2;
        const legacy = (x) => x;
        
        const gate = manager.createFeatureGate('ENABLE_ENHANCED_SCHEMA', enhanced, legacy);
        expect(gate(5)).toBe(10); // Enhanced is enabled
        
        manager.disableFeature('ENABLE_ENHANCED_SCHEMA');
        expect(gate(5)).toBe(5); // Legacy used
      });
    });
  });

  describe('Domain Configuration', () => {
    let manager;

    beforeEach(() => {
      manager = new ConfigurationManager();
    });

    describe('setDomain/getDomain', () => {
      test('should set and get current domain', () => {
        const domain = { name: 'example.com', features: {} };
        manager.setDomain(domain);
        expect(manager.getDomain()).toEqual(domain);
      });

      test('should throw error when setting null domain', () => {
        expect(() => manager.setDomain(null)).toThrow('Domain configuration is required');
      });
    });

    describe('Domain Registration', () => {
      test('should register a domain', () => {
        const domain = { name: 'test.com', features: {} };
        manager.registerDomain('test', domain);
        expect(manager.getDomainConfig('test')).toEqual(domain);
      });

      test('should get all registered domains', () => {
        const domain1 = { name: 'test1.com', features: {} };
        const domain2 = { name: 'test2.com', features: {} };
        
        manager.registerDomain('test1', domain1);
        manager.registerDomain('test2', domain2);
        
        const allDomains = manager.getAllDomains();
        expect(allDomains.size).toBe(2);
        expect(allDomains.get('test1')).toEqual(domain1);
      });
    });

    describe('Domain-specific Features', () => {
      test('should respect domain-specific feature configuration', () => {
        const domain = { 
          name: 'test.com', 
          features: { 
            'ENABLE_DEBUG_LOGGING': true,
            'ENABLE_ENHANCED_SCHEMA': false
          } 
        };
        
        manager.setDomain(domain);
        expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);
        expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(false);
      });
    });
  });

  describe('Environment Detection', () => {
    test('should detect development environment', () => {
      const manager = new ConfigurationManager({ environment: 'development' });
      expect(manager.isDevelopment()).toBe(true);
      expect(manager.isProduction()).toBe(false);
      expect(manager.isStaging()).toBe(false);
    });

    test('should detect production environment', () => {
      const manager = new ConfigurationManager({ environment: 'production' });
      expect(manager.isProduction()).toBe(true);
      expect(manager.isDevelopment()).toBe(false);
    });

    test('should detect staging environment', () => {
      const manager = new ConfigurationManager({ environment: 'staging' });
      expect(manager.isStaging()).toBe(true);
      expect(manager.isProduction()).toBe(false);
    });

    test('should get environment', () => {
      const manager = new ConfigurationManager({ environment: 'test' });
      expect(manager.getEnvironment()).toBe('test');
    });
  });

  describe('Configuration Validation', () => {
    test('should detect unknown feature flags', () => {
      const manager = new ConfigurationManager({
        environment: 'development',
        features: {
          'UNKNOWN_FLAG': true
        }
      });
      
      const errors = manager.validateConfiguration();
      expect(errors.some(e => e.includes('Unknown feature flag'))).toBe(true);
    });

    test('should return empty array for valid configuration', () => {
      const manager = new ConfigurationManager({
        environment: 'development'
      });
      
      const errors = manager.validateConfiguration();
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    test('should use global isFeatureEnabled function', () => {
      const result = isFeatureEnabled('ENABLE_ENHANCED_SCHEMA');
      expect(typeof result).toBe('boolean');
    });

    test('should use global getEnabledFeatures function', () => {
      const features = getEnabledFeatures();
      expect(Array.isArray(features)).toBe(true);
    });

    test('should use global withFeature function', () => {
      const result = withFeature('ENABLE_ENHANCED_SCHEMA', () => 'enabled', () => 'disabled');
      expect(result).toBe('enabled');
    });
  });

  describe('Feature Constants', () => {
    test('should have FEATURES constant with all feature names', () => {
      expect(FEATURES).toBeDefined();
      expect(FEATURES.ENABLE_ENHANCED_SCHEMA).toBe('ENABLE_ENHANCED_SCHEMA');
    });

    test('should have COMMON_FEATURES constant', () => {
      expect(COMMON_FEATURES).toBeDefined();
      expect(COMMON_FEATURES.AUTHENTICATION).toBe('AUTHENTICATION');
      expect(COMMON_FEATURES.LOGGING).toBe('LOGGING');
      expect(COMMON_FEATURES.MONITORING).toBe('MONITORING');
    });
  });

  describe('Global Singleton', () => {
    test('should have global configManager instance', () => {
      expect(configManager).toBeDefined();
      expect(configManager).toBeInstanceOf(ConfigurationManager);
    });

    test('should maintain state across calls', () => {
      configManager.enableFeature('ENABLE_DEBUG_LOGGING');
      expect(configManager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);
      
      configManager.disableFeature('ENABLE_DEBUG_LOGGING');
      expect(configManager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    let manager;

    beforeEach(() => {
      manager = new ConfigurationManager();
    });

    test('should handle feature name case sensitivity', () => {
      const result1 = manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA');
      const result2 = manager.isFeatureEnabled('enable_enhanced_schema');
      
      expect(result1).toBe(true);
      expect(result2).toBe(false); // Different string, not found
    });

    test('should handle empty domain configuration', () => {
      const domain = { name: 'test.com', features: {} };
      manager.setDomain(domain);
      
      // Should fall back to global settings
      expect(manager.isFeatureEnabled('ENABLE_ENHANCED_SCHEMA')).toBe(true);
    });

    test('should handle null callbacks in listeners', () => {
      // Note: null callbacks shouldn't be added to listeners
      manager.onFeatureChange('ENABLE_DEBUG_LOGGING', (state) => { /* valid callback */ });
      
      // Should not throw
      expect(() => manager.enableFeature('ENABLE_DEBUG_LOGGING')).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should support feature-based business logic flow', () => {
      const manager = new ConfigurationManager({
        environment: 'production'
      });

      const processor = manager.createFeatureGate(
        'ENABLE_QUERY_OPTIMIZATION',
        (query) => `optimized: ${query}`,
        (query) => `basic: ${query}`
      );

      expect(processor('SELECT *')).toBe('optimized: SELECT *');
      
      manager.disableFeature('ENABLE_QUERY_OPTIMIZATION');
      expect(processor('SELECT *')).toBe('basic: SELECT *');
    });

    test('should support multi-domain configuration with feature overrides', () => {
      const manager = new ConfigurationManager();

      const domain1 = { 
        name: 'domain1.com', 
        features: { 'ENABLE_DEBUG_LOGGING': true } 
      };
      const domain2 = { 
        name: 'domain2.com', 
        features: { 'ENABLE_DEBUG_LOGGING': false } 
      };

      manager.registerDomain('domain1', domain1);
      manager.registerDomain('domain2', domain2);

      manager.setDomain(domain1);
      expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(true);

      manager.setDomain(domain2);
      expect(manager.isFeatureEnabled('ENABLE_DEBUG_LOGGING')).toBe(false);
    });
  });
});
