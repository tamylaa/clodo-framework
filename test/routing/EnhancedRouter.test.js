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
      expect(router.middleware).toBeUndefined();
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

      expect(handler).toHaveBeenCalledWith(mockRequest);
      expect(await response.text()).toBe('handled');
    });

    test('should handle parameterized route match', async () => {
      const handler = jest.fn(() => new Response('handled'));
      router.registerRoute('GET', '/users/:id', handler);

      const response = await router.handleRequest('GET', '/users/123', mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest, '123');
      expect(mockRequest.params).toEqual({ id: '123' });
    });

    test('should return 404 for unmatched route', async () => {
      const response = await router.handleRequest('GET', '/nonexistent', mockRequest);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });

    test('should handle case insensitive method matching', async () => {
      const handler = jest.fn(() => new Response('handled'));
      router.registerRoute('GET', '/test', handler);

      const response = await router.handleRequest('get', '/test', mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest);
    });

    test('should prioritize exact matches over parameterized routes', async () => {
      const exactHandler = jest.fn(() => new Response('exact'));
      const paramHandler = jest.fn(() => new Response('param'));

      router.registerRoute('GET', '/users/profile', exactHandler);
      router.registerRoute('GET', '/users/:id', paramHandler);

      const response = await router.handleRequest('GET', '/users/profile', mockRequest);

      expect(exactHandler).toHaveBeenCalledWith(mockRequest);
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
