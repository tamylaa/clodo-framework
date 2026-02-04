/**
 * Framework Capabilities API
 * Provides programmatic access to framework capabilities and supported features
 */

import { FrameworkInfo } from '../version/FrameworkInfo.js';
import { getConfig } from '../config/service-schema-config.js';

/**
 * Framework Capabilities Interface
 * @typedef {Object} FrameworkCapabilities
 * @property {string} version - Current framework version
 * @property {boolean} supportsProgrammaticCreation - Whether programmatic service creation is supported
 * @property {string[]} supportedServiceTypes - Array of supported service types
 * @property {string[]} supportedFeatures - Array of supported features
 * @property {boolean} hasParameterDiscovery - Whether parameter discovery API is available
 * @property {boolean} hasUnifiedValidation - Whether unified payload validation is available
 * @property {boolean} supportsPassthrough - Whether clodo passthrough data is supported
 */

/**
 * Get framework capabilities
 * @returns {FrameworkCapabilities} Framework capabilities object
 */
export function getFrameworkCapabilities() {
  const config = getConfig();

  return {
    version: FrameworkInfo.getVersion(),
    supportsProgrammaticCreation: true,
    supportedServiceTypes: [...config.serviceTypes],
    supportedFeatures: [...config.features],
    hasParameterDiscovery: true,
    hasUnifiedValidation: true,
    supportsPassthrough: true
  };
}

/**
 * Get framework version
 * @returns {string} Framework version string
 */
export function getFrameworkVersion() {
  return FrameworkInfo.getVersion();
}