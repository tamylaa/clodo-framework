import { initializeService, createFeatureGuard, COMMON_FEATURES } from '@tamyla/lego-framework';
import { domains } from './config/domains.js';

/**
 * {{SERVICE_DISPLAY_NAME}} - Lego Framework Service
 *
 * Generated on: {{CURRENT_DATE}}
 * Service Type: {{SERVICE_TYPE}}
 */

export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize service with Lego Framework
      const service = initializeService(env, domains);

      // Log request (if logging is enabled)
      if (service.features.includes(COMMON_FEATURES.LOGGING)) {
        console.log(`${request.method} ${request.url} - ${service.domain} (${service.environment})`);
      }

      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: '{{SERVICE_NAME}}',
          version: '1.0.0',
          type: '{{SERVICE_TYPE}}',
          features: service.features,
          domain: service.domain,
          environment: service.environment,
          timestamp: new Date().toISOString()
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      }

      // Service information endpoint
      if (url.pathname === '/info') {
        return new Response(JSON.stringify({
          name: '{{SERVICE_NAME}}',
          displayName: '{{SERVICE_DISPLAY_NAME}}',
          type: '{{SERVICE_TYPE}}',
          version: '1.0.0',
          framework: 'Lego Framework',
          frameworkVersion: '{{FRAMEWORK_VERSION}}',
          domain: service.domain,
          environment: service.environment,
          features: service.features
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add your service-specific routes here
      // Example routes for different service types:

      // Data Service Routes (uncomment and implement for data-service type)
      // if (url.pathname.startsWith('/api/data')) {
      //   return handleDataRoutes(request, env, ctx, service);
      // }

      // Auth Service Routes (uncomment and implement for auth-service type)
      // if (url.pathname.startsWith('/auth')) {
      //   return handleAuthRoutes(request, env, ctx, service);
      // }

      // Content Service Routes (uncomment and implement for content-service type)
      // if (url.pathname.startsWith('/content')) {
      //   return handleContentRoutes(request, env, ctx, service);
      // }

      // API Gateway Routes (uncomment and implement for api-gateway type)
      // return handleGatewayRoutes(request, env, ctx, service);

      // Default response for unmatched routes
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        service: '{{SERVICE_NAME}}',
        availableEndpoints: [
          '/health',
          '/info'
          // Add your endpoints here
        ]
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Service error:', error);

      // Return appropriate error response
      const errorResponse = {
        error: 'Internal Server Error',
        message: error.message,
        service: '{{SERVICE_NAME}}',
        timestamp: new Date().toISOString()
      };

      // Include stack trace in development
      if (env.ENVIRONMENT === 'development') {
        errorResponse.stack = error.stack;
      }

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Placeholder route handlers - implement these based on your service needs

async function handleDataRoutes(request, env, ctx, service) {
  const url = new URL(request.url);

  switch (request.method) {
    case 'GET':
      if (url.pathname === '/api/data') {
        // Return data list
        return new Response(JSON.stringify({
          data: [],
          message: 'Data endpoint - implement your data retrieval logic'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      break;

    case 'POST':
      if (url.pathname === '/api/data') {
        // Create new data
        return new Response(JSON.stringify({
          success: true,
          message: 'Data creation endpoint - implement your creation logic'
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      break;
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleAuthRoutes(request, env, ctx, service) {
  // Implement authentication routes
  return new Response(JSON.stringify({
    message: 'Auth service - implement authentication logic'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleContentRoutes(request, env, ctx, service) {
  // Implement content management routes
  return new Response(JSON.stringify({
    message: 'Content service - implement content management logic'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGatewayRoutes(request, env, ctx, service) {
  // Implement API gateway logic
  return new Response(JSON.stringify({
    message: 'API Gateway - implement routing logic'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}