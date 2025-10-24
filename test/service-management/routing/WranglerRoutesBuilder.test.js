/**
 * WranglerRoutesBuilder Tests
 * 
 * Comprehensive test suite for WranglerRoutesBuilder class
 * Target: 16 tests, 100% coverage
 * 
 * @jest-environment node
 */

import { WranglerRoutesBuilder } from '../../../src/service-management/routing/WranglerRoutesBuilder.js';

describe('WranglerRoutesBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new WranglerRoutesBuilder();
  });

  describe('buildRoutesSection()', () => {
    it('should generate top-level [[routes]] for production', () => {
      const patterns = ['api.example.com/*', 'example.com/api/*'];
      const result = builder.buildRoutesSection(patterns, 'production', {
        zoneId: 'xyz789abc',
        includeComments: false
      });

      expect(result).toContain('[[routes]]');
      expect(result).not.toContain('env.production');
    });

    it('should generate [[env.staging.routes]] for staging', () => {
      const patterns = ['staging-api.example.com/*'];
      const result = builder.buildRoutesSection(patterns, 'staging', {
        zoneId: 'xyz789',
        includeComments: false
      });

      expect(result).toContain('[[env.staging.routes]]');
    });

    it('should format multiple routes correctly', () => {
      const patterns = [
        'api.example.com/*',
        'example.com/api/*',
        'example.com/v1/*'
      ];
      const result = builder.buildRoutesSection(patterns, 'production', {
        zoneId: 'xyz789',
        includeComments: false
      });

      expect(result.match(/\[\[routes\]\]/g)).toHaveLength(3);
      expect(result).toContain('api.example.com/*');
      expect(result).toContain('example.com/api/*');
      expect(result).toContain('example.com/v1/*');
    });

    it('should include comments for each route', () => {
      const patterns = ['api.example.com/*'];
      const result = builder.buildRoutesSection(patterns, 'production', {
        zoneId: 'xyz789',
        includeComments: true,
        domain: 'api.example.com'
      });

      expect(result).toContain('# Production environment routes');
      expect(result).toContain('# Domain: api.example.com');
    });

    it('should handle empty routes array', () => {
      const patterns = [];
      const result = builder.buildRoutesSection(patterns, 'production', {
        zoneId: 'xyz789'
      });

      expect(result).toBe('');
    });
  });

  describe('formatRoutePattern()', () => {
    it('should format route with pattern and zone_id', () => {
      const result = builder.formatRoutePattern('api.example.com/*', 'xyz789');

      expect(result).toContain('[[routes]]');
      expect(result).toContain('pattern = "api.example.com/*"');
      expect(result).toContain('zone_id = "xyz789"');
    });

    it('should quote pattern string', () => {
      const result = builder.formatRoutePattern('api.example.com/*');

      expect(result).toMatch(/pattern = ".*"/);
    });

    it('should quote zone_id string', () => {
      const result = builder.formatRoutePattern('api.example.com/*', 'xyz789');

      expect(result).toMatch(/zone_id = ".*"/);
    });

    it('should escape special characters', () => {
      const result = builder.formatRoutePattern('api.example.com/"test"');

      expect(result).toContain('\\"test\\"');
    });

    it('should use environment prefix for nested routes', () => {
      const result = builder.formatRoutePattern(
        'staging-api.example.com/*',
        'xyz789',
        'env.staging.'
      );

      expect(result).toContain('[[env.staging.routes]]');
    });
  });

  describe('generateRouteComment()', () => {
    it('should generate descriptive comment for production', () => {
      const comment = builder.generateRouteComment('api.example.com', 'production');

      expect(comment).toContain('# Production environment routes');
      expect(comment).toContain('# Domain: api.example.com');
    });

    it('should generate descriptive comment for staging', () => {
      const comment = builder.generateRouteComment('staging.example.com', 'staging');

      expect(comment).toContain('# Staging environment routes');
      expect(comment).toContain('# Domain: staging.example.com');
    });

    it('should include domain in comment', () => {
      const comment = builder.generateRouteComment('test.example.com', 'production');

      expect(comment).toContain('test.example.com');
    });
  });

  describe('generateDevComment()', () => {
    it('should generate workers.dev explanation', () => {
      const comment = builder.generateDevComment('my-api-worker');

      expect(comment).toContain('# Development environment');
      expect(comment).toContain('workers.dev');
      expect(comment).toContain('my-api-worker-dev');
    });
  });

  describe('validateTomlSyntax()', () => {
    it('should validate correct TOML syntax', () => {
      const toml = `[[routes]]
pattern = "api.example.com/*"
zone_id = "xyz789"`;

      const result = builder.validateTomlSyntax(toml);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid TOML syntax', () => {
      const toml = `[[routes
pattern = "api.example.com/*"`;

      const result = builder.validateTomlSyntax(toml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing quotes', () => {
      const toml = `[[routes]]
pattern = api.example.com/*`;

      const result = builder.validateTomlSyntax(toml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be quoted'))).toBe(true);
    });

    it('should detect invalid [[array]] syntax', () => {
      const toml = `[[routes]
pattern = "api.example.com/*"`;

      const result = builder.validateTomlSyntax(toml);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('[[array]]'))).toBe(true);
    });

    it('should allow comments and empty lines', () => {
      const toml = `# Comment
[[routes]]

pattern = "api.example.com/*"
# Another comment`;

      const result = builder.validateTomlSyntax(toml);

      expect(result.valid).toBe(true);
    });
  });

  describe('buildCompleteRoutesConfig()', () => {
    it('should build routes for all environments', () => {
      const routesByEnvironment = {
        production: ['api.example.com/*'],
        staging: ['staging-api.example.com/*'],
        development: []
      };

      const result = builder.buildCompleteRoutesConfig(routesByEnvironment, {
        zoneId: 'xyz789',
        includeComments: true
      });

      expect(result).toContain('[[routes]]');
      expect(result).toContain('[[env.staging.routes]]');
      expect(result).toContain('# Cloudflare Workers Routes Configuration');
    });

    it('should skip empty environment routes', () => {
      const routesByEnvironment = {
        production: ['api.example.com/*'],
        staging: [],
        development: []
      };

      const result = builder.buildCompleteRoutesConfig(routesByEnvironment);

      expect(result).toContain('[[routes]]');
      expect(result).not.toContain('[[env.staging.routes]]');
    });
  });
});
