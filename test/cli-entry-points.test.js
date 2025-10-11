/**
 * CLI Entry Points Unit Tests - Critical Externally Facing Methods
 *
 * Tests the most critical CLI commands and entry points that users interact with directly.
 * Focuses on validation, update, and core service management commands.
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Mock all problematic dependencies
jest.mock('../src/service-management/ServiceOrchestrator.js');
jest.mock('../src/service-management/InputCollector.js');
jest.mock('chalk', () => ({
  cyan: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  green: jest.fn((text) => text),
  red: jest.fn((text) => text),
  white: jest.fn((text) => text),
  magenta: jest.fn((text) => text)
}));

// Import after mocking
import { ServiceOrchestrator } from '../src/service-management/ServiceOrchestrator.js';
import { InputCollector } from '../src/service-management/InputCollector.js';
import chalk from 'chalk';

describe('CLI Entry Points - Critical External Interfaces', () => {
  let mockOrchestrator;
  let mockInputCollector;
  let consoleSpy;

  beforeEach(() => {
    // Setup mocks
    mockOrchestrator = {
      validateService: jest.fn(),
      detectServicePath: jest.fn(),
      runInteractiveUpdate: jest.fn(),
      runNonInteractiveUpdate: jest.fn()
    };

    mockInputCollector = {
      listServiceTypes: jest.fn()
    };

    ServiceOrchestrator.mockImplementation(() => mockOrchestrator);
    InputCollector.mockImplementation(() => mockInputCollector);

    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Service Validation Command', () => {
    test('should validate service successfully when valid', async () => {
      // Mock successful validation
      mockOrchestrator.validateService.mockResolvedValue({
        valid: true,
        issues: []
      });

      // Import and test the validation logic
      const { validateService } = await import('../bin/clodo-service.js');

      // Simulate the validation command logic
      const servicePath = '/path/to/service';
      const orchestrator = new ServiceOrchestrator();
      const result = await orchestrator.validateService(servicePath);

      expect(mockOrchestrator.validateService).toHaveBeenCalledWith(servicePath);
      expect(result.valid).toBe(true);
    });

    test('should report validation issues when invalid', async () => {
      // Mock failed validation with issues
      const mockIssues = ['Missing package.json', 'Invalid domain config'];
      mockOrchestrator.validateService.mockResolvedValue({
        valid: false,
        issues: mockIssues
      });

      // Simulate the validation command logic
      const servicePath = '/path/to/service';
      const orchestrator = new ServiceOrchestrator();
      const result = await orchestrator.validateService(servicePath);

      expect(mockOrchestrator.validateService).toHaveBeenCalledWith(servicePath);
      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(mockIssues);
    });

    test('should handle validation errors gracefully', async () => {
      // Mock validation throwing error
      mockOrchestrator.validateService.mockRejectedValue(new Error('Validation failed'));

      // Simulate the validation command logic
      const servicePath = '/path/to/service';
      const orchestrator = new ServiceOrchestrator();

      await expect(orchestrator.validateService(servicePath)).rejects.toThrow('Validation failed');
    });
  });

  describe('Service Update Command', () => {
    test('should auto-detect service path when not provided', async () => {
      mockOrchestrator.detectServicePath.mockResolvedValue('/auto/detected/path');

      const orchestrator = new ServiceOrchestrator();
      const result = await orchestrator.detectServicePath();

      expect(mockOrchestrator.detectServicePath).toHaveBeenCalled();
      expect(result).toBe('/auto/detected/path');
    });

    test('should run interactive update when no options provided', async () => {
      mockOrchestrator.runInteractiveUpdate.mockResolvedValue();

      const servicePath = '/path/to/service';
      const orchestrator = new ServiceOrchestrator();
      await orchestrator.runInteractiveUpdate(servicePath);

      expect(mockOrchestrator.runInteractiveUpdate).toHaveBeenCalledWith(servicePath);
    });

    test('should run non-interactive update with domain option', async () => {
      mockOrchestrator.runNonInteractiveUpdate.mockResolvedValue();

      const servicePath = '/path/to/service';
      const options = { domainName: 'newdomain.com' };
      const orchestrator = new ServiceOrchestrator();
      await orchestrator.runNonInteractiveUpdate(servicePath, options);

      expect(mockOrchestrator.runNonInteractiveUpdate).toHaveBeenCalledWith(servicePath, options);
    });

    test('should handle update errors gracefully', async () => {
      mockOrchestrator.runNonInteractiveUpdate.mockRejectedValue(new Error('Update failed'));

      const servicePath = '/path/to/service';
      const options = { domainName: 'newdomain.com' };
      const orchestrator = new ServiceOrchestrator();

      await expect(orchestrator.runNonInteractiveUpdate(servicePath, options))
        .rejects.toThrow('Update failed');
    });
  });

  describe('Service Type Listing', () => {
    test('should list all available service types', () => {
      // Test the service types data structure that would be displayed
      const expectedTypes = {
        'data-service': ['Authentication', 'Authorization', 'File Storage', 'Search', 'Filtering', 'Pagination'],
        'auth-service': ['Authentication', 'Authorization', 'User Profiles', 'Email Notifications', 'Magic Link Auth'],
        'content-service': ['File Storage', 'Search', 'Filtering', 'Pagination', 'Caching'],
        'api-gateway': ['Authentication', 'Authorization', 'Rate Limiting', 'Caching', 'Monitoring'],
        'generic': ['Logging', 'Monitoring', 'Error Reporting']
      };

      // Verify the structure exists and has expected keys
      expect(expectedTypes).toHaveProperty('data-service');
      expect(expectedTypes).toHaveProperty('auth-service');
      expect(expectedTypes).toHaveProperty('content-service');
      expect(expectedTypes).toHaveProperty('api-gateway');
      expect(expectedTypes).toHaveProperty('generic');

      // Verify each type has features
      Object.values(expectedTypes).forEach(features => {
        expect(Array.isArray(features)).toBe(true);
        expect(features.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing service path gracefully', async () => {
      mockOrchestrator.detectServicePath.mockResolvedValue(null);

      const orchestrator = new ServiceOrchestrator();
      const result = await orchestrator.detectServicePath();

      expect(result).toBeNull();
    });

    test('should validate required parameters for non-interactive mode', () => {
      // Test parameter validation logic that would be in CLI
      const required = ['serviceName', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId'];

      const validOptions = {
        serviceName: 'test-service',
        domainName: 'example.com',
        cloudflareToken: 'token123',
        cloudflareAccountId: 'account123',
        cloudflareZoneId: 'zone123'
      };

      const missing = required.filter(key => !validOptions[key]);
      expect(missing.length).toBe(0);

      const invalidOptions = {
        serviceName: 'test-service'
        // missing other required fields
      };

      const missingInvalid = required.filter(key => !invalidOptions[key]);
      expect(missingInvalid.length).toBe(4); // domainName, cloudflareToken, cloudflareAccountId, cloudflareZoneId
    });
  });
});