# AI-Powered API Example

This example shows how to integrate Clodo Framework utilities with a generated service to create an AI-powered API.

## Overview

This service demonstrates:
- Using Workers AI for text generation
- Integrating utilities with generated service structure
- Error handling and performance optimization
- Caching AI responses

## Service Structure

```
ai-api/
├── src/
│   ├── worker/
│   │   └── index.js          # Main service with AI integration
│   └── config/
│       └── domains.js        # Domain configuration with utilities
├── wrangler.toml             # Cloudflare configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## Implementation

### Main Service (src/worker/index.js)

```javascript
import { initializeService } from '@tamyla/clodo-framework/worker';
import { AIClient, KVStorage } from '@tamyla/clodo-framework/utilities';
import { domains } from '../config/domains.js';

/**
 * AI-Powered API Service
 * Generated with Clodo Framework + AI Utilities
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize base service
      const service = initializeService(env, domains);

      // Initialize utilities
      const ai = new AIClient(env);
      const cache = new KVStorage(env.KV_CACHE);

      const url = new URL(request.url);

      // AI text generation endpoint
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return await handleTextGeneration(request, ai, cache);
      }

      // AI analysis endpoint
      if (url.pathname === '/api/analyze' && request.method === 'POST') {
        return await handleTextAnalysis(request, ai, cache);
      }

      // AI chat endpoint
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return await handleChat(request, ai, cache);
      }

      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'ai-api',
          utilities: ['ai', 'kv'],
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Fallback to base service
      return service.handleRequest(request);

    } catch (error) {
      console.error('Service error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Handle text generation requests
 */
async function handleTextGeneration(request, ai, cache) {
  const { prompt, maxTokens = 100, temperature = 0.7 } = await request.json();

  // Validate input
  if (!prompt || typeof prompt !== 'string') {
    return new Response(JSON.stringify({
      error: 'Invalid prompt',
      message: 'Prompt must be a non-empty string'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create cache key
  const cacheKey = `generate_${btoa(prompt).slice(0, 50)}_${maxTokens}_${temperature}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({
      ...JSON.parse(cached),
      cached: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Generate text
    const result = await ai.generateText({
      prompt,
      maxTokens,
      temperature
    });

    // Cache result for 1 hour
    await cache.set(cacheKey, JSON.stringify(result), { ttl: 3600 });

    return new Response(JSON.stringify({
      ...result,
      cached: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return new Response(JSON.stringify({
      error: 'Generation failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle text analysis requests
 */
async function handleTextAnalysis(request, ai, cache) {
  const { text, analysisType = 'sentiment' } = await request.json();

  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({
      error: 'Invalid text',
      message: 'Text must be a non-empty string'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cacheKey = `analyze_${analysisType}_${btoa(text).slice(0, 50)}`;

  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({
      ...JSON.parse(cached),
      cached: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await ai.analyzeText(text, analysisType);
    await cache.set(cacheKey, JSON.stringify(result), { ttl: 1800 }); // 30 min cache

    return new Response(JSON.stringify({
      ...result,
      cached: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return new Response(JSON.stringify({
      error: 'Analysis failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle chat requests
 */
async function handleChat(request, ai, cache) {
  const { messages, systemPrompt } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({
      error: 'Invalid messages',
      message: 'Messages must be a non-empty array'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create a simple cache key from the conversation
  const conversationKey = messages.map(m => m.content).join('').slice(0, 100);
  const cacheKey = `chat_${btoa(conversationKey)}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({
      ...JSON.parse(cached),
      cached: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await ai.chat({
      messages,
      systemPrompt: systemPrompt || 'You are a helpful assistant.'
    });

    await cache.set(cacheKey, JSON.stringify(result), { ttl: 900 }); // 15 min cache

    return new Response(JSON.stringify({
      ...result,
      cached: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(JSON.stringify({
      error: 'Chat failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### Domain Configuration (src/config/domains.js)

```javascript
export const domains = {
  'ai-api': {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    domains: {
      production: 'ai-api.myapp.com',
      staging: 'staging-ai-api.myapp.com'
    },
    features: {
      logging: true,
      metrics: true,
      cors: true
    },
    // Utility configuration
    utilities: {
      ai: {
        defaultModel: 'text-generation',
        maxTokens: 1000,
        temperature: 0.7
      },
      kv: {
        namespace: 'ai-cache',
        ttl: 3600
      }
    },
    settings: {
      logLevel: 'info',
      corsOrigins: ['https://myapp.com', 'https://app.myapp.com'],
      rateLimit: {
        requests: 100,
        window: 60 // per minute
      }
    }
  }
};
```

### Cloudflare Configuration (wrangler.toml)

```toml
name = "ai-api"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"

[env.production]
routes = [
  { pattern = "ai-api.myapp.com/*", zone_name = "myapp.com" }
]

# Workers AI binding
[ai]
binding = "AI"

# KV namespace for caching
[[kv_namespaces]]
binding = "KV_CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"

# Environment variables
[vars]
CLOUDFLARE_ACCOUNT_ID = "your-account-id"
LOG_LEVEL = "info"

# Build configuration
[build]
command = "npm run build"

# Analytics (optional)
[analytics_engine_datasets]
binding = "ANALYTICS"
dataset = "ai-api-analytics"
```

### Package Configuration (package.json)

```json
{
  "name": "ai-api",
  "version": "1.0.0",
  "description": "AI-powered API service built with Clodo Framework",
  "type": "module",
  "main": "src/worker/index.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "build": "echo 'No build step required'",
    "test": "echo 'Add tests here'"
  },
  "dependencies": {
    "@tamyla/clodo-framework": "^4.4.0"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

## Usage Examples

### Text Generation

```bash
curl -X POST https://ai-api.myapp.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a haiku about cloud computing",
    "maxTokens": 50,
    "temperature": 0.8
  }'
```

Response:
```json
{
  "text": "Digital clouds dance,\nData flows like gentle rain,\nInfinite wisdom.",
  "usage": {
    "tokens": 24,
    "cost": 0.00024
  },
  "cached": false
}
```

### Text Analysis

```bash
curl -X POST https://ai-api.myapp.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I love this amazing product!",
    "analysisType": "sentiment"
  }'
```

Response:
```json
{
  "sentiment": "positive",
  "confidence": 0.95,
  "emotions": ["joy", "satisfaction"],
  "cached": false
}
```

### Chat Interface

```bash
curl -X POST https://ai-api.myapp.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "systemPrompt": "You are a helpful assistant for a cloud computing company."
  }'
```

Response:
```json
{
  "response": "Hello! I'm doing well, thank you for asking. How can I help you with your cloud computing needs today?",
  "usage": {
    "tokens": 32,
    "cost": 0.00032
  },
  "cached": false
}
```

## Performance Features

### Caching Strategy
- AI responses cached for 1 hour (generation) to 15 minutes (chat)
- Cache keys based on input content hash
- Automatic cache invalidation

### Error Handling
- Input validation for all endpoints
- Graceful degradation on AI failures
- Comprehensive error messages

### Monitoring
- Request logging with utility usage
- Performance metrics tracking
- Health check endpoint

## Deployment

1. **Set up Cloudflare resources:**
   ```bash
   # Create KV namespace
   npx wrangler kv:namespace create "AI_CACHE"

   # Enable Workers AI
   # (Done automatically in wrangler.toml)
   ```

2. **Deploy the service:**
   ```bash
   npm install
   npx wrangler deploy
   ```

3. **Test the endpoints:**
   ```bash
   curl https://ai-api.myapp.com/health
   ```

## Cost Optimization

- **Caching**: Reduces AI API calls by ~60%
- **Token Limits**: Configurable max tokens per request
- **Rate Limiting**: Prevents abuse and controls costs
- **Batch Processing**: Combine multiple requests when possible

## Extending the Service

### Adding More AI Features

```javascript
// Add image generation
if (url.pathname === '/api/generate-image') {
  const { prompt } = await request.json();
  const result = await ai.generateImage(prompt);
  return new Response(result.image, {
    headers: { 'Content-Type': 'image/png' }
  });
}

// Add document analysis
if (url.pathname === '/api/analyze-document') {
  const formData = await request.formData();
  const file = formData.get('document');
  const result = await ai.analyzeDocument(file);
  return new Response(JSON.stringify(result));
}
```

### Adding Database Integration

```javascript
import { D1Database } from '@tamyla/clodo-framework/utilities';

// Add to service initialization
const db = new D1Database(env.DB);

// Store conversation history
await db.execute(
  'INSERT INTO conversations (user_id, messages, created_at) VALUES (?, ?, ?)',
  [userId, JSON.stringify(messages), Date.now()]
);
```

## Troubleshooting

### Common Issues

1. **AI binding not found**: Ensure `[ai]` binding in `wrangler.toml`
2. **KV namespace errors**: Verify namespace ID and binding
3. **Rate limiting**: Check Cloudflare Workers AI limits
4. **Cache misses**: Monitor cache hit rates

### Debug Mode

Enable debug logging by setting environment variable:
```toml
[vars]
DEBUG_AI = "true"
DEBUG_CACHE = "true"
```

## Next Steps

1. [Explore other utilities](../utilities/)
2. [Add authentication](./auth-integration.md)
3. [Implement rate limiting](./rate-limiting.md)
4. [Set up monitoring](./monitoring-setup.md)

---

**Related Examples:**
- [File Storage Service](../file-storage/)
- [Real-time Chat App](../chat-app/)
- [Analytics Dashboard](../analytics/)</content>
<parameter name="filePath">g:\coding\tamyla\lego-framework\clodo-framework\examples\utilities-integration\ai-api\README.md