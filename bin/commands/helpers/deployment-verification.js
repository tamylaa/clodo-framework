/**
 * Deployment Verification Helpers (UI Wrapper)
 * Provides UI-specific deployment verification by delegating to shared infrastructure
 */

import { verifyWorkerDeployment, healthCheckWithBackoff } from '../../shared/monitoring/health-checker.js';
import { checkHealth } from '../../shared/monitoring/health-checker.js';
import chalk from 'chalk';
import readline from 'readline';

/**
 * Run comprehensive post-deployment verification
 * @param {string} serviceName - Name of the service
 * @param {Object} deploymentResult - Result from deployment
 * @param {Object} credentials - Cloudflare credentials
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Verification result
 */
export async function runPostDeploymentVerification(serviceName, deploymentResult, credentials, options = {}) {
  console.log('\n🔍 Post-deployment Verification');

  try {
    // Wait for deployment to propagate
    console.log('   ⏳ Waiting for deployment to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Run health checks
    console.log('   🏥 Running health checks...');
    const workerUrl = deploymentResult?.url || options.workerUrl;
    
    if (workerUrl) {
      const health = await checkHealth(workerUrl).catch(err => {
        console.log(chalk.yellow(`   ⚠️  Health check skipped: ${err.message}`));
        return { status: 'unknown' };
      });
      
      if (health && health.status === 'ok') {
        console.log(`   ✅ Deployment verified: ${health.framework?.models?.length || 0} models active`);
        return {
          success: true,
          healthCheckPassed: true,
          healthData: health
        };
      } else {
        console.log(`   ⚠️ Health check returned: ${health?.status || 'unknown'}`);
        // Don't fail deployment for health check issues
        return {
          success: true,
          healthCheckPassed: false,
          healthData: health
        };
      }
    } else {
      console.log(chalk.yellow('   ⚠️  No worker URL available for health checks'));
      return {
        success: true,
        healthCheckPassed: null,
        reason: 'no-url'
      };
    }

  } catch (error) {
    console.log(chalk.yellow(`   ⚠️  Post-deployment verification warning: ${error.message}`));
    // Don't fail overall deployment for verification issues
    return {
      success: true,
      healthCheckPassed: false,
      error: error.message
    };
  }
}

/**
 * Verify deployment via Cloudflare API (UI wrapper)
 * @param {string} workerName - Name of the worker to verify
 * @param {Object} credentials - Cloudflare credentials
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Verification result
 */
export async function verifyDeployment(workerName, credentials, options = {}) {
  // Delegate to shared infrastructure
  return await verifyWorkerDeployment(workerName, credentials, options);
}

/**
 * Perform health check with user permission prompt
 * @param {string} baseUrl - Base URL to check
 * @param {Object} options - Health check options
 * @returns {Promise<Object>} Health check result
 */
export async function performHealthCheckWithPermission(baseUrl, options = {}) {
  const { skipPrompt = false, ...healthOptions } = options;
  
  if (!skipPrompt) {
    const permission = await promptForHealthCheck();
    if (!permission) {
      console.log(chalk.yellow('\n⏭️  Health check skipped by user'));
      return { healthy: null, skipped: true };
    }
  }
  
  console.log(chalk.gray('\n🏥 Running health checks with exponential backoff...\n'));
  
  // Delegate to shared infrastructure
  return await healthCheckWithBackoff(baseUrl, healthOptions);
}

/**
 * Prompt user for health check permission
 * @returns {Promise<boolean>} Whether to proceed with health check
 */
async function promptForHealthCheck() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      chalk.cyan('\n❓ Run health checks to verify deployment? (Y/n): '),
      (answer) => {
        rl.close();
        resolve(!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      }
    );
  });
}
