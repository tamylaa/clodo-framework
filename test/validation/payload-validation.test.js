import { describe, it, expect } from '@jest/globals';
import { validateServicePayload, getParameterDefinitions, VALID_FEATURES } from '../../src/validation/payloadValidation.js';

describe('Payload validation', () => {
  it('valid payload passes validation', () => {
    const payload = { serviceName: 'svc1', serviceType: 'generic', domain: 'example.com' };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('invalid serviceName fails', () => {
    const payload = { serviceName: 'Invalid Name', serviceType: 'generic', domain: 'example.com' };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(false);
    expect(res.errors.find(e => e.field === 'serviceName')).toBeDefined();
  });

  it('invalid serviceType fails', () => {
    const payload = { serviceName: 'svc2', serviceType: 'unknown-type', domain: 'example.com' };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(false);
    expect(res.errors.find(e => e.field === 'serviceType')).toBeDefined();
  });

  it('invalid feature in list fails', () => {
    const payload = { serviceName: 'svc3', serviceType: 'generic', domain: 'example.com', features: ['d1','nonsense'] };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(false);
    expect(res.errors.find(e => e.field === 'features.1')).toBeDefined();
  });

  it('parameter definitions include expected enums', () => {
    const defs = getParameterDefinitions();
    expect(defs.serviceType.enum).toBeDefined();
    expect(defs.features.enum).toEqual(VALID_FEATURES());
  });

  it("accepts legacy 'kv' feature alias for backward compatibility", () => {
    const payload = { serviceName: 'svc-kv', serviceType: 'generic', domain: 'example.com', features: ['kv'] };
    const res = validateServicePayload(payload);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });
});