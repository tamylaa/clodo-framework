Title: Performance-Conscious Templates

Summary:
Design templates with performance best practices: caching, efficient DB queries, and minimal cold-start footprints.

Relevance to Clodo:
Generated services should be production-viable and performant by default.

Recommended Actions:
- Include caching strategies (edge/cache headers), query optimization patterns, and guidance for Durable Objects/R2 where applicable.
- Add performance smoke tests in template harness.
- Document recommended limits and bench guidelines.

Estimated Effort: Medium

Risks:
- Over-optimization may complicate templates; default to simple, documented patterns.

Acceptance Criteria:
- Templates include clear caching patterns and pass performance smoke tests.