/**
 * Generation Handler Module
 * Focused module for service generation and file creation
 */

import { GenerationEngine } from '../GenerationEngine.js';

export class GenerationHandler {
  constructor(options = {}) {
    this.outputPath = options.outputPath || '.';
    this.templatePath = options.templatePath || './templates';
    this.generationEngine = new GenerationEngine({
      outputDir: this.outputPath,
      templatesDir: this.templatePath
    });
  }

  /**
   * Generate complete service from inputs and confirmed values
   */
  async generateService(coreInputs, confirmedValues, options = {}) {
    const config = {
      outputPath: this.outputPath,
      ...options
    };

    return await this.generationEngine.generateService(coreInputs, confirmedValues, config);
  }

  /**
   * Generate specific component
   */
  async generateComponent(componentType, config, outputPath) {
    // Delegate to generation engine's specific methods
    switch (componentType) {
      case 'manifest':
        return this.generationEngine.createServiceManifest(
          config.coreInputs, 
          config.confirmedValues, 
          config.generatedFiles || []
        );
      case 'directory':
        return this.generationEngine.createDirectoryStructure(outputPath);
      default:
        throw new Error(`Unknown component type: ${componentType}`);
    }
  }

  /**
   * Validate generation prerequisites
   */
  async validatePrerequisites(coreInputs, confirmedValues) {
    const issues = [];

    // Check required inputs
    if (!coreInputs.serviceName) {
      issues.push('Service name is required');
    }

    if (!coreInputs.serviceType) {
      issues.push('Service type is required');
    }

    // Check output path permissions
    try {
      const fs = await import('fs/promises');
      await fs.access(this.outputPath);
    } catch (error) {
      issues.push(`Output path not accessible: ${this.outputPath}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get generation progress information
   */
  getGenerationStatus() {
    return {
      outputPath: this.outputPath,
      templatePath: this.templatePath,
      ready: true
    };
  }
}