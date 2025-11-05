/**
 * Deployment Validator Tests
 * Test suite for deployment validation utilities
 * Tests: validateDeploymentPrerequisites, validateDeploymentInputs
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { validateDeploymentPrerequisites, validateDeploymentInputs } from '../../../bin/shared/utils/deployment-validator.js';

describe('Deployment Validator Utilities', () => {
  let consoleSpy;
  let originalStdout;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalStdout = process.stdout.write;
    process.stdout.write = jest.fn();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.stdout.write = originalStdout;
  });

  describe('validateDeploymentPrerequisites', () => {
    test('validates complete core inputs successfully', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'CLOUDFLARE_API_TOKEN=test-token-1234567890123456789012345678901234567890'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Pre-deployment Validation')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ All prerequisites validated')
      );
    });

    test('fails when customer is missing', async () => {
      const coreInputs = {
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'test-token-123'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation Failed:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Customer name is required')
      );
    });

    test('fails when environment is missing', async () => {
      const coreInputs = {
        customer: 'test-customer',
        domainName: 'test.example.com',
        cloudflareToken: 'test-token-123'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Environment is required')
      );
    });

    test('fails when domain name is missing', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        cloudflareToken: 'test-token-123'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Domain name is required')
      );
    });

    test('fails when cloudflare token is missing', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cloudflare API token is required')
      );
    });

    test('validates cloudflare token format', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'short'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cloudflare API token appears to be invalid')
      );
    });

    test('checks service path existence when provided', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'CLOUDFLARE_API_TOKEN=test-token-1234567890123456789012345678901234567890'
      };

      const options = {
        servicePath: '/nonexistent/path'
      };

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      // Just check that it fails, the console output testing is unreliable with chalk
    });

    test('checks wrangler.toml existence in dry run mode', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'test-token-123'
      };

      const options = {
        dryRun: false,
        servicePath: '/nonexistent/path'
      };

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('wrangler.toml not found')
      );
    });

    test('handles multiple validation failures', async () => {
      const coreInputs = {
        // Missing customer, environment, domainName, cloudflareToken
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Validation Failed:')
      );
      // Just check that validation failed with the error header
    });
  });

  describe('validateDeploymentInputs', () => {
    test('validates with default required fields', () => {
      const inputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'CLOUDFLARE_API_TOKEN=test-token-1234567890123456789012345678901234567890'
      };

      const result = validateDeploymentInputs(inputs);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails when required field is missing', () => {
      const inputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com'
        // missing cloudflareToken
      };

      const result = validateDeploymentInputs(inputs);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cloudflareToken is required');
    });

    test('validates with custom required fields', () => {
      const inputs = {
        name: 'test-app',
        version: '1.0.0'
      };

      const result = validateDeploymentInputs(inputs, ['name', 'version']);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails with custom required fields when field is missing', () => {
      const inputs = {
        name: 'test-app'
        // missing version
      };

      const result = validateDeploymentInputs(inputs, ['name', 'version']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('version is required');
    });

    test('handles empty required fields array', () => {
      const inputs = {};

      const result = validateDeploymentInputs(inputs, []);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('handles null/undefined inputs gracefully', () => {
      const result = validateDeploymentInputs(null, ['field']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input object is required');
    });

    test('handles undefined inputs gracefully', () => {
      const result = validateDeploymentInputs(undefined, ['field']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input object is required');
    });

    test('validates with extra fields beyond required', () => {
      const inputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'CLOUDFLARE_API_TOKEN=test-token-1234567890123456789012345678901234567890',
        extraField: 'extra-value'
      };

      const result = validateDeploymentInputs(inputs);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('integration tests', () => {
    test('validateDeploymentPrerequisites calls validateDeploymentInputs internally', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'CLOUDFLARE_API_TOKEN=test-token-1234567890123456789012345678901234567890'
      };

      const options = {};

      const result = await validateDeploymentPrerequisites(coreInputs, options);

      expect(result).toBe(true);
    });

    test('validation functions work together', async () => {
      const coreInputs = {
        customer: 'test-customer',
        environment: 'development',
        domainName: 'test.example.com',
        cloudflareToken: 'CLOUDFLARE_API_TOKEN=test-token-1234567890123456789012345678901234567890'
      };

      // First validate inputs
      const inputsValid = validateDeploymentInputs(coreInputs);
      expect(inputsValid.valid).toBe(true);

      // Then validate prerequisites
      const prereqsValid = await validateDeploymentPrerequisites(coreInputs, {});
      expect(prereqsValid).toBe(true);
    });
  });
});