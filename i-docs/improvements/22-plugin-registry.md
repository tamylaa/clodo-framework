Title: Plugin / Extension Registry (Controlled)

Summary:
A curated registry for templates and vetted extensions so the ecosystem can grow while preserving safety and quality.

Relevance to Clodo:
Encourages community contributions while protecting users from untrusted code.

Recommended Actions:
- Implement a simple internal registry format and an install CLI (`clodo plugin install <name>`).
- Provide vetting guidelines and an automated smoke-test harness for registry submissions.
- Allow offline/local registries for enterprise use.

Estimated Effort: Medium–Large

Risks:
- Registry maintenance overhead; start small and iterate.

Acceptance Criteria:
- Plugins can be installed from registry and pass smoke tests before activation.