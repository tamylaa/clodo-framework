Title: Onboarding Wizard

Summary:
Provide an interactive CLI `onboard` flow that guides first-time users through credential setup, configuration, and optional demo scaffolding.

Relevance to Clodo:
Low friction onboarding increases adoption and reduces support overhead for `clodo-service` and related CLI commands.

Recommended Actions:
- Add `clodo onboard` CLI command (interactive prompts + non-interactive flags).
- Persist a safe default config and optional sample project creation.
- Validate tokens and suggest minimal scopes during onboarding.

Estimated Effort: Medium (CLI code + tests + docs)

Risks:
- Overly complex onboarding may confuse advanced users; keep advanced options behind flags.

Acceptance Criteria:
- `clodo onboard` completes a happy-path run in CI sim.
- Tokens validated and stored in secure local config.
- Documentation added in `docs/` and `i-docs/`.