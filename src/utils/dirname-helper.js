/**
 * Test-compatible __dirname utility
 * Handles both ESM (import.meta.url) and CommonJS (__dirname) environments
 */
import { fileURLToPath } from 'url';
import path from 'path';

export function getDirname(importMetaUrl) {
  // In test environment (CommonJS), use __dirname if available
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  
  // In ESM environment, use import.meta.url
  if (importMetaUrl) {
    const __filename = fileURLToPath(importMetaUrl);
    return path.dirname(__filename);
  }
  
  // Fallback
  return process.cwd();
}

export function getFilename(importMetaUrl) {
  // In test environment (CommonJS), use __filename if available
  if (typeof __filename !== 'undefined') {
    return __filename;
  }
  
  // In ESM environment, use import.meta.url
  if (importMetaUrl) {
    return fileURLToPath(importMetaUrl);
  }
  
  // Fallback
  return '';
}
