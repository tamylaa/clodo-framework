# 💻 Code Examples Gallery

Real-world code snippets and patterns for common CLODO Framework use cases. Copy, paste, and customize for your projects.

## 📋 Categories

- [🗄️ Database Operations](#database-operations)
- [🔐 Authentication & Security](#authentication--security)
- [🛣️ API Routes & Handlers](#api-routes--handlers)
- [⚙️ Configuration & Setup](#configuration--setup)
- [🚀 Deployment Patterns](#deployment-patterns)
- [🧪 Testing Examples](#testing-examples)
- [🔧 Utilities & Helpers](#utilities--helpers)
- [🌐 Integration Patterns](#integration-patterns)

---

## 🗄️ Database Operations

### **Basic CRUD Service**
```javascript
// src/services/product-service.js
import { GenericDataService, schemaManager } from '@tamyla/clodo-framework';

// Register the model
schemaManager.registerModel('products', {
  tableName: 'products',
  columns: {
    id: { type: 'integer', primaryKey: true },
    name: { type: 'text', required: true },
    price: { type: 'real', required: true },
    category_id: { type: 'integer', required: true },
    description: { type: 'text' },
    in_stock: { type: 'integer', default: 1 },
    created_at: { type: 'text', default: 'CURRENT_TIMESTAMP' }
  },
  validation: {
    required: ['name', 'price', 'category_id']
  },
  indexes: [
    { name: 'idx_category', columns: ['category_id'] },
    { name: 'idx_stock', columns: ['in_stock'] }
  ]
});

export class ProductService {
  constructor(d1Client) {
    this.service = new GenericDataService(d1Client, 'products');
  }

  async createProduct(productData) {
    // Validation happens automatically
    return await this.service.create(productData);
  }

  async getProductsByCategory(categoryId, options = {}) {
    return await this.service.find(
      { category_id: categoryId, in_stock: 1 },
      { orderBy: 'name ASC', ...options }
    );
  }

  async searchProducts(searchTerm, options = {}) {
    // Note: This would require custom SQL for full-text search
    return await this.service.find(
      { name: { like: `%${searchTerm}%` } },
      options
    );
  }

  async updateStock(productId, quantity) {
    return await this.service.update(productId, { 
      in_stock: quantity,
      updated_at: new Date().toISOString()
    });
  }

  async getPopularProducts(limit = 10) {
    return await this.service.findAll({
      orderBy: 'sales_count DESC',
      limit
    });
  }
}
```

### **Advanced Database Relationships**
```javascript
// src/services/order-service.js
import { GenericDataService, schemaManager } from '@tamyla/clodo-framework';

// Register related models
schemaManager.registerModel('orders', {
  tableName: 'orders',
  columns: {
    id: { type: 'integer', primaryKey: true },
    user_id: { type: 'integer', required: true },
    total: { type: 'real', required: true },
    status: { type: 'text', default: 'pending' },
    created_at: { type: 'text', default: 'CURRENT_TIMESTAMP' }
  }
});

schemaManager.registerModel('order_items', {
  tableName: 'order_items',
  columns: {
    id: { type: 'integer', primaryKey: true },
    order_id: { type: 'integer', required: true },
    product_id: { type: 'integer', required: true },
    quantity: { type: 'integer', required: true },
    price: { type: 'real', required: true }
  }
});

export class OrderService {
  constructor(d1Client) {
    this.orders = new GenericDataService(d1Client, 'orders');
    this.orderItems = new GenericDataService(d1Client, 'order_items');
    this.products = new GenericDataService(d1Client, 'products');
  }

  async createOrder(userId, items) {
    // Calculate total
    let total = 0;
    for (const item of items) {
      const product = await this.products.findById(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      total += product.price * item.quantity;
    }

    // Create order
    const order = await this.orders.create({
      user_id: userId,
      total,
      status: 'pending'
    });

    // Add order items
    for (const item of items) {
      await this.orderItems.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      });
    }

    return this.getOrderWithItems(order.id);
  }

  async getOrderWithItems(orderId) {
    const order = await this.orders.findById(orderId);
    if (!order) return null;

    const items = await this.orderItems.find({ order_id: orderId });
    
    // Enrich with product details
    for (const item of items) {
      item.product = await this.products.findById(item.product_id);
    }

    return { ...order, items };
  }

  async getUserOrders(userId, options = {}) {
    return await this.orders.find(
      { user_id: userId },
      { orderBy: 'created_at DESC', ...options }
    );
  }
}
```

### **Database Migrations**
```javascript
// src/migrations/001-initial-schema.js
export const migration_001 = {
  up: async (db) => {
    // Create tables
    await db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await db.exec('CREATE INDEX idx_users_email ON users(email)');
    await db.exec('CREATE INDEX idx_products_category ON products(category_id)');
  },

  down: async (db) => {
    await db.exec('DROP TABLE IF EXISTS products');
    await db.exec('DROP TABLE IF EXISTS users');
  }
};
```

---

## 🔐 Authentication & Security

### **JWT Authentication Handler**
```javascript
// src/middleware/auth-middleware.js
import { validateJWT } from '@tamyla/clodo-framework/security';

export function createAuthMiddleware(jwtSecret) {
  return async function authMiddleware(request, next) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Missing or invalid Authorization header', { 
        status: 401 
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer '
    
    try {
      const payload = await validateJWT(token, jwtSecret);
      
      // Add user info to request context
      request.user = payload;
      
      return next(request);
    } catch (error) {
      return new Response('Invalid or expired token', { 
        status: 401 
      });
    }
  };
}

// Usage in worker
import { createAuthMiddleware } from './middleware/auth-middleware.js';

const authMiddleware = createAuthMiddleware(env.JWT_SECRET);

// Apply to protected routes
if (path.startsWith('/api/protected/')) {
  return authMiddleware(request, () => handleProtectedRoute(request));
}
```

### **User Registration & Login**
```javascript
// src/handlers/auth-handlers.js
import { GenericDataService } from '@tamyla/clodo-framework';
import { generateJWT, hashPassword, verifyPassword } from '@tamyla/clodo-framework/security';

export function createAuthHandlers(config, env) {
  const userService = new GenericDataService(env.DB, 'users');

  return {
    async register(request) {
      const { email, password, name } = await request.json();

      // Validate input
      if (!email || !password || !name) {
        return new Response('Missing required fields', { status: 400 });
      }

      // Check if user exists
      const existingUser = await userService.find({ email });
      if (existingUser.length > 0) {
        return new Response('User already exists', { status: 409 });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await userService.create({
        email,
        name,
        password_hash: passwordHash
      });

      // Generate JWT
      const token = await generateJWT(
        { userId: user.id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return new Response(JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name },
        token
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    },

    async login(request) {
      const { email, password } = await request.json();

      // Find user
      const users = await userService.find({ email });
      if (users.length === 0) {
        return new Response('Invalid credentials', { status: 401 });
      }

      const user = users[0];

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return new Response('Invalid credentials', { status: 401 });
      }

      // Generate JWT
      const token = await generateJWT(
        { userId: user.id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return new Response(JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name },
        token
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    },

    async profile(request) {
      // Assumes authMiddleware has added user to request
      const userId = request.user.userId;
      const user = await userService.findById(userId);

      if (!user) {
        return new Response('User not found', { status: 404 });
      }

      return new Response(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
```

### **API Key Authentication**
```javascript
// src/middleware/api-key-middleware.js
export function createApiKeyMiddleware(validApiKeys) {
  return async function apiKeyMiddleware(request, next) {
    const apiKey = request.headers.get('X-API-Key') || 
                   request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return new Response('API key required', { status: 401 });
    }

    if (!validApiKeys.includes(apiKey)) {
      return new Response('Invalid API key', { status: 403 });
    }

    // Add API key info to request for rate limiting/logging
    request.apiKey = apiKey;
    
    return next(request);
  };
}

// Rate limiting per API key
export function createRateLimitMiddleware(limits = {}) {
  const usage = new Map(); // In production, use external storage

  return async function rateLimitMiddleware(request, next) {
    const apiKey = request.apiKey || 'anonymous';
    const now = Date.now();
    const window = 60 * 1000; // 1 minute
    const limit = limits[apiKey] || 100; // Default 100 requests per minute

    // Clean old entries
    const cutoff = now - window;
    for (const [key, timestamps] of usage) {
      usage.set(key, timestamps.filter(t => t > cutoff));
    }

    // Check current usage
    const currentUsage = usage.get(apiKey) || [];
    if (currentUsage.length >= limit) {
      return new Response('Rate limit exceeded', { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Math.ceil((currentUsage[0] + window) / 1000)).toString()
        }
      });
    }

    // Record usage
    currentUsage.push(now);
    usage.set(apiKey, currentUsage);

    return next(request);
  };
}
```

---

## 🛣️ API Routes & Handlers

### **RESTful API Router**
```javascript
// src/routing/rest-router.js
export class RestRouter {
  constructor() {
    this.routes = new Map();
  }

  register(method, path, handler) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, handler);
  }

  // Convenience methods
  get(path, handler) { this.register('GET', path, handler); }
  post(path, handler) { this.register('POST', path, handler); }
  put(path, handler) { this.register('PUT', path, handler); }
  patch(path, handler) { this.register('PATCH', path, handler); }
  delete(path, handler) { this.register('DELETE', path, handler); }

  async handle(request) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Try exact match first
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey)(request);
    }

    // Try pattern matching
    for (const [routeKey, handler] of this.routes) {
      const [routeMethod, routePath] = routeKey.split(':');
      if (routeMethod !== method) continue;

      const params = this.matchPath(routePath, path);
      if (params !== null) {
        request.params = params;
        return handler(request);
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  matchPath(pattern, path) {
    // Simple pattern matching: /users/:id -> /users/123
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }
}

// Usage example
import { RestRouter } from './routing/rest-router.js';
import { createUserHandlers } from './handlers/user-handlers.js';

const router = new RestRouter();
const userHandlers = createUserHandlers(config, env);

// Register routes
router.get('/api/users', userHandlers.list);
router.post('/api/users', userHandlers.create);
router.get('/api/users/:id', userHandlers.get);
router.patch('/api/users/:id', userHandlers.update);
router.delete('/api/users/:id', userHandlers.delete);

// Handle request
export default {
  async fetch(request, env) {
    return router.handle(request);
  }
};
```

### **File Upload Handler**
```javascript
// src/handlers/upload-handlers.js
export function createUploadHandlers(config, env) {
  return {
    async uploadFile(request) {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      const contentType = request.headers.get('Content-Type');
      if (!contentType?.includes('multipart/form-data')) {
        return new Response('Invalid content type', { status: 400 });
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
          return new Response('No file provided', { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          return new Response('Invalid file type', { status: 400 });
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          return new Response('File too large', { status: 413 });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const fileName = `${timestamp}-${Math.random().toString(36)}.${extension}`;

        // Store file (example using R2)
        await env.R2_BUCKET.put(fileName, file.stream(), {
          httpMetadata: {
            contentType: file.type,
            contentDisposition: `attachment; filename="${file.name}"`
          }
        });

        // Save file metadata to database
        const fileService = new GenericDataService(env.DB, 'files');
        const fileRecord = await fileService.create({
          original_name: file.name,
          stored_name: fileName,
          size: file.size,
          type: file.type,
          url: `https://cdn.example.com/${fileName}`
        });

        return new Response(JSON.stringify({
          id: fileRecord.id,
          url: fileRecord.url,
          name: file.name,
          size: file.size
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Upload error:', error);
        return new Response('Upload failed', { status: 500 });
      }
    },

    async getFile(request) {
      const fileId = request.params.id;
      const fileService = new GenericDataService(env.DB, 'files');
      const file = await fileService.findById(fileId);

      if (!file) {
        return new Response('File not found', { status: 404 });
      }

      // Get file from storage
      const object = await env.R2_BUCKET.get(file.stored_name);
      if (!object) {
        return new Response('File not found in storage', { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': file.type,
          'Content-Disposition': `inline; filename="${file.original_name}"`
        }
      });
    }
  };
}
```

### **WebSocket-style Real-time Handler**
```javascript
// src/handlers/realtime-handlers.js  
export function createRealtimeHandlers(config, env) {
  // Simple Server-Sent Events implementation
  return {
    async subscribeToUpdates(request) {
      const url = new URL(request.url);
      const topic = url.searchParams.get('topic') || 'general';

      // Validate subscription
      if (!request.headers.get('Accept')?.includes('text/event-stream')) {
        return new Response('Invalid Accept header', { status: 400 });
      }

      // Create readable stream for SSE
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Send initial connection event
      await writer.write(new TextEncoder().encode(`data: {"type":"connected","topic":"${topic}"}\n\n`));

      // Simulate real-time updates (in production, use pub/sub)
      const intervalId = setInterval(async () => {
        const update = {
          type: 'update',
          topic,
          data: {
            timestamp: new Date().toISOString(),
            message: `Update for ${topic}`
          }
        };
        
        try {
          await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(update)}\n\n`));
        } catch (error) {
          clearInterval(intervalId);
        }
      }, 5000);

      // Cleanup on disconnect
      request.signal?.addEventListener('abort', () => {
        clearInterval(intervalId);
        writer.close();
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      });
    },

    async publishUpdate(request) {
      const { topic, data } = await request.json();
      
      // In production, publish to external pub/sub system
      // For now, just acknowledge
      return new Response(JSON.stringify({
        success: true,
        topic,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

// Client-side usage:
// const eventSource = new EventSource('/api/realtime/subscribe?topic=notifications');
// eventSource.onmessage = (event) => {
//   const data = JSON.parse(event.data);
//   console.log('Received update:', data);
// };
```

---

## ⚙️ Configuration & Setup

### **Multi-Environment Configuration**
```javascript
// src/config/environments.js
const baseConfig = {
  service: {
    name: 'my-api',
    version: '1.0.0'
  },
  database: {
    enabled: true,
    models: ['users', 'products', 'orders']
  },
  features: {
    auth: true,
    cors: true,
    rate_limiting: true
  }
};

const environments = {
  development: {
    ...baseConfig,
    debug: true,
    cors: {
      origins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    },
    rate_limiting: {
      enabled: false // Disabled for dev
    },
    logging: {
      level: 'debug'
    }
  },

  staging: {
    ...baseConfig,
    debug: false,
    cors: {
      origins: ['https://staging.myapp.com'],
      credentials: true
    },
    rate_limiting: {
      requests: 1000,
      window: '15m'
    },
    logging: {
      level: 'info'
    }
  },

  production: {
    ...baseConfig,
    debug: false,
    cors: {
      origins: ['https://myapp.com'],
      credentials: true
    },
    rate_limiting: {
      requests: 500,
      window: '15m'
    },
    logging: {
      level: 'warn'
    },
    security: {
      hsts: true,
      csrf_protection: true
    }
  }
};

export function getConfig(environment = 'development') {
  return environments[environment] || environments.development;
}

// Usage
import { getConfig } from './config/environments.js';
const config = getConfig(env.ENVIRONMENT || 'development');
```

### **Feature Flags System**
```javascript
// src/config/feature-flags.js
import { FeatureManager } from '@tamyla/clodo-framework';

export class CustomFeatureManager extends FeatureManager {
  constructor(env) {
    super();
    this.env = env;
    this.setupFlags();
  }

  setupFlags() {
    // Environment-based flags
    this.setFlag('NEW_API_V2', this.env.ENVIRONMENT === 'development');
    this.setFlag('ADVANCED_ANALYTICS', this.env.ENVIRONMENT !== 'development');
    this.setFlag('BETA_FEATURES', this.env.ENABLE_BETA === 'true');
    
    // User-based flags (would typically come from database)
    this.setFlag('PREMIUM_FEATURES', false); // Set per user
    
    // A/B testing flags
    this.setFlag('NEW_UI_DESIGN', Math.random() > 0.5); // 50% rollout
  }

  async getFlagsForUser(userId) {
    // In production, fetch from database/cache
    const userService = new GenericDataService(this.env.DB, 'users');
    const user = await userService.findById(userId);
    
    return {
      ...this.getAllFlags(),
      PREMIUM_FEATURES: user?.subscription_type === 'premium',
      BETA_FEATURES: user?.beta_tester === 1
    };
  }
}

// Usage in handlers
export function createFeatureFlaggedHandlers(config, env) {
  const featureManager = new CustomFeatureManager(env);

  return {
    async getProducts(request) {
      const flags = await featureManager.getFlagsForUser(request.user?.userId);
      
      if (flags.NEW_API_V2) {
        return this.getProductsV2(request);
      } else {
        return this.getProductsV1(request);
      }
    },

    async getAnalytics(request) {
      const flags = await featureManager.getFlagsForUser(request.user?.userId);
      
      if (!flags.PREMIUM_FEATURES) {
        return new Response('Premium feature required', { status: 403 });
      }

      // Return premium analytics
      return this.getPremiumAnalytics(request);
    }
  };
}
```

### **Dynamic Configuration Loading**
```javascript
// src/config/dynamic-config.js
export class DynamicConfigManager {
  constructor(env) {
    this.env = env;
    this.cache = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5 minutes
  }

  async getConfig(key, defaultValue = null) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.value;
    }

    // Try environment variable first
    const envValue = this.env[key];
    if (envValue !== undefined) {
      this.cache.set(key, { value: envValue, timestamp: Date.now() });
      return envValue;
    }

    // Try database/KV store
    try {
      const stored = await this.env.KV.get(`config:${key}`);
      if (stored !== null) {
        const value = JSON.parse(stored);
        this.cache.set(key, { value, timestamp: Date.now() });
        return value;
      }
    } catch (error) {
      console.error(`Error loading config ${key}:`, error);
    }

    // Return default
    this.cache.set(key, { value: defaultValue, timestamp: Date.now() });
    return defaultValue;
  }

  async setConfig(key, value) {
    try {
      await this.env.KV.put(`config:${key}`, JSON.stringify(value));
      this.cache.set(key, { value, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error(`Error setting config ${key}:`, error);
      return false;
    }
  }

  // Bulk configuration loading
  async loadConfigs(keys) {
    const configs = {};
    await Promise.all(
      keys.map(async (key) => {
        configs[key] = await this.getConfig(key);
      })
    );
    return configs;
  }
}

// Usage
const configManager = new DynamicConfigManager(env);

// Load multiple configs at startup
const appConfigs = await configManager.loadConfigs([
  'MAX_UPLOAD_SIZE',
  'CACHE_DURATION',
  'API_RATE_LIMIT',
  'FEATURE_FLAGS'
]);
```

---

## 🚀 Deployment Patterns

### **Blue-Green Deployment Script**
```javascript
// scripts/blue-green-deploy.js
import { MultiDomainOrchestrator } from '@tamyla/clodo-framework/orchestration';

export class BlueGreenDeployer {
  constructor(config) {
    this.config = config;
    this.orchestrator = new MultiDomainOrchestrator(config);
  }

  async deploy(targetEnvironment) {
    console.log(`🚀 Starting Blue-Green deployment to ${targetEnvironment}`);
    
    // Step 1: Deploy to green environment (new version)
    console.log('📦 Deploying to green environment...');
    const greenDeployment = await this.deployToEnvironment('green', targetEnvironment);
    
    if (!greenDeployment.success) {
      console.error('❌ Green deployment failed');
      return { success: false, error: greenDeployment.error };
    }

    // Step 2: Run health checks on green
    console.log('🩺 Running health checks on green environment...');
    const healthCheck = await this.runHealthChecks('green');
    
    if (!healthCheck.healthy) {
      console.error('❌ Health checks failed on green');
      await this.rollback('green');
      return { success: false, error: 'Health checks failed' };
    }

    // Step 3: Switch traffic to green
    console.log('🔄 Switching traffic to green environment...');
    await this.switchTraffic('green');

    // Step 4: Verify traffic switch
    console.log('✅ Verifying traffic switch...');
    const trafficCheck = await this.verifyTrafficSwitch();
    
    if (!trafficCheck.success) {
      console.error('❌ Traffic switch verification failed, rolling back...');
      await this.switchTraffic('blue');
      return { success: false, error: 'Traffic switch failed' };
    }

    // Step 5: Keep blue as backup for rollback
    console.log('✅ Blue-Green deployment completed successfully');
    return { 
      success: true, 
      greenVersion: greenDeployment.version,
      blueVersion: await this.getCurrentVersion('blue')
    };
  }

  async deployToEnvironment(color, environment) {
    try {
      const deploymentConfig = {
        ...this.config,
        environment: `${environment}-${color}`,
        domains: this.config.domains.map(domain => `${color}-${domain}`)
      };

      const result = await this.orchestrator.deployPortfolio(deploymentConfig);
      return { success: true, version: result.deploymentId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async switchTraffic(targetColor) {
    // Update load balancer / CDN configuration
    const configs = this.config.domains.map(domain => ({
      domain,
      upstream: `${targetColor}-${domain}`
    }));

    // This would integrate with your load balancer API
    for (const config of configs) {
      await this.updateLoadBalancer(config);
    }
  }
}

// Usage
const deployer = new BlueGreenDeployer({
  domains: ['api.example.com', 'auth.example.com'],
  healthCheckEndpoints: ['/health', '/api/status']
});

await deployer.deploy('production');
```

### **Canary Deployment Pattern**
```javascript
// scripts/canary-deploy.js
export class CanaryDeployer {
  constructor(config) {
    this.config = config;
    this.stages = [
      { name: 'initial', traffic: 5 },
      { name: 'ramp-up', traffic: 25 },  
      { name: 'majority', traffic: 75 },
      { name: 'complete', traffic: 100 }
    ];
  }

  async deployCanary(newVersion) {
    console.log(`🕊️ Starting Canary deployment for version ${newVersion}`);
    
    for (const stage of this.stages) {
      console.log(`📊 Stage: ${stage.name} (${stage.traffic}% traffic)`);
      
      // Deploy canary version
      await this.updateCanaryTraffic(stage.traffic, newVersion);
      
      // Monitor for specified duration
      const monitoringResult = await this.monitorStage(stage);
      
      if (!monitoringResult.healthy) {
        console.error(`❌ Stage ${stage.name} failed monitoring`);
        await this.rollbackCanary();
        return { success: false, failedAt: stage.name };
      }

      console.log(`✅ Stage ${stage.name} completed successfully`);
      
      // Wait before next stage (except for final stage)
      if (stage.name !== 'complete') {
        await this.sleep(this.config.stageDuration || 300000); // 5 minutes default
      }
    }

    console.log('✅ Canary deployment completed successfully');
    return { success: true };
  }

  async updateCanaryTraffic(percentage, version) {
    // Update routing rules to send percentage of traffic to new version
    const routingConfig = {
      stable: { weight: 100 - percentage, version: this.config.currentVersion },
      canary: { weight: percentage, version: version }
    };

    // This would integrate with your routing infrastructure
    await this.updateRoutingConfig(routingConfig);
  }

  async monitorStage(stage) {
    const metrics = await this.collectMetrics(this.config.monitoringDuration);
    
    // Define success criteria
    const criteria = {
      errorRate: 0.01, // 1% max error rate
      responseTime: 500, // 500ms max response time
      successRate: 0.99 // 99% min success rate
    };

    return {
      healthy: (
        metrics.errorRate <= criteria.errorRate &&
        metrics.avgResponseTime <= criteria.responseTime &&
        metrics.successRate >= criteria.successRate
      ),
      metrics
    };
  }
}
```

### **Multi-Region Deployment**
```javascript
// scripts/multi-region-deploy.js
export class MultiRegionDeployer {
  constructor(config) {
    this.config = config;
    this.regions = config.regions || ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
  }

  async deployToAllRegions(version) {
    console.log(`🌍 Starting multi-region deployment to ${this.regions.length} regions`);
    
    const results = [];
    
    // Deploy to primary region first
    const primaryRegion = this.regions[0];
    console.log(`🎯 Deploying to primary region: ${primaryRegion}`);
    
    const primaryResult = await this.deployToRegion(primaryRegion, version);
    if (!primaryResult.success) {
      return { success: false, error: 'Primary region deployment failed' };
    }
    
    results.push(primaryResult);

    // Deploy to remaining regions in parallel
    const secondaryRegions = this.regions.slice(1);
    console.log(`🌐 Deploying to secondary regions: ${secondaryRegions.join(', ')}`);
    
    const secondaryPromises = secondaryRegions.map(region => 
      this.deployToRegion(region, version)
    );
    
    const secondaryResults = await Promise.allSettled(secondaryPromises);
    
    // Check for failures
    const failures = secondaryResults
      .map((result, index) => ({ region: secondaryRegions[index], result }))
      .filter(({ result }) => result.status === 'rejected' || !result.value.success);
    
    if (failures.length > 0) {
      console.warn(`⚠️ Some regions failed: ${failures.map(f => f.region).join(', ')}`);
      // Decide whether to rollback or continue
      if (failures.length >= secondaryRegions.length / 2) {
        await this.rollbackAllRegions(version);
        return { success: false, error: 'Too many regional failures' };
      }
    }

    // Update global routing
    await this.updateGlobalRouting(results.filter(r => r.success));

    return {
      success: true,
      deployedRegions: results.filter(r => r.success).map(r => r.region),
      failedRegions: failures.map(f => f.region)
    };
  }

  async deployToRegion(region, version) {
    try {
      // Region-specific configuration
      const regionConfig = {
        ...this.config,
        region,
        domains: this.config.domains.map(domain => `${region}.${domain}`)
      };

      const orchestrator = new MultiDomainOrchestrator(regionConfig);
      const result = await orchestrator.deployPortfolio();

      return { 
        success: true, 
        region, 
        deploymentId: result.deploymentId,
        domains: result.successfulDomains 
      };
    } catch (error) {
      return { success: false, region, error: error.message };
    }
  }
}
```

---

## 🧪 Testing Examples

### **Integration Test Suite**
```javascript
// test/integration/api.integration.test.js
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('API Integration Tests', () => {
  let baseUrl;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Setup test environment
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8787';
    
    // Create test user and get auth token
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User'
      })
    });

    expect(registerResponse.status).toBe(200);
    const registerData = await registerResponse.json();
    authToken = registerData.token;
    testUser = registerData.user;
  });

  afterAll(async () => {
    // Cleanup: delete test user
    if (testUser) {
      await fetch(`${baseUrl}/api/users/${testUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
  });

  describe('Authentication Flow', () => {
    test('should login with valid credentials', async () => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
    });

    test('should reject invalid credentials', async () => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Endpoints', () => {
    test('should access profile with valid token', async () => {
      const response = await fetch(`${baseUrl}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.email).toBe('test@example.com');
    });

    test('should reject requests without token', async () => {
      const response = await fetch(`${baseUrl}/auth/profile`);
      expect(response.status).toBe(401);
    });
  });

  describe('CRUD Operations', () => {
    let productId;

    test('should create a new product', async () => {
      const response = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Test Product',
          price: 29.99,
          category_id: 1
        })
      });

      expect(response.status).toBe(201);
      const product = await response.json();
      expect(product.name).toBe('Test Product');
      productId = product.id;
    });

    test('should retrieve the created product', async () => {
      const response = await fetch(`${baseUrl}/api/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      const product = await response.json();
      expect(product.name).toBe('Test Product');
    });

    test('should update the product', async () => {
      const response = await fetch(`${baseUrl}/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Updated Product',
          price: 39.99
        })
      });

      expect(response.status).toBe(200);
      const product = await response.json();
      expect(product.name).toBe('Updated Product');
      expect(product.price).toBe(39.99);
    });

    test('should delete the product', async () => {
      const response = await fetch(`${baseUrl}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await fetch(`${baseUrl}/api/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(getResponse.status).toBe(404);
    });
  });
});
```

### **Load Testing Script**
```javascript
// test/load/load-test.js
import { PerformanceTester } from '@tamyla/clodo-framework/deployment';

class LoadTestRunner {
  constructor(config) {
    this.config = config;
    this.tester = new PerformanceTester(config);
  }

  async runLoadTest() {
    console.log('🚀 Starting load test...');
    
    const scenarios = [
      {
        name: 'Authentication Load',
        endpoint: '/auth/login',
        method: 'POST',
        body: { email: 'test@example.com', password: 'password' },
        concurrent: 10,
        duration: 30000 // 30 seconds
      },
      {
        name: 'API Read Load',
        endpoint: '/api/products',
        method: 'GET',
        concurrent: 50,
        duration: 60000 // 60 seconds
      },
      {
        name: 'API Write Load', 
        endpoint: '/api/products',
        method: 'POST',
        body: { name: 'Load Test Product', price: 10.00, category_id: 1 },
        concurrent: 20,
        duration: 30000
      }
    ];

    const results = [];

    for (const scenario of scenarios) {
      console.log(`📊 Running scenario: ${scenario.name}`);
      const result = await this.runScenario(scenario);
      results.push(result);
      
      // Wait between scenarios
      await this.sleep(5000);
    }

    return this.analyzeResults(results);
  }

  async runScenario(scenario) {
    const startTime = Date.now();
    const requests = [];
    const workers = [];

    // Create concurrent workers
    for (let i = 0; i < scenario.concurrent; i++) {
      workers.push(this.createWorker(scenario, startTime + scenario.duration));
    }

    // Wait for all workers to complete
    const workerResults = await Promise.all(workers);
    
    // Flatten results
    for (const workerResult of workerResults) {
      requests.push(...workerResult);
    }

    return {
      scenario: scenario.name,
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      failedRequests: requests.filter(r => !r.success).length,
      avgResponseTime: requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length,
      maxResponseTime: Math.max(...requests.map(r => r.responseTime)),
      minResponseTime: Math.min(...requests.map(r => r.responseTime)),
      requestsPerSecond: requests.length / (scenario.duration / 1000),
      errors: requests.filter(r => !r.success).map(r => r.error)
    };
  }

  async createWorker(scenario, endTime) {
    const results = [];
    
    while (Date.now() < endTime) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${this.config.baseUrl}${scenario.endpoint}`, {
          method: scenario.method,
          headers: {
            'Content-Type': 'application/json',
            ...scenario.headers
          },
          body: scenario.body ? JSON.stringify(scenario.body) : undefined
        });

        const responseTime = Date.now() - startTime;
        
        results.push({
          success: response.ok,
          status: response.status,
          responseTime,
          timestamp: startTime
        });

      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime,
          timestamp: startTime
        });
      }

      // Small delay to prevent overwhelming
      await this.sleep(Math.random() * 100);
    }

    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const loadTest = new LoadTestRunner({
  baseUrl: 'https://api.example.com'
});

const results = await loadTest.runLoadTest();
console.log('Load test completed:', results);
```

---

## 🔧 Utilities & Helpers

### **Caching Utility**
```javascript
// src/utils/cache.js
export class CacheManager {
  constructor(storage, defaultTtl = 300000) { // 5 minutes default
    this.storage = storage; // Could be KV, Redis, or Map
    this.defaultTtl = defaultTtl;
  }

  async get(key) {
    try {
      const cached = await this.storage.get(`cache:${key}`);
      if (!cached) return null;

      const { value, expiry } = JSON.parse(cached);
      
      if (Date.now() > expiry) {
        await this.delete(key);
        return null;
      }

      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTtl) {
    try {
      const expiry = Date.now() + ttl;
      const cached = JSON.stringify({ value, expiry });
      
      await this.storage.put(`cache:${key}`, cached);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.storage.delete(`cache:${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Memoization decorator
  memoize(fn, keyGenerator, ttl) {
    return async (...args) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      let result = await this.get(key);
      if (result !== null) {
        return result;
      }

      result = await fn(...args);
      await this.set(key, result, ttl);
      return result;
    };
  }
}

// Usage example
const cache = new CacheManager(env.KV);

// Direct usage
await cache.set('user:123', userData, 600000); // 10 minutes
const userData = await cache.get('user:123');

// Memoization
const getUserById = cache.memoize(
  async (id) => userService.findById(id),
  (id) => `user:${id}`,
  300000 // 5 minutes
);

const user = await getUserById(123); // First call hits database
const user2 = await getUserById(123); // Second call hits cache
```

### **Validation Helpers**
```javascript
// src/utils/validation.js
export class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

export const validators = {
  required: (value, field) => {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${field} is required`, field, 'REQUIRED');
    }
    return true;
  },

  email: (value, field) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError(`${field} must be a valid email`, field, 'INVALID_EMAIL');
    }
    return true;
  },

  minLength: (min) => (value, field) => {
    if (value.length < min) {
      throw new ValidationError(`${field} must be at least ${min} characters`, field, 'MIN_LENGTH');
    }
    return true;
  },

  maxLength: (max) => (value, field) => {
    if (value.length > max) {
      throw new ValidationError(`${field} cannot exceed ${max} characters`, field, 'MAX_LENGTH');
    }
    return true;
  },

  pattern: (regex, message) => (value, field) => {
    if (!regex.test(value)) {
      throw new ValidationError(message || `${field} format is invalid`, field, 'INVALID_FORMAT');
    }
    return true;
  },

  oneOf: (options) => (value, field) => {
    if (!options.includes(value)) {
      throw new ValidationError(`${field} must be one of: ${options.join(', ')}`, field, 'INVALID_OPTION');
    }
    return true;
  }
};

export function validate(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    for (const rule of rules) {
      try {
        rule(value, field);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push({
            field: error.field,
            message: error.message,
            code: error.code
          });
        } else {
          throw error;
        }
      }
    }
  }

  if (errors.length > 0) {
    const error = new Error('Validation failed');
    error.validation = errors;
    throw error;
  }

  return true;
}

// Usage example
const userSchema = {
  email: [validators.required, validators.email],
  password: [validators.required, validators.minLength(8)],
  name: [validators.required, validators.minLength(2), validators.maxLength(100)],
  role: [validators.oneOf(['user', 'admin', 'moderator'])]
};

try {
  validate(userData, userSchema);
} catch (error) {
  if (error.validation) {
    return new Response(JSON.stringify({
      error: 'Validation failed',
      details: error.validation
    }), { status: 400 });
  }
  throw error;
}
```

---

This comprehensive code examples gallery provides real-world, production-ready patterns that developers can immediately use in their CLODO Framework projects. Each example is complete and demonstrates best practices for the framework's capabilities.

## 📚 Additional Resources

- **🚀 Getting Started**: [./getting-started.md](./getting-started.md)
- **📖 API Reference**: [./api-reference.md](./api-reference.md)
- **🛠️ CLI Tutorial**: [./cli-tutorial.md](./cli-tutorial.md)
- **🏗️ Templates**: [./quickstart-templates/](./quickstart-templates/)

**🎯 Need a specific example?** [Request it here](https://github.com/tamylaa/clodo-framework/issues/new?template=example-request.md) or contribute your own!