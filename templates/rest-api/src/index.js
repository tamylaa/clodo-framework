/**
 * REST API Worker Template — @tamyla/clodo-framework
 * 
 * A fully working REST API worker with CRUD routes, KV storage,
 * CORS, error handling, rate limiting, and health checks.
 * 
 * Deploy with: npx wrangler deploy
 */

import {
  EnhancedRouter,
  createCorsMiddleware,
  createErrorHandler,
  createLogger,
  createRateLimitGuard,
  composeMiddleware,
  HealthChecker,
  createEnvironmentGuard
} from '@tamyla/clodo-framework';

import { getKV, putKV, listKV } from '@tamyla/clodo-framework/utilities';

// ── Environment validation ────────────────────────────────────────────
const envGuard = createEnvironmentGuard({
  required: ['KV_DATA'],
  optional: ['SECRET_KEY', 'DEBUG']
});

// ── Router setup ──────────────────────────────────────────────────────
const router = new EnhancedRouter(null, { autoRegisterGenericRoutes: false });

// Apply middleware stack
router.use(composeMiddleware(
  createCorsMiddleware({ origins: ['*'] }),
  createLogger({ prefix: 'api', level: 'info' }),
  createRateLimitGuard({ maxRequests: 100, windowMs: 60000 }),
  createErrorHandler({ includeStack: false })
));

// ── Health check ──────────────────────────────────────────────────────
const healthChecker = new HealthChecker();
healthChecker.addCheck('kv', async (env) => {
  try {
    await env.KV_DATA.get('__health_check__');
    return { status: 'healthy' };
  } catch (e) {
    return { status: 'unhealthy', error: e.message };
  }
});

// ── Routes ────────────────────────────────────────────────────────────

router.get('/health', async (request, env) => {
  const result = await healthChecker.runChecks();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.get('/api/items', async (request, env) => {
  const list = await listKV(env.KV_DATA, { prefix: 'item:' });
  const items = await Promise.all(
    (list.keys || []).map(async (k) => {
      const val = await getKV(env.KV_DATA, k.name, { type: 'json' });
      return val;
    })
  );
  return new Response(JSON.stringify({ items, count: items.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.get('/api/items/:id', async (request, env) => {
  const id = request.params?.id;
  const item = await getKV(env.KV_DATA, `item:${id}`, { type: 'json' });
  if (!item) {
    return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
  }
  return new Response(JSON.stringify(item), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.post('/api/items', async (request, env) => {
  const body = await request.json();
  const id = crypto.randomUUID();
  const item = { id, ...body, createdAt: new Date().toISOString() };
  await putKV(env.KV_DATA, `item:${id}`, JSON.stringify(item));
  return new Response(JSON.stringify(item), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
});

router.put('/api/items/:id', async (request, env) => {
  const id = request.params?.id;
  const existing = await getKV(env.KV_DATA, `item:${id}`, { type: 'json' });
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
  }
  const body = await request.json();
  const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
  await putKV(env.KV_DATA, `item:${id}`, JSON.stringify(updated));
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.delete('/api/items/:id', async (request, env) => {
  const id = request.params?.id;
  await env.KV_DATA.delete(`item:${id}`);
  return new Response(JSON.stringify({ deleted: true, id }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// ── Worker entry point ────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    envGuard.check(env);
    const url = new URL(request.url);
    return router.handleRequest(request.method, url.pathname, request, env, ctx);
  }
};
