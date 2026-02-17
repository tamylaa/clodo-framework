Title: Documentation & Runbooks per Feature

Summary:
For each major feature (onboard, doctor, deploy, sandbox), provide short runbooks that explain expected outcomes, remediation steps, and commands.

Relevance to Clodo:
Reduces support load and surfaces correct operational patterns to users.

Recommended Actions:
- Create `docs/runbooks/` short guides for top flows: onboarding, security remediation, deploy failure, sandbox troubleshooting.
- Link runbooks from CLI error messages and from `i-docs`.
- Keep runbooks focused, searchable, and versioned with releases.

Estimated Effort: Low–Medium

Risks:
- Maintenance overhead; treat runbooks as living docs and review during releases.

Acceptance Criteria:
- Runbooks exist for onboard/doctor/deploy and are discoverable via CLI `--help`.