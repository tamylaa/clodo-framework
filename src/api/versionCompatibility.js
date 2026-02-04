/**
 * Version Compatibility API
 * Provides version checking and compatibility validation for programmatic integration
 */

import { FrameworkInfo } from '../version/FrameworkInfo.js';

/**
 * Compatibility Result Interface
 * @typedef {Object} CompatibilityResult
 * @property {boolean} compatible - Whether the application version is compatible
 * @property {string} frameworkVersion - Current framework version
 * @property {string} [minimumApplicationVersion] - Minimum required application version
 * @property {string[]} [breakingChanges] - List of breaking changes if incompatible
 * @property {string[]} [recommendations] - Recommended actions or updates
 */

/**
 * Check application compatibility with current framework version
 * @param {string} applicationVersion - Version of the consuming application
 * @returns {CompatibilityResult} Compatibility assessment
 */
export function checkApplicationCompatibility(applicationVersion) {
  const frameworkVersion = FrameworkInfo.getVersion();

  const result = {
    compatible: true,
    frameworkVersion,
    minimumApplicationVersion: '0.1.0',
    breakingChanges: [],
    recommendations: []
  };

  // Parse versions for comparison
  const parseVersion = (v) => v.split('.').map(n => parseInt(n, 10));
  const [appMajor, appMinor, appPatch] = parseVersion(applicationVersion);
  const [fwMajor, fwMinor, fwPatch] = parseVersion(frameworkVersion);

  // Version compatibility logic
  if (appMajor < 0 || (appMajor === 0 && appMinor < 1)) {
    result.compatible = false;
    result.breakingChanges.push(
      'Application version must be 0.1.0 or higher for programmatic API support'
    );
  }

  // Framework version specific checks
  if (fwMajor >= 5) {
    if (appMajor < 1) {
      result.recommendations.push(
        'Consider upgrading to application version 1.x for full feature support with framework 5.x'
      );
    }
  }

  // Known compatibility issues
  const knownIncompatibilities = {
    '0.0.1': ['Programmatic API not supported'],
    '0.0.2': ['Limited parameter validation'],
    '0.0.3': ['Missing error handling for passthrough data']
  };

  if (knownIncompatibilities[applicationVersion]) {
    result.compatible = false;
    result.breakingChanges.push(...knownIncompatibilities[applicationVersion]);
  }

  return result;
}

/**
 * Get supported application versions
 * @returns {string[]} Array of supported application version strings
 */
export function getSupportedApplicationVersions() {
  return [
    '0.1.0',
    '0.2.0',
    '0.3.0',
    '1.0.0',
    '1.1.0'
  ];
}

/**
 * Get framework version (convenience function)
 * @returns {string} Framework version string
 */
export function getFrameworkVersion() {
  return FrameworkInfo.getVersion();
}