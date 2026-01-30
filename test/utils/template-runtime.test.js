/**
 * TemplateRuntime Unit Tests
 *
 * Tests the TemplateRuntime class for code generation helpers
 */

import { jest, describe, test, expect } from '@jest/globals';
import { TemplateRuntime } from '../../src/utils/TemplateRuntime.js';

describe('TemplateRuntime', () => {
  describe('generateBindings', () => {
    test('should generate D1 bindings', () => {
      const features = { d1: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        DATABASE: {
          type: 'd1',
          id: 'DB'
        }
      });
    });

    test('should generate KV bindings', () => {
      const features = { kv: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        KV_CACHE: {
          type: 'kv_namespace',
          id: 'CACHE'
        }
      });
    });

    test('should generate R2 bindings', () => {
      const features = { r2: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        R2_STORAGE: {
          type: 'r2_bucket',
          id: 'STORAGE'
        }
      });
    });

    test('should generate Durable Object bindings', () => {
      const features = { durableObjects: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        DURABLE_OBJECT: {
          type: 'durable_object',
          className: 'MyDurableObject'
        }
      });
    });

    test('should generate Queue bindings', () => {
      const features = { queue: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        QUEUE: {
          type: 'queue',
          queueName: 'my-queue'
        }
      });
    });

    test('should generate Email bindings', () => {
      const features = { email: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        EMAIL: {
          type: 'email'
        }
      });
    });

    test('should generate multiple bindings', () => {
      const features = { d1: true, kv: true, r2: true };
      const bindings = TemplateRuntime.generateBindings(features);

      expect(bindings).toEqual({
        DATABASE: { type: 'd1', id: 'DB' },
        KV_CACHE: { type: 'kv_namespace', id: 'CACHE' },
        R2_STORAGE: { type: 'r2_bucket', id: 'STORAGE' }
      });
    });

    test('should return empty object for no features', () => {
      const bindings = TemplateRuntime.generateBindings({});
      expect(bindings).toEqual({});
    });
  });

  describe('generateImports', () => {
    test('should generate framework imports', () => {
      const features = {};
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { initializeService } from '@tamyla/clodo-framework/worker';");
    });

    test('should generate D1 imports', () => {
      const features = { d1: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { D1Database } from '@cloudflare/workers-types';");
    });

    test('should generate KV imports', () => {
      const features = { kv: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { KVNamespace } from '@cloudflare/workers-types';");
    });

    test('should generate R2 imports', () => {
      const features = { r2: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { R2Bucket } from '@cloudflare/workers-types';");
    });

    test('should generate Durable Object imports', () => {
      const features = { durableObjects: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { DurableObject } from '@cloudflare/workers-types';");
    });

    test('should generate Queue imports', () => {
      const features = { queue: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { Queue } from '@cloudflare/workers-types';");
    });

    test('should generate Email imports', () => {
      const features = { email: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { EmailMessage } from '@cloudflare/workers-types';");
    });

    test('should generate logging imports', () => {
      const features = { logging: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { Logger } from '@tamyla/clodo-framework/utils';");
    });

    test('should generate validation imports', () => {
      const features = { validation: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { validateRequest } from '@tamyla/clodo-framework/utils';");
    });

    test('should generate multiple imports', () => {
      const features = { d1: true, kv: true, logging: true };
      const imports = TemplateRuntime.generateImports(features);

      expect(imports).toContain("import { D1Database } from '@cloudflare/workers-types';");
      expect(imports).toContain("import { KVNamespace } from '@cloudflare/workers-types';");
      expect(imports).toContain("import { Logger } from '@tamyla/clodo-framework/utils';");
      expect(imports.length).toBeGreaterThan(3);
    });
  });

  describe('generateRouteHandlers', () => {
    test('should generate basic route handler code', () => {
      const routes = {
        '/api/users': { methods: ['GET'] },
        '/api/users/:id': { methods: ['GET', 'PUT'] }
      };
      const features = {};

      const code = TemplateRuntime.generateRouteHandlers(routes, features);

      expect(code).toContain("if (url.pathname === '/api/users')");
      expect(code).toContain("if (method === 'GET')");
      expect(code).toContain("handleUsers(request, env, ctx)");
      expect(code).toContain("async function handleUsers");
    });

    test('should generate feature guards', () => {
      const routes = {
        '/api/admin': {
          features: ['admin']
        }
      };
      const features = {};

      const code = TemplateRuntime.generateRouteHandlers(routes, features);

      expect(code).toContain("if (!env.FEATURES?.admin)");
      expect(code).toContain('Feature not enabled');
    });

    test('should handle multiple methods', () => {
      const routes = {
        '/api/data': {
          methods: ['GET', 'POST', 'PUT']
        }
      };
      const features = {};

      const code = TemplateRuntime.generateRouteHandlers(routes, features);

      expect(code).toContain("if (method === 'GET' || method === 'POST' || method === 'PUT')");
    });
  });

  describe('generateMiddlewareChain', () => {
    test('should generate middleware chain code', () => {
      const middleware = ['authMiddleware', 'loggingMiddleware', 'corsMiddleware'];

      const code = TemplateRuntime.generateMiddlewareChain(middleware);

      expect(code).toContain('const middlewares = [');
      expect(code).toContain('authMiddleware,');
      expect(code).toContain('loggingMiddleware,');
      expect(code).toContain('corsMiddleware');
      expect(code).toContain('middlewares.reduceRight');
    });
  });

  describe('generateErrorHandling', () => {
    test('should generate error handling code', () => {
      const features = {};

      const code = TemplateRuntime.generateErrorHandling(features);

      expect(code).toContain('return async (error, request, env, ctx) => {');
      expect(code).toContain('console.error(\'Request error:\', error);');
      expect(code).toContain('JSON.stringify({');
      expect(code).toContain('error: error.message');
    });

    test('should include logging when logging feature is enabled', () => {
      const features = { logging: true };

      const code = TemplateRuntime.generateErrorHandling(features);

      expect(code).toContain('await logError(error, request);');
    });
  });

  describe('generateHealthCheck', () => {
    test('should generate basic health check code', () => {
      const serviceInfo = {
        name: 'test-service',
        version: '1.0.0',
        type: 'api'
      };

      const code = TemplateRuntime.generateHealthCheck(serviceInfo);

      expect(code).toContain('status: \'healthy\'');
      expect(code).toContain('service: \'test-service\'');
      expect(code).toContain('version: \'1.0.0\'');
      expect(code).toContain('type: \'api\'');
      expect(code).toContain('new Date().toISOString()');
    });

    test('should include D1 health check', () => {
      const serviceInfo = {
        features: { d1: true }
      };

      const code = TemplateRuntime.generateHealthCheck(serviceInfo);

      expect(code).toContain('await env.DATABASE.prepare(\'SELECT 1\').first()');
      expect(code).toContain('health.checks.database');
    });

    test('should include KV health check', () => {
      const serviceInfo = {
        features: { kv: true }
      };

      const code = TemplateRuntime.generateHealthCheck(serviceInfo);

      expect(code).toContain('await env.KV_CACHE.put(\'health-check\', \'ok\', { expirationTtl: 60 })');
      expect(code).toContain('health.checks.kv');
    });

    test('should include R2 health check', () => {
      const serviceInfo = {
        features: { r2: true }
      };

      const code = TemplateRuntime.generateHealthCheck(serviceInfo);

      expect(code).toContain('health.checks.r2');
    });
  });

  describe('capitalize', () => {
    test('should capitalize first letter', () => {
      expect(TemplateRuntime.capitalize('hello')).toBe('Hello');
      expect(TemplateRuntime.capitalize('world')).toBe('World');
    });

    test('should handle empty string', () => {
      expect(TemplateRuntime.capitalize('')).toBe('');
    });

    test('should handle single character', () => {
      expect(TemplateRuntime.capitalize('a')).toBe('A');
    });
  });
});