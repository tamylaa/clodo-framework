Secrets Persistence & Packaging Policy

Overview
--------
Secrets and other sensitive artifacts must not be copied into generated services or committed to the repository. By default the framework will NOT persist secrets to disk in the project root.

Key points
----------
- Template copy step now excludes `config/` and `secrets/` directories.
- Secret generation writes to `.clodo-cache/secrets` only when persistence is explicitly enabled.
  - Enable by setting environment variable: `CLODO_ENABLE_PERSISTENCE=1` or by passing `enablePersistence: true` to the `EnhancedSecretManager` constructor.
- `.clodo-cache/` is ignored in `.gitignore` to avoid accidentally committing artifacts.

Developer guidance
------------------
- If you need to persist secrets for automation, set `CLODO_ENABLE_PERSISTENCE=1` in a secure environment (CI or a secure host), and configure `CLODO_SECRETS_DIR` if you prefer an alternate directory.
- To clean previously generated secrets or deployment artifacts locally, remove `./secrets/` and `./deployments/` (or move them to a secure archive). Prefer moving to a secure location rather than immediate deletion if unsure.

Security note
-------------
Treat any existing secrets you find as potentially sensitive. Rotate any secrets that may have been exposed.
