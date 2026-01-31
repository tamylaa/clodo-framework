/**
 * ConfigurationValidator Unit Tests
 *
 * Tests the ConfigurationValidator class for service config validation
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Set up module mocks before any imports
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn()
}));

// Now do the dynamic imports after mocking is set up
const { readFileSync } = await import('fs');
const { ConfigurationValidator } = await import('../../src/security/ConfigurationValidator.js');

// Preserve original static method so tests that mock it can be safely restored
const _originalParseWranglerToml = ConfigurationValidator.parseWranglerToml;

describe('ConfigurationValidator - Service Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore any accidental overrides of the static method
    ConfigurationValidator.parseWranglerToml = _originalParseWranglerToml;
  });

  describe('validateServiceConfig', () => {
    test('should pass validation when configs are consistent', () => {
      const manifest = {
        d1: true,
        kv: true,
        r2: false
      };

      const wranglerConfig = {
        d1_databases: [{ binding: 'DB' }],
        kv_namespaces: [{ binding: 'CACHE' }],
        r2_buckets: [],
        vars: {
          API_KEY: 'test-key'
        }
      };

      // Mock TOML parsing
      ConfigurationValidator.parseWranglerToml = jest.fn().mockReturnValue(wranglerConfig);

      readFileSync
        .mockReturnValueOnce(JSON.stringify(manifest))
        .mockReturnValueOnce('[d1_databases]\nbinding = "DB"\n\n[kv_namespaces]\nbinding = "CACHE"');

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should detect D1 inconsistency - manifest true, wrangler empty', () => {
      const manifest = { d1: true };
      const wranglerConfig = { d1_databases: [] };

      ConfigurationValidator.parseWranglerToml = jest.fn().mockReturnValue(wranglerConfig);

      readFileSync
        .mockReturnValueOnce(JSON.stringify(manifest))
        .mockReturnValueOnce('');

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('mismatch');
      expect(result.issues[0].message).toContain('Manifest declares D1=true but wrangler.toml has no');
    });

    test('should detect D1 inconsistency - manifest false, wrangler has config', () => {
      const manifest = { d1: false };
      const wranglerConfig = { d1_databases: [{ binding: 'DB' }] };

      ConfigurationValidator.parseWranglerToml = jest.fn().mockReturnValue(wranglerConfig);

      readFileSync
        .mockReturnValueOnce(JSON.stringify(manifest))
        .mockReturnValueOnce('[d1_databases]\nbinding = "DB"');

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('Manifest declares D1=false but wrangler.toml has');
    });

    test('should detect KV inconsistency', () => {
      const manifest = { kv: true };
      const wranglerConfig = { kv_namespaces: [] };

      ConfigurationValidator.parseWranglerToml = jest.fn().mockReturnValue(wranglerConfig);

      readFileSync
        .mockReturnValueOnce(JSON.stringify(manifest))
        .mockReturnValueOnce('');

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('KV=true but wrangler.toml has no');
    });

    test('should detect R2 inconsistency', () => {
      const manifest = { r2: true };
      const wranglerConfig = { r2_buckets: [] };

      ConfigurationValidator.parseWranglerToml = jest.fn().mockReturnValue(wranglerConfig);

      readFileSync
        .mockReturnValueOnce(JSON.stringify(manifest))
        .mockReturnValueOnce('');

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('R2=true but wrangler.toml has no');
    });

    test('should detect missing required environment variables', () => {
      const manifest = {
        environment: {
          API_KEY: 'required'
        }
      };
      const wranglerConfig = { vars: {} };

      ConfigurationValidator.parseWranglerToml = jest.fn().mockReturnValue(wranglerConfig);

      readFileSync
        .mockReturnValueOnce(JSON.stringify(manifest))
        .mockReturnValueOnce('[vars]');

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe('missing_env');
      expect(result.issues[0].message).toContain('API_KEY as required but not found');
    });

    test('should handle file read errors', () => {
      readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const result = ConfigurationValidator.validateServiceConfig('/path/manifest.json', '/path/wrangler.toml');

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('Configuration validation failed');
    });
  });

  describe('parseWranglerToml', () => {
    test('should parse basic TOML structure', () => {
      const toml = `
[d1_databases]
binding = "DB"

[kv_namespaces]
binding = "CACHE"

[r2_buckets]
binding = "STORAGE"

[vars]
API_KEY = "test-key"
DEBUG = true
      `;

      const result = ConfigurationValidator.parseWranglerToml(toml);

      expect(result.d1_databases).toHaveLength(1);
      expect(result.d1_databases[0].binding).toBe('DB');
      expect(result.kv_namespaces).toHaveLength(1);
      expect(result.kv_namespaces[0].binding).toBe('CACHE');
      expect(result.r2_buckets).toHaveLength(1);
      expect(result.r2_buckets[0].binding).toBe('STORAGE');
      expect(result.vars.API_KEY).toBe('test-key');
      expect(result.vars.DEBUG).toBe('true');
    });

    test('should handle array syntax for bindings', () => {
      const toml = `
[[d1_databases]]
binding = "DB1"

[[d1_databases]]
binding = "DB2"

[[kv_namespaces]]
binding = "CACHE1"
      `;

      const result = ConfigurationValidator.parseWranglerToml(toml);

      expect(result.d1_databases).toHaveLength(2);
      expect(result.d1_databases[0].binding).toBe('DB1');
      expect(result.d1_databases[1].binding).toBe('DB2');
      expect(result.kv_namespaces).toHaveLength(1);
      expect(result.kv_namespaces[0].binding).toBe('CACHE1');
    });

    test('should handle empty TOML', () => {
      const result = ConfigurationValidator.parseWranglerToml('');

      expect(result.d1_databases).toEqual([]);
      expect(result.kv_namespaces).toEqual([]);
      expect(result.r2_buckets).toEqual([]);
      expect(result.vars).toEqual({});
    });
  });

  describe('validateD1Consistency', () => {
    test('should pass when both manifest and wrangler agree on D1', () => {
      const issues = [];
      ConfigurationValidator.validateD1Consistency({ d1: true }, { d1_databases: [{}] }, issues);
      ConfigurationValidator.validateD1Consistency({ d1: false }, { d1_databases: [] }, issues);

      expect(issues).toHaveLength(0);
    });

    test('should detect inconsistency', () => {
      const issues = [];
      ConfigurationValidator.validateD1Consistency({ d1: true }, { d1_databases: [] }, issues);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('critical');
    });
  });

  describe('validateKVConsistency', () => {
    test('should pass when consistent', () => {
      const issues = [];
      ConfigurationValidator.validateKVConsistency({ kv: true }, { kv_namespaces: [{}] }, issues);

      expect(issues).toHaveLength(0);
    });

    test('should detect inconsistency', () => {
      const issues = [];
      ConfigurationValidator.validateKVConsistency({ kv: true }, { kv_namespaces: [] }, issues);

      expect(issues).toHaveLength(1);
    });
  });

  describe('validateR2Consistency', () => {
    test('should pass when consistent', () => {
      const issues = [];
      ConfigurationValidator.validateR2Consistency({ r2: true }, { r2_buckets: [{}] }, issues);

      expect(issues).toHaveLength(0);
    });

    test('should detect inconsistency', () => {
      const issues = [];
      ConfigurationValidator.validateR2Consistency({ r2: true }, { r2_buckets: [] }, issues);

      expect(issues).toHaveLength(1);
    });
  });

  describe('validateEnvironmentConsistency', () => {
    test('should pass when required vars are present', () => {
      const issues = [];
      ConfigurationValidator.validateEnvironmentConsistency(
        { environment: { API_KEY: 'required' } },
        { vars: { API_KEY: 'value' } },
        issues
      );

      expect(issues).toHaveLength(0);
    });

    test('should detect missing required vars', () => {
      const issues = [];
      ConfigurationValidator.validateEnvironmentConsistency(
        { environment: { API_KEY: 'required' } },
        { vars: {} },
        issues
      );

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
    });
  });
});