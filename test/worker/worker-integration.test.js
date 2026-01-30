import { jest } from '@jest/globals';

const mockGetDomainFromEnv = jest.fn();
const mockCreateEnvironmentConfig = jest.fn();

jest.doMock('../../src/config/domains.js', () => ({
  getDomainFromEnv: mockGetDomainFromEnv,
  createEnvironmentConfig: mockCreateEnvironmentConfig
}));

// Import from consolidated ConfigurationManager instead of deleted features.js
import { COMMON_FEATURES } from '../../lib/shared/config/ConfigurationManager.js';

import {
  initializeService,
  createFeatureGuard,
  createRouteGuard,
  createEnvironmentGuard,
  createRateLimitGuard,
  createCorsMiddleware,
  createErrorHandler,
  composeMiddleware,
  configManager
} from '../../src/worker/integration.js';

describe('WorkerIntegration', () => {
  let mockEnv;
  let mockDomainConfigs;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock environment
    mockEnv = {
      ENVIRONMENT: 'production',
      CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      DOMAIN_NAME: 'test.example.com'
    };

    mockDomainConfigs = {
      'test.example.com': {
        name: 'test-domain',
        features: { AUTHENTICATION: true, LOGGING: true },
        domains: {
          production: 'prod.example.com',
          staging: 'staging.example.com',
          development: 'dev.example.com'
        }
      }
    };

    // Spy on configManager methods
    jest.spyOn(configManager, 'getEnabledFeatures').mockReturnValue(Object.values(COMMON_FEATURES));
    jest.spyOn(configManager, 'isFeatureEnabled').mockReturnValue(true);
    jest.spyOn(configManager, 'setDomain').mockImplementation(() => {});

    // Setup mock domain functions - return the actual domain config object
    mockGetDomainFromEnv.mockReturnValue(mockDomainConfigs['test.example.com']);
    mockCreateEnvironmentConfig.mockReturnValue({
      name: 'test-domain',
      settings: { environment: 'production' }
    });

    // Setup mock request/response
    mockRequest = {
      method: 'GET',
      url: 'https://test.example.com/api/test',
      headers: new Headers([
        ['CF-Connecting-IP', '192.168.1.1'],
        ['Origin', 'https://app.example.com']
      ]),
      json: jest.fn()
    };

    mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  });

  describe('initializeService', () => {
    test('should initialize service successfully with valid domain config', () => {
      const result = initializeService(mockEnv, mockDomainConfigs);

      expect(result).toEqual({
        domain: 'test-domain',
        environment: 'production',
        features: expect.any(Array),
        config: expect.any(Object),
        env: mockEnv,
        isProduction: true,
        isStaging: false,
        isDevelopment: false,
        // Enhanced framework features
        serviceClient: expect.any(Object),
        healthChecker: expect.any(Object),
        environmentValidator: expect.any(Function),
        frameworkInfo: expect.objectContaining({
          name: '@tamyla/clodo-framework',
          version: expect.any(String),
          detected: expect.any(Boolean)
        })
      });
      expect(result.config.name).toBe('test-domain');
      expect(result.config.settings.environment).toBe('production');
    });

    test('should throw error when no domain configuration found', () => {
      const envWithMissingDomain = { ...mockEnv, DOMAIN_NAME: 'nonexistent.example.com' };
      
      // getDomainFromEnv returns first available domain as fallback, so this won't throw
      // Instead test with empty domainConfigs
      expect(() => initializeService(envWithMissingDomain, {}))
        .toThrow('No domain configuration found for service initialization');
    });

    test('should handle development environment', () => {
      const devEnv = { ...mockEnv, ENVIRONMENT: 'development' };
      const result = initializeService(devEnv, mockDomainConfigs);

      expect(result.environment).toBe('development');
      expect(result.isDevelopment).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.config.settings.environment).toBe('development');
    });

    test('should handle staging environment', () => {
      const stagingEnv = { ...mockEnv, ENVIRONMENT: 'staging' };
      const result = initializeService(stagingEnv, mockDomainConfigs);

      expect(result.environment).toBe('staging');
      expect(result.isStaging).toBe(true);
      expect(result.isProduction).toBe(false);
      expect(result.config.settings.environment).toBe('staging');
    });

    test('should default to development when no environment specified', () => {
      const noEnv = { CLOUDFLARE_ACCOUNT_ID: 'test-account-id' };
      const result = initializeService(noEnv, mockDomainConfigs);

      expect(result.environment).toBe('development');
      expect(result.isDevelopment).toBe(true);
      expect(result.config.settings.environment).toBe('development');
    });
  });

  describe('createFeatureGuard', () => {
    test('should allow request when feature is enabled', async () => {
      // Initialize service first to set up ConfigurationManager with domain config
      const serviceContext = initializeService(mockEnv, mockDomainConfigs);
      
      // Verify the features are properly initialized
      expect(serviceContext.features).toContain('AUTHENTICATION');
      expect(serviceContext.features).toContain('LOGGING');

      // Now test with a feature that's in the domain config
      const guard = createFeatureGuard('AUTHENTICATION');
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should block request when required feature is disabled', async () => {
      jest.spyOn(configManager, 'isFeatureEnabled').mockReturnValue(false);

      const guard = createFeatureGuard('test-feature', { required: true });
      const handler = jest.fn();

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(404);
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(handler).not.toHaveBeenCalled();
    });

    test('should return custom fallback response when feature is disabled', async () => {
      jest.spyOn(configManager, 'isFeatureEnabled').mockReturnValue(false);
      const customResponse = new Response('Custom fallback', { status: 503 });

      const guard = createFeatureGuard('test-feature', {
        required: true,
        fallbackResponse: customResponse
      });
      const handler = jest.fn();

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result).toBe(customResponse);
      expect(handler).not.toHaveBeenCalled();
    });

    test('should skip handler and return fallback when feature disabled and not required', async () => {
      jest.spyOn(configManager, 'isFeatureEnabled').mockReturnValue(false);

      const guard = createFeatureGuard('test-feature', { required: false });
      const handler = jest.fn();

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(404);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('createRouteGuard', () => {
    test('should allow request when all required features are enabled', async () => {
      // Initialize service first to set up ConfigurationManager
      const serviceContext = initializeService(mockEnv, mockDomainConfigs);
      expect(serviceContext.features).toBeDefined();

      const routeConfig = { AUTHENTICATION: true, LOGGING: true };
      const guard = createRouteGuard(routeConfig);
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should block request when required feature is disabled', async () => {
      // Create a domain config with missing features for this test
      const limitedConfig = {
        'test.example.com': {
          name: 'test-domain',
          features: { AUTHENTICATION: true, LOGGING: false },  // Only 'AUTHENTICATION', no 'LOGGING'
          domains: {
            production: 'prod.example.com',
            staging: 'staging.example.com',
            development: 'dev.example.com'
          }
        }
      };
      
      // Update mock to return the limited config
      mockGetDomainFromEnv.mockReturnValue(limitedConfig['test.example.com']);
      
      // Initialize with limited features
      const serviceContext = initializeService(mockEnv, limitedConfig);
      expect(serviceContext.features).toContain('AUTHENTICATION');
      expect(serviceContext.features).not.toContain('LOGGING');

      // Mock configManager to return true only for AUTHENTICATION
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'AUTHENTICATION';
      });

      const routeConfig = { AUTHENTICATION: true, LOGGING: true };  // Require both
      const guard = createRouteGuard(routeConfig);
      const handler = jest.fn();

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(403);
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(handler).not.toHaveBeenCalled();
    });

    test('should allow request when optional features are disabled', async () => {
      // Initialize service with full features
      const serviceContext = initializeService(mockEnv, mockDomainConfigs);
      expect(serviceContext.features).toContain('AUTHENTICATION');

      // Test with optional logging (false = not required)
      const routeConfig = { AUTHENTICATION: true, LOGGING: false };
      const guard = createRouteGuard(routeConfig);
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });
  });

  describe('createEnvironmentGuard', () => {
    test('should allow request in allowed environment', async () => {
      const guard = createEnvironmentGuard(['production', 'staging']);
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
      expect(result).toBe(mockResponse);
    });

    test('should block request in disallowed environment', async () => {
      const devEnv = { ...mockEnv, ENVIRONMENT: 'development' };
      const guard = createEnvironmentGuard(['production', 'staging']);
      const handler = jest.fn();

      const result = await guard(handler)(devEnv, devEnv, {});

      expect(result.status).toBe(404);
      expect(handler).not.toHaveBeenCalled();
    });

    test('should default to production and staging environments', async () => {
      const guard = createEnvironmentGuard();
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
      expect(result).toBe(mockResponse);
    });

    test('should check NODE_ENV when ENVIRONMENT is not set', async () => {
      const nodeEnv = { NODE_ENV: 'production' };
      const guard = createEnvironmentGuard(['production']);
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, nodeEnv, {});

      expect(handler).toHaveBeenCalledWith(mockRequest, nodeEnv, {});
      expect(result).toBe(mockResponse);
    });

    test('should default to development when no environment specified', async () => {
      const noEnv = {};
      const guard = createEnvironmentGuard(['development']);
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, noEnv, {});

      expect(handler).toHaveBeenCalledWith(mockRequest, noEnv, {});
      expect(result).toBe(mockResponse);
    });
  });

  describe('createRateLimitGuard', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(configManager, 'isFeatureEnabled').mockReturnValue(true);
    });

    afterEach(() => {
      jest.useRealTimers();
    });
    test('should allow request within rate limit', async () => {
      // Mock isEnabled to return true for RATE_LIMITING feature
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'RATE_LIMITING';
      });
      
      const guard = createRateLimitGuard({ maxRequests: 5, windowMs: 60000 });
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
      expect(result).toBe(mockResponse);
    });

    test('should block request when rate limit exceeded', async () => {
      // Initialize service to set up context
      const serviceContext = initializeService(mockEnv, mockDomainConfigs);
      expect(serviceContext).toBeDefined();
      
      // Mock isEnabled to return true for RATE_LIMITING feature
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'RATE_LIMITING';
      });
      
      // Create a new guard for this test to get fresh state
      const guard = createRateLimitGuard({ maxRequests: 1, windowMs: 60000 });
      const handler = jest.fn().mockResolvedValue(mockResponse);

      // First request should succeed
      const result1 = await guard(handler)(mockRequest, mockEnv, {});
      expect(result1.status).toBe(200);

      // Second request should be blocked (exceeds limit of 1)
      const result2 = await guard(handler)(mockRequest, mockEnv, {});

      expect(result2.status).toBe(429);
      expect(result2.headers.get('Retry-After')).toBeDefined();
    });

    test('should reset counter after window expires', async () => {
      // Mock isEnabled to return true for RATE_LIMITING feature
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'RATE_LIMITING';
      });
      
      const guard = createRateLimitGuard({ maxRequests: 1, windowMs: 1000 });
      const handler = jest.fn().mockResolvedValue(mockResponse);

      // First request
      await guard(handler)(mockRequest, mockEnv, {});

      // Advance time past window
      jest.advanceTimersByTime(2000);

      // Second request should succeed
      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    test('should skip rate limiting when feature is disabled', async () => {
      // Mock isEnabled to return false specifically for RATE_LIMITING
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        if (feature === 'RATE_LIMITING') return false;
        return true;
      });

      const guard = createRateLimitGuard({ maxRequests: 1 });
      const handler = jest.fn().mockResolvedValue(mockResponse);

      // Multiple requests should all succeed
      await guard(handler)(mockRequest, mockEnv, {});
      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    test('should use CF-Connecting-IP header for client identification', async () => {
      // Mock isEnabled to return true for RATE_LIMITING feature
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'RATE_LIMITING';
      });
      
      const guard = createRateLimitGuard({ maxRequests: 1 });
      const handler = jest.fn().mockResolvedValue(mockResponse);

      await guard(handler)(mockRequest, mockEnv, {});

      // Request with different IP should succeed
      const differentRequest = {
        ...mockRequest,
        headers: new Map([['CF-Connecting-IP', '192.168.1.2']])
      };

      const result = await guard(handler)(differentRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    test('should skip successful requests from count when configured', async () => {
      // Mock isEnabled to return true for RATE_LIMITING feature
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'RATE_LIMITING';
      });
      
      const guard = createRateLimitGuard({
        maxRequests: 1,
        skipSuccessfulRequests: true
      });
      const handler = jest.fn().mockResolvedValue(mockResponse);

      // Multiple successful requests should all succeed
      await guard(handler)(mockRequest, mockEnv, {});
      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockResponse);
    });

    test('should skip failed requests from count when configured', async () => {
      // Mock isEnabled to return true for RATE_LIMITING feature
      jest.spyOn(configManager, 'isFeatureEnabled').mockImplementation((feature) => {
        return feature === 'RATE_LIMITING';
      });
      
      const guard = createRateLimitGuard({
        maxRequests: 1,
        skipFailedRequests: true
      });
      const failedResponse = { ...mockResponse, ok: false, status: 500 };
      const handler = jest.fn().mockResolvedValue(failedResponse);

      // Multiple failed requests should all succeed (not counted)
      await guard(handler)(mockRequest, mockEnv, {});
      const result = await guard(handler)(mockRequest, mockEnv, {});

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result).toBe(failedResponse);
    });
  });

  describe('createCorsMiddleware', () => {
    test('should handle preflight OPTIONS request with allowed origin', async () => {
      const cors = createCorsMiddleware({
        origins: ['https://app.example.com'],
        methods: ['GET', 'POST'],
        headers: ['Content-Type', 'Authorization']
      });

      const optionsRequest = {
        ...mockRequest,
        method: 'OPTIONS'
      };

      const handler = jest.fn();
      const result = await cors(handler)(optionsRequest, mockEnv, {});

      expect(result.status).toBe(200);
      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
      expect(result.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
      expect(result.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(handler).not.toHaveBeenCalled();
    });

    test('should handle preflight OPTIONS request with wildcard origin', async () => {
      const cors = createCorsMiddleware({ origins: ['*'] });

      const optionsRequest = {
        ...mockRequest,
        method: 'OPTIONS'
      };

      const handler = jest.fn();
      const result = await cors(handler)(optionsRequest, mockEnv, {});

      expect(result.status).toBe(200);
      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(handler).not.toHaveBeenCalled();
    });

    test('should block preflight OPTIONS request with disallowed origin', async () => {
      const cors = createCorsMiddleware({
        origins: ['https://allowed.example.com']
      });

      const optionsRequest = {
        ...mockRequest,
        method: 'OPTIONS',
        headers: new Map([['Origin', 'https://blocked.example.com']])
      };

      const handler = jest.fn();
      const result = await cors(handler)(optionsRequest, mockEnv, {});

      expect(result.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    test('should add CORS headers to actual request with allowed origin', async () => {
      const cors = createCorsMiddleware({
        origins: ['https://app.example.com'],
        credentials: true
      });

      const handler = jest.fn().mockResolvedValue(mockResponse);
      const result = await cors(handler)(mockRequest, mockEnv, {});

      expect(result).toBe(mockResponse);
      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
      expect(result.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should not add CORS headers for disallowed origin', async () => {
      const cors = createCorsMiddleware({
        origins: ['https://allowed.example.com']
      });

      const handler = jest.fn().mockResolvedValue(mockResponse);
      const result = await cors(handler)(mockRequest, mockEnv, {});

      expect(result).toBe(mockResponse);
      expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should handle request without Origin header', async () => {
      const cors = createCorsMiddleware();

      const requestWithoutOrigin = {
        ...mockRequest,
        headers: new Headers()
      };

      const handler = jest.fn().mockResolvedValue(mockResponse);
      const result = await cors(handler)(requestWithoutOrigin, mockEnv, {});

      expect(result).toBe(mockResponse);
      expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(handler).toHaveBeenCalledWith(requestWithoutOrigin, mockEnv, {});
    });
  });

  describe('createErrorHandler', () => {
    test('should return response when handler succeeds', async () => {
      const errorHandler = createErrorHandler();
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await errorHandler(handler)(mockRequest, mockEnv, {});

      expect(result).toBe(mockResponse);
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should handle errors and return 500 response', async () => {
      const errorHandler = createErrorHandler();
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await errorHandler(handler)(mockRequest, mockEnv, {});

      expect(result.status).toBe(500);
      expect(result.headers.get('Content-Type')).toBe('application/json');

      const body = await result.json();
      expect(body.error).toBe('Internal Server Error');
      expect(body.message).toBe('Test error');
    });

    test('should include stack trace when configured', async () => {
      const errorHandler = createErrorHandler({ includeStack: true });
      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';
      const handler = jest.fn().mockRejectedValue(testError);

      const result = await errorHandler(handler)(mockRequest, mockEnv, {});

      const body = await result.json();
      expect(body.stack).toBe('Test stack trace');
    });

    test('should not include stack trace by default', async () => {
      const errorHandler = createErrorHandler();
      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';
      const handler = jest.fn().mockRejectedValue(testError);

      const result = await errorHandler(handler)(mockRequest, mockEnv, {});

      const body = await result.json();
      expect(body.stack).toBeUndefined();
    });

    test('should use custom error transformer', async () => {
      const customTransformer = (error, errorResponse) => ({
        ...errorResponse,
        customField: 'custom value',
        originalMessage: error.message
      });

      const errorHandler = createErrorHandler({
        transformError: customTransformer
      });
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await errorHandler(handler)(mockRequest, mockEnv, {});

      const body = await result.json();
      expect(body.customField).toBe('custom value');
      expect(body.originalMessage).toBe('Test error');
    });

    test('should skip logging when logErrors is false', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = createErrorHandler({ logErrors: false });
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));

      await errorHandler(handler)(mockRequest, mockEnv, {});

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('composeMiddleware', () => {
    test('should compose multiple middleware functions', async () => {
      const middleware1 = (handler) => async (req, env, ctx) => {
        req.middleware1 = true;
        return handler(req, env, ctx);
      };

      const middleware2 = (handler) => async (req, env, ctx) => {
        req.middleware2 = true;
        return handler(req, env, ctx);
      };

      const composed = composeMiddleware(middleware1, middleware2);
      const handler = jest.fn().mockImplementation((req) => {
        expect(req.middleware1).toBe(true);
        expect(req.middleware2).toBe(true);
        return mockResponse;
      });

      const result = await composed(handler)(mockRequest, mockEnv, {});

      expect(result).toBe(mockResponse);
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should handle empty middleware array', async () => {
      const composed = composeMiddleware();
      const handler = jest.fn().mockResolvedValue(mockResponse);

      const result = await composed(handler)(mockRequest, mockEnv, {});

      expect(result).toBe(mockResponse);
      expect(handler).toHaveBeenCalledWith(mockRequest, mockEnv, {});
    });

    test('should compose middleware in correct order', async () => {
      const order = [];

      const middleware1 = (handler) => async (req, env, ctx) => {
        order.push('middleware1');
        const result = await handler(req, env, ctx);
        order.push('middleware1-return');
        return result;
      };

      const middleware2 = (handler) => async (req, env, ctx) => {
        order.push('middleware2');
        const result = await handler(req, env, ctx);
        order.push('middleware2-return');
        return result;
      };

      const composed = composeMiddleware(middleware1, middleware2);
      const handler = jest.fn().mockImplementation(async () => {
        order.push('handler');
        return mockResponse;
      });

      await composed(handler)(mockRequest, mockEnv, {});

      expect(order).toEqual(['middleware1', 'middleware2', 'handler', 'middleware2-return', 'middleware1-return']);
    });
  });
});
