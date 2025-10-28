# Actionable Todo List: All Missing Pieces

**Framework**: @tamyla/clodo-framework v3.1.14
**Prepared**: October 28, 2025
**Total Items**: 15 major tasks across 4 phases
**Estimated Effort**: 30-48 hours

---

## PHASE 1: STANDARDIZATION (12-16 hours)

### ✅ FOUNDATION: Audit Complete
- [x] Audit all 6 command implementations
- [x] Document current state (IMPLEMENTATION_AUDIT_COMPLETE.md)
- [x] Identify missing pieces
- [x] Create comprehensive roadmap (COMPREHENSIVE_ROADMAP.md)

**Status**: Complete. All commands verified as fully functional.

---

### 📋 Task 1.1: Create StandardOptions Class (2-3 hours)

**What to do**:
Create `bin/shared/utils/cli-options.js` - A class that all commands use to define consistent global options.

**Files to create**:
- `bin/shared/utils/cli-options.js` (new, ~80 lines)

**Files to modify**:
- `bin/commands/create.js` (add StandardOptions)
- `bin/commands/deploy.js` (add StandardOptions)
- `bin/commands/validate.js` (add StandardOptions)
- `bin/commands/update.js` (add StandardOptions)
- `bin/commands/diagnose.js` (add StandardOptions)
- `bin/commands/assess.js` (add StandardOptions)

**Implementation**:
```javascript
// bin/shared/utils/cli-options.js
export class StandardOptions {
  static define(command) {
    return command
      .option('-v, --verbose', 'Verbose output with debug info')
      .option('-q, --quiet', 'Minimal output (only errors/warnings)')
      .option('--json', 'Output results as JSON (parseable)')
      .option('--no-color', 'Disable colored output')
      .option('--config-file <path>', 'Load config from JSON file')
  }
}

// Usage in command:
import { StandardOptions } from '../shared/utils/cli-options.js'
StandardOptions.define(program.command('deploy'))
```

**Success Criteria**:
```bash
npx clodo-service create --help | grep -E "verbose|quiet|json|config-file"
# Should show all 5 options
```

**Test Coverage**:
- [ ] Create `test/utils/cli-options.test.js`
- [ ] Test that all 5 options are defined
- [ ] Test option parsing with various combinations

**Dependencies**: None

**Blocked by**: Nothing

**Related Docs**:
- TASK_QUICK_REFERENCE.md (section: "Before & After")
- ARCHITECTURE_CONNECTIONS.md (section: "StandardOptions dependency")

---

### 📋 Task 1.2: Create OutputFormatter Class (3-4 hours)

**What to do**:
Create `bin/shared/utils/output-formatter.js` - A unified output formatter that all commands use instead of `console.log()`.

**Files to create**:
- `bin/shared/utils/output-formatter.js` (new, ~150 lines)
- `test/utils/output-formatter.test.js` (new, ~200 lines)

**Files to modify**:
- `bin/commands/create.js` (replace console.log with formatter)
- `bin/commands/deploy.js` (replace console.log with formatter)
- `bin/commands/validate.js` (replace console.log with formatter)
- `bin/commands/update.js` (replace console.log with formatter)
- `bin/commands/diagnose.js` (replace console.log with formatter)
- `bin/commands/assess.js` (replace console.log with formatter)

**Implementation**:
```javascript
// bin/shared/utils/output-formatter.js
export class OutputFormatter {
  constructor(options = {}) {
    this.verbose = options.verbose
    this.quiet = options.quiet
    this.json = options.json
    this.colors = !options.noColor
  }

  success(message, data = null) {
    if (this.json) {
      console.log(JSON.stringify({ status: 'success', message, data }))
    } else if (!this.quiet) {
      console.log(`${this.colors ? '✅' : ''} ${message}`)
    }
  }

  error(message, details = null) {
    if (this.json) {
      console.log(JSON.stringify({ status: 'error', message, details }))
    } else {
      console.error(`${this.colors ? '❌' : ''} ${message}`)
      if (details && this.verbose) console.error(details)
    }
  }

  warning(message, context = null) { /* ... */ }
  info(message, metadata = null) { /* ... */ }
  section(title) { /* ... */ }
  list(items, label) { /* ... */ }
  table(data, columns) { /* ... */ }
  progress(message, current, total) { /* ... */ }
  json(data) { /* ... */ }
}

// Usage in command:
const formatter = new OutputFormatter(options)
formatter.success('Service created successfully', { path: './my-service' })
```

**Success Criteria**:
```bash
npx clodo-service deploy --quiet     # No verbose output
npx clodo-service deploy --verbose   # Shows all details
npx clodo-service deploy --json      # Valid JSON output
npx clodo-service deploy --no-color  # No ANSI escape codes
```

**Test Coverage**:
- [ ] `test/utils/output-formatter.test.js` with 20+ tests
- [ ] Test all 8 methods (success, error, warning, info, section, list, table, progress)
- [ ] Test flag combinations (--quiet + --verbose, etc.)
- [ ] Test JSON output validity
- [ ] Test color removal with --no-color

**Dependencies**: Task 1.1 (StandardOptions)

**Blocked by**: Nothing (can work in parallel with 1.1)

**Related Docs**:
- ARCHITECTURE_CONNECTIONS.md (section: "OutputFormatter dependency")

---

### 📋 Task 1.3: Create ProgressManager Class (2-3 hours)

**What to do**:
Create `bin/shared/utils/progress-manager.js` - Unified progress/spinner management.

**Files to create**:
- `bin/shared/utils/progress-manager.js` (new, ~100 lines)
- `test/utils/progress-manager.test.js` (new, ~80 lines)

**Files to modify**:
- `bin/commands/deploy.js` (add spinners to credential collection)
- `bin/commands/create.js` (add step progress)
- `bin/commands/validate.js` (add spinner during validation)
- `bin/commands/diagnose.js` (add spinner during analysis)

**Implementation**:
```javascript
// bin/shared/utils/progress-manager.js
export class ProgressManager {
  constructor(options = {}) {
    this.enabled = !options.quiet
    this.verbose = options.verbose
  }

  startSpinner(message) {
    if (!this.enabled) return
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    let i = 0
    process.stdout.write(`${spinner[0]} ${message}...`)
    // Animation logic...
  }

  step(number, total, label, status = 'pending') {
    if (!this.enabled) return
    console.log(`[${number}/${total}] ${label}... ${status === 'done' ? '✓' : ''}`)
  }

  progress(current, total, label) {
    if (!this.enabled) return
    const percent = Math.round((current / total) * 100)
    console.log(`${label}: ${percent}% (${current}/${total})`)
  }
}

// Usage in command:
const progress = new ProgressManager(options)
progress.startSpinner('Validating credentials')
// ... do work ...
progress.stopSpinner()
```

**Success Criteria**:
```bash
npx clodo-service deploy      # Shows spinners during credential collection
npx clodo-service deploy --quiet  # No spinners
npx clodo-service create      # Shows "1/5 Collecting inputs" style progress
```

**Test Coverage**:
- [ ] `test/utils/progress-manager.test.js`
- [ ] Test startSpinner/stopSpinner lifecycle
- [ ] Test step() display format
- [ ] Test progress() bar format
- [ ] Test disabled in --quiet mode

**Dependencies**: Task 1.1 (StandardOptions)

**Blocked by**: Nothing (can work in parallel)

**Related Docs**:
- TASK_QUICK_REFERENCE.md (week-by-week tasks)

---

### 📋 Task 1.4: Create ConfigLoader (2-3 hours)

**What to do**:
Create `bin/shared/utils/config-loader.js` - Load configuration from JSON files and merge with CLI options.

**Files to create**:
- `bin/shared/utils/config-loader.js` (new, ~80 lines)
- `config/clodo-create.example.json` (new)
- `config/clodo-deploy.example.json` (new)
- `config/clodo-validate.example.json` (new)
- `test/utils/config-loader.test.js` (new, ~100 lines)

**Files to modify**:
- All 6 command files (add --config-file option handling)

**Implementation**:
```javascript
// bin/shared/utils/config-loader.js
export class ConfigLoader {
  static load(filePath, requiredFields = []) {
    // Load JSON file, validate required fields
    // Return parsed config
  }

  static validate(config, requiredFields) {
    // Validate that all required fields exist
  }

  static merge(config, options) {
    // Merge config (low priority) with options (high priority)
    // CLI options override config file
  }
}

// Usage:
const config = ConfigLoader.load('./config/deploy.json', ['token', 'domain'])
const merged = ConfigLoader.merge(config, cliOptions)
```

**Example Configs**:
```json
// config/clodo-deploy.example.json
{
  "domain": "example.com",
  "environment": "production",
  "dryRun": false,
  "verbose": false
}

// config/clodo-create.example.json
{
  "serviceName": "my-service",
  "serviceType": "generic",
  "outputPath": "./services",
  "environment": "development"
}
```

**Success Criteria**:
```bash
npx clodo-service deploy --config-file config/deploy.example.json
# All values from config are used

npx clodo-service deploy --config-file config/deploy.example.json --domain prod.com
# CLI option (prod.com) overrides config file (example.com)
```

**Test Coverage**:
- [ ] `test/utils/config-loader.test.js`
- [ ] Test loading valid config
- [ ] Test validation of required fields
- [ ] Test merge priority (CLI > config > env)
- [ ] Test error handling for missing file
- [ ] Test error handling for invalid JSON

**Dependencies**: None

**Blocked by**: Nothing

---

### 🎯 Phase 1 Completion Criteria

**All of the following must pass**:
- [ ] `npm run build` succeeds with no errors
- [ ] `npm test` passes all tests (baseline 39 + new 6 = 45)
- [ ] All 6 commands support --verbose, --quiet, --json, --no-color, --config-file
- [ ] `npx clodo-service deploy --json` outputs valid JSON
- [ ] `npx clodo-service create --config-file config/clodo-create.example.json` works
- [ ] No direct `console.log` in `bin/commands/*.js` (all use OutputFormatter)
- [ ] All progress spinners show consistently
- [ ] `npm test -- --coverage` shows >80% coverage on bin/shared/utils/*

**Deliverable**: Release v3.2.0 with these 4 new utilities

---

## PHASE 2: FEATURE PARITY (8-12 hours)

### 📋 Task 2.1: Shared Utility Functions (3-4 hours)

**What to do**:
Extract duplicated validation, error, and service operation code into shared utilities.

**Files to create**:
- `bin/shared/utils/validation-helpers.js` (new, ~80 lines)
- `bin/shared/utils/error-helpers.js` (new, ~80 lines)
- `bin/shared/utils/service-helpers.js` (new, ~100 lines)
- `test/utils/validation-helpers.test.js` (new, ~100 lines)
- `test/utils/error-helpers.test.js` (new, ~100 lines)
- `test/utils/service-helpers.test.js` (new, ~100 lines)

**Files to modify**:
- All 6 command files (import from shared helpers)

**Implementation**:
```javascript
// bin/shared/utils/validation-helpers.js
export function validateToken(token) {
  if (!token) throw new Error('Token is required')
  if (token.length < 40) throw new Error('Token appears invalid (too short)')
  return true
}

export function validateDomain(domain) {
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/
  if (!domainRegex.test(domain)) throw new Error(`Invalid domain: ${domain}`)
  return true
}

// bin/shared/utils/error-helpers.js
export function handleServiceNotFound(path) {
  throw new Error(`Service not found at: ${path}`)
}

export function handleInvalidConfig(issues) {
  throw new Error(`Invalid configuration: ${issues.join(', ')}`)
}

// bin/shared/utils/service-helpers.js
export function loadService(path) {
  // Load and parse service configuration
}

export function detectServiceType(config) {
  // Determine service type from config
}
```

**Success Criteria**:
```bash
grep -r "validateToken" bin/commands/*.js  # Returns ≤1 result (imported from shared)
grep -r "handleServiceNotFound" bin/commands/*.js  # Returns ≤1 result
# No duplication - all use shared functions
```

**Test Coverage**:
- [ ] 100+ tests across all 3 helper files
- [ ] Test each function with valid/invalid inputs
- [ ] Test error messages are clear

**Dependencies**: Phase 1 complete

**Blocked by**: Nothing

---

### 📋 Task 2.2: Exit Codes & Error Messages (2-3 hours)

**What to do**:
Create centralized exit code constants and error message catalog.

**Files to create**:
- `bin/shared/utils/exit-codes.js` (new, ~30 lines)
- `bin/shared/utils/error-messages.js` (new, ~100 lines)
- `test/utils/exit-codes.test.js` (new, ~40 lines)

**Files to modify**:
- All 6 command files (use EXIT_CODES constants)

**Implementation**:
```javascript
// bin/shared/utils/exit-codes.js
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

// bin/shared/utils/error-messages.js
export const ERROR_MESSAGES = {
  TOKEN_MISSING: 'Cloudflare API token is required',
  TOKEN_INVALID: 'Cloudflare API token appears to be invalid (too short)',
  DOMAIN_MISSING: 'Domain name is required',
  DOMAIN_INVALID: (domain) => `Invalid domain: ${domain}. Expected: example.com`,
  SERVICE_NOT_FOUND: (path) => `Service not found at: ${path}`,
  // ... 20+ error messages following same pattern
}

// Usage:
import { EXIT_CODES } from '../shared/utils/exit-codes.js'
import { ERROR_MESSAGES } from '../shared/utils/error-messages.js'

if (!token) {
  console.error(ERROR_MESSAGES.TOKEN_MISSING)
  process.exit(EXIT_CODES.CREDENTIAL_ERROR)
}
```

**Success Criteria**:
```bash
npx clodo-service validate /nonexistent
echo $?  # Returns exit code 5 (NOT_FOUND)

npx clodo-service deploy --invalid-token
echo $?  # Returns exit code 4 (CREDENTIAL_ERROR)
```

**Test Coverage**:
- [ ] Test all EXIT_CODES are unique integers
- [ ] Test all ERROR_MESSAGES format correctly
- [ ] Test messages include helpful context

**Dependencies**: Phase 1 complete

**Blocked by**: Task 2.1

---

### 📋 Task 2.3: Feature Parity (2-3 hours)

**What to do**:
Add missing features to commands so all have equivalent option sets.

**Features to add**:
- Add to `validate.js`: --deep-scan, --export-report
- Add to `update.js`: --preview, --force
- Add to `create.js`: --force, --validate
- Add to `diagnose.js`: --fix-suggestions
- Document feature matrix

**Files to modify**:
- `bin/commands/validate.js` (add --deep-scan, --export-report)
- `bin/commands/update.js` (add --preview, --force)
- `bin/commands/create.js` (add --force, --validate)
- `bin/commands/diagnose.js` (add --fix-suggestions)

**Files to create**:
- `docs/FEATURE_MATRIX.md` (new, documents all options per command)

**Implementation**:
```javascript
// bin/commands/validate.js - add options
program
  .command('validate <service-path>')
  .option('--deep-scan', 'Run comprehensive validation checks')
  .option('--export-report <file>', 'Export validation report to JSON file')
  .action(async (servicePath, options) => {
    // Use --deep-scan to enable extra checks
    // Export report to --export-report if specified
  })

// bin/commands/update.js - add options
program
  .command('update [service-path]')
  .option('--preview', 'Show what would be changed without applying')
  .option('--force', 'Skip confirmation prompts')
  .action(async (servicePath, options) => {
    if (options.preview) {
      // Show proposed changes without modifying
    }
  })
```

**Success Criteria**:
```bash
npx clodo-service validate ./service --deep-scan  # Runs extended checks
npx clodo-service update ./service --preview      # Shows proposed changes
npx clodo-service create --force                  # Skips confirmations
```

**Test Coverage**:
- [ ] Test each new option works correctly
- [ ] Test option combinations
- [ ] Verify feature matrix is accurate

**Dependencies**: Phase 1 complete, Task 2.1, Task 2.2

**Blocked by**: Task 2.1 & 2.2

---

### 🎯 Phase 2 Completion Criteria

**All of the following must pass**:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all tests (45 baseline + 15 new = 60)
- [ ] Zero code duplication in helpers (grep shows ≤1 occurrence per function)
- [ ] All commands use EXIT_CODES from shared module
- [ ] All commands use error messages from error-messages catalog
- [ ] Feature matrix documents all options per command
- [ ] `npm test -- --coverage` shows >85% coverage on bin/shared/*

**Deliverable**: Release v3.3.0 with feature parity and consistency

---

## PHASE 3: QUALITY ASSURANCE (6-10 hours)

### 📋 Task 3.1: Integration Tests (3-4 hours)

**What to do**:
Create integration tests for each command that verify they work with standardized options.

**Files to create**:
- `test/cli-integration/create-command.integration.test.js` (new, ~150 lines)
- `test/cli-integration/deploy-command.integration.test.js` (new, ~150 lines)
- `test/cli-integration/validate-command.integration.test.js` (new, ~100 lines)
- `test/cli-integration/update-command.integration.test.js` (new, ~100 lines)
- `test/cli-integration/diagnose-command.integration.test.js` (new, ~100 lines)
- `test/cli-integration/assess-command.integration.test.js` (new, ~100 lines)

**Test Coverage**:
Each command should have:
- [ ] Test with --verbose flag
- [ ] Test with --quiet flag
- [ ] Test with --json flag
- [ ] Test with --config-file flag
- [ ] Test error handling
- [ ] Test success path
- [ ] Test exit codes

**Example**:
```javascript
// test/cli-integration/deploy-command.integration.test.js
describe('Deploy Command Integration', () => {
  it('should output JSON with --json flag', () => {
    // Run deploy with --json
    // Verify output is valid JSON
  })

  it('should respect --quiet flag', () => {
    // Run deploy with --quiet
    // Verify no verbose output
  })

  it('should exit with CREDENTIAL_ERROR on invalid token', () => {
    // Run with invalid token
    // Verify exit code 4
  })
})
```

**Success Criteria**:
- [ ] 20+ integration tests passing
- [ ] Each command has 3-4 tests
- [ ] Tests verify standardized options work

**Dependencies**: Phase 1 & 2 complete

**Blocked by**: Phase 1 & 2

---

### 📋 Task 3.2: Shared Utilities Tests (2-3 hours)

**What to do**:
Create comprehensive tests for all shared utilities.

**Files to create**:
- Already started in Phase 1/2, ensure complete:
  - `test/utils/output-formatter.test.js`
  - `test/utils/progress-manager.test.js`
  - `test/utils/config-loader.test.js`
  - `test/utils/validation-helpers.test.js`
  - `test/utils/error-helpers.test.js`
  - `test/utils/service-helpers.test.js`
  - `test/utils/exit-codes.test.js`

**Enhance with**:
- Integration tests between utilities
- Edge cases
- Error conditions

**Success Criteria**:
- [ ] >85% coverage on bin/shared/utils/*
- [ ] All edge cases covered

**Dependencies**: Phase 1 & 2 complete

**Blocked by**: Phase 1 & 2

---

### 📋 Task 3.3: End-to-End Scenario Tests (1-2 hours)

**What to do**:
Create tests that verify complete workflows work across multiple commands.

**Files to create**:
- `test/scenarios/create-validate-deploy.test.js` (new, ~100 lines)
  - Scenario: Create service → Validate → Deploy
- `test/scenarios/update-diagnose-fix.test.js` (new, ~100 lines)
  - Scenario: Create service with issue → Diagnose → Update → Validate
- `test/scenarios/deploy-auto-fetch.test.js` (new, ~100 lines)
  - Scenario: Deploy without account/zone IDs, auto-fetch from Cloudflare API
- `test/scenarios/config-file-workflow.test.js` (new, ~100 lines)
  - Scenario: Create with config file → Deploy with config file → Verify options merged correctly

**Example**:
```javascript
// test/scenarios/create-validate-deploy.test.js
describe('Workflow: Create → Validate → Deploy', () => {
  it('should complete full workflow', async () => {
    // 1. Create service with --non-interactive
    // 2. Validate the created service
    // 3. Deploy with --dry-run
    // Verify success at each step
  })
})
```

**Success Criteria**:
- [ ] 4 scenario tests passing
- [ ] Each scenario tests cross-command integration
- [ ] Real-world workflows verified

**Dependencies**: Phase 1, 2, & 3.1 complete

**Blocked by**: Phase 1, 2, & 3.1

---

### 🎯 Phase 3 Completion Criteria

**All of the following must pass**:
- [ ] `npm test` passes all tests (60 baseline + 25 new = 85+)
- [ ] `npm test -- cli-integration` passes (20+ tests)
- [ ] `npm test -- scenarios` passes (4 scenario tests)
- [ ] `npm test -- --coverage` shows >80% on bin/commands/*
- [ ] `npm test -- --coverage` shows >85% on bin/shared/*
- [ ] `npm test -- --coverage` shows >90% overall
- [ ] No regressions in existing tests

**Deliverable**: Release v3.4.0 with comprehensive test coverage and confidence

---

## PHASE 4: PROFESSIONAL EDITION (4-8 hours)

### 📋 Task 4.1: New Commands (2-3 hours)

**What to do**:
Create help, version, and login commands for professional edition.

**Files to create**:
- `bin/commands/help.js` (new, ~100 lines)
- `bin/commands/version.js` (new, ~80 lines)
- `bin/commands/login.js` (new, ~120 lines)
- `test/cli-integration/help-command.integration.test.js` (new)
- `test/cli-integration/version-command.integration.test.js` (new)
- `test/cli-integration/login-command.integration.test.js` (new)

**Files to modify**:
- `bin/clodo-service.js` (register new commands)

**Implementation**:
```javascript
// bin/commands/help.js
export function registerHelpCommand(program) {
  program
    .command('help [command]')
    .description('Show help for a command')
    .action((command) => {
      if (command) {
        // Show detailed help for specific command with examples
        console.log(`Help for ${command}:`)
        console.log(COMMAND_HELP[command])
      } else {
        // List all commands
        console.log('Available commands:')
        Object.keys(COMMAND_HELP).forEach(cmd => console.log(`  ${cmd}`))
      }
    })
}

// bin/commands/version.js
export function registerVersionCommand(program) {
  program
    .command('version')
    .description('Show version and check for updates')
    .action(async () => {
      const currentVersion = require('../package.json').version
      console.log(`clodo-framework v${currentVersion}`)
      // Check npm for latest version
      // Show update prompt if newer available
    })
}

// bin/commands/login.js
export function registerLoginCommand(program) {
  program
    .command('login')
    .description('Manage credentials securely')
    .option('--list', 'List saved credentials')
    .option('--remove <name>', 'Remove saved credential')
    .option('--test', 'Test saved credentials')
    .action(async (options) => {
      if (options.list) {
        // List all saved credentials (redacted)
      } else if (options.remove) {
        // Remove saved credential
      } else if (options.test) {
        // Test all saved credentials
      } else {
        // Prompt to add new credential
        // Save securely via ApiTokenManager
      }
    })
}

// bin/clodo-service.js - register new commands
import { registerHelpCommand } from './commands/help.js'
import { registerVersionCommand } from './commands/version.js'
import { registerLoginCommand } from './commands/login.js'

registerHelpCommand(program)
registerVersionCommand(program)
registerLoginCommand(program)
```

**Success Criteria**:
```bash
npx clodo-service help                    # Shows all commands
npx clodo-service help deploy             # Shows deploy examples
npx clodo-service version                 # Shows current version
npx clodo-service login                   # Manages credentials
```

**Test Coverage**:
- [ ] Test help shows all commands
- [ ] Test help <command> shows examples
- [ ] Test version shows correct version
- [ ] Test login stores/retrieves credentials

**Dependencies**: Phase 1 complete

**Blocked by**: Nothing (can work in parallel with Phase 3)

---

### 📋 Task 4.2: Advanced Logging (2-3 hours)

**What to do**:
Enhance logging with file output, log levels, and timestamps.

**Files to create**:
- `bin/shared/logging/logger.js` (new/enhance, ~150 lines)
- `test/logging/logger.test.js` (new, ~100 lines)

**Files to modify**:
- All 6 command files (integrate logging)

**Implementation**:
```javascript
// bin/shared/logging/logger.js
export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'INFO'  // DEBUG, INFO, WARN, ERROR
    this.file = options.file              // Write to file if specified
    this.verbose = options.verbose
  }

  debug(message, context = {}) {
    if (this.level === 'DEBUG') this.log('DEBUG', message, context)
  }

  info(message, context = {}) {
    if (['DEBUG', 'INFO'].includes(this.level)) this.log('INFO', message, context)
  }

  warn(message, context = {}) {
    if (['DEBUG', 'INFO', 'WARN'].includes(this.level)) this.log('WARN', message, context)
  }

  error(message, context = {}) {
    this.log('ERROR', message, context)
  }

  private log(level, message, context) {
    const timestamp = new Date().toISOString()
    const logLine = `[${timestamp}] [${level}] ${message}`
    
    // Write to console
    console.log(logLine)
    
    // Write to file if configured
    if (this.file) {
      appendFileSync(this.file, logLine + '\n')
    }
  }
}

// Usage in command:
const logger = new Logger({ 
  level: options.logLevel || 'INFO',
  file: options.logFile
})
logger.debug('Starting credential collection', { domain: options.domain })
```

**Success Criteria**:
```bash
npx clodo-service deploy --log-level DEBUG --log-file deploy.log
cat deploy.log | head -20  # Shows DEBUG entries with timestamps

npx clodo-service deploy --log-level ERROR  # Only shows errors
```

**Test Coverage**:
- [ ] Test all log levels work
- [ ] Test file output created correctly
- [ ] Test log format includes timestamps

**Dependencies**: Phase 1 complete

**Blocked by**: Nothing

---

### 📋 Task 4.3: Legacy Command Aliases (1-2 hours)

**What to do**:
Create backward-compatible aliases for old command names.

**Files to create**:
- `bin/create-service.js` (new, ~20 lines, alias to create)
- `bin/init-service.js` (new, ~20 lines, alias to create)
- `test/aliases/legacy-commands.integration.test.js` (new, ~50 lines)

**Files to modify**:
- `package.json` (update bin entries)

**Implementation**:
```javascript
// bin/create-service.js
#!/usr/bin/env node
import { execSync } from 'child_process'

// Forward all arguments to 'create' command
const args = process.argv.slice(2)
try {
  execSync(`clodo-service create ${args.join(' ')}`, { stdio: 'inherit' })
} catch (error) {
  process.exit(1)
}

// package.json
"bin": {
  "clodo-service": "./dist/bin/clodo-service.js",
  "clodo-create-service": "./dist/bin/create-service.js",
  "clodo-init-service": "./dist/bin/init-service.js"
}
```

**Success Criteria**:
```bash
npx clodo-create-service --help     # Works, same as create
npx clodo-init-service --output-path ./output  # Works, same as create
```

**Test Coverage**:
- [ ] Test legacy command aliases work
- [ ] Test they produce same output as new commands
- [ ] Test help is available

**Dependencies**: Nothing

**Blocked by**: Nothing (can work in parallel)

---

### 🎯 Phase 4 Completion Criteria

**All of the following must pass**:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes all tests (85+ baseline + 10 new = 95+)
- [ ] `npx clodo-service help` works
- [ ] `npx clodo-service version` works
- [ ] `npx clodo-service login` works
- [ ] `npx clodo-create-service --help` works (legacy alias)
- [ ] `npx clodo-init-service --help` works (legacy alias)
- [ ] Advanced logging functional (--log-file, --log-level)
- [ ] All tests still pass (no regressions)

**Deliverable**: Release v4.0.0 - Professional Edition Complete

---

## SUMMARY: All 15 Tasks Mapped & Connected

```
Task 1.1: StandardOptions
  ↓ (foundation)
Task 1.2: OutputFormatter ← depends on 1.1
  ↓ (used by all commands)
Task 1.3: ProgressManager ← depends on 1.1
  ↓ (visual feedback)
Task 1.4: ConfigLoader ← depends on 1.1
  ↓ (configuration management)
Task 2.1: Shared Utilities ← depends on Phase 1
  ↓ (code reuse)
Task 2.2: Error Handling ← depends on 2.1
  ↓ (consistency)
Task 2.3: Feature Parity ← depends on 2.1, 2.2
  ↓ (equivalent features)
Task 3.1: Integration Tests ← depends on Phase 1 & 2
  ↓ (command verification)
Task 3.2: Utilities Tests ← depends on Phase 1 & 2
  ↓ (utility verification)
Task 3.3: E2E Scenarios ← depends on 3.1
  ↓ (workflow verification)
Task 4.1: New Commands ← depends on Phase 1
  ↓ (professional features)
Task 4.2: Advanced Logging ← depends on Phase 1
  ↓ (monitoring)
Task 4.3: Legacy Aliases ← independent
  ↓ (backward compat)

Releases:
v3.2.0 after Phase 1 (Tasks 1.1-1.4)
v3.3.0 after Phase 2 (Tasks 2.1-2.3)
v3.4.0 after Phase 3 (Tasks 3.1-3.3)
v4.0.0 after Phase 4 (Tasks 4.1-4.3)
```

---

## How to Use This List

1. **Pick a task** from above
2. **Read the detailed instructions**
3. **Create the files** listed
4. **Implement** following the code examples
5. **Write tests** for new code
6. **Modify** existing files as needed
7. **Run**: `npm run build && npm test`
8. **Commit**: `git commit -m "feat: implement {task name}"`
9. **Mark complete**: Update this list

## Estimated Effort Per Task

```
Phase 1:
  1.1: 2-3 hrs (StandardOptions)
  1.2: 3-4 hrs (OutputFormatter)
  1.3: 2-3 hrs (ProgressManager)
  1.4: 2-3 hrs (ConfigLoader)
  Total: 12-16 hrs

Phase 2:
  2.1: 3-4 hrs (Shared Utilities)
  2.2: 2-3 hrs (Error Handling)
  2.3: 2-3 hrs (Feature Parity)
  Total: 8-12 hrs

Phase 3:
  3.1: 3-4 hrs (Integration Tests)
  3.2: 2-3 hrs (Utilities Tests)
  3.3: 1-2 hrs (E2E Scenarios)
  Total: 6-10 hrs

Phase 4:
  4.1: 2-3 hrs (New Commands)
  4.2: 2-3 hrs (Advanced Logging)
  4.3: 1-2 hrs (Legacy Aliases)
  Total: 4-8 hrs

Grand Total: 30-48 hours
```

---

**Last Updated**: October 28, 2025
**Status**: Ready to implement
**Next Step**: Pick Task 1.1 and start!
