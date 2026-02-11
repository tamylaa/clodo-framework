/**
 * RequestContext — Hono-style request/response context for Cloudflare Workers
 * 
 * Wraps the standard (request, env, ctx) triplet into a single ergonomic object.
 * 
 * @example
 * import { RequestContext } from '@tamyla/clodo-framework/routing';
 * 
 * router.get('/users/:id', async (c) => {
 *   const id = c.req.param('id');
 *   const data = await c.env.KV_DATA.get(id);
 *   return c.json({ id, data });
 * });
 * 
 * @module @tamyla/clodo-framework/routing/RequestContext
 */

export class RequestContext {
  /**
   * @param {Request} request - The incoming request
   * @param {Object} env - Cloudflare Worker environment bindings
   * @param {ExecutionContext} executionCtx - Worker execution context
   * @param {Object} [params={}] - Route parameters extracted by the router
   */
  constructor(request, env, executionCtx, params = {}) {
    this._request = request;
    this._env = env;
    this._executionCtx = executionCtx;
    this._params = params;
    this._url = null; // lazy-parsed
    this._headers = new Headers();
    this._status = 200;
    this._store = new Map(); // per-request storage for middleware data sharing
  }

  // ─── Request Accessors ──────────────────────────────────────────────

  /** The raw Request object */
  get request() { return this._request; }

  /** Alias — matches Hono's `c.req` */
  get req() { return this._reqProxy || (this._reqProxy = this._buildReqProxy()); }

  /** Worker environment bindings */
  get env() { return this._env; }

  /** Worker execution context (for waitUntil, passThroughOnException, etc.) */
  get executionCtx() { return this._executionCtx; }

  /** Parsed URL (lazy) */
  get url() { return this._url || (this._url = new URL(this._request.url)); }

  // ─── Per-request store (for middleware data sharing) ─────────────────

  /**
   * Set a value in the per-request store
   * @param {string} key
   * @param {*} value
   */
  set(key, value) { this._store.set(key, value); }

  /**
   * Get a value from the per-request store
   * @param {string} key
   * @returns {*}
   */
  get(key) { return this._store.get(key); }

  // ─── Response Helpers ───────────────────────────────────────────────

  /**
   * Return a JSON response
   * @param {*} data - Data to serialize
   * @param {number} [status=200] - HTTP status code
   * @param {Object} [headers={}] - Additional response headers
   * @returns {Response}
   */
  json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...Object.fromEntries(this._headers),
        ...headers
      }
    });
  }

  /**
   * Return a plain text response
   * @param {string} text
   * @param {number} [status=200]
   * @param {Object} [headers={}]
   * @returns {Response}
   */
  text(text, status = 200, headers = {}) {
    return new Response(String(text), {
      status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...Object.fromEntries(this._headers),
        ...headers
      }
    });
  }

  /**
   * Return an HTML response
   * @param {string} html
   * @param {number} [status=200]
   * @param {Object} [headers={}]
   * @returns {Response}
   */
  html(html, status = 200, headers = {}) {
    return new Response(String(html), {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...Object.fromEntries(this._headers),
        ...headers
      }
    });
  }

  /**
   * Return a redirect response
   * @param {string} url - Target URL
   * @param {number} [status=302] - 301 or 302
   * @returns {Response}
   */
  redirect(url, status = 302) {
    return Response.redirect(url, status);
  }

  /**
   * Return a streaming response — ideal for Workers AI streaming
   * @param {Function} callback - async (stream: WritableStreamDefaultWriter) => void
   * @param {Object} [headers={}] - Additional response headers
   * @returns {Response}
   * 
   * @example
   * return c.stream(async (stream) => {
   *   const aiStream = await env.AI.run(model, { stream: true, messages });
   *   for await (const chunk of aiStream) {
   *     await stream.write(new TextEncoder().encode(chunk.response));
   *   }
   * });
   */
  stream(callback, headers = {}) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Wrap writer with convenience methods
    const stream = {
      write: async (data) => {
        const chunk = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        await writer.write(chunk);
      },
      writeLine: async (data) => {
        await stream.write(data + '\n');
      },
      close: async () => {
        await writer.close();
      },
      abort: async (reason) => {
        await writer.abort(reason);
      }
    };

    // Run the callback in the background via waitUntil if available
    const promise = (async () => {
      try {
        await callback(stream);
      } catch (err) {
        await stream.write(`Error: ${err.message}`);
      } finally {
        try { await stream.close(); } catch { /* already closed */ }
      }
    })();

    if (this._executionCtx?.waitUntil) {
      this._executionCtx.waitUntil(promise);
    }

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...Object.fromEntries(this._headers),
        ...headers
      }
    });
  }

  /**
   * Return a Server-Sent Events (SSE) streaming response
   * @param {Function} callback - async (sse: { send, close }) => void
   * @param {Object} [headers={}]
   * @returns {Response}
   * 
   * @example
   * return c.sse(async (sse) => {
   *   for (let i = 0; i < 10; i++) {
   *     await sse.send({ data: `chunk ${i}`, event: 'progress' });
   *   }
   * });
   */
  sse(callback, headers = {}) {
    return this.stream(async (stream) => {
      const sse = {
        send: async ({ data, event, id, retry }) => {
          let message = '';
          if (id) message += `id: ${id}\n`;
          if (event) message += `event: ${event}\n`;
          if (retry) message += `retry: ${retry}\n`;
          message += `data: ${typeof data === 'object' ? JSON.stringify(data) : data}\n\n`;
          await stream.write(message);
        },
        close: async () => {
          await stream.close();
        }
      };
      await callback(sse);
    }, { 'Content-Type': 'text/event-stream', ...headers });
  }

  /**
   * Return a 404 Not Found response
   * @param {string} [message='Not Found']
   * @returns {Response}
   */
  notFound(message = 'Not Found') {
    return this.json({ error: message }, 404);
  }

  /**
   * Set a response header (applied to all subsequent response helpers)
   * @param {string} key
   * @param {string} value
   * @returns {RequestContext} this — for chaining
   */
  header(key, value) {
    this._headers.set(key, value);
    return this;
  }

  /**
   * Schedule work after the response is sent via ctx.waitUntil
   * @param {Promise} promise
   */
  waitUntil(promise) {
    if (this._executionCtx?.waitUntil) {
      this._executionCtx.waitUntil(promise);
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────

  /** Build a proxy object for c.req that provides Hono-style accessors */
  _buildReqProxy() {
    const ctx = this;
    return {
      /** The raw Request object */
      get raw() { return ctx._request; },

      /** HTTP method */
      get method() { return ctx._request.method; },

      /** Full URL string */
      get url() { return ctx._request.url; },

      /** Request headers */
      get headers() { return ctx._request.headers; },

      /**
       * Get a route parameter
       * @param {string} name
       * @returns {string|undefined}
       */
      param(name) {
        return name ? ctx._params[name] : { ...ctx._params };
      },

      /**
       * Get a query string parameter
       * @param {string} name
       * @returns {string|null}
       */
      query(name) {
        if (!name) {
          return Object.fromEntries(ctx.url.searchParams.entries());
        }
        return ctx.url.searchParams.get(name);
      },

      /**
       * Get a request header
       * @param {string} name
       * @returns {string|null}
       */
      header(name) {
        return ctx._request.headers.get(name);
      },

      /**
       * Parse body as JSON
       * @returns {Promise<*>}
       */
      async json() {
        return ctx._request.json();
      },

      /**
       * Parse body as text
       * @returns {Promise<string>}
       */
      async text() {
        return ctx._request.text();
      },

      /**
       * Parse body as FormData
       * @returns {Promise<FormData>}
       */
      async formData() {
        return ctx._request.formData();
      },

      /**
       * Parse body as ArrayBuffer
       * @returns {Promise<ArrayBuffer>}
       */
      async arrayBuffer() {
        return ctx._request.arrayBuffer();
      },

      /**
       * Get the body as a ReadableStream
       * @returns {ReadableStream|null}
       */
      get body() {
        return ctx._request.body;
      },

      /**
       * Get the pathname
       * @returns {string}
       */
      get path() {
        return ctx.url.pathname;
      }
    };
  }
}

/**
 * Create a RequestContext instance — factory function alternative
 * @param {Request} request
 * @param {Object} env
 * @param {ExecutionContext} ctx
 * @param {Object} [params={}]
 * @returns {RequestContext}
 */
export function createRequestContext(request, env, ctx, params = {}) {
  return new RequestContext(request, env, ctx, params);
}
