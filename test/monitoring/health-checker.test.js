/**
 * HealthChecker Unit Tests
 *
 * Tests the HealthChecker class for runtime health monitoring
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { HealthChecker } from '../../src/monitoring/HealthChecker.js';

describe('HealthChecker', () => {
  let healthChecker;

  beforeEach(() => {
    jest.useFakeTimers();
    healthChecker = new HealthChecker({
      timeout: 5000,
      interval: 30000
    });
    // Mock the sleep method to avoid delays in tests
    healthChecker.sleep = jest.fn().mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const checker = new HealthChecker();

      expect(checker.options.timeout).toBe(5000);
      expect(checker.options.interval).toBe(30000);
      expect(checker.checks.size).toBe(0);
    });

    test('should initialize with custom options', () => {
      const checker = new HealthChecker({
        timeout: 10000,
        interval: 60000
      });

      expect(checker.options.timeout).toBe(10000);
      expect(checker.options.interval).toBe(60000);
    });
  });

  describe('addCheck', () => {
    test('should add a health check', () => {
      const checkFunction = jest.fn().mockResolvedValue({ status: 'Database OK' });

      healthChecker.addCheck('database', checkFunction);

      expect(healthChecker.checks.size).toBe(1);
      expect(healthChecker.checks.get('database')).toEqual({
        name: 'database',
        checkFunction,
        options: {
          timeout: 5000,
          critical: true
        },
        lastResult: null,
        lastCheck: null
      });
    });

    test('should add check with custom options', () => {
      const checkFunction = jest.fn();

      healthChecker.addCheck('cache', checkFunction, {
        timeout: 1000,
        critical: false
      });

      const check = healthChecker.checks.get('cache');
      expect(check.options.timeout).toBe(1000);
      expect(check.options.critical).toBe(false);
    });
  });

  describe('removeCheck', () => {
    test('should remove a health check', () => {
      healthChecker.addCheck('database', jest.fn());
      expect(healthChecker.checks.size).toBe(1);

      healthChecker.removeCheck('database');
      expect(healthChecker.checks.size).toBe(0);
    });
  });

  describe('runChecks', () => {
    test('should run all checks and return healthy status', async () => {
      healthChecker.addCheck('database', jest.fn().mockResolvedValue({ message: 'DB OK' }));
      healthChecker.addCheck('cache', jest.fn().mockResolvedValue({ message: 'Cache OK' }));

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.cache.status).toBe('healthy');
      expect(result.summary.total).toBe(2);
      expect(result.summary.healthy).toBe(2);
      expect(result.summary.unhealthy).toBe(0);
    });

    test('should return unhealthy status when critical check fails', async () => {
      healthChecker.addCheck('database', jest.fn().mockRejectedValue(new Error('DB down')));

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
      expect(result.summary.unhealthy).toBe(1);
    }, 10000);

    test('should continue with other checks when non-critical check fails', async () => {
      healthChecker.addCheck('database', jest.fn().mockResolvedValue({ message: 'DB OK' }));
      healthChecker.addCheck('cache', jest.fn().mockRejectedValue(new Error('Cache down')), {
        critical: false
      });

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy'); // Overall healthy because cache is not critical
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.cache.status).toBe('unhealthy');
    }, 10000);

    test.skip('should handle timeout', async () => {
      const slowCheck = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ message: 'OK' }), 10000))
      );

      healthChecker.addCheck('slow-service', slowCheck, { timeout: 100 });

      const checkPromise = healthChecker.runChecks();

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(200);

      const result = await checkPromise;

      expect(result.checks['slow-service'].status).toBe('unhealthy');
      expect(result.checks['slow-service'].error).toContain('timed out');

      jest.useRealTimers();
    });
  });

  describe('runSingleCheck', () => {
    test('should run single check successfully', async () => {
      const checkFunction = jest.fn().mockResolvedValue({ message: 'OK' });
      const check = {
        name: 'test',
        checkFunction,
        options: { timeout: 5000, critical: true },
        lastResult: null,
        lastCheck: null
      };

      const result = await healthChecker.runSingleCheck(check);

      expect(result.status).toBe('healthy');
      expect(result.details).toEqual({ message: 'OK' });
      expect(check.lastResult).toEqual({ message: 'OK' });
      expect(check.lastCheck).toBeInstanceOf(Date);
    });

    test('should handle check failure', async () => {
      const checkFunction = jest.fn().mockRejectedValue(new Error('Check failed'));
      const check = {
        name: 'test',
        checkFunction,
        options: { timeout: 5000, critical: true },
        lastResult: null,
        lastCheck: null
      };

      await expect(healthChecker.runSingleCheck(check)).rejects.toThrow('Check failed');
    }, 10000);

    test('should retry on failure', async () => {
      const checkFunction = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({ message: 'OK' });

      const check = {
        name: 'test',
        checkFunction,
        options: { timeout: 5000, critical: true },
        lastResult: null,
        lastCheck: null
      };

      const result = await healthChecker.runSingleCheck(check);

      expect(checkFunction).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('healthy');
    }, 10000);
  });

  describe('getLastResults', () => {
    test('should return last check results', async () => {
      healthChecker.addCheck('database', jest.fn().mockResolvedValue({ message: 'OK' }));

      expect(healthChecker.getLastResults()).toBe(null);

      await healthChecker.runChecks();

      const results = healthChecker.getLastResults();
      expect(results).toHaveProperty('status', 'healthy');
      expect(results).toHaveProperty('checks');
      expect(results).toHaveProperty('summary');
    });
  });

  describe('getStatus', () => {
    test('should return unknown when no checks run', () => {
      expect(healthChecker.getStatus()).toBe('unknown');
    });

    test('should return status from last results', async () => {
      healthChecker.addCheck('database', jest.fn().mockResolvedValue({ message: 'OK' }));

      await healthChecker.runChecks();

      expect(healthChecker.getStatus()).toBe('healthy');
    });
  });

  describe('isHealthy', () => {
    test('should return true when healthy', async () => {
      healthChecker.addCheck('database', jest.fn().mockResolvedValue({ message: 'OK' }));

      await healthChecker.runChecks();

      expect(healthChecker.isHealthy()).toBe(true);
    });

    test('should return false when unhealthy', async () => {
      healthChecker.addCheck('database', jest.fn().mockRejectedValue(new Error('Down')));

      await healthChecker.runChecks();

      expect(healthChecker.isHealthy()).toBe(false);
    }, 10000);
  });

  describe('addCommonChecks', () => {
    test('should add D1 check when DATABASE binding exists', () => {
      const env = { DATABASE: {} };

      healthChecker.addCommonChecks(env);

      expect(healthChecker.checks.has('database')).toBe(true);
    });

    test('should add KV check when KV_CACHE binding exists', () => {
      const env = { KV_CACHE: {} };

      healthChecker.addCommonChecks(env);

      expect(healthChecker.checks.has('kv')).toBe(true);
    });

    test('should add R2 check when R2_STORAGE binding exists', () => {
      const env = { R2_STORAGE: {} };

      healthChecker.addCommonChecks(env);

      expect(healthChecker.checks.has('r2')).toBe(true);
    });

    test('should add memory check', () => {
      const env = {};

      healthChecker.addCommonChecks(env);

      expect(healthChecker.checks.has('memory')).toBe(true);
      expect(healthChecker.checks.get('memory').options.critical).toBe(false);
    });
  });

  describe('startPeriodicChecks', () => {
    test('should start periodic health checking', () => {
      const env = { DATABASE: {} };
      const runChecksSpy = jest.spyOn(healthChecker, 'runChecks').mockResolvedValue({ status: 'healthy' });

      healthChecker.startPeriodicChecks(env);

      expect(healthChecker.checks.size).toBeGreaterThan(0);

      // Fast-forward time
      jest.advanceTimersByTime(30000);

      expect(runChecksSpy).toHaveBeenCalled();
    });

    test('should not start periodic checks when interval is 0', () => {
      const checker = new HealthChecker({ interval: 0 });
      const env = {};

      checker.startPeriodicChecks(env);

      expect(checker.intervalId).toBeUndefined();
    });
  });

  describe('stopPeriodicChecks', () => {
    test('should stop periodic health checking', () => {
      const env = {};
      healthChecker.startPeriodicChecks(env);

      expect(healthChecker.intervalId).toBeDefined();

      healthChecker.stopPeriodicChecks();

      expect(healthChecker.intervalId).toBeNull();
    });
  });

  describe('getSummary', () => {
    test('should return unknown status when no checks run', () => {
      const summary = healthChecker.getSummary();

      expect(summary).toEqual({
        status: 'unknown',
        message: 'No health checks run yet'
      });
    });

    test('should return summary from last results', async () => {
      healthChecker.addCheck('database', jest.fn().mockResolvedValue({ message: 'OK' }));
      healthChecker.addCheck('cache', jest.fn().mockRejectedValue(new Error('Down')));

      await healthChecker.runChecks();

      const summary = healthChecker.getSummary();

      expect(summary.status).toBe('unhealthy');
      expect(summary.totalChecks).toBe(2);
      expect(summary.healthyChecks).toBe(1);
      expect(summary.unhealthyChecks).toBe(1);
    }, 10000);
  });
});