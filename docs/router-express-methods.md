# Router API: Express-like Methods Available

## Overview

CLODO Framework v4.4.0+ now includes **Express-like convenience methods** on the `EnhancedRouter` class. This improves API familiarity and reduces friction for developers transitioning from Express.js.

## What Changed

### Before (Still Supported)
```javascript
import { createEnhancedRouter } from '@tamyla/clodo-framework';

const router = createEnhancedRouter(d1Client);

// Using registerRoute() - still works!
router.registerRoute('GET', '/api/users', async (request) => {
  return new Response(JSON.stringify(users));
});
```

### After (New Convenience Methods)
```javascript
import { createEnhancedRouter } from '@tamyla/clodo-framework';

const router = createEnhancedRouter(d1Client);

// Using Express-like methods - now available!
router.get('/api/users', async (request) => {
  return new Response(JSON.stringify(users));
});

router.post('/api/users', async (request) => {
  return new Response(JSON.stringify(newUser), { status: 201 });
});

router.put('/api/users/:id', async (request, id) => {
  return new Response(JSON.stringify(updatedUser));
});

router.patch('/api/users/:id', async (request, id) => {
  return new Response(JSON.stringify(patchedUser));
});

router.delete('/api/users/:id', async (request, id) => {
  return new Response(JSON.stringify({ success: true }));
});
```

## Available Methods

| Method | Syntax | Purpose |
|--------|--------|---------|
| `get()` | `router.get(path, handler)` | Register GET route |
| `post()` | `router.post(path, handler)` | Register POST route |
| `put()` | `router.put(path, handler)` | Register PUT route |
| `patch()` | `router.patch(path, handler)` | Register PATCH route |
| `delete()` | `router.delete(path, handler)` | Register DELETE route |
| `registerRoute()` | `router.registerRoute(method, path, handler)` | Generic registration (still available) |

## Handler Signature

All convenience methods support the same handler signature as `registerRoute()`:

```typescript
// Handler signature
type RouteHandler = (request: Request, ...params: string[]) => Promise<Response>;

// With exact path
router.get('/api/health', async (request) => {
  return new Response('OK');
});

// With path parameters
router.get('/api/users/:id', async (request, id) => {
  const user = await userService.findById(id);
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// With multiple parameters
router.patch('/api/users/:userId/posts/:postId', async (request, userId, postId) => {
  const updated = await postService.update(userId, postId);
  return new Response(JSON.stringify(updated));
});
```

## Migration Guide

### No Action Required

**This is fully backward compatible.** Your existing code using `registerRoute()` continues to work without changes:

```javascript
// Old code - still works perfectly
router.registerRoute('GET', '/api/data', handler);
router.registerRoute('POST', '/api/data', handler);
```

### Optional: Adopt Convenience Methods

You can gradually migrate to Express-like methods for better readability:

```javascript
// Before
router.registerRoute('GET', '/api/users', listUsers);
router.registerRoute('POST', '/api/users', createUser);
router.registerRoute('GET', '/api/users/:id', getUser);
router.registerRoute('PATCH', '/api/users/:id', updateUser);
router.registerRoute('DELETE', '/api/users/:id', deleteUser);

// After
router.get('/api/users', listUsers);
router.post('/api/users', createUser);
router.get('/api/users/:id', getUser);
router.patch('/api/users/:id', updateUser);
router.delete('/api/users/:id', deleteUser);
```

### Mixed Usage is Safe

You can mix both APIs in the same codebase:

```javascript
// Both styles work together
router.get('/api/health', healthHandler);
router.registerRoute('GET', '/api/status', statusHandler);
router.post('/api/webhook', webhookHandler);
router.registerRoute('POST', '/api/events', eventHandler);
```

## Real-World Example

```javascript
import { createEnhancedRouter } from '@tamyla/clodo-framework';

export default {
  async fetch(request, env, ctx) {
    const router = createEnhancedRouter(env.DB);

    // List all users
    router.get('/api/users', async (req) => {
      const users = await getUsersList(env.DB);
      return new Response(JSON.stringify(users), {
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Get user by ID
    router.get('/api/users/:id', async (req, id) => {
      const user = await getUser(env.DB, id);
      return new Response(JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Create user
    router.post('/api/users', async (req) => {
      const userData = await req.json();
      const newUser = await createUser(env.DB, userData);
      return new Response(JSON.stringify(newUser), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Update user
    router.patch('/api/users/:id', async (req, id) => {
      const updates = await req.json();
      const updated = await updateUser(env.DB, id, updates);
      return new Response(JSON.stringify(updated), {
        headers: { 'Content-Type': 'application/json' }
      });
    });

    // Delete user
    router.delete('/api/users/:id', async (req, id) => {
      await deleteUser(env.DB, id);
      return new Response('', { status: 204 });
    });

    // Route the request
    const response = await router.handleRequest(
      request.method,
      new URL(request.url).pathname,
      request
    );

    return response;
  }
};
```

## FAQ

### Q: Will this break my existing code?
**A:** No. The old `registerRoute()` API is fully supported and unchanged. This is a purely additive change.

### Q: Are the convenience methods just aliases?
**A:** Yes. Methods like `router.get()` are thin aliases that call `registerRoute('GET', ...)` internally. They have identical behavior and performance.

### Q: Can I mix both APIs?
**A:** Yes, you can use both in the same router instance. They're fully compatible.

### Q: What about other HTTP methods (HEAD, OPTIONS, TRACE)?
**A:** Use `registerRoute()` for less common HTTP methods:

```javascript
router.registerRoute('HEAD', '/api/check', handler);
router.registerRoute('OPTIONS', '/api/cors', handler);
```

### Q: Is there any performance difference?
**A:** No. The convenience methods are direct aliases with zero performance overhead.

## Notes on Path Conventions

### Why `/api` prefix?
The `/api` prefix is a **convention**, not a requirement:
- Separates API routes from frontend/static content
- Enables versioning (`/api/v1`, `/api/v2`)
- Makes monitoring and debugging easier

You can use any path structure: `/users`, `/v1/users`, `/posts`, etc. The router doesn't care.

### File Format: .js vs .mjs
This project uses `"type": "module"` in package.json, so all `.js` files are ESM. The `.mjs` extension is redundant but historically used for CLI scripts. We now use `.js` consistently for the entire codebase.

## Links

- [API Reference: EnhancedRouter](../docs/api-reference.md#enhancedrouter)
- [Routing System Architecture](../i-docs/architecture/README.md#routing-system)
- [Repro Script](../scripts/repro-clodo.js) - Run: `node scripts/repro-clodo.js`

---

**Version:** 4.4.0+  
**Status:** Stable  
**Breaking Changes:** None
