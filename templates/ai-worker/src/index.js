/**
 * AI Worker Template — @tamyla/clodo-framework
 * 
 * A fully working Workers AI service with:
 * - Text generation (chat/completion)
 * - Streaming responses (SSE)
 * - Embeddings generation
 * - Prompt formatting
 * - CORS + error handling + rate limiting
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

import {
  AIClient,
  Models,
  createSSEStream,
  streamResponse
} from '@tamyla/clodo-framework/utilities/ai';

import { formatAIPrompt } from '@tamyla/clodo-framework/utilities';

// ── Environment validation ────────────────────────────────────────────
const envGuard = createEnvironmentGuard({
  required: ['AI'],
  optional: ['KV_DATA', 'VECTORIZE_INDEX']
});

// ── Middleware stack ──────────────────────────────────────────────────
const middleware = composeMiddleware(
  createCorsMiddleware({ origins: ['*'] }),
  createLogger({ prefix: 'ai-worker', level: 'info' }),
  createRateLimitGuard({ maxRequests: 50, windowMs: 60000 }),
  createErrorHandler({ includeStack: false })
);

// ── Routes ────────────────────────────────────────────────────────────
const routes = {
  // Health check
  'GET /health': async (req, env) => {
    return jsonResponse({ status: 'healthy', model: Models.CHAT });
  },

  // Chat completion (non-streaming)
  'POST /api/chat': async (req, env) => {
    const { messages, model, max_tokens } = await req.json();
    const ai = new AIClient(env.AI);

    const response = await ai.chat(messages || [], {
      model: model || Models.CHAT,
      max_tokens: max_tokens || 1024
    });

    return jsonResponse({ response: response.response, model: model || Models.CHAT });
  },

  // Chat completion (streaming SSE)
  'POST /api/chat/stream': async (req, env) => {
    const { messages, model, max_tokens } = await req.json();
    const ai = new AIClient(env.AI);

    const stream = await ai.run(model || Models.CHAT, {
      messages: messages || [],
      max_tokens: max_tokens || 1024,
      stream: true
    });

    return streamResponse(stream);
  },

  // Text generation from prompt template
  'POST /api/generate': async (req, env) => {
    const { prompt, context, model, max_tokens } = await req.json();
    const ai = new AIClient(env.AI);

    // Format the prompt with context variables
    const formattedPrompt = context ? formatAIPrompt(prompt, context) : prompt;

    const response = await ai.generate(formattedPrompt, {
      model: model || Models.TEXT_GENERATION,
      max_tokens: max_tokens || 2048
    });

    return jsonResponse({ response: response.response, prompt: formattedPrompt });
  },

  // Generate embeddings
  'POST /api/embeddings': async (req, env) => {
    const { text, texts, model } = await req.json();
    const ai = new AIClient(env.AI);

    const input = texts || [text];
    const embeddings = await ai.embed(input, {
      model: model || Models.EMBEDDINGS
    });

    return jsonResponse({
      embeddings: embeddings.data,
      model: model || Models.EMBEDDINGS,
      dimensions: embeddings.data?.[0]?.length || 0
    });
  },

  // Summarize text
  'POST /api/summarize': async (req, env) => {
    const { text, max_length } = await req.json();
    const ai = new AIClient(env.AI);

    const result = await ai.summarize(text, {
      max_length: max_length || 256
    });

    return jsonResponse({ summary: result.summary });
  },

  // List available models
  'GET /api/models': async (req, env) => {
    return jsonResponse({
      models: Object.entries(Models).map(([key, value]) => ({
        name: key,
        model: value
      }))
    });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── Worker entry point ────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    envGuard.check(env);

    const url = new URL(request.url);
    const routeKey = `${request.method} ${url.pathname}`;
    const handler = routes[routeKey];

    if (!handler) {
      return jsonResponse({ error: 'Not Found', path: url.pathname }, 404);
    }

    // Execute through middleware chain
    return middleware.execute(request, () => handler(request, env, ctx));
  }
};
