/**
 * Interactive Secret Workflow Module
 * 
 * Provides reusable interactive secret management workflows.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module interactive-secret-workflow
 */

import { askYesNo } from '../utils/interactive-prompts.js';
import { 
  generateSecrets, 
  saveSecrets, 
  distributeSecrets 
} from '../security/secret-generator.js';
import { deploySecret } from '../cloudflare/ops.js';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * Interactive Secret Workflow
 * Handles secret generation, deployment, and distribution with user interaction
 */
export class InteractiveSecretWorkflow {
  /**
   * @param {Object} options - Configuration options
   * @param {Array} options.rollbackActions - Array to track rollback actions
   */
  constructor(options = {}) {
    this.rollbackActions = options.rollbackActions || [];
  }

  /**
   * Handle complete secret management workflow
   * 
   * @param {string} domain - Domain name
   * @param {string} environment - Deployment environment
   * @param {string} workerName - Worker name for deployment
   * @param {Object} options - Additional options
   * @param {boolean} [options.interactive=true] - Enable interactive prompts
   * @param {boolean} [options.generateDistribution=true] - Generate distribution files
   * @returns {Promise<Object>} Secret configuration { secrets, distributionPath, file }
   */
  async handleSecretManagement(domain, environment, workerName, options = {}) {
    console.log('\n🔐 Secret Management');
    console.log('====================');

    // Discover existing secrets
    const existingSecrets = await this.discoverExistingSecrets(domain, options.interactive);
    
    // Obtain secrets (reuse or generate new)
    const secrets = await this.obtainSecrets(domain, environment, existingSecrets, options.interactive);
    
    // Deploy secrets to Cloudflare
    await this.deploySecrets(secrets, workerName, environment, options.interactive);
    
    // Generate distribution files
    let distributionPath = null;
    if (options.generateDistribution !== false) {
      distributionPath = await this.generateDistribution(domain, secrets, options.interactive);
    }

    return {
      secrets,
      distributionPath,
      file: join('secrets', `${domain}-secrets.json`)
    };
  }

  /**
   * Discover existing secrets from file system
   * 
   * @param {string} domain - Domain name
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<Object>} Existing secrets or empty object
   */
  async discoverExistingSecrets(domain, interactive = true) {
    const secretsFile = join('secrets', `${domain}-secrets.json`);
    
    if (!existsSync(secretsFile)) {
      return {};
    }

    console.log(`\n📂 Found existing secrets file: ${secretsFile}`);
    
    try {
      const data = JSON.parse(readFileSync(secretsFile, 'utf8'));
      const { domain: fileDomain, environment, generated, note, ...secrets } = data;
      
      console.log(`   🔑 Contains ${Object.keys(secrets).length} secrets`);
      console.log(`   📅 Generated: ${generated}`);
      
      return secrets;
    } catch (error) {
      console.log('   ⚠️ Could not read existing secrets file');
      return {};
    }
  }

  /**
   * Obtain secrets (reuse existing or generate new)
   * 
   * @param {string} domain - Domain name
   * @param {string} environment - Deployment environment
   * @param {Object} existingSecrets - Existing secrets
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<Object>} Final secrets
   */
  async obtainSecrets(domain, environment, existingSecrets, interactive = true) {
    const hasExisting = Object.keys(existingSecrets).length > 0;
    
    // If existing secrets found, ask to reuse
    if (hasExisting && interactive) {
      const reuseSecrets = await askYesNo(
        'Do you want to reuse these existing secrets? (Recommended for consistency)',
        'y'
      );
      
      if (reuseSecrets) {
        console.log('   ✅ Will reuse existing secrets');
        return existingSecrets;
      }
    } else if (hasExisting && !interactive) {
      // Non-interactive mode: reuse existing by default
      console.log('   ✅ Reusing existing secrets (non-interactive mode)');
      return existingSecrets;
    }

    // Generate new secrets
    return await this.generateNewSecrets(domain, environment, interactive);
  }

  /**
   * Generate new secrets
   * 
   * @param {string} domain - Domain name
   * @param {string} environment - Deployment environment
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<Object>} Generated secrets
   */
  async generateNewSecrets(domain, environment, interactive = true) {
    console.log('\n🔑 Generating new secrets using shared module...');
    
    if (interactive) {
      const confirmGenerate = await askYesNo(
        'Proceed with secret generation?',
        'y'
      );

      if (!confirmGenerate) {
        throw new Error('Secret generation cancelled');
      }
    }

    // Generate secrets using shared module
    const secrets = generateSecrets();
    
    // Save secrets using shared module
    const savedFile = saveSecrets(
      domain, 
      environment, 
      secrets,
      { note: 'Generated by Interactive Secret Workflow' }
    );
    console.log(`\n💾 Secrets saved to: ${savedFile}`);

    return secrets;
  }

  /**
   * Deploy secrets to Cloudflare Workers
   * 
   * @param {Object} secrets - Secrets to deploy
   * @param {string} workerName - Worker name
   * @param {string} environment - Deployment environment
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<void>}
   */
  async deploySecrets(secrets, workerName, environment, interactive = true) {
    console.log('\n☁️ Deploying secrets to Cloudflare Workers...');
    
    if (interactive) {
      const deployConfirmed = await askYesNo(
        `Deploy ${Object.keys(secrets).length} secrets to worker '${workerName}'?`,
        'y'
      );

      if (!deployConfirmed) {
        throw new Error('Secret deployment cancelled');
      }
    }

    for (const [key, value] of Object.entries(secrets)) {
      console.log(`   🔑 Deploying ${key}...`);
      
      try {
        await deploySecret(key, value, environment);
        console.log(`      ✅ ${key} deployed`);
        
        // Add to rollback actions
        this.rollbackActions.push({
          type: 'delete-secret',
          key: key,
          command: `npx wrangler secret delete ${key} --env ${environment}`,
          description: `Delete secret '${key}' deployed to environment '${environment}'`
        });
        
      } catch (error) {
        throw new Error(`Failed to deploy secret ${key}: ${error.message}`);
      }
    }

    console.log(`\n✅ All ${Object.keys(secrets).length} secrets deployed successfully`);
  }

  /**
   * Generate secret distribution files
   * 
   * @param {string} domain - Domain name
   * @param {Object} secrets - Secrets to distribute
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<string|null>} Distribution directory path or null
   */
  async generateDistribution(domain, secrets, interactive = true) {
    console.log('\n📤 Generating secret distribution files...');
    
    if (interactive) {
      const generateDistribution = await askYesNo(
        'Generate secret distribution files for upstream/downstream applications?',
        'y'
      );

      if (!generateDistribution) {
        console.log('   ⏭️ Distribution generation skipped');
        return null;
      }
    }

    // Use shared module for secret distribution
    const distribution = distributeSecrets(domain, secrets);
    console.log(`   📂 Distribution files created in: ${distribution.directory}`);
    
    return distribution.directory;
  }

  /**
   * Get secret workflow summary
   * 
   * @param {Object} secretConfig - Secret configuration result
   * @returns {string} Summary message
   */
  getSummary(secretConfig) {
    const secretCount = Object.keys(secretConfig.secrets).length;
    const parts = [`✅ Secret management complete: ${secretCount} secrets deployed`];
    
    if (secretConfig.distributionPath) {
      parts.push(`Distribution: ${secretConfig.distributionPath}`);
    }
    
    return parts.join(' | ');
  }
}
