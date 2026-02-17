Title: Strong CI & Test Matrix

Summary:
Expand CI to include targeted unit, integration, and scaffolded e2e tests; optionally include environment matrix (Node versions, wrangler versions).

Relevance to Clodo:
Prevents regressions across supported target environments and deployment targets.

Recommended Actions:
- Define minimal CI matrix: Node LTS, latest supported wrangler, and a containerized flow for Cloudflare API mocking.
- Add smoke tests for generated services (packaging, `wrangler publish --dry-run` simulation).
- Run `clodo doctor` in CI prepublish.

Estimated Effort: Medium

Risks:
- Increased CI time; provide gated nightly full-suite and fast PR checks for core functionality.

Acceptance Criteria:
- PRs run quick sanity checks; nightly runs full matrix with alerts on failures.