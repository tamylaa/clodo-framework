/**
 * Environment-Specific Security Rules
 * Defines security requirements for different deployment environments
 */

export const ENVIRONMENT_REQUIREMENTS = {
  production: {
    minSecretLength: 32,
    requireHttps: true,
    allowDummyKeys: false,
    requireStrongJWT: true,
    allowLocalhostUrls: false,
    minKeyEntropy: 4.0, // bits of entropy per character
    requireComplexPasswords: true,
    maxDummyKeyTolerance: 0
  },

  staging: {
    minSecretLength: 24,
    requireHttps: true,
    allowDummyKeys: false,
    requireStrongJWT: true,
    allowLocalhostUrls: false,
    minKeyEntropy: 3.5,
    requireComplexPasswords: true,
    maxDummyKeyTolerance: 0
  },

  development: {
    minSecretLength: 16,
    requireHttps: false,
    allowDummyKeys: true,
    requireStrongJWT: false,
    allowLocalhostUrls: true,
    minKeyEntropy: 2.0,
    requireComplexPasswords: false,
    maxDummyKeyTolerance: 5 // Allow some dummy keys for development
  },

  testing: {
    minSecretLength: 8,
    requireHttps: false,
    allowDummyKeys: true,
    requireStrongJWT: false,
    allowLocalhostUrls: true,
    minKeyEntropy: 1.0,
    requireComplexPasswords: false,
    maxDummyKeyTolerance: 10
  }
};

/**
 * Get environment requirements with fallback to production
 * @param {string} environment - Environment name
 * @returns {Object} Environment security requirements
 */
export function getEnvironmentRequirements(environment) {
  return ENVIRONMENT_REQUIREMENTS[environment] || ENVIRONMENT_REQUIREMENTS.production;
}

/**
 * Validate environment name
 * @param {string} environment - Environment to validate
 * @returns {boolean} True if environment is valid
 */
export function isValidEnvironment(environment) {
  return Object.keys(ENVIRONMENT_REQUIREMENTS).includes(environment);
}