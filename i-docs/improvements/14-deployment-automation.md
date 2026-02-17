Title: Deployment Automation & Wrappers

Summary:
Provide single-command deployment wrappers and standard scripts that encapsulate `wrangler`/Cloudflare interactions with safe defaults.

Relevance to Clodo:
Reduces operator errors and provides consistent deployment artifacts across services.

Recommended Actions:
- Provide `clodo deploy --env <env>` that runs preflight, build, and safe publish.
- Add `deploy` templates for common flows and stage promotion scripts.
- Document rollback and canary options for wrangler-based deployments.

Estimated Effort: Medium

Risks:
- Different customers may have bespoke deploy flows; keep wrappers composable.

Acceptance Criteria:
- `clodo deploy` runs full validated pipeline and publishes with a revertable metadata entry.