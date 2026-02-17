Title: Observability & Health Checks

Summary:
Add standardized health endpoints, structured logs, and minimal observability hooks for generated services.

Relevance to Clodo:
Operators need quick signals about service health post-deploy.

Recommended Actions:
- Add `/_health` and `/_metrics` endpoints to templates with simple readiness checks.
- Output structured JSON logs and provide guidance for shipping logs to common providers.
- Add `clodo diagnose` commands for quick snapshot of health.

Estimated Effort: Low–Medium

Risks:
- Extra code surface; keep endpoints minimal and optional via template flags.

Acceptance Criteria:
- Generated services expose `/_health` and CI can hit it as a smoke check.