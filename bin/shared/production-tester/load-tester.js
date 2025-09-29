/**
 * Load Testing Module
 * Specialized module for load testing and stress testing
 */

import fetch from 'node-fetch';

export class LoadTester {
  constructor(config) {
    this.config = config;
  }

  async runLoadTests(environment) {
    const results = {
      passed: 0,
      failed: 0,
      scenarios: []
    };

    // Load testing scenarios
    const scenarios = [
      { name: 'Light Load Test', concurrent: 5, requests: 20, test: () => this.runLoadScenario(environment, 5, 20) },
      { name: 'Medium Load Test', concurrent: 10, requests: 50, test: () => this.runLoadScenario(environment, 10, 50) }
    ];

    for (const scenario of scenarios) {
      try {
        const result = await scenario.test();
        results.scenarios.push({
          name: scenario.name,
          concurrent: scenario.concurrent,
          totalRequests: scenario.requests,
          success: result.success,
          metrics: result.metrics
        });

        if (result.success) {
          results.passed++;
        } else {
          results.failed++;
        }

      } catch (error) {
        results.scenarios.push({
          name: scenario.name,
          success: false,
          error: error.message
        });
        results.failed++;
      }
    }

    return results;
  }

  async runLoadScenario(environment, concurrent, totalRequests) {
    const metrics = {
      totalRequests,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: []
    };

    const startTime = Date.now();

    // Create concurrent request batches
    const batches = [];
    for (let i = 0; i < totalRequests; i += concurrent) {
      batches.push(totalRequests - i >= concurrent ? concurrent : totalRequests - i);
    }

    for (const batchSize of batches) {
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(this.makeLoadRequest(environment, metrics));
      }

      await Promise.allSettled(promises);

      // Small delay between batches to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalTime = Date.now() - startTime;
    const avgResponseTime = metrics.responseTimes.length > 0
      ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
      : 0;

    return {
      success: metrics.failedRequests === 0 && avgResponseTime < 5000, // 5 second threshold
      metrics: {
        ...metrics,
        totalTime,
        avgResponseTime,
        requestsPerSecond: totalRequests / (totalTime / 1000),
        successRate: (metrics.successfulRequests / totalRequests) * 100
      }
    };
  }

  async makeLoadRequest(environment, metrics) {
    const startTime = Date.now();

    try {
      const response = await fetch(`https://${environment}.api.example.com/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'LoadTester/2.0'
        },
        timeout: 10000 // 10 second timeout for load tests
      });

      const responseTime = Date.now() - startTime;
      metrics.responseTimes.push(responseTime);

      if (response.ok) {
        metrics.successfulRequests++;
      } else {
        metrics.failedRequests++;
        metrics.errors.push(`HTTP ${response.status}`);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      metrics.responseTimes.push(responseTime);
      metrics.failedRequests++;
      metrics.errors.push(error.message);
    }
  }
}