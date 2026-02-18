## [4.5.1](https://github.com/tamylaa/clodo-framework/compare/v4.5.0...v4.5.1) (2026-02-11)


### Bug Fixes

* resolve e2e test failures for validate and deploy commands ([97fd564](https://github.com/tamylaa/clodo-framework/commit/97fd5648211d13f46004b9e69c9b6face546d86d))

### Features (post-4.5.1)

* **doctor**: add `clodo-service doctor` preflight command — automated environment, dependency, and connectivity checks before deployment. Integrates with deploy via `--skip-doctor` / `--doctor-strict` flags. ([f72f70f](https://github.com/tamylaa/clodo-framework/commit/f72f70f))

* **secrets**: add `clodo-service secrets` command — source code secret scanning with 15+ built-in patterns (AWS, Stripe, GitHub, JWT, etc.), baseline management (`baseline show`/`baseline update`), and `SecretsManager` programmatic API. 42 unit + 19 E2E tests. ([f72f70f](https://github.com/tamylaa/clodo-framework/commit/f72f70f))

* **config**: add `clodo-service config-schema` command — Zod-powered schema validation for all CLI config files (create, deploy, validate, update). Includes `show`, `validate`, `types` subcommands, semantic warnings (env var placeholders, duplicate features, production without security). `ConfigSchemaValidator` programmatic API. 77 unit + 21 E2E tests. ([3c25c88](https://github.com/tamylaa/clodo-framework/commit/3c25c88))

# [4.5.0](https://github.com/tamylaa/clodo-framework/compare/v4.4.1...v4.5.0) (2026-02-11)


### Features

* complete framework transformation - migrate generators to framework imports, add clodo add CLI, lazy-load managers, fix tests ([df09228](https://github.com/tamylaa/clodo-framework/commit/df09228f256640143144f1cf4ec9a73905c9da88))
