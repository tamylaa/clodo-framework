/**
 * Interactive Confirmation Module
 * 
 * Provides reusable interactive confirmation workflows.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module interactive-confirmation
 */

import { askYesNo } from '../../utils/interactive-prompts.js';

/**
 * Interactive Confirmation Manager
 * Handles deployment confirmations and configuration reviews
 */
export class InteractiveConfirmation {
  /**
   * Display final deployment confirmation
   * 
   * @param {Object} config - Deployment configuration
   * @param {Object} deploymentState - Deployment state
   * @param {Object} options - Confirmation options
   * @returns {Promise<boolean>} True if confirmed, throws if cancelled
   */
  static async showFinalConfirmation(config, deploymentState, options = {}) {
    console.log('\n🎯 Final Deployment Confirmation');
    console.log('===============================');

    this.displayDeploymentSummary(config, deploymentState);
    this.displayActionsToPerform(config);

    const finalConfirm = await askYesNo(
      '\n🚨 PROCEED WITH DEPLOYMENT? This will make changes to your Cloudflare account.',
      options.defaultAnswer || 'n'
    );

    if (!finalConfirm) {
      throw new Error('Deployment cancelled by user');
    }

    return true;
  }

  /**
   * Display deployment summary
   * 
   * @param {Object} config - Configuration
   * @param {Object} deploymentState - Deployment state
   */
  static displayDeploymentSummary(config, deploymentState) {
    console.log('\n📋 DEPLOYMENT SUMMARY');
    console.log('=====================');
    console.log(`🌐 Domain: ${config.domain}`);
    console.log(`🌍 Environment: ${config.environment}`);
    console.log(`⚡ Worker: ${config.worker.name}`);
    console.log(`🔗 URL: ${config.worker.url}`);
    console.log(`🗄️ Database: ${config.database.name} (${config.database.id})`);
    console.log(`🔑 Secrets: ${Object.keys(config.secrets.keys).length} configured`);
    console.log(`🆔 Deployment ID: ${deploymentState.deploymentId}`);
  }

  /**
   * Display actions that will be performed
   * 
   * @param {Object} config - Configuration
   */
  static displayActionsToPerform(config) {
    console.log('\n🚀 ACTIONS TO PERFORM:');
    console.log('1. Update wrangler.toml configuration');
    console.log('2. Run database migrations');
    console.log('3. Deploy Cloudflare Worker');
    console.log('4. Verify deployment health');
    if (config.deployment.runTests) {
      console.log('5. Run integration tests');
    }
  }

  /**
   * Display and confirm configuration review
   * 
   * @param {Object} config - Configuration to review
   * @param {Object} deploymentState - Deployment state
   * @param {Function} reconfigureCallback - Callback to reconfigure if rejected
   * @returns {Promise<boolean>} True if confirmed
   */
  static async showConfigurationReview(config, deploymentState, reconfigureCallback) {
    console.log('\n🔍 Configuration Review');
    console.log('======================');
    
    console.log('\nPlease review your configuration:');
    console.log(`   🌐 Domain: ${config.domain}`);
    console.log(`   🌍 Environment: ${config.environment}`);
    console.log(`   ⚡ Worker: ${config.worker.name}`);
    console.log(`   🔗 URL: ${config.worker.url}`);
    console.log(`   🆔 Deployment ID: ${deploymentState.deploymentId}`);

    const confirmed = await askYesNo('\nIs this configuration correct?', 'y');
    
    if (!confirmed) {
      if (reconfigureCallback && typeof reconfigureCallback === 'function') {
        console.log('\n🔄 Let\'s reconfigure...');
        await reconfigureCallback();
        return this.showConfigurationReview(config, deploymentState, reconfigureCallback);
      } else {
        throw new Error('Configuration rejected by user');
      }
    }

    return true;
  }

  /**
   * Show enterprise final confirmation with additional details
   * 
   * @param {Object} config - Deployment configuration
   * @param {Object} deploymentState - Deployment state
   * @param {Object} enterpriseModules - Enterprise modules
   * @returns {Promise<boolean>} True if confirmed
   */
  static async showEnterpriseFinalConfirmation(config, deploymentState, enterpriseModules) {
    console.log('\n🎯 Enterprise Final Confirmation');
    console.log('================================');

    this.displayEnterpriseDeploymentSummary(config, deploymentState);
    this.displayEnterpriseActionsToPerform(config, enterpriseModules);

    const finalConfirm = await askYesNo(
      '\n🚨 PROCEED WITH ENTERPRISE DEPLOYMENT?',
      'n'
    );

    if (!finalConfirm) {
      throw new Error('Enterprise deployment cancelled by user');
    }

    return true;
  }

  /**
   * Display enterprise deployment summary
   * 
   * @param {Object} config - Configuration
   * @param {Object} deploymentState - Deployment state
   */
  static displayEnterpriseDeploymentSummary(config, deploymentState) {
    console.log('\n📋 ENTERPRISE DEPLOYMENT SUMMARY');
    console.log('================================');
    console.log(`🌐 Domain: ${config.domain}`);
    console.log(`🌍 Environment: ${config.environment}`);
    console.log(`📱 Mode: ${config.deploymentMode}`);
    console.log(`⚡ Worker: ${config.worker.name}`);
    console.log(`🔗 URL: ${config.worker.url}`);
    console.log(`🗄️ Database: ${config.database.name} (${config.database.id})`);
    console.log(`🔑 Secrets: ${Object.keys(config.secrets.keys).length} configured`);
    console.log(`🆔 Deployment ID: ${deploymentState.deploymentId}`);
    console.log(`🔍 Validation: ${config.deployment.validationLevel}`);
    console.log(`📋 Audit: ${config.deployment.auditLevel}`);
  }

  /**
   * Display enterprise actions
   * 
   * @param {Object} config - Configuration
   * @param {Object} enterpriseModules - Enterprise modules
   */
  static displayEnterpriseActionsToPerform(config, enterpriseModules) {
    console.log('\n🚀 ENTERPRISE ACTIONS TO PERFORM:');
    console.log('1. Comprehensive validation');
    console.log('2. Database orchestration');
    console.log('3. Enterprise secret management');
    console.log('4. Configuration management');
    console.log('5. Cloudflare Worker deployment with D1 recovery');
    console.log('6. Deployment verification');
    if (config.deployment.runTests) {
      console.log('7. Comprehensive integration tests');
    }
    console.log(`8. Audit logging and reporting`);
  }

  /**
   * Quick yes/no confirmation
   * 
   * @param {string} message - Confirmation message
   * @param {string} defaultAnswer - Default answer ('y' or 'n')
   * @returns {Promise<boolean>} Confirmation result
   */
  static async quickConfirm(message, defaultAnswer = 'y') {
    return await askYesNo(message, defaultAnswer);
  }

  /**
   * Confirm dangerous action with warning
   * 
   * @param {string} action - Action description
   * @param {string} warning - Warning message
   * @returns {Promise<boolean>} Confirmation result
   */
  static async confirmDangerousAction(action, warning) {
    console.log(`\n⚠️  WARNING: ${warning}`);
    const confirm = await askYesNo(
      `Are you sure you want to ${action}?`,
      'n'
    );

    if (!confirm) {
      throw new Error(`Dangerous action cancelled: ${action}`);
    }

    return true;
  }
}
