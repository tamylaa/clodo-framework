Title: Service Manifest & Metadata Tracking

Summary:
Generate a `clodo-service-manifest.json` for every created service that captures metadata (name, domain, templates used, generated files, deploy history pointers).

Relevance to Clodo:
Enables inventory, automation, and auditability for generated services.

Recommended Actions:
- Implement `ServiceManifestGenerator` that outputs manifest during `create`.
- Store manifest in `deployments/` and include a CLI `clodo service manifest show <name>`.
- Add manifest schema and versioning.

Estimated Effort: Low–Medium

Risks:
- Manifest drift if services are manually edited; include `manifest.validate` and `manifest.refresh` commands.

Acceptance Criteria:
- Every generated service includes a valid manifest and CLI can display/validate it.