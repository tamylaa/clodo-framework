/**
 * Insecure Patterns Database
 * Known patterns that indicate security vulnerabilities
 */

export const INSECURE_PATTERNS = {
  // Development/dummy API keys
  DUMMY_API_KEYS: [
    'content-skimmer-dev-key',
    'logger-service-dev-key',
    'auth-service-dev-key',
    'test-key',
    'dev-key',
    'dummy-key',
    'dummy-api-key',
    'placeholder-key',
    'example-key',
    'sample-key',
    'demo-key',
    'test-api-key-*',
    'dummy-*-key',
    'dev-*-secret',
    'placeholder-*',
    'example-*-token',
    'fake-*-credential',
    'mock-*-password'
  ],

  // Weak secrets (common insecure values)
  WEAK_SECRETS: [
    'secret',
    'password',
    '123456',
    'admin',
    'test',
    'changeme',
    'default',
    'password123',
    'admin123',
    'root',
    'guest'
  ],

  // Development URLs that shouldn't be in production
  DEV_URLS: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'dev.',
    'test.',
    'staging.',
    'local.'
  ],

  // Insecure JWT secrets (too short or common)
  WEAK_JWT_PATTERNS: [
    /^.{1,31}$/, // Less than 32 characters
    /^(secret|jwt|token|key|password)/i,
    /^[a-zA-Z0-9]{1,20}$/, // Simple alphanumeric short strings
    /^(password|secret|token|key|jwt|auth)$/i
  ],

  // Common insecure password patterns
  COMMON_PASSWORDS: [
    'password',
    'password123',
    'admin',
    'admin123',
    'root',
    'root123',
    'guest',
    'user',
    'test',
    'demo',
    '123456',
    '123456789',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'passw0rd',
    'p@ssword'
  ]
};