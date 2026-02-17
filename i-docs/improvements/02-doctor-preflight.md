Title: Doctor / Preflight Diagnostics

Summary:
Automated preflight checks (`clodo doctor`) that verify environment, tokens, required CLI tools, and security posture before deploys.

Relevance to Clodo:
Prevents insecure or broken deployments and reduces triage time.

Recommended Actions:
- Implement `clodo doctor` that checks: Node/npm, wrangler, Cloudflare token scopes, env var presence, secrets baseline, and required file templates.
- Integrate into CI pre-deploy and `clodo deploy` pre-hook.
- Provide machine-readable JSON output plus human-readable summary.

Estimated Effort: Medium (checks + CLI + CI integration)

Risks:
- False positives if checks are too strict; provide `--allow`/`--fix` suggestions.

Acceptance Criteria:
- `clodo doctor` returns exit code 0 on validated environments and non-zero on critical failures.
- CI uses `clodo doctor` prior to publish/deploy.