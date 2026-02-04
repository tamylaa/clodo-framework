/**
 * Integration Error Classes Tests
 */

import {
  IntegrationError,
  PayloadValidationError,
  ParameterNotSupportedError,
  VersionCompatibilityError
} from '../../src/errors/integrationErrors.js';

describe('IntegrationError', () => {
  it('should create error with message, code, and details', () => {
    const error = new IntegrationError('Test message', 'TEST_CODE', { key: 'value' });

    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ key: 'value' });
    expect(error.name).toBe('IntegrationError');
    expect(error instanceof Error).toBe(true);
  });

  it('should handle empty details', () => {
    const error = new IntegrationError('Test message', 'TEST_CODE');

    expect(error.details).toEqual({});
  });
});

describe('PayloadValidationError', () => {
  it('should create error with validation result', () => {
    const validationResult = {
      valid: false,
      errors: [
        { field: 'serviceName', code: 'REQUIRED', message: 'Required field' }
      ],
      warnings: []
    };

    const error = new PayloadValidationError(validationResult);

    expect(error.message).toBe('Service payload validation failed: 1 errors');
    expect(error.code).toBe('PAYLOAD_VALIDATION_FAILED');
    expect(error.details.validationResult).toBe(validationResult);
    expect(error.name).toBe('PayloadValidationError');
    expect(error instanceof IntegrationError).toBe(true);
  });
});

describe('ParameterNotSupportedError', () => {
  it('should create error with parameter and version info', () => {
    const error = new ParameterNotSupportedError('customField', '4.3.2');

    expect(error.message).toBe("Parameter 'customField' not supported in framework version 4.3.2");
    expect(error.code).toBe('PARAMETER_NOT_SUPPORTED');
    expect(error.details).toEqual({
      parameterName: 'customField',
      frameworkVersion: '4.3.2'
    });
    expect(error.name).toBe('ParameterNotSupportedError');
    expect(error instanceof IntegrationError).toBe(true);
  });
});

describe('VersionCompatibilityError', () => {
  it('should create error with version compatibility info', () => {
    const error = new VersionCompatibilityError('1.0.0', '4.3.2');

    expect(error.message).toBe('Application version 1.0.0 not compatible with framework version 4.3.2');
    expect(error.code).toBe('VERSION_INCOMPATIBILITY');
    expect(error.details).toEqual({
      applicationVersion: '1.0.0',
      frameworkVersion: '4.3.2'
    });
    expect(error.name).toBe('VersionCompatibilityError');
    expect(error instanceof IntegrationError).toBe(true);
  });
});