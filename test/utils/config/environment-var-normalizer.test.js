#!/usr/bin/env node

/**
 * EnvironmentVarNormalizer Tests
 * Tests the standardization of service environment variable formats
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnvironmentVarNormalizer } from '../../../src/utils/config/environment-var-normalizer.js';

// Capture console output for testing warnings
let consoleWarnSpy;
let warnedMessages = [];

describe('EnvironmentVarNormalizer', () => {
  beforeEach(() => {
    warnedMessages = [];
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((msg) => {
      warnedMessages.push(msg);
    });
  });

  afterEach(() => {
    if (consoleWarnSpy) {
      consoleWarnSpy.mockRestore();
    }
  });

  describe('normalize() - Flat Format (Recommended)', () => {
    test('should preserve flat format without warnings', () => {
      const service = {
        name: 'api-service',
        vars: {
          API_KEY: 'test-key',
          DEBUG: 'true'
        },
        secrets: ['DB_PASSWORD']
      };

      const result = EnvironmentVarNormalizer.normalize(service);

      expect(result.vars).toEqual({
        API_KEY: 'test-key',
        DEBUG: 'true'
      });
      expect(result.secrets).toEqual(['DB_PASSWORD']);
      expect(result._normalizationInfo.formatDetected).toBe('flat');
      expect(result._normalizationInfo.deprecatedFormatsFound).toHaveLength(0);
      expect(result._normalizationInfo.warnings).toHaveLength(0);
      expect(warnedMessages).toHaveLength(0);
    });

    test('should handle empty vars gracefully', () => {
      const service = {
        name: 'minimal-service',
        vars: {}
      };

      const result = EnvironmentVarNormalizer.normalize(service);

      expect(result.vars).toEqual({});
      expect(result.secrets).toEqual([]);
    });
  });

  describe('normalize() - Nested Format (Deprecated)', () => {
    test('should extract vars from nested environment structure', () => {
      const service = {
        name: 'api-service',
        environment: {
          vars: {
            API_KEY: 'test-key',
            DEBUG: 'true'
          },
          secrets: ['DB_PASSWORD', 'JWT_SECRET']
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(result.vars).toEqual({
        API_KEY: 'test-key',
        DEBUG: 'true'
      });
      expect(result.secrets).toEqual(['DB_PASSWORD', 'JWT_SECRET']);
      expect(result._normalizationInfo.formatDetected).toBe('nested');
      expect(result._normalizationInfo.deprecatedFormatsFound).toContain('nested');
      expect(result.environment).toBeUndefined();
    });

    test('should emit deprecation warning for nested format', () => {
      const service = {
        name: 'legacy-service',
        environment: {
          vars: { API_KEY: 'value' }
        }
      };

      EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: true });

      expect(warnedMessages.length).toBeGreaterThan(0);
      expect(warnedMessages[0]).toContain('DEPRECATION');
      expect(warnedMessages[0]).toContain('nested format');
      expect(warnedMessages[0]).toContain('v5.0.0');
    });

    test('should skip warning if warnOnDeprecated is false', () => {
      const service = {
        name: 'legacy-service',
        environment: {
          vars: { API_KEY: 'value' }
        }
      };

      EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(warnedMessages).toHaveLength(0);
    });
  });

  describe('normalize() - Per-Environment Format (Deprecated)', () => {
    test('should merge vars from all environments', () => {
      const service = {
        name: 'multi-env-service',
        env: {
          production: {
            vars: { API_KEY: 'prod-key', DEBUG: 'false' }
          },
          staging: {
            vars: { API_KEY: 'staging-key', DEBUG: 'true' }
          }
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      // Staging overwrites production since it comes later
      expect(result.vars).toEqual({
        API_KEY: 'staging-key',
        DEBUG: 'true'
      });
      expect(result._normalizationInfo.formatDetected).toBe('per-environment');
      expect(result._normalizationInfo.deprecatedFormatsFound).toContain('per-environment');
    });

    test('should emit deprecation warning for per-environment format', () => {
      const service = {
        name: 'per-env-service',
        env: {
          production: { vars: { API_KEY: 'value' } }
        }
      };

      EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: true });

      expect(warnedMessages.length).toBeGreaterThan(0);
      expect(warnedMessages[0]).toContain('DEPRECATION');
      expect(warnedMessages[0]).toContain('per-environment format');
    });

    test('should preserve other env properties when removing vars', () => {
      const service = {
        name: 'multi-env-service',
        env: {
          production: {
            name: 'prod-worker',
            vars: { API_KEY: 'value' },
            routes: ['example.com/*']
          }
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(result.env.production.name).toBe('prod-worker');
      expect(result.env.production.routes).toEqual(['example.com/*']);
      expect(result.env.production.vars).toBeUndefined();
    });
  });

  describe('normalize() - Multiple Format Conflicts', () => {
    test('should detect when multiple formats are used', () => {
      const service = {
        name: 'conflicted-service',
        vars: { FLAT_VAR: 'value' },
        environment: {
          vars: { NESTED_VAR: 'value' }
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(result._normalizationInfo.deprecatedFormatsFound).toContain('nested');
      expect(result._normalizationInfo.warnings.length).toBeGreaterThan(0);
      expect(result._normalizationInfo.warnings[0]).toContain('multiple var formats');
    });

    test('should throw on conflict when throwOnConflict is true', () => {
      const service = {
        name: 'conflicted-service',
        vars: { FLAT_VAR: 'value' },
        environment: {
          vars: { NESTED_VAR: 'value' }
        }
      };

      expect(() => {
        EnvironmentVarNormalizer.normalize(service, { throwOnConflict: true });
      }).toThrow('conflicting var formats');
    });

    test('should merge all vars when multiple formats present', () => {
      const service = {
        name: 'multi-format-service',
        vars: { FLAT_VAR: 'flat-value' },
        environment: {
          vars: { NESTED_VAR: 'nested-value' }
        },
        env: {
          production: {
            vars: { ENV_VAR: 'env-value' }
          }
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(result.vars).toEqual({
        FLAT_VAR: 'flat-value',
        NESTED_VAR: 'nested-value',
        ENV_VAR: 'env-value'
      });
    });
  });

  describe('validateNamingConventions()', () => {
    test('should accept valid SCREAMING_SNAKE_CASE names', () => {
      const vars = {
        API_KEY: 'value',
        DATABASE_URL: 'value',
        _PRIVATE: 'value',
        VAR_123: 'value'
      };

      const result = EnvironmentVarNormalizer.validateNamingConventions(vars);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should reject variables with hyphens', () => {
      const vars = {
        'API-KEY': 'value'
      };

      const result = EnvironmentVarNormalizer.validateNamingConventions(vars);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].issue).toContain('Hyphens');
    });

    test('should reject variables with dots', () => {
      const vars = {
        'API.KEY': 'value'
      };

      const result = EnvironmentVarNormalizer.validateNamingConventions(vars);

      expect(result.valid).toBe(false);
      expect(result.issues[0].issue).toContain('Dots');
    });

    test('should warn about non-SCREAMING_SNAKE_CASE names', () => {
      const vars = {
        'api_key': 'value', // lowercase
        'ApiKey': 'value'   // camelCase
      };

      const result = EnvironmentVarNormalizer.validateNamingConventions(vars);

      expect(result.valid).toBe(true); // Warning level
      expect(result.issues.length).toBe(2);
      expect(result.issues.every(i => i.severity === 'warning')).toBe(true);
    });
  });

  describe('getDeprecationTimeline()', () => {
    test('should return timeline for current version', () => {
      const timeline = EnvironmentVarNormalizer.getDeprecationTimeline('4.4.1');

      expect(timeline.current.version).toBe('4.4.1');
      expect(timeline.v4_5_0).toBeDefined();
      expect(timeline.v5_0_0).toBeDefined();
      expect(timeline.v5_0_0.status).toContain('REMOVAL');
    });

    test('should have consistent timeline across calls', () => {
      const timeline1 = EnvironmentVarNormalizer.getDeprecationTimeline();
      const timeline2 = EnvironmentVarNormalizer.getDeprecationTimeline();

      expect(timeline1.v5_0_0.eta).toBe(timeline2.v5_0_0.eta);
    });
  });

  describe('Integration: Real-world service configs', () => {
    test('should handle wrangler-style configuration', () => {
      const service = {
        name: 'my-worker',
        main: 'src/index.js',
        vars: {
          ENVIRONMENT: 'production',
          LOG_LEVEL: 'info'
        },
        env: {
          staging: {
            name: 'my-worker-staging',
            vars: {
              LOG_LEVEL: 'debug'
            }
          }
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(result.vars.ENVIRONMENT).toBe('production');
      expect(result.vars.LOG_LEVEL).toBe('debug');
      expect(result.main).toBe('src/index.js');
    });

    test('should handle service with no vars defined', () => {
      const service = {
        name: 'simple-service',
        description: 'A simple service'
      };

      const result = EnvironmentVarNormalizer.normalize(service);

      expect(result.vars).toEqual({});
      expect(result.secrets).toEqual([]);
      expect(result._normalizationInfo.formatDetected).toBeNull();
    });

    test('should preserve all service properties during normalization', () => {
      const service = {
        name: 'complete-service',
        description: 'A complete service',
        version: '1.0.0',
        vars: { API_KEY: 'value' },
        custom_field: 'should-be-preserved',
        environment: {
          vars: { EXTRA_VAR: 'value' }
        }
      };

      const result = EnvironmentVarNormalizer.normalize(service, { warnOnDeprecated: false });

      expect(result.name).toBe('complete-service');
      expect(result.description).toBe('A complete service');
      expect(result.version).toBe('1.0.0');
      expect(result.custom_field).toBe('should-be-preserved');
    });
  });
});
