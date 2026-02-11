# Clodo Framework Utilities Integration Examples

This directory contains complete, working examples of how to integrate Clodo Framework utilities with generated services.

## Available Examples

### 🤖 [AI-Powered API](./ai-api/)
Build an AI-powered API service with text generation, analysis, and chat capabilities.

**Features:**
- Workers AI integration
- Response caching with KV
- Error handling and validation
- Performance optimization

**Use Case:** AI-powered applications, content generation, chatbots

---

### 📁 [File Storage Service](./file-storage/)
Create a file storage and management service using R2 and KV.

**Features:**
- File upload/download with R2
- Metadata storage in KV
- File processing pipeline
- Access control and permissions

**Use Case:** Document management, media storage, backup systems

---

### 💬 [Real-time Chat Application](./chat-app/)
Build a real-time chat application with queues and durable objects.

**Features:**
- Message queuing with Cloudflare Queues
- Real-time message delivery
- User presence tracking
- Message history persistence

**Use Case:** Chat applications, real-time notifications, collaborative tools

---

### 📊 [Analytics Dashboard](./analytics/)
Create an analytics service with custom metrics and reporting.

**Features:**
- Custom analytics collection
- Real-time dashboards
- Data aggregation and reporting
- Export capabilities

**Use Case:** Application analytics, user behavior tracking, business intelligence

---

### 🗄️ [Data Processing Pipeline](./data-pipeline/)
Build a data processing service with vector storage and AI.

**Features:**
- Document ingestion and processing
- Vector embeddings for semantic search
- Batch processing capabilities
- Data transformation pipelines

**Use Case:** Knowledge bases, semantic search, content processing

---

### 📧 [Email Service](./email-service/)
Create an email processing service with inbound/outbound capabilities.

**Features:**
- Email parsing and processing
- Automated responses
- Email forwarding and routing
- Spam filtering and validation

**Use Case:** Transactional emails, newsletters, support systems

---

## Getting Started

### Prerequisites
- Node.js 18+
- Cloudflare account with Workers enabled
- Wrangler CLI installed

### Running an Example

1. **Choose an example** and navigate to its directory:
   ```bash
   cd examples/utilities-integration/ai-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Cloudflare resources**:
   ```bash
   # Follow the README.md in each example for specific setup
   npx wrangler kv:namespace create "CACHE"
   npx wrangler r2 bucket create my-bucket
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Cloudflare credentials
   ```

5. **Run locally**:
   ```bash
   npm run dev
   ```

6. **Deploy to Cloudflare**:
   ```bash
   npm run deploy
   ```

## Architecture Patterns

### Service Enhancement Pattern
```javascript
// Import utilities
import { AIClient, KVStorage } from '@tamyla/clodo-framework/utilities';

// Enhance generated service
class EnhancedService {
  constructor(env, domains) {
    this.baseService = initializeService(env, domains);
    this.ai = new AIClient(env);
    this.cache = new KVStorage(env.KV_CACHE);
  }

  async handleRequest(request) {
    // Add utility-powered endpoints
    if (request.url.includes('/ai/')) {
      return this.handleAIRequest(request);
    }

    // Fallback to base service
    return this.baseService.handleRequest(request);
  }
}
```

### Utility Composition Pattern
```javascript
// Combine multiple utilities
import {
  R2Storage,
  VectorStore,
  AIClient
} from '@tamyla/clodo-framework/utilities';

class ContentService {
  constructor(env) {
    this.storage = new R2Storage(env.R2_BUCKET);
    this.vectorStore = new VectorStore(env.VECTORIZE_INDEX);
    this.ai = new AIClient(env);
  }

  async processDocument(file) {
    // Store file
    const stored = await this.storage.upload(file.name, file);

    // Generate embedding
    const embedding = await this.ai.generateEmbedding(file.content);

    // Store in vector database
    await this.vectorStore.insert([{
      id: stored.id,
      values: embedding,
      metadata: { filename: file.name }
    }]);

    return stored;
  }
}
```

### Caching Pattern
```javascript
// Cache expensive operations
async function cachedOperation(key, operation, ttl = 3600) {
  const cache = new KVStorage(env.KV_CACHE);

  // Check cache
  const cached = await cache.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Perform operation
  const result = await operation();

  // Cache result
  await cache.set(key, JSON.stringify(result), { ttl });

  return result;
}
```

## Best Practices

### Performance
- **Cache aggressively**: Use KV for expensive operations
- **Batch operations**: Combine multiple requests when possible
- **Monitor usage**: Track Cloudflare costs and limits

### Error Handling
- **Graceful degradation**: Fall back when utilities fail
- **Circuit breakers**: Prevent cascade failures
- **User-friendly errors**: Don't expose internal errors

### Security
- **Input validation**: Validate all utility inputs
- **Access control**: Implement proper authorization
- **Rate limiting**: Prevent abuse and control costs

### Cost Optimization
- **Resource monitoring**: Track usage across utilities
- **Caching strategies**: Reduce API calls
- **Efficient queries**: Optimize vector searches and database queries

## Contributing

### Adding New Examples

1. **Create example directory**:
   ```bash
   mkdir examples/utilities-integration/new-example
   ```

2. **Follow the structure**:
   ```
   new-example/
   ├── README.md           # Comprehensive documentation
   ├── src/
   │   ├── worker/
   │   │   └── index.js    # Main service implementation
   │   └── config/
   │       └── domains.js  # Domain configuration
   ├── wrangler.toml       # Cloudflare configuration
   ├── package.json        # Dependencies
   └── .env.example        # Environment template
   ```

3. **Include all necessary files**:
   - Working code examples
   - Configuration files
   - Setup instructions
   - Usage examples

4. **Test thoroughly**:
   - Local development
   - Cloudflare deployment
   - Error scenarios
   - Performance testing

### Example Requirements

- **Runnable**: Must work out of the box with proper setup
- **Documented**: Clear README with setup and usage instructions
- **Educational**: Show best practices and patterns
- **Production-ready**: Include error handling and security considerations

## Support

- **Documentation**: [Utilities Guide](../../docs/utilities/)
- **Integration Guide**: [How to Use Utilities](../../docs/utilities/integration-guide.md)
- **Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tamylaa/clodo-framework/discussions)

---

**Ready to build?** Start with the [AI API example](./ai-api/) to see utilities in action!</content>
<parameter name="filePath">g:\coding\tamyla\lego-framework\clodo-framework\examples\utilities-integration\README.md