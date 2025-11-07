/**
 * Sensitive Information Redactor
 * Advanced pattern-based redaction for logs and output
 * Extracted from clodo-service-old.js for modular reuse
 */

/**
 * Redact sensitive information from text using pattern matching
 * @param {string} text - Text to redact
 * @returns {string} Redacted text
 */
export function redactSensitiveInfo(text) {
  if (typeof text !== 'string') return text;

  // Patterns to redact
  const patterns = [
    // Cloudflare API tokens
    [/(CLOUDFLARE_API_TOKEN=?)(\w{20,})/gi, '$1[REDACTED]'],
    // Generic API tokens/keys - require minimum length
    [/(token|api[_-]?token|api[_-]?key|auth[_-]?token)["']?[:=]\s*([a-zA-Z0-9_-]{6,})/gi, '$1: [REDACTED]'],
    // Passwords - require minimum length
    [/(password|passwd|pwd)["']?[:=]\s*([^"'\s]{4,})/gi, '$1: [REDACTED]'],
    // Secrets - require minimum length
    [/(secret|key)["']?[:=]\s*([a-zA-Z0-9_-]{6,})/gi, '$1: [REDACTED]'],
    // Account IDs (partial redaction) - match 8+ characters
    [/(account[_-]?id|zone[_-]?id)["']?[:=]\s*["']?([a-zA-Z0-9]{8})([a-zA-Z0-9]*)/gi, '$1: $2[REDACTED]']
  ];

  let redacted = text;
  patterns.forEach(([pattern, replacement]) => {
    redacted = redacted.replace(pattern, replacement);
  });

  return redacted;
}

/**
 * Redact sensitive information from an object recursively
 * @param {any} obj - Object to redact
 * @param {Set} visited - Set of visited objects to prevent circular references
 * @returns {any} Redacted object
 */
export function redactSensitiveObject(obj, visited = new Set()) {
  // Handle circular references by returning a placeholder
  if (obj && typeof obj === 'object') {
    if (visited.has(obj)) {
      return '[CIRCULAR REFERENCE]';
    }
    visited.add(obj);
  }

  if (typeof obj === 'string') {
    return redactSensitiveInfo(obj);
  }

  if (Array.isArray(obj)) {
    // Process each array element individually
    return obj.map(item => redactSensitiveObject(item, visited));
  }

  if (obj && typeof obj === 'object') {
    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      // Special handling for accountId and zoneId - allow partial redaction via regex
      if (lowerKey.includes('accountid') || lowerKey.includes('zoneid')) {
        if (typeof value === 'string') {
          // Apply partial redaction for account/zone IDs
          redacted[key] = value.replace(/^([a-zA-Z0-9]{8})([a-zA-Z0-9]*)$/, '$1[REDACTED]');
        } else {
          redacted[key] = redactSensitiveObject(value, visited);
        }
      } else if (isSensitiveKey(key)) {
        if (Array.isArray(value)) {
          // Redact each element in sensitive arrays
          redacted[key] = value.map(() => '[REDACTED]');
        } else {
          redacted[key] = '[REDACTED]';
        }
      } else {
        redacted[key] = redactSensitiveObject(value, visited);
      }
    }
    return redacted;
  }

  return obj;
}

/**
 * Check if a key name indicates sensitive information
 * @param {string} key - Key name to check
 * @returns {boolean} True if key is sensitive
 */
function isSensitiveKey(key) {
  const sensitiveKeys = [
    'password', 'passwd', 'pwd', 'secret', 'key', 'token', 'apikey',
    'cloudflaretoken', 'apitoken', 'authkey', 'privatekey'
  ];

  return sensitiveKeys.some(sensitive =>
    key.toLowerCase().includes(sensitive.toLowerCase())
  );
}