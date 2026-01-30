/**
 * CircuitBreaker Unit Tests
 *
 * Tests the CircuitBreaker class for resilience patterns
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { CircuitBreaker } from '../../src/utils/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 5000,
      monitoringPeriod: 10000
    });
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const cb = new CircuitBreaker();

      expect(cb.options.failureThreshold).toBe(5);
      expect(cb.options.recoveryTimeout).toBe(60000);
      expect(cb.options.monitoringPeriod).toBe(10000);
    });

    test('should initialize with custom options', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 10000
      });

      expect(cb.options.failureThreshold).toBe(2);
      expect(cb.options.recoveryTimeout).toBe(10000);
    });
  });

  describe('canExecute', () => {
    test('should allow execution when circuit is closed', () => {
      expect(circuitBreaker.canExecute('test-service')).toBe(true);
    });

    test('should prevent execution when circuit is open', () => {
      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-service');
      }

      expect(circuitBreaker.canExecute('test-service')).toBe(false);
    });

    test('should allow execution when circuit is half-open after timeout', () => {
      jest.useFakeTimers();
      
      // Create circuit breaker with shorter recovery timeout for testing
      const testCircuitBreaker = new CircuitBreaker({ recoveryTimeout: 5000 });

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        testCircuitBreaker.recordFailure('test-service');
      }

      expect(testCircuitBreaker.canExecute('test-service')).toBe(false);

      // Fast-forward time past recovery timeout
      jest.advanceTimersByTime(6000);

      expect(testCircuitBreaker.canExecute('test-service')).toBe(true);
      
      jest.useRealTimers();
    });

    test('should allow execution when circuit is half-open', () => {
      // Manually set to half-open
      circuitBreaker.setServiceState('test-service', 'half-open');

      expect(circuitBreaker.canExecute('test-service')).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    test('should reset failure count on success in closed state', () => {
      circuitBreaker.recordFailure('test-service');
      circuitBreaker.recordFailure('test-service');

      expect(circuitBreaker.getServiceState('test-service').failureCount).toBe(2);

      circuitBreaker.recordSuccess('test-service');

      expect(circuitBreaker.getServiceState('test-service').failureCount).toBe(0);
    });

    test('should transition from half-open to closed on required successes', () => {
      // Set to half-open
      circuitBreaker.setServiceState('test-service', 'half-open');

      // Record successes
      circuitBreaker.recordSuccess('test-service');
      circuitBreaker.recordSuccess('test-service');
      circuitBreaker.recordSuccess('test-service'); // Required successes

      expect(circuitBreaker.getServiceState('test-service').state).toBe('closed');
    });

    test('should stay in half-open until required successes reached', () => {
      // Set to half-open
      circuitBreaker.setServiceState('test-service', 'half-open');

      circuitBreaker.recordSuccess('test-service');
      circuitBreaker.recordSuccess('test-service');

      expect(circuitBreaker.getServiceState('test-service').state).toBe('half-open');
    });
  });

  describe('recordFailure', () => {
    test('should increment failure count', () => {
      circuitBreaker.recordFailure('test-service');
      expect(circuitBreaker.getServiceState('test-service').failureCount).toBe(1);

      circuitBreaker.recordFailure('test-service');
      expect(circuitBreaker.getServiceState('test-service').failureCount).toBe(2);
    });

    test('should transition to open when failure threshold reached', () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-service');
      }

      expect(circuitBreaker.getServiceState('test-service').state).toBe('open');
    });

    test('should set next attempt time when opening', () => {
      const beforeTime = Date.now();

      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-service');
      }

      const state = circuitBreaker.getServiceState('test-service');
      expect(state.nextAttemptTime).toBeGreaterThanOrEqual(beforeTime + 5000);
    });
  });

  describe('getStatus', () => {
    test('should return complete status information', () => {
      const status = circuitBreaker.getStatus('test-service');

      expect(status).toEqual({
        service: 'test-service',
        state: 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        successCount: 0,
        canExecute: true
      });
    });

    test('should return status for open circuit', () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-service');
      }

      const status = circuitBreaker.getStatus('test-service');

      expect(status.state).toBe('open');
      expect(status.canExecute).toBe(false);
      expect(status.failureCount).toBe(3);
    });
  });

  describe('reset', () => {
    test('should reset circuit to closed state', () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-service');
      }

      expect(circuitBreaker.getServiceState('test-service').state).toBe('open');

      // Reset
      circuitBreaker.reset('test-service');

      const state = circuitBreaker.getServiceState('test-service');
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.lastFailureTime).toBe(null);
    });
  });

  describe('trip', () => {
    test('should force circuit to open state', () => {
      circuitBreaker.trip('test-service');

      expect(circuitBreaker.getServiceState('test-service').state).toBe('open');
    });
  });

  describe('getAllStatuses', () => {
    test('should return status for all services', () => {
      circuitBreaker.recordFailure('service1');
      circuitBreaker.recordFailure('service2');
      circuitBreaker.recordFailure('service2');

      const statuses = circuitBreaker.getAllStatuses();

      expect(statuses).toHaveProperty('service1');
      expect(statuses).toHaveProperty('service2');
      expect(statuses.service1.failureCount).toBe(1);
      expect(statuses.service2.failureCount).toBe(2);
    });
  });

  describe('cleanup', () => {
    test('should remove old service states', () => {
      // Create circuit breaker with shorter monitoring period for testing
      const testCircuitBreaker = new CircuitBreaker({ monitoringPeriod: 1000 });

      // Add a service with old failure time
      const oldTime = Date.now() - 20000; // 20 seconds ago
      testCircuitBreaker.services.set('old-service', {
        state: 'closed',
        failureCount: 1,
        lastFailureTime: oldTime,
        nextAttemptTime: null,
        successCount: 0
      });

      // Add a recent service
      testCircuitBreaker.recordFailure('recent-service');

      testCircuitBreaker.cleanup();

      expect(testCircuitBreaker.services.has('old-service')).toBe(false);
      expect(testCircuitBreaker.services.has('recent-service')).toBe(true);
    });
  });
});