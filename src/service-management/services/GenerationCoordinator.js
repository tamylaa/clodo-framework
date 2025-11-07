/**
 * GenerationCoordinator - Coordinates multi-file generation across different phases
 * 
 * Organizes generation into logical phases (core, service, environment, testing, docs, automation)
 * and coordinates the execution of multiple generators within each phase.
 */
export class GenerationCoordinator {
  /**
   * Create a new coordinator
   * @param {Object} engine - GenerationEngine instance to delegate generator calls to
   */
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Generate all files in the correct order
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateAllFiles(coreInputs, confirmedValues, servicePath) {
    const generatedFiles = [];

    // Core configuration files
    const coreFiles = await this.generateCoreFiles(coreInputs, confirmedValues, servicePath);
    generatedFiles.push(...coreFiles);

    // Service-specific configuration files
    generatedFiles.push(...await this.generateServiceSpecificFiles(coreInputs, confirmedValues, servicePath));

    // Environment and deployment files
    generatedFiles.push(...await this.generateEnvironmentFiles(coreInputs, confirmedValues, servicePath));

    // Testing and quality assurance files
    generatedFiles.push(...await this.generateTestingFiles(coreInputs, confirmedValues, servicePath));

    // Documentation files
    generatedFiles.push(...await this.generateDocumentationFiles(coreInputs, confirmedValues, servicePath));

    // CI/CD and automation files
    generatedFiles.push(...await this.generateAutomationFiles(coreInputs, confirmedValues, servicePath));

    return generatedFiles;
  }

  /**
   * Generate core configuration files (package.json, wrangler.toml, etc.)
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateCoreFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // Generate package.json using PackageJsonGenerator (refactored)
    const packageJsonPath = await this.engine.generatePackageJson(coreInputs, confirmedValues, servicePath);
    files.push(packageJsonPath);

    // Generate wrangler.toml using WranglerTomlGenerator (refactored)
    const wranglerPath = await this.engine.generateWranglerToml(coreInputs, confirmedValues, servicePath);
    files.push(wranglerPath);

    // Generate domains.js using DomainsConfigGenerator (refactored)
    const domainsPath = await this.engine.generateDomainsConfig(coreInputs, confirmedValues, servicePath);
    files.push(domainsPath);

    // Generate worker index using WorkerIndexGenerator (refactored)
    const workerPath = await this.engine.generateWorkerIndex(coreInputs, confirmedValues, servicePath);
    files.push(workerPath);

    // Generate .env.example using EnvExampleGenerator (refactored)
    const envExamplePath = await this.engine.generateEnvExample(coreInputs, confirmedValues, servicePath);
    files.push(envExamplePath);

    return files;
  }

  /**
   * Generate service-specific configuration files
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateServiceSpecificFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // Generate service schema
    const schemaPath = await this.engine.generateServiceSchema(coreInputs, confirmedValues, servicePath);
    files.push(schemaPath);

    // Generate service handlers
    const handlersPath = await this.engine.generateServiceHandlers(coreInputs, confirmedValues, servicePath);
    files.push(handlersPath);

    // Generate service middleware
    const middlewarePath = await this.engine.generateServiceMiddleware(coreInputs, confirmedValues, servicePath);
    files.push(middlewarePath);

    // Generate service utils
    const utilsPath = await this.engine.generateServiceUtils(coreInputs, confirmedValues, servicePath);
    files.push(utilsPath);

    return files;
  }

  /**
   * Generate environment and deployment files
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateEnvironmentFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // scripts/deploy.ps1
    files.push(await this.engine.generateDeployScript(coreInputs, confirmedValues, servicePath));

    // scripts/setup.ps1
    files.push(await this.engine.generateSetupScript(coreInputs, confirmedValues, servicePath));

    // scripts/health-check.ps1
    files.push(await this.engine.generateHealthCheckScript(coreInputs, confirmedValues, servicePath));

    // config/production.env
    files.push(await this.engine.generateProductionEnv(coreInputs, confirmedValues, servicePath));

    // config/staging.env
    files.push(await this.engine.generateStagingEnv(coreInputs, confirmedValues, servicePath));

    // config/development.env
    files.push(await this.engine.generateDevelopmentEnv(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate testing and quality assurance files
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateTestingFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // test/unit/service.test.js
    files.push(await this.engine.generateUnitTests(coreInputs, confirmedValues, servicePath));

    // test/integration/service.integration.test.js
    files.push(await this.engine.generateIntegrationTests(coreInputs, confirmedValues, servicePath));

    // jest.config.js
    files.push(await this.engine.generateJestConfig(coreInputs, confirmedValues, servicePath));

    // .eslintrc.js
    files.push(await this.engine.generateEslintConfig(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate documentation files
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateDocumentationFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // README.md
    files.push(await this.engine.generateReadme(coreInputs, confirmedValues, servicePath));

    // docs/API.md
    files.push(await this.engine.generateApiDocs(coreInputs, confirmedValues, servicePath));

    // docs/DEPLOYMENT.md
    files.push(await this.engine.generateDeploymentDocs(coreInputs, confirmedValues, servicePath));

    // docs/CONFIGURATION.md
    files.push(await this.engine.generateConfigurationDocs(coreInputs, confirmedValues, servicePath));

    return files;
  }

  /**
   * Generate automation and CI/CD files
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {string} servicePath - Target service path
   * @returns {Promise<string[]>} - Array of generated file paths
   */
  async generateAutomationFiles(coreInputs, confirmedValues, servicePath) {
    const files = [];

    // .github/workflows/ci.yml
    files.push(await this.engine.generateCiWorkflow(coreInputs, confirmedValues, servicePath));

    // .github/workflows/deploy.yml
    files.push(await this.engine.generateDeployWorkflow(coreInputs, confirmedValues, servicePath));

    // .gitignore
    files.push(await this.engine.generateGitignore(coreInputs, confirmedValues, servicePath));

    // docker-compose.yml (for local development)
    files.push(await this.engine.generateDockerCompose(coreInputs, confirmedValues, servicePath));

    return files;
  }
}

