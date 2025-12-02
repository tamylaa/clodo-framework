/**
 * File Manager - Library Export
 * 
 * Re-exports FileManager from lib/ for library use.
 * 
 * IMPORTANT PATH CALCULATION FOR NPM PACKAGE:
 * - Source: src/utils/file-manager.js (2 levels from root)
 * - Compiled: dist/utils/file-manager.js (2 levels from root)
 * 
 * When installed via npm, structure is:
 *   node_modules/@tamyla/clodo-framework/
 *     dist/
 *       utils/file-manager.js
 *       lib/shared/utils/file-manager.js
 * 
 * From dist/utils/, need to go UP one level (../) to reach lib/
 * Source path must account for compilation depth adjustment
 */

export { FileManager } from '../lib/shared/utils/file-manager.js';

