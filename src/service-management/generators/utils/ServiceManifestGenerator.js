import { relative } from 'path';

/**
 * Service Manifest Generator
 * Creates service manifests with metadata, file categorization, and checksums
 */
export class ServiceManifestGenerator {
  /**
   * Create a service manifest
   * @param {Object} coreInputs - Core service configuration
   * @param {Object} confirmedValues - User-confirmed values
   * @param {Array<string>} generatedFiles - List of generated file paths
   * @returns {Object} Service manifest
   */
  createManifest(coreInputs, confirmedValues, generatedFiles) {
    // Derive explicit top-level feature booleans for quick manifest checks (e.g., D1/KV/R2)
    const features = confirmedValues.features || {};

    return {
      manifestVersion: '1.0.0',
      frameworkVersion: '3.0.0',
      generatedAt: new Date().toISOString(),
      // Top-level feature flags for ConfigurationValidator compatibility
      d1: !!features.d1,
      // kv may be represented via a provider flag (e.g., upstash) - accept either
      kv: !!(features.kv || features.upstash),
      r2: !!features.r2,
      service: {
        name: coreInputs.serviceName,
        displayName: confirmedValues.displayName,
        description: confirmedValues.description,
        type: coreInputs.serviceType,
        version: confirmedValues.version,
        author: confirmedValues.author
      },
      configuration: {
        coreInputs,
        confirmedValues,
        urls: {
          production: confirmedValues.productionUrl,
          staging: confirmedValues.stagingUrl,
          development: confirmedValues.developmentUrl,
          documentation: confirmedValues.documentationUrl
        },
        api: {
          basePath: confirmedValues.apiBasePath,
          healthCheckPath: confirmedValues.healthCheckPath
        },
        cloudflare: {
          accountId: coreInputs.cloudflareAccountId,
          zoneId: coreInputs.cloudflareZoneId,
          workerName: confirmedValues.workerName,
          databaseName: confirmedValues.databaseName
        },
        features: confirmedValues.features
      },
      files: {
        total: generatedFiles.length,
        list: generatedFiles.map(file => relative(process.cwd(), file)),
        byCategory: this.categorizeFiles(generatedFiles)
      },
      metadata: {
        generationEngine: 'GenerationEngine v1.0.0',
        tier: 'Tier 3 - Automated Generation',
        checksum: this.generateChecksum(generatedFiles)
      }
    };
  }

  /**
   * Categorize generated files by type
   * @param {Array<string>} files - List of file paths
   * @returns {Object} Categorized files
   */
  categorizeFiles(files) {
    const categories = {
      core: [],
      service: [],
      environment: [],
      testing: [],
      documentation: [],
      automation: []
    };

    files.forEach(file => {
      const relativePath = relative(process.cwd(), file);
      if (relativePath.includes('package.json') || relativePath.includes('wrangler.toml') || relativePath.includes('.env')) {
        categories.core.push(relativePath);
      } else if (relativePath.includes('src/')) {
        categories.service.push(relativePath);
      } else if (relativePath.includes('config/') || relativePath.includes('scripts/')) {
        categories.environment.push(relativePath);
      } else if (relativePath.includes('test/') || relativePath.includes('jest.config.js') || relativePath.includes('.eslintrc.js')) {
        categories.testing.push(relativePath);
      } else if (relativePath.includes('docs/') || relativePath.includes('README.md')) {
        categories.documentation.push(relativePath);
      } else if (relativePath.includes('.github/') || relativePath.includes('.gitignore') || relativePath.includes('docker-compose.yml')) {
        categories.automation.push(relativePath);
      }
    });

    return categories;
  }

  /**
   * Generate checksum for file verification
   * @param {Array<string>} files - List of file paths
   * @returns {string} Hexadecimal checksum
   */
  generateChecksum(files) {
    // Simple checksum based on file count and names
    const fileString = files.map(f => relative(process.cwd(), f)).sort().join('');
    let hash = 0;
    for (let i = 0; i < fileString.length; i++) {
      const char = fileString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

