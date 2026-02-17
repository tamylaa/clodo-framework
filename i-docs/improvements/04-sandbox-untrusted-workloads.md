Title: Sandbox Untrusted Workloads

Summary:
Run code-generation, template execution, or user-submitted build steps inside an isolated environment (child process, container, or lightweight VM) when inputs are untrusted.

Relevance to Clodo:
Service generation may process third-party templates or customer-provided scripts—sandboxing reduces risk.

Recommended Actions:
- Add a sandbox runner abstraction with pluggable backends: `proc` (restricted), `docker` (recommended), `no-op` (dev).
- Default generation for unknown templates to run in sandbox mode.
- Provide `clodo sandbox` diagnostic and logs.

Estimated Effort: Medium–Large (Docker integration + UX)

Risks:
- Increased complexity for local dev; provide easy opt-out flags for trusted flows.

Acceptance Criteria:
- Generation runs inside sandbox on CI and local Docker if untrusted templates are used.
- Logs clearly show sandbox failures and provide remediation.