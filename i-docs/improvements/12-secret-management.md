Title: Secret Management & Baseline

Summary:
Add secret baseline checks, encrypted storage guidance, and CI audit to detect accidental secrets in commits or published artifacts.

Relevance to Clodo:
Prevents leakage and ensures safer defaults for generated artifacts.

Recommended Actions:
- Introduce `.secrets.baseline` and a `clodo secrets validate` flow.
- Add pre-commit hooks to run secret scans and CI checks to block publishing.
- Recommend secure local storage patterns (system keychain, or env-specific vaults).

Estimated Effort: Medium

Risks:
- Developers may find baseline checks noisy; provide remediation steps and allow whitelisting for false positives.

Acceptance Criteria:
- Secret scanner fails CI on detected secrets and baseline explains remediation.