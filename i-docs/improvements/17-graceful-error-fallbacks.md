Title: Graceful Error Handling & Fallbacks

Summary:
Standardize error responses and include graceful fallback behavior for common runtime failures (DB unavailable, rate limits).

Relevance to Clodo:
Improves reliability of generated services in real-world conditions.

Recommended Actions:
- Add a shared error format and middleware for Cloudflare Worker templates.
- Implement caching and degraded mode responses for transient failures.
- Document patterns and include tests simulating downstream failures.

Estimated Effort: Medium

Risks:
- Complexity in determining safe fallbacks; document assumptions clearly.

Acceptance Criteria:
- Templates include error middleware and tests for degraded behavior.