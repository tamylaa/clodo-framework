# Utilities Integration Guide

## Overview

This guide shows how to integrate Clodo Framework utilities with your generated services. Utilities are optional extensions that add powerful Cloudflare features to your applications.

## Integration Patterns

### Pattern 1: Import and Use (Simple)

```javascript
// In your generated service (src/worker/index.js)
import { initializeService } from '@tamyla/clodo-framework/worker';
import { R2Storage, AIClient } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    const service = initializeService(env, domains);

    // Add utilities to your service
    const storage = new R2Storage(env.R2_BUCKET);
    const ai = new AIClient(env);

    // Use utilities in your request handling
    if (request.method === 'POST' && request.url.includes('/upload')) {
      const formData = await request.formData();
      const file = formData.get('file');

      // Store file in R2
      const result = await storage.upload(file.name, file);

      return new Response(JSON.stringify({
        success: true,
        fileId: result.id,
        url: result.url
      }));
    }

    if (request.url.includes('/analyze')) {
      const data = await request.json();

      // Use AI for analysis
      const analysis = await ai.analyze(data.content);

      return new Response(JSON.stringify(analysis));
    }

    // Fall back to normal service handling
    return service.handleRequest(request);
  }
};
```

### Pattern 2: Service Enhancement (Advanced)

```javascript
// Create a service enhancer
import { initializeService } from '@tamyla/clodo-framework/worker';
import {
  R2Storage,
  KVStorage,
  AIClient,
  VectorStore
} from '@tamyla/clodo-framework/utilities';

class EnhancedService {
  constructor(env, domains) {
    this.baseService = initializeService(env, domains);

    // Initialize utilities
    this.storage = new R2Storage(env.R2_BUCKET);
    this.cache = new KVStorage(env.KV_CACHE);
    this.ai = new AIClient(env);
    this.vectorStore = new VectorStore(env.VECTORIZE_INDEX);
  }

  async handleRequest(request) {
    const url = new URL(request.url);

    // AI-powered endpoints
    if (url.pathname.startsWith('/api/ai/')) {
      return this.handleAIRequest(request);
    }

    // File operations
    if (url.pathname.startsWith('/api/files/')) {
      return this.handleFileRequest(request);
    }

    // Cached data
    if (url.pathname.startsWith('/api/cache/')) {
      return this.handleCacheRequest(request);
    }

    // Vector search
    if (url.pathname.startsWith('/api/search/')) {
      return this.handleSearchRequest(request);
    }

    // Default to base service
    return this.baseService.handleRequest(request);
  }

  async handleAIRequest(request) {
    try {
      const data = await request.json();
      const result = await this.ai.process(data);
      return new Response(JSON.stringify(result));
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500
      });
    }
  }

  async handleFileRequest(request) {
    const method = request.method;
    const url = new URL(request.url);
    const fileId = url.pathname.split('/').pop();

    switch (method) {
      case 'GET':
        const file = await this.storage.download(fileId);
        return new Response(file.body, {
          headers: { 'Content-Type': file.contentType }
        });

      case 'POST':
        const formData = await request.formData();
        const file = formData.get('file');
        const result = await this.storage.upload(file.name, file);
        return new Response(JSON.stringify(result));

      case 'DELETE':
        await this.storage.delete(fileId);
        return new Response(JSON.stringify({ success: true }));
    }
  }

  async handleCacheRequest(request) {
    const method = request.method;
    const url = new URL(request.url);
    const key = url.pathname.split('/').pop();

    switch (method) {
      case 'GET':
        const cached = await this.cache.get(key);
        return new Response(JSON.stringify({ data: cached }));

      case 'PUT':
        const data = await request.json();
        await this.cache.set(key, data.value, { ttl: data.ttl });
        return new Response(JSON.stringify({ success: true }));

      case 'DELETE':
        await this.cache.delete(key);
        return new Response(JSON.stringify({ success: true }));
    }
  }

  async handleSearchRequest(request) {
    const { query, limit = 10 } = await request.json();

    // Generate embedding for query
    const queryEmbedding = await this.ai.generateEmbedding(query);

    // Search vector store
    const results = await this.vectorStore.query(queryEmbedding, limit);

    return new Response(JSON.stringify({ results }));
  }
}

// Use enhanced service
export default {
  async fetch(request, env, ctx) {
    const service = new EnhancedService(env, domains);
    return service.handleRequest(request);
  }
};
```

## Configuration Setup

### Environment Variables

Add these to your `wrangler.toml`:

```toml
# R2 Storage
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "my-data-bucket"

# KV Storage
[[kv_namespaces]]
binding = "KV_CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"

# Workers AI
[ai]
binding = "AI"

# Vectorize
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "my-vector-index"

# D1 Database (if using)
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

# Queues (if using)
[[queues.producers]]
binding = "MY_QUEUE"
queue = "my-queue"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 10
dead_letter_queue = "my-queue-dlq"
```

### Domain Configuration

Update your domain config to include utility settings:

```javascript
// config/domains.js
export const domains = {
  'my-app': {
    accountId: 'your-account-id',
    domains: {
      production: 'api.myapp.com',
      staging: 'staging-api.myapp.com'
    },
    features: {
      logging: true,
      metrics: true,
      cors: true
    },
    // Add utility configuration
    utilities: {
      r2: {
        bucket: 'my-data-bucket',
        region: 'auto'
      },
      kv: {
        namespace: 'my-cache',
        ttl: 3600
      },
      ai: {
        defaultModel: 'text-generation',
        maxTokens: 1000
      },
      vectorize: {
        index: 'my-vector-index',
        dimensions: 768
      }
    },
    settings: {
      logLevel: 'info',
      corsOrigins: ['https://myapp.com']
    }
  }
};
```

## CLI Integration

### Creating Services with Utilities

```bash
# Create service and specify utilities
npx clodo-service create my-service \
  --utilities r2,kv,ai \
  --domain myapp.com

# This will:
# 1. Generate the base service
# 2. Add utility imports
# 3. Configure wrangler.toml
# 4. Create utility examples
```

### Adding Utilities to Existing Services

```bash
# Add utilities to existing service
npx clodo-service enhance my-service \
  --add-utilities vectorize,email

# This will:
# 1. Update package.json imports
# 2. Modify wrangler.toml
# 3. Add utility code examples
# 4. Update documentation
```

## Error Handling

### Utility-Specific Errors

```javascript
import { R2Storage, AIClient } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    try {
      const storage = new R2Storage(env.R2_BUCKET);
      const ai = new AIClient(env);

      // Your logic here
      const result = await storage.upload('file.txt', 'content');
      const analysis = await ai.analyze('some text');

      return new Response(JSON.stringify({ result, analysis }));

    } catch (error) {
      // Handle different error types
      if (error.name === 'R2Error') {
        return new Response(JSON.stringify({
          error: 'Storage operation failed',
          details: error.message
        }), { status: 500 });
      }

      if (error.name === 'AIError') {
        return new Response(JSON.stringify({
          error: 'AI processing failed',
          details: error.message
        }), { status: 500 });
      }

      // Generic error
      return new Response(JSON.stringify({
        error: 'Service error',
        details: error.message
      }), { status: 500 });
    }
  }
};
```

### Circuit Breaker Pattern

```javascript
import { AIClient } from '@tamyla/clodo-framework/utilities';

class ResilientAIClient {
  constructor(env) {
    this.client = new AIClient(env);
    this.failures = 0;
    this.lastFailure = 0;
    this.circuitOpen = false;
  }

  async analyze(text) {
    if (this.circuitOpen) {
      if (Date.now() - this.lastFailure > 60000) { // 1 minute timeout
        this.circuitOpen = false;
        this.failures = 0;
      } else {
        throw new Error('AI service temporarily unavailable');
      }
    }

    try {
      const result = await this.client.analyze(text);
      this.failures = 0; // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= 3) {
        this.circuitOpen = true;
      }

      throw error;
    }
  }
}
```

## Performance Optimization

### Caching Strategy

```javascript
import { KVStorage, AIClient } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    const cache = new KVStorage(env.KV_CACHE);
    const ai = new AIClient(env);

    const cacheKey = `ai_${request.url}_${Date.now()}`;

    // Check cache first
    let result = await cache.get(cacheKey);
    if (result) {
      return new Response(JSON.stringify(result), {
        headers: { 'X-Cache': 'HIT' }
      });
    }

    // Generate AI response
    result = await ai.analyze(await request.text());

    // Cache for 1 hour
    await cache.set(cacheKey, result, { ttl: 3600 });

    return new Response(JSON.stringify(result), {
      headers: { 'X-Cache': 'MISS' }
    });
  }
};
```

### Batch Processing

```javascript
import { VectorStore, AIClient } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    const vectorStore = new VectorStore(env.VECTORIZE_INDEX);
    const ai = new AIClient(env);

    if (request.method === 'POST') {
      const { documents } = await request.json();

      // Batch process documents
      const embeddings = [];
      for (const doc of documents) {
        const embedding = await ai.generateEmbedding(doc.content);
        embeddings.push({
          id: doc.id,
          values: embedding,
          metadata: { text: doc.content }
        });
      }

      // Batch insert into vector store
      await vectorStore.insert(embeddings);

      return new Response(JSON.stringify({
        success: true,
        processed: documents.length
      }));
    }
  }
};
```

## Testing Utilities

### Unit Tests

```javascript
// test/utilities.test.js
import { R2Storage, KVStorage } from '@tamyla/clodo-framework/utilities';

describe('Utilities Integration', () => {
  let storage;
  let cache;

  beforeEach(() => {
    // Mock environment
    const mockEnv = {
      R2_BUCKET: { /* mock R2 binding */ },
      KV_CACHE: { /* mock KV binding */ }
    };

    storage = new R2Storage(mockEnv.R2_BUCKET);
    cache = new KVStorage(mockEnv.KV_CACHE);
  });

  test('storage operations', async () => {
    const result = await storage.upload('test.txt', 'content');
    expect(result.id).toBeDefined();
  });

  test('cache operations', async () => {
    await cache.set('key', 'value');
    const result = await cache.get('key');
    expect(result).toBe('value');
  });
});
```

## Deployment Considerations

### Environment-Specific Configuration

```javascript
// config/environments.js
export const environments = {
  development: {
    utilities: {
      r2: { bucket: 'dev-data' },
      kv: { namespace: 'dev-cache' }
    }
  },
  staging: {
    utilities: {
      r2: { bucket: 'staging-data' },
      kv: { namespace: 'staging-cache' }
    }
  },
  production: {
    utilities: {
      r2: { bucket: 'prod-data' },
      kv: { namespace: 'prod-cache' }
    }
  }
};
```

### Cost Monitoring

```javascript
// Add cost tracking to your service
import { AnalyticsWriter } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    const analytics = new AnalyticsWriter(env);

    // Track utility usage
    await analytics.writeEvent({
      type: 'utility_usage',
      utility: 'ai',
      operation: 'analyze',
      timestamp: Date.now(),
      cost: 0.01 // Estimated cost
    });

    // Your service logic here
    return new Response('OK');
  }
};
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check `wrangler.toml` bindings
   - Verify environment variable names
   - Ensure Cloudflare resources exist

2. **Import Errors**
   - Verify package version (`@tamyla/clodo-framework@4.4.0+`)
   - Check import paths
   - Ensure utilities are exported

3. **Performance Issues**
   - Monitor Cloudflare dashboard
   - Implement caching strategies
   - Use batch operations when possible

4. **Rate Limiting**
   - Implement exponential backoff
   - Use circuit breaker pattern
   - Monitor usage limits

### Debug Mode

```javascript
// Enable debug logging
import { R2Storage } from '@tamyla/clodo-framework/utilities';

const storage = new R2Storage(env.R2_BUCKET, {
  debug: true,  // Enable debug logs
  retries: 3,   // Retry failed operations
  timeout: 30000 // 30 second timeout
});
```

## Next Steps

1. [Read individual utility guides](../utilities/)
2. [Check working examples](../../examples/utilities-integration/)
3. [Review API reference](./api-reference.md)
4. [Set up monitoring](./monitoring.md)

---

**Need Help?**
- [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- [GitHub Discussions](https://github.com/tamylaa/clodo-framework/discussions)
- [Documentation Index](../../docs/README.md)</content>
<parameter name="filePath">g:\coding\tamyla\lego-framework\clodo-framework\docs\utilities\integration-guide.md