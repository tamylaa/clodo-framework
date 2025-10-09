# Getting Started with Clodo Framework

## 🚀 Build Your First Service in 5 Minutes

This guide will walk you through creating, configuring, and deploying your first Clodo Framework service.

## 📋 Prerequisites

### **System Requirements**
- **Node.js**: 18.0.0 or later
- **npm**: 8.0.0 or later
- **PowerShell**: 5.1 or later (Windows) or PowerShell Core (macOS/Linux)
- **Git**: For version control
- **TypeScript**: 5.0.0 or later (optional, for enhanced development experience)

### **Cloudflare Requirements**
- **Cloudflare Account**: [Sign up free](https://dash.cloudflare.com/sign-up)
- **Domain**: Added to Cloudflare (or use Workers.dev subdomain)
- **Wrangler CLI**: Installed and authenticated

### **Install Wrangler**
```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### **Optional: TypeScript Setup**
```bash
# Install TypeScript globally for enhanced development
npm install -g typescript

# Verify installation
tsc --version
```

## 🏗️ Step 1: Install the Framework

```bash
# Install the Clodo Framework CLI
npm install -g @tamyla/clodo-framework

# Verify installation
create-clodo-service --version
```

## 🎯 Step 2: Create Your First Service

```bash
# Create a new data service
create-clodo-service my-first-service --type data-service

# Navigate to the service
cd my-first-service

# Install dependencies
npm install
```

**What was created:**
```
my-first-service/
├── src/
│   ├── config/
│   │   └── domains.js          # Domain configuration
│   └── worker/
│       └── index.js            # Main worker code
├── scripts/
│   ├── deploy.ps1             # Deployment script
│   └── setup.ps1              # Environment setup
├── package.json
├── wrangler.toml              # Cloudflare configuration
└── README.md
```

## ⚙️ Step 3: Configure Your Domain

Edit `src/config/domains.js`:

```javascript
import { createDomainConfigSchema } from '@tamyla/clodo-framework';

export const domains = {
  'my-first-service': {
    ...createDomainConfigSchema(),
    name: 'my-first-service',
    displayName: 'My First Service',
    
    // Replace with your Cloudflare Account ID
    accountId: 'your-cloudflare-account-id',
    
    // Replace with your Zone ID (if using custom domain)
    zoneId: 'your-cloudflare-zone-id',
    
    domains: {
      production: 'api.yourdomain.com',
      staging: 'staging-api.yourdomain.com',
      development: 'my-first-service.your-subdomain.workers.dev'
    },
    
    features: {
      authentication: true,
      logging: true,
      analytics: false,
      rateLimiting: true
    },
    
    settings: {
      environment: 'development',
      logLevel: 'info',
      corsOrigins: ['*']
    }
  }
};
```

### **Finding Your Cloudflare IDs**

**Account ID:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select any domain
3. Scroll down in the right sidebar to find "Account ID"

**Zone ID:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain
3. Scroll down in the right sidebar to find "Zone ID"

## 🧪 Step 4: Test Locally

```bash
# Start local development server
npm run dev
```

**Test the endpoints:**
```bash
# Health check
curl http://localhost:8787/health

# Service info
curl http://localhost:8787/info
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "my-first-service",
  "version": "1.0.0",
  "type": "data-service",
  "features": ["authentication", "logging", "rateLimiting"],
  "domain": "my-first-service",
  "environment": "development",
  "timestamp": "2025-09-27T10:00:00.000Z"
}
```

## 🗄️ Step 5: Add a Data Model

Create `src/models/users.js`:

```javascript
import { schemaManager } from '@tamyla/clodo-framework';

// Define user schema
const userSchema = {
  tableName: 'users',
  columns: {
    id: { type: 'string', primaryKey: true },
    email: { type: 'string', required: true, unique: true },
    name: { type: 'string', required: true },
    active: { type: 'boolean', default: true },
    created_at: { type: 'datetime', auto: true },
    updated_at: { type: 'datetime', auto: true }
  },
  indexes: [
    { columns: ['email'], unique: true },
    { columns: ['active'] }
  ]
};

// Register the model
schemaManager.registerModel('users', userSchema);

export { userSchema };
```

Update `src/worker/index.js` to include the model:

```javascript
import { initializeService, createFeatureGuard, COMMON_FEATURES } from '@tamyla/clodo-framework';
import { domains } from '../config/domains.js';
import '../models/users.js'; // Import to register the model

export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize service with Clodo Framework
      const service = initializeService(env, domains);

      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'my-first-service',
          version: '1.0.0',
          type: 'data-service',
          features: service.features,
          domain: service.domain,
          environment: service.environment,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Auto-generated CRUD endpoints for users
      // GET /api/users - List users
      // POST /api/users - Create user
      // GET /api/users/:id - Get user
      // PATCH /api/users/:id - Update user
      // DELETE /api/users/:id - Delete user

      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

## 🚀 Step 6: Deploy to Staging

```bash
# Run the setup script (first time only)
npm run setup

# Deploy to staging
npm run deploy -- --environment staging
```

The deployment script will:
1. ✅ Create D1 database
2. ✅ Run database migrations
3. ✅ Deploy Worker code
4. ✅ Configure domain routing
5. ✅ Set environment variables

## ✅ Step 7: Test Your Deployed Service

```bash
# Test health endpoint
curl https://staging-api.yourdomain.com/health

# Create a user
curl -X POST https://staging-api.yourdomain.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# List users
curl https://staging-api.yourdomain.com/api/users

# Get specific user
curl https://staging-api.yourdomain.com/api/users/{user-id}
```

## 🎉 Congratulations!

You've successfully:
- ✅ Created a Clodo Framework service
- ✅ Configured domain settings
- ✅ Added a data model with automatic CRUD API
- ✅ Deployed to Cloudflare Workers
- ✅ Tested the live service

## 🔄 Next Steps

### **Add Authentication**
```javascript
// Enable authentication feature
features: {
  authentication: true
}

// Protect routes with authentication
return createFeatureGuard('authentication')(
  protectedHandler
)(request, env, ctx);
```

### **Add Custom Routes**
```javascript
import { EnhancedRouter } from '@tamyla/clodo-framework';

const router = new EnhancedRouter(env.DB);
router.registerRoute('GET', '/api/custom', customHandler);
```

### **Deploy to Production**
```bash
npm run deploy -- --environment production
```

### **Monitor Your Service**
```bash
# View logs
wrangler tail my-first-service-production

# View analytics
wrangler analytics my-first-service-production
```

## 🆘 Troubleshooting

### **Common Issues**

**1. Authentication Errors**
```bash
# Re-authenticate with Cloudflare
wrangler logout
wrangler login
```

**2. Domain Configuration**
```javascript
// Make sure your domain is added to Cloudflare
// Check Account ID and Zone ID are correct
// Verify DNS settings are pointing to Cloudflare
```

**3. Database Errors**
```bash
# Check D1 database was created
wrangler d1 list

# View database contents
wrangler d1 execute my-first-service-db --command "SELECT * FROM users"
```

**4. Deployment Failures**
```bash
# Check wrangler.toml configuration
# Verify environment variables are set
# Check Worker deployment status in Cloudflare Dashboard
```

## 📚 What You've Learned

1. **Service Generation**: How to create services from templates
2. **Domain Configuration**: Multi-environment configuration management
3. **Data Models**: Schema definition and automatic API generation
4. **Local Development**: Testing services locally with hot reloading
5. **Deployment**: Automated deployment to Cloudflare Workers
6. **Testing**: Validating service functionality

## 🔗 Next Reading

- **[Domain Configuration Guide](./domain-configuration.md)** - Advanced multi-tenant setup
- **[Feature Management](./feature-flags.md)** - Runtime feature control
- **[Database Operations](./database-operations.md)** - Advanced data patterns
- **[Authentication Guide](./authentication.md)** - Securing your services
- **[Deployment Guide](../deployment/deployment-guide.md)** - Production deployment strategies

---

**Need Help?** Check our [troubleshooting guide](../troubleshooting.md) or [open an issue](https://github.com/tamyla/clodo-framework/issues).