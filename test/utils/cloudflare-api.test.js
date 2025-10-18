/**
 * Basic Tests for CloudflareAPI
 * 
 * Validates that the new CloudflareAPI module loads and exports correctly
 */

import { CloudflareAPI, formatZonesForDisplay, parseZoneSelection } from '../../src/utils/cloudflare/api.js';

describe('CloudflareAPI Module', () => {
  describe('exports', () => {
    it('should export CloudflareAPI class', () => {
      expect(CloudflareAPI).toBeDefined();
      expect(typeof CloudflareAPI).toBe('function');
    });

    it('should export formatZonesForDisplay function', () => {
      expect(formatZonesForDisplay).toBeDefined();
      expect(typeof formatZonesForDisplay).toBe('function');
    });

    it('should export parseZoneSelection function', () => {
      expect(parseZoneSelection).toBeDefined();
      expect(typeof parseZoneSelection).toBe('function');
    });
  });

  describe('CloudflareAPI constructor', () => {
    it('should create instance with API token', () => {
      const api = new CloudflareAPI('test-token');
      expect(api.apiToken).toBe('test-token');
      expect(api.baseUrl).toBe('https://api.cloudflare.com/client/v4');
    });

    it('should throw error without API token', () => {
      expect(() => new CloudflareAPI()).toThrow('Cloudflare API token is required');
    });
  });

  describe('formatZonesForDisplay', () => {
    it('should handle empty array', () => {
      const result = formatZonesForDisplay([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should format zone with all properties', () => {
      const zones = [{
        name: 'example.com',
        planName: 'Free',
        accountName: 'Test Account'
      }];
      
      const result = formatZonesForDisplay(zones);
      expect(result.length).toBe(1);
      expect(result[0]).toContain('example.com');
    });
  });

  describe('parseZoneSelection', () => {
    const mockZones = [
      { id: 'zone-1', name: 'example.com' },
      { id: 'zone-2', name: 'test.com' }
    ];

    it('should handle empty zones array', () => {
      const result = parseZoneSelection('1', []);
      expect(result).toBe(-1);
    });

    it('should parse numeric selection', () => {
      const result = parseZoneSelection('1', mockZones);
      expect(result).toBe(0); // Returns index
    });
  });
});
