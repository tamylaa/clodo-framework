/**
 * Progress Spinner Tests
 * Test suite for progress display utilities
 * Tests: showProgressSpinner, showProgressWithSpinner
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { showProgressSpinner, showProgressWithSpinner } from '../../../lib/shared/utils/progress-spinner.js';

describe('Progress Spinner Utilities', () => {
  let originalStdout;

  beforeEach(() => {
    // Mock stdout.write to capture output
    originalStdout = process.stdout.write;
    process.stdout.write = jest.fn();
  });

  afterEach(() => {
    process.stdout.write = originalStdout;
  });

  describe('showProgressSpinner', () => {
    test('displays progress with default spinner and duration', async () => {
      const promise = showProgressSpinner('Testing progress...', 100); // Shorter duration

      // Wait for completion
      await promise;

      // Check that stdout.write was called multiple times (initial + spinner + completion)
      expect(process.stdout.write).toHaveBeenCalled();
      expect(process.stdout.write.mock.calls.length).toBeGreaterThan(1); // At least initial + completion

      // Check that the completion message was written at some point
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes('Done!'));
      expect(completionCall).toBeDefined();
    });

    test('accepts custom duration', async () => {
      const startTime = Date.now();
      await showProgressSpinner('Custom duration...', 100);
      const endTime = Date.now();

      // Should complete within reasonable time of the specified duration
      expect(endTime - startTime).toBeGreaterThanOrEqual(90);
      expect(endTime - startTime).toBeLessThan(200);
    });

    test('handles empty message', async () => {
      await showProgressSpinner('', 100);

      // Check that the completion message was written
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes('... Done!'));
      expect(completionCall).toBeDefined();
    });

    test('handles long messages', async () => {
      const longMessage = 'A'.repeat(100);
      await showProgressSpinner(longMessage, 100);

      // Check that the completion message was written
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes(`${longMessage}... Done!`));
      expect(completionCall).toBeDefined();
    });
  });

  describe('showProgressWithSpinner', () => {
    test('displays progress with custom spinner characters', async () => {
      const customSpinner = ['◐', '◓', '◑', '◒'];
      await showProgressWithSpinner('Custom spinner...', customSpinner, 100);

      // Check that the completion message was written
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes('Done!'));
      expect(completionCall).toBeDefined();
    });

    test('uses default spinner when none provided', async () => {
      await showProgressWithSpinner('Default spinner...', undefined, 100);

      // Check that the completion message was written
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes('Done!'));
      expect(completionCall).toBeDefined();
    });

    test('accepts custom duration with custom spinner', async () => {
      const startTime = Date.now();
      const customSpinner = ['|', '/', '-', '\\'];
      await showProgressWithSpinner('Timing test...', customSpinner, 50);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(40);
      expect(endTime - startTime).toBeLessThanOrEqual(150); // Allow more tolerance for system variability
    });

    test('handles single character spinner', async () => {
      const singleCharSpinner = ['*'];
      await showProgressWithSpinner('Single char...', singleCharSpinner, 100);

      // Check that the completion message was written
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes('Done!'));
      expect(completionCall).toBeDefined();
    });

    test('handles empty spinner array gracefully', async () => {
      // This should not crash but might not show spinner animation
      await showProgressWithSpinner('Empty spinner...', [], 100);

      // Check that the completion message was written
      const calls = process.stdout.write.mock.calls;
      const completionCall = calls.find(call => call[0] && call[0].includes('Done!'));
      expect(completionCall).toBeDefined();
    });
  });

  describe('integration tests', () => {
    test('multiple progress spinners can run concurrently', async () => {
      const promises = [
        showProgressSpinner('Task 1', 100),
        showProgressSpinner('Task 2', 100),
        showProgressWithSpinner('Task 3', ['◐', '◓'], 100)
      ];

      await Promise.all(promises);

      // Check that all tasks completed
      const calls = process.stdout.write.mock.calls;
      const completionCalls = calls.filter(call => call[0] && call[0].includes('Done!'));
      expect(completionCalls.length).toBe(3);
      expect(completionCalls.some(call => call[0].includes('Task 1... Done!'))).toBe(true);
      expect(completionCalls.some(call => call[0].includes('Task 2... Done!'))).toBe(true);
      expect(completionCalls.some(call => call[0].includes('Task 3... Done!'))).toBe(true);
    });

    test('progress spinner returns a promise that resolves', async () => {
      const result = await showProgressSpinner('Promise test...', 100);

      // The function should return undefined (void) but the promise should resolve
      expect(result).toBeUndefined();
    });
  });
});
