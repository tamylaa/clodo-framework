/**
 * Resource Detection Helpers
 * Detects existing Cloudflare resources (workers, databases) for change tracking
 */

import chalk from 'chalk';

/**
 * Detect existing resources to show what will change
 * @param {string} serviceName - Name of the service
 * @param {Object} manifest - Service manifest
 * @param {Object} credentials - Cloudflare credentials
 * @param {Object} output - Output formatter
 * @param {boolean} verbose - Verbose logging flag
 * @returns {Promise<Object>} Detected resources
 */
export async function detectExistingResources(serviceName, manifest, credentials, output, verbose = false) {
  let existingWorker = null;
  let existingDatabases = [];
  let resourceDetectionFailed = false;

  try {
  // Import CloudflareAPI to check existing resources
  const { CloudflareAPI } = await import('../../../src/utils/cloudflare/api.js');
  const cfApi = new CloudflareAPI(credentials.token);

    // Check if worker already exists
    const workers = await cfApi.listWorkers(credentials.accountId);
    existingWorker = workers.find(w => w.name === serviceName);

    // Check existing databases
    existingDatabases = await cfApi.listD1Databases(credentials.accountId);
  } catch (error) {
    resourceDetectionFailed = true;
    if (verbose && output) {
      output.warn(`Could not detect existing resources: ${error.message}`);
    }
  }

  return {
    existingWorker,
    existingDatabases,
    resourceDetectionFailed
  };
}

/**
 * Display deployment plan with change detection badges
 * @param {Object} planData - Deployment plan data
 */
export function displayDeploymentPlan(planData) {
  const {
    serviceName,
    serviceType,
    selectedDomain,
    environment,
    credentials,
    dryRun,
    existingWorker,
    existingDatabases,
    resourceDetectionFailed,
    manifest
  } = planData;

  console.log(chalk.cyan('\n📋 Deployment Plan:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.white(`Service:         ${serviceName}`));
  console.log(chalk.white(`Type:            ${serviceType}`));
  console.log(chalk.white(`Domain:          ${selectedDomain}`));
  console.log(chalk.white(`Environment:     ${environment || 'production'}`));
  console.log(chalk.white(`Account:         ${credentials.accountId.substring(0, 8)}...`));
  console.log(chalk.white(`Zone:            ${credentials.zoneId.substring(0, 8)}...`));
  console.log(chalk.white(`Deployment Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`));
  console.log(chalk.gray('─'.repeat(60)));

  // Show what will be deployed with change badges
  console.log(chalk.cyan('\n📦 Resources:'));
  
  // Worker status
  if (existingWorker) {
    const lastModified = existingWorker.modifiedOn ? 
      new Date(existingWorker.modifiedOn).toLocaleString() : 'unknown';
    console.log(chalk.yellow(`  [CHANGE] Worker: ${serviceName}`));
    console.log(chalk.gray(`           Last deployed: ${lastModified}`));
  } else if (!resourceDetectionFailed) {
    console.log(chalk.green(`  [NEW]    Worker: ${serviceName}`));
  } else {
    console.log(chalk.white(`  [DEPLOY] Worker: ${serviceName}`));
  }

  // Database status (if manifest has database config)
  if (manifest.database && manifest.database.name) {
    const dbName = manifest.database.name;
    const existingDb = existingDatabases.find(db => 
      db.name === dbName || db.name === `${serviceName}-${dbName}`
    );
    
    if (existingDb) {
      console.log(chalk.yellow(`  [CHANGE] Database: ${dbName} (binding update)`));
    } else if (!resourceDetectionFailed) {
      console.log(chalk.green(`  [NEW]    Database: ${dbName}`));
    } else {
      console.log(chalk.white(`  [DEPLOY] Database: ${dbName}`));
    }
  }

  // Routes
  const workersDomain = `${serviceName}.${credentials.accountId}.workers.dev`;
  console.log(chalk.green(`  [NEW]    Route: https://${workersDomain}`));
  
  if (selectedDomain && selectedDomain !== 'workers.cloudflare.com') {
    console.log(chalk.yellow(`  [MANUAL] Custom domain: ${selectedDomain}`));
    console.log(chalk.gray(`           ⚠️  Requires DNS configuration (see post-deployment steps)`));
  }

  console.log(chalk.gray('─'.repeat(60)));

  if (dryRun) {
    console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
  }
}
