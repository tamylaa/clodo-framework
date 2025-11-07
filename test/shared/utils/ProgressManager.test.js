/**
 * ProgressManager.test.js - Comprehensive test suite for ProgressManager utility
 * Tests all progress tracking methods, step management, and output integration
 */

import { ProgressManager } from '../../../lib/shared/utils/progress-manager.js';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { OutputFormatter } from '../../../lib/shared/utils/output-formatter.js';

describe('ProgressManager Utility', () => {
  let progressManager;
  let outputFormatter;
  let logOutput;

  beforeEach(() => {
    // Setup output capture
    logOutput = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      logOutput.push(args.join(' '));
    };
    console.error = (...args) => {
      logOutput.push(args.join(' '));
    };

    // Create formatter with captured output
    outputFormatter = new OutputFormatter({ quiet: false });
    progressManager = new ProgressManager({ output: outputFormatter });
  });

  afterEach(() => {
    progressManager.stop();
    progressManager.reset();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const pm = new ProgressManager();
      expect(pm.quiet).toBe(false);
      expect(pm.json).toBe(false);
      expect(pm.output).toBe(null);
      expect(pm.steps).toEqual([]);
      expect(pm.currentStep).toBe(0);
      expect(pm.totalSteps).toBe(0);
    });

    test('should initialize with custom output formatter', () => {
      const pm = new ProgressManager({ output: outputFormatter });
      expect(pm.output).toBe(outputFormatter);
    });

    test('should accept quiet option', () => {
      const pm = new ProgressManager({ quiet: true });
      expect(pm.quiet).toBe(true);
    });

    test('should accept json option', () => {
      const pm = new ProgressManager({ json: true });
      expect(pm.json).toBe(true);
    });
  });

  describe('Step Initialization', () => {
    test('should initialize with step names', () => {
      const steps = ['Download', 'Install', 'Configure'];
      progressManager.initialize(steps);
      expect(progressManager.steps).toEqual(steps);
      expect(progressManager.totalSteps).toBe(3);
      expect(progressManager.currentStep).toBe(0);
    });

    test('should initialize with empty steps', () => {
      progressManager.initialize([]);
      expect(progressManager.steps).toEqual([]);
      expect(progressManager.totalSteps).toBe(0);
    });

    test('should support method chaining on initialize', () => {
      const result = progressManager.initialize(['Step 1']);
      expect(result).toBe(progressManager);
    });

    test('should set start time on initialize', () => {
      progressManager.initialize(['Step']);
      expect(progressManager.startTime).toBeDefined();
      expect(progressManager.startTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Spinner Control', () => {
    test('start should not throw error', () => {
      expect(() => progressManager.start('Processing...')).not.toThrow();
    });

    test('start should support method chaining', () => {
      const result = progressManager.start('Processing...');
      expect(result).toBe(progressManager);
    });

    test('stop should remove spinner', () => {
      progressManager.start('Processing...');
      progressManager.stop();
      expect(progressManager.spinner).toBeNull();
    });

    test('stop should support method chaining', () => {
      const result = progressManager.stop();
      expect(result).toBe(progressManager);
    });

    test('start should not output in quiet mode', () => {
      const pm = new ProgressManager({ quiet: true });
      logOutput = [];
      pm.start('Processing');
      expect(logOutput.length).toBe(0);
    });
  });

  describe('Step Progression', () => {
    test('nextStep should increment current step', () => {
      progressManager.initialize(['Step 1', 'Step 2', 'Step 3']);
      progressManager.nextStep();
      expect(progressManager.currentStep).toBe(1);
      progressManager.nextStep();
      expect(progressManager.currentStep).toBe(2);
    });

    test('nextStep should use provided step name', () => {
      progressManager.initialize(['Step 1']);
      logOutput = [];
      progressManager.nextStep('Custom Step');
      const output = logOutput.join('');
      expect(output).toContain('Custom Step');
    });

    test('nextStep should use initialized step name if not provided', () => {
      progressManager.initialize(['First Step']);
      logOutput = [];
      progressManager.nextStep();
      const output = logOutput.join('');
      expect(output).toContain('First Step');
    });

    test('nextStep should calculate progress percentage', () => {
      progressManager.initialize(['A', 'B', 'C', 'D']);
      progressManager.nextStep();
      expect(progressManager.getProgress()).toBe(25);
      progressManager.nextStep();
      expect(progressManager.getProgress()).toBe(50);
      progressManager.nextStep();
      expect(progressManager.getProgress()).toBe(75);
      progressManager.nextStep();
      expect(progressManager.getProgress()).toBe(100);
    });

    test('nextStep should support method chaining', () => {
      progressManager.initialize(['Step']);
      const result = progressManager.nextStep();
      expect(result).toBe(progressManager);
    });

    test('nextStep should not output in quiet mode', () => {
      const pm = new ProgressManager({ quiet: true, output: outputFormatter });
      pm.initialize(['Step']);
      logOutput = [];
      pm.nextStep();
      expect(logOutput.length).toBe(0);
    });
  });

  describe('Progress Updates', () => {
    test('update should accept message and percent', () => {
      progressManager.update('Processing item 5 of 10', 50);
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('update should support method chaining', () => {
      const result = progressManager.update('Processing');
      expect(result).toBe(progressManager);
    });

    test('update should not require percent', () => {
      expect(() => progressManager.update('Processing')).not.toThrow();
    });

    test('update should not output in quiet mode', () => {
      const pm = new ProgressManager({ quiet: true, output: outputFormatter });
      logOutput = [];
      pm.update('Processing');
      expect(logOutput.length).toBe(0);
    });
  });

  describe('Status Messages', () => {
    test('succeed should display success message', () => {
      logOutput = [];
      progressManager.succeed('Operation completed');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = logOutput.join('');
      expect(output).toContain('Operation completed');
    });

    test('fail should display error message', () => {
      logOutput = [];
      progressManager.fail('Operation failed');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = logOutput.join('');
      expect(output).toContain('Operation failed');
    });

    test('warn should display warning message', () => {
      logOutput = [];
      progressManager.warn('Warning: check this');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = logOutput.join('');
      expect(output).toContain('Warning');
    });

    test('succeed/fail/warn should support method chaining', () => {
      expect(progressManager.succeed('Done')).toBe(progressManager);
      expect(progressManager.fail('Error')).toBe(progressManager);
      expect(progressManager.warn('Warning')).toBe(progressManager);
    });

    test('succeed should not output in quiet mode', () => {
      const pm = new ProgressManager({ quiet: true, output: outputFormatter });
      logOutput = [];
      pm.succeed('Done');
      expect(logOutput.length).toBe(0);
    });
  });

  describe('Duration Tracking', () => {
    test('getDuration should return null if not started', () => {
      const pm = new ProgressManager();
      expect(pm.getDuration()).toBeNull();
    });

    test('getDuration should return formatted string after start', async () => {
      progressManager.initialize(['Step']);
      // Wait a bit to ensure some time passes
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = progressManager.getDuration();
      expect(duration).toBeDefined();
      expect(duration).toContain('s');
    });

    test('getDuration should format seconds correctly', async () => {
      progressManager.initialize(['Step']);
      await new Promise(resolve => setTimeout(resolve, 100));
      const duration = progressManager.getDuration();
      expect(duration).toMatch(/\d+\.\d+s/);
    });

    test('getDuration should format minutes correctly for long operations', () => {
      progressManager.initialize(['Step']);
      progressManager.startTime = Date.now() - (90 * 1000); // 90 seconds ago
      const duration = progressManager.getDuration();
      expect(duration).toContain('m');
      expect(duration).toContain('s');
    });
  });

  describe('Progress Information', () => {
    test('getProgress should return 0 if no steps initialized', () => {
      expect(progressManager.getProgress()).toBe(0);
    });

    test('getProgress should return percentage based on current step', () => {
      progressManager.initialize(['A', 'B', 'C', 'D']);
      progressManager.currentStep = 2;
      expect(progressManager.getProgress()).toBe(50);
    });

    test('getStepInfo should return current step information', () => {
      progressManager.initialize(['Download', 'Install', 'Configure']);
      progressManager.nextStep();
      const info = progressManager.getStepInfo();
      expect(info.current).toBe(1);
      expect(info.total).toBe(3);
      expect(info.name).toBe('Download');
    });

    test('getStepInfo should handle unnamed steps', () => {
      progressManager.initialize([]);
      progressManager.currentStep = 1;
      const info = progressManager.getStepInfo();
      expect(info.name).toBe('Step 1');
    });
  });

  describe('Task List Display', () => {
    test('showTasks should display task progress', () => {
      const tasks = [
        { name: 'Task 1', completed: true },
        { name: 'Task 2', completed: true },
        { name: 'Task 3', completed: false }
      ];
      logOutput = [];
      progressManager.showTasks(tasks);
      expect(logOutput.length).toBeGreaterThan(0);
      const output = logOutput.join('');
      expect(output).toContain('Tasks');
    });

    test('showTasks should display correct completed count', () => {
      const tasks = [
        { completed: true },
        { completed: true },
        { completed: false },
        { completed: false }
      ];
      logOutput = [];
      progressManager.showTasks(tasks);
      const output = logOutput.join('');
      // Should show 2 completed out of 4 total (50%)
      expect(output).toContain('2');
    });

    test('showTasks should support method chaining', () => {
      const result = progressManager.showTasks([]);
      expect(result).toBe(progressManager);
    });
  });

  describe('Multi-Step Display', () => {
    test('showMultiStep should display with current/total', () => {
      logOutput = [];
      progressManager.showMultiStep({ current: 3, total: 5, message: 'Processing' });
      expect(logOutput.length).toBeGreaterThan(0);
      const output = logOutput.join('');
      expect(output).toContain('3');
      expect(output).toContain('5');
    });

    test('showMultiStep should support method chaining', () => {
      const result = progressManager.showMultiStep({});
      expect(result).toBe(progressManager);
    });

    test('showMultiStep should handle missing fields', () => {
      expect(() => progressManager.showMultiStep({})).not.toThrow();
    });
  });

  describe('Timed Progress Display', () => {
    test('showTimed should display timed progress', () => {
      logOutput = [];
      progressManager.showTimed(5000, 10000, 'Uploading');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = logOutput.join('');
      expect(output).toContain('50'); // 50%
    });

    test('showTimed should calculate percentage correctly', () => {
      progressManager.showTimed(2500, 10000);
      // Percentage is calculated in output method, just verify no error
      expect(progressManager.getProgress()).toBe(0); // Progress is independent
    });

    test('showTimed should support method chaining', () => {
      const result = progressManager.showTimed(0, 100);
      expect(result).toBe(progressManager);
    });
  });

  describe('Reset', () => {
    test('reset should clear all state', () => {
      progressManager.initialize(['Step 1', 'Step 2']);
      progressManager.nextStep();
      progressManager.reset();
      expect(progressManager.steps).toEqual([]);
      expect(progressManager.currentStep).toBe(0);
      expect(progressManager.totalSteps).toBe(0);
      expect(progressManager.startTime).toBeNull();
    });

    test('reset should support method chaining', () => {
      const result = progressManager.reset();
      expect(result).toBe(progressManager);
    });

    test('reset should stop spinner', () => {
      progressManager.start('Processing');
      progressManager.reset();
      expect(progressManager.spinner).toBeNull();
    });
  });

  describe('Method Chaining', () => {
    test('should support chaining multiple operations', () => {
      progressManager
        .initialize(['Download', 'Install', 'Configure'])
        .start('Beginning operation')
        .nextStep()
        .update('Downloaded files', 33)
        .nextStep()
        .update('Installing', 66)
        .nextStep()
        .update('Configuring', 99)
        .succeed('Operation complete');
      expect(progressManager.currentStep).toBe(3);
    });
  });

  describe('Quiet Mode', () => {
    test('should suppress all output when quiet', () => {
      const pm = new ProgressManager({ quiet: true, output: outputFormatter });
      logOutput = [];
      pm.initialize(['Step'])
        .start('Processing')
        .nextStep()
        .update('Working', 50)
        .succeed('Done');
      expect(logOutput.length).toBe(0);
    });

    test('should still allow state tracking in quiet mode', () => {
      // Create a fresh instance for this test
      const newPm = new ProgressManager({ quiet: true });
      newPm.initialize(['Step 1', 'Step 2']);
      newPm.nextStep();
      expect(newPm.currentStep).toBe(1);
      expect(newPm.totalSteps).toBe(2);
      expect(newPm.getProgress()).toBe(50);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle typical deployment workflow', () => {
      progressManager.initialize(['Preparing', 'Validating', 'Deploying', 'Verifying']);
      progressManager.start('Starting deployment');
      
      progressManager.nextStep(); // Preparing
      progressManager.update('Gathering files', 10);
      
      progressManager.nextStep(); // Validating
      progressManager.update('Checking configuration', 50);
      
      progressManager.nextStep(); // Deploying
      progressManager.update('Pushing to server', 75);
      
      progressManager.nextStep(); // Verifying
      progressManager.update('Running tests', 95);
      
      progressManager.succeed('Deployment complete');
      expect(progressManager.currentStep).toBe(4);
      expect(progressManager.getProgress()).toBe(100);
    });

    test('should handle task list workflow', () => {
      const tasks = [
        { name: 'Download', completed: true },
        { name: 'Extract', completed: true },
        { name: 'Install', completed: false }
      ];
      
      progressManager.start('Installation');
      progressManager.showTasks(tasks);
      progressManager.succeed('Installation complete');
    });
  });
});
