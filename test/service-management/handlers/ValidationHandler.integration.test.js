import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock fs/promises before importing modules
await jest.unstable_mockModule('fs/promises', () => ({
  default: { readFile: jest.fn(), access: jest.fn() },
  readFile: jest.fn(),
  access: jest.fn()
}));

// Mock ConfigurationValidator
await jest.unstable_mockModule('../../../src/security/ConfigurationValidator.js', () => ({
  ConfigurationValidator: {
    validateServiceConfig: jest.fn()
  }
}));

const fs = await import('fs/promises');
const { ConfigurationValidator } = await import('../../../src/security/ConfigurationValidator.js');
const { ValidationHandler } = await import('../../../src/service-management/handlers/ValidationHandler.js');

describe('ValidationHandler - Configuration integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should include configuration mismatch issues when manifest exists and validation fails', async () => {
    // Arrange
    const servicePath = '/tmp/test-service';

    // Make access succeed for manifest candidate
    fs.access.mockResolvedValueOnce(); // manifest exists

    // Mock ConfigurationValidator response
    ConfigurationValidator.validateServiceConfig.mockReturnValueOnce({ valid: false, issues: [{ message: 'D1 mismatch' }] });

    const handler = new ValidationHandler();

    // Act
    const result = await handler.validateService(servicePath);

    // Assert
    expect(result.issues.some(i => typeof i === 'string' && i.includes('Configuration mismatch'))).toBe(true);
  });

  test('should warn when no manifest found', async () => {
    const servicePath = '/tmp/test-service-2';

    // access throws to simulate missing manifest
    fs.access.mockRejectedValue(new Error('Not found'));

    const handler = new ValidationHandler();
    const result = await handler.validateService(servicePath);

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(i => typeof i === 'string' && (
      i.includes('No service manifest') ||
      i.includes('Missing required file') ||
      i.includes('wrangler.toml') ||
      i.includes('Domain configuration')
    ))).toBe(true);
  });
});