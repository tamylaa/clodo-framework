/**
 * Enterprise Production Testing Suite
 * 
 * Comprehensive testing module for production deployments with:
 * - End-to-end API testing with detailed logging
 * - Performance monitoring and metrics collection
 * - Authentication flow validation
 * - Database connectivity testing
 * - Health check validation
 * - Load testing capabilities
 * - Regression testing support
 * - Cross-environment validation
 * - Detailed reporting and audit trails
 * 
 * @module production-tester
 * @version 2.0.0
 */

import fetch from 'node-fetch';
import { access, writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export class ProductionTester {
  constructor(options = {}) {
    this.config = {
      // Test configuration
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 30000,
      concurrent: options.concurrent || false,
      
      // Performance thresholds
      responseTimeThreshold: options.responseTimeThreshold || 2000,
      healthCheckThreshold: options.healthCheckThreshold || 500,
      authFlowThreshold: options.authFlowThreshold || 5000,
      
      // Test environments
      environments: options.environments || ['development', 'staging', 'production'],
      defaultEnvironment: options.defaultEnvironment || 'production',
      
      // Output options
      verbose: options.verbose !== false,
      generateReport: options.generateReport !== false,
      exportMetrics: options.exportMetrics !== false,
      
      // Paths
      outputDir: options.outputDir || 'test-results',
      logLevel: options.logLevel || 'info'
    };

    // Test state
    this.testResults = {
      startTime: null,
      endTime: null,
      duration: 0,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      environments: {},
      performance: {},
      errors: []
    };

    // Performance metrics
    this.metrics = {
      responseTimes: [],
      memoryUsage: [],
      errorRates: {},
      throughput: {}
    };

    // Test suites
    this.testSuites = {
      health: [],
      authentication: [],
      endpoints: [],
      database: [],
      performance: [],
      regression: [],
      integration: []
    };

    // Note: Async initialization required - call initialize() after construction
  }

  /**
   * Initialize the tester asynchronously
   */
  async initialize() {
    await this.initializePaths();
    this.setupLogging();

    console.log('🧪 Production Testing Suite initialized');
    if (this.config.verbose) {
      console.log(`   📊 Performance monitoring: ${this.config.exportMetrics ? 'enabled' : 'disabled'}`);
      console.log(`   🌍 Target environments: ${this.config.environments.join(', ')}`);
      console.log(`   📁 Output directory: ${this.config.outputDir}`);
    }
  }

  /**
   * Initialize output paths
   */
  async initializePaths() {
    this.paths = {
      output: this.config.outputDir,
      reports: join(this.config.outputDir, 'reports'),
      logs: join(this.config.outputDir, 'logs'),
      metrics: join(this.config.outputDir, 'metrics'),
      screenshots: join(this.config.outputDir, 'screenshots')
    };

    for (const path of Object.values(this.paths)) {
      try {
        await access(path);
      } catch {
        await mkdir(path, { recursive: true });
      }
    }

    this.logFile = join(this.paths.logs, `test-run-${Date.now()}.log`);
    this.metricsFile = join(this.paths.metrics, `metrics-${Date.now()}.json`);
    this.reportFile = join(this.paths.reports, `test-report-${Date.now()}.html`);
  }

  /**
   * Setup comprehensive logging
   */
  setupLogging() {
    this.logger = {
      debug: (...args) => this.log('DEBUG', ...args),
      info: (...args) => this.log('INFO', ...args),
      warn: (...args) => this.log('WARN', ...args),
      error: (...args) => this.log('ERROR', ...args),
      success: (...args) => this.log('SUCCESS', ...args),
      performance: (...args) => this.log('PERFORMANCE', ...args)
    };
  }

  /**
   * Enhanced logging with structured output
   */
  async log(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');

    const logEntry = `[${timestamp}] [${level}] ${message}`;

    // Console output with colors
    if (this.config.verbose) {
      const colors = {
        DEBUG: '\x1b[36m',    // Cyan
        INFO: '\x1b[37m',     // White
        WARN: '\x1b[33m',     // Yellow
        ERROR: '\x1b[31m',    // Red
        SUCCESS: '\x1b[32m',  // Green
        PERFORMANCE: '\x1b[35m' // Magenta
      };
      console.log(`${colors[level] || ''}${logEntry}\x1b[0m`);
    }

    // File logging
    try {
      await appendFile(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Run comprehensive production test suite
   * @param {string|Object} target - Target URL or configuration object
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async runProductionTests(target, options = {}) {
    this.testResults.startTime = new Date();
    
    console.log('🚀 Starting comprehensive production test suite...\n');
    this.logger.info('Production test suite initiated', { target, options });

    try {
      // Parse target configuration
      const testConfig = this.parseTestConfig(target, options);
      this.logger.info('Test configuration parsed', testConfig);

      // Initialize test session
      const sessionId = this.initializeTestSession(testConfig);
      this.logger.info('Test session initialized', { sessionId });

      // Run test suites in sequence or parallel
      const results = await this.executeTestSuites(testConfig, sessionId);

      // Performance analysis
      if (this.config.exportMetrics) {
        await this.analyzePerformance(results);
      }

      // Generate comprehensive report
      if (this.config.generateReport) {
        await this.generateTestReport(results, sessionId);
      }

      // Finalize results
      this.finalizeTestResults(results);

      return this.testResults;

    } catch (error) {
      this.logger.error('Production test suite failed', error);
      this.testResults.errors.push({
        type: 'SUITE_FAILURE',
        message: error.message,
        timestamp: new Date(),
        stack: error.stack
      });
      throw error;
    } finally {
      this.testResults.endTime = new Date();
      this.testResults.duration = (this.testResults.endTime - this.testResults.startTime) / 1000;
      
      console.log(`\n📊 Test suite completed in ${this.testResults.duration.toFixed(2)}s`);
      console.log(`✅ Passed: ${this.testResults.passed}`);
      console.log(`❌ Failed: ${this.testResults.failed}`);
      if (this.testResults.skipped > 0) {
        console.log(`⏭️  Skipped: ${this.testResults.skipped}`);
      }
    }
  }

  /**
   * Parse and validate test configuration
   * @param {string|Object} target - Target configuration
   * @param {Object} options - Additional options
   * @returns {Object} Parsed configuration
   */
  parseTestConfig(target, options) {
    let config;

    if (typeof target === 'string') {
      config = {
        baseUrl: target,
        environment: options.environment || this.config.defaultEnvironment,
        ...options
      };
    } else {
      config = { ...target, ...options };
    }

    // Validate required fields
    if (!config.baseUrl) {
      throw new Error('Base URL is required for production testing');
    }

    // Set defaults
    config.endpoints = config.endpoints || this.getDefaultEndpoints();
    config.testUser = config.testUser || this.getDefaultTestUser();
    config.testSuites = config.testSuites || Object.keys(this.testSuites);

    return config;
  }

  /**
   * Get default API endpoints for testing
   * @returns {Object} Default endpoints
   */
  getDefaultEndpoints() {
    return {
      health: '/health',
      auth: {
        login: '/api/auth/login',
        magicLink: '/api/auth/magic-link',
        verify: '/api/auth/verify',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout',
        me: '/api/auth/me'
      },
      api: {
        users: '/api/users',
        profile: '/api/profile',
        files: '/api/files'
      },
      admin: {
        health: '/api/admin/health',
        metrics: '/api/admin/metrics',
        logs: '/api/admin/logs'
      }
    };
  }

  /**
   * Get default test user configuration
   * @returns {Object} Test user
   */
  getDefaultTestUser() {
    return {
      email: `test-${Date.now()}@example.com`,
      name: 'Production Test User',
      password: 'TestPassword123!'
    };
  }

  /**
   * Initialize test session with unique ID and tracking
   * @param {Object} config - Test configuration
   * @returns {string} Session ID
   */
  initializeTestSession(config) {
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.session = {
      id: sessionId,
      config,
      startTime: new Date(),
      tokens: {},
      testData: {},
      performance: {
        startMemory: process.memoryUsage(),
        requests: 0,
        errors: 0
      }
    };

    this.logger.info('Test session initialized', {
      sessionId,
      environment: config.environment,
      baseUrl: config.baseUrl,
      testSuites: config.testSuites
    });

    return sessionId;
  }

  /**
   * Execute all configured test suites
   * @param {Object} config - Test configuration
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Test results
   */
  async executeTestSuites(config, sessionId) {
    const results = {
      sessionId,
      suites: {},
      performance: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };

    console.log('🔄 Executing test suites...\n');

    for (const suiteName of config.testSuites) {
      if (this.testSuites[suiteName] !== undefined) {
        console.log(`\n📋 Running ${suiteName} test suite...`);
        
        const suiteStartTime = Date.now();
        
        try {
          const suiteResult = await this.runTestSuite(suiteName, config);
          suiteResult.duration = Date.now() - suiteStartTime;
          
          results.suites[suiteName] = suiteResult;
          results.summary.total += suiteResult.tests.length;
          results.summary.passed += suiteResult.passed;
          results.summary.failed += suiteResult.failed;
          results.summary.skipped += suiteResult.skipped || 0;

          console.log(`✅ ${suiteName} suite completed: ${suiteResult.passed}/${suiteResult.tests.length} passed (${suiteResult.duration}ms)`);

        } catch (error) {
          console.log(`❌ ${suiteName} suite failed: ${error.message}`);
          this.logger.error(`Test suite failed: ${suiteName}`, error);
          
          results.suites[suiteName] = {
            status: 'failed',
            error: error.message,
            duration: Date.now() - suiteStartTime,
            tests: [],
            passed: 0,
            failed: 1
          };
          
          results.summary.failed += 1;
        }
      } else {
        console.log(`⚠️  Skipping unknown test suite: ${suiteName}`);
        results.summary.skipped += 1;
      }
    }

    return results;
  }

  /**
   * Run individual test suite
   * @param {string} suiteName - Test suite name
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Suite results
   */
  async runTestSuite(suiteName, config) {
    switch (suiteName) {
      case 'health':
        return await this.runHealthTests(config);
      case 'authentication':
        return await this.runAuthenticationTests(config);
      case 'endpoints':
        return await this.runEndpointTests(config);
      case 'database':
        return await this.runDatabaseTests(config);
      case 'performance':
        return await this.runPerformanceTests(config);
      case 'regression':
        return await this.runRegressionTests(config);
      case 'integration':
        return await this.runIntegrationTests(config);
      default:
        throw new Error(`Unknown test suite: ${suiteName}`);
    }
  }

  /**
   * Run comprehensive health check tests
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Health test results
   */
  async runHealthTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   🏥 Testing health endpoints...');

    // Basic health check
    const basicHealthResult = await this.runTest('Basic Health Check', async () => {
      const startTime = Date.now();
      const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}`);
      const responseTime = Date.now() - startTime;

      if (responseTime > this.config.healthCheckThreshold) {
        console.warn(`   ⚠️  Health check slow: ${responseTime}ms (threshold: ${this.config.healthCheckThreshold}ms)`);
      }

      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(`Unexpected health status: ${data.status}`);
      }

      return { responseTime, status: data.status, details: data };
    });

    tests.push(basicHealthResult);
    if (basicHealthResult.status === 'passed') passed++; else failed++;

    // Database health check
    const dbHealthResult = await this.runTest('Database Health Check', async () => {
      const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}?check=database`);
      
      if (!response.ok) {
        throw new Error(`Database health check failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.services || !data.services.database) {
        throw new Error('Database service status not available');
      }

      if (data.services.database !== 'healthy' && data.services.database !== 'ok') {
        throw new Error(`Database unhealthy: ${data.services.database}`);
      }

      return { database: data.services.database, details: data };
    });

    tests.push(dbHealthResult);
    if (dbHealthResult.status === 'passed') passed++; else failed++;

    // Service dependencies check
    const dependenciesResult = await this.runTest('Service Dependencies Check', async () => {
      const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}?check=dependencies`);
      
      const data = await response.json();
      const failedServices = [];

      if (data.services) {
        for (const [service, status] of Object.entries(data.services)) {
          if (status !== 'healthy' && status !== 'ok' && status !== 'available') {
            failedServices.push({ service, status });
          }
        }
      }

      if (failedServices.length > 0) {
        throw new Error(`Failed services: ${failedServices.map(s => `${s.service}:${s.status}`).join(', ')}`);
      }

      return { services: data.services || {}, healthy: true };
    });

    tests.push(dependenciesResult);
    if (dependenciesResult.status === 'passed') passed++; else failed++;

    return {
      suite: 'health',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed'
    };
  }

  /**
   * Run comprehensive authentication flow tests
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Authentication test results
   */
  async runAuthenticationTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   🔐 Testing authentication flows...');

    let authToken = null;
    let magicLinkToken = null;

    // Magic link request test
    const magicLinkResult = await this.runTest('Magic Link Request', async () => {
      const startTime = Date.now();
      const response = await this.makeRequest('POST', 
        `${config.baseUrl}${config.endpoints.auth.magicLink}`,
        {
          email: config.testUser.email,
          name: config.testUser.name
        }
      );
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Magic link request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data || !data.data.token) {
        throw new Error(`Invalid magic link response: ${JSON.stringify(data)}`);
      }

      magicLinkToken = data.data.token;
      return { responseTime, token: magicLinkToken.substring(0, 10) + '...', success: true };
    });

    tests.push(magicLinkResult);
    if (magicLinkResult.status === 'passed') passed++; else failed++;

    // Magic link verification test
    if (magicLinkToken) {
      const verifyResult = await this.runTest('Magic Link Verification', async () => {
        const startTime = Date.now();
        const response = await this.makeRequest('POST',
          `${config.baseUrl}${config.endpoints.auth.verify}`,
          { token: magicLinkToken }
        );
        const responseTime = Date.now() - startTime;

        if (responseTime > this.config.authFlowThreshold) {
          console.warn(`   ⚠️  Auth verification slow: ${responseTime}ms`);
        }

        if (!response.ok) {
          throw new Error(`Token verification failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.token) {
          throw new Error(`Invalid verification response: ${JSON.stringify(data)}`);
        }

        authToken = data.data.token;
        this.session.tokens.auth = authToken;

        return { responseTime, authenticated: true, userInfo: data.data.user || {} };
      });

      tests.push(verifyResult);
      if (verifyResult.status === 'passed') passed++; else failed++;
    }

    // Authenticated endpoint test
    if (authToken) {
      const authEndpointResult = await this.runTest('Authenticated Endpoint Access', async () => {
        const response = await this.makeRequest('GET',
          `${config.baseUrl}${config.endpoints.auth.me}`,
          null,
          { 'Authorization': `Bearer ${authToken}` }
        );

        if (!response.ok) {
          throw new Error(`Authenticated request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.data) {
          throw new Error(`Invalid user data response: ${JSON.stringify(data)}`);
        }

        return { userInfo: data.data, authenticated: true };
      });

      tests.push(authEndpointResult);
      if (authEndpointResult.status === 'passed') passed++; else failed++;
    }

    return {
      suite: 'authentication',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed',
      tokens: { auth: authToken ? 'present' : 'missing' }
    };
  }

  /**
   * Run comprehensive API endpoint tests
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Endpoint test results
   */
  async runEndpointTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   🌐 Testing API endpoints...');

    const authToken = this.session.tokens.auth;
    const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

    // Test core API endpoints
    const coreEndpoints = [
      { name: 'Users API', method: 'GET', path: config.endpoints.api.users, requireAuth: false },
      { name: 'Profile API', method: 'GET', path: config.endpoints.api.profile, requireAuth: true },
      { name: 'Files API', method: 'GET', path: config.endpoints.api.files, requireAuth: true }
    ];

    for (const endpoint of coreEndpoints) {
      const testResult = await this.runTest(`${endpoint.name} - ${endpoint.method}`, async () => {
        const headers = endpoint.requireAuth ? authHeaders : {};
        const startTime = Date.now();
        
        const response = await this.makeRequest(
          endpoint.method, 
          `${config.baseUrl}${endpoint.path}`, 
          null, 
          headers
        );
        const responseTime = Date.now() - startTime;

        // Check if auth is required but missing
        if (endpoint.requireAuth && !authToken && response.status === 401) {
          return { status: 'auth_required', responseTime, message: 'Authentication required as expected' };
        }

        // Check if request was successful or appropriately handled
        if (!response.ok && response.status !== 404 && response.status !== 401) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          // Some endpoints might not return JSON
          data = { message: 'Non-JSON response' };
        }

        return { 
          responseTime, 
          status: response.status, 
          headers: Object.fromEntries(response.headers.entries()),
          dataType: typeof data,
          hasData: !!data
        };
      });

      tests.push(testResult);
      if (testResult.status === 'passed') passed++; else failed++;
    }

    // Test endpoint response formats
    const formatResult = await this.runTest('API Response Format Validation', async () => {
      const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}`);
      const data = await response.json();

      const requiredFields = ['status'];
      const missingFields = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(data, field));

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      return { 
        format: 'valid', 
        fields: Object.keys(data),
        contentType: response.headers.get('content-type')
      };
    });

    tests.push(formatResult);
    if (formatResult.status === 'passed') passed++; else failed++;

    return {
      suite: 'endpoints',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed'
    };
  }

  /**
   * Run database connectivity and functionality tests
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Database test results
   */
  async runDatabaseTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   🗄️  Testing database connectivity...');

    // Database connection test via health endpoint
    const connectionResult = await this.runTest('Database Connection', async () => {
      const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}?check=database`);
      
      if (!response.ok) {
        throw new Error(`Database check endpoint failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.services || !data.services.database) {
        throw new Error('Database status not reported in health check');
      }

      const dbStatus = data.services.database;
      if (dbStatus !== 'healthy' && dbStatus !== 'ok' && dbStatus !== 'connected') {
        throw new Error(`Database status: ${dbStatus}`);
      }

      return { status: dbStatus, connected: true };
    });

    tests.push(connectionResult);
    if (connectionResult.status === 'passed') passed++; else failed++;

    // Test database operations via API (if authenticated)
    if (this.session.tokens.auth) {
      const operationsResult = await this.runTest('Database Operations', async () => {
        const authHeaders = { 'Authorization': `Bearer ${this.session.tokens.auth}` };
        
        // Try to read user profile (requires database)
        const response = await this.makeRequest('GET', 
          `${config.baseUrl}${config.endpoints.api.profile}`, 
          null, 
          authHeaders
        );

        if (response.status === 404) {
          // Profile doesn't exist, which is fine for testing
          return { operations: 'accessible', profileExists: false };
        }

        if (!response.ok) {
          throw new Error(`Database operation failed: ${response.status}`);
        }

        return { operations: 'successful', profileExists: true };
      });

      tests.push(operationsResult);
      if (operationsResult.status === 'passed') passed++; else failed++;
    }

    return {
      suite: 'database',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed'
    };
  }

  /**
   * Run performance tests and collect metrics
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Performance test results
   */
  async runPerformanceTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   ⚡ Running performance tests...');

    // Response time test
    const responseTimeResult = await this.runTest('Response Time Performance', async () => {
      const iterations = 5;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}`);
        const responseTime = Date.now() - startTime;
        
        if (!response.ok) {
          throw new Error(`Performance test request ${i + 1} failed: ${response.status}`);
        }
        
        times.push(responseTime);
        this.metrics.responseTimes.push({
          timestamp: new Date(),
          endpoint: '/health',
          responseTime,
          status: response.status
        });
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      if (averageTime > this.config.responseTimeThreshold) {
        throw new Error(`Average response time ${averageTime.toFixed(2)}ms exceeds threshold ${this.config.responseTimeThreshold}ms`);
      }

      return { 
        averageTime: Math.round(averageTime), 
        maxTime, 
        minTime, 
        iterations,
        threshold: this.config.responseTimeThreshold,
        passed: true
      };
    });

    tests.push(responseTimeResult);
    if (responseTimeResult.status === 'passed') passed++; else failed++;

    // Memory usage monitoring
    const memoryResult = await this.runTest('Memory Usage Monitoring', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate some load
      for (let i = 0; i < 10; i++) {
        await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}`);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      this.metrics.memoryUsage.push({
        timestamp: new Date(),
        initial: initialMemory,
        final: finalMemory,
        increase: memoryIncrease
      });

      return {
        initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
        increase: Math.round(memoryIncrease / 1024),
        unit: 'MB'
      };
    });

    tests.push(memoryResult);
    if (memoryResult.status === 'passed') passed++; else failed++;

    return {
      suite: 'performance',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed',
      metrics: {
        averageResponseTime: this.metrics.responseTimes.length > 0 
          ? this.metrics.responseTimes.reduce((sum, m) => sum + m.responseTime, 0) / this.metrics.responseTimes.length 
          : 0
      }
    };
  }

  /**
   * Run regression tests against known issues
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Regression test results
   */
  async runRegressionTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   🔄 Running regression tests...');

    // Test for common regression issues
    const corsResult = await this.runTest('CORS Headers Regression', async () => {
      const response = await this.makeRequest('OPTIONS', `${config.baseUrl}${config.endpoints.health}`);
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };

      return { corsHeaders, corsEnabled: !!corsHeaders['access-control-allow-origin'] };
    });

    tests.push(corsResult);
    if (corsResult.status === 'passed') passed++; else failed++;

    // Security headers regression
    const securityResult = await this.runTest('Security Headers Regression', async () => {
      const response = await this.makeRequest('GET', `${config.baseUrl}${config.endpoints.health}`);
      
      const securityHeaders = {
        'x-content-type-options': response.headers.get('x-content-type-options'),
        'x-frame-options': response.headers.get('x-frame-options'),
        'x-xss-protection': response.headers.get('x-xss-protection'),
        'strict-transport-security': response.headers.get('strict-transport-security')
      };

      const hasSecurityHeaders = Object.values(securityHeaders).some(value => value !== null);

      return { securityHeaders, hasSecurityHeaders };
    });

    tests.push(securityResult);
    if (securityResult.status === 'passed') passed++; else failed++;

    return {
      suite: 'regression',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed'
    };
  }

  /**
   * Run integration tests across multiple components
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Integration test results
   */
  async runIntegrationTests(config) {
    const tests = [];
    let passed = 0;
    let failed = 0;

    console.log('   🔗 Running integration tests...');

    // Full authentication flow integration
    const authFlowResult = await this.runTest('Complete Authentication Flow', async () => {
      // Step 1: Request magic link
      const magicResponse = await this.makeRequest('POST', 
        `${config.baseUrl}${config.endpoints.auth.magicLink}`,
        {
          email: `integration-test-${Date.now()}@example.com`,
          name: 'Integration Test User'
        }
      );

      if (!magicResponse.ok) {
        throw new Error(`Magic link request failed: ${magicResponse.status}`);
      }

      const magicData = await magicResponse.json();
      const token = magicData.data?.token;

      if (!token) {
        throw new Error('No magic link token received');
      }

      // Step 2: Verify token
      const verifyResponse = await this.makeRequest('POST',
        `${config.baseUrl}${config.endpoints.auth.verify}`,
        { token }
      );

      if (!verifyResponse.ok) {
        throw new Error(`Token verification failed: ${verifyResponse.status}`);
      }

      const verifyData = await verifyResponse.json();
      const authToken = verifyData.data?.token;

      if (!authToken) {
        throw new Error('No auth token received');
      }

      // Step 3: Access protected endpoint
      const profileResponse = await this.makeRequest('GET',
        `${config.baseUrl}${config.endpoints.auth.me}`,
        null,
        { 'Authorization': `Bearer ${authToken}` }
      );

      if (!profileResponse.ok) {
        throw new Error(`Protected endpoint access failed: ${profileResponse.status}`);
      }

      return { 
        flowComplete: true, 
        stepsCompleted: 3,
        userAuthenticated: true
      };
    });

    tests.push(authFlowResult);
    if (authFlowResult.status === 'passed') passed++; else failed++;

    return {
      suite: 'integration',
      tests,
      passed,
      failed,
      total: tests.length,
      status: failed === 0 ? 'passed' : 'failed'
    };
  }

  /**
   * Execute a single test with error handling and metrics
   * @param {string} testName - Test name
   * @param {Function} testFunction - Test function
   * @returns {Promise<Object>} Test result
   */
  async runTest(testName, testFunction) {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Starting test: ${testName}`);
      
      const result = await Promise.race([
        testFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), this.config.timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      
      this.logger.success(`Test passed: ${testName} (${duration}ms)`, result);
      
      return {
        name: testName,
        status: 'passed',
        duration,
        result,
        timestamp: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Test failed: ${testName} (${duration}ms)`, error.message);
      
      this.testResults.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
        duration
      });

      return {
        name: testName,
        status: 'failed',
        duration,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Make HTTP request with retry logic and metrics collection
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} headers - Request headers
   * @returns {Promise<Response>} Response object
   */
  async makeRequest(method, url, body = null, headers = {}) {
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Tester/2.0.0',
        ...headers
      }
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = JSON.stringify(body);
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.session.performance.requests++;
        
        this.logger.debug(`${method} ${url} (attempt ${attempt})`);
        
        const response = await fetch(url, requestOptions);
        
        this.logger.debug(`Response: ${response.status} ${response.statusText}`);
        
        return response;
        
      } catch (error) {
        lastError = error;
        this.session.performance.errors++;
        
        if (attempt === this.config.retryAttempts) {
          this.logger.error(`Request failed after ${attempt} attempts: ${error.message}`);
          throw error;
        }
        
        this.logger.warn(`Request attempt ${attempt} failed, retrying in ${this.config.retryDelay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
    
    throw lastError;
  }

  /**
   * Analyze performance metrics and generate insights
   * @param {Object} results - Test results
   * @returns {Promise<Object>} Performance analysis
   */
  async analyzePerformance(results) {
    console.log('\n📊 Analyzing performance metrics...');

    const analysis = {
      timestamp: new Date(),
      metrics: {
        totalRequests: this.session.performance.requests,
        totalErrors: this.session.performance.errors,
        errorRate: this.session.performance.requests > 0 
          ? (this.session.performance.errors / this.session.performance.requests * 100).toFixed(2)
          : 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0
      },
      insights: [],
      recommendations: []
    };

    // Calculate response time statistics
    if (this.metrics.responseTimes.length > 0) {
      const times = this.metrics.responseTimes.map(m => m.responseTime);
      analysis.metrics.averageResponseTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      analysis.metrics.maxResponseTime = Math.max(...times);
      analysis.metrics.minResponseTime = Math.min(...times);

      // Generate insights
      if (analysis.metrics.averageResponseTime > this.config.responseTimeThreshold) {
        analysis.insights.push({
          type: 'performance_warning',
          message: `Average response time (${analysis.metrics.averageResponseTime}ms) exceeds threshold`,
          severity: 'medium'
        });
        analysis.recommendations.push('Consider optimizing API endpoints or infrastructure scaling');
      }

      if (analysis.metrics.maxResponseTime > this.config.responseTimeThreshold * 2) {
        analysis.insights.push({
          type: 'performance_critical',
          message: `Maximum response time (${analysis.metrics.maxResponseTime}ms) is critically high`,
          severity: 'high'
        });
        analysis.recommendations.push('Investigate slow queries or network issues');
      }
    }

    // Analyze error rates
    if (parseFloat(analysis.metrics.errorRate) > 5) {
      analysis.insights.push({
        type: 'reliability_warning',
        message: `Error rate (${analysis.metrics.errorRate}%) is above acceptable threshold`,
        severity: 'high'
      });
      analysis.recommendations.push('Review error logs and implement additional error handling');
    }

    // Save metrics to file
    if (this.config.exportMetrics) {
      const metricsData = {
        session: this.session,
        analysis,
        rawMetrics: this.metrics,
        results
      };

      await writeFile(this.metricsFile, JSON.stringify(metricsData, null, 2));
      console.log(`   💾 Metrics saved to: ${this.metricsFile}`);
    }

    return analysis;
  }

  /**
   * Generate comprehensive HTML test report
   * @param {Object} results - Test results
   * @param {string} sessionId - Session ID
   * @returns {Promise<string>} Report file path
   */
  async generateTestReport(results, sessionId) {
    console.log('\n📄 Generating test report...');

    const reportData = {
      sessionId,
      timestamp: new Date(),
      config: this.session.config,
      results,
      performance: this.session.performance,
      metrics: this.metrics,
      summary: {
        totalTests: this.testResults.totalTests,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: this.testResults.totalTests > 0 
          ? ((this.testResults.passed / this.testResults.totalTests) * 100).toFixed(1)
          : 0,
        duration: this.testResults.duration
      }
    };

    const htmlReport = this.generateHtmlReport(reportData);
    
    await writeFile(this.reportFile, htmlReport);
    console.log(`   📊 Report generated: ${this.reportFile}`);

    return this.reportFile;
  }

  /**
   * Generate HTML report content
   * @param {Object} data - Report data
   * @returns {string} HTML content
   */
  generateHtmlReport(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production Test Report - ${data.sessionId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; font-size: 24px; }
        .summary-card p { margin: 0; color: #64748b; }
        .passed { color: #059669; }
        .failed { color: #dc2626; }
        .suite { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; padding: 20px; }
        .suite h3 { margin: 0 0 15px 0; color: #1e293b; }
        .test { padding: 10px; border-left: 4px solid #e2e8f0; margin-bottom: 10px; }
        .test.passed { border-color: #059669; background: #f0fdf4; }
        .test.failed { border-color: #dc2626; background: #fef2f2; }
        .test-name { font-weight: 600; }
        .test-details { font-size: 14px; color: #64748b; margin-top: 5px; }
        .metrics { background: #f1f5f9; border-radius: 6px; padding: 20px; margin-top: 20px; }
        .metrics h3 { margin: 0 0 15px 0; }
        .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .metric-row:last-child { border-bottom: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Production Test Report</h1>
            <p>Session: ${data.sessionId}</p>
            <p>Generated: ${data.timestamp.toLocaleString()}</p>
            <p>Environment: ${data.config.environment} | Base URL: ${data.config.baseUrl}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="summary-card">
                    <h3>${data.summary.totalTests}</h3>
                    <p>Total Tests</p>
                </div>
                <div class="summary-card">
                    <h3 class="passed">${data.summary.passed}</h3>
                    <p>Passed</p>
                </div>
                <div class="summary-card">
                    <h3 class="failed">${data.summary.failed}</h3>
                    <p>Failed</p>
                </div>
                <div class="summary-card">
                    <h3>${data.summary.successRate}%</h3>
                    <p>Success Rate</p>
                </div>
                <div class="summary-card">
                    <h3>${data.summary.duration.toFixed(2)}s</h3>
                    <p>Duration</p>
                </div>
            </div>

            ${Object.entries(data.results.suites || {}).map(([suiteName, suite]) => `
                <div class="suite">
                    <h3>📋 ${suiteName.charAt(0).toUpperCase() + suiteName.slice(1)} Tests</h3>
                    ${(suite.tests || []).map(test => `
                        <div class="test ${test.status}">
                            <div class="test-name">
                                ${test.status === 'passed' ? '✅' : '❌'} ${test.name}
                            </div>
                            <div class="test-details">
                                Duration: ${test.duration}ms
                                ${test.error ? ` | Error: ${test.error}` : ''}
                                ${test.result ? ` | ${JSON.stringify(test.result)}` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}

            <div class="metrics">
                <h3>📊 Performance Metrics</h3>
                <div class="metric-row">
                    <span>Total Requests</span>
                    <span>${data.performance.requests}</span>
                </div>
                <div class="metric-row">
                    <span>Total Errors</span>
                    <span>${data.performance.errors}</span>
                </div>
                <div class="metric-row">
                    <span>Average Response Time</span>
                    <span>${data.metrics.responseTimes.length > 0 
                      ? Math.round(data.metrics.responseTimes.reduce((sum, m) => sum + m.responseTime, 0) / data.metrics.responseTimes.length) + 'ms'
                      : 'N/A'}</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Finalize test results and update counters
   * @param {Object} results - Test results
   */
  finalizeTestResults(results) {
    this.testResults.totalTests = results.summary.total;
    this.testResults.passed = results.summary.passed;
    this.testResults.failed = results.summary.failed;
    this.testResults.skipped = results.summary.skipped;
    this.testResults.environments[this.session.config.environment] = results;
    
    console.log('\n✨ Test suite finalized');
    console.log(`   📁 Logs: ${this.logFile}`);
    if (this.config.generateReport) {
      console.log(`   📊 Report: ${this.reportFile}`);
    }
    if (this.config.exportMetrics) {
      console.log(`   📈 Metrics: ${this.metricsFile}`);
    }
  }
}

// Legacy function exports for backward compatibility

/**
 * Quick production health check
 * @param {string} baseUrl - Base URL to test
 * @returns {Promise<Object>} Health check results
 */
export async function quickHealthCheck(baseUrl) {
  const tester = new ProductionTester({ 
    verbose: false, 
    generateReport: false, 
    exportMetrics: false 
  });
  
  return await tester.runProductionTests(baseUrl, {
    testSuites: ['health']
  });
}

/**
 * Run authentication tests
 * @param {string} baseUrl - Base URL to test
 * @param {Object} testUser - Test user configuration
 * @returns {Promise<Object>} Authentication test results
 */
export async function testAuthenticationFlow(baseUrl, testUser) {
  const tester = new ProductionTester({ 
    verbose: true,
    generateReport: false
  });
  
  return await tester.runProductionTests(baseUrl, {
    testSuites: ['authentication'],
    testUser
  });
}

/**
 * Run comprehensive production validation
 * @param {string} baseUrl - Base URL to test
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Complete test results
 */
export async function validateProduction(baseUrl, options = {}) {
  const tester = new ProductionTester({
    verbose: true,
    generateReport: true,
    exportMetrics: true,
    ...options
  });
  
  return await tester.runProductionTests(baseUrl, {
    testSuites: ['health', 'authentication', 'endpoints', 'database', 'performance', 'regression', 'integration'],
    ...options
  });
}