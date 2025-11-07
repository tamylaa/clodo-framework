/**
 * ConfigLoader Tests
 * Comprehensive test suite for configuration loading and merging
 * Tests: loading, validation, merging, env substitution, safe loading, and error handling
 */

import { ConfigLoader } from '../../../lib/shared/utils/config-loader.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigLoader', () => {
  let configLoader;
  let testDir;
  let testConfigFile;

  beforeEach(() => {
    configLoader = new ConfigLoader({ verbose: false, quiet: true, json: false });
    testDir = join(tmpdir(), 'clodo-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    testConfigFile = join(testDir, 'test-config.json');
  });

  afterEach(() => {
    // Cleanup test files
    try {
      const fs = require('fs');
      if (fs.existsSync(testConfigFile)) {
        unlinkSync(testConfigFile);
      }
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('creates instance with default options', () => {
      const loader = new ConfigLoader();
      expect(loader).toBeDefined();
      expect(loader.verbose).toBe(false);
      expect(loader.quiet).toBe(false);
      expect(loader.json).toBe(false);
    });

    test('creates instance with custom options', () => {
      const loader = new ConfigLoader({ verbose: true, quiet: false, json: true });
      expect(loader.verbose).toBe(true);
      expect(loader.quiet).toBe(false);
      expect(loader.json).toBe(true);
    });
  });

  describe('load()', () => {
    test('loads valid JSON configuration file', () => {
      const config = { name: 'test', port: 8080 };
      writeFileSync(testConfigFile, JSON.stringify(config));

      const loaded = configLoader.load(testConfigFile);
      expect(loaded).toEqual(config);
      expect(loaded.name).toBe('test');
      expect(loaded.port).toBe(8080);
    });

    test('loads complex nested configuration', () => {
      const config = {
        server: {
          host: 'localhost',
          port: 3000,
          ssl: {
            enabled: true,
            cert: '/path/to/cert'
          }
        },
        database: {
          url: 'mongodb://localhost',
          options: { retries: 3 }
        }
      };
      writeFileSync(testConfigFile, JSON.stringify(config));

      const loaded = configLoader.load(testConfigFile);
      expect(loaded.server.host).toBe('localhost');
      expect(loaded.server.ssl.enabled).toBe(true);
      expect(loaded.database.options.retries).toBe(3);
    });

    test('throws error when file not found', () => {
      expect(() => {
        configLoader.load('/nonexistent/path/config.json');
      }).toThrow('Configuration file not found');
    });

    test('throws error when JSON is invalid', () => {
      writeFileSync(testConfigFile, 'invalid json {');

      expect(() => {
        configLoader.load(testConfigFile);
      }).toThrow('Invalid JSON');
    });

    test('validates required fields when specified', () => {
      const config = { name: 'test' };
      writeFileSync(testConfigFile, JSON.stringify(config));

      expect(() => {
        configLoader.load(testConfigFile, ['name', 'port']);
      }).toThrow('Configuration validation failed');
    });

    test('passes validation when all required fields present', () => {
      const config = { name: 'test', port: 8080, token: 'abc123' };
      writeFileSync(testConfigFile, JSON.stringify(config));

      const loaded = configLoader.load(testConfigFile, ['name', 'port', 'token']);
      expect(loaded).toEqual(config);
    });

    test('resolves relative paths correctly', () => {
      const config = { data: 'value' };
      writeFileSync(testConfigFile, JSON.stringify(config));

      const relativePath = testConfigFile.replace(process.cwd(), '.');
      const loaded = configLoader.load(testConfigFile);
      expect(loaded.data).toBe('value');
    });
  });

  describe('loadSafe()', () => {
    test('loads valid configuration without throwing', () => {
      const config = { name: 'test' };
      writeFileSync(testConfigFile, JSON.stringify(config));

      const loaded = configLoader.loadSafe(testConfigFile);
      expect(loaded).toEqual(config);
    });

    test('returns default when file not found', () => {
      const defaultConfig = { name: 'default', port: 3000 };
      const loaded = configLoader.loadSafe('/nonexistent/file.json', defaultConfig);
      expect(loaded).toEqual(defaultConfig);
    });

    test('returns default when JSON is invalid', () => {
      writeFileSync(testConfigFile, 'invalid json');
      const defaultConfig = { name: 'default' };

      const loaded = configLoader.loadSafe(testConfigFile, defaultConfig);
      expect(loaded).toEqual(defaultConfig);
    });

    test('returns empty object when no default provided and file missing', () => {
      const loaded = configLoader.loadSafe('/nonexistent/file.json');
      expect(loaded).toEqual({});
    });
  });

  describe('validate()', () => {
    test('returns valid result for complete configuration', () => {
      const config = { name: 'test', port: 8080 };
      const result = configLoader.validate(config, ['name', 'port']);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('returns invalid result with errors when fields missing', () => {
      const config = { name: 'test' };

      expect(() => {
        configLoader.validate(config, ['name', 'port', 'token']);
      }).toThrow('Configuration validation failed');
    });

    test('throws error when config is not an object', () => {
      const result = configLoader.validate(null, ['field']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must be an object');
    });

    test('throws error with all missing fields listed', () => {
      const config = {};

      expect(() => {
        configLoader.validate(config, ['port', 'host', 'token']);
      }).toThrow(/Configuration validation failed/);
    });

    test('validates against empty required fields list', () => {
      const config = { any: 'value' };
      const result = configLoader.validate(config, []);
      expect(result.valid).toBe(true);
    });
  });

  describe('merge()', () => {
    test('merges config file with CLI options (CLI takes precedence)', () => {
      const fileConfig = { name: 'from-file', port: 3000, timeout: 5000 };
      const cliOptions = { port: 8080, verbose: true };

      const merged = configLoader.merge(fileConfig, cliOptions);
      expect(merged.name).toBe('from-file');
      expect(merged.port).toBe(8080); // CLI override
      expect(merged.timeout).toBe(5000);
      expect(merged.verbose).toBe(true);
    });

    test('ignores undefined/null/empty CLI options', () => {
      const fileConfig = { name: 'test', port: 3000 };
      const cliOptions = { port: undefined, token: null, debug: '' };

      const merged = configLoader.merge(fileConfig, cliOptions);
      expect(merged.name).toBe('test');
      expect(merged.port).toBe(3000);
      expect(merged.token).toBeUndefined();
      expect(merged.debug).toBeUndefined();
    });

    test('returns file config when CLI options are empty', () => {
      const fileConfig = { name: 'test', port: 3000 };

      const merged = configLoader.merge(fileConfig, {});
      expect(merged).toEqual(fileConfig);
    });

    test('returns CLI options when file config is empty', () => {
      const cliOptions = { name: 'cli-test', port: 8080 };

      const merged = configLoader.merge({}, cliOptions);
      expect(merged).toEqual(cliOptions);
    });

    test('handles null inputs gracefully', () => {
      expect(configLoader.merge(null, { port: 3000 })).toEqual({ port: 3000 });
      expect(configLoader.merge({ port: 3000 }, null)).toEqual({ port: 3000 });
      expect(configLoader.merge(null, null)).toEqual({});
    });

    test('preserves complex nested objects', () => {
      const fileConfig = {
        server: { host: 'localhost', port: 3000, ssl: { cert: 'path' } },
        timeout: 5000
      };
      const cliOptions = { port: 8080, verbose: true };

      const merged = configLoader.merge(fileConfig, cliOptions);
      expect(merged.server.host).toBe('localhost');
      expect(merged.server.port).toBe(3000); // File value, not overridden
      expect(merged.server.ssl.cert).toBe('path');
      expect(merged.timeout).toBe(5000); // File value
      expect(merged.port).toBe(8080); // CLI override
      expect(merged.verbose).toBe(true); // CLI value
    });
  });

  describe('substituteEnvironmentVariables()', () => {
    beforeEach(() => {
      process.env.TEST_VAR = 'test-value';
      process.env.API_KEY = 'secret-key-123';
      process.env.PORT = '9000';
    });

    afterEach(() => {
      delete process.env.TEST_VAR;
      delete process.env.API_KEY;
      delete process.env.PORT;
    });

    test('substitutes single environment variable', () => {
      const config = { value: 'prefix-${TEST_VAR}-suffix' };
      const result = configLoader.substituteEnvironmentVariables(config);
      expect(result.value).toBe('prefix-test-value-suffix');
    });

    test('substitutes multiple environment variables', () => {
      const config = { url: 'https://${API_KEY}@api.example.com:${PORT}' };
      const result = configLoader.substituteEnvironmentVariables(config);
      expect(result.url).toBe('https://secret-key-123@api.example.com:9000');
    });

    test('substitutes in nested objects', () => {
      const config = {
        server: {
          url: 'https://server.com:${PORT}',
          token: '${API_KEY}'
        }
      };
      const result = configLoader.substituteEnvironmentVariables(config);
      expect(result.server.url).toBe('https://server.com:9000');
      expect(result.server.token).toBe('secret-key-123');
    });

    test('leaves unset variables unchanged', () => {
      const config = { value: '${UNSET_VAR}' };
      const result = configLoader.substituteEnvironmentVariables(config);
      expect(result.value).toBe('${UNSET_VAR}');
    });

    test('does not substitute non-string values', () => {
      const config = { port: 3000, flag: true };
      const result = configLoader.substituteEnvironmentVariables(config);
      expect(result.port).toBe(3000);
      expect(result.flag).toBe(true);
    });

    test('preserves original config (deep copy)', () => {
      const config = { value: '${TEST_VAR}' };
      configLoader.substituteEnvironmentVariables(config);
      expect(config.value).toBe('${TEST_VAR}');
    });
  });

  describe('get()', () => {
    const config = {
      server: {
        host: 'localhost',
        port: 3000,
        ssl: {
          enabled: true
        }
      },
      database: {
        url: 'mongodb://localhost'
      }
    };

    test('gets top-level value', () => {
      expect(configLoader.get(config, 'server')).toEqual(config.server);
    });

    test('gets nested value with dot notation', () => {
      expect(configLoader.get(config, 'server.host')).toBe('localhost');
      expect(configLoader.get(config, 'server.port')).toBe(3000);
      expect(configLoader.get(config, 'server.ssl.enabled')).toBe(true);
    });

    test('returns default when path not found', () => {
      expect(configLoader.get(config, 'nonexistent', 'default')).toBe('default');
      expect(configLoader.get(config, 'server.nonexistent', 'default')).toBe('default');
      expect(configLoader.get(config, 'a.b.c', 'default')).toBe('default');
    });

    test('returns null as default when not specified', () => {
      expect(configLoader.get(config, 'nonexistent')).toBeNull();
    });

    test('handles null config gracefully', () => {
      expect(configLoader.get(null, 'any.path', 'default')).toBe('default');
    });
  });

  describe('getAll()', () => {
    test('flattens single-level configuration', () => {
      const config = { name: 'test', port: 3000 };
      const flat = configLoader.getAll(config);

      expect(flat).toEqual({
        name: 'test',
        port: 3000
      });
    });

    test('flattens nested configuration with dot notation', () => {
      const config = {
        server: {
          host: 'localhost',
          port: 3000,
          ssl: {
            enabled: true,
            cert: 'path'
          }
        }
      };
      const flat = configLoader.getAll(config);

      expect(flat['server.host']).toBe('localhost');
      expect(flat['server.port']).toBe(3000);
      expect(flat['server.ssl.enabled']).toBe(true);
      expect(flat['server.ssl.cert']).toBe('path');
    });

    test('includes array values', () => {
      const config = {
        services: ['api', 'db', 'cache'],
        options: { retries: 3 }
      };
      const flat = configLoader.getAll(config);

      expect(flat.services).toEqual(['api', 'db', 'cache']);
      expect(flat['options.retries']).toBe(3);
    });

    test('handles empty configuration', () => {
      const flat = configLoader.getAll({});
      expect(flat).toEqual({});
    });

    test('handles null configuration', () => {
      const flat = configLoader.getAll(null);
      expect(flat).toEqual({});
    });
  });

  describe('loadMultiple()', () => {
    test('loads and merges multiple configuration files', () => {
      const config1 = { name: 'config1', value1: 'a' };
      const config2 = { name: 'config2', value2: 'b' };

      const file1 = join(testDir, 'config1.json');
      const file2 = join(testDir, 'config2.json');

      writeFileSync(file1, JSON.stringify(config1));
      writeFileSync(file2, JSON.stringify(config2));

      const merged = configLoader.loadMultiple([file1, file2]);
      expect(merged.name).toBe('config2'); // Later file overrides
      expect(merged.value1).toBe('a');
      expect(merged.value2).toBe('b');
    });

    test('merges with default configuration', () => {
      const defaultConfig = { name: 'default', level: 0 };
      const config1 = { name: 'loaded', value: 'test' };

      const file1 = join(testDir, 'config.json');
      writeFileSync(file1, JSON.stringify(config1));

      const merged = configLoader.loadMultiple([file1], defaultConfig);
      expect(merged.name).toBe('loaded');
      expect(merged.level).toBe(0);
      expect(merged.value).toBe('test');
    });

    test('continues loading remaining files if one fails', () => {
      const config1 = { value1: 'a' };
      const config2 = { value2: 'b' };

      const file1 = join(testDir, 'config1.json');
      const file2 = join(testDir, 'config2.json');

      writeFileSync(file1, JSON.stringify(config1));
      writeFileSync(file2, JSON.stringify(config2));

      const merged = configLoader.loadMultiple([
        '/nonexistent/file.json',
        file1,
        file2
      ]);

      expect(merged.value1).toBe('a');
      expect(merged.value2).toBe('b');
    });
  });

  describe('redactSensitive()', () => {
    test('redacts sensitive fields by default', () => {
      const config = {
        name: 'test',
        token: 'secret-token',
        password: 'my-password',
        apiKey: 'api-key-123'
      };

      const redacted = configLoader.redactSensitive(config);
      expect(redacted.name).toBe('test');
      expect(redacted.token).toBe('***REDACTED***');
      expect(redacted.password).toBe('***REDACTED***');
      expect(redacted.apiKey).toBe('***REDACTED***');
    });

    test('redacts in nested objects', () => {
      const config = {
        server: {
          host: 'localhost',
          secret: 'secret-123'
        },
        auth: {
          token: 'auth-token'
        }
      };

      const redacted = configLoader.redactSensitive(config);
      expect(redacted.server.host).toBe('localhost');
      expect(redacted.server.secret).toBe('***REDACTED***');
      expect(redacted.auth.token).toBe('***REDACTED***');
    });

    test('redacts custom sensitive fields', () => {
      const config = {
        username: 'user',
        email: 'user@example.com',
        creditCard: '1234-5678'
      };

      const redacted = configLoader.redactSensitive(config, ['email', 'creditCard']);
      expect(redacted.username).toBe('user');
      expect(redacted.email).toBe('***REDACTED***');
      expect(redacted.creditCard).toBe('***REDACTED***');
    });

    test('preserves original configuration', () => {
      const config = { token: 'secret', value: 'public' };
      configLoader.redactSensitive(config);

      expect(config.token).toBe('secret');
      expect(config.value).toBe('public');
    });

    test('handles case-insensitive field matching', () => {
      const config = {
        TOKEN: 'secret1',
        Token: 'secret2',
        token: 'secret3'
      };

      const redacted = configLoader.redactSensitive(config);
      expect(redacted.TOKEN).toBe('***REDACTED***');
      expect(redacted.Token).toBe('***REDACTED***');
      expect(redacted.token).toBe('***REDACTED***');
    });
  });

  describe('integration', () => {
    test('full workflow: load, validate, substitute, merge, redact', () => {
      process.env.DB_URL = 'mongodb://localhost:27017';

      const configData = {
        name: 'app',
        database: {
          url: '${DB_URL}',
          password: 'db-secret'
        },
        server: {
          port: 3000
        }
      };

      writeFileSync(testConfigFile, JSON.stringify(configData));

      // Load and validate
      const loaded = configLoader.load(testConfigFile, ['name', 'database', 'server']);

      // Substitute env vars
      const substituted = configLoader.substituteEnvironmentVariables(loaded);
      expect(substituted.database.url).toBe('mongodb://localhost:27017');

      // Merge with CLI options
      const cliOptions = { server: { port: 8080 }, verbose: true };
      const merged = configLoader.merge(substituted, cliOptions);
      expect(merged.server.port).toBe(8080);
      expect(merged.verbose).toBe(true);

      // Redact sensitive
      const redacted = configLoader.redactSensitive(merged);
      expect(redacted.database.password).toBe('***REDACTED***');
      expect(redacted.name).toBe('app');

      delete process.env.DB_URL;
    });
  });
});
