/**
 * Interactive Validation Workflow Module
 * 
 * Provides reusable interactive validation workflows.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module interactive-validation
 */

import { askYesNo } from '../../utils/interactive-prompts.js';
import { 
  validatePrerequisites, 
  checkAuth, 
  authenticate, 
  workerExists 
} from '../../cloudflare/ops.js';

/**
 * Interactive Validation Workflow
 * Handles pre-deployment checks and comprehensive validation
 */
export class InteractiveValidation {
  /**
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
  }

  /**
   * Execute pre-deployment checks
   * 
   * @param {Object} config - Deployment configuration
   * @returns {Promise<Object>} Validation results
   */
  async executePreDeploymentChecks(config) {
    console.log('\n✅ Pre-deployment Validation');
    console.log('============================');

    // Check prerequisites
    await this.validatePrerequisites();

    // Check authentication
    await this.validateAuthentication();

    // Check for existing deployments
    await this.checkExistingDeployments(config);

    console.log('\n✅ All pre-deployment checks passed');

    return {
      prerequisites: true,
      authentication: true,
      existingDeployments: false
    };
  }

  /**
   * Validate system prerequisites
   * 
   * @returns {Promise<void>}
   */
  async validatePrerequisites() {
    console.log('\n🔍 Checking prerequisites...');
    const prereqs = await validatePrerequisites();
    
    for (const prereq of prereqs) {
      if (prereq.status === 'ok') {
        console.log(`   ✅ ${prereq.name}: ${prereq.version}`);
      } else {
        throw new Error(`${prereq.name} is not available: ${prereq.error}`);
      }
    }
  }

  /**
   * Validate Cloudflare authentication
   * 
   * @returns {Promise<void>}
   */
  async validateAuthentication() {
    console.log('\n🔐 Checking Cloudflare authentication...');
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
      if (!this.interactive) {
        throw new Error('Cloudflare authentication required but running in non-interactive mode');
      }

      const shouldAuthenticate = await askYesNo(
        'Cloudflare authentication required. Run authentication now?',
        'y'
      );
      
      if (shouldAuthenticate) {
        console.log('\n🔑 Please complete Cloudflare authentication...');
        await authenticate();
      } else {
        throw new Error('Cloudflare authentication is required for deployment');
      }
    } else {
      console.log('   ✅ Cloudflare: Authenticated');
    }
  }

  /**
   * Check for existing deployments
   * 
   * @param {Object} config - Deployment configuration
   * @returns {Promise<boolean>} True if existing deployment found and should continue
   */
  async checkExistingDeployments(config) {
    console.log('\n🔍 Checking for existing deployments...');
    const workerExistsAlready = await workerExists(config.worker.name);
    
    if (workerExistsAlready) {
      console.log(`   ⚠️ Worker '${config.worker.name}' already exists`);
      
      if (!this.interactive) {
        console.log('   ℹ️  Non-interactive mode: will overwrite existing worker');
        return true;
      }

      const shouldOverwrite = await askYesNo(
        'Do you want to overwrite the existing worker?',
        'n'
      );
      
      if (!shouldOverwrite) {
        throw new Error('Deployment cancelled - worker already exists');
      }
      
      return true;
    } else {
      console.log(`   ✅ Worker name '${config.worker.name}' is available`);
      return false;
    }
  }

  /**
   * Execute comprehensive validation
   * 
   * @param {Object} config - Deployment configuration
   * @param {Object} validationManager - ValidationManager instance
   * @returns {Promise<Object>} Validation results
   */
  async executeComprehensiveValidation(config, validationManager) {
    console.log('\n🔍 Comprehensive Validation');
    console.log('==========================');

    try {
      const validationResult = await validationManager.validateDeploymentConfiguration({
        domain: config.domain,
        environment: config.environment,
        worker: config.worker,
        database: config.database,
        secrets: config.secrets,
        comprehensive: true
      });

      if (validationResult.valid) {
        console.log('   ✅ Configuration validation passed');
        if (validationResult.warnings?.length > 0) {
          console.log(`   ⚠️  ${validationResult.warnings.length} warnings found`);
          for (const warning of validationResult.warnings) {
            console.log(`      - ${warning}`);
          }
        }
      } else {
        console.log('   ❌ Configuration validation failed');
        for (const error of validationResult.errors) {
          console.log(`      - ${error}`);
        }
        throw new Error('Configuration validation failed');
      }

      return validationResult;

    } catch (error) {
      console.log(`   ❌ Validation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate configuration object
   * 
   * @param {Object} config - Configuration to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateConfiguration(config) {
    const errors = [];
    const warnings = [];

    // Domain validation
    if (!config.domain || config.domain.length === 0) {
      errors.push('Domain name is required');
    }

    // Environment validation
    if (!config.environment) {
      errors.push('Environment is required');
    }

    // Worker validation
    if (!config.worker?.name) {
      errors.push('Worker name is required');
    }

    // Database validation
    if (config.database?.name && !config.database?.id) {
      warnings.push('Database name specified but no database ID');
    }

    // Secrets validation
    if (Object.keys(config.secrets?.keys || {}).length === 0) {
      warnings.push('No secrets configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get validation summary
   * 
   * @param {Object} validationResult - Validation result
   * @returns {string} Summary message
   */
  getValidationSummary(validationResult) {
    if (validationResult.valid) {
      const warningCount = validationResult.warnings?.length || 0;
      if (warningCount > 0) {
        return `✅ Validation passed with ${warningCount} warning(s)`;
      }
      return '✅ Validation passed';
    } else {
      const errorCount = validationResult.errors?.length || 0;
      return `❌ Validation failed with ${errorCount} error(s)`;
    }
  }
}
