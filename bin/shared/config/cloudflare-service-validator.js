/**
 * Cloudflare Service Validator
 * 
 * Validates that a directory is a properly formed Cloudflare Workers service
 * and detects quality issues before deployment attempts
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import TOML from '@iarna/toml';

export class CloudflareServiceValidator {
  /**
   * Check if directory has basic Cloudflare service signatures
   * Returns: { isCloudflareService, wranglerPath, packagePath, errors }
   */
  static detectCloudflareService(servicePath) {
    const wranglerPath = join(servicePath, 'wrangler.toml');
    const packagePath = join(servicePath, 'package.json');

    const hasWrangler = existsSync(wranglerPath);
    const hasPackage = existsSync(packagePath);

    const errors = [];
    if (!hasWrangler) errors.push('Missing wrangler.toml');
    if (!hasPackage) errors.push('Missing package.json');

    return {
      isCloudflareService: hasWrangler && hasPackage,
      wranglerPath: hasWrangler ? wranglerPath : null,
      packagePath: hasPackage ? packagePath : null,
      errors
    };
  }

  /**
   * Validate service has proper entry points and structure
   * Returns: { isValid, issues, warnings }
   */
  static validateServiceStructure(servicePath, wranglerPath, packagePath) {
    const issues = [];
    const warnings = [];

    try {
      // Parse files
      const wranglerContent = readFileSync(wranglerPath, 'utf8');
      const wranglerConfig = TOML.parse(wranglerContent);
      const packageContent = readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);

      // Check wrangler.toml quality
      if (!wranglerConfig.name) {
        issues.push('wrangler.toml: Missing "name" field');
      }
      if (!wranglerConfig.main) {
        warnings.push('wrangler.toml: No "main" entry point specified (will use default)');
      }

      // Check package.json quality
      if (!packageJson.name) {
        issues.push('package.json: Missing "name" field');
      }
      if (!packageJson.dependencies && !packageJson.devDependencies) {
        warnings.push('package.json: No dependencies defined');
      }

      // Check for common entry points
      const possibleEntryPoints = [
        'src/worker/index.js',
        'src/index.js',
        'index.js',
        'dist/index.js',
        wranglerConfig.main
      ].filter(Boolean);

      const hasEntryPoint = possibleEntryPoints.some(ep => 
        existsSync(join(servicePath, ep))
      );

      if (!hasEntryPoint) {
        warnings.push(`No recognizable entry point found. Checked: ${possibleEntryPoints.join(', ')}`);
      }

      // Check for Cloudflare environment
      const env = wranglerConfig.env || {};
      if (Object.keys(env).length === 0) {
        warnings.push('wrangler.toml: No environments configured (production, staging, etc)');
      }

      // Note: Routes are optional - many services define them in code or use catch-all patterns
      // Not warning about missing routes here as it's a valid configuration choice

      return {
        isValid: issues.length === 0,
        issues,
        warnings,
        wranglerConfig,
        packageJson
      };
    } catch (err) {
      return {
        isValid: false,
        issues: [`Failed to parse config files: ${err.message}`],
        warnings: [],
        error: err
      };
    }
  }

  /**
   * Check if service has existing deployment history
   */
  static detectExistingDeployments(servicePath) {
    const possibleLocations = [
      join(servicePath, '.wrangler'),
      join(servicePath, 'dist'),
      join(servicePath, 'build'),
      join(servicePath, '.deployments')
    ];

    const existingDeployments = possibleLocations.filter(loc => existsSync(loc));
    return {
      hasDeploymentHistory: existingDeployments.length > 0,
      deploymentMarkers: existingDeployments
    };
  }

  /**
   * Print validation report
   */
  static printValidationReport(validation) {
    if (validation.issues.length > 0) {
      console.error(chalk.red('\n❌ Service Configuration Issues:\n'));
      validation.issues.forEach(issue => {
        console.error(chalk.red(`  • ${issue}`));
      });
    }

    if (validation.warnings.length > 0) {
      console.warn(chalk.yellow('\n⚠️  Service Configuration Warnings:\n'));
      validation.warnings.forEach(warning => {
        console.warn(chalk.yellow(`  • ${warning}`));
      });
    }

    if (validation.isValid && validation.warnings.length === 0) {
      console.log(chalk.green('\n✅ Service structure looks good!\n'));
    }
  }

  /**
   * Interactive validation: ask user if they want to continue despite warnings
   */
  static async askContinueDespiteWarnings() {
    // This would be called from interactive context
    // For now, return a promise that can be used in async/await
    return new Promise((resolve) => {
      // In actual implementation, would use readline or similar
      // For this stub, we'll indicate the method exists
      resolve(true);
    });
  }

  /**
   * Comprehensive service validation workflow
   */
  static validateForDeployment(servicePath) {
    // Step 1: Check for basic signatures
    const detection = this.detectCloudflareService(servicePath);
    
    if (!detection.isCloudflareService) {
      return {
        canDeploy: false,
        reason: 'NOT_A_CLOUDFLARE_SERVICE',
        detection,
        details: 'This directory does not have the required files for a Cloudflare Workers service.'
      };
    }

    // Step 2: Validate structure
    const validation = this.validateServiceStructure(
      servicePath,
      detection.wranglerPath,
      detection.packagePath
    );

    if (!validation.isValid) {
      return {
        canDeploy: false,
        reason: 'SERVICE_CONFIGURATION_INVALID',
        validation,
        details: 'The service configuration is invalid and may not deploy correctly.'
      };
    }

    // Step 3: Check deployment history
    const deploymentHistory = this.detectExistingDeployments(servicePath);

    return {
      canDeploy: true,
      reason: validation.warnings.length > 0 ? 'SERVICE_VALID_WITH_WARNINGS' : 'SERVICE_VALID',
      detection,
      validation,
      deploymentHistory,
      details: 'Service is ready for deployment.'
    };
  }
}

export default CloudflareServiceValidator;
