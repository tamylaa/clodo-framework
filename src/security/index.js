/**
 * Lego Framework Security Module
 * Comprehensive security validation and management for Lego services
 */

import { ConfigurationValidator } from './ConfigurationValidator.js';
import { DeploymentManager } from './DeploymentManager.js';
import { SecretGenerator } from './SecretGenerator.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { InteractiveDeploymentConfigurator } from '../config/ConfigurationManager.js';

export { ConfigurationValidator } from './ConfigurationValidator.js';
export { DeploymentManager } from './DeploymentManager.js';
export { SecretGenerator } from './SecretGenerator.js';
export { ErrorHandler } from '../utils/ErrorHandler.js';
export { InteractiveDeploymentConfigurator } from '../config/ConfigurationManager.js';

// Re-export patterns and rules for advanced usage
export { INSECURE_PATTERNS } from './patterns/insecure-patterns.js';
export { ENVIRONMENT_REQUIREMENTS, getEnvironmentRequirements } from './patterns/environment-rules.js';

// Main security validation function for easy access
export function validateSecurity(config, environment = 'production') {
  return ConfigurationValidator.validate(config, environment);
}

// Main secure deployment function
export async function deployWithSecurity(options) {
  return DeploymentManager.deployWithSecurity(options);
}

// Main key generation function
export function generateSecureKey(type = 'api', options = {}) {
  const { length = 32, prefix = '' } = options;

  if (type === 'jwt') {
    return SecretGenerator.generateSecureJwtSecret(length);
  }

  return SecretGenerator.generateSecureApiKey(length, prefix);
}

// Main error handling function
export function handleDeploymentError(error, context = {}) {
  return ErrorHandler.handleDeploymentError(error, context);
}

// Main configuration function
export async function generateConfiguration(defaults = {}) {
  return InteractiveDeploymentConfigurator.generateFromUserInput(defaults);
}