/**
 * GeneratorRegistry - Manages generator instantiation and registration
 *
 * Provides centralized generator management with automatic instantiation,
 * dependency injection, and configuration management.
 */

import { RouteGenerator } from '../routing/RouteGenerator.js';
import { PackageJsonGenerator } from '../generators/core/PackageJsonGenerator.js';
import { SiteConfigGenerator } from '../generators/core/SiteConfigGenerator.js';
import { WranglerTomlGenerator } from '../generators/config/WranglerTomlGenerator.js';
import { DomainsConfigGenerator } from '../generators/config/DomainsConfigGenerator.js';
import { WorkerIndexGenerator } from '../generators/code/WorkerIndexGenerator.js';
import { ServiceHandlersGenerator } from '../generators/code/ServiceHandlersGenerator.js';
import { ServiceMiddlewareGenerator } from '../generators/code/ServiceMiddlewareGenerator.js';
import { ServiceUtilsGenerator } from '../generators/code/ServiceUtilsGenerator.js';
import { EnvExampleGenerator } from '../generators/config/EnvExampleGenerator.js';
import { ProductionEnvGenerator } from '../generators/config/ProductionEnvGenerator.js';
import { StagingEnvGenerator } from '../generators/config/StagingEnvGenerator.js';
import { DevelopmentEnvGenerator } from '../generators/config/DevelopmentEnvGenerator.js';
import { ServiceSchemaGenerator } from '../generators/schemas/ServiceSchemaGenerator.js';
import { DeployScriptGenerator } from '../generators/scripts/DeployScriptGenerator.js';
import { SetupScriptGenerator } from '../generators/scripts/SetupScriptGenerator.js';
import { HealthCheckScriptGenerator } from '../generators/scripts/HealthCheckScriptGenerator.js';
import { UnitTestsGenerator } from '../generators/testing/UnitTestsGenerator.js';
import { IntegrationTestsGenerator } from '../generators/testing/IntegrationTestsGenerator.js';
import { JestConfigGenerator } from '../generators/testing/JestConfigGenerator.js';
import { EslintConfigGenerator } from '../generators/testing/EslintConfigGenerator.js';
import { ReadmeGenerator } from '../generators/documentation/ReadmeGenerator.js';
import { ApiDocsGenerator } from '../generators/documentation/ApiDocsGenerator.js';
import { DeploymentDocsGenerator } from '../generators/documentation/DeploymentDocsGenerator.js';
import { ConfigurationDocsGenerator } from '../generators/documentation/ConfigurationDocsGenerator.js';
import { CiWorkflowGenerator } from '../generators/cicd/CiWorkflowGenerator.js';
import { DeployWorkflowGenerator } from '../generators/cicd/DeployWorkflowGenerator.js';
import { GitignoreGenerator } from '../generators/tooling/GitignoreGenerator.js';
import { DockerComposeGenerator } from '../generators/tooling/DockerComposeGenerator.js';
import { StaticSiteGenerator } from '../generators/service-types/StaticSiteGenerator.js';
import { join } from 'path';

export class GeneratorRegistry {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir;
    this.outputDir = options.outputDir;
    this.generators = new Map();
    this.options = options;

    this.initializeGenerators();
  }

  /**
   * Initialize all generators with proper dependencies
   */
  initializeGenerators() {
    // Core generators (no dependencies)
    this.register('routeGenerator', () => new RouteGenerator());
    this.register('siteConfigGenerator', () => new SiteConfigGenerator({
      templatesDir: this.templatesDir,
      outputDir: this.outputDir
    }));

    // Service-type generators
    this.register('staticSiteGenerator', () => new StaticSiteGenerator({
      templatesDir: join(this.templatesDir, 'static-site'),
      outputDir: this.outputDir
    }));

    // Generators with standard config
    const standardGenerators = [
      'packageJsonGenerator', 'wranglerTomlGenerator', 'domainsConfigGenerator',
      'workerIndexGenerator', 'serviceHandlersGenerator', 'serviceMiddlewareGenerator',
      'serviceUtilsGenerator', 'envExampleGenerator', 'productionEnvGenerator',
      'stagingEnvGenerator', 'developmentEnvGenerator', 'serviceSchemaGenerator',
      'deployScriptGenerator', 'setupScriptGenerator', 'healthCheckScriptGenerator',
      'unitTestsGenerator', 'integrationTestsGenerator', 'jestConfigGenerator',
      'eslintConfigGenerator', 'readmeGenerator', 'apiDocsGenerator',
      'deploymentDocsGenerator', 'configurationDocsGenerator', 'ciWorkflowGenerator',
      'deployWorkflowGenerator', 'gitignoreGenerator', 'dockerComposeGenerator'
    ];

    standardGenerators.forEach(name => {
      this.register(name, () => this.createStandardGenerator(name));
    });

    // Special generators with dependencies
    this.register('wranglerTomlGenerator', () => new WranglerTomlGenerator({
      templatesDir: this.templatesDir,
      outputDir: this.outputDir,
      routeGenerator: this.get('routeGenerator'),
      siteConfigGenerator: this.get('siteConfigGenerator')
    }));
  }

  /**
   * Register a generator factory function
   * @param {string} name - Generator name
   * @param {Function} factory - Factory function that returns generator instance
   */
  register(name, factory) {
    this.generators.set(name, factory);
  }

  /**
   * Get a generator instance (lazy instantiation)
   * @param {string} name - Generator name
   * @returns {*} - Generator instance
   */
  get(name) {
    const factory = this.generators.get(name);
    if (!factory) {
      throw new Error(`Generator '${name}' not registered`);
    }

    // If factory returns a function, call it to get instance
    const instance = typeof factory === 'function' ? factory() : factory;

    // Cache the instance for future use
    this.generators.set(name, instance);

    return instance;
  }

  /**
   * Create a standard generator with default configuration
   * @param {string} className - Generator class name
   * @returns {*} - Generator instance
   */
  createStandardGenerator(className) {
    // Convert camelCase to PascalCase for class name
    const pascalCase = className.charAt(0).toUpperCase() + className.slice(1);

    // Import all generator classes (this would be handled by the module system)
    const generatorClasses = {
      PackageJsonGenerator, SiteConfigGenerator, WranglerTomlGenerator, DomainsConfigGenerator,
      WorkerIndexGenerator, ServiceHandlersGenerator, ServiceMiddlewareGenerator, ServiceUtilsGenerator,
      EnvExampleGenerator, ProductionEnvGenerator, StagingEnvGenerator, DevelopmentEnvGenerator,
      ServiceSchemaGenerator, DeployScriptGenerator, SetupScriptGenerator, HealthCheckScriptGenerator,
      UnitTestsGenerator, IntegrationTestsGenerator, JestConfigGenerator, EslintConfigGenerator,
      ReadmeGenerator, ApiDocsGenerator, DeploymentDocsGenerator, ConfigurationDocsGenerator,
      CiWorkflowGenerator, DeployWorkflowGenerator, GitignoreGenerator, DockerComposeGenerator
    };

    const GeneratorClass = generatorClasses[pascalCase];
    if (!GeneratorClass) {
      throw new Error(`Unknown generator class: ${pascalCase}`);
    }

    return new GeneratorClass({
      templatesDir: this.templatesDir,
      outputDir: this.outputDir
    });
  }

  /**
   * Get all registered generator names
   * @returns {string[]} - Array of generator names
   */
  getRegisteredNames() {
    return Array.from(this.generators.keys());
  }

  /**
   * Check if a generator is registered
   * @param {string} name - Generator name
   * @returns {boolean} - True if registered
   */
  has(name) {
    return this.generators.has(name);
  }
}