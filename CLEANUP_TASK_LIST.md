# Clean Framework Task List
**Version 2.0.7 Cleanup & Consolidation**

**Date**: October 12, 2025  
**Goal**: Remove duplicates, consolidate utilities, prepare clean release

---

## 📋 PHASE 1: Code Consolidation & Deduplication

### Task 1.1: Merge Cloudflare API Implementations ⚠️ HIGH PRIORITY
**Problem**: We have TWO Cloudflare API implementations:
- `src/utils/cloudflare-api.js` (NEW - just created, 300 lines)
- `bin/shared/cloudflare/ops.js` (EXISTING - 344 lines)

**Analysis**:

| Feature | cloudflare-api.js | ops.js | Best Implementation |
|---------|------------------|---------|---------------------|
| Token verification | ✅ Direct API | ❌ Via wrangler | **cloudflare-api.js** |
| List zones | ✅ API fetch | ❌ None | **cloudflare-api.js** |
| Zone details | ✅ API fetch | ❌ None | **cloudflare-api.js** |
| D1 database list | ✅ API fetch | ✅ Via wrangler | **cloudflare-api.js** (no wrangler dep) |
| Worker deployment | ❌ None | ✅ Via wrangler | **ops.js** |
| Secret management | ❌ None | ✅ Via wrangler | **ops.js** |
| Migrations | ❌ None | ✅ Via wrangler | **ops.js** |
| Error recovery | ❌ None | ✅ Full retry logic | **ops.js** |
| Monitoring | ❌ None | ✅ ProductionMonitor | **ops.js** |
| Rate limiting | ❌ None | ✅ Built-in | **ops.js** |

**Decision**: **KEEP BOTH** but consolidate:
- `cloudflare-api.js` → For API-based operations (token verify, list zones, get details)
- `ops.js` → For wrangler CLI operations (deploy, secrets, migrations)
- Move secret management from `WranglerDeployer` to `ops.js` (it's duplicated)

**Action Items**:
- [ ] Remove secret management from `src/deployment/wrangler-deployer.js` (lines 660-840)
- [ ] Import and use `ops.js` secret methods instead
- [ ] Add `cloudflare-api.js` as dependency in `ops.js` for zone operations
- [ ] Create unified export in `src/utils/cloudflare/index.js`
- [ ] Update documentation to explain when to use which

**Files to Edit**:
```
src/deployment/wrangler-deployer.js  - Remove setSecret, listSecrets, deleteSecret
bin/shared/cloudflare/ops.js         - Keep as-is (already has secret mgmt)
src/utils/cloudflare-api.js          - Keep for API operations
src/utils/cloudflare/index.js        - CREATE: Unified exports
```

**Estimated Time**: 1 hour

---

### Task 1.2: Remove Debug Console.log Statements
**Problem**: Scattered debug logs from development

**Locations**:
```javascript
// src/config/customers.js:171
console.log(`[DEBUG] Config directory being validated: ${this.configDir}`);

// Check for other console.log in production code
```

**Action Items**:
- [ ] Search for `console.log` in src/ directory
- [ ] Remove debug statements (keep logger.info/warn/error)
- [ ] Ensure all logging uses createLogger()
- [ ] Update logging levels appropriately

**Command**:
```bash
grep -r "console\.log" src/ --exclude-dir=node_modules
```

**Estimated Time**: 30 minutes

---

### Task 1.3: Consolidate Interactive Prompt Utilities
**Problem**: May have duplicate prompt code

**Locations**:
- `bin/shared/utils/interactive-prompts.js` ✅ (Good, reusable)
- `src/utils/deployment/interactive-prompts.js` (Check if duplicate)
- `src/utils/prompt-handler.js` (Check if duplicate)

**Action Items**:
- [ ] Compare all three files
- [ ] Identify duplicates
- [ ] Keep only `bin/shared/utils/interactive-prompts.js`
- [ ] Update imports across codebase
- [ ] Delete duplicates

**Estimated Time**: 45 minutes

---

### Task 1.4: Clean Up Import Paths
**Problem**: Some files may have inconsistent import paths

**Action Items**:
- [ ] Standardize all imports to use relative paths correctly
- [ ] Ensure dist/ transpiled imports work
- [ ] Check for circular dependencies
- [ ] Run build and verify no import errors

**Command**:
```bash
npm run build
npm test
```

**Estimated Time**: 30 minutes

---

## 📋 PHASE 2: File Organization

### Task 2.1: Move Cloudflare API to Proper Location
**Problem**: New file in wrong location

**Current**:
```
src/utils/cloudflare-api.js
```

**Should Be**:
```
src/utils/cloudflare/api.js
bin/shared/cloudflare/ops.js (already correct)
```

**Action Items**:
- [ ] Create `src/utils/cloudflare/` directory
- [ ] Move `cloudflare-api.js` → `cloudflare/api.js`
- [ ] Create `src/utils/cloudflare/index.js` for unified exports
- [ ] Update all imports

**New Structure**:
```
src/utils/cloudflare/
├── index.js        # Unified exports
├── api.js          # API-based operations
└── README.md       # Usage docs

bin/shared/cloudflare/
└── ops.js          # CLI-based operations
```

**Estimated Time**: 20 minutes

---

### Task 2.2: Create Missing Index Files
**Problem**: Some directories lack index.js exports

**Action Items**:
- [ ] Create `src/utils/cloudflare/index.js`
- [ ] Create `src/utils/deployment/index.js` (if missing)
- [ ] Verify all major directories have index.js
- [ ] Test all exports work correctly

**Estimated Time**: 30 minutes

---

## 📋 PHASE 3: Documentation Updates

### Task 3.1: Update API Documentation
**Files to Update**:
- [ ] `docs/api-reference.md` - Add Cloudflare API methods
- [ ] `README.md` - Update with v2.0.7 features
- [ ] `CHANGELOG.md` - Document all changes

**New Sections Needed**:
```markdown
## Cloudflare Integration

### API-Based Operations
Use `CloudflareAPI` for:
- Token verification
- Zone listing
- Domain discovery
- Zone details

### CLI-Based Operations  
Use `ops.js` for:
- Worker deployment
- Secret management
- Database migrations
- SQL execution
```

**Estimated Time**: 1 hour

---

### Task 3.2: Update i-docs
**Files to Update**:
- [ ] `i-docs/CUSTOMER_CONFIG_ARCHITECTURE_ALIGNMENT.md` - Mark as implemented
- [ ] `i-docs/EXISTING_CAPABILITIES_INVENTORY.md` - Update status
- [ ] Create `i-docs/CLOUDFLARE_API_GUIDE.md` - Usage examples

**Estimated Time**: 45 minutes

---

### Task 3.3: Create Migration Guide
**File**: `docs/MIGRATION_V2.0.6_TO_V2.0.7.md`

**Contents**:
- Customer config system changes
- New Cloudflare API utilities
- Deprecated methods (if any)
- Breaking changes (if any)
- Update steps

**Estimated Time**: 30 minutes

---

## 📋 PHASE 4: Testing & Validation

### Task 4.1: Unit Tests for New Utilities
**Files to Create**:
```
test/utils/cloudflare-api.test.js
test/config/customer-config-wrangler.test.js
test/deployment/wrangler-secrets.test.js (remove if ops.js is used)
```

**Test Coverage Needed**:
- [ ] CloudflareAPI - all methods
- [ ] TOML reading/writing
- [ ] Customer metadata loading
- [ ] Wrangler.toml updates

**Estimated Time**: 2 hours

---

### Task 4.2: Integration Tests
**Scenarios**:
- [ ] List customers (from real wrangler.toml)
- [ ] Show customer config
- [ ] Validate config structure
- [ ] Update wrangler.toml (dry run)

**Test in**:
- Framework directory (framework mode)
- Data-service directory (service mode)

**Estimated Time**: 1.5 hours

---

### Task 4.3: Cross-Platform Testing
**Platforms**:
- [ ] Windows PowerShell
- [ ] Windows WSL
- [ ] macOS (if available)
- [ ] Linux (via CI)

**Estimated Time**: 1 hour

---

## 📋 PHASE 5: Build & Package

### Task 5.1: Clean Build
**Action Items**:
- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Verify dist/ output
- [ ] Check bundle size
- [ ] Test all bin/ commands

**Estimated Time**: 20 minutes

---

### Task 5.2: Update package.json
**Changes Needed**:
```json
{
  "version": "2.0.7",
  "exports": {
    // Add new exports
    "./utils/cloudflare": "./dist/utils/cloudflare/index.js"
  },
  "dependencies": {
    "@iarna/toml": "^3.0.0"  // Already added
  }
}
```

**Action Items**:
- [ ] Bump version to 2.0.7
- [ ] Add new export paths
- [ ] Verify dependencies
- [ ] Update keywords if needed

**Estimated Time**: 15 minutes

---

### Task 5.3: Update CHANGELOG.md
**Version 2.0.7 Entry**:
```markdown
## [2.0.7] - 2025-10-12

### Added
- Cloudflare API client for zone listing and token verification
- TOML writing capabilities for wrangler.toml updates
- Customer configuration now reads from actual wrangler.toml structure
- Support for CUSTOMER_DOMAIN field in customer env files
- Enhanced customer list display with account ID, zone ID, database info

### Fixed
- Customer config duplicate output bug
- PowerShell compatibility in customer-cli
- Customer metadata loading from real deployment configs
- Config directory path resolution for service projects

### Changed
- Customer config CLI now defaults to ./config directory
- Added --config-dir parameter support
- Improved customer list display format

### Deprecated
- None

### Removed
- Duplicate code in customer-cli.js (lines 150-293)
```

**Estimated Time**: 20 minutes

---

## 📋 PHASE 6: Release Preparation

### Task 6.1: Pre-Release Checklist
- [ ] All tests passing (117/117)
- [ ] No console.log in src/
- [ ] All documentation updated
- [ ] CHANGELOG.md complete
- [ ] Version bumped to 2.0.7
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] ESLint passes

**Estimated Time**: 30 minutes

---

### Task 6.2: Git Workflow
**Steps**:
```bash
# Commit all changes
git add .
git commit -m "chore: consolidate Cloudflare utilities and fix customer config system

- Merge Cloudflare API implementations
- Fix customer config to read from real wrangler.toml
- Add TOML writing capabilities
- Remove duplicate code and debug logs
- Update documentation

Closes #XX"

# Sync with remote
npm run sync

# Let semantic-release handle version bump and publish
git push origin master
```

**Estimated Time**: 15 minutes

---

### Task 6.3: npm Publish
**Steps**:
```bash
# Build production bundle
npm run build

# Publish to npm
npm publish --access public

# Verify published package
npm view @tamyla/clodo-framework@2.0.7
```

**Estimated Time**: 15 minutes

---

### Task 6.4: Post-Release
- [ ] Update downstream projects (data-service)
- [ ] Test in production environment
- [ ] Monitor for issues
- [ ] Update project boards
- [ ] Announce release

**Estimated Time**: 1 hour

---

## 📊 TIME ESTIMATES

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1: Code Consolidation | 4 tasks | 2.75 hours |
| Phase 2: File Organization | 2 tasks | 0.83 hours |
| Phase 3: Documentation | 3 tasks | 2.25 hours |
| Phase 4: Testing | 3 tasks | 4.5 hours |
| Phase 5: Build & Package | 3 tasks | 0.92 hours |
| Phase 6: Release | 4 tasks | 2.5 hours |
| **TOTAL** | **19 tasks** | **13.75 hours** |

**Realistic Estimate**: 15-18 hours (2 full work days)

---

## 🎯 PRIORITY MATRIX

### 🔴 CRITICAL (Must Do Before Release)
1. **Task 1.1** - Merge Cloudflare API implementations
2. **Task 1.2** - Remove debug console.log
3. **Task 4.1** - Unit tests for new utilities
4. **Task 5.1** - Clean build
5. **Task 5.3** - Update CHANGELOG

### 🟡 HIGH (Should Do)
6. **Task 2.1** - Move Cloudflare API to proper location
7. **Task 3.1** - Update API documentation
8. **Task 4.2** - Integration tests
9. **Task 6.1** - Pre-release checklist

### 🟢 MEDIUM (Nice to Have)
10. **Task 1.3** - Consolidate prompts
11. **Task 2.2** - Create missing index files
12. **Task 3.2** - Update i-docs
13. **Task 4.3** - Cross-platform testing

### ⚪ LOW (Future)
14. **Task 1.4** - Clean up import paths (if build works)
15. **Task 3.3** - Migration guide (can be added later)

---

## 🚀 RECOMMENDED EXECUTION PLAN

### Option A: Quality Release (2 days)
**Day 1**: Phases 1-3 (code, organization, docs)  
**Day 2**: Phases 4-6 (testing, build, release)

**Benefits**: Thorough, high quality, minimal risk  
**Timeline**: Release evening of Day 2

### Option B: Fast Release (1 day)
**Focus on**: Critical tasks only (1, 2, 4.1, 5.1, 5.3, 6.1-6.3)  
**Skip**: Nice-to-haves, comprehensive testing

**Benefits**: Ship quickly, iterate later  
**Timeline**: Release tonight  
**Risks**: Possible bugs in edge cases

### Option C: Incremental (Recommended)
**Today**: Critical tasks (1.1, 1.2, 5.1, 5.3) → v2.0.7-beta  
**Tomorrow**: Testing & polish → v2.0.7 stable

**Benefits**: Best of both worlds  
**Timeline**: Beta tonight, stable tomorrow

---

## 📝 NEXT STEPS

**Immediate Actions**:
1. Choose execution plan (A, B, or C)
2. Start with Task 1.1 (Cloudflare API consolidation)
3. Run through critical tasks
4. Test in data-service
5. Release decision

**Questions to Answer**:
- Do we want beta release tonight or full release in 2 days?
- Should InputCollector redesign be v2.0.7 or v2.1.0?
- Any breaking changes we need to communicate?

---

**Status**: Ready to execute  
**Blockers**: None  
**Risk Level**: Low (if we test properly)
