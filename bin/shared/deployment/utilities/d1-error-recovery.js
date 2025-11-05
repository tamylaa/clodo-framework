/**
 * D1 Error Recovery Workflow Module
 * 
 * Provides sophisticated D1 database binding error detection and recovery.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module d1-error-recovery
 */

/**
 * D1 Error Recovery Manager
 * Handles D1 database binding errors during deployment with automatic recovery
 */
export class D1ErrorRecoveryManager {
  /**
   * @param {Object} options - Configuration options
   * @param {Array} options.rollbackActions - Array to track rollback actions
   * @param {Object} options.wranglerDeployer - Optional WranglerDeployer instance for testing
   */
  constructor(options = {}) {
    this.rollbackActions = options.rollbackActions || [];
    this.wranglerDeployer = options.wranglerDeployer;
  }

  /**
   * Handle D1 database binding errors during deployment
   * 
   * @param {Error} error - Deployment error to analyze
   * @param {Object} config - Deployment configuration
   * @param {string} config.environment - Target environment
   * @param {string} [config.configPath='wrangler.toml'] - Path to wrangler config
   * @param {string} [config.cwd] - Working directory
   * @returns {Promise<Object>} Recovery result { handled, retry, action, message }
   */
  async handleD1BindingError(error, config = {}) {
    try {
      // Use provided WranglerDeployer or import dynamically
      let deployer;
      if (this.wranglerDeployer) {
        deployer = this.wranglerDeployer;
      } else {
        // Import WranglerDeployer for D1 error handling
        const { WranglerDeployer } = await import('../../../src/deployment/wrangler-deployer.js');
        deployer = new WranglerDeployer({
          cwd: config.cwd || process.cwd(),
          environment: config.environment
        });
      }
      
      // Attempt D1 error recovery
      const recoveryResult = await deployer.handleD1BindingError(error, {
        configPath: config.configPath || 'wrangler.toml',
        environment: config.environment
      });

      if (recoveryResult.handled) {
        console.log(`   🔧 D1 Error Recovery: ${recoveryResult.action}`);
        
        // Handle configuration backup if created
        if (recoveryResult.backupPath) {
          console.log(`   📁 Configuration backup: ${recoveryResult.backupPath}`);
          
          // Add rollback action to restore backup
          this.rollbackActions.unshift({
            type: 'restore-wrangler-config',
            backupPath: recoveryResult.backupPath,
            description: 'Restore wrangler.toml backup after D1 recovery'
          });
        }

        // Determine if deployment should be retried
        const shouldRetry = this.shouldRetryAfterRecovery(recoveryResult.action);

        return {
          handled: true,
          retry: shouldRetry,
          action: recoveryResult.action,
          message: this.getRecoveryMessage(recoveryResult),
          databaseName: recoveryResult.databaseName,
          databaseId: recoveryResult.databaseId
        };
      }

      // Error was not a D1 binding error
      return {
        handled: false,
        retry: false
      };

    } catch (recoveryError) {
      console.log(`   ⚠️ D1 error recovery failed: ${recoveryError.message}`);
      return {
        handled: true,
        retry: false,
        message: `D1 error recovery failed: ${recoveryError.message}`
      };
    }
  }

  /**
   * Determine if deployment should be retried after recovery
   * 
   * @param {string} action - Recovery action taken
   * @returns {boolean} True if deployment should retry
   */
  shouldRetryAfterRecovery(action) {
    const retryableActions = [
      'created_and_configured',
      'database_selected_and_configured',
      'binding_updated'
    ];
    
    return retryableActions.includes(action);
  }

  /**
   * Get user-friendly message for recovery result
   * 
   * @param {Object} recoveryResult - Recovery result from WranglerDeployer
   * @returns {string} User-friendly message
   */
  getRecoveryMessage(recoveryResult) {
    const messages = {
      'created_and_configured': `Created D1 database '${recoveryResult.databaseName}' and updated configuration`,
      'database_selected_and_configured': `Selected existing database '${recoveryResult.databaseName}' and updated configuration`,
      'binding_updated': `Updated D1 database binding configuration`,
      'cancelled': 'D1 error recovery was cancelled by user',
      'creation_failed': `Failed to create D1 database: ${recoveryResult.error}`,
      'selection_failed': `Failed to update database selection: ${recoveryResult.error}`,
      'no_databases_available': 'No D1 databases available in account',
      'manual': 'User chose to resolve D1 issues manually',
      'not_d1_error': 'Error is not related to D1 database bindings'
    };
    
    return messages[recoveryResult.action] || `D1 recovery completed with action: ${recoveryResult.action}`;
  }

  /**
   * Deploy worker with automatic D1 error recovery
   * 
   * @param {Function} deployFunction - Function to deploy worker
   * @param {Object} config - Deployment configuration
   * @returns {Promise<void>}
   */
  async deployWithRecovery(deployFunction, config = {}) {
    try {
      await deployFunction();
      console.log('   ✅ Worker deployed successfully');
    } catch (error) {
      // Attempt D1 error recovery
      const recoveryResult = await this.handleD1BindingError(error, config);
      
      if (recoveryResult.handled && recoveryResult.retry) {
        console.log('   🔄 Retrying deployment after D1 error recovery...');
        
        try {
          await deployFunction();
          console.log('   ✅ Worker deployed successfully after D1 recovery');
        } catch (retryError) {
          console.log('   ❌ Deployment failed even after D1 recovery');
          throw retryError;
        }
      } else if (recoveryResult.handled) {
        // Error was handled but no retry requested
        throw new Error(`Deployment failed: ${recoveryResult.message || error.message}`);
      } else {
        // Not a D1 error, rethrow original
        throw error;
      }
    }
  }

  /**
   * Get recovery statistics
   * 
   * @returns {Object} Recovery statistics
   */
  getStatistics() {
    const d1RollbackActions = this.rollbackActions.filter(
      action => action.type === 'restore-wrangler-config'
    );
    
    return {
      totalRecoveries: d1RollbackActions.length,
      hasBackups: d1RollbackActions.length > 0,
      latestBackup: d1RollbackActions[0]?.backupPath
    };
  }
}
