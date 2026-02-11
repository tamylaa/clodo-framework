/**
 * Edge Proxy Worker Template — @tamyla/clodo-framework
 * 
 * An edge proxy/gateway with:
 * - Request rewriting & URL mapping
 * - Response caching (Cache API)
 * - Rate limiting
 * - Header manipulation
 * - A/B routing
 * 
 * Deploy with: npx wrangler deploy
 */

import {
  createCorsMiddleware,
  createErrorHandler,
  createLogger,
  createRateLimitGuard,
  composeMiddleware,
  createEnvironmentGuard
} from '@tamyla/clodo-framework';

// ── Environment ──────────────────────────────────────────────────────
const envGuard = createEnvironmentGuard({
  required: [],
  optional: ['KV_CONFIG', 'UPSTREAM_URL']
});

const middleware = composeMiddleware(
  createCorsMiddleware({ origins: ['*'] }),
  createLogger({ prefix: 'edge-proxy' }),
  createRateLimitGuard({ maxRequests: 200, windowMs: 60000 }),
  createErrorHandler({ includeStack: false })
);

// ── Route mapping (path rewrites) ────────────────────────────────────
const routeMap = {
  // Rewrite /api/* to upstream service
  '/api/': {
    upstream: 'https://api.example.com',
    stripPrefix: '/api',
    headers: { 'X-Forwarded-By': 'clodo-proxy' }
  },
  // Serve static assets from R2/another origin
  '/assets/': {
    upstream: 'https://cdn.example.com',
    stripPrefix: '',
    cache: { ttl: 86400 } // Cache for 24h
  }
};

// ── Proxy logic ──────────────────────────────────────────────────────
async function proxyRequest(request, env, ctx) {
  const url = new URL(request.url);

  // Find matching route
  let matchedRoute = null;
  let matchedPrefix = '';

  for (const [prefix, config] of Object.entries(routeMap)) {
    if (url.pathname.startsWith(prefix)) {
      matchedRoute = config;
      matchedPrefix = prefix;
      break;
    }
  }

  if (!matchedRoute) {
    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'healthy', type: 'edge-proxy' });
    }

    // No route matched
    return Response.json({ error: 'No route matched', path: url.pathname }, { status: 404 });
  }

  // Build upstream URL
  const upstreamBase = env.UPSTREAM_URL || matchedRoute.upstream;
  const strippedPath = matchedRoute.stripPrefix
    ? url.pathname.replace(matchedPrefix, matchedRoute.stripPrefix || '/')
    : url.pathname;
  const upstreamUrl = new URL(strippedPath + url.search, upstreamBase);

  // Check cache first
  if (matchedRoute.cache && request.method === 'GET') {
    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl.toString(), request);
    const cached = await cache.match(cacheKey);

    if (cached) {
      const response = new Response(cached.body, cached);
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
  }

  // Build upstream request
  const headers = new Headers(request.headers);

  // Add custom headers
  if (matchedRoute.headers) {
    for (const [key, value] of Object.entries(matchedRoute.headers)) {
      headers.set(key, value);
    }
  }

  // Forward the original host
  headers.set('X-Forwarded-Host', url.hostname);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  const upstreamRequest = new Request(upstreamUrl.toString(), {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow'
  });

  // Fetch from upstream
  const response = await fetch(upstreamRequest);

  // Create mutable response
  const proxyResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });

  proxyResponse.headers.set('X-Cache', 'MISS');
  proxyResponse.headers.set('X-Proxy', 'clodo-edge-proxy');

  // Cache response if configured
  if (matchedRoute.cache && request.method === 'GET' && response.ok) {
    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl.toString(), request);
    const toCache = proxyResponse.clone();
    toCache.headers.set('Cache-Control', `public, max-age=${matchedRoute.cache.ttl}`);
    ctx.waitUntil(cache.put(cacheKey, toCache));
  }

  return proxyResponse;
}

// ── Worker entry point ────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    envGuard.check(env);
    return middleware.execute(request, () => proxyRequest(request, env, ctx));
  }
};
