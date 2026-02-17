Title: Modular Service Templates

Summary:
Maintain a library of modular, composable templates with clear extension points and versioning.

Relevance to Clodo:
Enables reuse and consistent generation of production-ready services.

Recommended Actions:
- Define a template manifest and interface (inputs, outputs, hooks).
- Implement template versioning and a `clodo template install` flow.
- Provide examples and a test harness for templates.

Estimated Effort: Medium

Risks:
- Template explosion; curate and document recommended templates.

Acceptance Criteria:
- Templates can be installed/updated via CLI and pass template unit tests.