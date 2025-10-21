# 🚀 Getting Started with CLODO Framework

Welcome to CLODO Framework! This interactive guide will get you from zero to deploying your first service in under 10 minutes.

## 📋 Prerequisites

- **Node.js 18+** (Check: `node --version`)
- **npm** or **yarn** package manager
- **Terminal/Command Line** access

## 🎯 What You'll Build

By the end of this tutorial, you'll have:
- ✅ A working data service with authentication
- ✅ Database schema management  
- ✅ CLI tools configured
- ✅ Your first deployment ready

---

## Step 1: Quick Installation (2 min)

### Install the Framework
```bash
# Clone or install the framework
git clone https://github.com/tamylaa/clodo-framework.git
cd clodo-framework
npm install

# Verify installation
npm test
```

**✅ Expected Output**: All tests should pass (39/39)

### Test CLI Tools
```bash
# Test the service creation tool
node bin/service-management/create-service.js --help

# Test the security tool  
node bin/security/security-cli.js --help
```

**✅ Expected Output**: Help messages showing available options

---

## Step 2: Create Your First Service (3 min)

### Generate a Data Service
```bash
# Create a new data service
node bin/service-management/create-service.js my-blog-api --type data-service --output ./my-projects

cd my-projects/my-blog-api
npm install
```

**🎉 What Just Happened?**
The CLI generated a complete service with:
- Database schema management
- Authentication system
- API routes and handlers
- Configuration files
- Tests

### Explore the Generated Structure
```bash
ls -la
```

**📁 You'll See**:
```
src/
├── config/domains.js     # Service configuration
├── handlers/            # API request handlers  
├── middleware/          # Request processing
├── worker/             # Cloudflare Worker entry
└── schema/             # Database models
```

---

## Step 3: Configure Your Service (2 min)

### Set Up Database Schema
Edit `src/schema/models.js`:

```javascript
import { schemaManager } from '@tamyla/clodo-framework';

// Define your blog models
schemaManager.registerModel('posts', {
  tableName: 'posts',
  columns: {
    id: { type: 'integer', primaryKey: true },
    title: { type: 'text', required: true },
    content: { type: 'text', required: true },
    author_id: { type: 'integer', required: true },
    created_at: { type: 'text', default: 'CURRENT_TIMESTAMP' }
  },
  validation: {
    required: ['title', 'content', 'author_id']
  }
});

schemaManager.registerModel('authors', {
  tableName: 'authors', 
  columns: {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'text', required: true },
    email: { type: 'text', required: true, unique: true }
  }
});
```

### Configure Domain Settings
Edit `src/config/domains.js`:

```javascript
import { createDomainConfigSchema } from '@tamyla/clodo-framework';

export const domains = createDomainConfigSchema({
  'my-blog-api': {
    name: 'My Blog API',
    environment: 'development',
    features: ['auth', 'database', 'cors'],
    database: {
      enabled: true,
      models: ['posts', 'authors']
    },
    auth: {
      jwt_secret: process.env.JWT_SECRET,
      enabled: true
    }
  }
});
```

---

## Step 4: Add API Endpoints (2 min)

### Create Blog Post Handler
Edit `src/handlers/blog-handlers.js`:

```javascript
import { GenericDataService } from '@tamyla/clodo-framework';

export function createBlogHandlers(config, env) {
  const postsService = new GenericDataService(env.DB, 'posts');
  const authorsService = new GenericDataService(env.DB, 'authors');

  return {
    // Get all posts
    async getPosts(request) {
      const posts = await postsService.findAll();
      return new Response(JSON.stringify(posts), {
        headers: { 'Content-Type': 'application/json' }
      });
    },

    // Create new post
    async createPost(request) {
      const data = await request.json();
      const post = await postsService.create(data);
      return new Response(JSON.stringify(post), { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    },

    // Get single post
    async getPost(request, params) {
      const post = await postsService.findById(params.id);
      if (!post) {
        return new Response('Post not found', { status: 404 });
      }
      return new Response(JSON.stringify(post), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
```

### Wire Up Routes
Edit `src/worker/index.js`:

```javascript
import { initializeService } from '@tamyla/clodo-framework';
import { domains } from '../config/domains.js';
import { createBlogHandlers } from '../handlers/blog-handlers.js';

export default {
  async fetch(request, env) {
    const service = initializeService(domains['my-blog-api'], env);
    const blogHandlers = createBlogHandlers(service.config, env);
    
    const url = new URL(request.url);
    const path = url.pathname;

    // Route handling
    if (path === '/api/posts' && request.method === 'GET') {
      return blogHandlers.getPosts(request);
    }
    
    if (path === '/api/posts' && request.method === 'POST') {
      return blogHandlers.createPost(request);
    }
    
    if (path.match(/^\/api\/posts\/\d+$/) && request.method === 'GET') {
      const id = path.split('/').pop();
      return blogHandlers.getPost(request, { id });
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'my-blog-api' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

---

## Step 5: Test Your Service (1 min)

### Run Tests
```bash
npm test
```

**✅ Expected**: All tests pass

### Test Endpoints Locally
```bash
# Start local development (if you have Wrangler)
npm run dev

# Or test the worker module directly
node -e "
const worker = require('./src/worker/index.js');
console.log('Worker loaded successfully');
"
```

---

## 🎉 Congratulations!

You've successfully created a production-ready API service with:

### ✅ What You Built:
- **Database Models**: Posts and Authors with relationships
- **API Endpoints**: GET/POST for blog posts
- **Authentication Ready**: JWT integration configured
- **Schema Validation**: Type-safe database operations
- **Error Handling**: Built-in error management
- **Testing Suite**: Comprehensive test coverage

### 🚀 Next Steps:

#### **Deploy to Production**:
```bash
# Generate deployment configuration
node ../../bin/deployment/enterprise-deploy.js --customer my-blog --env production

# Deploy to Cloudflare Workers
npm run deploy
```

#### **Add Authentication**:
```bash
# Generate JWT secrets
node ../../bin/security/security-cli.js generate-key jwt

# Add auth middleware to your routes
```

#### **Scale Your Service**:
- Add more models and relationships
- Implement pagination and filtering  
- Add real-time features
- Set up monitoring and logging

---

## 📚 What's Next?

### **Explore More Features**:
- [🔐 Authentication Guide](./authentication-guide.md)
- [🗄️ Database Operations](./database-guide.md) 
- [🚀 Deployment Strategies](./deployment-guide.md)
- [🛠️ CLI Reference](./cli-reference.md)

### **Join the Community**:
- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/tamylaa/clodo-framework/issues)
- 💬 [Discussions](https://github.com/tamylaa/clodo-framework/discussions)

---

**🎯 Need Help?** Check our [Troubleshooting Guide](./troubleshooting.md) or [API Reference](./api-reference.md)
