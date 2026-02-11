import { jest } from '@jest/globals';
import { EnhancedRouter, createEnhancedRouter } from '../../src/routing/EnhancedRouter.js';

describe('EnhancedRouter', () => {
  let mockD1Client;
  let router;
  let mockRequest;

  beforeEach(() => {
    mockD1Client = {};
    router = new EnhancedRouter(mockD1Client, { someOption: 'value' });
    mockRequest = { url: 'http://example.com', method: 'GET' };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with d1Client and options', () => {
      expect(router.d1Client).toBe(mockD1Client);
      expect(router.options).toEqual({ someOption: 'value' });
      expect(router.routes).toBeInstanceOf(Map);
      expect(router.middleware).toEqual([]);
      expect(router.middlewareExecutor).toBeNull();
    });
  });

  describe('registerRoute', () => {
    test('should register a route with uppercase method', () => {
      const handler = jest.fn();
      router.registerRoute('get', '/test', handler);

      expect(router.routes.get('GET /test')).toBe(handler);
    });

    test('should register a route with already uppercase method', () => {
      const handler = jest.fn();
      router.registerRoute('POST', '/test', handler);

      expect(router.routes.get('POST /test')).toBe(handler);
    });
  });

  describe('handleRequest', () => {
    test('should handle exact route match', async () => {
      const handler = jest.fn(() => new Response('handled'));
      router.registerRoute('GET', '/exact', handler);

      const response = await router.handleRequest('GET', '/exact', mockRequest);

      expect(handler).toHaveBeenCalledTimes(1);
      // Handler now receives a RequestContext, not the raw request
      const ctx = handler.mock.calls[0][0];
      expect(ctx._request).toBe(mockRequest);
      expect(await response.text()).toBe('handled');
    });

    test('should handle parameterized route match', async () => {
      const handler = jest.fn(() => new Response('handled'));
      router.registerRoute('GET', '/users/:id', handler);

      const response = await router.handleRequest('GET', '/users/123', mockRequest);

      expect(handler).toHaveBeenCalledTimes(1);
      const ctx = handler.mock.calls[0][0];
      expect(ctx.req.param('id')).toBe('123');
    });

    test('should return 404 for unmatched route', async () => {
      const response = await router.handleRequest('GET', '/nonexistent', mockRequest);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Not Found');
    });

    test('should handle case insensitive method matching', async () => {
      const handler = jest.fn(() => new Response('handled'));
      router.registerRoute('GET', '/test', handler);

      const response = await router.handleRequest('get', '/test', mockRequest);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should prioritize exact matches over parameterized routes', async () => {
      const exactHandler = jest.fn(() => new Response('exact'));
      const paramHandler = jest.fn(() => new Response('param'));

      router.registerRoute('GET', '/users/profile', exactHandler);
      router.registerRoute('GET', '/users/:id', paramHandler);

      const response = await router.handleRequest('GET', '/users/profile', mockRequest);

      expect(exactHandler).toHaveBeenCalledTimes(1);
      expect(paramHandler).not.toHaveBeenCalled();
    });
  });

  describe('_matchRoute', () => {
    test('should match exact routes', () => {
      const result = router._matchRoute('/exact', '/exact');
      expect(result).toEqual({ params: {}, args: [] });
    });

    test('should match parameterized routes', () => {
      const result = router._matchRoute('/users/:id', '/users/123');
      expect(result).toEqual({ params: { id: '123' }, args: ['123'] });
    });

    test('should match multiple parameters', () => {
      const result = router._matchRoute('/users/:userId/posts/:postId', '/users/123/posts/456');
      expect(result).toEqual({
        params: { userId: '123', postId: '456' },
        args: ['123', '456']
      });
    });

    test('should return null for non-matching routes', () => {
      expect(router._matchRoute('/users/:id', '/posts/123')).toBeNull();
      expect(router._matchRoute('/users/:id', '/users/123/extra')).toBeNull();
      expect(router._matchRoute('/users/:id', '/users')).toBeNull();
    });

    test('should handle mixed static and dynamic segments', () => {
      const result = router._matchRoute('/api/users/:id/profile', '/api/users/123/profile');
      expect(result).toEqual({ params: { id: '123' }, args: ['123'] });
    });
  });

  describe('getRoutes', () => {
    test('should return the routes map', () => {
      const routes = router.getRoutes();
      expect(routes).toBe(router.routes);
      expect(routes).toBeInstanceOf(Map);
    });
  });

  describe('use', () => {
    test('should add middleware to the router', () => {
      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      router.use(middleware1);
      router.use(middleware2);

      expect(router.middleware).toEqual([middleware1, middleware2]);
    });

    test('should initialize middleware array on first use', () => {
      const middleware = jest.fn();
      router.use(middleware);

      expect(router.middleware).toEqual([middleware]);
    });
  });

  describe('Express-like convenience methods', () => {
    test('should register GET route via .get() method', () => {
      const handler = jest.fn(() => new Response('get'));
      router.get('/api/test', handler);

      expect(router.routes.get('GET /api/test')).toBe(handler);
    });

    test('should register POST route via .post() method', () => {
      const handler = jest.fn(() => new Response('post'));
      router.post('/api/test', handler);

      expect(router.routes.get('POST /api/test')).toBe(handler);
    });

    test('should register PUT route via .put() method', () => {
      const handler = jest.fn(() => new Response('put'));
      router.put('/api/test', handler);

      expect(router.routes.get('PUT /api/test')).toBe(handler);
    });

    test('should register PATCH route via .patch() method', () => {
      const handler = jest.fn(() => new Response('patch'));
      router.patch('/api/test', handler);

      expect(router.routes.get('PATCH /api/test')).toBe(handler);
    });

    test('should register DELETE route via .delete() method', () => {
      const handler = jest.fn(() => new Response('delete'));
      router.delete('/api/test', handler);

      expect(router.routes.get('DELETE /api/test')).toBe(handler);
    });

    test('should register OPTIONS route via .options() method', () => {
      const handler = jest.fn(() => new Response('', { headers: { Allow: 'GET,POST,OPTIONS' } }));
      // Note: Using Object.getOwnPropertyDescriptor to access the method directly
      // to avoid collision with Jest's test.options() function
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(router), 'options');
      descriptor.value.call(router, '/api/test', handler);

      expect(router.routes.get('OPTIONS /api/test')).toBe(handler);
    });

    test('should register HEAD route via .head() method', () => {
      const handler = jest.fn(() => new Response('', { status: 200 }));
      router.head('/api/test', handler);

      expect(router.routes.get('HEAD /api/test')).toBe(handler);
    });

    test('should handle parameterized routes with .get()', async () => {
      const handler = jest.fn(() => new Response('user'));
      router.get('/api/users/:id', handler);

      const response = await router.handleRequest('GET', '/api/users/123', mockRequest);
      expect(handler).toHaveBeenCalledTimes(1);
      const ctx = handler.mock.calls[0][0];
      expect(ctx.req.param('id')).toBe('123');
    });

    test('should handle parameterized routes with .post()', async () => {
      const handler = jest.fn(() => new Response('created'));
      router.post('/api/posts/:id/comments', handler);

      const response = await router.handleRequest('POST', '/api/posts/456/comments', mockRequest);
      expect(handler).toHaveBeenCalledTimes(1);
      const ctx = handler.mock.calls[0][0];
      expect(ctx.req.param('id')).toBe('456');
    });
  });
});

describe('createEnhancedRouter', () => {
  test('should create a new EnhancedRouter instance', () => {
    const mockD1Client = {};
    const options = { test: true };

    const router = createEnhancedRouter(mockD1Client, options);

    expect(router).toBeInstanceOf(EnhancedRouter);
    expect(router.d1Client).toBe(mockD1Client);
    expect(router.options).toEqual(options);
  });

  test('should work with default options', () => {
    const mockD1Client = {};
    const router = createEnhancedRouter(mockD1Client);

    expect(router).toBeInstanceOf(EnhancedRouter);
    expect(router.options).toEqual({});
  });
});
