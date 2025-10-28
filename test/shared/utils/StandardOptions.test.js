/**
 * StandardOptions.test.js - Comprehensive test suite for StandardOptions utility
 * Tests all CLI option definitions, validation logic, and Command.js integration
 */

import { StandardOptions } from '../../../bin/shared/utils/cli-options.js';
import { describe, test, expect, beforeEach } from '@jest/globals';
import { Command } from 'commander';

describe('StandardOptions Utility', () => {
  describe('Initialization', () => {
    test('getOptions should return all standard options', () => {
      const options = StandardOptions.getOptions();
      expect(options).toHaveProperty('verbose');
      expect(options).toHaveProperty('quiet');
      expect(options).toHaveProperty('json');
      expect(options).toHaveProperty('noColor');
      expect(options).toHaveProperty('configFile');
    });

    test('getOptions should have correct option metadata', () => {
      const options = StandardOptions.getOptions();
      expect(options.verbose.flags).toBe('-v, --verbose');
      expect(options.quiet.flags).toBe('-q, --quiet');
      expect(options.json.flags).toBe('--json');
      expect(options.noColor.flags).toBe('--no-color');
      expect(options.configFile.flags).toBe('--config-file <path>');
    });

    test('getOptions should have descriptions', () => {
      const options = StandardOptions.getOptions();
      expect(options.verbose.description).toBeDefined();
      expect(options.quiet.description).toBeDefined();
      expect(options.json.description).toBeDefined();
      expect(options.noColor.description).toBeDefined();
      expect(options.configFile.description).toBeDefined();
    });
  });

  describe('Option Definition', () => {
    test('define should add options to a Command', () => {
      const command = new Command('test');
      StandardOptions.define(command);

      const helpOutput = command.helpInformation();
      expect(helpOutput).toContain('--verbose');
      expect(helpOutput).toContain('--quiet');
      expect(helpOutput).toContain('--json');
      expect(helpOutput).toContain('--no-color');
      expect(helpOutput).toContain('--config-file');
    });

    test('define should add all five options', () => {
      const command = new Command('test');
      StandardOptions.define(command);

      const options = command.options;
      expect(options.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Option Display Names', () => {
    test('getDisplayName should convert option keys to display format', () => {
      expect(StandardOptions.getDisplayName('verbose')).toBe('Verbose');
      expect(StandardOptions.getDisplayName('quiet')).toBe('Quiet');
      expect(StandardOptions.getDisplayName('json')).toBe('JSON');
      expect(StandardOptions.getDisplayName('noColor')).toBe('No Color');
      expect(StandardOptions.getDisplayName('configFile')).toBe('Config File');
    });

    test('getDisplayName should handle unknown keys', () => {
      expect(StandardOptions.getDisplayName('unknown')).toBe('Unknown');
    });

    test('getDisplayName should capitalize first letter', () => {
      expect(StandardOptions.getDisplayName('verbose')).toMatch(/^[A-Z]/);
    });
  });

  describe('Option Checking', () => {
    test('isProvided should return true if option is provided', () => {
      const opts = { verbose: true };
      expect(StandardOptions.isProvided(opts, 'verbose')).toBe(true);
    });

    test('isProvided should return false if option not provided', () => {
      const opts = {};
      expect(StandardOptions.isProvided(opts, 'verbose')).toBe(false);
    });

    test('isProvided should handle undefined values', () => {
      const opts = { verbose: undefined };
      expect(StandardOptions.isProvided(opts, 'verbose')).toBe(false);
    });

    test('isProvided should return true for non-false values', () => {
      const opts = { verbose: 'true' };
      expect(StandardOptions.isProvided(opts, 'verbose')).toBe(true);
    });
  });

  describe('Validation', () => {
    test('validate should return success with no conflicts', () => {
      const result = StandardOptions.validate({ verbose: true });
      expect(result.valid).toBe(true);
    });

    test('validate should detect verbose and quiet conflict', () => {
      const result = StandardOptions.validate({ verbose: true, quiet: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validate should accept verbose without quiet', () => {
      const result = StandardOptions.validate({ verbose: true });
      expect(result.valid).toBe(true);
    });

    test('validate should accept quiet without verbose', () => {
      const result = StandardOptions.validate({ quiet: true });
      expect(result.valid).toBe(true);
    });

    test('validate should return errors array', () => {
      const result = StandardOptions.validate({});
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('validate should handle empty options', () => {
      const result = StandardOptions.validate({});
      expect(result.valid).toBe(true);
    });

    test('validate should accept multiple valid options', () => {
      const result = StandardOptions.validate({
        verbose: true,
        json: true,
        noColor: true
      });
      expect(result.valid).toBe(true);
    });

    test('validate should reject conflicting options', () => {
      const result = StandardOptions.validate({
        verbose: true,
        quiet: true,
        json: true
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    test('should work with Command.js for CLI parsing', () => {
      const program = new Command();
      const command = program.command('test').description('Test command');
      StandardOptions.define(command);

      const helpText = command.helpInformation();
      expect(helpText).toContain('--verbose');
      expect(helpText).toContain('--quiet');
    });

    test('should support all options without conflicts', () => {
      const opts = {
        verbose: true,
        json: true,
        noColor: true,
        configFile: '/path/to/config.json'
      };
      const result = StandardOptions.validate(opts);
      expect(result.valid).toBe(true);
    });

    test('should provide consistent API across all options', () => {
      const options = StandardOptions.getOptions();
      Object.entries(options).forEach(([key, opt]) => {
        expect(opt).toHaveProperty('flags');
        expect(opt).toHaveProperty('description');
        expect(StandardOptions.getDisplayName(key)).toBeDefined();
      });
    });

    test('should validate after parsing with Commander', () => {
      const command = new Command('test');
      StandardOptions.define(command);
      const opts = command.opts();
      const result = StandardOptions.validate(opts);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });
  });

  describe('Edge Cases', () => {
    test('isProvided should work with all falsy values', () => {
      expect(StandardOptions.isProvided({}, 'verbose')).toBe(false);
      expect(StandardOptions.isProvided({ verbose: null }, 'verbose')).toBe(false);
      expect(StandardOptions.isProvided({ verbose: 0 }, 'verbose')).toBe(true); // 0 is provided
      expect(StandardOptions.isProvided({ verbose: '' }, 'verbose')).toBe(true); // empty string is provided
    });

    test('validate should handle null options', () => {
      const result = StandardOptions.validate(null);
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    test('getDisplayName should handle camelCase conversion', () => {
      const name = StandardOptions.getDisplayName('configFile');
      expect(name).toContain('Config');
      expect(name).toContain('File');
    });

    test('should handle options object with extra properties', () => {
      const opts = {
        verbose: true,
        quiet: false,
        extraProp: 'value',
        anotherProp: 123
      };
      const result = StandardOptions.validate(opts);
      expect(result.valid).toBe(true);
    });
  });

  describe('Mutation Safety', () => {
    test('getOptions should return consistent object', () => {
      const opts1 = StandardOptions.getOptions();
      const opts2 = StandardOptions.getOptions();
      expect(opts1).toEqual(opts2);
    });

    test('validate should not mutate input options', () => {
      const opts = { verbose: true, quiet: true };
      const optsCopy = { ...opts };
      StandardOptions.validate(opts);
      expect(opts).toEqual(optsCopy);
    });
  });
});
