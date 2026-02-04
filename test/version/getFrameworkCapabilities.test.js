/**
 * Framework Capabilities API Tests
 */

import { getFrameworkCapabilities, getFrameworkVersion } from '../../src/api/frameworkCapabilities.js';
import { getConfig } from '../../src/config/service-schema-config.js';

describe('getFrameworkCapabilities', () => {
  it('should return framework capabilities object with expected structure', () => {
    const capabilities = getFrameworkCapabilities();

    expect(capabilities).toHaveProperty('version');
    expect(typeof capabilities.version).toBe('string');
    expect(capabilities.version.length).toBeGreaterThan(0);

    expect(capabilities).toHaveProperty('supportsProgrammaticCreation', true);
    expect(capabilities).toHaveProperty('hasParameterDiscovery', true);
    expect(capabilities).toHaveProperty('hasUnifiedValidation', true);
    expect(capabilities).toHaveProperty('supportsPassthrough', true);

    expect(capabilities).toHaveProperty('supportedServiceTypes');
    expect(Array.isArray(capabilities.supportedServiceTypes)).toBe(true);
    expect(capabilities.supportedServiceTypes.length).toBeGreaterThan(0);

    expect(capabilities).toHaveProperty('supportedFeatures');
    expect(Array.isArray(capabilities.supportedFeatures)).toBe(true);
    expect(capabilities.supportedFeatures.length).toBeGreaterThan(0);
  });

  it('should return supported service types matching config', () => {
    const capabilities = getFrameworkCapabilities();
    const config = getConfig();

    expect(capabilities.supportedServiceTypes).toEqual(config.serviceTypes);
  });

  it('should return supported features matching config', () => {
    const capabilities = getFrameworkCapabilities();
    const config = getConfig();

    expect(capabilities.supportedFeatures).toEqual(config.features);
  });

  it('should return arrays as copies, not references', () => {
    const capabilities1 = getFrameworkCapabilities();
    const capabilities2 = getFrameworkCapabilities();

    expect(capabilities1.supportedServiceTypes).not.toBe(capabilities2.supportedServiceTypes);
    expect(capabilities1.supportedFeatures).not.toBe(capabilities2.supportedFeatures);
  });
});

describe('getFrameworkVersion', () => {
  it('should return a non-empty string', () => {
    const version = getFrameworkVersion();

    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
    expect(version).not.toBe('unknown');
  });

  it('should match the version from getFrameworkCapabilities', () => {
    const version = getFrameworkVersion();
    const capabilities = getFrameworkCapabilities();

    expect(version).toBe(capabilities.version);
  });
});