/**
 * Health Checker Module
 * Endpoint health checking and validation utilities
 * Worker-compatible version using fetch API
 */

/**
 * Make HTTP request with timeout using fetch
 * @param {string} url - URL to request
 * @param {string} method - HTTP method
 * @param {number} timeout - Request timeout in ms
 * @returns {Promise<Object>} Response data and status
 */
async function makeHttpRequest(url, method = 'GET', timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Clodo-Framework-Health-Check/1.0'
      }
    });

    clearTimeout(timeoutId);

    const data = await response.text();
    return {
      data,
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

/**
 * Check health of a deployment endpoint
 * @param {string} url - Base URL to check
 * @param {number} timeout - Health check timeout in ms
 * @returns {Promise<Object>} Health check result
 */
export async function checkHealth(url, timeout = 10000) {
  const startTime = Date.now();
  const healthUrl = `${url.replace(/\/$/, '')}/health`;

  try {
    const result = await makeHttpRequest(healthUrl, 'GET', timeout);
    const responseTime = Date.now() - startTime;

    let data = null;
    let parseError = null;

    try {
      data = result.data ? JSON.parse(result.data) : null;
    } catch (error) {
      parseError = error.message;
    }

    return {
      url: healthUrl,
      status: result.statusCode,
      healthy: result.statusCode >= 200 && result.statusCode < 300,
      responseTime,
      data,
      parseError
    };
  } catch (error) {
    return {
      url: healthUrl,
      error: error.message,
      healthy: false,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Check if URL is accessible
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>} Whether URL is accessible
 */
export async function isUrlAccessible(url, timeout = 5000) {
  try {
    const result = await makeHttpRequest(url, 'HEAD', timeout);
    return result.statusCode >= 200 && result.statusCode < 400;
  } catch (error) {
    return false;
  }
}
