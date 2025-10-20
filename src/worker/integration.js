import { featureManager, COMMON_FEATURES } from '../config/features.js';
import { getDomainFromEnv, createEnvironmentConfig } from '../config/domains.js';

// Simple inline logger to avoid circular dependency with index.js
const logger = {
  info: (message, ...args) => console.log(`[WorkerIntegration] ${message}`, ...args),
  error: (message, ...args) => console.error(`[WorkerIntegration] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WorkerIntegration] ${message}`, ...args),
  debug: (message, ...args) => console.debug(`[WorkerIntegration] ${message}`, ...args)
};

/**
 * Initializes a service with domain and feature context
 * @param {Object} env - Cloudflare Worker environment
 * @param {Object} domainConfigs - Available domain configurations
 * @returns {Object} Service initialization context
 */
export const initializeService = (env, domainConfigs = {}) => {
  try {
    // Get domain configuration from environment
    const domainConfig = getDomainFromEnv(env, domainConfigs);

    if (!domainConfig) {
      throw new Error('No domain configuration found for service initialization');
    }

    // Set domain in feature manager
    featureManager.setDomain(domainConfig);

    // Create environment-specific config
    const environment = env.ENVIRONMENT || env.NODE_ENV || 'development';
    const envConfig = createEnvironmentConfig(domainConfig, environment);

    // Initialize service context
    const serviceContext = {
      domain: domainConfig.name,
      environment,
      features: featureManager.getEnabledFeatures(),
      config: envConfig,
      env,
      isProduction: environment === 'production',
      isStaging: environment === 'staging',
      isDevelopment: environment === 'development'
    };

    logger.info(`Service initialized: ${domainConfig.name} (${environment})`);
    logger.debug(`Enabled features: ${serviceContext.features.join(', ')}`);

    return serviceContext;
  } catch (error) {
    logger.error(`Service initialization failed: ${error.message}`);
    throw error;
  }
};

/**
 * Creates a feature guard middleware for Cloudflare Workers
 * @param {string} featureName - Name of the feature to guard
 * @param {Object} options - Guard options
 * @returns {Function} Feature guard middleware
 */
export const createFeatureGuard = (featureName, options = {}) => {
  const {
    fallbackResponse = null,
    required = true,
    logAccess = true
  } = options;

  return (handler) => {
    return async (request, env, ctx) => {
      const isEnabled = featureManager.isEnabled(featureName);

      if (logAccess) {
        logger.debug(`Feature access: ${featureName} = ${isEnabled}`);
      }

      if (required && !isEnabled) {
        const response = fallbackResponse || new Response(
          JSON.stringify({
            error: 'Feature not available',
            feature: featureName,
            message: `The ${featureName} feature is not enabled for this domain`
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        logger.warn(`Feature guard blocked access to ${featureName}`);
        return response;
      }

      if (!isEnabled) {
        logger.info(`Feature ${featureName} disabled, skipping handler`);
        return fallbackResponse || new Response('Not Found', { status: 404 });
      }

      // Feature is enabled, proceed with handler
      return handler(request, env, ctx);
    };
  };
};

/**
 * Creates a route-based feature guard
 * @param {Object} routeConfig - Route configuration with feature requirements
 * @returns {Function} Route guard middleware
 */
export const createRouteGuard = (routeConfig) => {
  return (handler) => {
    return async (request, env, ctx) => {
      // Check route-specific feature requirements
      for (const [feature, required] of Object.entries(routeConfig)) {
        if (required && !featureManager.isEnabled(feature)) {
          logger.warn(`Route blocked: missing required feature ${feature}`);
          return new Response(
            JSON.stringify({
              error: 'Feature required',
              feature,
              message: `This endpoint requires the ${feature} feature`
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      return handler(request, env, ctx);
    };
  };
};

/**
 * Creates an environment-based guard
 * @param {string[]} allowedEnvironments - Array of allowed environments
 * @returns {Function} Environment guard middleware
 */
export const createEnvironmentGuard = (allowedEnvironments = ['production', 'staging']) => {
  return (handler) => {
    return async (request, env, ctx) => {
      const currentEnv = env.ENVIRONMENT || env.NODE_ENV || 'development';

      if (!allowedEnvironments.includes(currentEnv)) {
        logger.warn(`Environment guard blocked: ${currentEnv} not in ${allowedEnvironments.join(', ')}`);
        return new Response('Not Found', { status: 404 });
      }

      return handler(request, env, ctx);
    };
  };
};

/**
 * Creates a rate limiting guard (basic implementation)
 * @param {Object} options - Rate limiting options
 * @returns {Function} Rate limiting middleware
 */
export const createRateLimitGuard = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  const requests = new Map();

  const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
  };

  return (handler) => {
    return async (request, env, ctx) => {
      // Skip rate limiting if feature is disabled
      if (!featureManager.isEnabled(COMMON_FEATURES.RATE_LIMITING)) {
        return handler(request, env, ctx);
      }

      const clientId = request.headers.get('CF-Connecting-IP') || 'anonymous';
      const now = Date.now();

      cleanup();

      const clientData = requests.get(clientId) || {
        count: 0,
        resetTime: now + windowMs
      };

      // Reset counter if window has passed
      if (now > clientData.resetTime) {
        clientData.count = 0;
        clientData.resetTime = now + windowMs;
      }

      clientData.count++;
      requests.set(clientId, clientData);

      // Check if limit exceeded
      if (clientData.count > maxRequests) {
        logger.warn(`Rate limit exceeded for ${clientId}`);
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
            }
          }
        );
      }

      const response = await handler(request, env, ctx);

      // Optionally skip successful/failed requests from count
      if ((skipSuccessfulRequests && response.ok) ||
          (skipFailedRequests && !response.ok)) {
        clientData.count--;
        requests.set(clientId, clientData);
      }

      return response;
    };
  };
};

/**
 * Creates CORS middleware
 * @param {Object} options - CORS options
 * @returns {Function} CORS middleware
 */
export const createCorsMiddleware = (options = {}) => {
  const {
    origins = ['*'],
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400
  } = options;

  return (handler) => {
    return async (request, env, ctx) => {
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('Origin');

        // Check if origin is allowed
        const isWildcard = origins.includes('*');
        const isOriginAllowed = isWildcard || (origin && origins.includes(origin));

        if (!isOriginAllowed) {
          return new Response('CORS policy violation: Origin not allowed', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        const allowedOrigin = isWildcard ? '*' : origin;

        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': methods.join(', '),
            'Access-Control-Allow-Headers': headers.join(', '),
            'Access-Control-Max-Age': maxAge.toString(),
            ...(credentials && { 'Access-Control-Allow-Credentials': 'true' })
          }
        });
      }

      // Handle actual requests
      const response = await handler(request, env, ctx);
      const origin = request.headers.get('Origin');

      // Add CORS headers to response only if origin is allowed
      const isWildcard = origins.includes('*');
      const isOriginAllowed = isWildcard || (origin && origins.includes(origin));

      if (isOriginAllowed) {
        const allowedOrigin = isWildcard ? '*' : origin;
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
        response.headers.set('Access-Control-Allow-Headers', headers.join(', '));

        if (credentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
      }

      return response;
    };
  };
};

/**
 * Creates error handling middleware
 * @param {Object} options - Error handling options
 * @returns {Function} Error handling middleware
 */
export const createErrorHandler = (options = {}) => {
  const {
    includeStack = false,
    logErrors = true,
    transformError = null
  } = options;

  return (handler) => {
    return async (request, env, ctx) => {
      try {
        return await handler(request, env, ctx);
      } catch (error) {
        if (logErrors) {
          logger.error(`Request error: ${error.message}`, {
            url: request.url,
            method: request.method,
            stack: includeStack ? error.stack : undefined
          });
        }

        // Transform error if transformer provided
        let errorResponse = {
          error: 'Internal Server Error',
          message: error.message,
          ...(includeStack && { stack: error.stack })
        };

        if (transformError) {
          errorResponse = transformError(error, errorResponse);
        }

        return new Response(
          JSON.stringify(errorResponse),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    };
  };
};

/**
 * Composes multiple middleware functions
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} Composed middleware
 */
export const composeMiddleware = (...middlewares) => {
  return middlewares.reduce((composed, middleware) => {
    return (handler) => middleware(composed(handler));
  });
};