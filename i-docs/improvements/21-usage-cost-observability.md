Title: Usage & Cost Observability

Summary:
If integrating hosted models or paid services, instrument usage and cost metrics so teams can track spend and optimize.

Relevance to Clodo:
Important if `utilities/ai` or other paid integrations are added.

Recommended Actions:
- Add optional usage logging hooks that can emit metrics to chosen backends.
- Provide cost estimation tooling for common operations and a `clodo usage report` command.
- Add thresholds and alerts for high spend scenarios.

Estimated Effort: Medium

Risks:
- Privacy concerns; keep opt-in and anonymize data.

Acceptance Criteria:
- Usage hooks can be enabled and produce readable reports.