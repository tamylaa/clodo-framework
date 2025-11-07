/**
 * Sensitive Redactor Tests
 * Test suite for sensitive information redaction utilities
 * Tests: redactSensitiveInfo, redactSensitiveObject
 */

import { redactSensitiveInfo, redactSensitiveObject } from '../../../lib/shared/utils/sensitive-redactor.js';

describe('Sensitive Redactor Utilities', () => {
  describe('redactSensitiveInfo', () => {
    test('redacts Cloudflare API tokens', () => {
      const input = 'Using CLOUDFLARE_API_TOKEN=sk_live_1234567890abcdef for deployment';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('Using CLOUDFLARE_API_TOKEN=[REDACTED] for deployment');
    });

    test('redacts generic API tokens', () => {
      const input = 'api_token: sk_test_abcdef123456';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('api_token: [REDACTED]');
    });

    test('redacts API keys', () => {
      const input = 'api_key: xoxb-1234567890-abcdef';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('api_key: [REDACTED]');
    });

    test('redacts auth tokens', () => {
      const input = 'auth_token: bearer_abcdef123456789';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('auth_token: [REDACTED]');
    });

    test('redacts passwords', () => {
      const input = 'password: mySecretPass123';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('password: [REDACTED]');
    });

    test('redacts secrets', () => {
      const input = 'secret: confidentialData456';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('secret: [REDACTED]');
    });

    test('redacts account IDs with partial masking', () => {
      const input = 'account_id: 1234567890abcdef1234567890abcdef';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('account_id: 12345678[REDACTED]');
    });

    test('redacts zone IDs with partial masking', () => {
      const input = 'zone_id: abcdef1234567890abcdef1234567890';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('zone_id: abcdef12[REDACTED]');
    });

    test('handles multiple sensitive values in one string', () => {
      const input = 'token: abc123 password: secret456 account_id: xyz789';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('token: [REDACTED] password: [REDACTED] account_id: xyz789');
    });

    test('preserves non-sensitive content', () => {
      const input = 'This is a normal message with no secrets';
      const result = redactSensitiveInfo(input);

      expect(result).toBe(input);
    });

    test('handles empty string', () => {
      const result = redactSensitiveInfo('');

      expect(result).toBe('');
    });

    test('handles null input', () => {
      const result = redactSensitiveInfo(null);

      expect(result).toBe(null);
    });

    test('handles undefined input', () => {
      const result = redactSensitiveInfo(undefined);

      expect(result).toBe(undefined);
    });

    test('handles non-string input', () => {
      const result = redactSensitiveInfo(123);

      expect(result).toBe(123);
    });

    test('handles short tokens that should not be redacted', () => {
      const input = 'token: abc'; // Too short to be considered sensitive
      const result = redactSensitiveInfo(input);

      expect(result).toBe(input);
    });

    test('handles case insensitive matching', () => {
      const input = 'API_TOKEN: SK_LIVE_ABCDEF123456';
      const result = redactSensitiveInfo(input);

      expect(result).toBe('API_TOKEN: [REDACTED]');
    });
  });

  describe('redactSensitiveObject', () => {
    test('redacts sensitive values in flat object', () => {
      const input = {
        apiToken: 'sk_live_abcdef123456',
        password: 'secret123',
        normalField: 'normal value',
        accountId: '1234567890abcdef1234567890abcdef'
      };

      const result = redactSensitiveObject(input);

      expect(result).toEqual({
        apiToken: '[REDACTED]',
        password: '[REDACTED]',
        normalField: 'normal value',
        accountId: '12345678[REDACTED]'
      });
    });

    test('redacts sensitive values in nested object', () => {
      const input = {
        config: {
          cloudflare: {
            token: 'CLOUDFLARE_API_TOKEN=sk_test_abcdef123',
            accountId: 'abcdef1234567890abcdef1234567890'
          },
          database: {
            password: 'dbSecret456'
          }
        },
        normal: 'value'
      };

      const result = redactSensitiveObject(input);

      expect(result).toEqual({
        config: {
          cloudflare: {
            token: '[REDACTED]',
            accountId: 'abcdef12[REDACTED]'
          },
          database: {
            password: '[REDACTED]'
          }
        },
        normal: 'value'
      });
    });

    test('redacts sensitive values in array', () => {
      const input = {
        tokens: ['sk_live_abc123', 'sk_test_def456'],
        passwords: ['pass1', 'pass2'],
        normal: ['item1', 'item2']
      };

      const result = redactSensitiveObject(input);

      expect(result).toEqual({
        tokens: ['[REDACTED]', '[REDACTED]'],
        passwords: ['[REDACTED]', '[REDACTED]'],
        normal: ['item1', 'item2']
      });
    });

    test('handles mixed nested structures', () => {
      const input = {
        services: [
          {
            name: 'service1',
            config: {
              token: 'sk_live_mixed123',
              port: 8080
            }
          },
          {
            name: 'service2',
            secrets: ['secret1', 'secret2']
          }
        ],
        globalToken: 'CLOUDFLARE_API_TOKEN=global123'
      };

      const result = redactSensitiveObject(input);

      expect(result).toEqual({
        services: [
          {
            name: 'service1',
            config: {
              token: '[REDACTED]',
              port: 8080
            }
          },
          {
            name: 'service2',
            secrets: ['[REDACTED]', '[REDACTED]']
          }
        ],
        globalToken: '[REDACTED]'
      });
    });

    test('preserves non-sensitive object structure', () => {
      const input = {
        name: 'test',
        version: '1.0.0',
        settings: {
          enabled: true,
          count: 42
        }
      };

      const result = redactSensitiveObject(input);

      expect(result).toEqual(input);
    });

    test('handles empty object', () => {
      const result = redactSensitiveObject({});

      expect(result).toEqual({});
    });

    test('handles null input', () => {
      const result = redactSensitiveObject(null);

      expect(result).toBe(null);
    });

    test('handles undefined input', () => {
      const result = redactSensitiveObject(undefined);

      expect(result).toBe(undefined);
    });

    test('handles non-object input', () => {
      const result = redactSensitiveObject('string');

      expect(result).toBe('string');
    });

    test('handles primitive values', () => {
      expect(redactSensitiveObject(42)).toBe(42);
      expect(redactSensitiveObject('string')).toBe('string');
      expect(redactSensitiveObject(true)).toBe(true);
    });

    test('handles circular references safely', () => {
      const input = { name: 'test' };
      input.self = input; // Create circular reference

      const result = redactSensitiveObject(input);

      expect(result.name).toBe('test');
      expect(result.self).toBe('[CIRCULAR REFERENCE]'); // Should replace circular reference with placeholder
    });

    test('does not modify original object', () => {
      const original = {
        token: 'sk_live_original123',
        normal: 'value'
      };

      const result = redactSensitiveObject(original);

      expect(original.token).toBe('sk_live_original123'); // Original unchanged
      expect(result.token).toBe('[REDACTED]'); // Result redacted
    });
  });

  describe('integration tests', () => {
    test('redactSensitiveObject uses redactSensitiveInfo internally', () => {
      const input = {
        message: 'Error with CLOUDFLARE_API_TOKEN=sk_live_test1234567890abcdef and password: secret456',
        code: 500
      };

      const result = redactSensitiveObject(input);

      expect(result.message).toBe('Error with CLOUDFLARE_API_TOKEN=[REDACTED] and password: [REDACTED]');
      expect(result.code).toBe(500);
    });

    test('handles complex real-world log object', () => {
      const logEntry = {
        timestamp: '2025-10-30T12:00:00Z',
        level: 'error',
        message: 'Deployment failed: CLOUDFLARE_API_TOKEN=sk_live_failed1234567890abcdef invalid',
        details: {
          accountId: '1234567890abcdef1234567890abcdef',
          zoneId: 'abcdef1234567890abcdef1234567890',
          error: 'Authentication failed'
        },
        stack: [
          'Error: Auth failed',
          'at deploy (/app/deploy.js:123)',
          'password: tempPass789'
        ]
      };

      const result = redactSensitiveObject(logEntry);

      expect(result.message).toBe('Deployment failed: CLOUDFLARE_API_TOKEN=[REDACTED] invalid');
      expect(result.details.accountId).toBe('12345678[REDACTED]');
      expect(result.details.zoneId).toBe('abcdef12[REDACTED]');
      expect(result.stack[2]).toBe('password: [REDACTED]');
      expect(result.timestamp).toBe(logEntry.timestamp); // Unchanged
      expect(result.level).toBe(logEntry.level); // Unchanged
    });
  });
});
