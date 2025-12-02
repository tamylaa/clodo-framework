/**
 * Clodo Framework Security Module
 * Comprehensive security validation and management for Clodo services
 */

import { ConfigurationValidator } from './ConfigurationValidator.js';
// DeploymentManager removed - replaced by MultiDomainOrchestrator + WranglerConfigManager
import { SecretGenerator } from './SecretGenerator.js';
// InteractiveDeploymentConfigurator removed - replaced by InputCollector

export { ConfigurationValidator } from './ConfigurationValidator.js';
// export { DeploymentManager } - DEPRECATED: Use MultiDomainOrchestrator instead
export { SecretGenerator } from './SecretGenerator.js';
// export { InteractiveDeploymentConfigurator } - DEPRECATED: Use InputCollector instead

// Re-export patterns and rules for advanced usage
export { INSECURE_PATTERNS } from './patterns/insecure-patterns.js';
export { ENVIRONMENT_REQUIREMENTS, getEnvironmentRequirements } from './patterns/environment-rules.js';

// Main security validation function for easy access
export function validateSecurity(config, environment = 'production') {
  return ConfigurationValidator.validate(config, environment);
}

// Main secure deployment function
export async function deployWithSecurity(options) {
  throw new Error('deployWithSecurity is deprecated. Use MultiDomainOrchestrator instead.');
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
  // Error handler - provides structured error response
  const errorResponse = {
    error: error.message || 'Deployment failed',
    code: error.code || 'DEPLOYMENT_ERROR',
    context,
    timestamp: new Date().toISOString()
  };
  
  if (error.stack) {
    errorResponse.stack = error.stack;
  }
  
  return errorResponse;
}

// Main configuration function
export async function generateConfiguration(defaults = {}) {
  throw new Error('generateConfiguration is deprecated. Use InputCollector instead.');
}
