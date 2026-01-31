import { describe, it, expect, afterEach } from '@jest/globals';
import { setConfig, resetConfig } from '../../src/config/service-schema-config.js';
import { validateServicePayload, getParameterDefinitions } from '../../src/validation/payloadValidation.js';

describe('Payload validation with config overrides', () => {
  afterEach(() => {
    resetConfig();
  });

  it('accepts additional serviceType when config updated', () => {
    setConfig({ serviceTypes: ['custom','generic'] });
    const payload = { serviceName: 'svc1', serviceType: 'custom', domain: 'example.com' };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(true);
    const defs = getParameterDefinitions();
    expect(defs.serviceType.enum).toContain('custom');
  });

  it('warns about unknown features when config trimmed', () => {
    setConfig({ features: ['metrics'] });
    const payload = { serviceName: 'svc2', serviceType: 'generic', domain: 'example.com', features: ['metrics','d1'] };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(false);
    // Should include error for invalid feature (d1 not allowed) or at least warning
    expect(res.errors.length + res.warnings.length).toBeGreaterThan(0);
  });
});