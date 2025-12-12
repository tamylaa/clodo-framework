/**
 * Wrangler Compatibility Detector
 *
 * Automatically detects Wrangler version and provides optimal configuration
 * to prevent deployment failures due to compatibility issues.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Wrangler Compatibility Detector
 * Handles version detection and optimal configuration generation
 */
export class WranglerCompatibilityDetector {
  /**
   * Detects the installed Wrangler version
   * @returns {Promise<string>} Wrangler version string
   */
  async detectVersion() {
    try {
      const { stdout } = await execAsync('npx wrangler --version');
      const version = stdout.trim();

      // Validate version format (e.g., "3.15.0", "4.0.0")
      if (!this.isValidVersion(version)) {
        console.warn(`⚠️  Detected Wrangler version '${version}' may not be valid. Using fallback detection.`);
        return this.fallbackDetection();
      }

      return version;
    } catch (error) {
      console.warn(`⚠️  Failed to detect Wrangler version: ${error.message}`);
      return this.fallbackDetection();
    }
  }

  /**
   * Validates version string format
   * @param {string} version - Version string to validate
   * @returns {boolean} True if version format is valid
   */
  isValidVersion(version) {
    // Match semantic versioning (e.g., 3.15.0, 4.0.0-beta.1)
    const versionRegex = /^\d+\.\d+\.\d+(-[\w\.\-]+)?$/;
    return versionRegex.test(version);
  }

  /**
   * Fallback version detection when direct detection fails
   * @returns {string} Fallback version string
   */
  fallbackDetection() {
    // Check for wrangler in package.json
    try {
      const fs = require('fs');
      const path = require('path');

      // Look for wrangler in package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const wranglerVersion = packageJson.dependencies?.wrangler ||
                               packageJson.devDependencies?.wrangler;

        if (wranglerVersion) {
          // Extract version from semver range (e.g., "^3.15.0" -> "3.15.0")
          const cleanVersion = wranglerVersion.replace(/[^\d.]/g, '');
          if (cleanVersion) {
            console.log(`📋 Using Wrangler version from package.json: ${cleanVersion}`);
            return cleanVersion;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Fallback detection failed: ${error.message}`);
    }

    // Default to latest stable version
    console.log('📋 Using default Wrangler version: 4.0.0');
    return '4.0.0';
  }

  /**
   * Gets optimal Wrangler configuration for the detected version
   * @param {string} version - Wrangler version
   * @returns {Object} Optimal configuration object
   */
  getOptimalConfig(version) {
    const majorVersion = parseInt(version.split('.')[0]);

    if (majorVersion >= 4) {
      // Wrangler v4+ uses nodejs_compat flag
      return {
        nodejs_compat: true
      };
    } else if (majorVersion >= 3) {
      // Wrangler v3 uses compatibility_flags array
      return {
        compatibility_flags: ["nodejs_compat"]
      };
    } else {
      // Wrangler v2 and below - minimal compatibility
      return {
        compatibility_flags: []
      };
    }
  }

  /**
   * Gets build configuration optimized for the Wrangler version
   * @param {string} version - Wrangler version
   * @returns {Object} Build configuration object
   */
  getBuildConfig(version) {
    const majorVersion = parseInt(version.split('.')[0]);

    const baseConfig = {
      command: "npm run build",
      upload: {
        format: "modules"
      }
    };

    // Add Node.js module externalization for v3+
    if (majorVersion >= 3) {
      baseConfig.upload.external = {
        include: ["node:*"]
      };
    }

    return baseConfig;
  }

  /**
   * Validates if current configuration is optimal for the Wrangler version
   * @param {Object} config - Current Wrangler configuration
   * @param {string} version - Wrangler version
   * @returns {Object} Validation result with issues and suggestions
   */
  validateConfig(config, version) {
    const issues = [];
    const optimalConfig = this.getOptimalConfig(version);

    // Check Node.js compatibility settings
    if (optimalConfig.nodejs_compat !== undefined) {
      if (config.nodejs_compat !== optimalConfig.nodejs_compat) {
        issues.push({
          type: 'COMPATIBILITY_CONFIG',
          severity: 'ERROR',
          message: `nodejs_compat should be ${optimalConfig.nodejs_compat} for Wrangler ${version}`,
          fix: `Set nodejs_compat = ${optimalConfig.nodejs_compat} in wrangler.toml`
        });
      }
    } else if (optimalConfig.compatibility_flags) {
      const hasNodejsCompat = config.compatibility_flags?.includes('nodejs_compat');
      const shouldHaveNodejsCompat = optimalConfig.compatibility_flags.includes('nodejs_compat');

      if (hasNodejsCompat !== shouldHaveNodejsCompat) {
        issues.push({
          type: 'COMPATIBILITY_FLAGS',
          severity: 'ERROR',
          message: `compatibility_flags should ${shouldHaveNodejsCompat ? 'include' : 'exclude'} "nodejs_compat" for Wrangler ${version}`,
          fix: shouldHaveNodejsCompat
            ? 'Add "nodejs_compat" to compatibility_flags array'
            : 'Remove "nodejs_compat" from compatibility_flags array'
        });
      }
    }

    return {
      isValid: issues.filter(issue => issue.severity === 'ERROR').length === 0,
      issues
    };
  }

  /**
   * Generates a complete optimized Wrangler configuration
   * @param {string} version - Wrangler version
   * @param {Object} baseConfig - Base configuration to extend
   * @returns {Object} Complete optimized configuration
   */
  generateOptimalConfig(version, baseConfig = {}) {
    const optimalConfig = this.getOptimalConfig(version);
    const buildConfig = this.getBuildConfig(version);

    return {
      ...baseConfig,
      ...optimalConfig,
      build: {
        ...buildConfig,
        ...(baseConfig.build || {})
      }
    };
  }
}

// Export singleton instance for convenience
export const wranglerCompatibility = new WranglerCompatibilityDetector();