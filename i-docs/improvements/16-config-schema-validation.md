Title: Config-Driven Design & Schema Validation

Summary:
Require and validate configuration via schemas (Zod) so generated services and runtime use well-defined, validated configs.

Relevance to Clodo:
Eliminates silent failures due to mis-typed/invalid config.

Recommended Actions:
- Ship a `unified-config-manager` using Zod schema validation for CLI and runtime.
- Validate configs at `clodo create` and `clodo doctor` steps.
- Publish sample schemas with templates.

Estimated Effort: Low–Medium

Risks:
- Backward compatibility on config changes; provide migration helpers.

Acceptance Criteria:
- Invalid configs fail early with actionable errors; valid configs pass validation.