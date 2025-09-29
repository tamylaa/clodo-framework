/**
 * Health Checker Module
 * Endpoint health checking and validation utilities
 * 
 * Consolidates health checking across 20+ scripts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function checkHealth(url, timeout = 10000) {
  try {
    const command = process.platform === 'win32' 
      ? `powershell -Command "try { (Invoke-RestMethod -Uri '${url}/health' -TimeoutSec ${timeout/1000}).Content } catch { exit 1 }"`
      : `curl -f -m ${timeout/1000} "${url}/health"`;
    
    const { stdout: result } = await execAsync(command, { encoding: 'utf8' });
    
    // Handle PowerShell vs curl responses
    let healthData;
    if (process.platform === 'win32') {
      // PowerShell might return the object directly or as JSON string
      healthData = typeof result === 'string' ? JSON.parse(result) : result;
    } else {
      healthData = JSON.parse(result);
    }
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      url: `${url}/health`,
      ...healthData
    };
  } catch (error) {
    throw new Error(`Health check failed for ${url}: ${error.message}`);
  }
}

export async function waitForDeployment(url, maxWaitTime = 60000, interval = 5000) {
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

export async function validateEndpoints(baseUrl, endpoints = [], timeout = 5000) {
  console.log(`🔍 Validating ${endpoints.length} endpoints...`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
      console.log(`   Testing: ${endpoint}`);
      
      const command = process.platform === 'win32'
        ? `powershell -Command "try { Invoke-RestMethod -Uri '${url}' -TimeoutSec ${timeout/1000} -Method Get } catch { exit 1 }"`
        : `curl -f -m ${timeout/1000} "${url}"`;
      
      const response = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      
      results.push({ 
        endpoint, 
        url,
        status: 'ok', 
        response: response.substring(0, 200) + (response.length > 200 ? '...' : '')
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
      
      let command;
      if (process.platform === 'win32') {
        command = `powershell -Command "Invoke-RestMethod -Uri '${endpoint}' -Method ${method} -TimeoutSec 5"`;
      } else {
        const curlMethod = method === 'POST' ? '-X POST' : '';
        command = `curl -f -m 5 ${curlMethod} "${endpoint}"`;
      }
      
      const response = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      results[name] = { 
        status: 'ok', 
        endpoint: config.endpoint,
        response: response.substring(0, 100) + (response.length > 100 ? '...' : '')
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