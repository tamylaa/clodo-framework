# Generator Utilities

Shared utility classes used by all generators.

## Utility Classes

### TemplateEngine
**File**: `TemplateEngine.js`

Handles template loading and rendering:
- `loadTemplate(templateName)` - Loads template files from `templates/` directory
- `render(template, variables)` - Replaces `{{variable}}` placeholders with actual values
- `renderPartial(partialName, variables)` - Renders template partials/includes
- *(Future)* Support for conditionals (`{{#if}}`) and loops (`{{#each}}`)

**Test Coverage**: 5 tests (template loading, variable replacement, nested placeholders, missing variables, partials)

### FileWriter
**File**: `FileWriter.js`

Handles file system operations:
- `writeFile(path, content)` - Writes content to file with atomic operations
- `ensureDirectory(path)` - Creates directories recursively if they don't exist
- `fileExists(path)` - Checks if file already exists
- `validatePath(path)` - Validates path for security (no path traversal)

**Test Coverage**: 4 tests (write, directory creation, overwrite protection, path validation)

### PathResolver
**File**: `PathResolver.js`

Handles cross-platform path resolution:
- `resolve(...paths)` - Resolves paths relative to service root
- `join(...paths)` - Joins path segments using correct separator
- `normalize(path)` - Normalizes path (handles Windows vs Unix)
- `relative(from, to)` - Calculates relative path between two locations

**Test Coverage**: 3 tests (path resolution, cross-platform compatibility, relative paths)

## Priority

**P0 priority** - Required by BaseGenerator and all other generators.

## Status

- [ ] TemplateEngine (REFACTOR-4)
- [ ] FileWriter (REFACTOR-4)
- [ ] PathResolver (REFACTOR-4)

Note: These three are bundled together (REFACTOR-4) as infrastructure utilities.

## Design Principles

These utilities follow **Single Responsibility Principle**:
- TemplateEngine focuses only on template processing
- FileWriter focuses only on file operations
- PathResolver focuses only on path manipulation

This separation allows:
- Independent testing of each utility
- Easy mocking in generator tests
- Reusability across all generators
- Future enhancements without breaking changes
