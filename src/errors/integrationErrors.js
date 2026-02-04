/**
 * Integration-specific Error Classes
 * Provides structured error handling for programmatic API integration
 */

/**
 * Base class for integration-related errors
 */
export class IntegrationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code for programmatic handling
   * @param {Object} details - Additional error details
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error thrown when service payload validation fails
 */
export class PayloadValidationError extends IntegrationError {
  /**
   * @param {Object} validationResult - Result from validateServicePayload
   */
  constructor(validationResult) {
    super(
      `Service payload validation failed: ${validationResult.errors.length} errors`,
      'PAYLOAD_VALIDATION_FAILED',
      { validationResult }
    );
    this.name = 'PayloadValidationError';
  }
}

/**
 * Error thrown when a parameter is not supported in the current framework version
 */
export class ParameterNotSupportedError extends IntegrationError {
  /**
   * @param {string} parameterName - Name of the unsupported parameter
   * @param {string} frameworkVersion - Current framework version
   */
  constructor(parameterName, frameworkVersion) {
    super(
      `Parameter '${parameterName}' not supported in framework version ${frameworkVersion}`,
      'PARAMETER_NOT_SUPPORTED',
      { parameterName, frameworkVersion }
    );
    this.name = 'ParameterNotSupportedError';
  }
}

/**
 * Error thrown when application version is incompatible with framework version
 */
export class VersionCompatibilityError extends IntegrationError {
  /**
   * @param {string} applicationVersion - Application version
   * @param {string} frameworkVersion - Framework version
   */
  constructor(applicationVersion, frameworkVersion) {
    super(
      `Application version ${applicationVersion} not compatible with framework version ${frameworkVersion}`,
      'VERSION_INCOMPATIBILITY',
      { applicationVersion, frameworkVersion }
    );
    this.name = 'VersionCompatibilityError';
  }
}