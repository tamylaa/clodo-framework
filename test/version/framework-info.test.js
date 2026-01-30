/**
 * FrameworkInfo Unit Tests
 *
 * Tests the FrameworkInfo class for version detection and framework information
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock ES6 modules using unstable_mockModule for proper hoisting behavior
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn()
}));

jest.unstable_mockModule('process', () => ({
  cwd: jest.fn()
}));

jest.unstable_mockModule('path', () => ({
  resolve: jest.fn(),
  dirname: jest.fn()
}));

// Import mocked modules and FrameworkInfo with dynamic imports
const { readFileSync } = await import('fs');
const { cwd } = await import('process');
const { resolve, dirname } = await import('path');
const { FrameworkInfo } = await import('../../src/version/FrameworkInfo.js');

describe('FrameworkInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up mocks
    readFileSync.mockImplementation(() => '{}');
    cwd.mockReturnValue('/current/working/dir');
    resolve.mockImplementation((...args) => args.join('/'));
    dirname.mockImplementation((path) => path.split('/').slice(0, -1).join('/'));
  });

  describe('getVersion', () => {
    test('should return version from consuming service package.json', () => {
      const mockPackageJson = {
        dependencies: {
          '@tamyla/clodo-framework': '^4.0.13'
        }
      };

      readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const version = FrameworkInfo.getVersion('/test/service');
      expect(version).toBe('4.0.13');
      expect(readFileSync).toHaveBeenCalledWith('/test/service/package.json', 'utf8');
    });

    test('should return version from devDependencies', () => {
      const mockPackageJson = {
        devDependencies: {
          '@tamyla/clodo-framework': '~4.0.12'
        }
      };

      readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const version = FrameworkInfo.getVersion();
      expect(version).toBe('4.0.12');
    });

    test('should handle version ranges correctly', () => {
      const testCases = [
        { range: '^4.0.13', expected: '4.0.13' },
        { range: '~4.0.12', expected: '4.0.12' },
        { range: '>=4.0.0', expected: '4.0.0' },
        { range: '4.0.13', expected: '4.0.13' }
      ];

      testCases.forEach(({ range, expected }) => {
        const mockPackageJson = {
          dependencies: { '@tamyla/clodo-framework': range }
        };
        readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

        const version = FrameworkInfo.getVersion();
        expect(version).toBe(expected);
      });
    });

    test('should fallback to framework package.json when service package.json not found', () => {
      // Mock service package.json not found
      readFileSync
        .mockImplementationOnce(() => { throw new Error('File not found'); })
        .mockImplementationOnce(() => { throw new Error('File not found'); })
        .mockImplementationOnce(() => { throw new Error('File not found'); })
        .mockReturnValue(JSON.stringify({ version: '4.0.13' }));

      const version = FrameworkInfo.getVersion();
      expect(version).toBe('4.0.13');
    });

    test('should return unknown when version cannot be determined', () => {
      readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const version = FrameworkInfo.getVersion();
      expect(version).toBe('unknown');
    });
  });

  describe('getInfo', () => {
    test('should return complete framework information', () => {
      const mockPackageJson = {
        dependencies: { '@tamyla/clodo-framework': '^4.0.13' }
      };

      readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const info = FrameworkInfo.getInfo('/test/service');

      expect(info).toEqual({
        name: '@tamyla/clodo-framework',
        version: '4.0.13',
        detected: true,
        timestamp: expect.any(String),
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      });
    });

    test('should handle unknown version', () => {
      readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const info = FrameworkInfo.getInfo();

      expect(info.version).toBe('unknown');
      expect(info.detected).toBe(false);
    });
  });

  describe('meetsMinimumVersion', () => {
    beforeEach(() => {
      const mockPackageJson = {
        dependencies: { '@tamyla/clodo-framework': '^4.0.13' }
      };
      readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));
    });

    test('should return true when version meets minimum', () => {
      expect(FrameworkInfo.meetsMinimumVersion('4.0.10')).toBe(true);
      expect(FrameworkInfo.meetsMinimumVersion('4.0.13')).toBe(true);
      expect(FrameworkInfo.meetsMinimumVersion('4.0.0')).toBe(true);
    });

    test('should return false when version is below minimum', () => {
      expect(FrameworkInfo.meetsMinimumVersion('4.0.14')).toBe(false);
      expect(FrameworkInfo.meetsMinimumVersion('4.1.0')).toBe(false);
      expect(FrameworkInfo.meetsMinimumVersion('5.0.0')).toBe(false);
    });

    test('should return false when version is unknown', () => {
      readFileSync.mockImplementation(() => { throw new Error('File not found'); });

      expect(FrameworkInfo.meetsMinimumVersion('4.0.0')).toBe(false);
    });

    test('should handle patch version comparisons', () => {
      expect(FrameworkInfo.meetsMinimumVersion('4.0.12')).toBe(true); // 4.0.13 >= 4.0.12
      expect(FrameworkInfo.meetsMinimumVersion('4.0.13')).toBe(true); // 4.0.13 >= 4.0.13
      expect(FrameworkInfo.meetsMinimumVersion('4.0.14')).toBe(false); // 4.0.13 < 4.0.14
    });
  });
});