# Extraction Plan: master-deploy.js → Modular Workflow Files

**Date:** October 30, 2025  
**Goal:** Extract reusable workflows into separate modules, keep master-deploy.js as thin orchestration wrapper

---

## Current State Analysis

**master-deploy.js:** 1407 lines (after duplicate removal)

### Extractable Workflows Identified:

| Method | Lines | Extract To | Reason |
|--------|-------|------------|--------|
| `handleDatabase()` | 124 | `interactive-database-workflow.js` | Unique interactive DB creation |
| `handleSecrets()` | 106 | `interactive-secret-workflow.js` | Interactive secret management |
| `preDeploymentChecks()` | 57 | ValidationManager (enhance) | Validation logic |
| `gatherSingleDomainInfo()` | 57 | DeploymentConfiguration (enhance) | Config gathering |
| `finalConfirmation()` | 30 | `interactive-confirmation.js` | Confirmation UI |
| `postDeploymentTesting()` | 44 | MonitoringIntegration (enhance) | Testing workflow |
| `showSuccessSummary()` | 30 | `deployment-summary.js` | Success reporting |
| `executeDeployment()` | 20 | Keep (orchestration) | Just calls methods |
| `handleD1DeploymentError()` | ~100 | `d1-error-recovery.js` | D1 error handling |
| `configureEnterpriseFeatures()` | 17 | Keep (orchestration) | Simple prompts |
| `configureAdvancedFeatures()` | 32 | `interactive-feature-config.js` | Feature configuration |

**Total Extractable:** ~617 lines (44% of file)  
**Remaining Wrapper:** ~790 lines (56%)

---

## Extraction Plan

### Phase 1: Create Core Interactive Workflow Modules

#### 1. Create `bin/shared/deployment/interactive-database-workflow.js`
**Extract:** `handleDatabase()` - 124 lines

**Purpose:** Reusable interactive database creation workflow

**API:**
```javascript
export class InteractiveDatabaseWorkflow {
  async handleDatabaseSetup(domain, environment, options = {}) {
    // Extracted logic from handleDatabase()
    // Returns: { databaseName, databaseId, rollbackAction }
  }
}
```

**Benefits:**
- Reusable by modular-enterprise-deploy.js
- Can be used by any deployment script
- Testable in isolation

---

#### 2. Create `bin/shared/deployment/interactive-secret-workflow.js`
**Extract:** `handleSecrets()` - 106 lines

**Purpose:** Interactive secret management workflow

**API:**
```javascript
export class InteractiveSecretWorkflow {
  async handleSecretManagement(domain, environment, workerName, options = {}) {
    // Extracted logic from handleSecrets()
    // Returns: { secrets, rollbackActions, distributionPath }
  }
}
```

---

#### 3. Create `bin/shared/deployment/d1-error-recovery.js`
**Extract:** `handleD1DeploymentError()` + `getD1RecoveryMessage()` - ~120 lines

**Purpose:** Sophisticated D1 database error recovery

**API:**
```javascript
export class D1ErrorRecoveryManager {
  async handleD1BindingError(error, config) {
    // Extracted logic from handleD1DeploymentError()
    // Returns: { handled, retry, action, message }
  }
  
  getRecoveryMessage(recoveryResult) {
    // User-friendly messages
  }
}
```

---

#### 4. Create `bin/shared/deployment/interactive-confirmation.js`
**Extract:** `finalConfirmation()` - 30 lines

**Purpose:** Deployment confirmation UI

**API:**
```javascript
export async function showDeploymentConfirmation(config, options = {}) {
  // Display summary and confirm
  // Returns: boolean (proceed or cancel)
}
```

---

#### 5. Create `bin/shared/deployment/deployment-summary.js`
**Extract:** `showSuccessSummary()` + `showEnterpriseSuccessSummary()` - ~100 lines

**Purpose:** Success summary reporting

**API:**
```javascript
export class DeploymentSummary {
  static async displaySuccessSummary(deploymentState, config, options = {}) {
    // Display comprehensive success summary
  }
  
  static async displayEnterpriseSuccessSummary(deploymentState, config, paths) {
    // Enterprise-specific summary
  }
}
```

---

### Phase 2: Enhance Existing Modules

#### 6. Enhance `ValidationManager` 
**Add:** `preDeploymentChecks()` logic - 57 lines

**Changes:**
```javascript
// Add to bin/deployment/modules/ValidationManager.js
async executePreDeploymentChecks(config) {
  // Move logic from preDeploymentChecks()
}
```

---

#### 7. Enhance `DeploymentConfiguration`
**Add:** Enhanced domain info gathering - 57 lines

**Changes:**
```javascript
// Add to bin/deployment/modules/DeploymentConfiguration.js
async gatherSingleDomainInfoWithDiscovery(options = {}) {
  // Move logic from gatherSingleDomainInfo()
  // Adds: config discovery, enhanced validation
}
```

---

#### 8. Enhance `MonitoringIntegration`
**Add:** Post-deployment testing - 44 lines

**Changes:**
```javascript
// Add to bin/deployment/modules/MonitoringIntegration.js
async executePostDeploymentTesting(config) {
  // Move logic from postDeploymentTesting()
}
```

---

### Phase 3: Reduce master-deploy.js to Thin Wrapper

After extraction, master-deploy.js becomes:

```javascript
class EnterpriseInteractiveDeployer {
  constructor() {
    // Initialize modules (keep)
    this.workflows = {
      database: new InteractiveDatabaseWorkflow(),
      secrets: new InteractiveSecretWorkflow(),
      d1Recovery: new D1ErrorRecoveryManager()
    };
  }
  
  async run() {
    // Orchestration only (keep)
    await this.selectDeploymentMode();
    await this.gatherEnhancedInfo(); // Delegates to modules
    await this.configureEnterpriseFeatures();
    await this.comprehensiveValidation(); // Delegates
    await this.orchestrateDatabase(); // Uses workflow.database
    await this.manageEnterpriseSecrets(); // Uses workflow.secrets
    await this.executeEnterpriseDeployment();
    await this.showEnterpriseSuccessSummary(); // Uses DeploymentSummary
  }
  
  // All complex logic moved to workflow modules!
}
```

**Result:**
- master-deploy.js: ~400 lines (orchestration only)
- Extracted workflows: ~617 lines in reusable modules
- Total lines: ~1017 (reduction from 1407 due to consolidation)

---

## Detailed Extraction Breakdown

### File 1: `interactive-database-workflow.js` (140 lines)

**Extracts from master-deploy.js:**
- `handleDatabase()` method (124 lines)
- Database name generation logic
- Interactive database selection/creation/deletion
- Rollback action tracking

**New structure:**
```javascript
export class InteractiveDatabaseWorkflow {
  constructor(options = {}) {
    this.rollbackActions = options.rollbackActions || [];
  }
  
  async handleDatabaseSetup(domain, environment, options = {}) {
    const dbName = options.databaseName || `${domain}-auth-db`;
    
    // Prompt for custom name
    const finalName = await this.promptForDatabaseName(dbName);
    
    // Check existing
    const existing = await this.checkExistingDatabase(finalName);
    
    if (existing) {
      return await this.handleExistingDatabase(finalName, existing);
    } else {
      return await this.createNewDatabase(finalName);
    }
  }
  
  async promptForDatabaseName(suggested) { /* ... */ }
  async checkExistingDatabase(name) { /* ... */ }
  async handleExistingDatabase(name, existingInfo) { /* ... */ }
  async createNewDatabase(name) { /* ... */ }
}
```

---

### File 2: `interactive-secret-workflow.js` (130 lines)

**Extracts from master-deploy.js:**
- `handleSecrets()` method (106 lines)
- Secret file discovery
- Interactive secret reuse/regeneration
- Secret deployment with rollback tracking

**New structure:**
```javascript
export class InteractiveSecretWorkflow {
  constructor(secretManager, options = {}) {
    this.secretManager = secretManager; // EnhancedSecretManager
    this.rollbackActions = options.rollbackActions || [];
  }
  
  async handleSecretManagement(domain, environment, workerName, options = {}) {
    // Check for existing secrets
    const existing = await this.discoverExistingSecrets(domain);
    
    // Prompt to reuse or generate new
    const secrets = await this.obtainSecrets(domain, environment, existing);
    
    // Deploy secrets
    await this.deploySecrets(secrets, workerName, environment);
    
    // Generate distribution
    await this.generateDistribution(domain, secrets);
    
    return { secrets, distributionPath: `secrets/distribution/${domain}` };
  }
  
  async discoverExistingSecrets(domain) { /* ... */ }
  async obtainSecrets(domain, env, existing) { /* ... */ }
  async deploySecrets(secrets, worker, env) { /* ... */ }
  async generateDistribution(domain, secrets) { /* ... */ }
}
```

---

### File 3: `d1-error-recovery.js` (150 lines)

**Extracts from master-deploy.js:**
- `handleD1DeploymentError()` method (~100 lines)
- `getD1RecoveryMessage()` method (~20 lines)
- D1 binding error detection and recovery

**New structure:**
```javascript
export class D1ErrorRecoveryManager {
  constructor(options = {}) {
    this.rollbackActions = options.rollbackActions || [];
  }
  
  async handleD1BindingError(error, config) {
    // Import WranglerDeployer
    const { WranglerDeployer } = await import('../../dist/deployment/wrangler-deployer.js');
    
    // Create deployer instance
    const deployer = new WranglerDeployer({
      cwd: process.cwd(),
      environment: config.environment
    });
    
    // Attempt recovery
    const recoveryResult = await deployer.handleD1BindingError(error, {
      configPath: 'wrangler.toml',
      environment: config.environment
    });
    
    if (recoveryResult.handled && recoveryResult.backupPath) {
      // Add rollback action
      this.rollbackActions.unshift({
        type: 'restore-wrangler-config',
        backupPath: recoveryResult.backupPath,
        description: 'Restore wrangler.toml backup after D1 recovery'
      });
    }
    
    return {
      handled: recoveryResult.handled,
      retry: this.shouldRetryAfterRecovery(recoveryResult.action),
      action: recoveryResult.action,
      message: this.getRecoveryMessage(recoveryResult)
    };
  }
  
  shouldRetryAfterRecovery(action) {
    return ['created_and_configured', 'database_selected_and_configured', 'binding_updated']
      .includes(action);
  }
  
  getRecoveryMessage(result) {
    const messages = {
      'created_and_configured': `Created D1 database '${result.databaseName}' and updated configuration`,
      'database_selected_and_configured': 'Selected existing database and updated configuration',
      'binding_updated': 'Updated D1 database binding configuration',
      'cancelled': 'D1 error recovery was cancelled by user',
      /* ... more cases */
    };
    return messages[result.action] || `D1 recovery completed with action: ${result.action}`;
  }
}
```

---

### File 4: `deployment-summary.js` (120 lines)

**Extracts from master-deploy.js:**
- `showSuccessSummary()` (30 lines)
- `showEnterpriseSuccessSummary()` (~90 lines)

**New structure:**
```javascript
export class DeploymentSummary {
  static async displaySuccessSummary(deploymentState, config) {
    const duration = (Date.now() - deploymentState.startTime.getTime()) / 1000;
    
    console.log('\\n🎉 DEPLOYMENT SUCCESSFUL!');
    console.log('=========================');
    console.log(`\\n📊 Summary:`);
    console.log(`   🆔 Deployment ID: ${deploymentState.deploymentId}`);
    console.log(`   🌐 Domain: ${config.domain}`);
    console.log(`   ⏱️ Duration: ${duration.toFixed(1)}s`);
    
    this.displayEndpoints(config);
    this.displayDistributionFiles(config);
    this.displayNextSteps(config);
  }
  
  static async displayEnterpriseSuccessSummary(deploymentState, config, frameworkPaths) {
    console.log('\\n🎉 ENTERPRISE DEPLOYMENT SUCCESSFUL!');
    
    this.displayDeploymentStats(deploymentState, config);
    this.displayEnterpriseEndpoints(config);
    this.displayGeneratedFiles(frameworkPaths, config);
    this.displayEnabledFeatures(config);
    this.displayEnterpriseNextSteps(config);
  }
  
  static displayEndpoints(config) { /* ... */ }
  static displayDistributionFiles(config) { /* ... */ }
  static displayNextSteps(config) { /* ... */ }
  /* ... more helper methods */
}
```

---

## Benefits of Extraction

### 1. Reusability ✅
- All workflows can be used by:
  - `master-deploy.js` (interactive mode)
  - `modular-enterprise-deploy.js` (modular mode)
  - `bin/commands/deploy.js` (simple mode, if needed)
  - Future deployment tools

### 2. Testability ✅
- Each workflow can be unit tested independently
- Mock dependencies easily
- Test edge cases in isolation

### 3. Maintainability ✅
- Single responsibility principle
- Changes to database workflow don't affect secret workflow
- Easier to understand and modify

### 4. Reduced Duplication ✅
- `master-deploy.js` and `modular-enterprise-deploy.js` can share workflows
- No more duplicate interactive logic

### 5. Better Organization ✅
```
bin/shared/deployment/
  ├── interactive-database-workflow.js    (140 lines)
  ├── interactive-secret-workflow.js      (130 lines)
  ├── d1-error-recovery.js                (150 lines)
  ├── interactive-confirmation.js         (40 lines)
  └── deployment-summary.js               (120 lines)
```

---

## Implementation Steps

### Step 1: Create workflow files (2-3 hours)
1. Create `interactive-database-workflow.js`
2. Create `interactive-secret-workflow.js`
3. Create `d1-error-recovery.js`
4. Create `deployment-summary.js`
5. Create `interactive-confirmation.js`

### Step 2: Extract code from master-deploy.js (2 hours)
1. Copy methods to new files
2. Convert to class methods
3. Add proper imports/exports
4. Update method signatures for reusability

### Step 3: Update master-deploy.js to use workflows (1 hour)
1. Import new workflow classes
2. Initialize in constructor
3. Replace method calls with workflow calls
4. Remove extracted methods

### Step 4: Update modular-enterprise-deploy.js (1 hour)
1. Import same workflow classes
2. Use in phase executions
3. Remove any duplicate interactive logic

### Step 5: Test (2 hours)
1. Unit test each workflow
2. Integration test master-deploy.js
3. Integration test modular-enterprise-deploy.js

**Total Effort:** ~8-9 hours

---

## Final State Comparison

### Before Extraction:
```
master-deploy.js:           1407 lines (monolithic)
modular-enterprise-deploy:   422 lines (some duplication potential)
Total:                      1829 lines
```

### After Extraction:
```
master-deploy.js:                        ~400 lines (thin wrapper)
modular-enterprise-deploy:               ~350 lines (uses workflows)
bin/shared/deployment/
  ├── interactive-database-workflow.js    140 lines
  ├── interactive-secret-workflow.js      130 lines
  ├── d1-error-recovery.js                150 lines
  ├── deployment-summary.js               120 lines
  └── interactive-confirmation.js          40 lines
Total:                                   1330 lines
```

**Reduction:** 499 lines (27% smaller)  
**Reusability:** 5 new sharable modules  
**Maintainability:** ⭐⭐⭐⭐⭐

---

## Recommendation

**Extract all 5 workflow modules** to:
1. Reduce master-deploy.js from 1407 → ~400 lines
2. Make workflows reusable across deployment tools
3. Improve testability and maintainability
4. Enable future enhancements without touching wrapper files

**Priority Order:**
1. **High:** `interactive-database-workflow.js` (most unique, most valuable)
2. **High:** `d1-error-recovery.js` (complex error handling)
3. **Medium:** `interactive-secret-workflow.js` (some overlap with EnhancedSecretManager)
4. **Medium:** `deployment-summary.js` (UI consistency)
5. **Low:** `interactive-confirmation.js` (simple, but nice for consistency)
