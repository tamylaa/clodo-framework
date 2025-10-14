/**
 * Cloudflare Operations Module
 * Standardized Cloudflare Workers and D1 operations
 * 
 * Consolidates cloudflare operations across 14+ scripts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { executeWithRateLimit } from '../utils/rate-limiter.js';
import { ErrorRecoveryManager } from '../utils/error-recovery.js';
import { SecureTokenManager } from '../security/secure-token-manager.js';
import { ProductionMonitor } from '../monitoring/production-monitor.js';
import { DatabaseConnectionManager } from '../database/connection-manager.js';
import { startMemoryMonitoring } from '../monitoring/memory-manager.js';
import { initializeGracefulShutdown } from '../utils/graceful-shutdown-manager.js';

const execAsync = promisify(exec);

// Error recovery for critical operations
const errorRecovery = new ErrorRecoveryManager({
  maxRetries: 2,
  retryDelay: 2000,
  circuitBreakerThreshold: 3,
  gracefulDegradation: true
});

// Secure token management
const tokenManager = new SecureTokenManager();

// Production monitoring
const monitor = new ProductionMonitor({
  logLevel: 'info',
  enableMetrics: true,
  enableAlerts: true
});

// Database connection management
const dbManager = new DatabaseConnectionManager({
  maxRetries: 2,
  retryDelay: 1000,
  connectionTimeout: 30000,
  queryTimeout: 60000,
  enableConnectionPooling: true,
  maxPoolSize: 5
});

// Memory management
const memoryManager = startMemoryMonitoring({
  gcInterval: 300000, // 5 minutes
  memoryThreshold: 0.8,
  cleanupInterval: 60000, // 1 minute
  leakDetection: true
});

// Graceful shutdown handling (lazy initialization to avoid sync issues)
let shutdownManager = null;

/**
 * Initialize graceful shutdown manager
 * Call this AFTER interactive input collection to avoid log interruption
 * @param {boolean} silent - Suppress registration message
 * @returns {Promise<GracefulShutdownManager>} Initialized shutdown manager
 */
export async function initializeShutdownManager(silent = false) {
  if (!shutdownManager) {
    shutdownManager = await initializeGracefulShutdown({
      dbManager,
      monitor,
      tokenManager,
      memoryManager
    }, {
      shutdownTimeout: 30000,
      forceShutdownTimeout: 5000
    });
    
    // Register with optional silent mode
    if (shutdownManager.register) {
      shutdownManager.register(silent);
    }
  }
  return shutdownManager;
}

// Initialize monitoring
let monitoringInitialized = false;
async function ensureMonitoringInitialized() {
  if (!monitoringInitialized) {
    await monitor.startMonitoring();
    monitoringInitialized = true;
  }
}

// Initialize secure token manager
let tokenManagerInitialized = false;
async function ensureTokenManagerInitialized() {
  if (!tokenManagerInitialized) {
    await tokenManager.initialize();
    tokenManagerInitialized = true;
  }
}

export async function checkAuth() {
  try {
    await ensureTokenManagerInitialized();
    // Try to get a valid token for Cloudflare API
    const tokens = tokenManager.listTokens('cloudflare');
    if (tokens.length === 0) {
      return false;
    }

    // Check if we have a non-expired token
    const validToken = tokens.find(token => new Date() < token.expires);
    return !!validToken;
  } catch (error) {
    return false;
  }
}

export async function authenticate() {
  try {
    // Use wrangler auth login for initial authentication
    await execAsync('npx wrangler auth login', { stdio: 'inherit' });

    // After successful login, we could extract and store the token securely
    // For now, rely on wrangler's built-in token management
    console.log('Authentication successful. Use storeCloudflareToken() to store API tokens securely.');
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

export async function storeCloudflareToken(token, metadata = {}) {
  await ensureTokenManagerInitialized();
  const fingerprint = await tokenManager.storeToken('cloudflare', token, {
    permissions: ['api_access', 'deployment'],
    environment: metadata.environment || 'production',
    ...metadata
  });
  console.log(`Cloudflare API token stored securely with fingerprint: ${fingerprint}`);
  return fingerprint;
}

export async function getCloudflareToken(requiredPermissions = ['api_access']) {
  await ensureTokenManagerInitialized();
  const tokens = tokenManager.listTokens('cloudflare');

  // Find a valid token with required permissions
  for (const tokenInfo of tokens) {
    if (new Date() < tokenInfo.expires && tokenManager.validatePermissions(tokenInfo.permissions, requiredPermissions)) {
      return await tokenManager.retrieveToken('cloudflare', tokenInfo.fingerprint, requiredPermissions);
    }
  }

  throw new Error('No valid Cloudflare API token found with required permissions');
}

export async function listWorkers() {
  try {
    const { stdout: list } = await executeWithRateLimit('npx wrangler list', 'workers');
    return list;
  } catch (error) {
    throw new Error(`Failed to list workers: ${error.message}`);
  }
}

export async function workerExists(workerName) {
  try {
    const list = await listWorkers();
    return list.includes(workerName);
  } catch (error) {
    return false; // Assume doesn't exist if can't check
  }
}

export async function deployWorker(env = 'production') {
  const startTime = Date.now();

  try {
    await ensureMonitoringInitialized();

    const result = await errorRecovery.executeWithRecovery(async () => {
      await executeWithRateLimit(`npm run deploy:${env}`, 'workers');
      return true;
    }, { operationId: `deployWorker_${env}` });

    const duration = Date.now() - startTime;
    monitor.recordRequest(true, duration, { operation: 'deployWorker', env });
    await monitor.log('info', 'Worker deployment successful', { env, duration });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.recordRequest(false, duration, { operation: 'deployWorker', env, error: error.message });
    await monitor.log('error', 'Worker deployment failed', { env, duration, error: error.message });

    throw new Error(`Worker deployment failed after retries: ${error.message}`);
  }
}

export async function deploySecret(key, value, env = 'production') {
  const command = process.platform === 'win32'
    ? `powershell -Command "Write-Output '${value}' | npx wrangler secret put ${key} --env ${env}"`
    : `echo "${value}" | npx wrangler secret put ${key} --env ${env}`;
  
  try {
    await executeWithRateLimit(command, 'workers', 3); // Lower retries for secrets
  } catch (error) {
    throw new Error(`Secret deployment failed: ${error.message}`);
  }
}

export async function deleteSecret(key, env = 'production') {
  try {
    await executeWithRateLimit(`npx wrangler secret delete ${key} --env ${env}`, 'workers');
  } catch (error) {
    throw new Error(`Secret deletion failed: ${error.message}`);
  }
}

export async function listSecrets(env = 'production') {
  try {
    const { stdout: list } = await executeWithRateLimit(`npx wrangler secret list --env ${env}`, 'workers');
    return list;
  } catch (error) {
    throw new Error(`Failed to list secrets: ${error.message}`);
  }
}

export async function listDatabases(options = {}) {
  const { apiToken, accountId } = options;
  
  // Use API-based operation if credentials provided
  if (apiToken && accountId) {
    const { CloudflareAPI } = await import('../../../src/utils/cloudflare/api.js');
    const cf = new CloudflareAPI(apiToken);
    return await cf.listD1Databases(accountId);
  }
  
  // Fallback to CLI-based operation
  try {
    const { stdout: list } = await executeWithRateLimit('npx wrangler d1 list', 'd1');
    return list;
  } catch (error) {
    throw new Error(`Failed to list databases: ${error.message}`);
  }
}

export async function databaseExists(databaseName, options = {}) {
  const { apiToken, accountId } = options;
  
  // Use API-based operation if credentials provided
  if (apiToken && accountId) {
    const { CloudflareAPI } = await import('../../../src/utils/cloudflare/api.js');
    const cf = new CloudflareAPI(apiToken);
    return await cf.d1DatabaseExists(accountId, databaseName);
  }
  
  // Fallback to CLI-based operation
  try {
    const list = await listDatabases();
    return list.includes(databaseName);
  } catch (error) {
    return false; // Assume doesn't exist if can't check
  }
}

export async function createDatabase(name, options = {}) {
  const { apiToken, accountId } = options;
  
  // Use API-based operation if credentials provided
  if (apiToken && accountId) {
    const { CloudflareAPI } = await import('../../../src/utils/cloudflare/api.js');
    const cf = new CloudflareAPI(apiToken);
    const result = await cf.createD1Database(accountId, name);
    return result.uuid; // Return UUID to match CLI behavior
  }
  
  // Fallback to CLI-based operation
  try {
    const { stdout: output } = await executeWithRateLimit(`npx wrangler d1 create ${name}`, 'd1');
    const idMatch = output.match(/database_id = "([^"]+)"/);
    if (!idMatch) {
      throw new Error('Could not extract database ID from creation output');
    }
    return idMatch[1];
  } catch (error) {
    throw new Error(`Database creation failed: ${error.message}`);
  }
}

export async function deleteDatabase(name) {
  try {
    await executeWithRateLimit(`npx wrangler d1 delete ${name} --skip-confirmation`, 'd1');
  } catch (error) {
    throw new Error(`Database deletion failed: ${error.message}`);
  }
}

export async function runMigrations(databaseName, env = 'production') {
  const startTime = Date.now();

  try {
    await ensureMonitoringInitialized();

    const result = await errorRecovery.executeWithRecovery(async () => {
      await executeWithRateLimit(`npx wrangler d1 migrations apply ${databaseName} --env ${env} --remote`, 'd1');
      return true;
    }, { operationId: `runMigrations_${databaseName}_${env}` });

    const duration = Date.now() - startTime;
    monitor.recordRequest(true, duration, { operation: 'runMigrations', databaseName, env });
    await monitor.log('info', 'Database migrations completed', { databaseName, env, duration });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.recordRequest(false, duration, { operation: 'runMigrations', databaseName, env, error: error.message });
    await monitor.log('warn', 'Database migrations had warnings', { databaseName, env, duration, error: error.message });

    return false; // Warnings are often OK
  }
}

export async function executeSql(databaseName, sql, env = 'production') {
  const startTime = Date.now();

  try {
    await ensureMonitoringInitialized();

    const result = await dbManager.executeQuery(databaseName, sql, { env });

    const duration = Date.now() - startTime;
    monitor.recordRequest(true, duration, { operation: 'executeSql', databaseName, env });
    await monitor.log('info', 'Database query executed successfully', {
      databaseName,
      env,
      duration,
      resultLength: result.result ? result.result.length : 0
    });

    return result.result;
  } catch (error) {
    const duration = Date.now() - startTime;
    monitor.recordRequest(false, duration, { operation: 'executeSql', databaseName, env, error: error.message });
    await monitor.log('error', 'Database query failed', { databaseName, env, duration, error: error.message });

    throw new Error(`SQL execution failed after retries: ${error.message}`);
  }
}

// Get database ID from list output
export async function getDatabaseId(databaseName, options = {}) {
  const { apiToken, accountId } = options;
  
  // Use API-based operation if credentials provided
  if (apiToken && accountId) {
    const { CloudflareAPI } = await import('../../../src/utils/cloudflare/api.js');
    const cf = new CloudflareAPI(apiToken);
    const db = await cf.getD1Database(accountId, databaseName);
    return db?.uuid || null;
  }
  
  // Fallback to CLI-based operation
  try {
    const list = await listDatabases();
    const lines = list.split('\n');
    for (const line of lines) {
      if (line.includes(databaseName)) {
        const match = line.match(/([a-f0-9-]{36})/);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Validate prerequisites
export async function validatePrerequisites() {
  const checks = [
    { name: 'Node.js', command: 'node --version' },
    { name: 'NPM', command: 'npm --version' },
    { name: 'Wrangler', command: 'npx wrangler --version' }
  ];

  const results = [];
  for (const check of checks) {
    try {
      const { stdout: version } = await execAsync(check.command, { encoding: 'utf8' });
      results.push({ name: check.name, status: 'ok', version: version.trim() });
    } catch (error) {
      results.push({ name: check.name, status: 'failed', error: error.message });
    }
  }
  
  return results;
}