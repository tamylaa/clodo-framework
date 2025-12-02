/**
 * Cloudflare Operations - Library Export
 * 
 * This module re-exports CLI operations from bin/ for use by the library.
 * It gets compiled to dist/ and is included in the published package.
 * 
 * IMPORTANT: Path is adjusted for compilation depth
 * src/utils/cloudflare/ops.js (3 levels) -> dist/utils/cloudflare/ops.js (3 levels)
 * From dist/utils/cloudflare/, need ../../lib/ (up 2 to dist, then lib)
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
} from '../../lib/shared/cloudflare/ops.js';

