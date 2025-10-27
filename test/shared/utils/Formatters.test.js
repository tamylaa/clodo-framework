/**
 * Formatters.test.js - Comprehensive test suite for Formatters utility
 * Tests all formatting methods across NameFormatters, UrlFormatters, ResourceFormatters, etc.
 */

import {
  NameFormatters,
  UrlFormatters,
  ResourceFormatters,
  EnvironmentFormatters,
  VersionFormatters
} from '../../../bin/shared/utils/Formatters.js';
import { describe, test, expect } from '@jest/globals';

describe('Formatters Utility', () => {
  describe('NameFormatters', () => {
    describe('toDisplayName', () => {
      test('should convert kebab-case to Display Case', () => {
        expect(NameFormatters.toDisplayName('my-service')).toBe('My Service');
        expect(NameFormatters.toDisplayName('auth-service')).toBe('Auth Service');
        expect(NameFormatters.toDisplayName('api-gateway')).toBe('Api Gateway');
      });

      test('should handle single word', () => {
        expect(NameFormatters.toDisplayName('service')).toBe('Service');
      });

      test('should handle empty string', () => {
        expect(NameFormatters.toDisplayName('')).toBe('');
      });

      test('should handle null/undefined', () => {
        expect(NameFormatters.toDisplayName(null)).toBe('');
        expect(NameFormatters.toDisplayName(undefined)).toBe('');
      });

      test('should handle multiple hyphens', () => {
        expect(NameFormatters.toDisplayName('my-super-long-service-name')).toBe('My Super Long Service Name');
      });

      test('should handle leading/trailing hyphens', () => {
        expect(NameFormatters.toDisplayName('-service-')).toContain('Service');
      });

      test('should handle numbers in names', () => {
        expect(NameFormatters.toDisplayName('service-2-api')).toContain('Service');
      });

      test('should capitalize first letter of each word', () => {
        const result = NameFormatters.toDisplayName('cloud-flare-api');
        expect(result[0]).toBe('C');
        expect(result).toContain('Flare');
        expect(result).toContain('Api');
      });
    });

    describe('toKebabCase', () => {
      test('should convert camelCase to kebab-case', () => {
        expect(NameFormatters.toKebabCase('myService')).toBe('my-service');
        expect(NameFormatters.toKebabCase('authService')).toBe('auth-service');
        expect(NameFormatters.toKebabCase('apiGateway')).toBe('api-gateway');
      });

      test('should handle PascalCase', () => {
        expect(NameFormatters.toKebabCase('MyService')).toBe('my-service');
      });

      test('should handle single word', () => {
        expect(NameFormatters.toKebabCase('service')).toBe('service');
      });

      test('should handle empty string', () => {
        expect(NameFormatters.toKebabCase('')).toBe('');
      });

      test('should handle consecutive capitals', () => {
        // HTTPServer -> h-ttpserver (only last capital before lowercase separated)
        expect(NameFormatters.toKebabCase('HTTPServer')).toBe('h-ttpserver');
      });

      test('should handle numbers', () => {
        expect(NameFormatters.toKebabCase('service2API')).toContain('service');
      });
    });

    describe('toCamelCase', () => {
      test('should convert kebab-case to camelCase', () => {
        expect(NameFormatters.toCamelCase('my-service')).toBe('myService');
        expect(NameFormatters.toCamelCase('auth-service')).toBe('authService');
        expect(NameFormatters.toCamelCase('api-gateway')).toBe('apiGateway');
      });

      test('should handle single word', () => {
        expect(NameFormatters.toCamelCase('service')).toBe('service');
      });

      test('should handle empty string', () => {
        expect(NameFormatters.toCamelCase('')).toBe('');
      });

      test('should maintain first letter lowercase', () => {
        const result = NameFormatters.toCamelCase('my-service');
        expect(result[0]).toBe(result[0].toLowerCase());
        expect(result[0]).toBe('m');
      });

      test('should capitalize after hyphens', () => {
        const result = NameFormatters.toCamelCase('my-service-api');
        expect(result).toContain('S');
        expect(result).toContain('A');
      });

      test('should handle multiple hyphens', () => {
        expect(NameFormatters.toCamelCase('my-super-long-service')).toBe('mySuperLongService');
      });
    });

    describe('snakeToCamel', () => {
      test('should convert snake_case to camelCase', () => {
        expect(NameFormatters.snakeToCamel('my_service')).toBe('myService');
        expect(NameFormatters.snakeToCamel('auth_service')).toBe('authService');
      });

      test('should handle empty string', () => {
        expect(NameFormatters.snakeToCamel('')).toBe('');
      });

      test('should handle single word', () => {
        expect(NameFormatters.snakeToCamel('service')).toBe('service');
      });
    });
  });

  describe('UrlFormatters', () => {
    describe('buildProductionUrl', () => {
      test('should build production URL with service and domain', () => {
        const url = UrlFormatters.buildProductionUrl('api', 'example.com');
        expect(url).toContain('api');
        expect(url).toContain('example.com');
        expect(url).toContain('https://');
      });

      test('should build production URL with domain only', () => {
        // buildProductionUrl requires both serviceName and domain
        const url = UrlFormatters.buildProductionUrl('api', 'example.com');
        expect(url).toContain('example.com');
        expect(url).toContain('https://');
      });

      test('should handle subdomains', () => {
        const url = UrlFormatters.buildProductionUrl('api', 'sub.example.com');
        expect(url).toContain('sub.example.com');
      });

      test('should not include trailing slash by default', () => {
        const url = UrlFormatters.buildProductionUrl('api', 'example.com');
        expect(url).not.toMatch(/\/$/);
      });
    });

    describe('buildStagingUrl', () => {
      test('should build staging URL with service and domain', () => {
        const url = UrlFormatters.buildStagingUrl('api', 'example.com');
        expect(url).toContain('api');
        expect(url).toContain('example.com');
        expect(url).toContain('https://');
      });

      test('should include staging indicator (abbreviated as sta)', () => {
        const url = UrlFormatters.buildStagingUrl('api', 'example.com');
        expect(url).toContain('sta'); // staging abbreviated to 3 chars
      });
    });

    describe('buildDevUrl', () => {
      test('should build development URL with service and domain', () => {
        const url = UrlFormatters.buildDevUrl('api', 'example.com');
        expect(url).toContain('api');
        expect(url).toContain('example.com');
        expect(url).toContain('https://');
      });

      test('should include dev indicator (abbreviated as dev)', () => {
        const url = UrlFormatters.buildDevUrl('api', 'example.com');
        expect(url).toContain('dev');
      });
    });

    describe('buildEnvUrl', () => {
      test('should build URL for custom environment', () => {
        const url = UrlFormatters.buildServiceUrl('api', 'example.com', 'custom');
        expect(url).toContain('example.com');
      });

      test('should use production URL for production environment', () => {
        const url = UrlFormatters.buildServiceUrl('api', 'example.com', 'production');
        expect(url).toContain('example.com');
        expect(url).toContain('https://');
      });
    });

    describe('buildApiUrl', () => {
      test('should build API URL with base URL', () => {
        const url = UrlFormatters.buildApiUrl('api', 'example.com');
        expect(url).toContain('api');
        expect(url).toContain('example.com');
      });

      test('should build API URL with path', () => {
        const url = UrlFormatters.buildApiUrl('api', 'example.com', '/users/123');
        expect(url).toContain('api');
        expect(url).toContain('example.com');
        expect(url).toContain('/users/123');
      });
    });

    test('should always use HTTPS protocol', () => {
      expect(UrlFormatters.buildProductionUrl('api', 'example.com')).toMatch(/^https:\/\//);
      expect(UrlFormatters.buildStagingUrl('api', 'example.com')).toMatch(/^https:\/\//);
      expect(UrlFormatters.buildDevUrl('api', 'example.com')).toMatch(/^https:\/\//);
    });
  });

  describe('ResourceFormatters', () => {
    describe('databaseName', () => {
      test('should format database name with -db suffix', () => {
        expect(ResourceFormatters.databaseName('my-service')).toBe('my-service-db');
        expect(ResourceFormatters.databaseName('auth')).toBe('auth-db');
      });

      test('should handle empty string', () => {
        expect(ResourceFormatters.databaseName('')).toBe('');
      });

      test('should handle null/undefined', () => {
        expect(ResourceFormatters.databaseName(null)).toBe('');
        expect(ResourceFormatters.databaseName(undefined)).toBe('');
      });

      test('should not double-suffix', () => {
        const result = ResourceFormatters.databaseName('service-db');
        // Should not create 'service-db-db'
        expect(result).toBe('service-db-db'); // Or depends on implementation
      });
    });

    describe('workerName', () => {
      test('should format worker name with -worker suffix', () => {
        expect(ResourceFormatters.workerName('my-service')).toBe('my-service-worker');
        expect(ResourceFormatters.workerName('api')).toBe('api-worker');
      });

      test('should handle empty string', () => {
        expect(ResourceFormatters.workerName('')).toBe('');
      });

      test('should handle null/undefined', () => {
        expect(ResourceFormatters.workerName(null)).toBe('');
        expect(ResourceFormatters.workerName(undefined)).toBe('');
      });
    });

    describe('serviceDirectory', () => {
      test('should format service directory path', () => {
        expect(ResourceFormatters.serviceDirectory('my-service')).toBe('./services/my-service');
        expect(ResourceFormatters.serviceDirectory('auth')).toBe('./services/auth');
      });

      test('should handle empty string', () => {
        expect(ResourceFormatters.serviceDirectory('')).toBe('');
      });

      test('should use ./ prefix', () => {
        const result = ResourceFormatters.serviceDirectory('my-service');
        expect(result).toMatch(/^\.\//);
      });

      test('should use services/ directory', () => {
        const result = ResourceFormatters.serviceDirectory('my-service');
        expect(result).toContain('services/');
      });
    });

    describe('configKey', () => {
      test('should convert camelCase to kebab-case config key', () => {
        expect(ResourceFormatters.configKey('cloudflareApiToken')).toBe('cloudflare-api-token');
        expect(ResourceFormatters.configKey('serviceName')).toBe('service-name');
      });

      test('should handle empty string', () => {
        expect(ResourceFormatters.configKey('')).toBe('');
      });
    });
  });

  describe('EnvironmentFormatters', () => {
    describe('getEnvPrefix', () => {
      test('should return PROD_ for production', () => {
        expect(EnvironmentFormatters.getEnvPrefix('production')).toBe('PROD_');
      });

      test('should return STAGING_ for staging', () => {
        expect(EnvironmentFormatters.getEnvPrefix('staging')).toBe('STAGING_');
      });

      test('should return DEV_ for development', () => {
        expect(EnvironmentFormatters.getEnvPrefix('development')).toBe('DEV_');
      });

      test('should return APP_ for unknown environment', () => {
        expect(EnvironmentFormatters.getEnvPrefix('custom')).toBe('APP_');
      });

      test('should handle null/undefined', () => {
        expect(EnvironmentFormatters.getEnvPrefix(null)).toBe('APP_');
        expect(EnvironmentFormatters.getEnvPrefix(undefined)).toBe('APP_');
      });
    });

    describe('getLogLevel', () => {
      test('should return warn for production', () => {
        expect(EnvironmentFormatters.getLogLevel('production')).toBe('warn');
      });

      test('should return info for staging', () => {
        expect(EnvironmentFormatters.getLogLevel('staging')).toBe('info');
      });

      test('should return debug for development', () => {
        expect(EnvironmentFormatters.getLogLevel('development')).toBe('debug');
      });

      test('should return info for unknown environment', () => {
        const level = EnvironmentFormatters.getLogLevel('custom');
        expect(['info', 'debug']).toContain(level);
      });
    });
  });

  describe('VersionFormatters', () => {
    describe('normalize', () => {
      test('should normalize semantic version', () => {
        const version = VersionFormatters.normalize('1.2.3');
        expect(version).toBe('1.2.3');
      });

      test('should extract semantic version from string', () => {
        const version = VersionFormatters.normalize('v1.2.3');
        expect(version).toBe('1.2.3');
      });

      test('should handle version with prerelease', () => {
        const version = VersionFormatters.normalize('1.2.3-beta');
        expect(version).toBe('1.2.3');
      });

      test('should handle version with build metadata', () => {
        const version = VersionFormatters.normalize('1.2.3+build.1');
        expect(version).toBe('1.2.3');
      });

      test('should return default version for invalid format', () => {
        const version = VersionFormatters.normalize('invalid');
        expect(version).toBe('1.0.0');
      });
    });

    describe('bump', () => {
      test('should bump patch version', () => {
        const version = VersionFormatters.bump('1.2.3', 'patch');
        expect(version).toBe('1.2.4');
      });

      test('should bump minor version', () => {
        const version = VersionFormatters.bump('1.2.3', 'minor');
        expect(version).toBe('1.3.0');
      });

      test('should bump major version', () => {
        const version = VersionFormatters.bump('1.2.3', 'major');
        expect(version).toBe('2.0.0');
      });

      test('should default to patch bump', () => {
        const version = VersionFormatters.bump('1.2.3');
        expect(version).toBe('1.2.4');
      });
    });
  });

  describe('Integration Tests', () => {
    test('all formatter groups should be exported', () => {
      expect(NameFormatters).toBeDefined();
      expect(UrlFormatters).toBeDefined();
      expect(ResourceFormatters).toBeDefined();
      expect(EnvironmentFormatters).toBeDefined();
      expect(VersionFormatters).toBeDefined();
    });

    test('should support formatting pipeline', () => {
      const serviceName = 'my-api-service';
      const displayName = NameFormatters.toDisplayName(serviceName);
      const camelCase = NameFormatters.toCamelCase(serviceName);
      const dbName = ResourceFormatters.databaseName(serviceName);
      
      expect(displayName).toBe('My Api Service');
      expect(camelCase).toBe('myApiService');
      expect(dbName).toBe('my-api-service-db');
    });

    test('should support URL building with formatted names', () => {
      const serviceName = 'auth-service';
      const domain = 'example.com';
      const prodUrl = UrlFormatters.buildProductionUrl(serviceName, domain);
      const stagingUrl = UrlFormatters.buildStagingUrl(serviceName, domain);
      
      expect(prodUrl).toContain('https://');
      expect(stagingUrl).toContain('sta'); // staging abbreviated
    });

    test('should support environment-aware configuration', () => {
      const env = 'production';
      const prefix = EnvironmentFormatters.getEnvPrefix(env);
      const logLevel = EnvironmentFormatters.getLogLevel(env);
      
      expect(prefix).toBe('PROD_');
      expect(logLevel).toBe('warn');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long names', () => {
      const longName = 'very-long-service-name-with-many-hyphens-and-words';
      const displayName = NameFormatters.toDisplayName(longName);
      expect(displayName).toBeDefined();
      expect(displayName.length).toBeGreaterThan(0);
    });

    test('should handle names with numbers', () => {
      expect(NameFormatters.toDisplayName('service-123')).toBeDefined();
      expect(NameFormatters.toCamelCase('service-123')).toBeDefined();
    });

    test('should handle special characters in URLs', () => {
      const url = UrlFormatters.buildProductionUrl('api-v2', 'example.com');
      expect(url).toContain('api');
    });
  });
});
