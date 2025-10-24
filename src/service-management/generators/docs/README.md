# Documentation Generators

Generators for service documentation files.

## Generators in this directory

- **ReadmeGenerator** - Generates `README.md` with service overview and usage instructions
- **ApiDocsGenerator** - Generates `docs/api.md` with endpoint documentation
- **DeploymentDocsGenerator** - Generates `docs/deployment.md` with deployment instructions
- **ConfigurationDocsGenerator** - Generates `docs/configuration.md` with configuration options
- *(Future generators for additional documentation types)*

## Priority

**P1-P2 priority** - Documentation is essential for service usability and maintainability.

## Status

- [ ] ReadmeGenerator (REFACTOR-19)
- [ ] ApiDocsGenerator (REFACTOR-20)
- [ ] DeploymentDocsGenerator (REFACTOR-21)
- [ ] ConfigurationDocsGenerator (REFACTOR-22)

Note: Each documentation generator extracts template literals and service-type logic from GenerationEngine.
