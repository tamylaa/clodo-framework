/**
 * GenerationEngine - Tier 3: Automated Generation
 *
 * Takes the 6 core inputs and 15 confirmed values to automatically generate
 * 67+ configuration files and components for a complete Clodo Framework service.
 *
 * Core Inputs (6):
 * 1. Service Name
 * 2. Service Type
 * 3. Domain Name
 * 4. Cloudflare Token
 * 5. Cloudflare Account ID
 * 6. Cloudflare Zone ID
 * 7. Environment
 *
 * Confirmed Values (15):
 * 1. Display Name
 * 2. Description
 * 3. Version
 * 4. Author
 * 5. Production URL
 * 6. Staging URL
 * 7. Development URL
 * 8. Features Configuration
 * 9. Database Name
 * 10. Worker Name
 * 11. Package Name
 * 12. Git Repository URL
 * 13. Documentation URL
 * 14. Health Check Path
 * 15. API Base Path
 */

import { ServiceManifestGenerator } from './generators/utils/ServiceManifestGenerator.js';
import { DirectoryStructureService } from './services/DirectoryStructureService.js';
import { GenerationCoordinator } from './services/GenerationCoordinator.js';
import { GeneratorRegistry } from './services/GeneratorRegistry.js';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __dirname = (() => {
  try {
    const filename = fileURLToPath(import.meta.url);
    return dirname(filename);
  } catch (error) {
    // Fallback for test environments - use current working directory
    return process.cwd();
  }
})();

export class GenerationEngine {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || join(__dirname, '..', '..', 'templates');
    this.outputDir = options.outputDir || process.cwd();
    this.force = options.force || false;
    // Default middleware strategy: 'contract' (can be overridden per-generation)
    this.middlewareStrategy = options.middlewareStrategy || 'contract';

    // Initialize generator registry for centralized management
    this.generatorRegistry = new GeneratorRegistry({
      templatesDir: this.templatesDir,
      outputDir: this.outputDir
    });

    // Utility services
    this.serviceManifestGenerator = new ServiceManifestGenerator();
    this.directoryStructureService = new DirectoryStructureService();
    this.generationCoordinator = new GenerationCoordinator(this);

    // Initialize dynamic proxy methods
    this.initializeProxyMethods();
  }

  // Generator getters (lazy instantiation via registry)
  get routeGenerator() { return this.generatorRegistry.get('routeGenerator'); }
  get packageJsonGenerator() { return this.generatorRegistry.get('packageJsonGenerator'); }
  get siteConfigGenerator() { return this.generatorRegistry.get('siteConfigGenerator'); }
  get staticSiteGenerator() { return this.generatorRegistry.get('staticSiteGenerator'); }
  get wranglerTomlGenerator() { return this.generatorRegistry.get('wranglerTomlGenerator'); }
  get domainsConfigGenerator() { return this.generatorRegistry.get('domainsConfigGenerator'); }
  get workerIndexGenerator() { return this.generatorRegistry.get('workerIndexGenerator'); }
  get serviceHandlersGenerator() { return this.generatorRegistry.get('serviceHandlersGenerator'); }
  get serviceMiddlewareGenerator() { return this.generatorRegistry.get('serviceMiddlewareGenerator'); }
  get serviceUtilsGenerator() { return this.generatorRegistry.get('serviceUtilsGenerator'); }
  get envExampleGenerator() { return this.generatorRegistry.get('envExampleGenerator'); }
  get productionEnvGenerator() { return this.generatorRegistry.get('productionEnvGenerator'); }
  get stagingEnvGenerator() { return this.generatorRegistry.get('stagingEnvGenerator'); }
  get developmentEnvGenerator() { return this.generatorRegistry.get('developmentEnvGenerator'); }
  get serviceSchemaGenerator() { return this.generatorRegistry.get('serviceSchemaGenerator'); }
  get deployScriptGenerator() { return this.generatorRegistry.get('deployScriptGenerator'); }
  get setupScriptGenerator() { return this.generatorRegistry.get('setupScriptGenerator'); }
  get healthCheckScriptGenerator() { return this.generatorRegistry.get('healthCheckScriptGenerator'); }
  get unitTestsGenerator() { return this.generatorRegistry.get('unitTestsGenerator'); }
  get integrationTestsGenerator() { return this.generatorRegistry.get('integrationTestsGenerator'); }
  get jestConfigGenerator() { return this.generatorRegistry.get('jestConfigGenerator'); }
  get eslintConfigGenerator() { return this.generatorRegistry.get('eslintConfigGenerator'); }
  get readmeGenerator() { return this.generatorRegistry.get('readmeGenerator'); }
  get apiDocsGenerator() { return this.generatorRegistry.get('apiDocsGenerator'); }
  get deploymentDocsGenerator() { return this.generatorRegistry.get('deploymentDocsGenerator'); }
  get configurationDocsGenerator() { return this.generatorRegistry.get('configurationDocsGenerator'); }
  get ciWorkflowGenerator() { return this.generatorRegistry.get('ciWorkflowGenerator'); }
  get deployWorkflowGenerator() { return this.generatorRegistry.get('deployWorkflowGenerator'); }
  get gitignoreGenerator() { return this.generatorRegistry.get('gitignoreGenerator'); }
  get dockerComposeGenerator() { return this.generatorRegistry.get('dockerComposeGenerator'); }

  // Dynamic proxy methods initialization (replaces ~300 lines of individual methods)
  initializeProxyMethods() {
    const generatorMappings = {
      generatePackageJson: { generator: 'packageJsonGenerator', returnPath: 'package.json' },
      generateSiteConfig: { generator: 'siteConfigGenerator', returnContent: true },
      generateStaticSite: { generator: 'staticSiteGenerator' },
      generateWranglerToml: { generator: 'wranglerTomlGenerator', returnPath: 'wrangler.toml' },
      generateDomainsConfig: { generator: 'domainsConfigGenerator', returnPath: 'config/domains.js' },
      generateWorkerIndex: { generator: 'workerIndexGenerator', returnPath: 'src/index.js' },
      generateServiceHandlers: { generator: 'serviceHandlersGenerator', returnPath: 'src/handlers.js' },
      generateServiceMiddleware: { generator: 'serviceMiddlewareGenerator', returnPath: 'src/middleware/service-middleware.js' },
      generateServiceUtils: { generator: 'serviceUtilsGenerator', returnPath: 'src/utils.js' },
      generateEnvExample: { generator: 'envExampleGenerator', returnPath: '.env.example' },
      generateProductionEnv: { generator: 'productionEnvGenerator', returnPath: '.env.production' },
      generateStagingEnv: { generator: 'stagingEnvGenerator', returnPath: '.env.staging' },
      generateDevelopmentEnv: { generator: 'developmentEnvGenerator', returnPath: '.env.development' },
      generateServiceSchema: { generator: 'serviceSchemaGenerator', returnPath: 'config/schema.json' },
      generateDeployScript: { generator: 'deployScriptGenerator', returnPath: 'scripts/deploy.sh' },
      generateSetupScript: { generator: 'setupScriptGenerator', returnPath: 'scripts/setup.sh' },
      generateHealthCheckScript: { generator: 'healthCheckScriptGenerator', returnPath: 'scripts/health-check.js' },
      generateUnitTests: { generator: 'unitTestsGenerator', returnPath: 'test/unit.test.js' },
      generateIntegrationTests: { generator: 'integrationTestsGenerator', returnPath: 'test/integration.test.js' },
      generateJestConfig: { generator: 'jestConfigGenerator', returnPath: 'jest.config.js' },
      generateEslintConfig: { generator: 'eslintConfigGenerator', returnPath: 'eslint.config.js' },
      generateReadme: { generator: 'readmeGenerator', returnPath: 'README.md' },
      generateApiDocs: { generator: 'apiDocsGenerator', returnPath: 'docs/api.md' },
      generateDeploymentDocs: { generator: 'deploymentDocsGenerator', returnPath: 'docs/deployment.md' },
      generateConfigurationDocs: { generator: 'configurationDocsGenerator', returnPath: 'docs/configuration.md' },
      generateCiWorkflow: { generator: 'ciWorkflowGenerator', returnPath: '.github/workflows/ci.yml' },
      generateDeployWorkflow: { generator: 'deployWorkflowGenerator', returnPath: '.github/workflows/deploy.yml' },
      generateGitignore: { generator: 'gitignoreGenerator', returnPath: '.gitignore' },
      generateDockerCompose: { generator: 'dockerComposeGenerator', returnPath: 'docker-compose.yml' }
    };

    Object.entries(generatorMappings).forEach(([methodName, config]) => {
      // Only create proxy method if it doesn't already exist
      if (!this[methodName]) {
        this[methodName] = async function(...args) {
          // Allow per-call overrides (apply BEFORE building context so context picks it up)
          if (args[0] && args[0].middlewareStrategy) this.middlewareStrategy = args[0].middlewareStrategy;

          const context = this.buildContext(methodName, ...args);
          const generator = this[config.generator];
          const result = await generator.generate(context);

          // Return content for methods that return content, otherwise return file path
          if (config.returnContent) {
            return result;
          } else if (config.returnPath) {
            const servicePath = args[2] || args[0]?.servicePath || this.outputDir;
            return join(servicePath, config.returnPath);
          } else {
            // For methods that don't return specific content or paths, return the service path
            return args[2] || args[0]?.servicePath || this.outputDir;
          }
        };
      }
    });
  }

  // Context builder for proxy methods
  buildContext(methodName, ...args) {
    // Special handling for generateSiteConfig
    if (methodName === 'generateSiteConfig') {
      return { coreInputs: { serviceType: args[0] }, siteConfig: args[1] || {} };
    }

    // For most methods: (coreInputs, confirmedValues, servicePath)
    // Include middlewareStrategy so generators can adapt their output
    return { coreInputs: args[0], confirmedValues: args[1], servicePath: args[2], middlewareStrategy: this.middlewareStrategy };
  }

  /**
   * Generate complete service from core inputs and confirmed values
   */

  /**
   * Generate complete service from core inputs and confirmed values
   */
  async generateService(coreInputs, confirmedValues, options = {}) {
    const config = {
      outputPath: this.outputDir,
      ...options
    };

    // Allow per-generation override of middleware strategy
    if (config.middlewareStrategy) {
      this.middlewareStrategy = config.middlewareStrategy;
    }

    console.log('⚙️  Tier 3: Automated Generation');
    console.log('Generating 67+ configuration files and service components...\n');

    try {
      const servicePath = join(config.outputPath, coreInputs.serviceName);

      // Create service directory structure
      this.createDirectoryStructure(servicePath);

      // Generate all configuration files
      const generatedFiles = await this.generateAllFiles(coreInputs, confirmedValues, servicePath);

      // Create service manifest
      const serviceManifest = this.createServiceManifest(coreInputs, confirmedValues, generatedFiles);

      // Write service manifest
      const manifestPath = join(servicePath, 'clodo-service-manifest.json');
      writeFileSync(manifestPath, JSON.stringify(serviceManifest, null, 2), 'utf8');
      generatedFiles.push(manifestPath);

      console.log(`✅ Generated ${generatedFiles.length} files successfully`);
      console.log(`📋 Service manifest created: clodo-service-manifest.json`);

      return {
        success: true,
        serviceName: coreInputs.serviceName,
        servicePath,
        generatedFiles,
        serviceManifest,
        fileCount: generatedFiles.length
      };

    } catch (error) {
      console.error(`❌ Generation failed: ${error.message}`);
      throw new Error(`Service generation failed: ${error.message}`);
    }
  }

  /**
   * Create the complete directory structure
   */
  createDirectoryStructure(servicePath) {
    return this.directoryStructureService.createStandardStructure(servicePath);
  }

  /**
   * Generate all configuration files
   */
  async generateAllFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateAllFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Generate core configuration files (package.json, wrangler.toml, etc.)
   */
  async generateCoreFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateCoreFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Generate service-specific configuration files
   */
  async generateServiceSpecificFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateServiceSpecificFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Generate environment and deployment files
   */
  async generateEnvironmentFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateEnvironmentFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Generate testing and quality assurance files
   */
  async generateTestingFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateTestingFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Generate documentation files
   */
  async generateDocumentationFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateDocumentationFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Generate automation and CI/CD files
   */
  async generateAutomationFiles(coreInputs, confirmedValues, servicePath) {
    return await this.generationCoordinator.generateAutomationFiles(coreInputs, confirmedValues, servicePath);
  }

  /**
   * Create service manifest
   */
  createServiceManifest(coreInputs, confirmedValues, generatedFiles) {
    return this.serviceManifestGenerator.createManifest(coreInputs, confirmedValues, generatedFiles);
  }

  /**
   * Categorize generated files
   */
  categorizeFiles(files) {
    return this.serviceManifestGenerator.categorizeFiles(files);
  }

  /**
   * Generate checksum for verification
   */
  generateChecksum(files) {
    return this.serviceManifestGenerator.generateChecksum(files);
  }
}
