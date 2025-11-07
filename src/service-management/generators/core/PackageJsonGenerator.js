/**
 * PackageJsonGenerator - Generates package.json for services
 * 
 * Creates a complete package.json with service-type specific dependencies,
 * scripts for development/testing/deployment, and proper metadata.
 */
import { BaseGenerator } from '../BaseGenerator.js';

export class PackageJsonGenerator extends BaseGenerator {
  /**
   * Create a new PackageJsonGenerator instance
   * @param {Object} options - Generator options
   */
  constructor(options = {}) {
    super({
      name: 'PackageJsonGenerator',
      ...options
    });
  }

  /**
   * Generate package.json file
   * 
   * Supports two calling conventions for backward compatibility:
   * 1. New: context = { coreInputs: {...}, confirmedValues: {...} }
   * 2. Merged: context = { ...coreInputs, ...confirmedValues }
   * 
   * @param {Object} context - Generation context
   * @param {Object} context.coreInputs - Core service inputs (serviceType, etc.) [new convention]
   * @param {Object} context.confirmedValues - Confirmed user values (packageName, version, etc.) [new convention]
   * @returns {Promise<void>}
   */
  async generate(context) {
    this.setContext(context);

    // Support both calling conventions
    // New: { coreInputs: {...}, confirmedValues: {...} }
    // Merged: { serviceName, serviceType, packageName, version, ... }
    let coreInputs, confirmedValues;
    
    if (context.coreInputs || context.confirmedValues) {
      // New convention - use separate objects (with defaults for missing ones)
      coreInputs = context.coreInputs || {};
      confirmedValues = context.confirmedValues || {};
    } else {
      // Merged convention - extract from flat context
      coreInputs = {
        serviceName: context.serviceName,
        serviceType: context.serviceType,
        domainName: context.domainName,
        cloudflareAccountId: context.cloudflareAccountId,
        cloudflareZoneId: context.cloudflareZoneId,
        environment: context.environment
      };
      confirmedValues = {
        packageName: context.packageName,
        version: context.version,
        description: context.description,
        author: context.author,
        displayName: context.displayName,
        gitRepositoryUrl: context.gitRepositoryUrl,
        workerName: context.workerName,
        databaseName: context.databaseName,
        apiBasePath: context.apiBasePath,
        healthCheckPath: context.healthCheckPath,
        productionUrl: context.productionUrl,
        stagingUrl: context.stagingUrl,
        developmentUrl: context.developmentUrl,
        features: context.features,
        keywords: context.keywords
      };
    }

    if (!coreInputs || !confirmedValues) {
      throw new Error('PackageJsonGenerator requires service configuration in context');
    }

    const packageJson = this.buildPackageJson(coreInputs, confirmedValues);
    const content = JSON.stringify(packageJson, null, 2);

    await this.writeFile('package.json', content);
  }

  /**
   * Build the package.json object
   * @param {Object} coreInputs - Core service inputs
   * @param {Object} confirmedValues - Confirmed user values
   * @returns {Object} - Package.json object
   */
  buildPackageJson(coreInputs, confirmedValues) {
    return {
      name: confirmedValues.packageName,
      version: confirmedValues.version || '1.0.0',
      description: confirmedValues.description || `Clodo Framework ${coreInputs.serviceType} service`,
      main: 'src/worker/index.js',
      type: 'module',
      scripts: this.buildScripts(coreInputs),
      dependencies: this.buildDependencies(coreInputs),
      devDependencies: this.buildDevDependencies(coreInputs),
      author: confirmedValues.author,  // Match original - can be undefined
      license: confirmedValues.license || 'MIT',
      repository: this.buildRepository(confirmedValues),
      keywords: this.buildKeywords(coreInputs, confirmedValues),
      engines: {
        node: '>=18.0.0'
      }
    };
  }

  /**
   * Build npm scripts section
   * @param {Object} coreInputs - Core service inputs
   * @returns {Object} - Scripts object
   */
  buildScripts(coreInputs) {
    const scripts = {
      // Development
      dev: 'wrangler dev',

      // Testing
      test: 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage',

      // Deployment (cross-platform via framework)
      deploy: 'clodo-service deploy',
      'deploy:dev': 'node scripts/deploy.js development',
      'deploy:staging': 'node scripts/deploy.js staging',
      'deploy:prod': 'node scripts/deploy.js production',

      // Code Quality
      lint: 'eslint src/ test/',
      'lint:fix': 'eslint src/ test/ --fix',
      format: 'prettier --write src/ test/',

      // Utilities
      validate: 'clodo-service validate .',
      diagnose: 'clodo-service diagnose .',
      build: 'wrangler deploy --dry-run',
      clean: 'rimraf dist/ coverage/'
    };

    // Add service-type specific scripts
    if (coreInputs.serviceType === 'static-site') {
      scripts['build:assets'] = 'echo "Add your static asset build command here"';
      scripts['preview'] = 'wrangler dev --local';
    }

    return scripts;
  }

  /**
   * Build production dependencies
   * 
   * NOTE: UUID is included for all service types to match original GenerationEngine behavior.
   * While not all services may need it, it's a small dependency and many services use it for
   * request tracking, correlation IDs, or other purposes.
   * 
   * @param {Object} coreInputs - Core service inputs
   * @returns {Object} - Dependencies object
   */
  buildDependencies(coreInputs) {
    const dependencies = {
      '@tamyla/clodo-framework': '^3.0.15',
      uuid: '^13.0.0', // Always included (matches original GenerationEngine behavior)
      wrangler: '^3.0.0'
    };

    // Service-type specific additional dependencies
    switch (coreInputs.serviceType) {
      case 'auth':
        dependencies.bcrypt = '^5.1.0'; // For password hashing
        break;

      case 'static-site':
        dependencies['mime-types'] = '^2.1.35'; // For MIME type detection
        break;

      // data, content, api-gateway, generic: uuid is already included above
      default:
        break;
    }

    return dependencies;
  }

  /**
   * Build development dependencies
   * @param {Object} coreInputs - Core service inputs
   * @returns {Object} - DevDependencies object
   */
  buildDevDependencies(coreInputs) {
    const devDependencies = {
      '@types/jest': '^29.5.0',
      '@types/node': '^20.0.0',
      eslint: '^8.54.0',
      jest: '^29.7.0',
      prettier: '^3.1.0',
      rimraf: '^5.0.0'
    };

    // Add service-type specific dev dependencies
    if (coreInputs.serviceType === 'static-site') {
      devDependencies['@types/mime-types'] = '^2.1.1';
    }

    return devDependencies;
  }

  /**
   * Build repository configuration
   * @param {Object} confirmedValues - Confirmed user values
   * @returns {Object|undefined} - Repository object or undefined
   */
  buildRepository(confirmedValues) {
    if (!confirmedValues.gitRepositoryUrl) {
      return undefined;
    }

    return {
      type: 'git',
      url: confirmedValues.gitRepositoryUrl
    };
  }

  /**
   * Build keywords array
   * Matches original GenerationEngine behavior exactly
   * @param {Object} coreInputs - Core service inputs
   * @param {Object} confirmedValues - Confirmed user values
   * @returns {string[]} - Keywords array
   */
  buildKeywords(coreInputs, confirmedValues) {
    const keywords = [
      'clodo-framework',
      coreInputs.serviceType,
      'cloudflare',
      'serverless'
      // Note: 'workers' removed to match original GenerationEngine
    ];

    // Add custom keywords if provided
    if (confirmedValues.keywords && Array.isArray(confirmedValues.keywords)) {
      keywords.push(...confirmedValues.keywords);
    }

    return keywords;
  }

  /**
   * Determine if this generator should run
   * @param {Object} context - Generation context
   * @returns {boolean} - True if should generate
   */
  shouldGenerate(context) {
    // Always generate package.json for all service types
    return true;
  }
}

export default PackageJsonGenerator;

