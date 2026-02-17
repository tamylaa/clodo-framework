Title: Streaming & Chunking Support

Summary:
Templates and runtime helpers for streaming large responses or chunked uploads to avoid timeouts and memory pressure.

Relevance to Clodo:
Useful for APIs that return large datasets or proxied media.

Recommended Actions:
- Provide examples for streaming responses in Workers (chunked responses) and guidance on limits.
- Add helper middleware for paginated/streamed endpoints in templates.
- Add tests that emulate large payload handling.

Estimated Effort: Low–Medium

Risks:
- Cloudflare-specific constraints; document limitations per runtime.

Acceptance Criteria:
- Example streaming endpoint passes integration test with large payloads.