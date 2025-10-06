/**
 * Lego Framework Security Module
 * Comprehensive security validation and management for Lego services
 */

export { ConfigurationValidator } from './ConfigurationValidator.js';
export { DeploymentManager } from './DeploymentManager.js';
export { SecretGenerator } from './SecretGenerator.js';

// Re-export patterns and rules for advanced usage
export { INSECURE_PATTERNS } from './patterns/insecure-patterns.js';
export { ENVIRONMENT_REQUIREMENTS, getEnvironmentRequirements } from './patterns/environment-rules.js';

// Main security validation function for easy access
export function validateSecurity(config, environment = 'production') {
  // eslint-disable-next-line no-undef
  return ConfigurationValidator.validate(config, environment);
}

// Main secure deployment function
export async function deployWithSecurity(options) {
  // eslint-disable-next-line no-undef
  return DeploymentManager.deployWithSecurity(options);
}

// Main key generation function
export function generateSecureKey(type = 'api', options = {}) {
  const { length = 32, prefix = '' } = options;

  if (type === 'jwt') {
    // eslint-disable-next-line no-undef
    return SecretGenerator.generateSecureJwtSecret(length);
  }

  // eslint-disable-next-line no-undef
  return SecretGenerator.generateSecureApiKey(length, prefix);
}