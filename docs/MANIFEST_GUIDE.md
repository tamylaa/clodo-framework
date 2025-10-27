# Clodo Service Manifest Guide

> **For Developers Building or Migrating Services**

## Quick Start

### I'm creating a NEW service
```bash
npx clodo-service create
# Creates: service-manifest.json with complete configuration
```

### I have a LEGACY service (Wrangler project)
```bash
npx clodo-service init
# Converts existing wrangler.toml to service-manifest.json
```

### I want to manually create a manifest
See the **Minimal Template** section below

---

## Manifest Location

The manifest can be placed in any of these locations (in order of priority):

```
Project Root:
├── clodo-service-manifest.json    ✅ RECOMMENDED (checked first)
├── .clodo/
│   └── service-manifest.json      ✅ Hidden config directory
├── config/
│   └── service-manifest.json      ✅ Subdirectory organization
└── wrangler.toml + package.json   ✅ Legacy services (auto-detected)
```

**Recommendation**: Use the root `clodo-service-manifest.json` for visibility.

---

## Minimal Template

Start with this if you're manually creating a manifest:

```json
{
  "serviceName": "my-api-service",
  "serviceType": "data-service",
  "version": "1.0.0",
  "deployment": {
    "domains": [
      {
        "name": "api.example.com",
        "cloudflareZoneId": "zone-id-from-cloudflare",
        "environment": "production"
      }
    ]
  }
}
```

| Field | Required? | Type | Description |
|-------|-----------|------|-------------|
| `serviceName` | ✅ Yes | string | Unique identifier for your service |
| `serviceType` | ✅ Yes | string | Type: `data-service`, `auth-service`, `api-gateway`, `generic` |
| `version` | ✅ Yes | string | Service version (semver format) |
| `deployment.domains` | ✅ Yes | array | Domain configurations for multi-domain deployment |

---

## Full Reference Schema

### Root Level

```json
{
  "serviceName": "string",              // Required: Service identifier
  "serviceType": "string",              // Required: Service type (see above)
  "version": "string",                  // Required: Semantic version
  "description": "string",              // Optional: What this service does
  
  "deployment": { ... },                // See Deployment Section
  "metadata": { ... },                  // See Metadata Section (auto-filled)
  "multiDomainConfig": { ... }          // See Multi-Domain Section
}
```

### Deployment Section

```json
{
  "deployment": {
    "domains": [
      {
        "name": "api.example.com",
        "cloudflareZoneId": "abc123xyz",
        "environment": "production",
        "routes": [
          {
            "pattern": "api/*",
            "handler": "apiHandler"
          }
        ]
      },
      {
        "name": "staging-api.example.com",
        "cloudflareZoneId": "abc123xyz",
        "environment": "staging"
      }
    ],
    "framework": "wrangler",             // Deployment framework
    "minWorkerCount": 1,
    "maxWorkerCount": 10,
    "timeout": 30000
  }
}
```

### Multi-Domain Configuration

For services deployed across multiple domains:

```json
{
  "multiDomainConfig": {
    "enabled": true,
    "orchestrator": "cross-domain-coordinator",
    "domains": [
      {
        "id": "prod",
        "name": "api.example.com",
        "priority": "primary",
        "loadBalancing": "round-robin"
      },
      {
        "id": "failover",
        "name": "api-backup.example.com",
        "priority": "secondary",
        "loadBalancing": "failover"
      }
    ],
    "syncStrategy": "eventual-consistency"
  }
}
```

### Metadata Section

```json
{
  "metadata": {
    "serviceId": "uuid-here",
    "createdAt": "2025-10-27T12:00:00Z",
    "createdBy": "CLODO Framework",
    "frameworkVersion": "3.1.12",
    "lastModified": "2025-10-27T14:30:00Z"
  }
}
```

---

## Service Types Explained

### `data-service`
**Best for:** REST APIs, database operations, CRUD operations
- Optimized for data retrieval and manipulation
- Database connection pooling
- Query caching
- Request logging
- Example: User service, Product catalog API

### `auth-service`
**Best for:** Authentication, authorization, token management
- OAuth/JWT token handling
- Session management
- Permission checking
- MFA support
- Example: Identity service, Role-based access control

### `api-gateway`
**Best for:** Request routing, API composition, rate limiting
- Request transformation
- Rate limiting and throttling
- API versioning
- Request/response logging
- Example: Main API gateway, request aggregator

### `generic`
**Best for:** Custom services, experimental projects
- Minimal assumptions
- Full customization
- No specialized optimizations
- Example: Webhook receiver, custom logic service

---

## Multi-Domain Deployment Guide

For services that need to run on multiple domains:

### Basic Multi-Domain Setup

```json
{
  "serviceName": "my-api",
  "deployment": {
    "domains": [
      {
        "name": "api.company.com",
        "cloudflareZoneId": "zone1",
        "environment": "production"
      },
      {
        "name": "api.eu.company.com",
        "cloudflareZoneId": "zone2",
        "environment": "production"
      }
    ]
  }
}
```

### Advanced: Cross-Domain Coordination

```json
{
  "multiDomainConfig": {
    "enabled": true,
    "orchestrator": "cross-domain-coordinator",
    "domains": [
      {
        "id": "us-primary",
        "name": "api.us.example.com",
        "region": "us-east",
        "priority": "primary",
        "syncWith": ["eu-secondary"]
      },
      {
        "id": "eu-secondary",
        "name": "api.eu.example.com",
        "region": "eu-west",
        "priority": "secondary",
        "syncWith": ["us-primary"]
      }
    ],
    "syncStrategy": "eventual-consistency",
    "conflictResolution": "last-write-wins"
  }
}
```

### How Multi-Domain Works

1. **Service Detection**: Deploy command detects multiple domains
2. **Multi-Domain Orchestrator**: Coordinates deployment across all domains
3. **Sync Strategy**: Handles data consistency between domains
4. **Failover**: Automatic failover to secondary domains if primary fails
5. **Monitoring**: Cross-domain health checks and metrics

---

## Legacy Service Migration

### From Wrangler-only Projects

If your project has a `wrangler.toml` but no `service-manifest.json`:

**Option 1: Automatic** (Recommended)
```bash
npx clodo-service init --from-wrangler
# Generates service-manifest.json from wrangler.toml
```

**Option 2: Manual**
1. Copy the **Minimal Template** above
2. Update fields based on your `wrangler.toml`
3. Save as `clodo-service-manifest.json` in root

### Migration Checklist

- [ ] Created `clodo-service-manifest.json`
- [ ] Set `serviceName` (from `name` in package.json)
- [ ] Set `serviceType` (choose from list above)
- [ ] Added at least one domain in `deployment.domains`
- [ ] Tested: `npx clodo-service deploy --dry-run`
- [ ] Committed manifest to git

---

## Schema Validation

To validate your manifest structure:

```bash
# Validate locally
npx clodo-service validate --manifest ./clodo-service-manifest.json

# Show validation errors and suggestions
npx clodo-service validate --manifest ./clodo-service-manifest.json --verbose
```

---

## Common Patterns

### Single-Domain Production Service

```json
{
  "serviceName": "user-api",
  "serviceType": "data-service",
  "version": "2.1.0",
  "deployment": {
    "domains": [
      {
        "name": "api.mycompany.com",
        "cloudflareZoneId": "abc123",
        "environment": "production"
      }
    ]
  }
}
```

### Multi-Environment (Staging + Prod)

```json
{
  "serviceName": "auth-service",
  "serviceType": "auth-service",
  "version": "1.0.0",
  "deployment": {
    "domains": [
      {
        "name": "auth-staging.mycompany.com",
        "cloudflareZoneId": "zone-staging",
        "environment": "staging"
      },
      {
        "name": "auth.mycompany.com",
        "cloudflareZoneId": "zone-prod",
        "environment": "production"
      }
    ]
  }
}
```

### Multi-Region with Failover

```json
{
  "serviceName": "global-api",
  "serviceType": "api-gateway",
  "version": "3.0.0",
  "multiDomainConfig": {
    "enabled": true,
    "domains": [
      {
        "id": "us",
        "name": "api.us.example.com",
        "priority": "primary",
        "region": "us-east"
      },
      {
        "id": "eu",
        "name": "api.eu.example.com",
        "priority": "secondary",
        "region": "eu-west"
      }
    ]
  }
}
```

---

## Troubleshooting

### "Service Configuration Not Found"

**Problem**: Deploy command can't find your manifest

**Solution**:
1. Ensure `clodo-service-manifest.json` exists in project root
2. OR place it in `.clodo/` or `config/` directory
3. Run: `npx clodo-service validate` to check
4. For legacy services: Run `npx clodo-service init`

### "Missing Required Field: deployment.domains"

**Problem**: Manifest exists but lacks domain configuration

**Solution**:
```json
{
  "deployment": {
    "domains": [
      {
        "name": "your-domain.com",
        "cloudflareZoneId": "get-from-cloudflare-dashboard",
        "environment": "production"
      }
    ]
  }
}
```

### How do I get my Cloudflare Zone ID?

1. Go to https://dash.cloudflare.com
2. Select your domain
3. Copy the **Zone ID** from the sidebar
4. Add to manifest: `"cloudflareZoneId": "your-zone-id"`

---

## Best Practices

✅ **DO:**
- Commit `clodo-service-manifest.json` to git
- Use semantic versioning (1.0.0)
- Keep manifest in root directory
- Update manifest when changing service configuration
- Use environment-specific domain names (staging-api, api, etc)

❌ **DON'T:**
- Leave manifest in multiple locations (causes confusion)
- Manually edit auto-generated fields
- Store secrets in the manifest
- Use special characters in serviceName

---

## Support

**Questions?**
- Docs: https://docs.clodo.dev
- Issues: https://github.com/tamylaa/clodo-framework/issues
- Discord: https://discord.gg/clodo

**For Legacy Services:**
- Migration Guide: https://docs.clodo.dev/legacy-migration
- Wrangler Integration: https://docs.clodo.dev/wrangler-integration
