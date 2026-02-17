Title: Permission-Aware Features & Explicit Scopes

Summary:
Document and validate required API scopes for tooling (Cloudflare, third-party APIs) and validate token scopes during onboarding.

Relevance to Clodo:
Helps users create least-privilege tokens and reduces unexpected failures.

Recommended Actions:
- Maintain a `scopes.json` mapping of commands to required scopes.
- Validate token scopes during `clodo onboard` and `clodo doctor`.
- Provide example minimal scopes in docs and quick-fix suggestions.

Estimated Effort: Low

Risks:
- API providers change scopes; keep mapping versioned and reviewable.

Acceptance Criteria:
- Onboarding reports missing scopes and suggests minimal remediation steps.