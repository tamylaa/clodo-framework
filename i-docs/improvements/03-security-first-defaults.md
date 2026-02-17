Title: Security-First Defaults

Summary:
Adopt conservative defaults (no public tokens in config, require explicit allowlist for production domains, block unsafe env values) and surface these in templates.

Relevance to Clodo:
Clodo already emphasizes security; codifying defaults reduces accidental insecure deployments.

Recommended Actions:
- Update templates to include secure default `wrangler.toml` and `.env.example` with clear markers.
- Add validators that block deploy if `NODE_ENV=production` and insecure tokens are present.
- Add docs explaining default behavior and how to opt-in to relaxed settings.

Estimated Effort: Low–Medium

Risks:
- May require user education; provide clear error messages and remediation steps.

Acceptance Criteria:
- Default generated services pass security validators without extra configuration.
- Deploy commands fail with clear remediation steps when insecure.