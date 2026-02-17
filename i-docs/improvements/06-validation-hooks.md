Title: Validation Hooks that Block Deploys

Summary:
Provide configurable hooks that validate config and templates prior to deployment, blocking the process on critical findings.

Relevance to Clodo:
Ensures only validated configurations are deployed to environments.

Recommended Actions:
- Add a hooks system (`pre-deploy`, `post-deploy`) that can be extended by validators.
- Include built-in validators for secret leakage, URL validation, token scope, and template schema.
- Allow `--force` with audit logging for emergency bypass.

Estimated Effort: Medium

Risks:
- Overzealous validators may slow ops; design with severity levels (error/warn/info).

Acceptance Criteria:
- Pre-deploy hook prevents deployment if critical validators fail; logs explain reasons.