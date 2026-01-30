/**
 * Template Runtime Coordination
 * Provides consistent code generation helpers for templates
 */

/**
 * Template Runtime for consistent code generation
 */
export class TemplateRuntime {

  /**
   * Generate consistent binding objects for templates
   * @param {Object} features - Enabled features configuration
   * @returns {Object} Binding configuration
   */
  static generateBindings(features) {
    const bindings = {};

    // D1 Database bindings
    if (features.d1) {
      bindings.DATABASE = {
        type: 'd1',
        id: 'DB'
      };
    }

    // KV Namespace bindings
    if (features.kv) {
      bindings.KV_CACHE = {
        type: 'kv_namespace',
        id: 'CACHE'
      };
    }

    // R2 Bucket bindings
    if (features.r2) {
      bindings.R2_STORAGE = {
        type: 'r2_bucket',
        id: 'STORAGE'
      };
    }

    // Durable Object bindings
    if (features.durableObjects) {
      bindings.DURABLE_OBJECT = {
        type: 'durable_object',
        className: 'MyDurableObject'
      };
    }

    // Queue bindings
    if (features.queue) {
      bindings.QUEUE = {
        type: 'queue',
        queueName: 'my-queue'
      };
    }

    // Email bindings
    if (features.email) {
      bindings.EMAIL = {
        type: 'email'
      };
    }

    return bindings;
  }

  /**
   * Generate consistent import statements for templates
   * @param {Object} features - Enabled features configuration
   * @returns {string[]} Array of import statements
   */
  static generateImports(features) {
    const imports = [];

    // Framework imports
    imports.push("import { initializeService } from '@tamyla/clodo-framework/worker';");

    // Feature-specific imports
    if (features.d1) {
      imports.push("import { D1Database } from '@cloudflare/workers-types';");
    }

    if (features.kv) {
      imports.push("import { KVNamespace } from '@cloudflare/workers-types';");
    }

    if (features.r2) {
      imports.push("import { R2Bucket } from '@cloudflare/workers-types';");
    }

    if (features.durableObjects) {
      imports.push("import { DurableObject } from '@cloudflare/workers-types';");
    }

    if (features.queue) {
      imports.push("import { Queue } from '@cloudflare/workers-types';");
    }

    if (features.email) {
      imports.push("import { EmailMessage } from '@cloudflare/workers-types';");
    }

    // Utility imports
    if (features.logging) {
      imports.push("import { Logger } from '@tamyla/clodo-framework/utils';");
    }

    if (features.validation) {
      imports.push("import { validateRequest } from '@tamyla/clodo-framework/utils';");
    }

    return imports;
  }

  /**
   * Generate consistent route handlers for templates
   * @param {Object} routes - Route configuration
   * @param {Object} features - Enabled features
   * @returns {string} Generated route handler code
   */
  static generateRouteHandlers(routes, features) {
    let code = '';

    // Generate route handling logic
    code += 'export async function handleRequest(request, env, ctx) {\n';
    code += '  const url = new URL(request.url);\n';
    code += '  const method = request.method;\n\n';

    // Add route matching
    for (const [path, config] of Object.entries(routes)) {
      code += `  if (url.pathname === '${path}') {\n`;

      // Method-specific handling
      if (config.methods && Array.isArray(config.methods)) {
        code += `    if (${config.methods.map(m => `method === '${m}'`).join(' || ')}) {\n`;
      }

      // Feature guards
      if (config.features) {
        for (const feature of config.features) {
          code += `      // Check ${feature} feature\n`;
          code += `      if (!env.FEATURES?.${feature}) {\n`;
          code += `        return new Response('Feature not enabled', { status: 403 });\n`;
          code += `      }\n`;
        }
      }

      // Handler logic
      const handlerName = this.capitalize(path.split('/').filter(Boolean).pop());
      code += `      return await handle${handlerName}(request, env, ctx);\n`;

      if (config.methods && Array.isArray(config.methods)) {
        code += `    }\n`;
      }

      code += `  }\n\n`;
    }

    code += '  return new Response(\'Not Found\', { status: 404 });\n';
    code += '}\n\n';

    // Generate individual handlers
    for (const [path] of Object.entries(routes)) {
      const handlerName = this.capitalize(path.split('/').filter(Boolean).pop());
      code += `async function handle${handlerName}(request, env, ctx) {\n`;
      code += `  // TODO: Implement ${handlerName} handler\n`;
      code += `  return new Response('Hello from ${handlerName}');\n`;
      code += `}\n\n`;
    }

    return code;
  }

  /**
   * Generate consistent middleware chain for templates
   * @param {string[]} middleware - List of middleware names
   * @returns {string} Generated middleware chain code
   */
  static generateMiddlewareChain(middleware) {
    let code = '';

    code += 'export function createMiddlewareChain() {\n';
    code += '  const middlewares = [\n';

    for (const mw of middleware) {
      code += `    ${mw},\n`;
    }

    code += '  ];\n\n';
    code += '  return (handler) => {\n';
    code += '    return middlewares.reduceRight((acc, mw) => mw(acc), handler);\n';
    code += '  };\n';
    code += '}\n\n';

    return code;
  }

  /**
   * Generate consistent error handling for templates
   * @param {Object} features - Enabled features
   * @returns {string} Generated error handling code
   */
  static generateErrorHandling(features) {
    let code = '';

    code += 'export function createErrorHandler() {\n';
    code += '  return async (error, request, env, ctx) => {\n';
    code += '    console.error(\'Request error:\', error);\n\n';

    if (features.logging) {
      code += '    // Log error details\n';
      code += '    await logError(error, request);\n\n';
    }

    code += '    // Return appropriate error response\n';
    code += '    if (error.status) {\n';
    code += '      return new Response(JSON.stringify({\n';
    code += '        error: error.message,\n';
    code += '        status: error.status\n';
    code += '      }), {\n';
    code += '        status: error.status,\n';
    code += '        headers: { \'Content-Type\': \'application/json\' }\n';
    code += '      });\n';
    code += '    }\n\n';

    code += '    return new Response(JSON.stringify({\n';
    code += '      error: \'Internal Server Error\',\n';
    code += '      status: 500\n';
    code += '    }), {\n';
    code += '      status: 500,\n';
    code += '      headers: { \'Content-Type\': \'application/json\' }\n';
    code += '    });\n';
    code += '  };\n';
    code += '}\n\n';

    return code;
  }

  /**
   * Generate consistent health check endpoint for templates
   * @param {Object} serviceInfo - Service information
   * @returns {string} Generated health check code
   */
  static generateHealthCheck(serviceInfo) {
    let code = '';

    code += 'export async function handleHealthCheck(request, env, ctx) {\n';
    code += '  const health = {\n';
    code += '    status: \'healthy\',\n';
    code += `    service: '${serviceInfo.name || 'unknown'}',\n`;
    code += `    version: '${serviceInfo.version || '1.0.0'}',\n`;
    code += `    type: '${serviceInfo.type || 'generic'}',\n`;
    code += '    timestamp: new Date().toISOString(),\n';
    code += '    checks: {}\n';
    code += '  };\n\n';

    // Add database health checks
    if (serviceInfo.features?.d1) {
      code += '  try {\n';
      code += '    // Check D1 database connectivity\n';
      code += '    await env.DATABASE.prepare(\'SELECT 1\').first();\n';
      code += '    health.checks.database = { status: \'healthy\' };\n';
      code += '  } catch (error) {\n';
      code += '    health.checks.database = { status: \'unhealthy\', error: error.message };\n';
      code += '    health.status = \'unhealthy\';\n';
      code += '  }\n\n';
    }

    // Add KV health checks
    if (serviceInfo.features?.kv) {
      code += '  try {\n';
      code += '    // Check KV connectivity\n';
      code += '    await env.KV_CACHE.put(\'health-check\', \'ok\', { expirationTtl: 60 });\n';
      code += '    health.checks.kv = { status: \'healthy\' };\n';
      code += '  } catch (error) {\n';
      code += '    health.checks.kv = { status: \'unhealthy\', error: error.message };\n';
      code += '    health.status = \'unhealthy\';\n';
      code += '  }\n\n';
    }

    // Add R2 health checks
    if (serviceInfo.features?.r2) {
      code += '  try {\n';
      code += '    // Check R2 bucket connectivity\n';
      code += '    await env.R2_STORAGE.head(\'health-check.txt\');\n';
      code += '    health.checks.r2 = { status: \'healthy\' };\n';
      code += '  } catch (error) {\n';
      code += '    health.checks.r2 = { status: \'unhealthy\', error: error.message };\n';
      code += '    health.status = \'unhealthy\';\n';
      code += '  }\n\n';
    }

    code += '  const statusCode = health.status === \'healthy\' ? 200 : 503;\n';
    code += '  return new Response(JSON.stringify(health), {\n';
    code += '    status: statusCode,\n';
    code += '    headers: {\n';
    code += '      \'Content-Type\': \'application/json\',\n';
    code += '      \'Cache-Control\': \'no-cache\'\n';
    code += '    }\n';
    code += '  });\n';
    code += '}\n\n';

    return code;
  }

  /**
   * Utility function to capitalize strings
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}