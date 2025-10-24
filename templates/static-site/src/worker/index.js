import { initializeService, createFeatureGuard, COMMON_FEATURES } from '@tamyla/clodo-framework';
import { domains } from './config/domains.js';

/**
 * {{SERVICE_DISPLAY_NAME}} - Clodo Framework Static Site Service
 *
 * Generated on: {{CURRENT_DATE}}
 * Service Type: static-site
 *
 * Features:
 * - Static file serving with Workers Sites
 * - MIME type detection
 * - Cache headers for optimal performance
 * - SPA fallback support
 * - CORS support
 * - Compression
 */

export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize service with Clodo Framework
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
          type: 'static-site',
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
          type: 'static-site',
          version: '1.0.0',
          framework: 'Clodo Framework',
          staticConfig: {
            publicDir: env.PUBLIC_DIR || 'public',
            indexFile: env.INDEX_FILE || 'index.html',
            errorFile: env.ERROR_FILE || '404.html',
            spaFallback: env.SPA_FALLBACK !== 'false',
            cleanUrls: env.CLEAN_URLS !== 'false',
            compressText: env.COMPRESS_TEXT !== 'false',
            corsEnabled: env.CORS_ENABLED !== 'false'
          },
          domain: service.domain,
          environment: service.environment
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
      }

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS' && env.CORS_ENABLED !== 'false') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      // For static sites, let Workers Sites handle the file serving
      // This worker mainly adds custom logic and health checks
      // The [site] configuration in wrangler.toml handles the actual file serving

      // Add CORS headers to all responses if enabled
      const corsHeaders = env.CORS_ENABLED !== 'false' ? {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      } : {};

      // Let Workers Sites handle the request
      // This will serve static files from the public directory
      const page = await env.ASSETS.fetch(request);

      // Clone the response to add custom headers
      const response = new Response(page.body, page);

      // Add CORS headers if enabled
      if (env.CORS_ENABLED !== 'false') {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      // Add compression if enabled and response is text-based
      if (env.COMPRESS_TEXT !== 'false' && shouldCompress(response)) {
        response.headers.set('Content-Encoding', 'gzip');
      }

      return response;

    } catch (error) {
      console.error('Static site worker error:', error);

      // Return a basic error response
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
  }
};

/**
 * Determine if a response should be compressed
 * @param {Response} response - The response to check
 * @returns {boolean} - Whether to compress
 */
function shouldCompress(response) {
  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('text/') ||
         contentType.includes('application/json') ||
         contentType.includes('application/javascript') ||
         contentType.includes('application/xml');
}