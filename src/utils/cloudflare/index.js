/**
 * Cloudflare Utilities - Unified Exports
 * 
 * This module provides a unified interface for all Cloudflare operations.
 * 
 * ## Architecture:
 * 
 * ### API-Based Operations (api.js)
 * Use for operations that interact directly with Cloudflare's REST API:
 * - Token verification
 * - Zone/domain listing and discovery
 * - Zone details retrieval
 * - D1 database listing
 * - Account information
 * 
 * Benefits: No CLI dependency, programmatic control, better for automation
 * 
 * ### CLI-Based Operations (../../bin/shared/cloudflare/ops.js)
 * Use for operations that require wrangler CLI:
 * - Worker deployment
 * - Secret management (put/list/delete)
 * - Database migrations
 * - SQL execution
 * 
 * Benefits: Leverages wrangler's built-in features, rate limiting, monitoring
 * 
 * ## Usage:
 * 
 * ```javascript
 * // For API operations
 * import { CloudflareAPI } from '@tamyla/clodo-framework/utils/cloudflare';
 * 
 * const cf = new CloudflareAPI(apiToken);
 * const zones = await cf.listZones();
 * const zoneDetails = await cf.getZoneDetails(zoneId);
 * 
 * // For CLI operations
 * import { deployWorker, deploySecret, listSecrets } from '@tamyla/clodo-framework/utils/cloudflare';
 * 
 * await deployWorker('production');
 * await deploySecret('API_KEY', 'secret-value', 'production');
 * const secrets = await listSecrets('production');
 * ```
 */

// API-based operations
export { 
  CloudflareAPI,
  formatZonesForDisplay,
  parseZoneSelection
} from './api.js';

// CLI-based operations (re-export from compiled ops.js)
export {
  // Authentication
  checkAuth,
  authenticate,
  storeCloudflareToken,
  getCloudflareToken,
  
  // Worker operations
  listWorkers,
  workerExists,
  deployWorker,
  
  // Secret operations
  deploySecret,
  deleteSecret,
  listSecrets,
  
  // D1 Database operations
  listDatabases,
  databaseExists,
  createDatabase,
  deleteDatabase,
  runMigrations,
  executeSql,
  getDatabaseId,
  
  // Utilities
  validatePrerequisites
} from './ops.js';

/**
 * Helper: Choose the right tool for the job
 * 
 * Use CloudflareAPI when:
 * - You need to verify an API token
 * - You want to list/discover zones/domains
 * - You need zone details (zone_id, account_id, etc.)
 * - You're building interactive domain selection UI
 * - You want programmatic control without CLI dependency
 * 
 * Use ops.js functions when:
 * - You need to deploy workers
 * - You need to manage secrets (set/list/delete)
 * - You need to run database migrations
 * - You need to execute SQL queries
 * - You want built-in retry logic and monitoring
 */
