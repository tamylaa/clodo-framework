/**
 * Rollback Manager - Deployment Module Re-export
 *
 * Re-exports the RollbackManager from the source implementation.
 * Both this wrapper and the implementation compile to dist/ with the same relative paths.
 * In npm packages, this resolves to dist/deployment/rollback-manager.js
 */

export { RollbackManager } from '@tamyla/clodo-framework/deployment';