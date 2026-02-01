import { describe, it, expect } from '@jest/globals';
import { normalizeFeatures } from '../../src/validation/payloadNormalization.js';

describe('Feature normalization', () => {
  it("maps 'kv' to include 'upstash'", () => {
    const res = normalizeFeatures(['kv', 'd1']);
    expect(res).toContain('kv');
    expect(res).toContain('upstash');
    // Ensure unique entries
    const uniq = new Set(res);
    expect(uniq.size).toBe(res.length);
  });

  it("doesn't duplicate 'upstash' when already present", () => {
    const res = normalizeFeatures(['kv', 'upstash']);
    expect(res.filter(f => f === 'upstash').length).toBe(1);
  });

  it('returns empty array for non-arrays', () => {
    expect(normalizeFeatures(null)).toEqual([]);
    expect(normalizeFeatures(undefined)).toEqual([]);
  });

  it("maps 'durableObject' <-> 'durableObjects' variants", () => {
    const res1 = normalizeFeatures(['durableObject']);
    expect(res1).toContain('durableObjects');
    expect(res1).toContain('durableObject');

    const res2 = normalizeFeatures(['durableObjects']);
    expect(res2).toContain('durableObject');
    expect(res2).toContain('durableObjects');
  });
});