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

/**
 * Check D1 database connectivity and configuration
 * @param {string} databaseName - D1 database name
 * @param {Object} options - Check options
 * @returns {Promise<Object>} D1 health check result
 */
export async function checkD1Health(databaseName, options = {}) {
  const {
    timeout = 10000,
    testQuery = 'SELECT 1 as test',
    validateSchema = false
  } = options;

  const startTime = Date.now();
  const result = {
    database: databaseName,
    status: 'unknown',
    connectivity: false,
    responseTime: 0,
    details: {},
    timestamp: new Date().toISOString()
  };

  try {
    // Test basic connectivity with a simple query
    console.log(`   🗄️ Testing D1 database: ${databaseName}`);
    
    const queryCommand = `wrangler d1 execute ${databaseName} --command "${testQuery}"`;
    const queryResult = await execAsync(queryCommand, { timeout });
    
    result.responseTime = Date.now() - startTime;
    result.connectivity = true;
    result.details.queryResult = queryResult.stdout;

    // Test database info
    try {
      const infoCommand = `wrangler d1 info ${databaseName}`;
      const infoResult = await execAsync(infoCommand, { timeout: 5000 });
      result.details.databaseInfo = infoResult.stdout;
    } catch (infoError) {
      result.details.infoError = infoError.message;
    }

    // Validate schema if requested
    if (validateSchema) {
      try {
        const schemaCommand = `wrangler d1 execute ${databaseName} --command "SELECT name FROM sqlite_master WHERE type='table'"`;
        const schemaResult = await execAsync(schemaCommand, { timeout: 5000 });
        result.details.tables = schemaResult.stdout;
      } catch (schemaError) {
        result.details.schemaError = schemaError.message;
      }
    }

    result.status = 'healthy';
    console.log(`     ✅ D1 database '${databaseName}' is healthy (${result.responseTime}ms)`);

  } catch (error) {
    result.status = 'unhealthy';
    result.responseTime = Date.now() - startTime;
    result.error = error.message;
    
    // Analyze the error for more specific feedback
    if (error.message.includes('not found')) {
      result.details.issue = 'Database not found';
      result.details.suggestion = 'Check database name or create the database';
    } else if (error.message.includes('authentication')) {
      result.details.issue = 'Authentication failed';
      result.details.suggestion = 'Check wrangler authentication and permissions';
    } else {
      result.details.issue = 'Connection failed';
      result.details.suggestion = 'Check database status and network connectivity';
    }

    console.log(`     ❌ D1 database '${databaseName}' is unhealthy: ${error.message}`);
  }

  return result;
}

/**
 * Check multiple D1 databases health
 * @param {Array<string>} databases - Array of database names
 * @param {Object} options - Check options
 * @returns {Promise<Object>} Combined health check results
 */
export async function checkMultipleD1Health(databases, options = {}) {
  console.log(`🗄️ Checking health of ${databases.length} D1 databases...`);
  
  const results = {
    overall: 'unknown',
    healthy: 0,
    unhealthy: 0,
    databases: [],
    timestamp: new Date().toISOString()
  };

  for (const databaseName of databases) {
    const dbResult = await checkD1Health(databaseName, options);
    results.databases.push(dbResult);
    
    if (dbResult.status === 'healthy') {
      results.healthy++;
    } else {
      results.unhealthy++;
    }
  }

  // Determine overall status
  if (results.unhealthy === 0) {
    results.overall = 'healthy';
  } else if (results.healthy === 0) {
    results.overall = 'unhealthy';
  } else {
    results.overall = 'partial';
  }

  console.log(`   📊 D1 Health Summary: ${results.healthy} healthy, ${results.unhealthy} unhealthy`);
  return results;
}

/**
 * Comprehensive health check including D1 databases
 * @param {string} serviceUrl - Service URL to check
 * @param {Array<string>} databases - D1 databases to check
 * @param {Object} options - Check options
 * @returns {Promise<Object>} Comprehensive health result
 */
export async function enhancedComprehensiveHealthCheck(serviceUrl, databases = [], options = {}) {
  console.log(`🏥 Comprehensive Health Check`);
  console.log(`   Service: ${serviceUrl}`);
  console.log(`   D1 Databases: ${databases.length}`);
  
  const startTime = Date.now();
  const result = {
    overall: 'unknown',
    service: null,
    databases: null,
    duration: 0,
    timestamp: new Date().toISOString()
  };

  try {
    // Check service health
    console.log('\n📡 Checking service health...');
    result.service = await checkHealth(serviceUrl, options.serviceTimeout);
    
    // Check D1 databases if provided
    if (databases.length > 0) {
      console.log('\n🗄️ Checking D1 databases...');
      result.databases = await checkMultipleD1Health(databases, options);
    }

    // Determine overall status
    const serviceHealthy = result.service.status === 'ok';
    const databasesHealthy = !result.databases || result.databases.overall === 'healthy';
    
    if (serviceHealthy && databasesHealthy) {
      result.overall = 'healthy';
    } else if (!serviceHealthy && (!result.databases || result.databases.overall === 'unhealthy')) {
      result.overall = 'unhealthy';
    } else {
      result.overall = 'partial';
    }

    result.duration = Date.now() - startTime;
    
    console.log(`\n📊 Overall Health: ${result.overall.toUpperCase()} (${result.duration}ms)`);
    return result;

  } catch (error) {
    result.overall = 'error';
    result.error = error.message;
    result.duration = Date.now() - startTime;
    
    console.log(`\n❌ Health check failed: ${error.message}`);
    throw error;
  }
}

/**
 * Format D1 health check results for display
 * @param {Object} d1Results - D1 health check results
 * @returns {string} Formatted output
 */
export function formatD1HealthResults(d1Results) {
  const lines = [
    '🗄️ D1 Database Health Report',
    '=============================='
  ];

  if (d1Results.databases) {
    lines.push(`📊 Overall Status: ${d1Results.overall.toUpperCase()}`);
    lines.push(`✅ Healthy: ${d1Results.healthy}`);
    lines.push(`❌ Unhealthy: ${d1Results.unhealthy}`);
    lines.push('');

    d1Results.databases.forEach(db => {
      const status = db.status === 'healthy' ? '✅' : '❌';
      lines.push(`${status} ${db.database} (${db.responseTime}ms)`);
      
      if (db.status === 'unhealthy' && db.details.suggestion) {
        lines.push(`   💡 ${db.details.suggestion}`);
      }
    });
  } else {
    lines.push(`📊 Database: ${d1Results.database}`);
    lines.push(`📊 Status: ${d1Results.status.toUpperCase()}`);
    lines.push(`⏱️ Response Time: ${d1Results.responseTime}ms`);
    
    if (d1Results.status === 'unhealthy') {
      lines.push(`❌ Error: ${d1Results.error}`);
      if (d1Results.details.suggestion) {
        lines.push(`💡 Suggestion: ${d1Results.details.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Modern fetch-based health check with exponential backoff
 * @param {string} baseUrl - Base URL of the service
 * @param {Object} options - Health check options
 * @returns {Promise<Object>} Health check result
 */
export async function healthCheckWithBackoff(baseUrl, options = {}) {
  const { 
    maxAttempts = 10, 
    initialDelay = 1000, 
    maxDelay = 8000, 
    timeout = 5000,
    silent = false
  } = options;
  
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      if (!silent) {
        process.stdout.write(`   Attempt ${attempt}/${maxAttempts}... `);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const startTime = Date.now();
      const response = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'clodo-service-health-check' }
      });
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        // Success!
        let status = null;
        try {
          const data = await response.json();
          status = data.status || 'healthy';
        } catch {
          // Not JSON, that's ok
        }
        
        if (!silent) console.log('✓');
        return {
          healthy: true,
          responseTime,
          attempts: attempt,
          status
        };
      }
      
      // Non-200 but got response
      if (!silent) console.log(`✗ (HTTP ${response.status})`);
      
    } catch (error) {
      if (!silent) {
        if (error.name === 'AbortError') {
          console.log('✗ (timeout)');
        } else {
          console.log(`✗ (${error.message})`);
        }
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay); // Exponential backoff, capped
    }
  }

  return { healthy: false, attempts: maxAttempts };
}

/**
 * Verify worker deployment via Cloudflare API
 * @param {string} workerName - Name of the worker to verify
 * @param {Object} credentials - Cloudflare credentials
 * @param {Object} options - Verification options
 * @returns {Promise<Object>} Verification result
 */
export async function verifyWorkerDeployment(workerName, credentials, options = {}) {
  const { maxAttempts = 5, delay = 2000, silent = false } = options;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      if (!silent) {
        process.stdout.write(`   Checking deployment status (attempt ${attempt}/${maxAttempts})... `);
      }
      
      const { CloudflareAPI } = await import('../../../src/utils/cloudflare/api.js');
      const cfApi = new CloudflareAPI(credentials.token);
      
      // List all workers to find ours
      const workers = await cfApi.listWorkers(credentials.accountId);
      const deployedWorker = workers.find(w => w.name === workerName);
      
      if (deployedWorker) {
        if (!silent) console.log('✓');
        return {
          success: true,
          status: 'Active',
          modifiedOn: deployedWorker.modifiedOn ? 
            new Date(deployedWorker.modifiedOn).toLocaleString() : null,
          etag: deployedWorker.etag
        };
      }
      
      if (!silent) console.log('Not found yet');
      
    } catch (error) {
      if (!silent) console.log(`✗ (${error.message})`);
    }

    // Wait before retry
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { 
    success: false, 
    error: 'Worker not found in Cloudflare API after deployment'
  };
}