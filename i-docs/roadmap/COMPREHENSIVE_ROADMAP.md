# Comprehensive Clodo Framework Roadmap

**Status**: v3.1.14 - 85% Complete
**Last Updated**: October 28, 2025

---

## Executive Summary

The clodo-framework refactoring is **architecturally complete** (all 6 core commands fully implemented). Remaining work falls into 4 cohesive phases focused on **UX optimization, consistency, and professional polish**.

### Current State
- ✅ All 6 commands: create, deploy, validate, update, diagnose, assess
- ✅ Smart credential collection with auto-fetch
- ✅ Modular architecture (390+ lines split into focused 35-206 line modules)
- ✅ 39 passing tests covering validators, loaders, orchestrators
- ✅ Shared utilities exist: formatters.js, error-recovery.js, interactive-prompts.js
- ❌ Incomplete: Cross-command consistency, UX polish, feature parity

---

## Phase 1: Standardize CLI Options & Output (12-16 hours)

### Goal
Make all 6 commands consistent with shared options, output modes, and logging patterns.

### 1.1 Standardize Global Options
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: None

```
All commands should support:
  --verbose, -v        Verbose output with debug info
  --quiet, -q          Minimal output (only errors/warnings)
  --json               Output results as JSON (parseable)
  --no-color          Disable colored output
  --config-file <path> Load config from JSON file
```

**Tasks**:
- [ ] Create `bin/shared/utils/cli-options.js` - StandardOptions class that all commands reuse
- [ ] Add option definitions for: verbose, quiet, json, no-color, config-file
- [ ] Update each command to accept these options:
  - [ ] create.js - add --quiet, --json options
  - [ ] deploy.js - add --verbose, --json options (--quiet already exists)
  - [ ] validate.js - add --verbose, --json, --config-file options
  - [ ] update.js - add --verbose, --quiet, --json options
  - [ ] diagnose.js - add --verbose, --quiet, --json options
  - [ ] assess.js - add --verbose, --quiet, --json options
- [ ] Test that StandardOptions works across all commands
- [ ] Document option precedence: CLI flag > config file > environment variable

**Validation Criteria**:
```bash
npx clodo-service create --help     # shows all 5 global options
npx clodo-service deploy --json     # outputs valid JSON
npx clodo-service validate --verbose # shows debug info
```

---

### 1.2 Create Unified Output Formatter
**Impact**: High | **Effort**: 3-4 hours | **Dependencies**: 1.1

Consolidate all output formatting into a single `OutputFormatter` class that all commands use.

**Current State**: Each command has its own console.log() calls scattered throughout.

**Tasks**:
- [ ] Analyze output patterns in each command:
  - [ ] create.js - success message, error details
  - [ ] deploy.js - credential prompt, progress, result
  - [ ] validate.js - issue list, exit codes
  - [ ] update.js - confirmation, result status
  - [ ] diagnose.js - analysis report, recommendations
  - [ ] assess.js - capability score, export format
- [ ] Create `bin/shared/utils/output-formatter.js`:
  ```javascript
  export class OutputFormatter {
    constructor(options = {}) {
      this.verbose = options.verbose
      this.quiet = options.quiet
      this.json = options.json
      this.colors = !options.noColor
    }
    
    success(message, data = null)
    error(message, details = null)
    warning(message, context = null)
    info(message, metadata = null)
    section(title)
    list(items, label)
    table(data, columns)
    progress(message, current, total)
    json(data)
  }
  ```
- [ ] Update each command to use OutputFormatter:
  - [ ] create.js - replace console.log with formatter
  - [ ] deploy.js - replace console.log with formatter
  - [ ] validate.js - use formatter for issues
  - [ ] update.js - use formatter for results
  - [ ] diagnose.js - use formatter for reports
  - [ ] assess.js - use formatter for scores
- [ ] Create unit tests for OutputFormatter with all 8 methods
- [ ] Document output format for each command

**Validation Criteria**:
```bash
npx clodo-service deploy --quiet    # only shows errors/warnings
npx clodo-service deploy --verbose  # shows all debug info
npx clodo-service deploy --json     # valid JSON output
npx clodo-service diagnose --json   # diagnosis report as JSON
```

---

### 1.3 Implement Shared Progress/Logging
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 1.1, 1.2

Integrate existing `showProgress()` and add logging utilities consistently across commands.

**Current State**: showProgress() exists in helpers.js but is not used in all commands.

**Tasks**:
- [ ] Create `bin/shared/utils/progress-manager.js`:
  ```javascript
  export class ProgressManager {
    constructor(options = {})
    startSpinner(message)
    updateSpinner(message)
    stopSpinner(success = true)
    step(number, label, status)
    progress(current, total, label)
  }
  ```
- [ ] Integrate into deploy.js for credential collection:
  - [ ] Show spinner for "Validating token"
  - [ ] Show spinner for "Fetching account ID"
  - [ ] Show spinner for "Fetching zone ID"
- [ ] Integrate into create.js for template generation:
  - [ ] Show step progress: "1/5 Collecting inputs"
  - [ ] Show spinner during ServiceOrchestrator.create()
- [ ] Integrate into validate.js for validation process
- [ ] Integrate into diagnose.js for analysis process
- [ ] Create unit tests for ProgressManager

**Validation Criteria**:
```bash
npx clodo-service deploy      # shows spinners during credential collection
npx clodo-service create      # shows step progress
npx clodo-service validate    # shows spinner during validation
```

---

### 1.4 Standardize Config File Loading
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 1.1

Make `--config-file` option work consistently across all commands.

**Current State**: Helper exists (loadJsonConfig) but not integrated into commands.

**Tasks**:
- [ ] Update `bin/shared/utils/error-recovery.js` or create `config-loader.js`:
  - [ ] loadConfig(filePath, requiredFields)
  - [ ] validateConfigFile(config)
  - [ ] mergeConfigWithOptions(config, options)
- [ ] For each command, add config file support:
  - [ ] create.js - load service defaults from config
  - [ ] deploy.js - load credential defaults from config
  - [ ] validate.js - load validation rules from config
  - [ ] update.js - load update defaults from config
  - [ ] diagnose.js - load diagnostic config (scan depth, etc)
  - [ ] assess.js - load assessment config
- [ ] Create example config files:
  - [ ] `config/clodo-create.example.json`
  - [ ] `config/clodo-deploy.example.json`
  - [ ] `config/clodo-validate.example.json`
- [ ] Add documentation for config file format

**Validation Criteria**:
```bash
npx clodo-service create --config-file config/clodo-create.example.json
npx clodo-service deploy --config-file config/clodo-deploy.example.json
cat config/clodo-create.example.json | grep -E "^{" # valid JSON
```

---

## Phase 2: Feature Parity & Missing Utilities (8-12 hours)

### Goal
Ensure all commands have equivalent feature sets and extract truly shared code.

### 2.1 Shared Utility Functions
**Impact**: High | **Effort**: 3-4 hours | **Dependencies**: 1.2

Extract truly duplicated utility functions into shared modules.

**Current State**: Helpers exist but commands don't all use them consistently.

**Tasks**:
- [ ] Audit code duplication across all 6 command files:
  - [ ] Check for duplicate validation logic
  - [ ] Check for duplicate error handling
  - [ ] Check for duplicate formatting
- [ ] Move to `bin/shared/utils/validation-helpers.js`:
  - [ ] validateToken(token) - used in deploy.js, create.js, update.js
  - [ ] validateDomain(domain) - used in deploy.js, create.js, update.js
  - [ ] validatePath(path) - used in update.js, validate.js, diagnose.js
- [ ] Move to `bin/shared/utils/error-helpers.js`:
  - [ ] handleServiceNotFound(path)
  - [ ] handleInvalidConfig(issues)
  - [ ] handleCredentialError(error)
- [ ] Move to `bin/shared/utils/service-helpers.js`:
  - [ ] loadService(path)
  - [ ] detectServiceType(config)
  - [ ] buildServiceContext(path)
- [ ] Update all commands to import from shared utils
- [ ] Create unit tests for all shared utility functions

**Validation Criteria**:
```bash
grep -r "validateToken" bin/commands/*.js  # appears in <=1 file (imported from shared)
grep -r "handleServiceNotFound" bin/commands/*.js  # appears in <=1 file
```

---

### 2.2 Consistent Error Handling
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 2.1

Make error messages and exit codes consistent across all commands.

**Current State**: Each command uses different error messages and inconsistent exit codes.

**Tasks**:
- [ ] Create `bin/shared/utils/exit-codes.js`:
  ```javascript
  export const EXIT_CODES = {
    SUCCESS: 0,
    GENERIC_ERROR: 1,
    MISSING_ARGS: 2,
    INVALID_CONFIG: 3,
    CREDENTIAL_ERROR: 4,
    NOT_FOUND: 5,
    PERMISSION_ERROR: 6,
    TIMEOUT: 7,
    VALIDATION_ERROR: 8,
    UNKNOWN: 99
  }
  ```
- [ ] Update each command to use EXIT_CODES:
  - [ ] create.js
  - [ ] deploy.js
  - [ ] validate.js
  - [ ] update.js
  - [ ] diagnose.js
  - [ ] assess.js
- [ ] Standardize error messages:
  - [ ] All "not found" errors follow pattern: "Service not found at: {path}"
  - [ ] All "invalid" errors follow pattern: "Invalid {field}: {value}. Expected: {format}"
  - [ ] All "missing" errors follow pattern: "Missing required {field}"
- [ ] Create error message catalog in `bin/shared/utils/error-messages.js`
- [ ] Update all error handling to use catalog

**Validation Criteria**:
```bash
npx clodo-service create --help && echo "Exit: $?" # shows 0
npx clodo-service validate /nonexistent && echo "Exit: $?" # shows 5
npx clodo-service deploy --invalid-option && echo "Exit: $?" # shows 2
```

---

### 2.3 Feature Parity Across Commands
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 1.1, 2.1

Ensure all commands have equivalent feature levels.

**Current State**: deploy.js has --dry-run but others don't have equivalent testing features.

**Tasks**:
- [ ] Audit features per command:
  ```
  create.js:    --output-path, --template-path, --non-interactive
  deploy.js:    --dry-run, --quiet, --service-path, --skip-validation, --domain
  validate.js:  <service-path>, (minimal options)
  update.js:    --interactive, --domain-name, --fix-errors, --regenerate-configs
  diagnose.js:  --deep-scan, --export-report (limited)
  assess.js:    --export, --domain, --service-type, --token
  ```
- [ ] Add to validate.js:
  - [ ] --deep-scan (like diagnose.js)
  - [ ] --export-report (like diagnose.js)
- [ ] Add to update.js:
  - [ ] --preview (show what would change, like deploy --dry-run)
  - [ ] --force (skip confirmation prompts)
- [ ] Add to create.js:
  - [ ] --force (skip confirmation prompts)
  - [ ] --validate (validate after creation)
- [ ] Add to diagnose.js:
  - [ ] --fix-suggestions (like update --fix-errors)
- [ ] Document feature matrix

**Validation Criteria**:
```bash
npx clodo-service validate --help | grep "deep-scan"  # should exist
npx clodo-service update --help | grep "preview"      # should exist
npx clodo-service create --help | grep "force"        # should exist
```

---

## Phase 3: Test Coverage & Quality (6-10 hours)

### Goal
Achieve high test coverage for all commands and shared utilities.

### 3.1 Command Integration Tests
**Impact**: Medium | **Effort**: 3-4 hours | **Dependencies**: 1.1, 2.1

Create comprehensive integration tests for each command.

**Current State**: 39 tests exist but command integration tests are incomplete.

**Tasks**:
- [ ] Create `test/cli-integration/create-command.integration.test.js`:
  - [ ] Test interactive mode with various inputs
  - [ ] Test non-interactive mode with all flags
  - [ ] Test --output-path validation
  - [ ] Test template loading
  - [ ] Test config file loading
- [ ] Create `test/cli-integration/deploy-command.integration.test.js`:
  - [ ] Test credential collection flow
  - [ ] Test --dry-run mode
  - [ ] Test auto-fetch from Cloudflare API
  - [ ] Test invalid credentials
  - [ ] Test --quiet and --verbose modes
  - [ ] Test --json output
- [ ] Create `test/cli-integration/validate-command.integration.test.js`:
  - [ ] Test valid service
  - [ ] Test invalid config
  - [ ] Test missing files
  - [ ] Test exit codes
- [ ] Create `test/cli-integration/update-command.integration.test.js`:
  - [ ] Test individual field updates
  - [ ] Test --regenerate-configs
  - [ ] Test --fix-errors
  - [ ] Test --preview mode
- [ ] Create `test/cli-integration/diagnose-command.integration.test.js`:
  - [ ] Test deep scan
  - [ ] Test report export
  - [ ] Test various error conditions
- [ ] Create `test/cli-integration/assess-command.integration.test.js`:
  - [ ] Test capability assessment
  - [ ] Test JSON export
  - [ ] Test with orchestration

**Validation Criteria**:
```bash
npm test -- cli-integration  # all integration tests pass
npm test -- --coverage       # >80% coverage on bin/commands/*
```

---

### 3.2 Shared Utilities Tests
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 1.2, 2.1

Comprehensive tests for all shared utilities.

**Tasks**:
- [ ] Test OutputFormatter (if created):
  - [ ] success(), error(), warning(), info() output format
  - [ ] --quiet mode suppresses output
  - [ ] --verbose mode shows extra info
  - [ ] --json mode outputs valid JSON
  - [ ] --no-color removes ANSI codes
- [ ] Test ProgressManager (if created):
  - [ ] startSpinner/stopSpinner lifecycle
  - [ ] step() progress display
  - [ ] progress() bar display
- [ ] Test StandardOptions (if created):
  - [ ] All 5 global options recognized
  - [ ] Option precedence (CLI > config > env)
- [ ] Test config-loader:
  - [ ] loadConfig() returns correct structure
  - [ ] validateConfigFile() catches missing fields
  - [ ] mergeConfigWithOptions() prioritizes CLI options
- [ ] Test validation-helpers:
  - [ ] validateToken() accepts/rejects correct formats
  - [ ] validateDomain() accepts/rejects correct formats
  - [ ] validatePath() works with relative/absolute paths
- [ ] Test error-helpers:
  - [ ] handleServiceNotFound() produces correct message
  - [ ] handleInvalidConfig() lists all issues
- [ ] Test exit-codes:
  - [ ] EXIT_CODES constants are unique integers

**Validation Criteria**:
```bash
npm test -- bin/shared/utils  # all utils tests pass
npm test -- --coverage        # >85% coverage on bin/shared/*
```

---

### 3.3 End-to-End Scenario Tests
**Impact**: High | **Effort**: 3-4 hours | **Dependencies**: 3.1, 3.2

Test complete workflows across multiple commands.

**Tasks**:
- [ ] Scenario 1: Create → Validate → Deploy
  ```javascript
  // test/scenarios/create-validate-deploy.test.js
  1. Create service with --non-interactive
  2. Validate the created service
  3. Deploy with --dry-run
  ```
- [ ] Scenario 2: Update → Diagnose → Fix
  ```javascript
  // test/scenarios/update-diagnose-fix.test.js
  1. Create broken service (missing field)
  2. Run diagnose --deep-scan
  3. Run update --fix-errors
  4. Validate the fixed service
  ```
- [ ] Scenario 3: Deploy with Credential Auto-Fetch
  ```javascript
  // test/scenarios/deploy-auto-fetch.test.js
  1. Have valid token but no account-id/zone-id
  2. Deploy command auto-fetches from Cloudflare API
  3. Verify credentials cached for reuse
  ```
- [ ] Scenario 4: Config File Workflow
  ```javascript
  // test/scenarios/config-file-workflow.test.js
  1. Create service with --config-file
  2. Deploy with --config-file
  3. Verify all commands respect config precedence
  ```

**Validation Criteria**:
```bash
npm test -- scenarios/        # all scenario tests pass
npm test -- --coverage        # >90% coverage overall
```

---

## Phase 4: Professional Edition Features (4-8 hours)

### Goal
Add advanced features for professional tier users.

### 4.1 Additional Commands
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 1.1

Add missing utility commands.

**Tasks**:
- [ ] Create `bin/commands/help.js` - Enhanced help command:
  - [ ] List all commands with descriptions
  - [ ] Show examples: `clodo-service help deploy`
  - [ ] Show tips and best practices
  - [ ] Link to documentation
- [ ] Create `bin/commands/version.js` - Version/upgrade command:
  - [ ] Show current version
  - [ ] Check for available updates
  - [ ] Prompt to upgrade
  - [ ] Show changelog
- [ ] Create `bin/commands/login.js` - Credentials management:
  - [ ] Save credentials securely
  - [ ] List saved credentials
  - [ ] Remove saved credentials
  - [ ] Test credentials
- [ ] Register new commands in clodo-service.js

**Validation Criteria**:
```bash
npx clodo-service help                    # shows all commands
npx clodo-service help deploy             # shows deploy examples
npx clodo-service version                 # shows current version
npx clodo-service login                   # manages credentials
```

---

### 4.2 Advanced Monitoring & Logging
**Impact**: Medium | **Effort**: 2-3 hours | **Dependencies**: 1.3, 2.2

Add monitoring and detailed logging capabilities.

**Tasks**:
- [ ] Enhance logging to `bin/shared/logging/`:
  - [ ] Create logger with levels: DEBUG, INFO, WARN, ERROR
  - [ ] Support file logging (--log-file <path>)
  - [ ] Support log level control (--log-level)
  - [ ] Include timestamps and context
- [ ] Add monitoring hooks:
  - [ ] Track command execution time
  - [ ] Track resource usage (memory, CPU)
  - [ ] Generate performance reports
- [ ] Integration with all commands:
  - [ ] Each command logs its operations
  - [ ] Create summary reports
  - [ ] Export logs as JSON

**Validation Criteria**:
```bash
npx clodo-service deploy --log-level DEBUG --log-file deploy.log
cat deploy.log | head -20  # shows DEBUG entries with timestamps
```

---

### 4.3 Backward Compatibility Aliases
**Impact**: Low | **Effort**: 1-2 hours | **Dependencies**: 1.1

Support legacy command names for migration path.

**Tasks**:
- [ ] Create `bin/create-service.js` → aliases create command
- [ ] Create `bin/init-service.js` → aliases create command
- [ ] Update bin/clodo-service.js to register legacy aliases
- [ ] Update package.json bin entries:
  ```json
  "bin": {
    "clodo-service": "./dist/bin/clodo-service.js",
    "clodo-create-service": "./dist/bin/create-service.js",
    "clodo-init-service": "./dist/bin/init-service.js"
  }
  ```
- [ ] Document deprecation path

**Validation Criteria**:
```bash
npx clodo-create-service --help       # works, same as create
npx clodo-init-service --help         # works, same as create
npx clodo-service --version           # shows current version
```

---

## Implementation Strategy

### Recommended Execution Order

**Week 1**: Phase 1 (Standardization)
- Monday-Tuesday: 1.1 + 1.2 (StandardOptions, OutputFormatter)
- Wednesday: 1.3 (ProgressManager)
- Thursday: 1.4 (ConfigLoader)
- Friday: Testing & validation

**Week 2**: Phase 2 (Feature Parity)
- Monday: 2.1 (Shared utilities)
- Tuesday-Wednesday: 2.2 (Error handling)
- Thursday: 2.3 (Feature parity)
- Friday: Testing & documentation

**Week 3**: Phase 3 (Quality)
- Monday-Wednesday: 3.1 (Integration tests)
- Thursday: 3.2 (Utilities tests)
- Friday: 3.3 (End-to-end scenarios)

**Week 4**: Phase 4 (Professional)
- Monday-Tuesday: 4.1 (New commands)
- Wednesday: 4.2 (Monitoring)
- Thursday: 4.3 (Aliases)
- Friday: Final validation, release prep

---

## Dependency Graph

```
Phase 1: Standardization (Foundation)
├── 1.1: StandardOptions
├── 1.2: OutputFormatter (depends on 1.1)
├── 1.3: ProgressManager (depends on 1.1)
└── 1.4: ConfigLoader (depends on 1.1)

Phase 2: Feature Parity (builds on Phase 1)
├── 2.1: Shared Utilities (independent)
├── 2.2: Error Handling (depends on 1.2, 2.1)
└── 2.3: Feature Parity (depends on 1.1, 2.1)

Phase 3: Testing (validates Phase 1-2)
├── 3.1: Integration Tests (depends on 1.1, 2.1)
├── 3.2: Utilities Tests (depends on 1.2, 2.1)
└── 3.3: E2E Scenarios (depends on 3.1, 3.2)

Phase 4: Professional (optional enhancements)
├── 4.1: New Commands (depends on 1.1)
├── 4.2: Monitoring (depends on 1.3, 2.2)
└── 4.3: Legacy Aliases (depends on 1.1)
```

---

## Success Metrics

### Phase 1 Completion
- ✅ All 6 commands support --verbose, --quiet, --json, --no-color, --config-file
- ✅ Unified OutputFormatter used by all commands
- ✅ Progress indicators consistent across commands
- ✅ Config file loading works in all commands

### Phase 2 Completion
- ✅ Zero code duplication in validation/error/service helpers
- ✅ Consistent error messages across commands
- ✅ All commands have feature parity (same option set)
- ✅ Exit codes consistent and documented

### Phase 3 Completion
- ✅ >80% code coverage on bin/commands/*
- ✅ >85% code coverage on bin/shared/*
- ✅ 20+ integration tests passing
- ✅ 5+ end-to-end scenario tests passing

### Phase 4 Completion
- ✅ help, version, login commands working
- ✅ Advanced logging functional
- ✅ Legacy aliases working
- ✅ All commands backwards compatible

---

## Files to Create/Modify

### New Files
```
bin/shared/utils/
├── cli-options.js                    # StandardOptions class
├── output-formatter.js               # OutputFormatter class
├── progress-manager.js               # ProgressManager class
├── config-loader.js                  # Config loading utilities
├── validation-helpers.js             # Shared validation
├── error-helpers.js                  # Shared error handling
├── service-helpers.js                # Shared service operations
├── exit-codes.js                     # Exit code constants
└── error-messages.js                 # Error message catalog

bin/commands/
├── help.js                          # Help command (Phase 4)
├── version.js                       # Version command (Phase 4)
└── login.js                         # Login/credentials command (Phase 4)

bin/
├── create-service.js                # Legacy alias (Phase 4)
└── init-service.js                  # Legacy alias (Phase 4)

test/cli-integration/
├── create-command.integration.test.js
├── deploy-command.integration.test.js
├── validate-command.integration.test.js
├── update-command.integration.test.js
├── diagnose-command.integration.test.js
└── assess-command.integration.test.js

test/scenarios/
├── create-validate-deploy.test.js
├── update-diagnose-fix.test.js
├── deploy-auto-fetch.test.js
└── config-file-workflow.test.js

config/
├── clodo-create.example.json
├── clodo-deploy.example.json
└── clodo-validate.example.json

docs/
└── CLI_OPTIONS_GUIDE.md              # Document option standards
```

### Modified Files
```
bin/commands/
├── create.js                        # Add standard options, use OutputFormatter
├── deploy.js                        # Add standard options, use OutputFormatter
├── validate.js                      # Add standard options, use OutputFormatter
├── update.js                        # Add standard options, use OutputFormatter
├── diagnose.js                      # Add standard options, use OutputFormatter
└── assess.js                        # Add standard options, use OutputFormatter

bin/clodo-service.js                # Register new commands and aliases
bin/commands/helpers.js             # Deprecate, move to shared/*
package.json                        # Update bin entries with aliases
```

---

## Tracking & Review Points

- [ ] Phase 1 complete: `npm test -- cli` passes, all options consistent
- [ ] Phase 2 complete: `npm test` passes with >80% coverage
- [ ] Phase 3 complete: All 25+ tests green, 5 scenario tests passing
- [ ] Phase 4 complete: New commands functional, backward compat validated
- [ ] Final release: v4.0.0 with all features, comprehensive documentation

---

## Notes

1. **Backward Compatibility**: All changes must be non-breaking. Legacy command names supported.
2. **Testing**: Each task must include tests before marking complete.
3. **Documentation**: Update README and docs for each phase.
4. **Release Plan**: v3.2.0 after Phase 1, v3.3.0 after Phase 2, v3.4.0 after Phase 3, v4.0.0 after Phase 4.
5. **Performance**: Maintain <2s command startup time after standardization.

---

**Generated**: 2025-10-28
**Framework**: @tamyla/clodo-framework v3.1.14
**Total Estimated Effort**: 30-48 hours across 4 weeks
