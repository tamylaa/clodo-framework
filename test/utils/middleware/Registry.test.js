import { describe, it, expect, beforeEach } from '@jest/globals';
import { MiddlewareRegistry } from '../../../src/middleware/Registry.js';

describe('MiddlewareRegistry', () => {
  beforeEach(() => MiddlewareRegistry.clear());

  it('registers and retrieves middleware by service name', () => {
    const mw = { preprocess: () => null };
    MiddlewareRegistry.register('test-svc', mw);
    expect(MiddlewareRegistry.get('test-svc')).toBe(mw);
  });

  it('returns null for unknown service', () => {
    expect(MiddlewareRegistry.get('unknown')).toBeNull();
  });

  it('throws when registering without name', () => {
    expect(() => MiddlewareRegistry.register('', {})).toThrow();
  });
});
