Title: Local Dev Gateway / Emulator

Summary:
Provide a minimal local gateway or worker emulator to test generated services end-to-end without deploying to Cloudflare.

Relevance to Clodo:
Reduces cloud iteration and cost for developers and teams.

Recommended Actions:
- Offer a lightweight emulation mode that starts a Node HTTP server mimicking essential Worker bindings.
- Support `clodo serve` to run generated service locally with sample envs.
- Document limitations and differences to real Cloudflare runtime.

Estimated Effort: Medium

Risks:
- No emulator is perfect; surface differences prominently.

Acceptance Criteria:
- `clodo serve` can run generated service and pass core smoke tests locally.