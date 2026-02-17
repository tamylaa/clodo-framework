Title: Doctor / Preflight Diagnostics — Implementation Plan

Objective:
Deliver a production-ready `clodo doctor` command and preflight validation subsystem that blocks insecure or misconfigured deployments and provides actionable remediation.

Scope:
- CLI command: `clodo doctor` (human & machine output modes)
- Pre-deploy integration: run automatically as a `pre-deploy` hook
- Built-in checks: environment, binaries, token scopes, secrets baseline, template/schema presence, wrangler config, and optional remote API smoke tests
- Extensible validators API for adding custom checks

Success Criteria:
- `clodo doctor` exit code 0 for valid environments; non-zero for critical failures
- CI integrates `clodo doctor` in prepublish and pre-deploy pipelines
- Clear remediation messages and `--fix` suggestions for common issues

Deliverables (files / entries):
- CLI: `src/cli/doctor.js` (or `cli/doctor.js` if consistent with repo layout)
- Validators: `src/utils/doctor/validators/*.js`
- Runner: `src/utils/doctor/runner.js` → exports `runDoctor({json:false})`
- Hooks integration: add to `scripts/deploy` and `bin/clodo-service.js` pre-deploy path
- Tests: `test/doctor/doctor.unit.test.js`, `test/doctor/doctor.integration.test.js`
- Docs: `docs/runbooks/doctor.md` and `i-docs/improvements/openclaw-lessons/implementation/02-doctor-preflight-implementation.md` (this file)

Phased Task Breakdown (task-level with owners & estimates):

Phase 1 — Core runner & basic checks (2–3 days)
- Task 1.1: Add `runner.js` that loads validators and executes them in parallel with configurable severity levels. (Owner: CLI/infra engineer)
  - Output: human summary + `--json` machine output
  - Files: `src/utils/doctor/runner.js`
- Task 1.2: Implement environment checks (Node, npm, wrangler presence, versions). (Owner: infra)
  - Files: `src/utils/doctor/validators/env.js` ; tests in `test/doctor/env.test.js`
- Task 1.3: Implement config presence checks (wrangler.toml, package.json, templates). (Owner: infra)

Phase 2 — Token & permission validation (2–4 days)
- Task 2.1: Add Cloudflare token scope validator that reads token and performs scope-check via API or heuristics. (Owner: platform)
  - Files: `src/utils/doctor/validators/cloudflare-token.js`
- Task 2.2: Add `--interactive` helper to explain missing scopes and provide minimal curl commands to inspect tokens. (Owner: CLI)

Phase 3 — Secrets baseline & leakage detection (2–3 days)
- Task 3.1: Integrate a secrets scanner leveraging existing repo patterns (use simple regex + baseline file `.secrets.baseline`). (Owner: security)
- Task 3.2: Add `clodo secrets validate` suggestion in remediation when leaks detected. (Owner: security)

Phase 4 — Template/schema & validation hooks (3 days)
- Task 4.1: Implement template/schema validators that ensure required inputs exist and conform to Zod/JSON schema. (Owner: templates)
- Task 4.2: Add hooks system registration point and default `pre-deploy` integration. (Owner: infra)

Phase 5 — CI integration & tests (2–4 days)
- Task 5.1: Add lightweight unit tests for each validator. (Owner: QA)
- Task 5.2: Add integration test that simulates an invalid environment and verifies non-zero exit and remediation output. (Owner: QA)
- Task 5.3: Add CI job step to run `clodo doctor` in `ci.yml` prepublish/predeploy. (Owner: DevOps)

Phase 6 — UX polish & docs (1–2 days)
- Task 6.1: Write `docs/runbooks/doctor.md` with sample outputs, fixes, and CI guidance. (Owner: Docs)
- Task 6.2: Ensure `clodo deploy` and `clodo create` call `runDoctor` by default and handle `--force`. (Owner: CLI)

Testing & Validation:
- Unit tests per validator with mocked environments and tokens.
- Integration test that runs `node bin/clodo-doctor.js --json` and validates structured output keys (`checks`, `severity`, `fixSuggestions`).
- CI gate: failing `clodo doctor` should prevent `publish` unless `--force` used with audit log.

Risk & Mitigation:
- False positives: add severity levels (warn vs error) and `--allow` overrides; track false positives and tune validators.
- Network/API flakiness: make remote checks optional behind flags and cache token validations for short TTL.

Rollout Plan:
1. Merge runner + basic validators behind a feature flag.
2. Run in CI nightly to observe false positives.
3. Iterate on validators and enable as blocking in prepublish after 2 successful nightly runs.

Estimated Total Effort: 2–3 engineering weeks (cross-functional: infra, security, QA, docs)

Acceptance Criteria (detailed):
- `bin/clodo-doctor.js` exists and returns `0` for validated envs.
- `npm run test:doctor` runs unit+integration for doctor subsystem.
- `clodo deploy` runs `runDoctor()` and fails on critical issues unless `--force`.
- Docs and runbook available and linked from CLI error messages.

## Implementation Status

### ✅ Completed (Phase 1 - Core runner & basic checks)
- **Task 1.1**: Added `runDoctor` method to `ValidationHandler` that aggregates validators and executes them in parallel with configurable severity levels.
  - **Files**: `src/service-management/handlers/ValidationHandler.js` (extended)
  - **Features**: Human summary + `--json` machine output, exit code logic, fix suggestions collection
- **Task 1.2**: Implemented environment checks (Node, wrangler presence, versions).
  - **Files**: `src/service-management/handlers/ValidationHandler.js` (checkEnvironment method)
- **Task 1.3**: Implemented config presence checks (wrangler.toml, package.json, templates).
  - **Files**: `src/service-management/handlers/ValidationHandler.js` (checkConfigPresence method)
- **CLI Integration**: Added `clodo doctor` command with `--json`, `--fix`, `--strict` options.
  - **Files**: `cli/commands/doctor.js`, updated `cli/clodo-service.js`

### ✅ Completed (Phase 2 - Token & permission validation)
- **Task 2.1**: Cloudflare token scope validator implemented with real API integration.
  - **Files**: `src/service-management/handlers/ValidationHandler.js` (`validateCloudflareToken`, `checkTokenScopes`)
  - **Features**: Tests accounts API + zones API, reports missing Workers:Edit, Workers:Read, Zone:Read scopes
  - **Tests**: `test/security/security-features.test.js` (4 token scope tests passing)

### ✅ Completed (Phase 3 - Secrets baseline & leakage detection)
- **Task 3.1**: Secrets scanner with 9 regex patterns + `.secrets.baseline` comparison implemented.
  - **Files**: `src/service-management/handlers/ValidationHandler.js` (`scanForSecrets`, `checkSecretsBaseline`, `loadSecretsBaseline`, `getFilesToScan`)
  - **Features**: Scans .js/.ts/.json/.toml/.env files, skips node_modules/dist/build, filters test/example/fake content, reports against baseline
  - **Tests**: `test/security/security-features.test.js` (5 secrets tests passing)

### ✅ Completed (Phase 5 - Tests)
- **Task 5.1**: Unit tests for all validators. `test/doctor/doctor.unit.test.js` (14 tests)
- **Task 5.2**: Integration tests for CLI. `test/doctor/doctor.integration.test.js` (8 tests)
- **Task 5.3**: Doctor fix tests. `test/doctor/doctor-fix.test.js` (7 tests)
- **Full suite**: 120 suites passing, 2169 tests passing, 0 failures

### 📋 Remaining Tasks
- **Task 2.2**: Add `--interactive` helper for token scope explanations (nice-to-have)
- **Task 4.1**: Template/schema validators (leverages existing ValidationHandler.validateService)
- **Task 4.2**: Hooks integration for pre-deploy — wire `runDoctor` into `clodo deploy` with `--force` bypass
- **Task 5.3**: Add CI job step to run `clodo doctor` in `ci.yml` prepublish/predeploy
- **Task 6.1**: Write `docs/runbooks/doctor.md` with sample outputs, fixes, and CI guidance
- **Task 6.2**: Ensure `clodo deploy` and `clodo create` call `runDoctor` by default and handle `--force`

Notes:
- Keep validator implementations small and composable; avoid a large monolithic validator file.
- Prefer non-blocking telemetry (opt-in) for diagnostic usage aggregation to tune validators.

Quick dev commands (local):
```bash
# run doctor locally
node ./bin/clodo-doctor.js --json

# run unit tests for doctor
npm run test -- test/doctor --runInBand
```

Contact/Owners: @tamyla (product), infra@clodo.dev (engineering), security@clodo.dev (security)
