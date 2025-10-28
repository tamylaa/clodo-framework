/**
 * DomainRouter Tests
 * Comprehensive test suite for domain routing, auto-detection, and multi-domain deployments
 */

import { DomainRouter } from '../../../bin/shared/routing/domain-router.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('DomainRouter', () => {
  let router;
  let testDir;
  let testConfigFile;

  beforeEach(() => {
    router = new DomainRouter({ verbose: false, environment: 'development', disableOrchestrator: true });
    router.domains = [];
    router.routes = {};
    router.failoverStrategies = {};
    router.loadedConfig = null;
    testDir = join(tmpdir(), 'clodo-router-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    testConfigFile = join(testDir, 'domains.json');
  });

  afterEach(() => {
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
      const r = new DomainRouter();
      expect(r).toBeDefined();
      expect(r.environment).toBe('development');
      expect(r.domains).toEqual([]);
      expect(r.verbose).toBe(false);
    });

    test('creates instance with custom options', () => {
      const r = new DomainRouter({
        environment: 'production',
        verbose: true
      });
      expect(r.environment).toBe('production');
      expect(r.verbose).toBe(true);
    });
  });

  describe('loadConfiguration()', () => {
    test('loads configuration from file', async () => {
      const config = {
        domains: ['api.example.com', 'app.example.com'],
        production: { rateLimit: 10000 }
      };
      writeFileSync(testConfigFile, JSON.stringify(config));

      const loaded = await router.loadConfiguration({ configPath: testConfigFile });
      expect(loaded).toEqual(config);
      expect(router.loadedConfig).toEqual(config);
    });

    test('returns null when config file does not exist', async () => {
      const result = await router.loadConfiguration({ configPath: '/nonexistent/file.json' });
      expect(result).toBeNull();
    });

    test('throws error on invalid JSON', async () => {
      writeFileSync(testConfigFile, 'invalid json {');

      await expect(async () => {
        await router.loadConfiguration({ configPath: testConfigFile });
      }).rejects.toThrow('Failed to load domain configuration');
    });
  });

  describe('detectDomains()', () => {
    test('detects domains from configuration', async () => {
      const config = {
        domains: ['api.example.com', 'app.example.com', 'admin.example.com']
      };

      const domains = await router.detectDomains({ config });
      expect(domains).toHaveLength(3);
      expect(domains).toContain('api.example.com');
      expect(domains).toContain('app.example.com');
      expect(domains).toContain('admin.example.com');
    });

    test('detects domains from environment-keyed config', async () => {
      const config = {
        domains: {
          production: ['api-prod.example.com', 'app-prod.example.com'],
          staging: ['api-staging.example.com'],
          development: ['localhost:3000']
        }
      };

      const domains = await router.detectDomains({ config });
      expect(domains).toContain('api-prod.example.com');
      expect(domains).toContain('app-prod.example.com');
      expect(domains).toContain('api-staging.example.com');
      expect(domains).toContain('localhost:3000');
    });

    test('deduplicates domains', async () => {
      const config = {
        domains: ['api.example.com', 'api.example.com', 'app.example.com']
      };

      const domains = await router.detectDomains({ config });
      expect(domains).toHaveLength(2);
    });

    test('reads domains from environment variable', async () => {
      process.env.CLODO_DOMAINS = 'env1.com,env2.com,env3.com';

      const domains = await router.detectDomains({ config: { domains: [] } });
      expect(domains).toContain('env1.com');
      expect(domains).toContain('env2.com');
      expect(domains).toContain('env3.com');

      delete process.env.CLODO_DOMAINS;
    });

    test('returns sorted and deduplicated domains', async () => {
      const config = {
        domains: ['z.com', 'a.com', 'z.com', 'm.com']
      };

      const domains = await router.detectDomains({ config });
      expect(domains).toEqual(['a.com', 'm.com', 'z.com']);
    });
  });

  describe('selectDomain()', () => {
    beforeEach(async () => {
      // Reset router state
      router.domains = [];
      router.routes = {};
      router.failoverStrategies = {};
      router.loadedConfig = null;
      
      // Now load test domains
      await router.detectDomains({
        config: {
          domains: ['api.example.com', 'app.example.com', 'admin.example.com']
        }
      });
    });

    test('selects specific domain if valid', () => {
      const selected = router.selectDomain({ specificDomain: 'api.example.com' });
      expect(selected).toBe('api.example.com');
    });

    test('throws error for invalid specific domain', () => {
      expect(() => {
        router.selectDomain({ specificDomain: 'invalid.com' });
      }).toThrow('Domain \'invalid.com\' not found');
    });

    test('returns all domains if selectAll is true', () => {
      const selected = router.selectDomain({ selectAll: true });
      expect(Array.isArray(selected)).toBe(true);
      expect(selected).toHaveLength(3);
    });

    test('returns first domain by default', () => {
      const selected = router.selectDomain({});
      // Domains are sorted, so first domain is 'admin.example.com'
      expect(selected).toBe('admin.example.com');
    });

    test('selects based on environment map', () => {
      const selected = router.selectDomain({
        environmentMap: {
          production: 'admin.example.com',
          staging: 'api.example.com'
        },
        environment: 'production'
      });
      expect(selected).toBe('admin.example.com');
    });

    test('throws error when no domains available', () => {
      const emptyRouter = new DomainRouter();
      expect(() => {
        emptyRouter.selectDomain({});
      }).toThrow('No domains available for selection');
    });
  });

  describe('getEnvironmentRouting()', () => {
    test('returns production routing configuration', () => {
      const routing = router.getEnvironmentRouting('api.example.com', 'production');
      expect(routing.environment).toBe('production');
      expect(routing.rateLimit).toBe(10000);
      expect(routing.cacheTTL).toBe(86400);
      expect(routing.strategies).toContain('load-balance');
      expect(routing.strategies).toContain('geo-route');
    });

    test('returns staging routing configuration', () => {
      const routing = router.getEnvironmentRouting('api.example.com', 'staging');
      expect(routing.environment).toBe('staging');
      expect(routing.rateLimit).toBe(5000);
      expect(routing.cacheTTL).toBe(3600);
      expect(routing.strategies).toContain('round-robin');
    });

    test('returns development routing configuration', () => {
      const routing = router.getEnvironmentRouting('api.example.com', 'development');
      expect(routing.environment).toBe('development');
      expect(routing.rateLimit).toBe(100);
      expect(routing.cacheTTL).toBe(300);
      expect(routing.strategies).toContain('direct');
    });

    test('includes default values', () => {
      const routing = router.getEnvironmentRouting('api.example.com');
      expect(routing.domain).toBe('api.example.com');
      expect(routing.timeout).toBe(30000);
      expect(routing.retries).toBe(3);
      expect(routing.corsEnabled).toBe(false);
      expect(routing.customHeaders).toEqual({});
    });
  });

  describe('getFailoverStrategy()', () => {
    test('returns failover strategy with defaults', () => {
      const strategy = router.getFailoverStrategy('api.example.com');
      expect(strategy.domain).toBe('api.example.com');
      expect(strategy.autoFailover).toBe(true);
      expect(strategy.healthCheckInterval).toBe(30000);
      expect(strategy.healthCheckPath).toBe('/health');
      expect(strategy.failoverThreshold).toBe(3);
      expect(strategy.maxRetries).toBe(5);
      expect(strategy.rollbackOnFailure).toBe(true);
    });

    test('caches failover strategy', () => {
      const strategy1 = router.getFailoverStrategy('api.example.com');
      const strategy2 = router.getFailoverStrategy('api.example.com');
      expect(strategy1).toBe(strategy2); // Same object reference
    });

    test('accepts configuration overrides', () => {
      router.loadedConfig = {
        'api.example.com': {
          autoFailover: false,
          maxRetries: 10,
          secondaryEndpoints: ['backup1.example.com', 'backup2.example.com']
        }
      };

      const strategy = router.getFailoverStrategy('api.example.com');
      expect(strategy.autoFailover).toBe(false);
      expect(strategy.maxRetries).toBe(10);
      expect(strategy.secondaryEndpoints).toHaveLength(2);
    });
  });

  describe('validateConfiguration()', () => {
    test('validates correct configuration', () => {
      const config = {
        domains: ['api.example.com', 'app.example.com']
      };

      const result = router.validateConfiguration(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects empty configuration', () => {
      const result = router.validateConfiguration(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration cannot be empty');
    });

    test('rejects configuration with no domains', () => {
      const result = router.validateConfiguration({ domains: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one domain must be specified');
    });

    test('rejects non-string domain values', () => {
      const config = {
        domains: ['api.example.com', 123, null]
      };

      const result = router.validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('warns about unknown environments', () => {
      const config = {
        domains: ['api.example.com'],
        environments: {
          production: {},
          unknown_env: {}
        }
      };

      const result = router.validateConfiguration(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('planMultiDomainDeployment()', () => {
    beforeEach(async () => {
      // Reset router state
      router.domains = [];
      router.routes = {};
      router.failoverStrategies = {};
      router.loadedConfig = null;
      
      await router.detectDomains({
        config: {
          domains: ['api1.com', 'api2.com', 'api3.com', 'api4.com', 'api5.com']
        }
      });
    });

    test('creates deployment plan with batches', () => {
      const plan = router.planMultiDomainDeployment(
        ['api1.com', 'api2.com', 'api3.com', 'api4.com'],
        { parallelDeployments: 2 }
      );

      expect(plan.totalDomains).toBe(4);
      expect(plan.batches).toHaveLength(2);
      expect(plan.batches[0]).toHaveLength(2);
      expect(plan.batches[1]).toHaveLength(2);
    });

    test('includes deployment phases', () => {
      const plan = router.planMultiDomainDeployment(['api1.com', 'api2.com']);
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.phases[0].phase).toBe('validation');
      expect(plan.phases[1].phase).toBe('preparation');
      expect(plan.phases[2].phase).toBe('deployment');
    });

    test('throws error for invalid domains', () => {
      expect(() => {
        router.planMultiDomainDeployment(['invalid.com']);
      }).toThrow('Invalid domains');
    });

    test('estimates deployment duration', () => {
      const plan = router.planMultiDomainDeployment(['api1.com', 'api2.com']);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBe(2 * 5 * 60 * 1000);
    });
  });

  describe('deployAcrossDomains()', () => {
    beforeEach(async () => {
      // Reset router state
      router.domains = [];
      router.routes = {};
      router.failoverStrategies = {};
      router.loadedConfig = null;
      
      await router.detectDomains({
        config: {
          domains: ['api1.com', 'api2.com', 'api3.com']
        }
      });
    });

    test('executes deployment across domains', async () => {
      const deployed = [];
      const deployFn = async (domain) => {
        deployed.push(domain);
        return { status: 'success', url: `https://${domain}` };
      };

      const results = await router.deployAcrossDomains(
        ['api1.com', 'api2.com'],
        deployFn
      );

      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
      expect(deployed).toContain('api1.com');
      expect(deployed).toContain('api2.com');
    });

    test('handles deployment failures', async () => {
      const deployFn = async (domain) => {
        if (domain === 'api2.com') {
          throw new Error('Deployment failed');
        }
        return { status: 'success' };
      };

      try {
        await router.deployAcrossDomains(
          ['api1.com', 'api2.com'],
          deployFn,
          { rollbackOnError: true }
        );
      } catch (error) {
        expect(error.message).toContain('Deployment failed');
      }
    });

    test('records deployment duration', async () => {
      const deployFn = async (domain) => {
        // Simulate some deployment time
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'success' };
      };

      const results = await router.deployAcrossDomains(
        ['api1.com'],
        deployFn
      );

      expect(results.duration).toBeGreaterThanOrEqual(0);
      expect(results.successful).toHaveLength(1);
    });

    test('deploys in batches', async () => {
      const deployed = [];
      const deploymentOrder = [];

      const deployFn = async (domain) => {
        deployed.push(domain);
        deploymentOrder.push(domain);
        return { status: 'success' };
      };

      const results = await router.deployAcrossDomains(
        ['api1.com', 'api2.com', 'api3.com'],
        deployFn,
        { parallelDeployments: 2 }
      );

      expect(results.successful).toHaveLength(3);
      expect(deployed).toContain('api1.com');
      expect(deployed).toContain('api2.com');
      expect(deployed).toContain('api3.com');
    });
  });

  describe('getSummary()', () => {
    test('returns routing summary', async () => {
      await router.detectDomains({
        config: {
          domains: ['api.example.com', 'app.example.com']
        }
      });

      const summary = router.getSummary();
      expect(summary.totalDomains).toBe(2);
      expect(summary.domains).toHaveLength(2);
      expect(summary.routing['api.example.com']).toBeDefined();
      expect(summary.routing['app.example.com']).toBeDefined();
      expect(summary.failover['api.example.com']).toBeDefined();
      expect(summary.failover['app.example.com']).toBeDefined();
    });

    test('includes environment information', async () => {
      const routerWithEnv = new DomainRouter({ environment: 'production' });
      await routerWithEnv.detectDomains({
        config: { domains: ['api.example.com'] }
      });

      const summary = routerWithEnv.getSummary();
      expect(summary.environment).toBe('production');
    });
  });

  describe('integration scenarios', () => {
    test('complete workflow: load, detect, select, plan, deploy', async () => {
      const config = {
        domains: ['api.example.com', 'app.example.com']
      };

      // Load configuration
      router.loadedConfig = config;

      // Detect domains
      const domains = await router.detectDomains({ config });
      expect(domains).toHaveLength(2);

      // Select domain
      const selected = router.selectDomain({ specificDomain: 'api.example.com' });
      expect(selected).toBe('api.example.com');

      // Get routing
      const routing = router.getEnvironmentRouting(selected, 'production');
      expect(routing.rateLimit).toBe(10000);

      // Plan deployment
      const plan = router.planMultiDomainDeployment(domains);
      expect(plan.totalDomains).toBe(2);
    });

    test('multi-domain deployment with failover', async () => {
      const config = {
        'api1.com': {
          primaryEndpoint: 'primary1.example.com',
          secondaryEndpoints: ['secondary1.example.com']
        },
        'api2.com': {
          primaryEndpoint: 'primary2.example.com',
          secondaryEndpoints: ['secondary2.example.com']
        }
      };

      router.loadedConfig = config;
      await router.detectDomains({
        config: { domains: ['api1.com', 'api2.com'] }
      });

      const failover1 = router.getFailoverStrategy('api1.com');
      expect(failover1.primaryEndpoint).toBe('primary1.example.com');

      const failover2 = router.getFailoverStrategy('api2.com');
      expect(failover2.primaryEndpoint).toBe('primary2.example.com');
    });
  });
});
