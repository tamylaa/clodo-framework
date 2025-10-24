# GenerationEngine Refactoring TODO List

**Priority**: CRITICAL - Must complete before static-site template  
**Rationale**: Prevent GenerationEngine from becoming bloated and unmanageable  
**Timeline**: 1-2 weeks (can work in parallel with other tasks)  
**Status**: Ready to start

---

## Phase 1: Infrastructure Setup (Week 1, Days 1-2)

### TODO #1: Create Generator Directory Structure
**Priority**: P0 - Foundation  
**Effort**: 30 minutes  
**Description**: Create the complete directory structure for modular generators.

**Directories to create**:
```
src/service-management/generators/
├── core/                    # Core configuration generators
├── config/                  # Environment and config file generators
├── code/                    # Code generation (schemas, handlers, middleware, utils)
├── scripts/                 # Script generators
├── tests/                   # Test file generators
├── docs/                    # Documentation generators
├── ci/                      # CI/CD workflow generators
├── service-types/           # Service-type specific generators
└── utils/                   # Shared utilities
```

**Acceptance Criteria**:
- [ ] All directories created
- [ ] README.md in each directory explaining purpose
- [ ] .gitkeep files to ensure empty directories are tracked

---

### TODO #2: Create BaseGenerator Abstract Class
**Priority**: P0 - Foundation  
**Effort**: 2 hours  
**File**: `src/service-management/generators/BaseGenerator.js`  
**Tests**: `test/generators/BaseGenerator.test.js`

**Implementation**:
```javascript
export class BaseGenerator {
  constructor(options = {})
  async generate(context)           // Abstract - must override
  shouldGenerate(context)            // Conditional generation
  async loadTemplate(templateName)  // Load template file
  renderTemplate(template, variables) // Render with {{placeholders}}
  async writeFile(relativePath, content) // Write to service path
  setContext(context)                // Set generation context
}
```

**Test Coverage**: 15 tests
- Constructor initialization (3 tests)
- Template loading (3 tests)
- Template rendering (4 tests)
- File writing (3 tests)
- Context management (2 tests)

**Acceptance Criteria**:
- [ ] BaseGenerator class implemented
- [ ] All methods have JSDoc comments
- [ ] 15 tests passing (100% coverage)
- [ ] Example generator showing usage

---

### TODO #3: Create GeneratorRegistry Class
**Priority**: P0 - Foundation  
**Effort**: 1.5 hours  
**File**: `src/service-management/generators/GeneratorRegistry.js`  
**Tests**: `test/generators/GeneratorRegistry.test.js`

**Implementation**:
```javascript
export class GeneratorRegistry {
  constructor()
  register(category, generators)     // Register generators by category
  getGenerators(category)            // Get generators for category
  getCategories()                    // Get all categories in order
  getCount()                         // Total generator count
  unregister(category, generatorName) // Remove generator
}
```

**Test Coverage**: 10 tests
- Registration (3 tests)
- Retrieval (2 tests)
- Category management (2 tests)
- Count/stats (2 tests)
- Edge cases (1 test)

**Acceptance Criteria**:
- [ ] GeneratorRegistry class implemented
- [ ] All methods have JSDoc comments
- [ ] 10 tests passing (100% coverage)
- [ ] Support for custom generators

---

### TODO #4: Create Template Directory and Utilities
**Priority**: P0 - Foundation  
**Effort**: 1 hour  
**Files**: 
- `src/service-management/templates/` directory
- `src/service-management/generators/utils/TemplateEngine.js`
- `src/service-management/generators/utils/FileWriter.js`
- `src/service-management/generators/utils/PathResolver.js`

**TemplateEngine Features**:
- Load templates from disk
- Simple {{variable}} replacement
- Support for conditionals (future)
- Support for loops (future)

**FileWriter Features**:
- Write files with directory creation
- Atomic writes (temp file + rename)
- Error handling and rollback

**PathResolver Features**:
- Resolve template paths
- Resolve output paths
- Normalize paths across OS

**Test Coverage**: 12 tests total
- TemplateEngine (5 tests)
- FileWriter (4 tests)
- PathResolver (3 tests)

**Acceptance Criteria**:
- [ ] Template directory created
- [ ] TemplateEngine implemented
- [ ] FileWriter implemented
- [ ] PathResolver implemented
- [ ] 12 tests passing

---

## Phase 2: Core Generators (Week 1, Days 3-5)

### TODO #5: Extract PackageJsonGenerator
**Priority**: P1 - Core Config  
**Effort**: 2 hours  
**File**: `src/service-management/generators/core/PackageJsonGenerator.js`  
**Template**: `src/service-management/templates/package.json.template`  
**Tests**: `test/generators/core/PackageJsonGenerator.test.js`

**Functionality**:
- Generate package.json from template
- Service-type specific scripts
- Service-type specific dependencies
- Version management

**Test Coverage**: 12 tests
- Basic generation (3 tests)
- Service-type scripts (3 tests)
- Service-type dependencies (3 tests)
- Version handling (3 tests)

**Acceptance Criteria**:
- [ ] PackageJsonGenerator implemented
- [ ] Template file created
- [ ] 12 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #6: Extract WranglerTomlGenerator
**Priority**: P1 - Core Config  
**Effort**: 3 hours  
**File**: `src/service-management/generators/core/WranglerTomlGenerator.js`  
**Template**: `src/service-management/templates/wrangler.toml.template`  
**Tests**: `test/generators/core/WranglerTomlGenerator.test.js`

**Functionality**:
- Generate wrangler.toml with routing
- Integrate RouteGenerator
- Integrate SiteConfigGenerator (for static-site)
- Environment configurations

**Test Coverage**: 18 tests (reuse existing routing tests)
- Basic generation (4 tests)
- Route generation integration (6 tests)
- Site config integration (4 tests)
- Environment configs (4 tests)

**Acceptance Criteria**:
- [ ] WranglerTomlGenerator implemented
- [ ] Template file created
- [ ] Routing integration working
- [ ] Site config integration working
- [ ] 18 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #7: Extract DomainsConfigGenerator
**Priority**: P1 - Core Config  
**Effort**: 1.5 hours  
**File**: `src/service-management/generators/core/DomainsConfigGenerator.js`  
**Template**: `src/service-management/templates/domains.config.js.template`  
**Tests**: `test/generators/core/DomainsConfigGenerator.test.js`

**Functionality**:
- Generate config/domains.js
- Multi-domain support
- Environment-specific domains
- Zone ID mapping

**Test Coverage**: 10 tests
- Single domain (2 tests)
- Multi-domain (3 tests)
- Environment configs (3 tests)
- Zone ID validation (2 tests)

**Acceptance Criteria**:
- [ ] DomainsConfigGenerator implemented
- [ ] Template file created
- [ ] 10 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #8: Extract WorkerIndexGenerator
**Priority**: P1 - Core Config  
**Effort**: 2 hours  
**File**: `src/service-management/generators/core/WorkerIndexGenerator.js`  
**Template**: `src/service-management/templates/worker-index.js.template`  
**Tests**: `test/generators/core/WorkerIndexGenerator.test.js`

**Functionality**:
- Generate src/worker/index.js
- Service-type specific worker logic
- Router integration
- Middleware integration

**Test Coverage**: 12 tests
- Basic generation (3 tests)
- Service-type logic (4 tests)
- Router integration (3 tests)
- Middleware integration (2 tests)

**Acceptance Criteria**:
- [ ] WorkerIndexGenerator implemented
- [ ] Template file created
- [ ] 12 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #9: Extract SiteConfigGenerator
**Priority**: P1 - Core Config  
**Effort**: 1 hour  
**File**: `src/service-management/generators/core/SiteConfigGenerator.js`  
**Tests**: `test/generators/core/SiteConfigGenerator.test.js`

**Functionality**:
- Generate [site] section for wrangler.toml
- Conditional (static-site only)
- Bucket configuration
- Include/exclude patterns
- Security defaults

**Test Coverage**: 8 tests (existing workers-sites-config tests)
- Basic generation (2 tests)
- Default values (2 tests)
- Custom configuration (2 tests)
- Boundary enforcement (2 tests)

**Acceptance Criteria**:
- [ ] SiteConfigGenerator implemented
- [ ] Migrated from GenerationEngine.generateSiteConfig()
- [ ] 8 tests passing (from existing suite)
- [ ] Output matches current implementation

---

## Phase 3: Configuration Generators (Week 2, Days 1-2)

### TODO #10: Extract EnvFileGenerator
**Priority**: P1 - Config  
**Effort**: 2 hours  
**File**: `src/service-management/generators/config/EnvFileGenerator.js`  
**Templates**: 
- `templates/env.example.template`
- `templates/env.production.template`
- `templates/env.staging.template`
- `templates/env.development.template`
**Tests**: `test/generators/config/EnvFileGenerator.test.js`

**Functionality**:
- Generate .env.example
- Generate .env.production
- Generate .env.staging
- Generate .env.development
- Environment-specific variables

**Test Coverage**: 12 tests
- .env.example (3 tests)
- Production env (3 tests)
- Staging env (3 tests)
- Development env (3 tests)

**Acceptance Criteria**:
- [ ] EnvFileGenerator implemented
- [ ] 4 template files created
- [ ] 12 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #11: Extract GitignoreGenerator
**Priority**: P2 - Config  
**Effort**: 45 minutes  
**File**: `src/service-management/generators/config/GitignoreGenerator.js`  
**Template**: `templates/gitignore.template`  
**Tests**: `test/generators/config/GitignoreGenerator.test.js`

**Functionality**:
- Generate .gitignore
- Node.js defaults
- Cloudflare Workers specific
- Environment files

**Test Coverage**: 5 tests
- Basic generation (2 tests)
- Pattern validation (2 tests)
- Completeness (1 test)

**Acceptance Criteria**:
- [ ] GitignoreGenerator implemented
- [ ] Template file created
- [ ] 5 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #12: Extract DockerComposeGenerator
**Priority**: P3 - Config  
**Effort**: 1 hour  
**File**: `src/service-management/generators/config/DockerComposeGenerator.js`  
**Template**: `templates/docker-compose.yml.template`  
**Tests**: `test/generators/config/DockerComposeGenerator.test.js`

**Functionality**:
- Generate docker-compose.yml
- Service-type specific containers
- Database containers (for data service)
- Development environment

**Test Coverage**: 8 tests
- Basic generation (2 tests)
- Service-type containers (3 tests)
- Database integration (2 tests)
- Port mapping (1 test)

**Acceptance Criteria**:
- [ ] DockerComposeGenerator implemented
- [ ] Template file created
- [ ] 8 tests passing
- [ ] Output matches current GenerationEngine output

---

## Phase 4: Code Generators (Week 2, Days 3-4)

### TODO #13: Extract SchemaGenerator
**Priority**: P1 - Code  
**Effort**: 2.5 hours  
**File**: `src/service-management/generators/code/SchemaGenerator.js`  
**Templates**:
- `templates/schemas/base-schema.js.template`
- `templates/schemas/data-schema.js.template`
- `templates/schemas/auth-schema.js.template`
- `templates/schemas/content-schema.js.template`
**Tests**: `test/generators/code/SchemaGenerator.test.js`

**Functionality**:
- Generate base Zod schemas
- Service-type specific schemas
- Validation rules
- Type exports

**Test Coverage**: 15 tests
- Base schema (3 tests)
- Service-type schemas (8 tests)
- Validation rules (2 tests)
- Edge cases (2 tests)

**Acceptance Criteria**:
- [ ] SchemaGenerator implemented
- [ ] Template files created
- [ ] 15 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #14: Extract HandlerGenerator
**Priority**: P1 - Code  
**Effort**: 3 hours  
**File**: `src/service-management/generators/code/HandlerGenerator.js`  
**Templates**: Service-type specific handler templates
**Tests**: `test/generators/code/HandlerGenerator.test.js`

**Functionality**:
- Generate service handlers
- CRUD operations (data service)
- Auth operations (auth service)
- Content operations (content service)
- API routing (api-gateway)

**Test Coverage**: 18 tests
- Data service handlers (5 tests)
- Auth service handlers (4 tests)
- Content service handlers (4 tests)
- API gateway handlers (3 tests)
- Generic handlers (2 tests)

**Acceptance Criteria**:
- [ ] HandlerGenerator implemented
- [ ] Template files created
- [ ] 18 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #15: Extract MiddlewareGenerator
**Priority**: P2 - Code  
**Effort**: 1.5 hours  
**File**: `src/service-management/generators/code/MiddlewareGenerator.js`  
**Templates**: Middleware templates
**Tests**: `test/generators/code/MiddlewareGenerator.test.js`

**Functionality**:
- Generate CORS middleware
- Generate auth middleware
- Generate logging middleware
- Generate error handling middleware

**Test Coverage**: 12 tests
- CORS middleware (3 tests)
- Auth middleware (3 tests)
- Logging middleware (3 tests)
- Error handling (3 tests)

**Acceptance Criteria**:
- [ ] MiddlewareGenerator implemented
- [ ] Template files created
- [ ] 12 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #16: Extract UtilsGenerator
**Priority**: P2 - Code  
**Effort**: 2 hours  
**File**: `src/service-management/generators/code/UtilsGenerator.js`  
**Templates**: Utility templates
**Tests**: `test/generators/code/UtilsGenerator.test.js`

**Functionality**:
- Generate logger utility
- Generate validator utility
- Generate response helpers
- Generate error helpers

**Test Coverage**: 12 tests
- Logger (3 tests)
- Validator (3 tests)
- Response helpers (3 tests)
- Error helpers (3 tests)

**Acceptance Criteria**:
- [ ] UtilsGenerator implemented
- [ ] Template files created
- [ ] 12 tests passing
- [ ] Output matches current GenerationEngine output

---

## Phase 5: Script & Test Generators (Week 2, Day 5)

### TODO #17: Extract ScriptGenerators (Bundle)
**Priority**: P2 - Scripts  
**Effort**: 2.5 hours  
**Files**:
- `generators/scripts/DeployScriptGenerator.js`
- `generators/scripts/SetupScriptGenerator.js`
- `generators/scripts/HealthCheckScriptGenerator.js`
**Templates**: Script templates
**Tests**: `test/generators/scripts/ScriptGenerators.test.js`

**Functionality**:
- Generate scripts/deploy.js
- Generate scripts/setup.js
- Generate scripts/health-check.js

**Test Coverage**: 15 tests
- Deploy script (5 tests)
- Setup script (5 tests)
- Health check script (5 tests)

**Acceptance Criteria**:
- [ ] All 3 ScriptGenerators implemented
- [ ] Template files created
- [ ] 15 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #18: Extract TestGenerators (Bundle)
**Priority**: P2 - Tests  
**Effort**: 3 hours  
**Files**:
- `generators/tests/UnitTestGenerator.js`
- `generators/tests/IntegrationTestGenerator.js`
- `generators/tests/JestConfigGenerator.js`
- `generators/tests/EslintConfigGenerator.js`
**Templates**: Test and config templates
**Tests**: `test/generators/tests/TestGenerators.test.js`

**Functionality**:
- Generate test/unit/**/*.test.js
- Generate test/integration/**/*.test.js
- Generate jest.config.js
- Generate .eslintrc.js

**Test Coverage**: 20 tests
- Unit test generation (6 tests)
- Integration test generation (6 tests)
- Jest config (4 tests)
- Eslint config (4 tests)

**Acceptance Criteria**:
- [ ] All 4 TestGenerators implemented
- [ ] Template files created
- [ ] 20 tests passing
- [ ] Output matches current GenerationEngine output

---

## Phase 6: Documentation Generators (Week 3, Days 1-2)

### TODO #19: Extract ReadmeGenerator
**Priority**: P1 - Docs  
**Effort**: 2 hours  
**File**: `src/service-management/generators/docs/ReadmeGenerator.js`  
**Template**: `templates/README.md.template`  
**Tests**: `test/generators/docs/ReadmeGenerator.test.js`

**Functionality**:
- Generate README.md
- Service-type specific sections
- Quick start guide
- Configuration documentation
- Deployment instructions

**Test Coverage**: 10 tests
- Basic generation (3 tests)
- Service-type sections (4 tests)
- Template rendering (3 tests)

**Acceptance Criteria**:
- [ ] ReadmeGenerator implemented
- [ ] Template file created
- [ ] 10 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #20: Extract ApiDocsGenerator
**Priority**: P1 - Docs  
**Effort**: 2.5 hours  
**File**: `src/service-management/generators/docs/ApiDocsGenerator.js`  
**Template**: `templates/API.md.template`  
**Tests**: `test/generators/docs/ApiDocsGenerator.test.js`

**Functionality**:
- Generate docs/API.md
- Service-type specific endpoints
- Request/response examples
- Authentication documentation

**Test Coverage**: 15 tests
- Basic generation (3 tests)
- Endpoint documentation (6 tests)
- Request/response examples (4 tests)
- Auth documentation (2 tests)

**Acceptance Criteria**:
- [ ] ApiDocsGenerator implemented
- [ ] Template file created
- [ ] 15 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #21: Extract DeploymentDocsGenerator
**Priority**: P2 - Docs  
**Effort**: 1.5 hours  
**File**: `src/service-management/generators/docs/DeploymentDocsGenerator.js`  
**Template**: `templates/DEPLOYMENT.md.template`  
**Tests**: `test/generators/docs/DeploymentDocsGenerator.test.js`

**Functionality**:
- Generate docs/DEPLOYMENT.md
- Deployment steps
- Environment setup
- Troubleshooting

**Test Coverage**: 8 tests
- Basic generation (2 tests)
- Deployment steps (3 tests)
- Environment setup (2 tests)
- Troubleshooting (1 test)

**Acceptance Criteria**:
- [ ] DeploymentDocsGenerator implemented
- [ ] Template file created
- [ ] 8 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #22: Extract ConfigurationDocsGenerator
**Priority**: P2 - Docs  
**Effort**: 1.5 hours  
**File**: `src/service-management/generators/docs/ConfigurationDocsGenerator.js`  
**Template**: `templates/CONFIGURATION.md.template`  
**Tests**: `test/generators/docs/ConfigurationDocsGenerator.test.js`

**Functionality**:
- Generate docs/CONFIGURATION.md
- Configuration hierarchy
- Environment variables
- Service settings

**Test Coverage**: 8 tests
- Basic generation (2 tests)
- Configuration hierarchy (3 tests)
- Environment variables (2 tests)
- Service settings (1 test)

**Acceptance Criteria**:
- [ ] ConfigurationDocsGenerator implemented
- [ ] Template file created
- [ ] 8 tests passing
- [ ] Output matches current GenerationEngine output

---

## Phase 7: CI/CD & Service-Type Generators (Week 3, Days 3-4)

### TODO #23: Extract CI/CD Generators (Bundle)
**Priority**: P2 - CI/CD  
**Effort**: 2 hours  
**Files**:
- `generators/ci/CiWorkflowGenerator.js`
- `generators/ci/DeployWorkflowGenerator.js`
**Templates**: GitHub Actions workflow templates
**Tests**: `test/generators/ci/CiGenerators.test.js`

**Functionality**:
- Generate .github/workflows/ci.yml
- Generate .github/workflows/deploy.yml
- Environment-specific workflows

**Test Coverage**: 10 tests
- CI workflow (5 tests)
- Deploy workflow (5 tests)

**Acceptance Criteria**:
- [ ] Both CiGenerators implemented
- [ ] Template files created
- [ ] 10 tests passing
- [ ] Output matches current GenerationEngine output

---

### TODO #24: Create Service-Type Generator Base Class
**Priority**: P1 - Service Types  
**Effort**: 2 hours  
**File**: `src/service-management/generators/service-types/BaseServiceTypeGenerator.js`  
**Tests**: `test/generators/service-types/BaseServiceTypeGenerator.test.js`

**Functionality**:
- Abstract base for service-type generators
- Hooks for handlers, schemas, middleware, docs
- Service-type specific logic encapsulation

**Methods**:
```javascript
async generateHandlers(context)
async generateSchemas(context)
async generateMiddleware(context)
async generateDocs(context)
async generateTests(context)
```

**Test Coverage**: 8 tests
- Interface validation (3 tests)
- Hook execution (3 tests)
- Context management (2 tests)

**Acceptance Criteria**:
- [ ] BaseServiceTypeGenerator implemented
- [ ] Interface defined
- [ ] 8 tests passing
- [ ] Documentation for creating custom service types

---

### TODO #25: Extract Service-Type Generators (Bundle)
**Priority**: P1 - Service Types  
**Effort**: 6 hours  
**Files**:
- `generators/service-types/DataServiceGenerator.js`
- `generators/service-types/AuthServiceGenerator.js`
- `generators/service-types/ContentServiceGenerator.js`
- `generators/service-types/ApiGatewayGenerator.js`
- `generators/service-types/GenericServiceGenerator.js`
**Tests**: `test/generators/service-types/ServiceTypeGenerators.test.js`

**Functionality**:
- Service-type specific generation logic
- Handlers, schemas, middleware per type
- Type-specific documentation

**Test Coverage**: 25 tests (5 per service type)
- Data service (5 tests)
- Auth service (5 tests)
- Content service (5 tests)
- API gateway (5 tests)
- Generic service (5 tests)

**Acceptance Criteria**:
- [ ] All 5 ServiceTypeGenerators implemented
- [ ] Each extends BaseServiceTypeGenerator
- [ ] 25 tests passing
- [ ] Output matches current GenerationEngine output

---

## Phase 8: Integration & Migration (Week 3, Day 5)

### TODO #26: Refactor GenerationEngine to Use Registry
**Priority**: P0 - Integration  
**Effort**: 4 hours  
**File**: `src/service-management/GenerationEngine.js` (REFACTOR)  
**Tests**: Update existing GenerationEngine tests

**Changes**:
- Remove all individual generate* methods
- Keep only orchestration logic
- Use GeneratorRegistry
- Initialize all generators
- Reduce from 2,729 lines to ~200 lines

**Code Structure**:
```javascript
export class GenerationEngine {
  constructor(options) {
    this.registry = new GeneratorRegistry();
    this.registerBuiltInGenerators();
  }
  
  registerBuiltInGenerators() {
    // Register all generators by category
  }
  
  async generateService(coreInputs, confirmedValues, options) {
    // Orchestration only
  }
  
  async generateAllFiles(context) {
    // Execute generators from registry
  }
}
```

**Test Coverage**: Update existing 23+ tests
- Generation orchestration (8 tests)
- Registry integration (6 tests)
- Context passing (4 tests)
- Error handling (5 tests)

**Acceptance Criteria**:
- [ ] GenerationEngine refactored to ~200 lines
- [ ] All generators registered in registry
- [ ] All existing tests passing (562 tests)
- [ ] No breaking changes
- [ ] Output identical to before refactoring

---

### TODO #27: Create Comparison Test Suite
**Priority**: P0 - Validation  
**Effort**: 3 hours  
**File**: `test/refactoring/generation-comparison.test.js`  
**Tests**: 30+ comparison tests

**Functionality**:
- Generate services with old GenerationEngine
- Generate services with new modular system
- Compare outputs byte-for-byte
- Ensure 100% identical results

**Test Coverage**: 30 tests
- All service types (6 tests)
- All file types (10 tests)
- All configurations (8 tests)
- Edge cases (6 tests)

**Acceptance Criteria**:
- [ ] Comparison test suite created
- [ ] All 30 tests passing
- [ ] 100% output match confirmed
- [ ] Performance metrics captured

---

### TODO #28: Update Documentation
**Priority**: P1 - Documentation  
**Effort**: 2 hours  
**Files**:
- `docs/GENERATOR_ARCHITECTURE.md` (NEW)
- `docs/CUSTOM_GENERATOR_GUIDE.md` (NEW)
- `README.md` (UPDATE)

**Content**:
- Architecture overview
- Generator lifecycle
- Creating custom generators
- Extending service types
- Migration guide

**Acceptance Criteria**:
- [ ] Architecture documentation complete
- [ ] Custom generator guide complete
- [ ] README updated with new architecture
- [ ] Code examples provided

---

## Phase 9: Cleanup & Polish (Week 4, Day 1)

### TODO #29: Remove Old Generator Methods
**Priority**: P2 - Cleanup  
**Effort**: 2 hours  
**File**: `src/service-management/GenerationEngine.js`

**Changes**:
- Remove all old generate* methods
- Keep only registry-based implementation
- Update all references
- Clean up imports

**Acceptance Criteria**:
- [ ] All old methods removed
- [ ] All tests still passing
- [ ] No dead code remaining
- [ ] File reduced to ~200 lines

---

### TODO #30: Performance Benchmarking
**Priority**: P2 - Validation  
**Effort**: 2 hours  
**File**: `test/benchmarks/generation-performance.test.js`

**Metrics**:
- Generation time per service type
- Memory usage
- File I/O operations
- Template rendering time

**Targets**:
- Generation time: <5 seconds for full service
- Memory usage: <100MB
- No performance regression vs old implementation

**Acceptance Criteria**:
- [ ] Benchmark suite created
- [ ] All targets met
- [ ] Performance report generated
- [ ] No regressions detected

---

### TODO #31: Create Migration Script
**Priority**: P3 - Tooling  
**Effort**: 3 hours  
**File**: `scripts/migrate-to-modular-generators.js`

**Functionality**:
- Detect old GenerationEngine usage
- Suggest migration path
- Update imports if needed
- Provide compatibility report

**Acceptance Criteria**:
- [ ] Migration script created
- [ ] Detects old patterns
- [ ] Provides clear guidance
- [ ] Tested on sample projects

---

## Summary

**Total TODO Items**: 31  
**Total Estimated Effort**: ~65 hours (1.5-2 weeks with 2 developers)  
**Total Test Coverage**: 300+ new tests  
**Line Reduction**: 2,729 → ~200 lines (92% reduction)  

**Critical Path**:
1. Infrastructure (TODOs #1-4): 5 hours
2. Core Generators (TODOs #5-9): 12 hours
3. Service-Type Generators (TODOs #24-25): 8 hours
4. Integration (TODOs #26-27): 7 hours

**Minimum Viable Refactoring** (can start static-site template):
- Complete TODOs #1-9 (infrastructure + core generators)
- This provides enough foundation to add StaticSiteGenerator cleanly
- Remaining generators can be extracted in parallel

**Priority Order**:
1. **P0 (Critical)**: #1, #2, #3, #4, #26, #27 - Infrastructure & Integration
2. **P1 (High)**: #5, #6, #7, #8, #9, #13, #14, #19, #20, #24, #25 - Core functionality
3. **P2 (Medium)**: #10, #11, #15, #16, #17, #18, #21, #22, #23, #29, #30 - Supporting features
4. **P3 (Low)**: #12, #31 - Nice-to-have

**Success Criteria**:
- ✅ All 562 existing tests passing
- ✅ 300+ new generator tests passing
- ✅ GenerationEngine reduced to ~200 lines
- ✅ Output byte-for-byte identical
- ✅ No performance regression
- ✅ Clean architecture ready for static-site template
