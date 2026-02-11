# Clodo Framework Utilities

## Overview

The Clodo Framework includes a comprehensive set of **Cloudflare API utilities** that extend beyond basic service generation. These utilities provide pre-built, production-ready wrappers for Cloudflare's advanced platform features, allowing you to quickly integrate powerful capabilities into your generated services.

> **Note**: Utilities are **optional extensions** - your generated services work perfectly without them. Use utilities when you need advanced Cloudflare features like AI, vector databases, or complex storage patterns.

## Available Utilities

### Storage & Data
- **[R2 Storage](./r2-storage.md)** - Object storage with S3-compatible API
- **[KV Storage](./kv-storage.md)** - High-performance key-value store
- **[Durable Objects](./durable-objects.md)** - Stateful serverless computing

### AI & Machine Learning
- **[Workers AI](./workers-ai.md)** - Access to Cloudflare's AI models
- **[Vectorize](./vectorize.md)** - Vector database for AI applications

### Communication & Messaging
- **[Queues](./queues.md)** - Message queuing for distributed systems
- **[Email Handler](./email-handler.md)** - Email processing and forwarding

### Analytics & Monitoring
- **[Analytics Writer](./analytics.md)** - Custom analytics and metrics
- **[Service Bindings](./bindings.md)** - Inter-service communication

### Caching & Performance
- **[Cache](./cache.md)** - Advanced caching strategies
- **[Upstash Redis](./upstash-redis.md)** - Redis integration via Upstash

## Quick Start

### Basic Usage
```javascript
// Import utilities you need
import { R2Storage, KVStorage, AIClient } from '@tamyla/clodo-framework/utilities';

// Use in your service
export default {
  async fetch(request, env, ctx) {
    const storage = new R2Storage(env.R2_BUCKET);
    const kv = new KVStorage(env.KV_NAMESPACE);
    const ai = new AIClient(env);

    // Your service logic here
    return new Response('Service with utilities!');
  }
};
```

### Integration with Generated Services

Generated services can optionally include utilities. During service creation:

```bash
# Create service with utilities
npx clodo-service create my-service --utilities r2,kv,ai
```

Or add utilities to existing services by importing them:

```javascript
// In your generated service
import { R2Storage, AIClient } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    // Your existing service logic
    const response = await handleRequest(request, env);

    // Add utility functionality
    if (request.url.includes('/ai-process')) {
      const ai = new AIClient(env);
      const result = await ai.process(request);
      return new Response(JSON.stringify(result));
    }

    return response;
  }
};
```

## When to Use Utilities

### Use Cases
- **AI Applications**: Need Workers AI or vector databases
- **Data-Intensive Apps**: Require advanced storage patterns
- **Real-time Systems**: Need queues or durable objects
- **Analytics Platforms**: Custom metrics and monitoring
- **Email Services**: Inbound/outbound email processing

### When NOT to Use Utilities
- **Simple CRUD APIs**: Basic database operations
- **Static Content**: Simple file serving
- **Basic Authentication**: Standard auth patterns

## Architecture

### Design Principles
- **Production-Ready**: All utilities include error handling, retries, and logging
- **Cloudflare-Optimized**: Designed specifically for Cloudflare's platform
- **Composable**: Utilities work together seamlessly
- **Type-Safe**: Full TypeScript support included

### Integration Patterns

#### Service Enhancement
```javascript
// Enhance generated service with utilities
import { initializeService } from '@tamyla/clodo-framework/worker';
import { R2Storage, AIClient } from '@tamyla/clodo-framework/utilities';

export default {
  async fetch(request, env, ctx) {
    const service = initializeService(env, domains);

    // Add utility capabilities
    service.storage = new R2Storage(env.R2_BUCKET);
    service.ai = new AIClient(env);

    return service.handleRequest(request);
  }
};
```

#### Domain Configuration
```javascript
// domain-config.js
export const domains = {
  'my-app': {
    // ... existing config
    utilities: {
      r2: { bucket: 'my-data-bucket' },
      ai: { model: 'text-generation' },
      kv: { namespace: 'my-cache' }
    }
  }
};
```

## Best Practices

### Performance
- Initialize utilities once per worker instance
- Use appropriate caching strategies
- Monitor usage and costs

### Security
- Validate all inputs before processing
- Use environment variables for sensitive data
- Implement proper error handling

### Cost Optimization
- Monitor Cloudflare usage dashboards
- Implement caching to reduce API calls
- Use appropriate storage tiers

## Examples & Templates

See the [examples directory](../../examples/utilities-integration/) for complete working examples:

- [AI-Powered API](../examples/utilities-integration/ai-api/)
- [File Storage Service](../examples/utilities-integration/file-storage/)
- [Real-time Chat App](../examples/utilities-integration/chat-app/)
- [Analytics Dashboard](../examples/utilities-integration/analytics/)

## API Reference

Each utility includes comprehensive documentation:

- [Complete API Reference](./api-reference.md)
- [Configuration Options](./configuration.md)
- [Error Handling](./error-handling.md)
- [TypeScript Types](./types.md)

## Support & Community

- **Documentation**: [Integration Guide](./integration-guide.md)
- **Examples**: [Working Examples](../../examples/utilities-integration/)
- **Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tamylaa/clodo-framework/discussions)

## Migration & Compatibility

### From v4.3.x to v4.4.0+
All utilities are backward compatible. Existing services continue to work unchanged.

### Adding Utilities to Existing Services
1. Import required utilities
2. Add environment variables to `wrangler.toml`
3. Update service logic to use utilities
4. Test and deploy

See [Migration Guide](./migration-guide.md) for detailed instructions.

---

**Next Steps:**
1. [Choose utilities for your use case](./choosing-utilities.md)
2. [Read the integration guide](./integration-guide.md)
3. [Try the examples](../../examples/utilities-integration/)
4. [Check the API reference](./api-reference.md)</content>
<parameter name="filePath">g:\coding\tamyla\lego-framework\clodo-framework\docs\utilities\README.md