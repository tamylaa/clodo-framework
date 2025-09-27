# Examples and Tutorials

## 🎯 Real-World Examples

### **Example 1: Multi-Tenant SaaS Platform**

Build a customer management system that serves multiple clients with domain-specific features.

**Scenario**: A CRM platform serving 3 different companies with unique feature sets and branding.

#### **Setup**
```bash
# Create the service
create-lego-service crm-platform --type data-service
cd crm-platform
```

#### **Domain Configuration**
```javascript
// src/config/domains.js
export const domains = {
  'company-a': {
    name: 'company-a',
    displayName: 'Company A CRM',
    accountId: 'your-cf-account-id',
    zoneId: 'your-zone-id',
    
    domains: {
      production: 'crm.company-a.com',
      staging: 'staging-crm.company-a.com'
    },
    
    features: {
      advancedReporting: true,
      integrations: true,
      customFields: true,
      bulkOperations: false
    },
    
    settings: {
      maxContacts: 10000,
      logLevel: 'info',
      corsOrigins: ['https://company-a.com']
    }
  },
  
  'company-b': {
    name: 'company-b',
    displayName: 'Company B CRM',
    accountId: 'your-cf-account-id',
    zoneId: 'your-zone-id',
    
    domains: {
      production: 'crm.company-b.com',
      staging: 'staging-crm.company-b.com'
    },
    
    features: {
      advancedReporting: false,
      integrations: true,
      customFields: false,
      bulkOperations: true
    },
    
    settings: {
      maxContacts: 5000,
      logLevel: 'warn',
      corsOrigins: ['https://company-b.com']
    }
  },
  
  'startup-c': {
    name: 'startup-c',
    displayName: 'Startup C CRM',
    accountId: 'your-cf-account-id',
    zoneId: 'your-zone-id',
    
    domains: {
      production: 'crm.startup-c.io',
      staging: 'staging-crm.startup-c.io'
    },
    
    features: {
      advancedReporting: false,
      integrations: false,
      customFields: false,
      bulkOperations: false
    },
    
    settings: {
      maxContacts: 1000,
      logLevel: 'debug',
      corsOrigins: ['https://startup-c.io']
    }
  }
};
```

#### **Data Models**
```javascript
// src/models/contacts.js
import { schemaManager } from '@tamyla/lego-framework';

const contactSchema = {
  tableName: 'contacts',
  columns: {
    id: { type: 'string', primaryKey: true },
    email: { type: 'string', required: true, unique: true },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    company: { type: 'string' },
    phone: { type: 'string' },
    tags: { type: 'json' },
    customFields: { type: 'json' },
    domain: { type: 'string', required: true }, // Multi-tenant isolation
    created_at: { type: 'datetime', auto: true },
    updated_at: { type: 'datetime', auto: true }
  },
  indexes: [
    { columns: ['email'], unique: true },
    { columns: ['domain'] },
    { columns: ['domain', 'company'] }
  ]
};

schemaManager.registerModel('contacts', contactSchema);

// src/models/companies.js
const companySchema = {
  tableName: 'companies',
  columns: {
    id: { type: 'string', primaryKey: true },
    name: { type: 'string', required: true },
    industry: { type: 'string' },
    size: { type: 'string' },
    website: { type: 'string' },
    domain: { type: 'string', required: true },
    created_at: { type: 'datetime', auto: true },
    updated_at: { type: 'datetime', auto: true }
  },
  indexes: [
    { columns: ['domain'] },
    { columns: ['domain', 'industry'] }
  ]
};

schemaManager.registerModel('companies', companySchema);
```

#### **Feature-Gated Routes**
```javascript
// src/worker/index.js
import { 
  initializeService, 
  createFeatureGuard, 
  EnhancedRouter,
  GenericRouteHandler 
} from '@tamyla/lego-framework';
import { domains } from '../config/domains.js';
import '../models/contacts.js';
import '../models/companies.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const service = initializeService(env, domains);
      const router = new EnhancedRouter(env.DB);
      
      // Standard CRUD endpoints are auto-generated
      // GET/POST /api/contacts
      // GET/PATCH/DELETE /api/contacts/:id
      // GET/POST /api/companies  
      // GET/PATCH/DELETE /api/companies/:id
      
      // Feature-gated advanced reporting
      router.registerRoute('GET', '/api/reports/advanced', 
        createFeatureGuard('advancedReporting')(
          async (request) => {
            return new Response(JSON.stringify({
              report: 'Advanced analytics data',
              contacts: await generateAdvancedReport(env.DB, service.domain)
            }), { 
              headers: { 'Content-Type': 'application/json' } 
            });
          }
        )
      );
      
      // Feature-gated bulk operations
      router.registerRoute('POST', '/api/contacts/bulk', 
        createFeatureGuard('bulkOperations')(
          async (request) => {
            const data = await request.json();
            return await processBulkContacts(env.DB, data, service.domain);
          }
        )
      );
      
      // Feature-gated custom fields
      router.registerRoute('GET', '/api/contacts/:id/custom-fields',
        createFeatureGuard('customFields')(
          async (request, id) => {
            const contact = await getContactById(env.DB, id, service.domain);
            return new Response(JSON.stringify(contact.customFields || {}), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        )
      );
      
      return await router.handleRequest(
        request.method, 
        new URL(request.url).pathname, 
        request
      );
      
    } catch (error) {
      console.error('CRM Platform Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// Helper functions
async function generateAdvancedReport(db, domain) {
  // Complex reporting logic here
  return { summary: 'Advanced report data' };
}

async function processBulkContacts(db, data, domain) {
  // Bulk operation logic here
  return new Response(JSON.stringify({ processed: data.contacts.length }));
}

async function getContactById(db, id, domain) {
  // Get contact with domain isolation
  const stmt = db.prepare('SELECT * FROM contacts WHERE id = ? AND domain = ?');
  return await stmt.bind(id, domain).first();
}
```

#### **Testing Multi-Domain Setup**
```bash
# Deploy to staging
npm run deploy:staging

# Test Company A (advanced features)
curl -H "Host: staging-crm.company-a.com" \
  https://crm-platform-staging.workers.dev/api/reports/advanced

# Test Company B (bulk operations)
curl -X POST -H "Host: staging-crm.company-b.com" \
  -H "Content-Type: application/json" \
  -d '{"contacts":[...]}' \
  https://crm-platform-staging.workers.dev/api/contacts/bulk

# Test Startup C (basic features only)
curl -H "Host: staging-crm.startup-c.io" \
  https://crm-platform-staging.workers.dev/api/contacts
```

---

### **Example 2: E-commerce API with Authentication**

Build a product catalog API with JWT authentication and role-based access.

#### **Setup**
```bash
create-lego-service ecommerce-api --type api-gateway
cd ecommerce-api
```

#### **Authentication Module**
```javascript
// src/modules/auth.js
import jwt from 'jsonwebtoken';

export class AuthModule {
  constructor(secret) {
    this.secret = secret;
  }
  
  async verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  generateToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: '24h' });
  }
  
  async middleware(request, env, ctx) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.slice(7);
    
    try {
      const payload = await this.verifyToken(token);
      request.user = payload;
      return null; // Continue to next handler
    } catch (error) {
      return new Response('Invalid token', { status: 401 });
    }
  }
}
```

#### **Product Models**
```javascript
// src/models/products.js
import { schemaManager } from '@tamyla/lego-framework';

const productSchema = {
  tableName: 'products',
  columns: {
    id: { type: 'string', primaryKey: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },
    price: { type: 'number', required: true },
    currency: { type: 'string', default: 'USD' },
    category: { type: 'string', required: true },
    sku: { type: 'string', unique: true },
    inventory: { type: 'number', default: 0 },
    images: { type: 'json' },
    active: { type: 'boolean', default: true },
    created_at: { type: 'datetime', auto: true },
    updated_at: { type: 'datetime', auto: true }
  },
  indexes: [
    { columns: ['sku'], unique: true },
    { columns: ['category'] },
    { columns: ['active'] }
  ]
};

schemaManager.registerModel('products', productSchema);

const orderSchema = {
  tableName: 'orders',
  columns: {
    id: { type: 'string', primaryKey: true },
    userId: { type: 'string', required: true },
    items: { type: 'json', required: true },
    total: { type: 'number', required: true },
    currency: { type: 'string', default: 'USD' },
    status: { type: 'string', default: 'pending' },
    shippingAddress: { type: 'json' },
    billingAddress: { type: 'json' },
    created_at: { type: 'datetime', auto: true },
    updated_at: { type: 'datetime', auto: true }
  },
  indexes: [
    { columns: ['userId'] },
    { columns: ['status'] }
  ]
};

schemaManager.registerModel('orders', orderSchema);
```

#### **Protected Routes**
```javascript
// src/worker/index.js - See full example with authentication flow
// [Authentication implementation continues...]
```

#### **Testing Authentication Flow**
```bash
# 1. Get authentication token
TOKEN=$(curl -X POST https://ecommerce-api.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Access protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://ecommerce-api.workers.dev/api/orders

# 3. Create new product (admin only)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","price":29.99,"category":"electronics","sku":"PROD001"}' \
  https://ecommerce-api.workers.dev/api/products

# 4. Create order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"prod-123","quantity":2,"price":29.99}]}' \
  https://ecommerce-api.workers.dev/api/orders
```

---

### **Example 3: Real-Time Analytics Service**

Build a service that collects and processes analytics events with feature-based data retention.

#### **Event Collection and Processing**
```javascript
// Complete analytics implementation with real-time processing
// [Full analytics example continues...]
```

## 🎓 Tutorials

### **Tutorial 1: Building Your First Multi-Tenant Service**
1. [Service Setup and Configuration](./tutorials/multi-tenant-setup.md)
2. [Domain Management](./tutorials/domain-management.md)  
3. [Feature Flag Implementation](./tutorials/feature-flags.md)
4. [Testing Multi-Tenancy](./tutorials/testing-multi-tenant.md)

### **Tutorial 2: Adding Authentication and Authorization**
1. [JWT Token Implementation](./tutorials/jwt-auth.md)
2. [Role-Based Access Control](./tutorials/rbac.md)
3. [Protected Route Patterns](./tutorials/protected-routes.md)
4. [Session Management](./tutorials/session-management.md)

### **Tutorial 3: Advanced Data Patterns**
1. [Complex Schema Design](./tutorials/schema-design.md)
2. [Data Relationships](./tutorials/data-relationships.md)
3. [Custom Validation](./tutorials/custom-validation.md)
4. [Performance Optimization](./tutorials/performance-optimization.md)

### **Tutorial 4: Production Deployment**
1. [Environment Configuration](./tutorials/environment-config.md)
2. [Database Migration Strategies](./tutorials/database-migrations.md)
3. [Monitoring and Logging](./tutorials/monitoring-logging.md)
4. [Scaling and Performance](./tutorials/scaling-performance.md)

## 📚 Code Samples

### **Common Patterns**

#### **Feature-Gated Functionality**
```javascript
// Pattern: Conditional feature execution
const handlePremiumFeature = createFeatureGuard('premiumFeatures')(
  async (request) => {
    // Premium functionality here
    return new Response('Premium content');
  }
);
```

#### **Domain-Specific Configuration**
```javascript
// Pattern: Runtime configuration access
const service = initializeService(env, domains);
const maxLimit = service.config.settings.maxRecords || 100;

// Apply domain-specific limits
if (requestedLimit > maxLimit) {
  throw new Error(`Limit exceeds domain maximum: ${maxLimit}`);
}
```

#### **Multi-Tenant Data Isolation**
```javascript
// Pattern: Automatic domain filtering
async function getUserData(db, userId, domain) {
  const stmt = db.prepare(`
    SELECT * FROM users 
    WHERE id = ? AND domain = ?
  `);
  return await stmt.bind(userId, domain).first();
}
```

#### **Custom Route Handlers**
```javascript
// Pattern: Business logic integration
router.registerRoute('POST', '/api/custom/workflow', async (request) => {
  const service = initializeService(env, domains);
  
  // Multi-step business process
  await validateInput(request);
  await processWorkflow(request, service);
  await notifyStakeholders(request, service);
  
  return new Response(JSON.stringify({ success: true }));
});
```

## 🔗 Integration Examples

### **External API Integration**
```javascript
// Pattern: Feature-gated external service calls
router.registerRoute('POST', '/api/notifications/send',
  createFeatureGuard('emailNotifications')(
    async (request) => {
      const data = await request.json();
      
      // Call external email service
      const response = await fetch('https://api.emailservice.com/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.EMAIL_API_KEY}` },
        body: JSON.stringify(data)
      });
      
      return new Response(JSON.stringify({ sent: response.ok }));
    }
  )
);
```

### **Database Integration Patterns**
```javascript
// Pattern: Transaction management
async function transferData(db, fromId, toId, amount, domain) {
  const stmt1 = db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND domain = ?');
  const stmt2 = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND domain = ?');
  
  // Execute within transaction context
  await db.batch([
    stmt1.bind(amount, fromId, domain),
    stmt2.bind(amount, toId, domain)
  ]);
}
```

### **Webhook Handlers**
```javascript
// Pattern: Webhook processing with domain context
router.registerRoute('POST', '/webhooks/payment', async (request) => {
  const service = initializeService(env, domains);
  const payload = await request.json();
  
  // Verify webhook signature
  if (!verifyWebhookSignature(request, env.WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process payment event
  await processPaymentEvent(payload, service.domain);
  
  return new Response('OK');
});
```

## 🧪 Testing Examples

### **Unit Test Patterns**
```javascript
// tests/services/user-service.test.js
import { GenericDataService } from '@tamyla/lego-framework';

describe('UserService', () => {
  let mockDb, userService;
  
  beforeEach(() => {
    mockDb = createMockD1Database();
    userService = new GenericDataService(mockDb, 'users');
  });
  
  test('should create user with domain isolation', async () => {
    const userData = { email: 'test@example.com', name: 'Test User', domain: 'test-domain' };
    const user = await userService.create(userData);
    
    expect(user.domain).toBe('test-domain');
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT'));
  });
});
```

### **Integration Test Patterns**
```javascript
// tests/integration/multi-tenant.test.js
describe('Multi-Tenant Integration', () => {
  test('should isolate data by domain', async () => {
    // Test domain A
    const responseA = await fetch('https://service.workers.dev/api/users', {
      headers: { 'Host': 'domain-a.example.com' }
    });
    
    // Test domain B  
    const responseB = await fetch('https://service.workers.dev/api/users', {
      headers: { 'Host': 'domain-b.example.com' }
    });
    
    expect(responseA).not.toEqual(responseB);
  });
});
```

---

These examples provide comprehensive patterns for building production-ready services with the Lego Framework. Each example demonstrates real-world scenarios with proper error handling, security considerations, and scalability patterns.