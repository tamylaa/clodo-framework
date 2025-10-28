/**
 * OutputFormatter.test.js - Comprehensive test suite for OutputFormatter utility
 * Tests all output formatting methods, flag combinations, and edge cases
 */

import { OutputFormatter } from '../../../bin/shared/utils/output-formatter.js';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import chalk from 'chalk';

describe('OutputFormatter Utility', () => {
  let formatter;
  let logOutput;
  let errorOutput;
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    // Capture console output
    logOutput = [];
    errorOutput = [];
    
    // eslint-disable-next-line no-global-assign
    console.log = (...args) => {
      logOutput.push(args.join(' '));
    };
    // eslint-disable-next-line no-global-assign
    console.error = (...args) => {
      errorOutput.push(args.join(' '));
    };

    // Disable chalk colors for consistent testing
    chalk.level = 0;
  });

  afterEach(() => {
    // eslint-disable-next-line no-global-assign
    console.log = originalLog;
    // eslint-disable-next-line no-global-assign
    console.error = originalError;
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      formatter = new OutputFormatter();
      expect(formatter.quiet).toBe(false);
      expect(formatter.verbose).toBe(false);
      expect(formatter.json).toBe(false);
      expect(formatter.noColor).toBe(false);
    });

    test('should accept custom options', () => {
      formatter = new OutputFormatter({
        quiet: true,
        verbose: true,
        json: true,
        noColor: true
      });
      expect(formatter.quiet).toBe(true);
      expect(formatter.verbose).toBe(true);
      expect(formatter.json).toBe(true);
      expect(formatter.noColor).toBe(true);
    });
  });

  describe('Success Output', () => {
    test('should output success message when not quiet', () => {
      formatter = new OutputFormatter({ quiet: false });
      formatter.success('Operation completed');
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput[0]).toContain('Operation completed');
    });

    test('should not output when quiet mode is enabled', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.success('Operation completed');
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON when json mode is enabled', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.success('Operation completed', { count: 5 });
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('success');
      expect(output.message).toBe('Operation completed');
      expect(output.count).toBe(5);
    });
  });

  describe('Error Output', () => {
    test('should output error message', () => {
      formatter = new OutputFormatter();
      formatter.error('Operation failed');
      expect(errorOutput.length).toBeGreaterThan(0);
      expect(errorOutput[0]).toContain('Operation failed');
    });

    test('should output error even in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.error('Operation failed');
      expect(errorOutput.length).toBeGreaterThan(0);
    });

    test('should output JSON error', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.error('Operation failed', { code: 'ERR_001' });
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('error');
      expect(output.message).toBe('Operation failed');
      expect(output.code).toBe('ERR_001');
    });
  });

  describe('Warning Output', () => {
    test('should output warning message when not quiet', () => {
      formatter = new OutputFormatter();
      formatter.warning('Check this');
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput[0]).toContain('Check this');
    });

    test('should not output in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.warning('Check this');
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON warning', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.warning('Check this', { code: 'WARN_001' });
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('warning');
    });
  });

  describe('Info Output', () => {
    test('should output info message', () => {
      formatter = new OutputFormatter();
      formatter.info('Information');
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput[0]).toContain('Information');
    });

    test('should not output in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.info('Information');
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON info', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.info('Information');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('info');
    });
  });

  describe('Section Output', () => {
    test('should output section header', () => {
      formatter = new OutputFormatter();
      formatter.section('Main Section');
      expect(logOutput.length).toBeGreaterThan(0);
      // Section outputs multiple lines including empty lines, so look for the section title
      const hasTitle = logOutput.some(line => line.includes('Main Section'));
      expect(hasTitle).toBe(true);
    });

    test('should not output in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.section('Main Section');
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON section', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.section('Main Section');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('section');
      expect(output.message).toBe('Main Section');
    });
  });

  describe('List Output', () => {
    test('should output list of items', () => {
      formatter = new OutputFormatter();
      formatter.list('Items', ['item1', 'item2', 'item3']);
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('should use custom indent', () => {
      formatter = new OutputFormatter();
      formatter.list('Items', ['item1'], { indent: '    ' });
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('should use custom symbol', () => {
      formatter = new OutputFormatter();
      formatter.list('Items', ['item1'], { symbol: '-' });
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('should not output in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.list('Items', ['item1']);
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON list', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.list('Items', ['item1', 'item2']);
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('list');
      expect(output.items).toEqual(['item1', 'item2']);
    });
  });

  describe('Table Output', () => {
    test('should output table data', () => {
      formatter = new OutputFormatter();
      const rows = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      formatter.table(rows, ['name', 'age']);
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('should not output empty table in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      const rows = [{ name: 'Alice', age: 30 }];
      formatter.table(rows);
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON table', () => {
      formatter = new OutputFormatter({ json: true });
      const rows = [{ name: 'Alice', age: 30 }];
      formatter.table(rows, ['name', 'age']);
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('table');
      expect(output.rows).toBeDefined();
    });

    test('should handle empty rows', () => {
      formatter = new OutputFormatter();
      formatter.table([]);
      expect(logOutput.length).toBe(0);
    });
  });

  describe('Progress Output', () => {
    test('should output progress message', () => {
      formatter = new OutputFormatter();
      formatter.progress('Processing');
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput[0]).toContain('Processing');
    });

    test('should include progress bar with percent', () => {
      formatter = new OutputFormatter();
      formatter.progress('Processing', { percent: 50 });
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput[0]).toContain('50%');
    });

    test('should not output in quiet mode', () => {
      formatter = new OutputFormatter({ quiet: true });
      formatter.progress('Processing');
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON progress', () => {
      formatter = new OutputFormatter({ json: true });
      formatter.progress('Processing', { percent: 25 });
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('progress');
      expect(output.percent).toBe(25);
    });
  });

  describe('Debug Output', () => {
    test('should not output debug without verbose', () => {
      formatter = new OutputFormatter({ verbose: false });
      formatter.debug('Debug info');
      expect(logOutput.length).toBe(0);
    });

    test('should output debug with verbose', () => {
      formatter = new OutputFormatter({ verbose: true });
      formatter.debug('Debug info');
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput[0]).toContain('[DEBUG]');
    });

    test('should not output debug in quiet mode', () => {
      formatter = new OutputFormatter({ verbose: true, quiet: true });
      formatter.debug('Debug info');
      expect(logOutput.length).toBe(0);
    });

    test('should output JSON debug', () => {
      formatter = new OutputFormatter({ verbose: true, json: true });
      formatter.debug('Debug info', { value: 42 });
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('debug');
      expect(output.value).toBe(42);
    });
  });

  describe('Flag Combinations', () => {
    test('should respect quiet over verbose', () => {
      formatter = new OutputFormatter({ quiet: true, verbose: true });
      formatter.info('Message');
      expect(logOutput.length).toBe(0);
    });

    test('should respect quiet over json', () => {
      formatter = new OutputFormatter({ quiet: true, json: true });
      formatter.success('Message');
      expect(logOutput.length).toBe(0);
    });

    test('should prefer json over other formats', () => {
      formatter = new OutputFormatter({ json: true, verbose: true });
      formatter.success('Message');
      expect(logOutput.length).toBeGreaterThan(0);
      const output = JSON.parse(logOutput[0]);
      expect(output.type).toBe('success');
    });

    test('should work with no flags', () => {
      formatter = new OutputFormatter({});
      formatter.info('Message');
      expect(logOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Buffer Methods', () => {
    test('should initialize empty buffer', () => {
      formatter = new OutputFormatter();
      expect(formatter.getBuffer()).toBe('');
    });

    test('should clear buffer', () => {
      formatter = new OutputFormatter();
      formatter.buffer = ['item1', 'item2'];
      formatter.clear();
      expect(formatter.buffer.length).toBe(0);
    });

    test('should get buffer contents', () => {
      formatter = new OutputFormatter();
      formatter.buffer = ['line1', 'line2'];
      expect(formatter.getBuffer()).toBe('line1\nline2');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle command output workflow', () => {
      formatter = new OutputFormatter();
      formatter.section('Starting Operation');
      formatter.info('Initializing');
      formatter.progress('Processing', { percent: 50 });
      formatter.success('Complete');
      expect(logOutput.length).toBeGreaterThanOrEqual(4);
    });

    test('should handle error workflow', () => {
      formatter = new OutputFormatter();
      formatter.section('Starting Operation');
      formatter.error('Something went wrong', { code: 'ERR_001' });
      expect(errorOutput.length).toBeGreaterThan(0);
      expect(logOutput.length).toBeGreaterThan(0); // section header
    });

    test('should handle json workflow', () => {
      formatter = new OutputFormatter({ json: true });
      logOutput = [];
      formatter.info('Processing');
      formatter.success('Done', { items: 10 });
      formatter.warning('Note something');
      expect(logOutput.length).toBeGreaterThanOrEqual(3);
      // All should be valid JSON
      logOutput.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    test('should handle quiet workflow', () => {
      formatter = new OutputFormatter({ quiet: true });
      logOutput = [];
      errorOutput = [];
      formatter.section('Section');
      formatter.info('Info');
      formatter.warning('Warning');
      formatter.success('Success');
      formatter.error('Error'); // Errors always show
      expect(errorOutput.length).toBeGreaterThan(0);
      expect(logOutput.length).toBe(0);
    });
  });
});
