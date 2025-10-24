# Core Generators

Generators for core configuration files that every service needs.

## Generators in this directory

- **PackageJsonGenerator** - Generates `package.json` with service-type specific dependencies and scripts
- **WranglerTomlGenerator** - Generates `wrangler.toml` with routing automation and Workers Sites config
- **DomainsConfigGenerator** - Generates `config/domains.js` for multi-domain support
- **WorkerIndexGenerator** - Generates `src/worker/index.js` with service entry point
- **SiteConfigGenerator** - Generates `[site]` section for wrangler.toml (static-site only)

## Priority

These are **P0/P1 priority** generators as they are fundamental to service generation and are required before implementing the static-site template.

## Status

- [ ] PackageJsonGenerator (REFACTOR-5)
- [ ] WranglerTomlGenerator (REFACTOR-6)
- [ ] DomainsConfigGenerator (REFACTOR-7)
- [ ] WorkerIndexGenerator (REFACTOR-8)
- [ ] SiteConfigGenerator (REFACTOR-9)
