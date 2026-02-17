Title: Typed Public API & SDK

Summary:
Provide well-typed public exports and a small plugin SDK to make integrations stable and discoverable.

Relevance to Clodo:
Encourages ecosystem extensions and reduces breakage for downstream consumers.

Recommended Actions:
- Ensure `types/` are accurate and published with package.
- Design a minimal `PluginSDK` interface with lifecycle hooks (install/uninstall/validate).
- Add tests and example plugin using the SDK.

Estimated Effort: Medium

Risks:
- Accelerates external reliance; maintain backward compatibility guarantees.

Acceptance Criteria:
- SDK consumer example builds and runs; types are included in published package.