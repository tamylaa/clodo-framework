/**
 * Error Classification and Recovery Module
 * Provides intelligent error classification for contextual recovery suggestions
 */

/**
 * Classify error type for contextual recovery suggestions
 * @param {Error} error - The error to classify
 * @returns {string} Error type classification
 */
export function classifyError(error) {
  const msg = error.message.toLowerCase();
  
  if (msg.includes('credential') || msg.includes('auth') || msg.includes('token') || 
      msg.includes('unauthorized') || msg.includes('forbidden')) {
    return 'credentials';
  }
  if (msg.includes('domain') || msg.includes('zone') || msg.includes('dns')) {
    return 'domain';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnrefused') ||
      msg.includes('enotfound') || msg.includes('fetch failed')) {
    return 'network';
  }
  if (msg.includes('bundle') || msg.includes('syntax') || msg.includes('compile') ||
      msg.includes('build') || msg.includes('module not found')) {
    return 'bundle';
  }
  if (msg.includes('database') || msg.includes('d1') || msg.includes('migration') ||
      msg.includes('sql')) {
    return 'database';
  }
  
  return 'unknown';
}

/**
 * Get recovery suggestions for an error type
 * @param {string} errorType - The classified error type
 * @returns {Array<string>} Array of suggestion strings
 */
export function getRecoverySuggestions(errorType) {
  const suggestions = {
    credentials: [
      'Check your API token, account ID, and zone ID',
      'Verify token has not expired',
      'Visit: https://dash.cloudflare.com/profile/api-tokens'
    ],
    domain: [
      'Verify domain exists in Cloudflare dashboard',
      'Check API token has zone:read permissions',
      'Ensure zone ID matches the domain'
    ],
    network: [
      'Check internet connectivity',
      'Verify Cloudflare API is accessible',
      'Check for firewall/proxy issues'
    ],
    bundle: [
      'Check for syntax errors in your code',
      'Verify all dependencies are installed',
      'Run: npm install or yarn install'
    ],
    database: [
      'Verify database exists in Cloudflare',
      'Check migrations are valid SQL',
      'Ensure D1 binding name matches wrangler.toml'
    ],
    unknown: [
      'Check the error message for details',
      'Run with DEBUG=1 for full stack trace',
      'Review deployment logs'
    ]
  };

  return suggestions[errorType] || suggestions.unknown;
}
