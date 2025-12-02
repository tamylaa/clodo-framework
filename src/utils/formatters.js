/**
 * Name Formatters - Library Export
 * 
 * Re-exports NameFormatters from lib/ for library use.
 * 
 * IMPORTANT: Path accounts for compilation depth adjustment.
 * When compiled to dist/utils/formatters.js, the path '../lib/'
 * correctly resolves to dist/lib/ in npm packages.
 */

export { NameFormatters } from '../lib/shared/utils/formatters.js';

