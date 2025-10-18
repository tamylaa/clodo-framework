/**
 * Health Checker Module
 * Endpoint health checking and validation utilities
 */

import https from 'https';
import http from 'http';

/**
 * Make HTTP request with timeout
 * @param {string} url - URL to request
 * @param {string} method - HTTP method
 * @param {number} timeout - Request timeout in ms
 * @returns {Promise<Object>} Response data and status
 */
function makeHttpRequest(url, method = 'GET', timeout = 5000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.request(url, { method, timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ data, statusCode: res.statusCode });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

/**
 * Check health of a deployment endpoint
 * @param {string} url - Base URL to check
 * @param {number} timeout - Health check timeout in ms
 * @returns {Promise<Object>} Health check result
 */
export async function checkHealth(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const healthUrl = `${url.replace(/\/$/, '')}/health`;

    const req = protocol.get(healthUrl, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            url: healthUrl,
            status: res.statusCode,
            healthy: res.statusCode >= 200 && res.statusCode < 300,
            responseTime: Date.now() - req.startTime,
            data: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (parseError) {
          resolve({
            url: healthUrl,
            status: res.statusCode,
            healthy: res.statusCode >= 200 && res.statusCode < 300,
            responseTime: Date.now() - req.startTime,
            data: null,
            parseError: parseError.message
          });
        }
      });
    });

    req.startTime = Date.now();

    req.on('error', (err) => {
      reject({
        url: healthUrl,
        error: err.message,
        healthy: false,
        responseTime: Date.now() - req.startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        url: healthUrl,
        error: 'Health check timed out',
        healthy: false,
        responseTime: timeout
      });
    });
  });
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