/**
 * ServiceOrchestrator - Unified Three-Tier Service Management
 *
 * Coordinates the three-tier service creation process:
 * 1. Core Input Collection (6 required inputs)
 * 2. Smart Confirmations (15 derived values)
 * 3. Automated Generation (67 configurations + service manifest)
 */

// Modular handler imports
import { InputHandler } from './handlers/InputHandler.js';
import { ConfirmationHandler } from './handlers/ConfirmationHandler.js';
import { GenerationHandler } from './handlers/GenerationHandler.js';
import { WranglerConfigManager } from '../utils/deployment/wrangler-config-manager.js';
import { ValidationHandler } from './handlers/ValidationHandler.js';

// Legacy imports for backward compatibility
import { ErrorTracker } from './ErrorTracker.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export class ServiceOrchestrator {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.outputPath = options.outputPath || '.';
    this.templatePath = options.templatePath || './templates';

    // Initialize modular handler components
    this.inputHandler = new InputHandler({ interactive: this.interactive });
    this.confirmationHandler = new ConfirmationHandler({ interactive: this.interactive });
    this.generationHandler = new GenerationHandler({ 
      outputPath: this.outputPath, 
      templatePath: this.templatePath 
    });
    this.wranglerConfigManager = null; // Initialized when needed with specific config path
    this.validationHandler = new ValidationHandler();

    // Initialize legacy components for backward compatibility
    this.errorTracker = new ErrorTracker();
  }

  /**
   * Run the complete three-tier service creation process interactively
   */
  async runInteractive() {
    console.log(chalk.cyan('🚀 Clodo Framework - Interactive Service Creator'));
    console.log(chalk.white('Welcome to the unified service creation wizard!\n'));

    try {
      // Tier 1: Collect 6 core inputs
      console.log(chalk.yellow('📝 Tier 1: Core Input Collection'));
      console.log(chalk.white('Collecting 6 required inputs for your service...\n'));

      const coreInputs = await this.inputHandler.collectCoreInputs();

      // Tier 2: Smart confirmations for 15 derived values
      const confirmedValues = await this.confirmationHandler.generateAndConfirm(coreInputs);

      // Tier 3: Automated generation of 67 components
      console.log(chalk.yellow('⚙️  Tier 3: Automated Generation'));
      console.log(chalk.white('Generating 67 configuration files and service components...\n'));

      const generationResult = await this.generationHandler.generateService(coreInputs, confirmedValues, {
        outputPath: this.outputPath
      });

      // Display results
      this.displayResults(generationResult);

    } catch (error) {
      throw new Error(`Service creation failed: ${error.message}`);
    }
  }

  /**
   * Run service creation in non-interactive mode with provided inputs
   */
  async runNonInteractive(coreInputs) {
    console.log(chalk.cyan('🚀 Clodo Framework - Non-Interactive Service Creator'));

    try {
      // Validate inputs
      await this.inputHandler.validateCoreInputs(coreInputs);

      // Generate derived values automatically
      const confirmedValues = await this.confirmationHandler.generateAndConfirm(coreInputs);

      // Generate service using GenerationHandler
      const generationResult = await this.generationHandler.generateService(coreInputs, confirmedValues, {
        outputPath: this.outputPath
      });

      console.log(chalk.green(`✓ Service "${coreInputs.serviceName}" created successfully`));

    } catch (error) {
      throw new Error(`Non-interactive service creation failed: ${error.message}`);
    }
  }

  /**
   * Validate an existing service configuration
   */
  async validateService(servicePath, options = {}) {
    // Create ValidationHandler with custom config if provided
    const validationHandler = options.customConfig 
      ? new ValidationHandler({ customConfig: options.customConfig })
      : this.validationHandler;
    
    const result = await validationHandler.validateService(servicePath);

    // Export report if requested
    if (options.exportReport) {
      await this.exportValidationReport(result, options.exportReport);
    }

    return result;
  }

  /**
   * Run comprehensive service diagnostics (delegated to ValidationHandler)
   */
  async diagnoseServiceBasic(servicePath, options = {}) {
    return await this.validationHandler.diagnoseService(servicePath);
  }

  /**
   * Legacy validateService implementation for compatibility
   */
  async _legacyValidateService(servicePath) {
    try {
      const issues = [];

      // Check for required files
      const requiredFiles = [
        'package.json',
        'src/config/domains.js',
        'src/worker/index.js',
        'wrangler.toml'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(servicePath, file);
        try {
          await fs.access(filePath);
        } catch {
          issues.push(`Missing required file: ${file}`);
        }
      }

      // Validate package.json
      try {
        const packageJson = JSON.parse(await fs.readFile(path.join(servicePath, 'package.json'), 'utf8'));
        if (!packageJson.name || !packageJson.version) {
          issues.push('Invalid package.json: missing name or version');
        }
      } catch {
        issues.push('Invalid package.json format');
      }

      // Validate domain configuration
      try {
        const domainConfig = await fs.readFile(path.join(servicePath, 'src/config/domains.js'), 'utf8');
        if (!domainConfig.includes('createDomainConfigSchema')) {
          issues.push('Domain configuration missing Clodo Framework integration');
        }
      } catch {
        issues.push('Cannot read domain configuration');
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      throw new Error(`Service validation failed: ${error.message}`);
    }
  }

  /**
   * Display generation results to user
   */
  displayResults(generationResult) {
    console.log(chalk.green('\n✅ Service Generation Complete!'));

    if (generationResult.serviceManifest) {
      // New GenerationEngine format
      console.log(chalk.white(`Service: ${generationResult.serviceName}`));
      console.log(chalk.white(`Path: ${generationResult.servicePath}`));
      console.log(chalk.white(`Files Generated: ${generationResult.fileCount}`));

      console.log(chalk.cyan('\n📁 Generated Files:'));
      generationResult.generatedFiles.forEach(file => {
        console.log(chalk.white(`  ✓ ${path.relative(process.cwd(), file)}`));
      });

      console.log(chalk.cyan('\n📋 Service Manifest:'));
      console.log(chalk.white(`  Location: clodo-service-manifest.json`));
    } else {
      // Legacy format (for backward compatibility)
      console.log(chalk.white(`Service: ${generationResult.serviceName}`));
      console.log(chalk.white(`Type: ${generationResult.serviceType}`));
      console.log(chalk.white(`Domain: ${generationResult.domainName}`));
      console.log(chalk.white(`Environment: ${generationResult.environment}`));

      console.log(chalk.cyan('\n📁 Generated Files:'));
      generationResult.generatedFiles.forEach(file => {
        console.log(chalk.white(`  ✓ ${file}`));
      });

      console.log(chalk.cyan('\n🔧 Configured Features:'));
      generationResult.features.forEach(feature => {
        console.log(chalk.white(`  ✓ ${feature}`));
      });

      if (generationResult.serviceManifest) {
        console.log(chalk.cyan('\n📋 Service Manifest:'));
        console.log(chalk.white(`  Location: ${generationResult.serviceManifest}`));
      }
    }
  }

  /**
   * Auto-detect service path from current working directory
   */
  async detectServicePath() {
    try {
      // Check if current directory is a service
      const currentDir = process.cwd();
      if (await this.isServiceDirectory(currentDir)) {
        return currentDir;
      }

      // Check parent directories
      let checkDir = path.dirname(currentDir);
      while (checkDir !== path.dirname(checkDir)) { // Stop at root
        if (await this.isServiceDirectory(checkDir)) {
          return checkDir;
        }
        checkDir = path.dirname(checkDir);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a directory is a Clodo service
   */
  async isServiceDirectory(dirPath) {
    try {
      const requiredFiles = ['package.json', 'src/config/domains.js', 'wrangler.toml'];
      for (const file of requiredFiles) {
        await fs.access(path.join(dirPath, file));
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run interactive service update
   */
  async runInteractiveUpdate(servicePath) {
    console.log(chalk.cyan('🔄 Interactive Service Update'));
    console.log(chalk.white(`Updating service at: ${servicePath}\n`));

    // Load current service configuration
    const currentConfig = await this.loadServiceConfiguration(servicePath);

    console.log(chalk.cyan('Current Configuration:'));
    console.log(chalk.white(`  Service: ${currentConfig.serviceName}`));
    console.log(chalk.white(`  Type: ${currentConfig.serviceType}`));
    console.log(chalk.white(`  Domain: ${currentConfig.domainName}`));
    console.log(chalk.white(`  Environment: ${currentConfig.environment}\n`));

    // Interactive update menu
    const updateOptions = {
      1: { name: 'Domain Configuration', action: () => this.updateDomainConfig(servicePath, currentConfig) },
      2: { name: 'Cloudflare Settings', action: () => this.updateCloudflareConfig(servicePath, currentConfig) },
      3: { name: 'Environment Settings', action: () => this.updateEnvironmentConfig(servicePath, currentConfig) },
      4: { name: 'Feature Flags', action: () => this.updateFeatureFlags(servicePath, currentConfig) },
      5: { name: 'Regenerate All Configs', action: () => this.regenerateAllConfigs(servicePath, currentConfig) },
      6: { name: 'Fix Configuration Errors', action: () => this.fixConfigurationErrors(servicePath) }
    };

    for (;;) {
      console.log(chalk.cyan('What would you like to update?'));
      Object.entries(updateOptions).forEach(([key, option]) => {
        console.log(chalk.white(`  ${key}. ${option.name}`));
      });
      console.log(chalk.white('  0. Exit update mode\n'));

      const choice = await this.promptUser('Enter your choice (0-6): ');

      if (choice === '0') {
        break;
      }

      const option = updateOptions[choice];
      if (option) {
        try {
          await option.action();
          console.log(chalk.green(`✓ ${option.name} updated successfully`));
        } catch (error) {
          this.errorTracker.captureError(error, { action: option.name, servicePath });
          console.log(chalk.red(`✗ Failed to update ${option.name}: ${error.message}`));
        }
      } else {
        console.log(chalk.red('Invalid choice. Please select 0-6.'));
      }
    }
  }

  /**
   * Run non-interactive service update
   */
  async runNonInteractiveUpdate(servicePath, options) {
    console.log(chalk.cyan('🔄 Non-Interactive Service Update'));

    const currentConfig = await this.loadServiceConfiguration(servicePath);
    let hasChanges = false;

    try {
      // Update domain if specified
      if (options.domainName) {
        await this.updateDomainConfig(servicePath, currentConfig, { domainName: options.domainName });
        hasChanges = true;
      }

      // Update Cloudflare settings
      if (options.cloudflareToken || options.cloudflareAccountId || options.cloudflareZoneId) {
        const cfUpdates = {};
        if (options.cloudflareToken) cfUpdates.token = options.cloudflareToken;
        if (options.cloudflareAccountId) cfUpdates.accountId = options.cloudflareAccountId;
        if (options.cloudflareZoneId) cfUpdates.zoneId = options.cloudflareZoneId;
        await this.updateCloudflareConfig(servicePath, currentConfig, cfUpdates);
        hasChanges = true;
      }

      // Update environment
      if (options.environment) {
        await this.updateEnvironmentConfig(servicePath, currentConfig, { environment: options.environment });
        hasChanges = true;
      }

      // Update features
      if (options.addFeature || options.removeFeature) {
        const featureUpdates = {};
        if (options.addFeature) featureUpdates.add = options.addFeature;
        if (options.removeFeature) featureUpdates.remove = options.removeFeature;
        await this.updateFeatureFlags(servicePath, currentConfig, featureUpdates);
        hasChanges = true;
      }

      // Regenerate configs if requested
      if (options.regenerateConfigs) {
        await this.regenerateAllConfigs(servicePath, currentConfig);
        hasChanges = true;
      }

      // Fix errors if requested
      if (options.fixErrors) {
        await this.fixConfigurationErrors(servicePath);
        hasChanges = true;
      }

      if (!hasChanges) {
        console.log(chalk.yellow('No update options specified. Use --help to see available options.'));
      }

    } catch (error) {
      this.errorTracker.captureError(error, { options, servicePath });
      throw error;
    }
  }

  /**
   * Load current service configuration
   */
  async loadServiceConfiguration(servicePath) {
    try {
      // Load package.json
      const packageJson = JSON.parse(await fs.readFile(path.join(servicePath, 'package.json'), 'utf8'));

      // Load domain configuration
      const domainConfig = await fs.readFile(path.join(servicePath, 'src/config/domains.js'), 'utf8');

      // Extract configuration from domain config (simplified parsing)
      const config = {
        serviceName: packageJson.name,
        serviceType: this.extractServiceTypeFromConfig(domainConfig),
        domainName: this.extractDomainFromConfig(domainConfig),
        environment: this.extractEnvironmentFromConfig(domainConfig),
        cloudflareAccountId: this.extractCloudflareAccountId(domainConfig),
        cloudflareZoneId: this.extractCloudflareZoneId(domainConfig),
        features: this.extractFeaturesFromConfig(domainConfig)
      };

      return config;
    } catch (error) {
      throw new Error(`Failed to load service configuration: ${error.message}`);
    }
  }

  /**
   * Update domain configuration
   * @deprecated Use WranglerConfigManager directly for wrangler.toml updates
   */
  async updateDomainConfig(servicePath, currentConfig, updates = null) {
    console.log(chalk.yellow('⚠️  updateDomainConfig is deprecated. Use WranglerConfigManager for wrangler.toml updates.'));
    throw new Error('updateDomainConfig is deprecated. Please use WranglerConfigManager directly.');
  }

  /**
   * Update Cloudflare configuration
   * @deprecated Use WranglerConfigManager directly for wrangler.toml updates
   */
  async updateCloudflareConfig(servicePath, currentConfig, updates = null) {
    console.log(chalk.yellow('⚠️  updateCloudflareConfig is deprecated. Use WranglerConfigManager for wrangler.toml updates.'));
    throw new Error('updateCloudflareConfig is deprecated. Please use WranglerConfigManager directly.');
  }

  /**
   * Update environment configuration
   * @deprecated Use WranglerConfigManager directly for wrangler.toml updates
   */
  async updateEnvironmentConfig(servicePath, currentConfig, updates = null) {
    console.log(chalk.yellow('⚠️  updateEnvironmentConfig is deprecated. Use WranglerConfigManager for wrangler.toml updates.'));
    throw new Error('updateEnvironmentConfig is deprecated. Please use WranglerConfigManager directly.');
  }

  /**
   * Update feature flags using ConfigMutator
   */
  async updateFeatureFlags(servicePath, currentConfig, updates = null) {
    return await this.configMutator.updateFeatureConfig(servicePath, currentConfig, updates);
  }

  /**
   * Regenerate all configuration files
   */
  async regenerateAllConfigs(servicePath, currentConfig) {
    console.log(chalk.cyan('Regenerating all configuration files...'));

    // This would call the generation engine to recreate all configs
    // For now, just mark as needing implementation
    console.log(chalk.yellow('⚠️  Config regeneration not yet implemented'));
  }

  /**
   * Fix common configuration errors
   */
  async fixConfigurationErrors(servicePath) {
    console.log(chalk.cyan('Attempting to fix configuration errors...'));

    const issues = await this.validateService(servicePath);
    if (issues.valid) {
      console.log(chalk.green('No issues found to fix'));
      return;
    }

    // Attempt to fix common issues
    for (const issue of issues.issues) {
      try {
        if (issue.includes('Missing required file')) {
          console.log(chalk.yellow(`Cannot auto-fix missing file: ${issue}`));
        } else if (issue.includes('Invalid package.json')) {
          console.log(chalk.yellow(`Cannot auto-fix package.json: ${issue}`));
        } else {
          console.log(chalk.yellow(`Unknown issue, cannot auto-fix: ${issue}`));
        }
      } catch (error) {
        console.log(chalk.red(`Failed to fix issue: ${error.message}`));
      }
    }
  }

  /**
   * Diagnose service issues
   */
  async diagnoseService(servicePath, options = {}) {
    console.log(chalk.cyan('🔍 Running comprehensive service diagnosis...'));

    const diagnosis = {
      serviceName: null,
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Load basic configuration
      const config = await this.loadServiceConfiguration(servicePath);
      diagnosis.serviceName = config.serviceName;

      // Check file structure
      const requiredFiles = [
        'package.json',
        'src/config/domains.js',
        'src/worker/index.js',
        'wrangler.toml'
      ];

      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(servicePath, file));
        } catch {
          diagnosis.errors.push({
            message: `Missing required file: ${file}`,
            location: servicePath,
            suggestion: `Run 'clodo-service update --regenerate-configs' to recreate missing files`
          });
        }
      }

      // Validate package.json
      try {
        const packageJson = JSON.parse(await fs.readFile(path.join(servicePath, 'package.json'), 'utf8'));
        if (!packageJson.name) {
          diagnosis.errors.push({
            message: 'package.json missing name field',
            location: 'package.json',
            suggestion: 'Add a name field to package.json'
          });
        }
      } catch (error) {
        diagnosis.errors.push({
          message: `Invalid package.json: ${error.message}`,
          location: 'package.json',
          suggestion: 'Fix JSON syntax in package.json'
        });
      }

      // Check domain configuration
      try {
        const domainConfig = await fs.readFile(path.join(servicePath, 'src/config/domains.js'), 'utf8');
        if (!domainConfig.includes('createDomainConfigSchema')) {
          diagnosis.warnings.push({
            message: 'Domain configuration may not be using Clodo Framework schema',
            location: 'src/config/domains.js',
            suggestion: 'Ensure domain config uses createDomainConfigSchema from @tamyla/clodo-framework'
          });
        }
      } catch (error) {
        diagnosis.errors.push({
          message: 'Cannot read domain configuration',
          location: 'src/config/domains.js',
          suggestion: 'Check file permissions and syntax'
        });
      }

      // Deep scan if requested
      if (options.deepScan) {
        // Check for common issues
        diagnosis.recommendations.push('Consider running tests to validate service functionality');
        diagnosis.recommendations.push('Check Cloudflare authentication if deployment fails');
        diagnosis.recommendations.push('Verify all dependencies are installed with npm install');
      }

    } catch (error) {
      diagnosis.errors.push({
        message: `Diagnosis failed: ${error.message}`,
        location: 'general',
        suggestion: 'Check service directory structure and permissions'
      });
    }

    return diagnosis;
  }

  /**
   * Export diagnostic report
   */
  async exportDiagnosticReport(diagnosis, filePath) {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      serviceName: diagnosis.serviceName,
      summary: {
        errors: diagnosis.errors.length,
        warnings: diagnosis.warnings.length,
        recommendations: diagnosis.recommendations.length
      },
      errors: diagnosis.errors,
      warnings: diagnosis.warnings,
      recommendations: diagnosis.recommendations
    };

    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');
  }

  /**
   * Export validation report
   */
  async exportValidationReport(validation, filePath) {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      servicePath: validation.servicePath || 'unknown',
      valid: validation.valid,
      summary: {
        issues: validation.issues ? validation.issues.length : 0
      },
      issues: validation.issues || []
    };

    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');
  }

  /**
   * Generate service using legacy ServiceCreator (placeholder for GenerationEngine)
   */
  async generateWithLegacyCreator({ coreInputs, confirmedValues, outputPath, templatePath }) {
    console.log(chalk.gray('Using legacy ServiceCreator for generation...\n'));

    // This would normally use the GenerationEngine, but for now we'll create a basic result
    return {
      serviceName: coreInputs.serviceName,
      serviceType: coreInputs.serviceType,
      domainName: coreInputs.domainName,
      environment: coreInputs.environment,
      generatedFiles: [
        'package.json',
        'src/config/domains.js',
        'src/worker/index.js',
        'wrangler.toml',
        'README.md'
      ],
      features: Object.keys(confirmedValues.features || {}),
      serviceManifest: null // TODO: Generate service manifest
    };
  }

  /**
   * Prompt user for input using shared PromptHandler
   */
  async promptUser(question) {
    if (!this.interactive) {
      return '';
    }
    return await this.confirmationHandler.promptHandler.prompt(question);
  }

  // Helper methods for extracting config values (simplified implementations)
  extractServiceTypeFromConfig(config) { return 'generic'; }
  extractDomainFromConfig(config) { return 'unknown'; }
  extractEnvironmentFromConfig(config) { return 'development'; }
  extractCloudflareAccountId(config) { return null; }
  extractCloudflareZoneId(config) { return null; }
  extractFeaturesFromConfig(config) { return []; }

  /**
   * Escape special regex characters for safe replacement
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
