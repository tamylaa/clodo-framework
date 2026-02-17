Title: Rich CLI Surface

Summary:
Grow the CLI with ergonomic commands and consistent UX for `create`, `init`, `deploy`, `validate`, `diagnose`, `onboard`, and `doctor`.

Relevance to Clodo:
CLI is primary operator surface; good UX reduces errors and support burden.

Recommended Actions:
- Audit existing CLI commands for consistency and gaps.
- Add contextual help, interactive mode, and machine-readable flags (`--json`).
- Add telemetry toggles (opt-in) to improve UX based on real usage.

Estimated Effort: Medium

Risks:
- Telemetry concerns; make opt-in and transparent.

Acceptance Criteria:
- CLI provides consistent help, and the most common flows are covered with intuitive commands.