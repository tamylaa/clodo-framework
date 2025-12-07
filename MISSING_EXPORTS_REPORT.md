# Missing Exports Report

## Analysis Date: December 7, 2025

This report identifies exports that are **documented in README/docs/templates** but **not available** in the published npm package.

---

## ✅ RESOLVED Issues

### 1. COMMON_FEATURES ✅ FIXED
- **Status**: NOW EXPORTED
- **Location**: `src/worker/integration.js` line 7
- **Fix Applied**: Added `export { COMMON_FEATURES };`
- **Used In**: Templates, developer guides, integration docs

---

## ❌ MISSING Exports (Not in src/, only in lib/)

These are documented but **NOT available in npm package**:

### 1. ServiceEnhancer
- **Documented In**: README.md line 138
- **Status**: ❌ DOES NOT EXIST in src/
- **Impact**: HIGH - Featured in main README
- **Recommendation**: Remove from docs OR implement in src/

### 2. ErrorRecoveryManager
- **Documented In**: docs/api-reference.md line 686
- **Status**: ❌ DOES NOT EXIST in src/
- **Available**: lib/ has ErrorHandler but not ErrorRecoveryManager
- **Impact**: MEDIUM - API docs reference
- **Recommendation**: Remove from docs or clarify it's internal-only

### 3. ErrorHandler
- **Documented In**: Multiple i-docs/ files
- **Status**: ⚠️ EXISTS in lib/shared/utils/ but NOT exported from src/
- **Impact**: MEDIUM - Internal docs reference
- **Recommendation**: Export from src/utils/ OR remove from docs

### 4. CrossDomainCoordinator
- **Documented In**: i-docs/architecture/ files
- **Status**: ❌ NOT EXPORTED (has phantom dependencies)
- **Note**: Commented out in src/orchestration/index.js
- **Impact**: LOW - Architecture docs only
- **Recommendation**: Keep commented with explanation in docs

### 5. BaseDataService
- **Documented In**: docs/IMPLEMENTATION_CHALLENGES_ANALYSIS.md
- **Status**: ❌ DOES NOT EXIST (legacy name?)
- **Impact**: LOW - Old analysis doc
- **Recommendation**: Update to use GenericDataService

### 6. Helper Functions (Possibly Missing)

#### withRetry
- **Documented In**: docs/api-reference.md line 700
- **Status**: ❓ NEEDS VERIFICATION
- **Recommendation**: Check if exists in utils/

#### withCircuitBreaker
- **Documented In**: docs/api-reference.md line 710
- **Status**: ❓ NEEDS VERIFICATION  
- **Recommendation**: Check if exists in utils/

#### createDataService
- **Documented In**: docs/api-reference.md line 166
- **Status**: ❓ NEEDS VERIFICATION
- **Recommendation**: Check if exists

#### getAllDataServices
- **Documented In**: docs/api-reference.md line 177
- **Status**: ❓ NEEDS VERIFICATION
- **Recommendation**: Check if exists

#### autoConfigureFramework
- **Documented In**: docs/api-reference.md line 68
- **Status**: ❓ NEEDS VERIFICATION
- **Recommendation**: Check if exists

#### isFeatureEnabled / withFeature
- **Documented In**: docs/api-reference.md line 491
- **Status**: ❓ Might be methods on featureManager class
- **Recommendation**: Verify if these are standalone exports

### 7. Wrangler Utilities

#### WranglerConfigManager
- **Documented In**: i-docs/commercialization/planning/
- **Status**: ❌ NOT IN SRC (lib/ only)
- **Impact**: LOW - Planning docs
- **Recommendation**: Mark as "Enterprise/Internal Only"

### 8. Route Management

#### addRoute / addEnvVar
- **Documented In**: docs/FRAMEWORK_ASSESSMENT_SUMMARY.md
- **Status**: ❓ NEEDS VERIFICATION
- **Impact**: LOW - Assessment doc
- **Recommendation**: Verify or remove

---

## 🎯 Verified Exports (Available)

These ARE properly exported:

✅ Core API: Clodo, createService, deploy, validate, initialize, getInfo
✅ Worker: initializeService, createFeatureGuard, createRateLimitGuard, **COMMON_FEATURES**
✅ Data: GenericDataService, SchemaManager, schemaManager, ModuleManager, moduleManager
✅ Routing: EnhancedRouter, GenericRouteHandler
✅ Domain: createDomainConfigSchema, validateDomainConfig, createDefaultDomainConfig
✅ Features: FeatureFlagManager, featureManager
✅ Security: SecurityCLI, ConfigurationValidator, SecretGenerator
✅ Deployment: DeploymentValidator, DeploymentAuditor
✅ Service: ServiceCreator, ServiceOrchestrator, InputCollector
✅ CLI: StandardOptions, ConfigLoader, OutputFormatter, ServiceConfigManager
✅ Monitoring: verifyWorkerDeployment, healthCheckWithBackoff, checkHealth
✅ Error: classifyError, getRecoverySuggestions
✅ Utils: createLogger, validateRequired, deepMerge
✅ Framework: FRAMEWORK_VERSION, FRAMEWORK_NAME, initializeFramework

---

## 📋 Recommended Actions

### Priority 1: Fix Documentation
1. Remove `ServiceEnhancer` from README.md (doesn't exist)
2. Remove `ErrorRecoveryManager` from docs/api-reference.md
3. Update `BaseDataService` references to `GenericDataService`

### Priority 2: Verify Questionable Exports
Run verification tests for:
- withRetry / withCircuitBreaker
- createDataService / getAllDataServices
- autoConfigureFramework
- isFeatureEnabled / withFeature as standalone functions
- addRoute / addEnvVar

### Priority 3: Add Missing Functionality (Optional)
If these features are needed:
1. Implement `ServiceEnhancer` in src/ (or remove from docs)
2. Export `ErrorHandler` from src/utils/ if it's meant to be public
3. Document that WranglerConfigManager is internal/enterprise only

---

## ✅ FIXED in v4.0.1 (Pending)

- [x] COMMON_FEATURES now exported from src/worker/integration.js
- [ ] Documentation cleanup for non-existent exports
- [ ] Verification of questionable exports

---

## Testing

Run comprehensive export verification:
```bash
npm run build
node scripts/verify-exports.js
node scripts/post-publish-test.js
```
