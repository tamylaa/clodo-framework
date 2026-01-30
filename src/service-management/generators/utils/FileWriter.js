/**
 * FileWriter - Handles atomic file writing operations
 * 
 * Provides safe file writing with directory creation, overwrite protection,
 * and atomic operations.
 * 
 * NOTE: This class uses Node.js filesystem APIs and is designed for
 * build-time usage during service generation, not runtime in Cloudflare Workers.
 */
import { promises as fs } from 'fs';
import path from 'path';

export class FileWriter {
  /**
   * Create a new file writer instance
   * @param {Object} options - Configuration options
   * @param {string} options.basePath - Base path for all file operations
   * @param {boolean} options.dryRun - If true, simulate writes without actually writing (default: false)
   */
  constructor(options = {}) {
    this.basePath = options.basePath;
    this.dryRun = options.dryRun === true;
    this.writtenFiles = [];
  }

  /**
   * Write content to a file
   * Creates parent directories if they don't exist
   * @param {string} filePath - Path relative to basePath (or absolute)
   * @param {string} content - File content to write
   * @param {Object} options - Write options
   * @param {boolean} options.overwrite - Whether to overwrite existing files (default: true)
   * @param {string} options.encoding - File encoding (default: 'utf8')
   * @returns {Promise<Object>} - Result object { written: boolean, path: string, reason?: string }
   */
  async writeFile(filePath, content, options = {}) {
    const overwrite = options.overwrite !== false; // Default to true
    const encoding = options.encoding || 'utf8';

    // Resolve full path
    const fullPath = this.basePath ? path.join(this.basePath, filePath) : filePath;

    // Validate path (security check)
    if (this.basePath) {
      const resolved = path.resolve(fullPath);
      const baseResolved = path.resolve(this.basePath);
      if (!resolved.startsWith(baseResolved)) {
        throw new Error(`Path traversal detected: ${filePath}`);
      }
    }

    // Check if file exists
    const exists = await this.fileExists(fullPath);
    if (exists && !overwrite) {
      return {
        written: false,
        path: fullPath,
        reason: 'File exists and overwrite is disabled'
      };
    }

    // Dry run mode
    if (this.dryRun) {
      this.writtenFiles.push(fullPath);
      return {
        written: true,
        path: fullPath,
        dryRun: true
      };
    }

    // Ensure parent directory exists
    const dirPath = path.dirname(fullPath);
    await this.ensureDirectory(dirPath);

    // Write file atomically (write to temp file, then rename)
    const tempPath = `${fullPath}.tmp`;
    try {
      // Write to temp file first
      await fs.writeFile(tempPath, content, encoding);
      
      // Small delay to ensure file is fully written on Windows
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify temp file exists before rename (prevents ENOENT)
      await fs.access(tempPath);
      
      // Rename to final destination
      await fs.rename(tempPath, fullPath);
      
      this.writtenFiles.push(fullPath);
      
      return {
        written: true,
        path: fullPath
      };
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write file '${filePath}': ${errorMessage}`);
    }
  }

  /**
   * Ensure a directory exists, creating it recursively if needed
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectory(dirPath) {
    if (this.dryRun) {
      return; // Skip in dry run mode
    }

    try {
      await fs.mkdir(dirPath, { recursive: true });
      // Verify the directory was created
      await fs.access(dirPath);
    } catch (error) {
      // Ignore error if directory already exists
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create directory '${dirPath}': ${error.message}`);
      }
    }
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   * @param {string} filePath - Path to delete
   * @returns {Promise<boolean>} - True if file was deleted
   */
  async deleteFile(filePath) {
    const fullPath = this.basePath ? path.join(this.basePath, filePath) : filePath;

    if (this.dryRun) {
      return true;
    }

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // File doesn't exist
      }
      throw new Error(`Failed to delete file '${filePath}': ${error.message}`);
    }
  }

  /**
   * Get list of files written in this session
   * @returns {string[]} - Array of file paths
   */
  getWrittenFiles() {
    return [...this.writtenFiles];
  }

  /**
   * Clear the written files list
   */
  clearHistory() {
    this.writtenFiles = [];
  }

  /**
   * Get statistics about write operations
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      filesWritten: this.writtenFiles.length,
      dryRun: this.dryRun,
      basePath: this.basePath
    };
  }
}

export default FileWriter;

