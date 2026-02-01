# Release Announcement Template & Checklist

This file contains a short announcement blurb and a checklist for posting release notes automatically to X (Twitter) for the CLODO Framework project.

## Blurb (ready-to-post)

v{{TAG}} — Programmatic createService now normalizes legacy `kv` → `upstash`, accepts plural `durableObjects`, and emits Durable Object bindings into generated middleware. Includes unit & E2E tests for parity. Read the release notes: {{RELEASE_URL}}

(Shortened variant for X/Twitter):
> v{{TAG}} — createService normalizes `kv` → `upstash`, supports `durableObjects`, and emits Durable Object middleware bindings. See https://github.com/tamylaa/clodo-framework/releases/tag/{{TAG}}

## Checklist for posting releases

- [ ] Ensure `CHANGELOG.md` and release notes are correct.
- [ ] Create the release on GitHub (or let semantic-release publish it).
- [ ] Add repo secret `X_BEARER_TOKEN` with a valid X API bearer token (for the account `@clodoframework`).
- [ ] Merge this `post-release-to-x.yml` workflow to `main` so it can run when a release is published.
- [ ] Verify the tweet was posted and adjust the template if needed.

## How to add the repo secret
1. Go to the repository on GitHub → Settings → Secrets & variables → Actions → New repository secret.
2. Name: `X_BEARER_TOKEN` (value: your X API bearer token for `@clodoframework`).
3. Save.

## Notes
- This repository workflow will post a single tweet containing the blurb when a release is published. Modify the workflow or blurb as needed for richer messages (images, multiple tweets, threads).
- If you want me to handle posting directly now, provide temporary credentials or add the `X_BEARER_TOKEN` secret and I can trigger the workflow by re-publishing or creating a release draft and publishing it.
