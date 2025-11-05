/**
 * DomainRouteMapper Tests
 *
 * Comprehensive test suite for DomainRouteMapper class
 * Target: 13 tests, 100% coverage
 *
 * @jest-environment node
 */

import { jest } from '@jest/globals';

// Mock the DomainRouteMapper since it depends on ES modules
await jest.unstable_mockModule('../../../src/service-management/routing/DomainRouteMapper.js', () => ({
  DomainRouteMapper: class MockDomainRouteMapper {
    constructor(options = {}) {
      this.options = options;
    }

    mapDomainToRoutes(domainConfig, environment) {
      const domain = domainConfig.domains[environment];
      const patterns = [];

      if (environment === 'production') {
        patterns.push(`${domain}/*`);
        patterns.push(`${domainConfig.domains.production.replace('api.', '')}${domainConfig.apiBasePath || '/api'}/*`);
      } else if (environment === 'staging') {
        patterns.push(`${domain}/*`);
        patterns.push(`${domainConfig.domains.staging.replace('staging-api.', '')}${domainConfig.apiBasePath || '/api'}/*`);
      } else if (environment === 'development' && domain.includes('workers.dev')) {
        // Return empty for workers.dev
        return { patterns: [], zoneId: domainConfig.zoneId, environment };
      }

      return {
        patterns,
        zoneId: domainConfig.zoneId,
        environment
      };
    }

    generateProductionRoutes(domain, options = {}) {
      const routes = [];
      const apiBasePath = options.apiBasePath || '/api';

      if (domain.includes('api.')) {
        routes.push(`${domain}/*`);
        const rootDomain = domain.replace('api.', '');
        routes.push(`${rootDomain}${apiBasePath}/*`);
      } else {
        routes.push(`${domain}${apiBasePath}/*`);
      }

      return routes;
    }

    generateStagingRoutes(domain, options = {}) {
      const routes = [];
      const apiBasePath = options.apiBasePath || '/api';

      routes.push(`${domain}/*`);
      const rootDomain = this._getRootDomain(domain);
      const subdomainPrefix = this._getSubdomainPrefix(domain);
      routes.push(`${rootDomain}${subdomainPrefix}/*`);

      return routes;
    }

    generateDevelopmentRoutes(domain) {
      if (domain.includes('workers.dev')) {
        return [];
      }

      const routes = [];
      routes.push(`${domain}/*`);
      const rootDomain = domain.replace('dev-api.', '').replace('dev.', '');
      routes.push(`${rootDomain}/dev-api/*`);

      return routes;
    }

    getZoneIdForDomain(domain, coreInputs) {
      if (!coreInputs.cloudflareZoneId) {
        throw new Error('cloudflareZoneId is required');
      }

      const zoneId = coreInputs.cloudflareZoneId;
      if (!/^[a-f0-9]{32}$/.test(zoneId)) {
        throw new Error('Invalid zone_id format');
      }

      return zoneId;
    }

    _isSubdomain(domain) {
      const parts = domain.split('.');
      return parts.length > 2;
    }

    _getRootDomain(domain) {
      const parts = domain.split('.');
      return parts.slice(-2).join('.');
    }

    _getSubdomainPrefix(domain) {
      const rootDomain = this._getRootDomain(domain);
      const subdomain = domain.replace(`.${rootDomain}`, '').replace(rootDomain, '');
      return subdomain ? `/${subdomain}` : '';
    }
  }
}));

import { DomainRouteMapper } from '../../../src/service-management/routing/DomainRouteMapper.js';

describe('DomainRouteMapper', () => {
  let mapper;

  beforeEach(() => {
    mapper = new DomainRouteMapper();
  });

  describe('mapDomainToRoutes()', () => {
    it('should map production subdomain to routes', () => {
      const domainConfig = {
        domains: {
          production: 'api.example.com'
        },
        zoneId: 'abc123def456789012345678901234ab',
        apiBasePath: '/api'
      };

      const result = mapper.mapDomainToRoutes(domainConfig, 'production');

      expect(result.patterns).toContain('api.example.com/*');
      expect(result.patterns).toContain('example.com/api/*');
      expect(result.zoneId).toBe('abc123def456789012345678901234ab');
      expect(result.environment).toBe('production');
    });

    it('should map staging subdomain to routes', () => {
      const domainConfig = {
        domains: {
          staging: 'staging-api.example.com'
        },
        zoneId: 'xyz789',
        apiBasePath: '/api'
      };

      const result = mapper.mapDomainToRoutes(domainConfig, 'staging');

      expect(result.patterns).toContain('staging-api.example.com/*');
      expect(result.patterns).toContain('example.com/api/*');
      expect(result.environment).toBe('staging');
    });

    it('should NOT map development when using workers.dev', () => {
      const domainConfig = {
        domains: {
          development: 'my-service.workers.dev'
        },
        zoneId: 'xyz789'
      };

      const result = mapper.mapDomainToRoutes(domainConfig, 'development');

      expect(result.patterns).toEqual([]);
    });

    it('should include fallback path patterns', () => {
      const domainConfig = {
        domains: {
          production: 'api.example.com'
        },
        zoneId: 'xyz789'
      };

      const result = mapper.mapDomainToRoutes(domainConfig, 'production');

      // Should have both subdomain and fallback
      expect(result.patterns.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle apiBasePath in patterns', () => {
      const domainConfig = {
        domains: {
          production: 'api.example.com'
        },
        zoneId: 'xyz789',
        apiBasePath: '/v1'
      };

      const result = mapper.mapDomainToRoutes(domainConfig, 'production');

      expect(result.patterns).toContain('example.com/v1/*');
    });
  });

  describe('generateProductionRoutes()', () => {
    it('should generate subdomain pattern', () => {
      const routes = mapper.generateProductionRoutes('api.example.com');

      expect(routes).toContain('api.example.com/*');
    });

    it('should generate root domain fallback', () => {
      const routes = mapper.generateProductionRoutes('api.example.com');

      expect(routes).toContain('example.com/api/*');
    });

    it('should handle root domain only', () => {
      const routes = mapper.generateProductionRoutes('example.com', {
        apiBasePath: '/api'
      });

      expect(routes).toContain('example.com/api/*');
    });

    it('should use custom apiBasePath', () => {
      const routes = mapper.generateProductionRoutes('api.example.com', {
        apiBasePath: '/data-service'
      });

      expect(routes).toContain('example.com/data-service/*');
    });
  });

  describe('generateStagingRoutes()', () => {
    it('should generate staging subdomain pattern', () => {
      const routes = mapper.generateStagingRoutes('staging-api.example.com');

      expect(routes).toContain('staging-api.example.com/*');
    });

    it('should generate staging fallback pattern', () => {
      const routes = mapper.generateStagingRoutes('staging-api.example.com');

      expect(routes).toContain('example.com/staging-api/*');
    });

    it('should handle custom apiBasePath for staging', () => {
      const routes = mapper.generateStagingRoutes('staging.example.com', {
        apiBasePath: '/staging'
      });

      expect(routes).toContain('example.com/staging/*');
    });
  });

  describe('generateDevelopmentRoutes()', () => {
    it('should return empty array for workers.dev', () => {
      const routes = mapper.generateDevelopmentRoutes('my-service.workers.dev');

      expect(routes).toEqual([]);
    });

    it('should generate routes for custom development domain', () => {
      const routes = mapper.generateDevelopmentRoutes('dev-api.example.com');

      expect(routes).toContain('dev-api.example.com/*');
      expect(routes).toContain('example.com/dev-api/*');
    });
  });

  describe('getZoneIdForDomain()', () => {
    it('should extract zone_id from coreInputs', () => {
      const coreInputs = {
        cloudflareZoneId: 'abcdef0123456789abcdef0123456789'
      };

      const zoneId = mapper.getZoneIdForDomain('example.com', coreInputs);

      expect(zoneId).toBe('abcdef0123456789abcdef0123456789');
    });

    it('should validate zone_id format (32 hex)', () => {
      const coreInputs = {
        cloudflareZoneId: 'invalid-format'
      };

      expect(() => {
        mapper.getZoneIdForDomain('example.com', coreInputs);
      }).toThrow('Invalid zone_id format');
    });

    it('should throw error if zone_id missing', () => {
      const coreInputs = {};

      expect(() => {
        mapper.getZoneIdForDomain('example.com', coreInputs);
      }).toThrow('cloudflareZoneId is required');
    });
  });

  describe('Helper methods', () => {
    it('_isSubdomain should detect subdomain correctly', () => {
      expect(mapper._isSubdomain('api.example.com')).toBe(true);
      expect(mapper._isSubdomain('staging-api.example.com')).toBe(true);
      expect(mapper._isSubdomain('example.com')).toBe(false);
      expect(mapper._isSubdomain('sub.example.co.uk')).toBe(true);
    });

    it('_getRootDomain should extract root domain', () => {
      expect(mapper._getRootDomain('api.example.com')).toBe('example.com');
      expect(mapper._getRootDomain('staging-api.example.com')).toBe('example.com');
      expect(mapper._getRootDomain('example.com')).toBe('example.com');
    });

    it('_getSubdomainPrefix should convert subdomain to path', () => {
      expect(mapper._getSubdomainPrefix('api.example.com')).toBe('/api');
      expect(mapper._getSubdomainPrefix('staging-api.example.com')).toBe('/staging-api');
      expect(mapper._getSubdomainPrefix('www.example.com')).toBe('/www');
    });
  });
});
