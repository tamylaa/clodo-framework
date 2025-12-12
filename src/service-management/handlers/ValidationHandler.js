/**
 * Validation Handler Module
 * Focused module for service validation and health checks
 */

import fs from 'fs/promises';
import path from 'path';
import { FrameworkConfig } from '../../utils/framework-config.js';
// import { ConfigurationValidator } from '../../../lib/shared/utils/configuration-validator.js';

export class ValidationHandler {
  constructor(options = {}) {
    this.strict = options.strict || false;
    this.customConfig = options.customConfig || {};
    this.configLoaded = false;
  }

  /**
   * Load validation configuration from validation-config.json if it exists
   */
  loadValidationConfig(servicePath) {
    // Skip if already loaded or custom config provided
    if (this.configLoaded || Object.keys(this.customConfig).length > 0) {
      return this.validationConfig;
    }

    try {
      // Try to load validation-config.json from service directory
      const configPath = path.join(servicePath, 'validation-config.json');
      const frameworkConfig = new FrameworkConfig(configPath);
      const config = frameworkConfig.config;
      
      // Extract validation section from config
      if (config && config.validation) {
        // Log that we loaded the config
        console.log(`📋 Loaded configuration from: ${configPath}`);
        
        this.validationConfig = {
          requiredFiles: config.validation.requiredFiles || [
            'package.json',
            'src/config/domains.js',
            'src/worker/index.js',
            'wrangler.toml'
          ],
          optionalFiles: config.validation.optionalFiles || [
            'README.md',
            'LICENSE',
            '.gitignore'
          ],
          requiredFields: config.validation.requiredFields || {
            'package.json': ['name', 'version', 'type', 'main'],
            'wrangler.toml': ['name', 'main', 'compatibility_date']
          },
          serviceTypes: config.validation.serviceTypes || [
            'data-service',
            'auth-service',
            'content-service',
            'api-gateway',
            'static-site',
            'generic'
          ]
        };
        this.configLoaded = true;
        return this.validationConfig;
      }
    } catch (error) {
      // Config loading failed, use defaults silently
    }

    // Use custom config if provided, otherwise use defaults
    this.validationConfig = {
      requiredFiles: this.customConfig.requiredFiles || [
        'package.json',
        'src/config/domains.js',
        'src/worker/index.js',
        'wrangler.toml'
      ],
      optionalFiles: this.customConfig.optionalFiles || [
        'README.md',
        'LICENSE',
        '.gitignore'
      ],
      requiredFields: this.customConfig.requiredFields || {
        'package.json': ['name', 'version', 'type', 'main'],
        'wrangler.toml': ['name', 'main', 'compatibility_date']
      },
      serviceTypes: this.customConfig.serviceTypes || [
        'data-service',
        'auth-service',
        'content-service',
        'api-gateway',
        'static-site',
        'generic'
      ]
    };
    this.configLoaded = true;
    return this.validationConfig;
  }

  /**
   * Validate complete service configuration
   */
  async validateService(servicePath) {
    // Load validation config from validation-config.json if it exists
    this.loadValidationConfig(servicePath);
    
    const issues = [];

    // Check for required files using custom config
    for (const file of this.validationConfig.requiredFiles) {
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

    // Run comprehensive configuration validation using ConfigurationValidator
    // Temporarily disabled due to import issues
    // try {
    //   const configValidation = await ConfigurationValidator.validateServiceConfig(servicePath);
    //   if (!configValidation.isValid) {
    //     issues.push(...configValidation.errors);
    //     issues.push(...configValidation.warnings.map(w => `Warning: ${w}`));
    //   }
    // } catch (error) {
    //   issues.push(`Configuration validation failed: ${error.message}`);
    // }

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

      // Check custom required fields for package.json
      const requiredPackageFields = this.validationConfig.requiredFields['package.json'] || ['name', 'version'];
      requiredPackageFields.forEach(field => {
        if (!packageJson[field]) {
          issues.push(`package.json: Missing required field: ${field}`);
        }
      });

      if (!packageJson.type || packageJson.type !== 'module') {
        issues.push('package.json: Should use "type": "module" for ES modules');
      }

      // Check for required dependencies
      const requiredDeps = ['@tamyla/clodo-framework'];
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

      // Check for Clodo Framework integration
      if (!domainConfig.includes('createDomainConfigSchema')) {
        issues.push('Domain configuration missing Clodo Framework integration');
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
