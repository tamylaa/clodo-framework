/**
 * Cloudflare Operations - Library Export
 * 
 * This module re-exports CLI operations from bin/ for use by the library.
 * It gets compiled to dist/ and is included in the published package.
 */

export {
  checkAuth,
  authenticate,
  storeCloudflareToken,
  getCloudflareToken,
  listWorkers,
  workerExists,
  deployWorker,
  deploySecret,
  deleteSecret,
  listSecrets,
  listDatabases,
  databaseExists,
  createDatabase,
  deleteDatabase,
  runMigrations,
  executeSql,
  getDatabaseId,
  validatePrerequisites
} from '../bin/shared/cloudflare/ops.js';
