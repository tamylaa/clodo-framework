/**
 * Framework Info Module
 * Provides version detection and framework information
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Framework Information and Version Detection
 */
export class FrameworkInfo {

  /**
   * Get the current framework version from the consuming service's package.json
   * @param {string} serviceRoot - Root directory of the consuming service (optional)
   * @returns {string} Framework version or 'unknown' if not found
   */
  static getVersion(serviceRoot = null) {
    try {
      // Try to find package.json in the consuming service
      const searchPaths = [
        serviceRoot,
        process.cwd(),
        resolve(process.cwd(), '..'),
        resolve(process.cwd(), '../..')
      ].filter(Boolean);

      for (const searchPath of searchPaths) {
        try {
          const packagePath = resolve(searchPath, 'package.json');
          const packageContent = readFileSync(packagePath, 'utf8');
          const packageJson = JSON.parse(packageContent);

          // Check for the framework dependency
          const frameworkDep = packageJson.dependencies?.['@tamyla/clodo-framework'] ||
                              packageJson.devDependencies?.['@tamyla/clodo-framework'];

          if (frameworkDep) {
            // Extract version from semver range (e.g., "^4.0.11" -> "4.0.11", ">=4.0.0" -> "4.0.0")
            const version = frameworkDep.replace(/^[^\d]*/, '').split(/[\s-]/)[0];
            return version || frameworkDep;
          }
        } catch (error) {
          // Continue searching other paths
          continue;
        }
      }

      // Fallback: try to get version from the framework's own package.json
      try {
        const frameworkPackagePath = resolve(__dirname, '../../package.json');
        const frameworkPackage = JSON.parse(readFileSync(frameworkPackagePath, 'utf8'));
        return frameworkPackage.version || 'unknown';
      } catch (error) {
        return 'unknown';
      }

    } catch (error) {
      console.warn('Framework version detection failed:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get detailed framework information
   * @param {string} serviceRoot - Root directory of the consuming service (optional)
   * @returns {Object} Framework information object
   */
  static getInfo(serviceRoot = null) {
    const version = this.getVersion(serviceRoot);

    return {
      name: '@tamyla/clodo-framework',
      version: version,
      detected: version !== 'unknown',
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Check if the current version meets minimum requirements
   * @param {string} minVersion - Minimum required version
   * @param {string} serviceRoot - Root directory of the consuming service (optional)
   * @returns {boolean} True if version meets requirements
   */
  static meetsMinimumVersion(minVersion, serviceRoot = null) {
    const currentVersion = this.getVersion(serviceRoot);

    if (currentVersion === 'unknown') {
      return false;
    }

    try {
      const current = currentVersion.split('.').map(Number);
      const minimum = minVersion.split('.').map(Number);

      for (let i = 0; i < Math.max(current.length, minimum.length); i++) {
        const currentPart = current[i] || 0;
        const minimumPart = minimum[i] || 0;

        if (currentPart > minimumPart) return true;
        if (currentPart < minimumPart) return false;
      }

      return true; // versions are equal
    } catch (error) {
      console.warn('Version comparison failed:', error.message);
      return false;
    }
  }
}