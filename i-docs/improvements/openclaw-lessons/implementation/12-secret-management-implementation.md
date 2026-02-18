Title: Secret Management & Baseline — Implementation Plan

Objective:
Deliver a `clodo secrets` CLI command group that provides scanning, baseline management, and validation for secret leakage prevention.

Scope:
- CLI commands: `clodo secrets scan`, `clodo secrets validate`, `clodo secrets baseline update`, `clodo secrets baseline show`
- Programmatic API: `SecretsManager` class for use in hooks, CI, and other commands
- Integration: wire into `clodo doctor` existing check + pre-deploy hooks
- Baseline file format: `.secrets.baseline` (JSON array of { file, line, pattern, match, addedAt, reason })

Existing Infrastructure (leveraged):
- `ValidationHandler.scanForSecrets()` — 9-pattern scanner with file traversal
- `ValidationHandler.checkSecretsBaseline()` — baseline comparison logic
- `ValidationHandler.loadSecretsBaseline()` — reads `.secrets.baseline` JSON
- `ValidationHandler.getFilesToScan()` — smart file discovery (.js/.ts/.json/.toml/.env)
- `SecurityCLI` class — existing security operations (validate, generate-key)
- `SecretGenerator` — cryptographic key generation
- `cli/clodo-service.js` — command registration pattern
- `OutputFormatter` + `StandardOptions` — consistent CLI UX

Deliverables:
- `src/security/SecretsManager.js` — core secrets management logic
- `cli/commands/secrets.js` — CLI command registration
- `test/security/secrets-manager.test.js` — unit tests
- `test/e2e/cli/secrets.test.js` — integration tests

Phased Task Breakdown:

Phase 1 — SecretsManager core class
- Extract scanning logic from ValidationHandler into reusable SecretsManager
- Add baseline update, baseline show, and validate methods
- Enhanced baseline format with metadata (addedAt, reason, addedBy)

Phase 2 — CLI commands
- `clodo secrets scan [path]` — scan for secrets, output found items
- `clodo secrets validate [path]` — compare found secrets against baseline, fail on new
- `clodo secrets baseline update [path]` — add new findings to baseline interactively
- `clodo secrets baseline show [path]` — display current baseline

Phase 3 — Tests
- Unit tests for SecretsManager
- E2E integration tests for CLI commands

Estimated Effort: 2-3 days

## Implementation Status

### 🔄 In Progress
