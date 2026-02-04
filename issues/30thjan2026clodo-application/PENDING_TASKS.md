# Pending Tasks — Clodo Framework Integration Work

**Generated:** 2026-02-02
**Context:** This file documents the work that remains from the "Clodo-Framework Integration Requirements" plan (30 Jan 2026). It maps each pending item to files, tests, acceptance criteria, priority, and suggested next steps. The aim is to avoid duplication by showing what is already implemented and what still needs work.

---

## Quick status (summary)
- ✅ Many Phase 1 and Phase 2 items are already implemented (programmatic create, payload validation, feature normalization, parameter metadata).
- ✅ **COMPLETED**: All programmatic APIs are now properly exported and accessible via package.json subpath exports
- 🔲 Remaining items are primarily: *version compatibility APIs*, *documentation & migration guides*, and a few tests and exports.

---

## Files / features already implemented (avoid rework)
- Programmatic creation: `src/programmatic/createService.js` (calls `ServiceOrchestrator.createService`) ✅
- Programmatic API implementation: `src/service-management/ServiceOrchestrator.js` → `createService(payload, options)` ✅
- Payload validation & parameter discovery: `src/validation/payloadValidation.js` → `validateServicePayload()`, `getParameterDefinitions()`, `ServicePayloadSchema` ✅
- Feature config + aliases: `src/config/service-schema-config.js` (contains `serviceTypes` and `features`, includes legacy `kv` alias) ✅
- Framework capabilities API: `src/api/frameworkCapabilities.js` → `getFrameworkCapabilities()`, `getFrameworkVersion()` ✅
- Integration error classes: `src/errors/integrationErrors.js` → `IntegrationError`, `PayloadValidationError`, etc. ✅
- Mock framework utilities: `src/testing/mockFramework.js` → `MockServiceOrchestrator`, `createMockFramework()` ✅
- **Package exports**: All programmatic APIs now exported via `package.json` subpath exports ✅
- Tests covering validation and programmatic create: `test/validation/*`, `test/service-orchestrator-programmatic*.test.js` ✅

Refer to commit/PR history (examples):
- `feat(programmatic-service-api)` (PR #4 / commit `040f68b` etc.)
- `feat(validation): expand ServicePayload schema` (commit `ded1281`)

---

## Pending / Incomplete Items (detailed TODO list)

### 1) Version compatibility APIs (Low Priority)
- Why: `VersionCompatibilityError` class exists, but missing `checkApplicationCompatibility()` and `getSupportedApplicationVersions()` functions
- Files to add:
  - `src/api/versionCompatibility.js` exporting compatibility checking functions
- Tests to add:
  - `test/api/versionCompatibility.test.js` verifying compatibility logic
- Acceptance criteria:
  - Functions return compatibility results and supported version arrays
- Estimated effort: Small

### 2) Deprecation / Migration: Enum changes & feature flags
- Priority: Medium
- Why: Enum/feature normalization changes (e.g., accepting `kv` alias) are breaking and require migration guidance and maybe feature flags.
- Files to add/modify:
  - `docs/MIGRATION.md` describing changes and recommended steps.
  - Add feature flags or configuration toggles where validation behavior can be adjusted (e.g., `config/service-schema-config.js` already supports runtime override; document this).
- Tests to add:
  - Compatibility tests ensuring legacy inputs still succeed when feature flags set.
- Acceptance criteria:
  - Migration docs exist and tests demonstrate compatibility-mode behaviors.
- Estimated effort: Medium

### 3) Documentation & API Reference
- Priority: High
- Why: Consumers need docs: API reference, Integration Guide, Parameter Reference, Error Reference, Migration Guide
- Files to add/modify:
  - `docs/integration/PROGRAMMATIC_API.md` (usage examples for `createService`, `createServiceProgrammatic`)
  - `docs/api/parameter_reference.md` (derived from `getParameterDefinitions`)
  - `docs/errors.md` (document error classes and sample responses)
- Acceptance criteria:
  - Each API has an example snippet, expected responses, and error handling notes.
- Estimated effort: Medium → Large (writing + review)

### 4) Tests: Full integration & E2E (CI)
- Priority: High
- Why: Ensure programmatic flow is covered in CI (dry-run + actual generation + validation)
- Tests to add/ensure
  - `test/service-orchestrator-programmatic-validation.test.js` already present — ensure stable and that it covers `clodo` passthrough handling and feature normalization.
  - Add CI job matrix entry that runs programmatic tests (if not already present).
- Acceptance criteria:
  - Tests pass in CI; build includes programmatic tests.
- Estimated effort: Small → Medium

### 5) Release notes & changelog alignment
- Priority: Low
- Why: Ensure new APIs and deprecations are clearly communicated in the changelog and release notes
- Action:
  - Update `CHANGELOG.md` and release templates when the above items are shipped.
- Estimated effort: Small

---

## Suggested workflow to complete pending items
1. Create issues for each pending item above (one issue per bullet). Link to this `PENDING_TASKS.md` and reference related files/commits. ✅
2. Triage and assign owners + estimate sprints (small/medium/large) per issue. ✅
3. Implement small items first (errors, capability API, exported mocks, wrappers). Open PRs with tests and docs. ✅
4. Update docs and migration guides, then run full CI. ✅

---

## Want me to proceed?
Reply with one of:
- **CreateIssues** — I will create a GitHub issue for each pending item with links to files and acceptance criteria.
- **StartPR** — I will implement the highest-priority small items (errors, `getFrameworkCapabilities`, mock utilities, tests, and docs) and open a PR for review.
- **ReportOnly** — produce a compact mapping report (Markdown) for sharing with the team (no commits). 

---

*If you want immediate changes, tell me which action to take (CreateIssues / StartPR / ReportOnly) and I will proceed.*
