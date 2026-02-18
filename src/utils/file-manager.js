/**
 * File Manager - Library Export
 * 
 * Re-exports FileManager from lib/ for library use.
 * 
 * IMPORTANT PATH CALCULATION:
 * - Source: src/utils/file-manager.js
 * - Compiled: dist/utils/file-manager.js
 * - Target: dist/lib/shared/utils/file-manager.js
 * - From dist/utils/, path to dist/lib/ is ../lib/
 */

export { FileManager } from '../lib/shared/utils/file-manager.js';

