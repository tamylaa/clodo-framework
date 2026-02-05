/**
 * Service Bindings Client
 * Inter-service communication via Service Bindings
 * 
 * @example
 * import { ServiceBindingClient, RPCClient } from '@tamyla/clodo-framework/utilities/bindings';
 * 
 * // Direct fetch
 * const client = new ServiceBindingClient(env.AUTH_SERVICE);
 * const user = await client.get('/users/123');
 * 
 * // RPC-style calls
 * const rpc = new RPCClient(env.AUTH_SERVICE);
 * const result = await rpc.call('validateToken', { token: 'xxx' });
 */

/**
 * HTTP client for Service Bindings
 */
export class ServiceBindingClient {
  /**
   * @param {Fetcher} binding - Service binding
   * @param {Object} options - Client options
   */
  constructor(binding, options = {}) {
    if (!binding) {
      throw new Error('Service binding is required');
    }
    this.binding = binding;
    this.baseUrl = options.baseUrl || 'http://internal';
    this.defaultHeaders = options.headers || {};
    this.timeout = options.timeout || 30000;
  }

  /**
   * Make a request to the bound service
   */
  async fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    
    const headers = new Headers({
      ...this.defaultHeaders,
      ...options.headers
    });

    const response = await this.binding.fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = new Error(`Service error: ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    return response.text();
  }

  /**
   * GET request
   */
  async get(path, options = {}) {
    return this.fetch(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(path, body, options = {}) {
    return this.fetch(path, {
      ...options,
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * PUT request
   */
  async put(path, body, options = {}) {
    return this.fetch(path, {
      ...options,
      method: 'PUT',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * PATCH request
   */
  async patch(path, body, options = {}) {
    return this.fetch(path, {
      ...options,
      method: 'PATCH',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * DELETE request
   */
  async delete(path, options = {}) {
    return this.fetch(path, { ...options, method: 'DELETE' });
  }
}

/**
 * RPC-style client for Service Bindings
 */
export class RPCClient {
  constructor(binding, options = {}) {
    this.client = new ServiceBindingClient(binding, options);
    this.rpcPath = options.rpcPath || '/rpc';
  }

  /**
   * Call a remote procedure
   * @param {string} method - Method name
   * @param {Object} params - Method parameters
   * @returns {Promise<*>}
   */
  async call(method, params = {}) {
    const response = await this.client.post(this.rpcPath, {
      jsonrpc: '2.0',
      method,
      params,
      id: crypto.randomUUID()
    });

    if (response.error) {
      const error = new Error(response.error.message);
      error.code = response.error.code;
      error.data = response.error.data;
      throw error;
    }

    return response.result;
  }

  /**
   * Call multiple methods in batch
   * @param {Array<{method: string, params?: Object}>} calls
   */
  async batch(calls) {
    const requests = calls.map((call, i) => ({
      jsonrpc: '2.0',
      method: call.method,
      params: call.params || {},
      id: i
    }));

    const responses = await this.client.post(this.rpcPath, requests);

    return responses.map(r => ({
      result: r.result,
      error: r.error
    }));
  }

  /**
   * Create a proxy for method calls
   * Usage: rpc.proxy.methodName(params)
   */
  get proxy() {
    return new Proxy({}, {
      get: (target, method) => {
        return (params) => this.call(method, params);
      }
    });
  }
}

/**
 * Service router for RPC-style handlers
 */
export class ServiceRouter {
  constructor() {
    this.methods = new Map();
    this.middleware = [];
  }

  /**
   * Register an RPC method
   */
  method(name, handler) {
    this.methods.set(name, handler);
    return this;
  }

  /**
   * Add middleware
   */
  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  /**
   * Handle RPC request
   */
  async handle(request, env) {
    const body = await request.json();
    
    // Handle batch requests
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(req => this._handleSingle(req, env))
      );
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await this._handleSingle(body, env);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async _handleSingle(request, env) {
    const { method, params, id } = request;

    const handler = this.methods.get(method);
    if (!handler) {
      return {
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id
      };
    }

    try {
      // Run middleware
      const context = { method, params, env };
      for (const middleware of this.middleware) {
        await middleware(context);
      }

      const result = await handler(params, env);
      return { jsonrpc: '2.0', result, id };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: error.code || -32000,
          message: error.message,
          data: error.data
        },
        id
      };
    }
  }
}

export default ServiceBindingClient;
