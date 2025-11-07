# Generators

This directory contains modular file generators for the Clodo Framework service generation system.

## Architecture

The generator system follows a **plugin-based architecture** where each generator is a self-contained module responsible for generating specific types of files.

### Directory Structure

```
generators/
├── core/           # Core configuration generators (package.json, wrangler.toml, etc.)
├── config/         # Environment and configuration file generators
├── code/           # Code generation (schemas, handlers, middleware, utils)
├── scripts/        # Script generators (deploy, setup, health-check)
├── testing/        # Test file generators (unit, integration, jest config)
├── documentation/  # Documentation generators (README, API docs, deployment docs)
├── cicd/           # CI/CD workflow generators (GitHub Actions, etc.)
├── service-types/  # Service-type specific generators (data, auth, content, etc.)
├── tooling/        # Tooling generators (.gitignore, docker-compose, etc.)
└── utils/          # Shared utilities (TemplateEngine, FileWriter, PathResolver)
```

## Base Classes

- **BaseGenerator**: Abstract base class all generators extend from
- **BaseServiceTypeGenerator**: Base class for service-type specific generators

## Usage

```javascript
import { PackageJsonGenerator } from './generators/core/PackageJsonGenerator.js';

const generator = new PackageJsonGenerator();
const context = {
  core: coreInputs,
  confirmed: confirmedValues,
  path: servicePath
};

generator.setContext(context);
const files = await generator.generate(context);
```

## Creating Custom Generators

See `docs/CUSTOM_GENERATOR_GUIDE.md` for detailed instructions on creating custom generators.

## Generator Registry

Generators are registered with the `GeneratorRegistry` and executed in category order:

1. Core files (package.json, wrangler.toml, etc.)
2. Configuration files (.env, .gitignore, etc.)
3. Code files (schemas, handlers, middleware, utils)
4. Script files (deploy.js, setup.js, etc.)
5. Test files (unit tests, integration tests, configs)
6. Documentation files (README, API docs, etc.)
7. CI/CD files (workflows, etc.)

## Testing

All generators have corresponding test files in `test/generators/`.

## Migration

Generators are being extracted from the monolithic `GenerationEngine.js` file to improve:
- Modularity (single responsibility per generator)
- Testability (isolated unit tests)
- Reusability (generators can be used independently)
- Extensibility (custom generators can be added)

See `docs/REFACTORING_TODO_LIST.md` for the migration plan.
