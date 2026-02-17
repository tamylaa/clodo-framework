Title: Multi-Environment & Multi-Domain Orchestration

Summary:
Orchestrator awareness for multi-environment (dev/stage/prod) and multi-domain deployments with safe promotion flows.

Relevance to Clodo:
Enterprises deploy multiple domains/environments; orchestrator should handle mappings and safe promotions.

Recommended Actions:
- Add environment manifest and orchestrator commands: `promote`, `rollback`, and `diff` across envs.
- Validate domain mappings and provide safe publish flags for production.
- Add documentation for multi-tenant/multi-domain workflows.

Estimated Effort: Medium–Large

Risks:
- Complexity in mapping custom org flows; provide opinionated defaults while keeping extensible hooks.

Acceptance Criteria:
- Promotion workflows create clear audit entries and can be rolled back.