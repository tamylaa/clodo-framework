/**
 * Queue Processor Worker Template — @tamyla/clodo-framework
 * 
 * A fully working queue consumer/producer with:
 * - Queue message consumption with batch processing
 * - Dead letter queue handling
 * - Retry logic with exponential backoff
 * - KV state tracking
 * - HTTP API for sending messages
 * 
 * Deploy with: npx wrangler deploy
 */

import {
  createCorsMiddleware,
  createErrorHandler,
  createLogger,
  composeMiddleware,
  createEnvironmentGuard
} from '@tamyla/clodo-framework';

import {
  QueueProducer,
  QueueConsumer,
  MessageBuilder,
  MessageTypes
} from '@tamyla/clodo-framework/utilities';

// ── Environment validation ────────────────────────────────────────────
const envGuard = createEnvironmentGuard({
  required: ['QUEUE'],
  optional: ['KV_DATA', 'DEAD_LETTER_QUEUE']
});

// ── Middleware ────────────────────────────────────────────────────────
const middleware = composeMiddleware(
  createCorsMiddleware({ origins: ['*'] }),
  createLogger({ prefix: 'queue-worker' }),
  createErrorHandler()
);

// ── Message handlers (register per message type) ─────────────────────
const handlers = {
  /**
   * Process a generic task message
   */
  async 'task.process'(message, env) {
    const { taskId, payload } = message.body;
    console.log(`Processing task ${taskId}:`, payload);

    // Your business logic here
    // Example: call an API, transform data, update a database

    // Track completion in KV if available
    if (env.KV_DATA) {
      await env.KV_DATA.put(`task:${taskId}`, JSON.stringify({
        status: 'completed',
        completedAt: new Date().toISOString(),
        result: { processed: true }
      }));
    }
  },

  /**
   * Process a notification message
   */
  async 'notification.send'(message, env) {
    const { recipient, subject, body } = message.body;
    console.log(`Sending notification to ${recipient}: ${subject}`);
    // Your notification logic here (email, webhook, push, etc.)
  },

  /**
   * Default handler for unknown message types
   */
  async 'default'(message, env) {
    console.warn(`Unknown message type: ${message.body?.type}`, message.body);
  }
};

// ── Queue consumer logic ─────────────────────────────────────────────
async function processMessage(message, env) {
  const type = message.body?.type || 'default';
  const handler = handlers[type] || handlers['default'];

  const maxRetries = message.body?.maxRetries || 3;
  const attempt = message.body?._attempt || 1;

  try {
    await handler(message, env);
    message.ack(); // Acknowledge successful processing
  } catch (error) {
    console.error(`Failed to process message (attempt ${attempt}/${maxRetries}):`, error.message);

    if (attempt >= maxRetries) {
      // Max retries exceeded — send to dead letter queue if available
      if (env.DEAD_LETTER_QUEUE) {
        await env.DEAD_LETTER_QUEUE.send({
          ...message.body,
          _error: error.message,
          _failedAt: new Date().toISOString(),
          _attempts: attempt
        });
      }

      // Track failure in KV
      if (env.KV_DATA && message.body?.taskId) {
        await env.KV_DATA.put(`task:${message.body.taskId}`, JSON.stringify({
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString(),
          attempts: attempt
        }));
      }

      message.ack(); // Remove from queue after max retries
    } else {
      message.retry({ delaySeconds: Math.pow(2, attempt) * 10 }); // Exponential backoff
    }
  }
}

// ── HTTP Routes (for sending messages) ───────────────────────────────
const routes = {
  'GET /health': async (req, env) => {
    return jsonResponse({ status: 'healthy', type: 'queue-processor' });
  },

  'POST /api/enqueue': async (req, env) => {
    const body = await req.json();
    const message = {
      type: body.type || 'task.process',
      taskId: body.taskId || crypto.randomUUID(),
      payload: body.payload || body,
      _attempt: 1,
      enqueuedAt: new Date().toISOString()
    };

    await env.QUEUE.send(message);

    return jsonResponse({
      queued: true,
      taskId: message.taskId,
      type: message.type
    }, 202);
  },

  'POST /api/enqueue/batch': async (req, env) => {
    const { messages } = await req.json();
    const batch = messages.map(m => ({
      body: {
        type: m.type || 'task.process',
        taskId: m.taskId || crypto.randomUUID(),
        payload: m.payload || m,
        _attempt: 1,
        enqueuedAt: new Date().toISOString()
      }
    }));

    await env.QUEUE.sendBatch(batch);

    return jsonResponse({
      queued: true,
      count: batch.length,
      taskIds: batch.map(b => b.body.taskId)
    }, 202);
  },

  'GET /api/task/:taskId': async (req, env) => {
    if (!env.KV_DATA) {
      return jsonResponse({ error: 'KV storage not configured' }, 501);
    }
    const taskId = req.params?.taskId;
    const data = await env.KV_DATA.get(`task:${taskId}`, { type: 'json' });
    if (!data) {
      return jsonResponse({ error: 'Task not found' }, 404);
    }
    return jsonResponse({ taskId, ...data });
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── Worker entry point ────────────────────────────────────────────────
export default {
  // HTTP handler
  async fetch(request, env, ctx) {
    envGuard.check(env);
    const url = new URL(request.url);
    const routeKey = `${request.method} ${url.pathname}`;
    const handler = routes[routeKey];

    if (!handler) {
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    return middleware.execute(request, () => handler(request, env, ctx));
  },

  // Queue consumer handler
  async queue(batch, env, ctx) {
    console.log(`Processing batch of ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      await processMessage(message, env);
    }
  }
};
