/**
 * Validation Handler Module
 * Focused module for service validation and health checks
 */

import fs from 'fs/promises';
import path from 'path';

export class ValidationHandler {
  constructor(options = {}) {
    this.strict = options.strict || false;
  }

  /**
   * Validate complete service configuration
   */
  async validateService(servicePath) {
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
    const packageValidation = await this.validatePackageJson(servicePath);
    issues.push(...packageValidation.issues);

    // Validate domain configuration
    const domainValidation = await this.validateDomainConfig(servicePath);
    issues.push(...domainValidation.issues);

    // Validate wrangler configuration
    const wranglerValidation = await this.validateWranglerConfig(servicePath);
    issues.push(...wranglerValidation.issues);

    return {
      valid: issues.length === 0,
      issues,
      servicePath
    };
  }

  /**
   * Validate package.json structure
   */
  async validatePackageJson(servicePath) {
    const issues = [];
    const packageJsonPath = path.join(servicePath, 'package.json');

    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      if (!packageJson.name) {
        issues.push('package.json: Missing name field');
      }

      if (!packageJson.version) {
        issues.push('package.json: Missing version field');
      }

      if (!packageJson.type || packageJson.type !== 'module') {
        issues.push('package.json: Should use "type": "module" for ES modules');
      }

      // Check for required dependencies
      const requiredDeps = ['@tamyla/lego-framework'];
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      requiredDeps.forEach(dep => {
        if (!deps[dep]) {
          issues.push(`package.json: Missing required dependency: ${dep}`);
        }
      });

    } catch (error) {
      issues.push(`package.json: Invalid JSON format - ${error.message}`);
    }

    return { issues };
  }

  /**
   * Validate domain configuration
   */
  async validateDomainConfig(servicePath) {
    const issues = [];
    const domainConfigPath = path.join(servicePath, 'src/config/domains.js');

    try {
      const domainConfig = await fs.readFile(domainConfigPath, 'utf8');

      // Check for Lego Framework integration
      if (!domainConfig.includes('createDomainConfigSchema')) {
        issues.push('Domain configuration missing Lego Framework integration');
      }

      // Check for required exports
      if (!domainConfig.includes('export const domains')) {
        issues.push('Domain configuration missing domains export');
      }

      // Basic domain format validation
      const domainMatches = domainConfig.match(/domain:\s*['"]([^'"]+)['"]/g);
      if (domainMatches) {
        domainMatches.forEach(match => {
          const domain = match.match(/domain:\s*['"]([^'"]+)['"]/)[1];
          if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(domain)) {
            issues.push(`Invalid domain format: ${domain}`);
          }
        });
      }

    } catch (error) {
      issues.push(`Domain configuration: Cannot read file - ${error.message}`);
    }

    return { issues };
  }

  /**
   * Validate wrangler configuration
   */
  async validateWranglerConfig(servicePath) {
    const issues = [];
    const wranglerConfigPath = path.join(servicePath, 'wrangler.toml');

    try {
      const wranglerConfig = await fs.readFile(wranglerConfigPath, 'utf8');

      // Check for required fields
      if (!wranglerConfig.includes('name =')) {
        issues.push('wrangler.toml: Missing name field');
      }

      if (!wranglerConfig.includes('main =')) {
        issues.push('wrangler.toml: Missing main field');
      }

      if (!wranglerConfig.includes('compatibility_date =')) {
        issues.push('wrangler.toml: Missing compatibility_date');
      }

    } catch (error) {
      issues.push(`wrangler.toml: Cannot read file - ${error.message}`);
    }

    return { issues };
  }

  /**
   * Run comprehensive service diagnostics
   */
  async diagnoseService(servicePath) {
    const diagnosis = {
      errors: [],
      warnings: [],
      recommendations: []
    };

    // Basic validation
    const validation = await this.validateService(servicePath);
    validation.issues.forEach(issue => {
      if (issue.includes('Missing required')) {
        diagnosis.errors.push({
          message: issue,
          severity: 'high',
          suggestion: 'Run service initialization to create missing files'
        });
      } else if (issue.includes('Invalid')) {
        diagnosis.errors.push({
          message: issue,
          severity: 'medium',
          suggestion: 'Review and correct the configuration'
        });
      } else {
        diagnosis.warnings.push({
          message: issue,
          suggestion: 'Consider updating for better compatibility'
        });
      }
    });

    // Additional recommendations
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(servicePath, 'package.json'), 'utf8'));
      
      if (!packageJson.scripts || !packageJson.scripts.dev) {
        diagnosis.recommendations.push('Add development scripts for easier testing');
      }

      if (!packageJson.scripts || !packageJson.scripts.deploy) {
        diagnosis.recommendations.push('Add deployment scripts for easier publishing');
      }

    } catch (error) {
      // Package.json validation already handled above
    }

    return diagnosis;
  }

  /**
   * Set validation strictness
   */
  setStrict(enabled) {
    this.strict = enabled;
  }
}