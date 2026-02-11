/**
 * Middleware Factories — High-level composable middleware for Cloudflare Workers
 * 
 * These factory functions create middleware objects compatible with both
 * the MiddlewareComposer lifecycle (preprocess/authenticate/validate/postprocess)
 * and the EnhancedRouter's .use() method.
 * 
 * @example
 * import {
 *   createCorsMiddleware,
 *   createRateLimitGuard,
 *   createErrorHandler,
 *   createLogger,
 *   composeMiddleware
 * } from '@tamyla/clodo-framework';
 * 
 * const middleware = composeMiddleware(
 *   createCorsMiddleware({ origins: ['*'] }),
 *   createLogger({ level: 'info' }),
 *   createRateLimitGuard({ maxRequests: 100, windowMs: 60000 }),
 *   createErrorHandler({ includeStack: false })
 * );
 * 
 * @module @tamyla/clodo-framework/middleware/factories
 */

// ─── CORS Middleware ───────────────────────────────────────────────────

/**
 * Create CORS middleware
 * @param {Object} [options]
 * @param {string|string[]} [options.origins='*'] - Allowed origins
 * @param {string[]} [options.methods=['GET','POST','PUT','DELETE','PATCH','OPTIONS']] - Allowed methods
 * @param {string[]} [options.headers=['Content-Type','Authorization']] - Allowed headers
 * @param {boolean} [options.credentials=false] - Allow credentials
 * @param {number} [options.maxAge=86400] - Preflight cache duration (seconds)
 * @returns {Object} Middleware object with preprocess and postprocess
 */
export function createCorsMiddleware(options = {}) {
  const origins = options.origins || options.origin || '*';
  const allowOrigin = Array.isArray(origins) ? origins : [origins];
  const methods = (options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']).join(', ');
  const headers = (options.headers || ['Content-Type', 'Authorization']).join(', ');
  const credentials = options.credentials || false;
  const maxAge = String(options.maxAge || 86400);

  function getOriginHeader(requestOrigin) {
    if (allowOrigin.includes('*')) return '*';
    if (allowOrigin.includes(requestOrigin)) return requestOrigin;
    return null;
  }

  return {
    preprocess(request) {
      const requestOrigin = request.headers.get('Origin') || '';
      const origin = getOriginHeader(requestOrigin);

      if (request.method === 'OPTIONS') {
        const h = new Headers();
        if (origin) h.set('Access-Control-Allow-Origin', origin);
        h.set('Access-Control-Allow-Methods', methods);
        h.set('Access-Control-Allow-Headers', headers);
        h.set('Access-Control-Max-Age', maxAge);
        if (credentials) h.set('Access-Control-Allow-Credentials', 'true');
        return new Response(null, { status: 204, headers: h });
      }
      return null; // pass through to next middleware
    },

    postprocess(response) {
      const h = new Headers(response.headers);
      const origin = allowOrigin.includes('*') ? '*' : allowOrigin[0];
      h.set('Access-Control-Allow-Origin', origin);
      if (credentials) h.set('Access-Control-Allow-Credentials', 'true');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: h
      });
    }
  };
}

// ─── Error Handler Middleware ──────────────────────────────────────────

/**
 * Create error handler middleware
 * @param {Object} [options]
 * @param {boolean} [options.includeStack=false] - Include stack trace in response
 * @param {boolean} [options.logErrors=true] - Log errors to console
 * @param {Function} [options.onError] - Custom error handler: (error, request) => Response | null
 * @returns {Object} Middleware object
 */
export function createErrorHandler(options = {}) {
  const includeStack = options.includeStack || false;
  const logErrors = options.logErrors !== false;
  const onError = options.onError || null;

  return {
    /**
     * Wraps the handler execution — this is used by the compose function
     * to catch errors from the handler and any downstream middleware.
     */
    async wrapHandler(request, handler) {
      try {
        return await handler(request);
      } catch (error) {
        if (logErrors) {
          console.error(`[ErrorHandler] ${error.message}`, error.stack);
        }

        // Custom error handler
        if (onError) {
          const custom = onError(error, request);
          if (custom instanceof Response) return custom;
        }

        const status = error.status || error.statusCode || 500;
        const body = {
          error: error.message || 'Internal Server Error',
          status
        };

        if (includeStack && error.stack) {
          body.stack = error.stack;
        }

        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  };
}

// ─── Rate Limit Guard Middleware ──────────────────────────────────────

/**
 * Create rate-limiting middleware using a simple in-memory token bucket.
 * For production use with multiple Workers instances, back this with KV or Durable Objects.
 * 
 * @param {Object} [options]
 * @param {number} [options.maxRequests=100] - Max requests per window
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds
 * @param {Function} [options.keyFn] - Function to extract rate-limit key from request (default: IP)
 * @param {Object} [options.kvBinding] - Optional KV namespace for distributed rate limiting
 * @returns {Object} Middleware object with preprocess
 */
export function createRateLimitGuard(options = {}) {
  const maxRequests = options.maxRequests || 100;
  const windowMs = options.windowMs || 60000;
  const keyFn = options.keyFn || ((request) => request.headers.get('CF-Connecting-IP') || 'unknown');
  const buckets = new Map();

  function getBucket(key) {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart > windowMs) {
      bucket = { windowStart: now, count: 0 };
      buckets.set(key, bucket);
    }

    return bucket;
  }

  // Periodic cleanup to prevent memory leaks (every 10 windows)
  let cleanupCounter = 0;
  function maybeCleanup() {
    if (++cleanupCounter % (maxRequests * 10) === 0) {
      const now = Date.now();
      for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.windowStart > windowMs * 2) {
          buckets.delete(key);
        }
      }
    }
  }

  return {
    preprocess(request) {
      const key = keyFn(request);
      const bucket = getBucket(key);

      maybeCleanup();

      bucket.count++;

      if (bucket.count > maxRequests) {
        const retryAfter = Math.ceil((bucket.windowStart + windowMs - Date.now()) / 1000);
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(retryAfter, 1)),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((bucket.windowStart + windowMs) / 1000))
          }
        });
      }

      // Add rate limit headers to request for downstream use
      request._rateLimitRemaining = maxRequests - bucket.count;
      return null; // pass through
    },

    postprocess(response, request) {
      // Add rate limit info headers to every response
      const h = new Headers(response.headers);
      h.set('X-RateLimit-Limit', String(maxRequests));
      if (request?._rateLimitRemaining !== undefined) {
        h.set('X-RateLimit-Remaining', String(request._rateLimitRemaining));
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: h
      });
    }
  };
}

// ─── Logger Middleware ────────────────────────────────────────────────

/**
 * Create a logging middleware
 * @param {Object} [options]
 * @param {string} [options.level='info'] - Log level: 'debug' | 'info' | 'warn' | 'error'
 * @param {string} [options.prefix=''] - Log prefix
 * @param {boolean} [options.includeHeaders=false] - Log request headers
 * @param {boolean} [options.includeLatency=true] - Log response latency
 * @param {Function} [options.logger=console] - Custom logger
 * @returns {Object} Middleware object
 */
export function createLogger(options = {}) {
  const level = options.level || 'info';
  const prefix = options.prefix ? `[${options.prefix}] ` : '';
  const includeHeaders = options.includeHeaders || false;
  const includeLatency = options.includeLatency !== false;
  const logger = options.logger || console;

  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level] ?? 1;

  function log(lvl, ...args) {
    if ((levels[lvl] ?? 1) >= currentLevel) {
      (logger[lvl] || logger.log)(...args);
    }
  }

  return {
    preprocess(request) {
      const url = new URL(request.url);
      const logLine = `${prefix}→ ${request.method} ${url.pathname}${url.search}`;
      log('info', logLine);

      if (includeHeaders) {
        const headers = Object.fromEntries(request.headers.entries());
        log('debug', `${prefix}  Headers:`, headers);
      }

      // Store start time for latency calculation
      request._startTime = Date.now();
      return null; // pass through
    },

    postprocess(response) {
      if (includeLatency && response) {
        const latency = Date.now() - (response._startTime || Date.now());
        log('info', `${prefix}← ${response.status} (${latency}ms)`);
      }
      return response;
    }
  };
}

// ─── Bearer Auth Middleware ──────────────────────────────────────────

/**
 * Create bearer token authentication middleware
 * @param {Object} options
 * @param {string|Function} options.token - Expected token string, or async (token, request) => boolean validator
 * @param {string} [options.realm='API'] - WWW-Authenticate realm
 * @param {string} [options.headerName='Authorization'] - Header to check
 * @returns {Object} Middleware object with authenticate
 */
export function createBearerAuth(options = {}) {
  const tokenValidator = typeof options.token === 'function'
    ? options.token
    : (t) => t === options.token;
  const realm = options.realm || 'API';
  const headerName = options.headerName || 'Authorization';

  return {
    async authenticate(request) {
      const header = request.headers.get(headerName);

      if (!header || !header.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Bearer realm="${realm}"`
          }
        });
      }

      const token = header.slice(7); // remove 'Bearer '
      const valid = await tokenValidator(token, request);

      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return null; // authenticated — pass through
    }
  };
}

// ─── API Key Middleware ──────────────────────────────────────────────

/**
 * Create API key authentication middleware
 * @param {Object} options
 * @param {string|string[]|Function} options.keys - Valid API key(s) or async validator function
 * @param {string} [options.headerName='X-API-Key'] - Header to check
 * @param {string} [options.queryParam] - Optional query parameter name to check
 * @returns {Object} Middleware object with authenticate
 */
export function createApiKeyAuth(options = {}) {
  const keys = Array.isArray(options.keys) ? options.keys : [options.keys];
  const validator = typeof options.keys === 'function'
    ? options.keys
    : (k) => keys.includes(k);
  const headerName = options.headerName || 'X-API-Key';
  const queryParam = options.queryParam;

  return {
    async authenticate(request) {
      let key = request.headers.get(headerName);

      // Fallback to query parameter if configured
      if (!key && queryParam) {
        const url = new URL(request.url);
        key = url.searchParams.get(queryParam);
      }

      if (!key) {
        return new Response(JSON.stringify({ error: 'API key required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const valid = await validator(key, request);

      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return null; // authenticated
    }
  };
}

// ─── Compose Middleware ──────────────────────────────────────────────

/**
 * Compose multiple middleware into a single executable middleware chain.
 * This is the recommended way to combine middleware for use with the router.
 * 
 * Execution order:
 *   preprocess → authenticate → validate → handler → postprocess (reverse)
 * 
 * Any phase returning a Response short-circuits the chain.
 * 
 * @param {...Object} middlewares - Middleware objects
 * @returns {Object} Composed middleware with execute(request, handler) method
 * 
 * @example
 * const composed = composeMiddleware(
 *   createCorsMiddleware({ origins: ['*'] }),
 *   createLogger({ prefix: 'api' }),
 *   createRateLimitGuard({ maxRequests: 100 }),
 *   createErrorHandler()
 * );
 * 
 * // Use with router
 * router.use(composed);
 * 
 * // Or use directly
 * const response = await composed.execute(request, handler);
 */
export function composeMiddleware(...middlewares) {
  const chain = middlewares.filter(Boolean);

  return {
    async execute(request, handler) {
      // Find error handler if one exists (it wraps the handler)
      const errorHandler = chain.find(m => typeof m.wrapHandler === 'function');

      // Pre-handler phases (in order)
      for (const m of chain) {
        if (typeof m.preprocess === 'function') {
          const res = await m.preprocess(request);
          if (res instanceof Response) return res;
        }
      }

      for (const m of chain) {
        if (typeof m.authenticate === 'function') {
          const res = await m.authenticate(request);
          if (res instanceof Response) return res;
        }
      }

      for (const m of chain) {
        if (typeof m.validate === 'function') {
          const res = await m.validate(request);
          if (res instanceof Response) return res;
        }
      }

      // Execute handler (wrapped by error handler if present)
      let response;
      if (errorHandler) {
        response = await errorHandler.wrapHandler(request, handler);
      } else {
        response = await handler(request);
      }

      // Post-handler phase (in reverse order)
      for (const m of chain.slice().reverse()) {
        if (typeof m.postprocess === 'function') {
          const updated = await m.postprocess(response);
          if (updated instanceof Response) response = updated;
        }
      }

      return response;
    },

    // Also expose as a preprocess-only middleware for nesting
    preprocess: chain.length === 1 && chain[0].preprocess ? chain[0].preprocess : undefined,
    postprocess: chain.length === 1 && chain[0].postprocess ? chain[0].postprocess : undefined
  };
}
