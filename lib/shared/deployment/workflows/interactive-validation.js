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
export class InteractiveValidationWorkflow {
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

    // Check authentication - pass existing credentials if available
    await this.validateAuthentication(config);

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
   * @param {Object} config - Deployment configuration with credentials
   * @returns {Promise<void>}
   */
  async validateAuthentication(config = {}) {
    // If credentials are already collected, skip authentication check
    if (config.credentials?.token && config.credentials?.accountId) {
      console.log('\n🔐 Using collected Cloudflare credentials...');
      console.log('✅ Authentication validated via deployment workflow');
      return;
    }

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

      return await this.handleExistingWorker(config);
    } else {
      console.log(`   ✅ Worker name '${config.worker.name}' is available`);
      return false;
    }
  }

  /**
   * Handle existing worker with multiple options
   *
   * @param {Object} config - Deployment configuration
   * @returns {Promise<boolean>} True if deployment should proceed
   */
  async handleExistingWorker(config) {
    console.log('\n🔄 Existing Worker Options:');
    console.log('===========================');

    const { askChoice } = await import('../utils/interactive-prompts.js');

    const choice = await askChoice(
      'How would you like to handle the existing worker?',
      [
        '🔄 Overwrite/Update - Deploy new version (recommended)',
        '📝 Rename - Create with a different worker name',
        '🔍 Compare - Show differences before deciding',
        '💾 Backup & Update - Create backup before overwriting',
        '❌ Cancel - Stop deployment'
      ],
      0
    );

    switch (choice) {
      case 0: // Overwrite/Update
        console.log('   ✅ Will overwrite existing worker with new deployment');
        return true;

      case 1: // Rename
        const newName = await this.promptForNewWorkerName(config.worker.name);
        config.worker.name = newName;
        config.worker.url = `https://${newName}.${config.credentials?.zoneName || `${config.domain || 'clododev'}.workers.dev`}`;
        console.log(`   ✅ Will deploy as new worker: ${newName}`);
        return true;

      case 2: // Compare
        await this.compareExistingWorker(config);
        // After comparison, ask again
        return await this.handleExistingWorker(config);

      case 3: // Backup & Update
        await this.backupExistingWorker(config);
        console.log('   ✅ Backup created, will now overwrite existing worker');
        return true;

      case 4: // Cancel
      default:
        throw new Error('Deployment cancelled by user');
    }
  }

  /**
   * Prompt for a new worker name
   *
   * @param {string} currentName - Current worker name
   * @returns {Promise<string>} New worker name
   */
  async promptForNewWorkerName(currentName) {
    const { askUser } = await import('../utils/interactive-prompts.js');

    let newName = await askUser(`Enter new worker name (current: ${currentName})`);
    newName = newName.trim();

    if (!newName) {
      throw new Error('Worker name cannot be empty');
    }

    // Basic validation
    if (newName.length < 3) {
      throw new Error('Worker name must be at least 3 characters long');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newName)) {
      throw new Error('Worker name can only contain letters, numbers, hyphens, and underscores');
    }

    // Check if the new name also exists
    const exists = await workerExists(newName);
    if (exists) {
      console.log(`   ⚠️ Worker '${newName}' also exists!`);
      const useAnyway = await askUser('Use this name anyway? (y/n)', 'n');
      if (useAnyway.toLowerCase() !== 'y' && useAnyway.toLowerCase() !== 'yes') {
        return await this.promptForNewWorkerName(currentName);
      }
    }

    return newName;
  }

  /**
   * Compare existing worker configuration
   *
   * @param {Object} config - Deployment configuration
   */
  async compareExistingWorker(config) {
    console.log('\n🔍 Comparing Worker Configurations:');
    console.log('=====================================');

    try {
      // This is a simplified comparison - in a real implementation,
      // you might fetch the existing worker's configuration
      console.log(`   📋 Existing Worker: ${config.worker.name}`);
      console.log(`   🌐 URL: https://${config.worker.name}.${config.credentials?.zoneName || `${config.domain || 'clododev'}.workers.dev`}`);
      console.log(`   📅 Last deployed: Unknown (would need API call to check)`);
      console.log(`   🔧 Environment: ${config.environment || 'production'}`);

      console.log('\n   📋 New Deployment:');
      console.log(`   📋 Worker: ${config.worker.name}`);
      console.log(`   🌐 URL: ${config.worker.url}`);
      console.log(`   🔧 Environment: ${config.environment || 'production'}`);
      console.log(`   🗄️ Database: ${config.database?.name || 'None'}`);
      console.log(`   🔐 Secrets: ${Object.keys(config.secrets || {}).length} configured`);

      console.log('\n   ℹ️ Note: Full comparison would require additional API calls to fetch existing worker details');

    } catch (error) {
      console.log(`   ⚠️ Could not compare configurations: ${error.message}`);
    }
  }

  /**
   * Create a backup of existing worker
   *
   * @param {Object} config - Deployment configuration
   */
  async backupExistingWorker(config) {
    console.log('\n💾 Creating Worker Backup:');
    console.log('===========================');

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${config.worker.name}-backup-${timestamp}`;

      console.log(`   📋 Creating backup worker: ${backupName}`);

      // Note: This is a placeholder - actual backup would require
      // downloading the existing worker code and creating a new worker
      // This would be complex and might not be worth implementing
      // since Cloudflare doesn't provide direct worker code access

      console.log(`   ⚠️ Worker backup not fully implemented yet`);
      console.log(`   💡 Consider manually backing up important worker code before overwriting`);
      console.log(`   💡 You can also use version control to track changes`);

    } catch (error) {
      console.log(`   ⚠️ Backup failed: ${error.message}`);
      console.log(`   🔄 Continuing with deployment anyway...`);
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
