/**
 * Manifest Loader - Flexible service manifest detection and loading
 * 
 * Supports:
 * - Clodo Framework generated manifests (service-manifest.json)
 * - Legacy services (wrangler.toml + package.json)
 * - Custom manifest locations
 * - Environment variable overrides
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { CloudflareServiceValidator } from './cloudflare-service-validator.js';

/**
 * Possible manifest locations (in order of priority)
 */
const MANIFEST_LOCATIONS = [
  'clodo-service-manifest.json',     // Standard location (root)
  '.clodo/service-manifest.json',    // Hidden config directory
  'config/service-manifest.json',    // Config subdirectory
];

/**
 * Fallback configuration builders for legacy services
 */
class LegacyServiceDetector {
  /**
   * Build manifest-like config from wrangler.toml + package.json
   */
  static async buildFromWrangler(servicePath) {
    const wranglerPath = join(servicePath, 'wrangler.toml');
    const packagePath = join(servicePath, 'package.json');

    if (!existsSync(wranglerPath) || !existsSync(packagePath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      return {
        _source: 'legacy-wrangler',
        _legacyNote: 'This is a legacy service without a service-manifest.json. Consider running: npx clodo-service init',
        serviceName: packageJson.name || 'unknown-service',
        serviceType: 'legacy-workers-project',
        version: packageJson.version || '1.0.0',
        isClodoService: false,
        isLegacyService: true,
        deployment: {
          framework: 'wrangler',
          ready: true,
          configFiles: {
            wrangler: './wrangler.toml',
            package: './package.json'
          }
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          framework: 'legacy-wrangler'
        }
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Build manifest-like config from package.json alone
   */
  static async buildFromPackageJson(servicePath) {
    const packagePath = join(servicePath, 'package.json');

    if (!existsSync(packagePath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      return {
        _source: 'legacy-package-only',
        _legacyNote: 'This project has a package.json but no deployment configuration.',
        serviceName: packageJson.name || 'unknown-service',
        serviceType: 'nodejs-project',
        version: packageJson.version || '1.0.0',
        isClodoService: false,
        isLegacyService: true,
        deployment: {
          framework: 'nodejs',
          ready: false,
          configFiles: {
            package: './package.json'
          }
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          framework: 'legacy-nodejs'
        }
      };
    } catch (err) {
      return null;
    }
  }
}

/**
 * Main manifest loader
 */
export class ManifestLoader {
  /**
   * Load service configuration with intelligent Cloudflare service validation
   * 
   * Returns:
   * - Clodo Framework manifest (if found)
   * - Validated Cloudflare service config (wrangler.toml + package.json)
   * - Error details if not a valid Cloudflare service
   */
  static async loadAndValidateCloudflareService(servicePath = '.') {
    const resolvedPath = resolve(servicePath);

    // Step 1: Try loading Clodo manifest first
    for (const location of MANIFEST_LOCATIONS) {
      const manifestPath = join(resolvedPath, location);
      if (existsSync(manifestPath)) {
        try {
          const content = readFileSync(manifestPath, 'utf8');
          const manifest = JSON.parse(content);
          manifest._source = 'clodo-manifest';
          manifest._location = location;
          manifest.isClodoService = true;
          manifest.isValidCloudflareService = true;
          return { 
            manifest, 
            foundAt: manifestPath, 
            isClodo: true,
            validationResult: null 
          };
        } catch (err) {
          throw new Error(`Failed to parse manifest at ${manifestPath}: ${err.message}`);
        }
      }
    }

    // Step 2: Validate as Cloudflare service (requires wrangler.toml + package.json)
    const validationResult = CloudflareServiceValidator.validateForDeployment(resolvedPath);

    if (!validationResult.canDeploy && validationResult.reason === 'NOT_A_CLOUDFLARE_SERVICE') {
      return { 
        manifest: null, 
        foundAt: null, 
        isClodo: false,
        validationResult,
        error: 'NOT_A_CLOUDFLARE_SERVICE'
      };
    }

    // Step 3: Build manifest-like config from Cloudflare service
    if (validationResult.canDeploy || validationResult.reason === 'SERVICE_VALID_WITH_WARNINGS') {
      const manifest = this.buildFromCloudflareService(validationResult, resolvedPath);
      return {
        manifest,
        foundAt: 'detected-cloudflare-service',
        isClodo: false,
        validationResult,
        isValidCloudflareService: true
      };
    }

    // Service is Cloudflare but has issues
    return {
      manifest: null,
      foundAt: null,
      isClodo: false,
      validationResult,
      error: 'CLOUDFLARE_SERVICE_INVALID'
    };
  }

  /**
   * Build manifest-like config from valid Cloudflare service files
   */
  static buildFromCloudflareService(validationResult, servicePath) {
    const wranglerConfig = validationResult.validation.wranglerConfig;
    const packageJson = validationResult.validation.packageJson;

    return {
      _source: 'cloudflare-service-detected',
      _legacyNote: 'This is a Cloudflare Workers service. Consider creating it with: npx clodo-service create',
      serviceName: packageJson.name || wranglerConfig.name || 'unknown-service',
      serviceType: 'cloudflare-workers-service',
      version: packageJson.version || '1.0.0',
      isClodoService: false,
      isValidCloudflareService: true,
      deployment: {
        framework: 'wrangler',
        ready: validationResult.deploymentHistory.hasDeploymentHistory,
        configFiles: {
          wrangler: './wrangler.toml',
          package: './package.json'
        },
        hasExistingDeployments: validationResult.deploymentHistory.hasDeploymentHistory
      },
      metadata: {
        detectedAt: new Date().toISOString(),
        framework: 'wrangler',
        detectionReason: validationResult.reason
      }
    };
  }

  /**
   * Print helpful error message for non-Cloudflare services
   */
  static printNotCloudflareServiceError(servicePath = '.') {
    console.error(chalk.red('\n❌ Not a Cloudflare Workers Service\n'));
    
    console.error(chalk.white('This directory is missing required Cloudflare files:'));
    console.error(chalk.gray('  - wrangler.toml'));
    console.error(chalk.gray('  - package.json'));

    console.error(chalk.cyan('\n📋 To deploy, you need either:\n'));

    console.error(chalk.white('Option 1: Create a new Clodo service'));
    console.error(chalk.green('  npx clodo-service create'));
    console.error(chalk.gray('  (Creates: service-manifest.json + full structure)\n'));

    console.error(chalk.white('Option 2: Initialize an existing project'));
    console.error(chalk.green('  npx clodo-service init'));
    console.error(chalk.gray('  (Creates: service-manifest.json from existing files)\n'));

    console.error(chalk.white('Option 3: Create a standard Cloudflare project'));
    console.error(chalk.green('  npm init wrangler@latest'));
    console.error(chalk.gray('  (Creates: wrangler.toml + package.json)\n'));
  }

  /**
   * Print validation issues for malformed services
   */
  static printValidationErrors(validationResult) {
    if (validationResult.validation.issues.length > 0) {
      console.error(chalk.red('\n❌ Service Configuration Issues:\n'));
      validationResult.validation.issues.forEach(issue => {
        console.error(chalk.red(`  • ${issue}`));
      });
    }

    if (validationResult.validation.warnings.length > 0) {
      console.warn(chalk.yellow('\n⚠️  Service Configuration Warnings:\n'));
      validationResult.validation.warnings.forEach(warning => {
        console.warn(chalk.yellow(`  • ${warning}`));
      });
      console.warn(chalk.cyan('\nContinue with deployment? (May fail or behave unexpectedly)'));
    }
  }

  /**
   * Validate manifest has required fields for deployment
   */
  static validateDeploymentReady(manifest) {
    const errors = [];

    // Required for both Clodo and legacy services
    if (!manifest.serviceName) errors.push('Missing: serviceName');
    if (!manifest.deployment) errors.push('Missing: deployment configuration');

    // For Clodo services
    if (manifest.isClodoService) {
      if (!manifest.deployment.domains || manifest.deployment.domains.length === 0) {
        errors.push('Missing: deployment.domains (required for multi-domain deployment)');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Print manifest info for debugging
   */
  static printManifestInfo(manifest) {
    console.log(chalk.cyan('\n📋 Service Configuration:\n'));
    console.log(chalk.white(`Service Name: ${chalk.bold(manifest.serviceName)}`));
    console.log(chalk.white(`Service Type: ${chalk.bold(manifest.serviceType)}`));
    console.log(chalk.white(`Source: ${chalk.gray(manifest._source)}`));
    
    if (manifest._legacyNote) {
      console.log(chalk.yellow(`\nℹ️  ${manifest._legacyNote}`));
    }

    if (manifest.deployment.domains) {
      console.log(chalk.white(`\nDomains:`));
      manifest.deployment.domains.forEach(domain => {
        console.log(chalk.gray(`  - ${domain.name} (${domain.environment})`));
      });
    }

    console.log('');
  }
}

export default ManifestLoader;
