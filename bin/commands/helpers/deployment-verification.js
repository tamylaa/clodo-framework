/**
 * Deployment Verification Helpers (UI Wrapper)
 * Provides UI-specific deployment verification by delegating to shared infrastructure
 */

import { verifyWorkerDeployment, healthCheckWithBackoff } from '../../shared/monitoring/health-checker.js';
import chalk from 'chalk';
import readline from 'readline';

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
