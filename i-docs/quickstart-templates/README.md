# 🚀 Quick Start Templates

Ready-to-use project templates for common CLODO Framework use cases. Each template includes complete working code, configuration, and deployment instructions.

## 📋 Available Templates

### 🗄️ **Data Service Template**
Perfect for: CRUD APIs, database-backed services, content management
- **Files**: [data-service-template/](#data-service-template)
- **Features**: Database models, CRUD operations, validation
- **Time to deploy**: ~5 minutes

### 🔐 **Authentication Service Template**  
Perfect for: User management, JWT tokens, protected APIs
- **Files**: [auth-service-template/](#auth-service-template)
- **Features**: User registration, login, JWT, password reset
- **Time to deploy**: ~8 minutes

### 🌐 **API Gateway Template**
Perfect for: Microservices proxy, request routing, rate limiting
- **Files**: [api-gateway-template/](#api-gateway-template)  
- **Features**: Route proxying, load balancing, middleware
- **Time to deploy**: ~10 minutes

### 📝 **Blog/CMS Template**
Perfect for: Content management, blogging platforms, news sites
- **Files**: [blog-cms-template/](#blog-cms-template)
- **Features**: Posts, categories, authors, media management
- **Time to deploy**: ~12 minutes

---

## 🗄️ Data Service Template

### Quick Deploy
```bash
# 1. Generate the service
node bin/service-management/create-service.js my-data-api --type data-service

# 2. Copy template files
cp -r docs/quickstart-templates/data-service-template/* my-data-api/

# 3. Install and test
cd my-data-api && npm install && npm test

# 4. Deploy
npm run deploy
```

### What You Get
✅ **Database Models**: Users, products, orders  
✅ **CRUD Operations**: Full REST API for all models  
✅ **Validation**: Type-safe data validation  
✅ **Authentication**: JWT-based API protection  
✅ **Testing**: Complete test suite  
✅ **Documentation**: API docs and examples  

### API Endpoints
```
GET    /api/users           # List users
POST   /api/users           # Create user
GET    /api/users/:id       # Get user
PATCH  /api/users/:id       # Update user
DELETE /api/users/:id       # Delete user

GET    /api/products        # List products  
POST   /api/products        # Create product
# ... similar CRUD for products and orders
```

---

## 🔐 Authentication Service Template

### Quick Deploy
```bash
# 1. Generate the service
node bin/service-management/create-service.js my-auth-api --type auth-service

# 2. Copy template files  
cp -r docs/quickstart-templates/auth-service-template/* my-auth-api/

# 3. Configure secrets
node ../bin/security/security-cli.js generate-key jwt > .env
echo "JWT_SECRET=$(cat .env)" > .env

# 4. Install and test
npm install && npm test

# 5. Deploy
npm run deploy
```

### What You Get
✅ **User Management**: Registration, profiles, preferences  
✅ **Authentication**: Login/logout with JWT tokens  
✅ **Authorization**: Role-based access control (RBAC)  
✅ **Security**: Password hashing, rate limiting  
✅ **Recovery**: Password reset, email verification  
✅ **Sessions**: Token refresh, session management  

### API Endpoints
```
POST   /auth/register       # User registration
POST   /auth/login          # User login
POST   /auth/logout         # User logout
GET    /auth/profile        # Get user profile
PATCH  /auth/profile        # Update profile
POST   /auth/forgot         # Password reset request
POST   /auth/reset          # Password reset confirm
POST   /auth/refresh        # Refresh JWT token
```

---

## 🌐 API Gateway Template

### Quick Deploy
```bash
# 1. Generate the service
node bin/service-management/create-service.js my-gateway --type api-gateway

# 2. Copy template files
cp -r docs/quickstart-templates/api-gateway-template/* my-gateway/

# 3. Configure upstream services
# Edit config/upstreams.js with your service URLs

# 4. Install and test
npm install && npm test

# 5. Deploy
npm run deploy
```

### What You Get
✅ **Request Routing**: Intelligent path-based routing  
✅ **Load Balancing**: Multiple upstream servers  
✅ **Rate Limiting**: Per-client request limits  
✅ **Authentication**: Centralized auth validation  
✅ **Logging**: Request/response logging  
✅ **Health Checks**: Upstream service monitoring  

### Configuration Example
```javascript
// config/upstreams.js
export const upstreams = {
  '/api/users': {
    targets: ['https://user-service.example.com'],
    auth: 'required',
    rateLimit: { requests: 100, window: '1m' }
  },
  '/api/products': {
    targets: ['https://product-service.example.com'],
    auth: 'optional',
    rateLimit: { requests: 200, window: '1m' }
  }
};
```

---

## 📝 Blog/CMS Template

### Quick Deploy
```bash
# 1. Generate the service
node bin/service-management/create-service.js my-blog --type content-service

# 2. Copy template files
cp -r docs/quickstart-templates/blog-cms-template/* my-blog/

# 3. Set up database
# Edit src/schema/models.js if needed

# 4. Install and test
npm install && npm test

# 5. Deploy
npm run deploy
```

### What You Get
✅ **Content Management**: Posts, pages, media  
✅ **User Roles**: Authors, editors, admins  
✅ **Categories & Tags**: Content organization  
✅ **Media Upload**: File and image management  
✅ **SEO**: Meta tags, slugs, sitemaps  
✅ **Comments**: Comment system with moderation  

### Content Models
```javascript
// Posts, Categories, Authors, Comments, Media, Pages
{
  posts: { title, content, author_id, category_id, published_at },
  categories: { name, slug, description },
  authors: { name, email, bio, avatar },
  comments: { post_id, author, content, approved },
  media: { filename, url, type, size, alt_text }
}
```

---

## 📁 Template File Structure

Each template includes:

```
template-name/
├── src/
│   ├── config/domains.js      # Service configuration
│   ├── schema/models.js       # Database models
│   ├── handlers/              # API request handlers
│   ├── middleware/            # Custom middleware
│   └── worker/index.js        # Main entry point
├── test/
│   ├── integration/           # Integration tests
│   └── unit/                  # Unit tests
├── docs/
│   ├── API.md                 # API documentation
│   └── DEPLOYMENT.md          # Deployment guide
├── package.json               # Dependencies
├── wrangler.toml             # Cloudflare Worker config
└── README.md                 # Template-specific guide
```

---

## 🎯 Usage Instructions

### 1. **Choose Your Template**
Pick the template that best matches your use case.

### 2. **Generate Base Service**
```bash
node bin/service-management/create-service.js my-service --type [template-type]
```

### 3. **Copy Template Files**
```bash
cp -r docs/quickstart-templates/[template]/* my-service/
```

### 4. **Customize Configuration**
Edit configuration files to match your requirements:
- `src/config/domains.js` - Service settings
- `src/schema/models.js` - Database models
- Environment variables

### 5. **Install & Test**
```bash
cd my-service
npm install
npm test
```

### 6. **Deploy**
```bash
npm run deploy
```

---

## 🔧 Customization Guide

### **Modifying Database Models**
```javascript
// Add new fields to existing models
schemaManager.registerModel('users', {
  // ... existing fields
  phone: { type: 'text' },
  preferences: { type: 'text' } // JSON string
});

// Add new models
schemaManager.registerModel('notifications', {
  tableName: 'notifications',
  columns: {
    id: { type: 'integer', primaryKey: true },
    user_id: { type: 'integer', required: true },
    message: { type: 'text', required: true },
    read: { type: 'integer', default: 0 }
  }
});
```

### **Adding Custom API Endpoints**
```javascript
// src/handlers/custom-handlers.js
export function createCustomHandlers(config, env) {
  return {
    async handleSpecialOperation(request) {
      // Custom business logic
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

// Wire up in worker/index.js
if (path === '/api/special' && method === 'POST') {
  return customHandlers.handleSpecialOperation(request);
}
```

### **Adding Middleware**
```javascript
// src/middleware/custom-middleware.js
export function createAuthMiddleware(config) {
  return async function(request, next) {
    // Check authorization
    const token = request.headers.get('Authorization');
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Continue to next handler
    return next(request);
  };
}
```

---

## 🚀 Next Steps

After using a template:

1. **📖 Read the Template Documentation**
   - Each template includes specific setup instructions
   - Review the API documentation
   - Check deployment requirements

2. **🧪 Run Tests**
   - Verify all tests pass
   - Add tests for custom functionality
   - Test in staging environment

3. **🔧 Customize for Your Needs**
   - Modify database models
   - Add custom endpoints
   - Configure authentication

4. **🌐 Deploy to Production**
   - Set up environment variables
   - Configure domain routing
   - Monitor deployment health

5. **📊 Monitor & Scale**
   - Set up monitoring
   - Configure alerts
   - Plan for scaling

---

## 🆘 Need Help?

- **📖 Full Documentation**: [../README.md](../README.md)
- **🔧 API Reference**: [./api-reference.md](./api-reference.md)
- **🔐 Security Guide**: [../SECURITY.md](../SECURITY.md)
- **🐛 Issues**: [GitHub Issues](https://github.com/tamylaa/clodo-framework/issues)

**🎯 Missing a template?** [Request a new template](https://github.com/tamylaa/clodo-framework/issues/new?template=template-request.md) or contribute one!