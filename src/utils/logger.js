/**
 * Logger - Library Export
 * 
 * Re-exports Logger from lib/ for library use.
 * 
 * IMPORTANT: Path accounts for compilation depth adjustment.
 * When compiled to dist/utils/logger.js, the path '../lib/'
 * correctly resolves to dist/lib/ in npm packages.
 */

export { Logger } from '../lib/shared/logging/Logger.js';

