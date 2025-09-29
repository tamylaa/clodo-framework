import { createRouteHandlers } from '../handlers/GenericRouteHandler.js';
import { moduleManager } from '../modules/ModuleManager.js';
import { schemaManager } from '../schema/SchemaManager.js';

/**
 * Enhanced Router
 * Supports both domain-specific routes and generic CRUD routes
 *
 * Framework-ready version: All data-service specific imports and routes removed.
 * Domain-specific routes should be registered by the consuming application.
 */

export class EnhancedRouter {
  /**
   * Create a new EnhancedRouter instance
   * @param {Object} d1Client - D1 database client
   * @param {Object} options - Router options
   */
  constructor(d1Client, options = {}) {
    this.d1Client = d1Client;
    this.options = options;
    this.routes = new Map();
    this.genericHandlers = createRouteHandlers(d1Client, options);

    // Register generic routes for all models
    this._registerGenericRoutes();

    // Note: Domain-specific routes should be registered by the consuming application
  }

  /**
   * Register a custom route
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  registerRoute(method, path, handler) {
    const key = `${method.toUpperCase()} ${path}`;
    this.routes.set(key, handler);
  }

  /**
   * Find and execute a route handler
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async handleRequest(method, path, request) {
    const key = `${method.toUpperCase()} ${path}`;

    // Check for exact match first
    if (this.routes.has(key)) {
      const handler = this.routes.get(key);
      return await handler(request);
    }

    // Check for parameterized routes
    for (const [routeKey, handler] of this.routes.entries()) {
      const [routeMethod, routePath] = routeKey.split(' ');

      if (routeMethod !== method.toUpperCase()) continue;

      const match = this._matchRoute(routePath, path);
      if (match) {
        // Add route parameters to request
        // @ts-ignore - Extending Request object with params
        request.params = match.params;
        return await handler(request, ...match.args);
      }
    }

    // No route found
    return new Response('Not Found', { status: 404 });
  }

  /**
   * Register generic CRUD routes for all configured models
   * @private
   */
  _registerGenericRoutes() {
    for (const [modelName] of schemaManager.getAllModels()) {
      const handler = this.genericHandlers[modelName];
      const basePath = `/api/${modelName}`;

      // CRUD routes
      this.registerRoute('GET', basePath, (req) => handler.handleList(req));
      this.registerRoute('POST', basePath, (req) => handler.handleCreate(req));
      this.registerRoute('GET', `${basePath}/:id`, (req, id) => handler.handleGet(req, id));
      this.registerRoute('PATCH', `${basePath}/:id`, (req, id) => handler.handleUpdate(req, id));
      this.registerRoute('DELETE', `${basePath}/:id`, (req, id) => handler.handleDelete(req, id));

      console.log(`✅ Registered generic routes for: ${modelName}`);
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
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    // Store middleware for later use
    if (!this.middleware) {
      this.middleware = [];
    }
    this.middleware.push(middleware);
  }
}

/**
 * Create an enhanced router instance
 * @param {Object} d1Client - D1 database client
 * @param {Object} options - Router options
 * @returns {EnhancedRouter} Router instance
 */
export function createEnhancedRouter(d1Client, options = {}) {
  return new EnhancedRouter(d1Client, options);
}