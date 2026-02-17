Title: Audit Trails for Deployments & Operations

Summary:
Record deployment metadata, who triggered actions, and links to manifests/logs to support compliance and troubleshooting.

Relevance to Clodo:
Essential for enterprise scenarios and for tracking generated services over time.

Recommended Actions:
- Add a `deployments/` directory that records `deploy-meta-<ts>.json` for each publish.
- Include CLI `clodo deployments list` and `clodo deployments show <id>`.
- Optionally integrate with external audit stores (S3/R2) for retention.

Estimated Effort: Low–Medium

Risks:
- Sensitive metadata storage; ensure access controls or opt-out.

Acceptance Criteria:
- Deploys create artifact entries and CLI can query them.