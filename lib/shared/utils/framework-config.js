/**
 * Framework Configuration - Library Export Wrapper
 * 
 * Re-exports FrameworkConfig from src/utils for library use.
 * This wrapper pattern allows consistent imports from within lib/shared.
 * 
 * IMPORTANT PATH CALCULATION FOR NPM PACKAGE:
 * - Source: lib/shared/utils/framework-config.js
 * - Compiled: dist/lib/shared/utils/framework-config.js
 * 
 * When installed via npm, structure is:
 *   node_modules/@tamyla/clodo-framework/
 *     dist/
 *       utils/framework-config.js
 *       lib/shared/utils/framework-config.js (this wrapper)
 * 
 * From dist/lib/shared/utils/, need to go UP 3 levels (../../../) to reach utils/
 */

export { FrameworkConfig, frameworkConfig, getFrameworkConfig } from '../../../src/utils/framework-config.js';
