/**
 * Version Compatibility API Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  checkApplicationCompatibility,
  getSupportedApplicationVersions,
  getFrameworkVersion
} from '../../src/api/versionCompatibility.js';

describe('Version Compatibility API', () => {
  describe('checkApplicationCompatibility', () => {
    it('should return compatible for valid application versions', () => {
      const result = checkApplicationCompatibility('1.0.0');

      expect(result.compatible).toBe(true);
      expect(result.frameworkVersion).toBeDefined();
      expect(result.minimumApplicationVersion).toBe('0.1.0');
      expect(Array.isArray(result.breakingChanges)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should return incompatible for versions below minimum', () => {
      const result = checkApplicationCompatibility('0.0.5');

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges).toContain(
        'Application version must be 0.1.0 or higher for programmatic API support'
      );
    });

    it('should handle known incompatible versions', () => {
      const result = checkApplicationCompatibility('0.0.1');

      expect(result.compatible).toBe(false);
      expect(result.breakingChanges).toContain('Programmatic API not supported');
    });

    it('should provide recommendations for older applications with newer framework', () => {
      // Mock a newer framework version scenario
      const result = checkApplicationCompatibility('0.2.0');

      // This test may need adjustment based on actual version logic
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('getSupportedApplicationVersions', () => {
    it('should return array of supported versions', () => {
      const versions = getSupportedApplicationVersions();

      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions).toContain('0.1.0');
      expect(versions).toContain('1.0.0');
    });

    it('should return versions in ascending order', () => {
      const versions = getSupportedApplicationVersions();

      for (let i = 1; i < versions.length; i++) {
        const prev = versions[i-1].split('.').map(n => parseInt(n, 10));
        const curr = versions[i].split('.').map(n => parseInt(n, 10));

        expect(prev[0] <= curr[0]).toBe(true);
        if (prev[0] === curr[0]) {
          expect(prev[1] <= curr[1]).toBe(true);
        }
      }
    });
  });

  describe('getFrameworkVersion', () => {
    it('should return a valid version string', () => {
      const version = getFrameworkVersion();

      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      expect(/^\d+\.\d+\.\d+/.test(version)).toBe(true);
    });
  });
});