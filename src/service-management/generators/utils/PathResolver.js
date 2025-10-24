/**
 * PathResolver - Handles cross-platform path resolution
 * 
 * Provides platform-independent path operations with security checks
 * and consistent path handling across Windows, Linux, and macOS.
 */
import path from 'path';

export class PathResolver {
  /**
   * Create a new path resolver instance
   * @param {Object} options - Configuration options
   * @param {string} options.basePath - Base path for all path operations
   */
  constructor(options = {}) {
    this.basePath = options.basePath;
  }

  /**
   * Resolve a path relative to the base path
   * @param {...string} paths - Path segments to resolve
   * @returns {string} - Resolved absolute path
   */
  resolve(...paths) {
    if (this.basePath) {
      return path.resolve(this.basePath, ...paths);
    }
    return path.resolve(...paths);
  }

  /**
   * Join path segments
   * @param {...string} paths - Path segments to join
   * @returns {string} - Joined path
   */
  join(...paths) {
    return path.join(...paths);
  }

  /**
   * Normalize a path (resolve . and .., convert slashes)
   * @param {string} filepath - Path to normalize
   * @returns {string} - Normalized path
   */
  normalize(filepath) {
    return path.normalize(filepath);
  }

  /**
   * Get the relative path from one location to another
   * @param {string} from - Starting path
   * @param {string} to - Target path
   * @returns {string} - Relative path
   */
  relative(from, to) {
    return path.relative(from, to);
  }

  /**
   * Get the directory name of a path
   * @param {string} filepath - File path
   * @returns {string} - Directory name
   */
  dirname(filepath) {
    return path.dirname(filepath);
  }

  /**
   * Get the base name of a path (filename with extension)
   * @param {string} filepath - File path
   * @param {string} ext - Optional extension to remove
   * @returns {string} - Base name
   */
  basename(filepath, ext) {
    return path.basename(filepath, ext);
  }

  /**
   * Get the extension of a path
   * @param {string} filepath - File path
   * @returns {string} - Extension (including the dot)
   */
  extname(filepath) {
    return path.extname(filepath);
  }

  /**
   * Check if a path is absolute
   * @param {string} filepath - Path to check
   * @returns {boolean} - True if absolute
   */
  isAbsolute(filepath) {
    return path.isAbsolute(filepath);
  }

  /**
   * Validate a path for security (no path traversal outside base)
   * @param {string} filepath - Path to validate
   * @returns {boolean} - True if path is safe
   * @throws {Error} - If path attempts to traverse outside base
   */
  validatePath(filepath) {
    if (!this.basePath) {
      return true; // No base path, can't validate
    }

    const resolved = path.resolve(this.basePath, filepath);
    const baseResolved = path.resolve(this.basePath);

    if (!resolved.startsWith(baseResolved)) {
      throw new Error(`Path traversal detected: ${filepath} resolves outside base path`);
    }

    return true;
  }

  /**
   * Convert a path to use forward slashes (for URLs, cross-platform consistency)
   * @param {string} filepath - Path to convert
   * @returns {string} - Path with forward slashes
   */
  toForwardSlashes(filepath) {
    return filepath.split(path.sep).join('/');
  }

  /**
   * Convert a path to use the platform's native separators
   * @param {string} filepath - Path to convert
   * @returns {string} - Path with native separators
   */
  toNativeSeparators(filepath) {
    return filepath.split('/').join(path.sep);
  }

  /**
   * Get the platform-specific path separator
   * @returns {string} - Path separator ('/' or '\')
   */
  getSeparator() {
    return path.sep;
  }

  /**
   * Parse a path into its components
   * @param {string} filepath - Path to parse
   * @returns {Object} - Path components { root, dir, base, ext, name }
   */
  parse(filepath) {
    return path.parse(filepath);
  }

  /**
   * Format path components into a path string
   * @param {Object} pathObject - Path components
   * @returns {string} - Formatted path
   */
  format(pathObject) {
    return path.format(pathObject);
  }
}

export default PathResolver;
