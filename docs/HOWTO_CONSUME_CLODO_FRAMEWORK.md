# How to consume clodo-framework

A concise, actionable guide for downstream consumers of `@tamyla/clodo-framework`.

## 1) Quick summary ✅
- Preferred consumption patterns:
  - CLI-first: run `npx clodo-service <command>` or `node ./node_modules/.bin/clodo-service` for local installs.
  - Library-first: `import { ... } from '@tamyla/clodo-framework/<named-export>'` using only **documented public exports**.
- Avoid importing internal `dist/*` paths directly — they are not guaranteed and may not be exported.

## 2) Typical install & quickstart
- Install:
  - Local dev: `npm i @tamyla/clodo-framework` or `npx @tamyla/clodo-framework <command>`
  - One-time use: `npx clodo-service create`

- Quick checks after install:
  - Require main export: `const pkg = require('@tamyla/clodo-framework')` (or `import pkg from '@tamyla/clodo-framework'`).
  - Run CLI version: `node ./node_modules/.bin/clodo-service --version`.

## 3) Public API surface & exports policy
- Use only the public exports listed in `package.json` `exports` map and the `bin` entries. Example public paths:
  - `@tamyla/clodo-framework` (main)
  - `@tamyla/clodo-framework/services`
  - `@tamyla/clodo-framework/config`
- If functionality you need is only in `bin/` or internal files, open an issue requesting it to be promoted into the public API.

## 4) Recommended usage patterns (best practices)
- CLI Tasks: scaffolding, validation, deploys, and diagnostics should be performed via the CLI (interactive or automated via `--help` flags).
- Programmatic Tasks: use the named public exports for orchestration and programmatic generation.
- Packaging: treat `@tamyla/clodo-framework` as a regular npm dependency and rely on published version tags.

## 5) Debugging packaging errors (common issues)
- ERR_PACKAGE_PATH_NOT_EXPORTED: you attempted to `require()` a subpath not defined under `exports`.
  - Fix: use public exports or ask to add explicit `exports` entries.
- ERR_MODULE_NOT_FOUND: usually caused by `dist` files requiring files outside `dist/`.
  - Fix: ensure package build rewrites relative imports correctly. (We run `fix-dist-imports.js` in CI.)

## 6) CI & Validation guarantees (what we run for you)
- PR-level: `.github/workflows/validate-packaged-artifact.yml` runs `scripts/utilities/test-packaged-artifact.js` which:
  1. runs `npm pack`
  2. installs the tarball into a temp project
  3. requires public exports and runs the CLI bin to smoke-test.
- Release-level: `release.yml` runs the same packaged-artifact validation before `semantic-release` publishes.

## 7) Examples
- Programmatic import (Node ESM or CJS-safe):
```js
import { ServiceOrchestrator } from '@tamyla/clodo-framework/service-management';
const orch = new ServiceOrchestrator();
```
- Run CLI:
```bash
npx clodo-service create
node ./node_modules/.bin/clodo-service --version
```

## 8) FAQ (short)
- Q: Can I import internal `dist/*` files?
  - A: No — prefer public exports. If you need internal functions exported, request them explicitly and we’ll decide if they belong in the public contract.
- Q: Is the CLI intended for programmatic use?
  - A: No — prefer using the public library exports for programmatic tasks. CLI is optimized for human/automation use via subprocess.

## 9) Where to put consumer-facing updates (checklist)
- docs/HOWTO_CONSUME_CLODO_FRAMEWORK.md (this file)
- README.md — add a short link & one-line example (CLI and import). 
- CHANGELOG.md — add an entry describing the consumer docs, and the release note that packaging fixes were applied (e.g., v4.0.13: fixed dist import paths, added packaged-artifact smoke test).
- clodo.dev website — add a "Consume" landing page that mirrors this content and includes CLI and programmatic examples.
- Release notes / GitHub release — include the same consumer-facing bullets.

## 10) Suggested release note (short)
```
Fix: packaging & consumer experience
- Fix dist import paths that caused runtime errors for installed packages (ERR_MODULE_NOT_FOUND).
- Add pre-publish packaged-artifact smoke tests to avoid regressions.
- Document "How to consume clodo-framework" with clear CLI and library usage.
```

---

If you want I can:
- Add this file into `docs/` and link it from `README.md` (PR ready). ✅
- Add a short CHANGELOG entry and suggested GitHub release note for v4.0.13 (or next release) and open a PR. ✅
- Prepare a short content draft and an issue/PR for `clodo.dev` to publish this doc on the website (needs repo/hosting details). ✅

Tell me which of the three you want me to do now and I’ll implement it and open the PR(s).