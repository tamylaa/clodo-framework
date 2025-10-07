/**
 * Health Checker Module
 * Endpoint health checking and validation utilities
 * 
 * Consolidates health checking across 20+ scripts
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

// Load framework configuration
const { frameworkConfig } = await import('../../../src/utils/framework-config.js');
const timing = frameworkConfig.getTiming();

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

export async function checkHealth(url, timeout = timing.healthCheckTimeout) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const healthUrl = `${url}/health`;
    
    const req = protocol.get(healthUrl, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status === 'healthy' || response.status === 'ok') {
            resolve({ 
              status: 'ok', 
              framework: response.framework,
              message: 'Service is healthy',
              url: healthUrl,
              timestamp: new Date().toISOString()
            });
          } else {
            resolve({ 
              status: 'error', 
              message: `Service reported unhealthy: ${response.status}`,
              url: healthUrl,
              timestamp: new Date().toISOString()
            });
          }
        } catch (e) {
          resolve({ 
            status: 'error', 
            message: 'Invalid JSON response from health endpoint',
            url: healthUrl,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({ 
        status: 'error', 
        message: `Health check failed: ${err.message}`,
        url: healthUrl,
        timestamp: new Date().toISOString()
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ 
        status: 'error', 
        message: 'Health check timed out',
        url: healthUrl,
        timestamp: new Date().toISOString()
      });
    });
  });
}

export async function waitForDeployment(url, maxWaitTime = timing.deploymentTimeout, interval = timing.deploymentInterval) {
  const startTime = Date.now();
  let attempts = 0;
  
  console.log(`⏳ Waiting for deployment at ${url}...`);
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      attempts++;
      console.log(`   🔍 Attempt ${attempts}: Checking health...`);
      
      const health = await checkHealth(url);
      if (health.status === 'ok') {
        console.log(`   ✅ Deployment active! Framework: ${health.framework?.name || 'Unknown'}`);
        return health;
      }
    } catch (error) {
      console.log(`   ⏳ Not ready yet: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Deployment verification timed out after ${maxWaitTime}ms (${attempts} attempts)`);
}

export async function validateEndpoints(baseUrl, endpoints = [], timeout = timing.endpointValidationTimeout) {
  console.log(`🔍 Validating ${endpoints.length} endpoints...`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
      console.log(`   Testing: ${endpoint}`);
      
      const result = await makeHttpRequest(url, 'GET', timeout);
      
      results.push({ 
        endpoint, 
        url,
        status: 'ok', 
        response: result.data.substring(0, 200) + (result.data.length > 200 ? '...' : '')
      });
      
      console.log(`      ✅ OK`);
    } catch (error) {
      results.push({ 
        endpoint, 
        url: endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`,
        status: 'failed', 
        error: error.message 
      });
      
      console.log(`      ❌ Failed: ${error.message}`);
    }
  }
  
  const successful = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  console.log(`📊 Results: ${successful} passed, ${failed} failed`);
  
  return {
    summary: { successful, failed, total: results.length },
    results,
    allPassed: failed === 0
  };
}

export async function quickHealthCheck(url) {
  try {
    const health = await checkHealth(url, 5000);
    return {
      isHealthy: true,
      details: health
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message
    };
  }
}

export async function comprehensiveHealthCheck(url) {
  console.log(`🏥 Running comprehensive health check for ${url}...`);
  
  const checks = {
    basic: { endpoint: '/health', description: 'Basic health check' },
    auth: { endpoint: '/auth/magic-link', description: 'Authentication endpoint', method: 'POST' },
    users: { endpoint: '/users/profile', description: 'User profile endpoint', requiresAuth: true },
    framework: { endpoint: '/framework/models', description: 'Framework models' }
  };
  
  const results = {};
  
  for (const [name, config] of Object.entries(checks)) {
    try {
      console.log(`   Testing ${config.description}...`);
      
      if (config.requiresAuth) {
        console.log(`      ⏭️ Skipped (requires authentication)`);
        results[name] = { status: 'skipped', reason: 'requires authentication' };
        continue;
      }
      
      const endpoint = `${url}${config.endpoint}`;
      const method = config.method || 'GET';
      
      const response = await makeHttpRequest(endpoint, method, 5000);
      results[name] = { 
        status: 'ok', 
        endpoint: config.endpoint,
        response: response.data.substring(0, 100) + (response.data.length > 100 ? '...' : '')
      };
      
      console.log(`      ✅ ${config.description} - OK`);
    } catch (error) {
      results[name] = { 
        status: 'failed', 
        endpoint: config.endpoint,
        error: error.message 
      };
      
      console.log(`      ❌ ${config.description} - ${error.message}`);
    }
  }
  
  const passed = Object.values(results).filter(r => r.status === 'ok').length;
  const total = Object.keys(results).length;
  
  console.log(`📊 Health check complete: ${passed}/${total} checks passed`);
  
  return {
    summary: { passed, total, success: passed === total },
    results,
    timestamp: new Date().toISOString()
  };
}

export function formatHealthReport(healthData) {
  const lines = [
    '🏥 HEALTH REPORT',
    '===============',
    '',
    `🕐 Timestamp: ${healthData.timestamp || new Date().toISOString()}`,
    `🌐 URL: ${healthData.url || 'Unknown'}`,
    `📊 Status: ${healthData.status || 'Unknown'}`
  ];
  
  if (healthData.framework) {
    lines.push('');
    lines.push('🏗️ Framework Details:');
    lines.push(`   📦 Name: ${healthData.framework.name || 'Unknown'}`);
    lines.push(`   📊 Models: ${healthData.framework.models?.length || 0}`);
    lines.push(`   🛣️ Routes: ${healthData.framework.routes?.length || 0}`);
    lines.push(`   🔧 Modules: ${healthData.framework.modules?.length || 0}`);
  }
  
  return lines.join('\n');
}