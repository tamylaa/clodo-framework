/**
 * Centralized File Manager
 * Replaces: 12 scattered file operation implementations
 * Savings: 200+ lines
 */

import { 
  readFileSync, writeFileSync, appendFileSync,
  existsSync, mkdirSync, statSync
} from 'fs';
import { dirname, basename } from 'path';

export class FileManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.enableCache = options.enableCache !== false;
    this.createBackups = options.createBackups !== false;
    this.backupDir = options.backupDir || '.backups';
  }

  /**
   * Read JSON configuration file
   */
  readConfig(path, defaultValue = null) {
    try {
      if (this.enableCache && this.cache.has(path)) {
        return this.cache.get(path);
      }
      
      if (!existsSync(path)) {
        if (defaultValue !== null) return defaultValue;
        throw new Error(`Configuration file not found: ${path}`);
      }
      
      const content = readFileSync(path, 'utf8');
      const data = JSON.parse(content);
      
      if (this.enableCache) {
        this.cache.set(path, data);
      }
      
      return data;
    } catch (error) {
      if (error.message.includes('JSON')) {
        throw new Error(`Invalid JSON in configuration file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write JSON configuration file with optional backup
   */
  writeConfig(path, data, options = {}) {
    try {
      // Create backup if needed
      if (this.createBackups && existsSync(path)) {
        this.createBackup(path);
      }
      
      // Ensure directory exists
      this.ensureDir(dirname(path));
      
      // Write file
      const content = JSON.stringify(data, null, 2);
      writeFileSync(path, content, 'utf8');
      
      // Clear cache
      if (this.enableCache) {
        this.cache.delete(path);
      }
      
      return { success: true, path };
    } catch (error) {
      throw new Error(`Failed to write configuration: ${error.message}`);
    }
  }

  /**
   * Read text file
   */
  readFile(path) {
    if (!existsSync(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return readFileSync(path, 'utf8');
  }

  /**
   * Write text file
   */
  writeFile(path, content) {
    this.ensureDir(dirname(path));
    writeFileSync(path, content, 'utf8');
  }

  /**
   * Append to file
   */
  appendFile(path, content) {
    this.ensureDir(dirname(path));
    appendFileSync(path, content, 'utf8');
  }

  /**
   * Check if file exists
   */
  exists(path) {
    return existsSync(path);
  }

  /**
   * Ensure directory exists
   */
  ensureDir(dir) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Create backup of file
   */
  createBackup(path) {
    this.ensureDir(this.backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = basename(path);
    const backupPath = `${this.backupDir}/${fileName}.${timestamp}.bak`;
    
    const content = readFileSync(path, 'utf8');
    writeFileSync(backupPath, content, 'utf8');
    
    return backupPath;
  }

  /**
   * Get file stats
   */
  getStats(path) {
    if (!existsSync(path)) {
      return null;
    }
    return statSync(path);
  }

  /**
   * Clear cache
   */
  clearCache(path = null) {
    if (path) {
      this.cache.delete(path);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Export singleton instance
 */
export const fileManager = new FileManager();
