# PR Notes - Programmatic Feature Parity Fixes

Summary:
- Added acceptance for legacy `kv` feature alias (maps to KV behavior; `upstash` remains the canonical provider name).
- Fixed integration test to use provider name `upstash` and corrected an invalid hyphen-less combo name.
- Ensured manifest generation includes explicit top-level `d1`, `kv`, and `r2` boolean flags to aid validation.

Why:
- Backwards compatibility: some users may still pass `kv` in payloads; accepting it avoids breaking changes and simplifies transition.

Files changed to support this:
- `src/config/service-schema-config.js` (added `kv` to allowed features)
- `test/validation/payload-validation.test.js` (unit test ensuring `kv` is accepted)
- `test/integration/programmatic-feature-parity.e2e.test.js` (updated combos to use `upstash`, fixed serviceName)
- `src/service-management/generators/utils/ServiceManifestGenerator.js` (already added top-level booleans)

Notes for maintainers:
- We prefer provider names (e.g., `upstash`) in new API usage but will accept `kv` for compatibility. Consider deprecating `kv` in docs in a follow-up.
