/**
 * Deployment Verification Helpers (UI Wrapper)
 * Provides UI-specific deployment verification by delegating to shared infrastructure
 */

import { verifyWorkerDeployment, healthCheckWithBackoff, checkHealth } from '@tamyla/clodo-framework';
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

  // Skip health checks in dry-run mode with clear explanation
  if (options.dryRun) {
    console.log(chalk.blue('   ℹ️  Health checks skipped in dry-run mode'));
    console.log(chalk.gray('   💡 Run without --dry-run to deploy and verify the worker'));
    return {
      success: true,
      healthCheckPassed: null,
      reason: 'dry-run-skipped'
    };
  }

  try {
    // Wait for deployment to propagate
    console.log('   ⏳ Waiting for deployment to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run health checks with enhanced URL discovery
    console.log('   🏥 Running health checks...');
    
    // Try multiple sources for worker URL (in priority order)
    const workerUrl = await discoverWorkerUrl(deploymentResult, credentials, options);
    
    if (workerUrl) {
      console.log(chalk.gray(`   🔗 Testing: ${workerUrl}`));
      
      const health = await checkHealth(workerUrl).catch(err => {
        console.log(chalk.yellow(`   ⚠️  Health check failed: ${err.message}`));
        return { status: 'unknown', error: err.message };
      });
      
      if (health && health.status === 'ok') {
        console.log(`   ✅ Deployment verified: ${health.framework?.models?.length || 0} models active`);
        return {
          success: true,
          healthCheckPassed: true,
          healthData: health,
          url: workerUrl
        };
      } else {
        console.log(`   ⚠️ Health check returned: ${health?.status || 'unknown'}`);
        if (health.error) {
          console.log(chalk.gray(`   Error: ${health.error}`));
        }
        // Don't fail deployment for health check issues
        return {
          success: true,
          healthCheckPassed: false,
          healthData: health,
          url: workerUrl
        };
      }
    } else {
      console.log(chalk.yellow('   ⚠️  No worker URL could be determined'));
      console.log(chalk.gray('   💡 To fix: Add route in wrangler.toml or check Cloudflare dashboard'));
      return {
        success: true,
        healthCheckPassed: null,
        reason: 'no-url-discovered'
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
 * Discover worker URL from multiple sources
 * Priority: deploymentResult.url > workers.dev convention > Cloudflare API discovery
 * @param {Object} deploymentResult - Result from deployment
 * @param {Object} credentials - Cloudflare credentials
 * @param {Object} options - Discovery options
 * @returns {Promise<string|null>} Discovered worker URL or null
 */
async function discoverWorkerUrl(deploymentResult, credentials, options = {}) {
  // Source 1: Direct URL from deployment result
  if (deploymentResult?.url) {
    return deploymentResult.url;
  }

  // Source 2: Construct workers.dev URL from credentials
  if (credentials?.cloudflareSettings?.accountId && options.serviceName) {
    const accountHash = credentials.cloudflareSettings.accountId;
    const scriptName = options.serviceName || 'my-worker';
    const workersDevUrl = `https://${scriptName}.${accountHash}.workers.dev`;
    
    // Verify this URL exists by checking if we can reach it
    const urlExists = await verifyUrlExists(workersDevUrl);
    if (urlExists) {
      return workersDevUrl;
    }
  }

  // Source 3: Query Cloudflare API for worker routes
  if (credentials?.cloudflareSettings) {
    const discoveredUrl = await discoverUrlFromCloudflare(credentials.cloudflareSettings, options);
    if (discoveredUrl) {
      return discoveredUrl;
    }
  }

  // Source 4: Custom domain from options
  if (options.customDomain) {
    return `https://${options.customDomain}`;
  }

  return null;
}

/**
 * Verify if a URL exists (can be reached)
 * @param {string} url - URL to verify
 * @returns {Promise<boolean>} True if URL responds
 */
async function verifyUrlExists(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok || response.status === 404; // 404 means route exists but no handler
  } catch {
    return false;
  }
}

/**
 * Discover worker URL from Cloudflare API
 * @param {Object} cloudflareSettings - Cloudflare credentials
 * @param {Object} options - Discovery options
 * @returns {Promise<string|null>} Discovered URL or null
 */
async function discoverUrlFromCloudflare(cloudflareSettings, options = {}) {
  try {
    const { CloudflareAPI } = await import('../../../utils/cloudflare/api.js');
    const api = new CloudflareAPI(cloudflareSettings.token);

    // Get worker routes for the zone
    if (cloudflareSettings.zoneId) {
      const response = await api.request(`/zones/${cloudflareSettings.zoneId}/workers/routes`);
      const routes = response.result || [];
      
      if (routes.length > 0) {
        // Find route for this worker
        const scriptName = options.serviceName || options.workerName;
        const matchingRoute = routes.find(r => 
          r.script && (r.script === scriptName || r.script.includes(scriptName))
        );
        
        if (matchingRoute && matchingRoute.pattern) {
          // Convert route pattern to URL (basic conversion)
          const url = matchingRoute.pattern.replace('*', '').replace('//', '//');
          return url.startsWith('http') ? url : `https://${url}`;
        }
      }
    }

    // Fallback: Get worker info from scripts API
    const scriptsResponse = await api.request(`/accounts/${cloudflareSettings.accountId}/workers/scripts`);
    const scripts = scriptsResponse.result || [];
    const scriptName = options.serviceName || options.workerName;
    const script = scripts.find(s => s.id === scriptName || s.id.includes(scriptName));
    
    if (script && script.url) {
      return script.url;
    }

  } catch (error) {
    // API discovery failed - not critical
    if (options.verbose) {
      console.log(chalk.gray(`   Could not discover URL from Cloudflare API: ${error.message}`));
    }
  }

  return null;
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
