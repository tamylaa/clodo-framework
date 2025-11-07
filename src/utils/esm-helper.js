/**
 * ESM Helper - Provides __dirname and __filename for ES modules
 * Handles both normal ESM environment and test environment transformation
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Get __filename and __dirname for current module
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @param {string} fallbackPath - fallback path relative to project root for tests
 * @returns {Object} - {__filename, __dirname}
 */
export function getFileInfo(importMetaUrl, fallbackPath) {
  try {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = dirname(__filename);
    return { __filename, __dirname };
  } catch (error) {
    // Fallback for test environment where import.meta is transformed
    const __dirname = join(process.cwd(), fallbackPath);
    const __filename = join(__dirname, 'index.js'); // Generic filename
    return { __filename, __dirname };
  }
}

/**
 * Get just __dirname for current module
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @param {string} fallbackPath - fallback path relative to project root for tests
 * @returns {string} - __dirname
 */
export function getDirname(importMetaUrl, fallbackPath) {
  return getFileInfo(importMetaUrl, fallbackPath).__dirname;
}

/**
 * Get just __filename for current module
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @param {string} fallbackPath - fallback path relative to project root for tests
 * @returns {string} - __filename
 */
export function getFilename(importMetaUrl, fallbackPath) {
  return getFileInfo(importMetaUrl, fallbackPath).__filename;
}
