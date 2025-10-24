# Script Generators

Generators for deployment and utility scripts.

## Generators in this directory

- **DeployScriptGenerator** - Generates `scripts/deploy.js` for deployment automation
- **SetupScriptGenerator** - Generates `scripts/setup.js` for initial service setup
- **HealthCheckScriptGenerator** - Generates `scripts/health-check.js` for service health monitoring

## Priority

**P2 priority** - Supporting tools that can be extracted in parallel.

## Status

- [ ] DeployScriptGenerator (REFACTOR-17)
- [ ] SetupScriptGenerator (REFACTOR-17)
- [ ] HealthCheckScriptGenerator (REFACTOR-17)

Note: These three are bundled together (REFACTOR-17) as they follow similar patterns.
