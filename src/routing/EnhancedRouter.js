import { createRouteHandlers } from '../handlers/GenericRouteHandler.js';
import { schemaManager } from '../schema/SchemaManager.js';
import { MiddlewareComposer } from '../middleware/Composer.js';
import { RequestContext, createRequestContext } from './RequestContext.js';

/**
 * Enhanced Router
 * Supports Express/Hono-style routing with middleware composition,
 * parameterized routes, and optional auto-CRUD for schema models.
 * 
 * Now works without a D1 client — pass null for pure API routing.
 * 
 * @example
 * import { EnhancedRouter, createEnhancedRouter } from '@tamyla/clodo-framework';
 * 
 * // Minimal router (no D1)
 * const router = new EnhancedRouter();
 * 
 * // With Hono-style RequestContext:
 * router.get('/users/:id', async (c) => {
 *   return c.json({ user: c.req.param('id') });
 * });
 * 
 * // With classic (request, env, ctx) pattern:
 * router.get('/legacy', async (request, env, ctx) => {
 *   return new Response('ok');
 * });
 */

export class EnhancedRouter {
  /**
   * Create a new EnhancedRouter instance
   * @param {Object} [d1Client=null] - Optional D1 database client (null for pure routing)
   * @param {Object} [options={}] - Router options
   * @param {boolean} [options.autoRegisterGenericRoutes=true] - Auto-register CRUD routes for schema models
   * @param {boolean} [options.useRequestContext=true] - Pass RequestContext to handlers instead of raw request
   */
  constructor(d1Client = null, options = {}) {
    this.d1Client = d1Client;
    this.options = options;
    this.routes = new Map();
    this.middleware = [];
    this.scopedMiddleware = new Map(); // path prefix → middleware[]
    this.middlewareExecutor = null;

    // Only auto-register CRUD routes if D1 client is provided and option is enabled
    const autoRegister = options.autoRegisterGenericRoutes !== false && d1Client;
    if (autoRegister) {
      this.genericHandlers = createRouteHandlers(d1Client, options);
      this._registerGenericRoutes();
    }
  }

  /**
   * Register a custom route
   * @param {string} method - HTTP method
   * @param {string} path - Route path (supports :params and * wildcards)
   * @param {Function} handler - Route handler: (c: RequestContext) => Response or (request, env, ctx) => Response
   */
  registerRoute(method, path, handler) {
    const key = `${method.toUpperCase()} ${path}`;
    this.routes.set(key, handler);
  }

  /**
   * Express-like convenience method: Register GET route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  get(path, handler) {
    return this.registerRoute('GET', path, handler);
  }

  /**
   * Express-like convenience method: Register POST route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  post(path, handler) {
    return this.registerRoute('POST', path, handler);
  }

  /**
   * Express-like convenience method: Register PUT route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  put(path, handler) {
    return this.registerRoute('PUT', path, handler);
  }

  /**
   * Express-like convenience method: Register PATCH route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  patch(path, handler) {
    return this.registerRoute('PATCH', path, handler);
  }

  /**
   * Express-like convenience method: Register DELETE route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  delete(path, handler) {
    return this.registerRoute('DELETE', path, handler);
  }

  /**
   * Express-like convenience method: Register OPTIONS route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  options(path, handler) {
    return this.registerRoute('OPTIONS', path, handler);
  }

  /**
   * Express-like convenience method: Register HEAD route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  head(path, handler) {
    return this.registerRoute('HEAD', path, handler);
  }

  /**
   * Register a route handler for ALL HTTP methods
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  all(path, handler) {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
      this.registerRoute(method, path, handler);
    }
  }

  /**
   * Find and execute a route handler
   * 
   * Supports two call signatures:
   * - handleRequest(method, path, request) — legacy
   * - handleRequest(method, path, request, env, ctx) — full Workers signature
   * 
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Request} request - HTTP request
   * @param {Object} [env] - Worker environment bindings
   * @param {Object} [ctx] - Worker execution context
   * @returns {Promise<Response>} HTTP response
   */
  async handleRequest(method, path, request, env = {}, ctx = {}) {
    // Create a handler function that will be executed with middleware
    let handler = null;
    let params = {};

    // Check for exact match first
    const key = `${method.toUpperCase()} ${path}`;
    if (this.routes.has(key)) {
      handler = this.routes.get(key);
    } else {
      // Check for parameterized routes
      for (const [routeKey, routeHandler] of this.routes.entries()) {
        const [routeMethod, routePath] = routeKey.split(' ');

        if (routeMethod !== method.toUpperCase()) continue;

        const match = this._matchRoute(routePath, path);
        if (match) {
          params = match.params;
          handler = routeHandler;
          break;
        }
      }
    }

    // If no handler found, return 404
    if (!handler) {
      return new Response(JSON.stringify({ error: 'Not Found', path }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Detect handler arity to decide: RequestContext vs raw (request, env, ctx)
    const useContext = this.options.useRequestContext !== false;
    
    // Build the actual handler execution function
    const executeHandler = async (req) => {
      if (useContext && handler.length <= 1) {
        // Hono-style: single argument = RequestContext
        const c = new RequestContext(req, env, ctx, params);
        return await handler(c);
      } else {
        // Classic style: (request, env, ctx) — attach params to request
        req.params = params;
        return await handler(req, env, ctx);
      }
    };

    // Execute with middleware if available, otherwise execute directly
    if (this.middlewareExecutor) {
      return await this.middlewareExecutor.execute(request, executeHandler);
    } else {
      return await executeHandler(request);
    }
  }

  /**
   * Register generic CRUD routes for all configured models
   * @private
   */
  _registerGenericRoutes() {
    if (!this.genericHandlers) return;

    for (const [modelName] of schemaManager.getAllModels()) {
      const handler = this.genericHandlers[modelName];
      if (!handler) continue;
      
      const basePath = `/api/${modelName}`;

      // CRUD routes
      this.registerRoute('GET', basePath, (req) => handler.handleList(req));
      this.registerRoute('POST', basePath, (req) => handler.handleCreate(req));
      this.registerRoute('GET', `${basePath}/:id`, (req, id) => handler.handleGet(req, id));
      this.registerRoute('PATCH', `${basePath}/:id`, (req, id) => handler.handleUpdate(req, id));
      this.registerRoute('DELETE', `${basePath}/:id`, (req, id) => handler.handleDelete(req, id));

      if (this.options.verbose || (typeof process !== 'undefined' && process.env?.DEBUG)) {
        console.log(`✅ Registered generic routes for: ${modelName}`);
      }
    }
  }

  /**
   * Match a route pattern against a path
   * @param {string} pattern - Route pattern (e.g., '/users/:id')
   * @param {string} path - Request path
   * @returns {Object|null} Match result or null
   * @private
   */
  _matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    const args = [];

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Parameter
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
        args.push(pathPart);
      } else if (patternPart === '*') {
        // Wildcard — matches anything
        params['*'] = pathParts.slice(i).join('/');
        args.push(params['*']);
        break;
      } else if (patternPart !== pathPart) {
        // No match
        return null;
      }
    }

    return { params, args };
  }

  /**
   * Get all registered routes
   * @returns {Map} Route map
   */
  getRoutes() {
    return this.routes;
  }

  /**
   * Add middleware to the router
   * 
   * Supports two signatures:
   * - use(middleware)         — global middleware
   * - use('/path', middleware) — scoped to a path prefix
   * 
   * @param {string|Function|Object} pathOrMiddleware - Path prefix or middleware
   * @param {Function|Object} [middleware] - Middleware (when first arg is a path)
   */
  use(pathOrMiddleware, middleware) {
    if (typeof pathOrMiddleware === 'string' && middleware) {
      // Scoped middleware: use('/api', corsMiddleware)
      const prefix = pathOrMiddleware;
      if (!this.scopedMiddleware.has(prefix)) {
        this.scopedMiddleware.set(prefix, []);
      }
      this.scopedMiddleware.get(prefix).push(middleware);
    } else {
      // Global middleware
      this.middleware.push(pathOrMiddleware);
    }

    // Rebuild the middleware executor
    this._rebuildMiddlewareExecutor();
  }

  /**
   * Rebuild the middleware executor when middleware changes
   * @private
   */
  _rebuildMiddlewareExecutor() {
    if (this.middleware.length > 0) {
      this.middlewareExecutor = MiddlewareComposer.compose(...this.middleware);
    } else {
      this.middlewareExecutor = null;
    }
  }

  /**
   * Create a route group with a shared prefix
   * @param {string} prefix - Path prefix for all routes in the group
   * @param {Function} callback - (group: EnhancedRouter) => void
   * @returns {EnhancedRouter} this — for chaining
   * 
   * @example
   * router.group('/api/v1', (api) => {
   *   api.get('/users', listUsers);
   *   api.post('/users', createUser);
   *   api.get('/users/:id', getUser);
   * });
   */
  group(prefix, callback) {
    const groupRouter = {
      get: (path, handler) => this.get(prefix + path, handler),
      post: (path, handler) => this.post(prefix + path, handler),
      put: (path, handler) => this.put(prefix + path, handler),
      patch: (path, handler) => this.patch(prefix + path, handler),
      delete: (path, handler) => this.delete(prefix + path, handler),
      options: (path, handler) => this.options(prefix + path, handler),
      head: (path, handler) => this.head(prefix + path, handler),
      all: (path, handler) => this.all(prefix + path, handler),
    };
    callback(groupRouter);
    return this;
  }
}

/**
 * Create an enhanced router instance
 * @param {Object} [d1Client=null] - Optional D1 database client
 * @param {Object} [options={}] - Router options
 * @returns {EnhancedRouter} Router instance
 */
export function createEnhancedRouter(d1Client = null, options = {}) {
  return new EnhancedRouter(d1Client, options);
}

// Re-export RequestContext for direct usage
export { RequestContext, createRequestContext } from './RequestContext.js';
