/**
 * Minimal Worker Template — @tamyla/clodo-framework
 * 
 * The absolute minimal starting point. Just a fetch handler,
 * CORS, and a health check. Add what you need.
 * 
 * Deploy with: npx wrangler deploy
 */

import {
  createCorsMiddleware,
  createErrorHandler,
  composeMiddleware
} from '@tamyla/clodo-framework';

const middleware = composeMiddleware(
  createCorsMiddleware({ origins: ['*'] }),
  createErrorHandler()
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    return middleware.execute(request, async () => {
      if (url.pathname === '/health') {
        return Response.json({ status: 'healthy', timestamp: new Date().toISOString() });
      }

      if (url.pathname === '/') {
        return Response.json({
          name: '{{SERVICE_NAME}}',
          message: 'Worker is running. Edit src/index.js to add your routes.'
        });
      }

      return Response.json({ error: 'Not Found' }, { status: 404 });
    });
  }
};
