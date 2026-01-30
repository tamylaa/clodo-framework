# Running the Full Test Matrix (Frontend & Integration)

Some tests in this repository (notably `clodo-dev-site` unit tests and integration tests that rely on Playwright, axe-core, or jsdom) require optional dev dependencies and a browser environment. These tests are intentionally heavy and not run by the PR-focused validation job.

When to run these tests:

- If you're working on frontend UI, accessibility, or site-specific logic in `clodo-dev-site`.
- When you want to validate the entire repository (nightly full-test job runs automatically).

How to run locally (recommended on a developer machine):

1. Install dependencies (including optional ones):

   npm ci
   npx playwright install --with-deps

2. Run the clodo-dev-site tests only:

   npm run test:clodo-dev-site

4. Or run the full test suite (slow and resource intensive):

   npm run test:full

Notes and troubleshooting:

- If a test complains about missing `jsdom`, `axe-core`, `@playwright/test`, or browser binaries, ensure you've run the Playwright install step above and that your environment has the expected dev packages installed.
- CI runs a nightly full test job on a runner that installs Playwright browsers. PR validations intentionally avoid running these heavy suites to keep feedback fast and stable.
