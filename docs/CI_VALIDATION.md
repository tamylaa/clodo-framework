# CI Validation Checks ✅

This repository now includes a lightweight CI workflow that runs on Pull Requests and pushes to `main`/`master`.

What the workflow does:

- Installs dependencies and runs `npm run build` 🔧
- Runs `npm run check:templates` — a fast scanner that checks `templates/` for suspicious/example/test data and ensures there are no `config/` or `secrets/` folders embedded in templates. ⚠️
- Runs `node scripts/verify-persistence-config.js` — validates that the code defaults the persistence paths to `.clodo-cache/` and checks for `CLODO_ENABLE_PERSISTENCE` guards in the relevant modules. 🔍
- Runs `npm run lint` (ESLint) to catch style and static issues 🧹

Why this is done:

- Prevent accidental packaging of example/test config and secret artifacts into generated services.
- Ensure orchestration and secrets persistence is opt-in and defaults to a local cache directory (`.clodo-cache`).

If you need to add additional checks to CI, please update `.github/workflows/validate-on-pr.yml` and add corresponding scripts under `scripts/` so they remain runnable without the full test harness.
