# Customer Configuration Architecture Alignment

**Date**: October 12, 2025  
**Status**: Architecture Analysis & Redesign  
**Version**: Framework v2.0.7 (in progress)

## Problem Statement

The framework's customer configuration system was designed with assumptions that don't match real-world usage in data-service. This document analyzes the misalignment and defines the correct architecture.

---

## Current State Analysis

### Framework Assumptions (WRONG ❌)

The framework expects:
```
config/
├── base/
│   ├── wrangler.base.toml
│   └── variables.base.env
├── customers/{name}/
│   ├── development.env    # Contains: DOMAIN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN
│   ├── staging.env
│   └── production.env
└── environments/
    ├── development.toml
    ├── staging.toml
    └── production.toml
```

**Issues:**
- Expects Cloudflare credentials in customer env files (SECURITY RISK!)
- Field names don't match actual usage (`DOMAIN` vs `CUSTOMER_DOMAIN`)
- Doesn't read from `wrangler.toml` where actual deployment config lives

### Real Data-Service Structure (CORRECT ✅)

**Actual structure:**
```
config/
├── base/
│   ├── wrangler.base.toml       # Contains: account_id (shared)
│   └── variables.base.env       # Contains: Base service variables
├── customers/{name}/
│   ├── development.env          # Contains: CUSTOMER_DOMAIN, CUSTOMER_ID, URLs, feature flags
│   ├── staging.env              # NO CLOUDFLARE CREDENTIALS (good!)
│   └── production.env
└── environments/
    ├── development.toml         # Documentation only
    ├── staging.toml
    └── production.toml

wrangler.toml                    # ROOT CONFIG - Contains actual deployment config
├── account_id (global)
└── [env.production]
    ├── name = "data-service-prod"
    ├── vars.SERVICE_DOMAIN = "testcorp"
    ├── d1_databases[] 
    │   ├── database_name
    │   ├── database_id
    │   └── binding
    └── vars (all environment variables)

Secrets (NOT in files):
- Set via: wrangler secret put CLOUDFLARE_API_TOKEN --env production
- Never stored in git
```

---

## The 6 Core Pieces of Information

### Where They Actually Live:

| Information | Location | Example | Security |
|------------|----------|---------|----------|
| **1. Account ID** | `wrangler.toml` (top level) | `0506015145cda87c34f9ab8e9675a8a9` | ⚠️ Semi-public (in git) |
| **2. Zone ID** | Not currently stored! | Should be in `[env.X]` section | ⚠️ Semi-public |
| **3. API Token** | `wrangler secret` (NOT in files) | Set via CLI command | 🔒 Secure (never in git) |
| **4. Domain** | `config/customers/{name}/{env}.env` | `CUSTOMER_DOMAIN=wetechfounders.com` | ✅ Public |
| **5. Database ID** | `wrangler.toml` `[env.X.d1_databases]` | `14050249-6d7a-470a-9a80-487ae8c39af0` | ⚠️ Semi-public |
| **6. Database Name** | `wrangler.toml` `[env.X.d1_databases]` | `testcorp-auth-db` | ✅ Public |

---

## Correct Architecture Design

### Configuration Reading Strategy

```javascript
// For EXISTING deployments (reading config):
function loadCustomerMetadata(customerName, environment) {
  // 1. Read from root wrangler.toml
  const wranglerConfig = parseToml('wrangler.toml');
  
  // 2. Extract global info
  const accountId = wranglerConfig.account_id;
  
  // 3. Extract environment-specific info
  const envConfig = wranglerConfig.env[environment];
  const serviceDomain = envConfig.vars.SERVICE_DOMAIN;
  const databaseId = envConfig.d1_databases[0].database_id;
  const databaseName = envConfig.d1_databases[0].database_name;
  
  // 4. Read customer-specific variables
  const customerEnv = parseEnvFile(`config/customers/${customerName}/${environment}.env`);
  const customerDomain = customerEnv.CUSTOMER_DOMAIN;
  
  // 5. Check if secrets are set (via wrangler secret list)
  const hasApiToken = checkSecretExists('CLOUDFLARE_API_TOKEN', environment);
  
  return {
    accountId,
    serviceDomain,
    databaseId,
    databaseName,
    customerDomain,
    hasApiToken
  };
}
```

### Configuration Writing Strategy

```javascript
// For NEW deployments (creating config):
function createNewDeployment(apiToken, selectedDomain) {
  // 1. Use API token to fetch domain details from Cloudflare
  const domainInfo = await fetchCloudflareZoneInfo(apiToken, selectedDomain);
  
  // 2. Extract all info from API
  const {
    account_id,
    zone_id,
    domain,
    databases // if applicable
  } = domainInfo;
  
  // 3. Update wrangler.toml
  updateWranglerToml({
    account_id,
    env: {
      production: {
        name: `${serviceName}-prod`,
        route: `${domain}/*`,
        zone_id, // ADD THIS!
        d1_databases: databases,
        vars: {
          SERVICE_DOMAIN: customerName,
          // ... other vars
        }
      }
    }
  });
  
  // 4. Create customer env file (NO SECRETS!)
  createCustomerEnv(`config/customers/${customerName}/production.env`, {
    CUSTOMER_DOMAIN: domain,
    CUSTOMER_ID: customerName,
    // URLs, feature flags, etc.
  });
  
  // 5. Set secrets via wrangler CLI
  await execWranglerSecret('put', 'CLOUDFLARE_API_TOKEN', apiToken, 'production');
  
  return { success: true, customer: customerName };
}
```

---

## InputCollector UX Flow Redesign

### Current Flow (WRONG ❌)
```
1. Ask for customer name
2. Ask for domain
3. Ask for account ID
4. Ask for zone ID
5. Ask for API token
6. Create config
```

**Problems:**
- Requires user to manually find IDs
- Error-prone (copy-paste mistakes)
- Doesn't leverage Cloudflare API
- No way to update existing deployments

### New Flow (CORRECT ✅)

#### **Step 1: Deployment Type Detection**
```
? Are you creating a NEW deployment or UPDATING an existing one?
  → New Deployment
  → Update Existing Deployment
```

#### **Flow A: New Deployment**
```
1. "Let's set up a new deployment!"

2. 🔑 "Enter your Cloudflare API Token:"
   [Input with masking: ****************]
   
3. 🌐 "Fetching your domains from Cloudflare..."
   [API call to fetch zones]
   
4. 📋 "Select the domain for this deployment:"
   ? Domain:
     → example.com (Zone ID: 1a2b3c4d, Account: acct123)
     → test.com (Zone ID: 5e6f7g8h, Account: acct123)
     → myapp.com (Zone ID: 9i0j1k2l, Account: acct123)
   
5. ✅ "Great! Here's what we found:"
   Account ID: acct123
   Zone ID: 1a2b3c4d
   Domain: example.com
   
6. 📝 "Enter a name for this customer/service:"
   [Input: testcorp]
   
7. 🗄️ "Do you need a D1 database?"
   ? Yes / No
   If Yes → Fetch databases or create new
   
8. 💾 "Creating configuration..."
   ✅ Updated wrangler.toml
   ✅ Created config/customers/testcorp/production.env
   ✅ Set API token secret (hidden)
   ✅ Configuration complete!
   
9. 📋 "Next steps:"
   - Review generated config
   - Run: wrangler deploy --env production
```

#### **Flow B: Update Existing**
```
1. 🔍 "Loading existing deployments..."
   [Read from wrangler.toml [env.*] sections]
   
2. 📋 "Select the deployment to update:"
   ? Deployment:
     → testcorp (production)
         Domain: example.com
         Account: acct123
         Database: testcorp-db
         Last deployed: 2 days ago
     → acmecorp (production)
         Domain: acme.com
         Account: acct123
         Database: acmecorp-db
         Last deployed: 1 week ago
   
3. ✅ "Current configuration for testcorp:"
   Account ID: acct123****** 
   Zone ID: 1a2b3c4d******
   Domain: example.com
   Database: testcorp-db (14050249-****)
   API Token: ******** (configured)
   
4. 🔄 "What would you like to update?"
   [ ] Domain name
   [ ] Database configuration
   [ ] Environment variables
   [ ] API Token (rotate)
   
5. [For each selected item, collect new values]
   
6. 💾 "Updating configuration..."
   ✅ Updated wrangler.toml
   ✅ Updated customer environment variables
   
7. ✅ "Update complete!"
```

---

## Implementation Tasks

### Phase 1: Core Config Reading ✅
- [x] Update CustomerConfigurationManager to parse TOML
- [x] Read account_id from wrangler.toml (top level)
- [x] Read [env.X] sections for environment-specific config
- [x] Read SERVICE_DOMAIN from vars
- [x] Read database info from d1_databases[]
- [x] Parse customer env files with correct field names (CUSTOMER_DOMAIN)
- [x] Display all 6 core pieces in customer list

### Phase 2: InputCollector Redesign 🔄
- [ ] Add deployment type question (new vs update)
- [ ] Implement Cloudflare API integration for domain fetching
- [ ] Create new deployment flow with API-driven UX
- [ ] Create update existing flow with config loading
- [ ] Add masked display for sensitive info

### Phase 3: Config Writing ⏳
- [ ] Create TOML writer utility
- [ ] Update wrangler.toml with new [env.X] sections
- [ ] Create customer env files with correct field names
- [ ] Integrate wrangler secret commands
- [ ] Add validation and rollback on errors

### Phase 4: Testing & Documentation ⏳
- [ ] Test new deployment flow in data-service
- [ ] Test update existing flow
- [ ] Update all documentation
- [ ] Create migration guide for existing projects
- [ ] Release v2.0.7

---

## Field Mapping Reference

| Framework Field (OLD) | Real Field (NEW) | Location |
|----------------------|------------------|----------|
| `DOMAIN` | `CUSTOMER_DOMAIN` | `config/customers/{name}/{env}.env` |
| `CLOUDFLARE_ACCOUNT_ID` | `account_id` | `wrangler.toml` (top level) |
| `CLOUDFLARE_ZONE_ID` | `zone_id` | `wrangler.toml` `[env.X]` (NEW!) |
| `CLOUDFLARE_API_TOKEN` | Secret store | `wrangler secret put` command |
| `WRANGLER_CONFIG` | `wrangler.toml` | Root of project |
| `DATABASE_NAME` | `database_name` | `wrangler.toml` `[env.X.d1_databases[]]` |
| N/A | `database_id` | `wrangler.toml` `[env.X.d1_databases[]]` |
| N/A | `SERVICE_DOMAIN` | `wrangler.toml` `[env.X.vars]` |

---

## Security Best Practices

### ✅ DO:
- Store API tokens in wrangler secrets (never in files)
- Use masked display for sensitive IDs (show first 8 chars)
- Keep account_id and zone_id in wrangler.toml (needed for deployment)
- Store customer-specific URLs and domains in customer env files

### ❌ DON'T:
- Put API tokens in env files or git
- Show full API tokens in logs or UI
- Store secrets in customer config files
- Hardcode credentials anywhere

---

## Next Steps

1. ✅ **Document architecture** (this file)
2. 🔄 **Fix metadata loading** - Read from wrangler.toml
3. ⏳ **Add TOML parser** - Use @iarna/toml or similar
4. ⏳ **Update display** - Show real config info
5. ⏳ **Redesign InputCollector** - Implement new/update flows
6. ⏳ **Test in data-service** - Validate real-world usage
7. ⏳ **Release v2.0.7** - Production-ready config system

---

**Author**: Framework Team  
**Review Status**: Architecture Approved  
**Implementation**: In Progress
