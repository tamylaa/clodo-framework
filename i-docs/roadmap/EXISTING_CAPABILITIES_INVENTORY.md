# Existing Capabilities Inventory
**For InputCollector Redesign**

## Overview
Before implementing the InputCollector UX redesign, this document inventories all existing capabilities in the codebase that can be reused.

---

## 🎯 Interactive Prompts (READY TO USE)

### Location: `bin/shared/utils/interactive-prompts.js`

**Available Functions:**

1. **`askUser(question, defaultValue)`** - Basic text input
   ```javascript
   const name = await askUser('Enter customer name', 'acmecorp');
   ```

2. **`askYesNo(question, defaultValue)`** - Yes/No questions
   ```javascript
   const proceed = await askYesNo('Continue with deployment?', 'y');
   ```

3. **`askChoice(question, choices, defaultIndex)`** - Single selection from list
   ```javascript
   const envIndex = await askChoice(
     'Select environment',
     ['development', 'staging', 'production'],
     0
   );
   ```

4. **`askMultiChoice(question, choices, defaultIndices)`** - Multiple selections
   ```javascript
   const features = await askMultiChoice(
     'Select features to enable',
     ['Auth', 'Logging', 'Caching'],
     [0, 1]
   );
   ```

5. **`askPassword(question)`** - Hidden input for sensitive data
   ```javascript
   const apiToken = await askPassword('Enter Cloudflare API Token');
   ```

6. **`showProgress(message, steps)`** - Progress indicator
   ```javascript
   await showProgress('Deploying service', ['⏳', '⚡', '✅']);
   ```

7. **`closePrompts()`** - Cleanup
   ```javascript
   closePrompts();
   ```

**✅ STATUS**: Ready to use, already tested in production

---

## 🎯 InputCollector (EXISTING)

### Location: `src/service-management/InputCollector.js`

**Current Capabilities:**

1. **Three-Tier Input Collection**
   - Tier 1: 6 core inputs (required)
   - Tier 2: 15 smart confirmations
   - Tier 3: 67 automated generations

2. **Template-Driven UI**
   - Uses `ui-structures-loader` for dynamic prompts
   - JSON-based input definitions
   - Validation support

3. **PowerShell Compatibility**
   - Fixed double-echo bug
   - Detects PowerShell environment
   - Adjusts readline terminal mode

4. **Methods:**
   - `collectInputsWithTransparency()` - Full three-tier collection
   - `collectInputFromDefinition(inputDef)` - Single input from template
   - `confirmOrModifyValue(inputId, defaultValue)` - Smart confirmation
   - `generateSmartDefault(inputId, coreInputs)` - Auto-generate defaults

**✅ STATUS**: Fully functional, needs extension for new/update flows

---

## 🎯 Wrangler Integration (EXISTING)

### Location: `src/deployment/wrangler-deployer.js`

**Capabilities:**

1. **Environment Detection**
   ```javascript
   detectEnvironment()
   // Checks: NODE_ENV, ENVIRONMENT, CF_PAGES_BRANCH, git branch
   ```

2. **Service Discovery**
   ```javascript
   discoverServiceInfo()
   // Reads: package.json, wrangler.toml, env vars
   // Returns: { name, version, domain, accountId }
   ```

3. **Deployment Execution**
   ```javascript
   deploy(environment, options)
   // Executes: wrangler deploy with retries and validation
   ```

4. **D1 Database Management** (via WranglerD1Manager)
   - Create databases
   - Run migrations
   - Execute queries
   - List tables

**✅ STATUS**: Production-ready, used for actual deployments

---

## 🎯 TOML Parsing (NEW - JUST ADDED)

### Location: `src/config/customers.js`

**Capabilities:**

1. **Read wrangler.toml**
   ```javascript
   import toml from '@iarna/toml';
   const wranglerConfig = toml.parse(readFileSync('wrangler.toml', 'utf8'));
   ```

2. **Extract Configuration**
   - `account_id` (global)
   - `[env.production]` sections
   - `vars.SERVICE_DOMAIN`
   - `d1_databases[]` array
   - `zone_id` if present
   - `route` patterns

3. **Write TOML** (NOT YET IMPLEMENTED)
   - Need: `toml.stringify()` for writing

**✅ STATUS**: Reading works, writing needs implementation

---

## 🎯 Customer Config System (ENHANCED)

### Location: `src/config/customers.js`, `src/config/CustomerConfigCLI.js`

**Capabilities:**

1. **Read Existing Customers**
   ```javascript
   loadExistingCustomers()
   // Reads: wrangler.toml + customer env files
   // Returns: Complete customer metadata
   ```

2. **Metadata Extraction**
   - Account ID (from wrangler.toml)
   - Service Domain (from [env.X].vars)
   - Customer Domain (from customer env files)
   - Database info (from d1_databases)
   - Zone ID if configured

3. **Customer Operations**
   - `createCustomer(name, domain, options)`
   - `validateConfigs()`
   - `showConfiguration(customer, env)`
   - `listCustomers()`

**✅ STATUS**: Recently enhanced, reads real config structure

---

## ❌ MISSING CAPABILITIES

### 1. Cloudflare API Integration
**What We Need:**
- Fetch list of zones (domains) from Cloudflare
- Get zone details (zone_id, account_id)
- Verify API token validity

**Implementation Plan:**
```javascript
// New file: src/utils/cloudflare-api.js
export class CloudflareAPI {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }
  
  async listZones() {
    const response = await fetch(`${this.baseUrl}/zones`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.result; // Array of zones
  }
  
  async getZoneDetails(zoneId) {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.result;
  }
  
  async verifyToken() {
    const response = await fetch(`${this.baseUrl}/user/tokens/verify`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  }
}
```

**Effort**: 2-3 hours (API is straightforward)

---

### 2. TOML Writing
**What We Need:**
- Write wrangler.toml with proper formatting
- Update existing [env.X] sections
- Preserve comments and structure

**Implementation Plan:**
```javascript
// Use @iarna/toml.stringify()
import toml from '@iarna/toml';

function updateWranglerConfig(configPath, updates) {
  // Read existing
  const existing = toml.parse(readFileSync(configPath, 'utf8'));
  
  // Merge updates
  const merged = {
    ...existing,
    ...updates,
    env: {
      ...existing.env,
      ...updates.env
    }
  };
  
  // Write back
  writeFileSync(configPath, toml.stringify(merged));
}
```

**Effort**: 1-2 hours (library does the heavy lifting)

---

### 3. Wrangler Secret Commands
**What We Need:**
- Execute `wrangler secret put` programmatically
- Set API tokens securely
- List existing secrets

**Implementation Plan:**
```javascript
// Add to WranglerDeployer
async setSecret(secretName, secretValue, environment) {
  return new Promise((resolve, reject) => {
    const wrangler = spawn('wrangler', [
      'secret',
      'put',
      secretName,
      '--env',
      environment
    ], {
      cwd: this.cwd,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    // Pipe secret value to stdin
    wrangler.stdin.write(secretValue);
    wrangler.stdin.end();
    
    wrangler.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Secret set failed: ${code}`));
    });
  });
}
```

**Effort**: 1 hour (similar to existing wrangler commands)

---

## 📋 Implementation Checklist

### Phase 1: Create Missing Utilities (4-6 hours)
- [ ] Create `src/utils/cloudflare-api.js` with zone listing
- [ ] Add TOML writing utility to `src/config/customers.js`
- [ ] Add secret management to `WranglerDeployer`
- [ ] Write unit tests for new utilities

### Phase 2: Extend InputCollector (6-8 hours)
- [ ] Add deployment type question (new vs update)
- [ ] Implement new deployment flow
  - [ ] Collect API token (use `askPassword`)
  - [ ] Fetch domains from Cloudflare
  - [ ] Show domain list (use `askChoice`)
  - [ ] Extract zone details
  - [ ] Prefill all fields
  - [ ] Create config
- [ ] Implement update existing flow
  - [ ] Load customers from wrangler.toml
  - [ ] Show customer list (use `askChoice`)
  - [ ] Load current config
  - [ ] Allow selective updates (use `askMultiChoice`)
  - [ ] Update config

### Phase 3: Integration & Testing (4-6 hours)
- [ ] Test new deployment flow in data-service
- [ ] Test update existing flow
- [ ] Test error handling (invalid API token, etc.)
- [ ] Update documentation
- [ ] Create video walkthrough

### Phase 4: Release (2 hours)
- [ ] Clean up debug logs
- [ ] Update CHANGELOG.md
- [ ] Bump version to 2.0.7
- [ ] Release to npm
- [ ] Update GitHub

**Total Estimated Effort**: 16-22 hours (2-3 days)

---

## 🎯 Recommended Approach

1. **Start Small**: Implement Cloudflare API first (2-3 hours)
2. **Test Incrementally**: Verify API works before integrating
3. **Reuse Everything**: Use existing interactive-prompts.js
4. **Follow Existing Patterns**: Mirror InputCollector structure
5. **Document As You Go**: Update this file with learnings

---

## 📝 Notes

- All interactive prompt utilities already exist and work
- InputCollector has solid foundation, just needs new flows
- Wrangler integration is production-ready
- Only 3 missing pieces: Cloudflare API, TOML write, Secret commands
- Each missing piece is < 3 hours of work
- **Total new code needed**: ~300-400 lines

**Conclusion**: We have 80% of what we need. The redesign is mostly composition of existing pieces plus 3 small new utilities.
