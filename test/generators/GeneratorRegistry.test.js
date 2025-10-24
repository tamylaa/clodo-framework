/**
 * Tests for GeneratorRegistry
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GeneratorRegistry } from '../../src/service-management/generators/GeneratorRegistry.js';
import { BaseGenerator } from '../../src/service-management/generators/BaseGenerator.js';

// Mock generators for testing
class MockGenerator extends BaseGenerator {
  constructor(name, shouldGenerate = true) {
    super({ name });
    this._shouldGenerate = shouldGenerate;
  }

  async generate(context) {
    this.context = context;
    return `${this.name} generated`;
  }

  shouldGenerate(context) {
    return typeof this._shouldGenerate === 'function' 
      ? this._shouldGenerate(context) 
      : this._shouldGenerate;
  }
}

class FailingGenerator extends BaseGenerator {
  constructor(name) {
    super({ name });
  }

  async generate() {
    throw new Error(`${this.name} intentionally failed`);
  }
}

describe('GeneratorRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new GeneratorRegistry();
  });

  describe('Constructor', () => {
    test('should initialize with empty registry', () => {
      expect(registry.getCount()).toBe(0);
      expect(registry.getCategories()).toEqual([]);
    });

    test('should have predefined execution order', () => {
      expect(registry.executionOrder).toEqual([
        'core',
        'config',
        'code',
        'scripts',
        'tests',
        'docs',
        'ci',
        'service-types'
      ]);
    });
  });

  describe('register()', () => {
    test('should register a single generator', () => {
      const gen = new MockGenerator('TestGen');
      registry.register('core', gen);

      expect(registry.getCount()).toBe(1);
      expect(registry.getGenerators('core')).toContain(gen);
    });

    test('should register multiple generators as array', () => {
      const gen1 = new MockGenerator('Gen1');
      const gen2 = new MockGenerator('Gen2');
      
      registry.register('core', [gen1, gen2]);

      expect(registry.getCount()).toBe(2);
      expect(registry.getGenerators('core')).toEqual([gen1, gen2]);
    });

    test('should append generators to existing category', () => {
      const gen1 = new MockGenerator('Gen1');
      const gen2 = new MockGenerator('Gen2');
      const gen3 = new MockGenerator('Gen3');

      registry.register('core', gen1);
      registry.register('core', [gen2, gen3]);

      expect(registry.getCount()).toBe(3);
      expect(registry.getGenerators('core')).toEqual([gen1, gen2, gen3]);
    });

    test('should throw error if category is invalid', () => {
      const gen = new MockGenerator('TestGen');
      
      expect(() => registry.register('', gen)).toThrow('Category must be a non-empty string');
      expect(() => registry.register(null, gen)).toThrow('Category must be a non-empty string');
      expect(() => registry.register(123, gen)).toThrow('Category must be a non-empty string');
    });

    test('should throw error if generators not provided', () => {
      expect(() => registry.register('core', null)).toThrow('Generators must be provided');
      expect(() => registry.register('core', undefined)).toThrow('Generators must be provided');
    });

    test('should throw error if empty array provided', () => {
      expect(() => registry.register('core', [])).toThrow('At least one generator must be provided');
    });

    test('should throw error if generator missing generate() method', () => {
      const invalidGen = { name: 'Invalid' };
      
      expect(() => registry.register('core', invalidGen)).toThrow(/must have a generate\(\) method/);
    });
  });

  describe('unregister()', () => {
    test('should remove generator by name', () => {
      const gen1 = new MockGenerator('Gen1');
      const gen2 = new MockGenerator('Gen2');
      
      registry.register('core', [gen1, gen2]);
      const removed = registry.unregister('core', 'Gen1');

      expect(removed).toBe(true);
      expect(registry.getCount()).toBe(1);
      expect(registry.getGenerators('core')).toEqual([gen2]);
    });

    test('should remove category if last generator removed', () => {
      const gen = new MockGenerator('Gen1');
      
      registry.register('core', gen);
      registry.unregister('core', 'Gen1');

      expect(registry.hasCategory('core')).toBe(false);
    });

    test('should return false if category not found', () => {
      const removed = registry.unregister('missing', 'Gen1');
      expect(removed).toBe(false);
    });

    test('should return false if generator not found', () => {
      const gen = new MockGenerator('Gen1');
      registry.register('core', gen);
      
      const removed = registry.unregister('core', 'Gen2');
      expect(removed).toBe(false);
      expect(registry.getCount()).toBe(1); // Still has Gen1
    });
  });

  describe('getGenerators()', () => {
    test('should return generators for category', () => {
      const gen1 = new MockGenerator('Gen1');
      const gen2 = new MockGenerator('Gen2');
      
      registry.register('core', [gen1, gen2]);

      expect(registry.getGenerators('core')).toEqual([gen1, gen2]);
    });

    test('should return empty array for missing category', () => {
      expect(registry.getGenerators('missing')).toEqual([]);
    });
  });

  describe('getCategories()', () => {
    test('should return categories in execution order', () => {
      registry.register('docs', new MockGenerator('DocsGen'));
      registry.register('core', new MockGenerator('CoreGen'));
      registry.register('config', new MockGenerator('ConfigGen'));

      const categories = registry.getCategories();
      
      // Should be in execution order: core, config, docs
      expect(categories).toEqual(['core', 'config', 'docs']);
    });

    test('should include custom categories after ordered ones', () => {
      registry.register('core', new MockGenerator('CoreGen'));
      registry.register('custom', new MockGenerator('CustomGen'));
      registry.register('config', new MockGenerator('ConfigGen'));

      const categories = registry.getCategories();
      
      // core and config are in order, custom is appended
      expect(categories[0]).toBe('core');
      expect(categories[1]).toBe('config');
      expect(categories[2]).toBe('custom');
    });
  });

  describe('getCount()', () => {
    test('should return total generator count', () => {
      registry.register('core', [new MockGenerator('Gen1'), new MockGenerator('Gen2')]);
      registry.register('config', new MockGenerator('Gen3'));

      expect(registry.getCount()).toBe(3);
    });

    test('should return 0 for empty registry', () => {
      expect(registry.getCount()).toBe(0);
    });
  });

  describe('getCategoryCount()', () => {
    test('should return count for specific category', () => {
      registry.register('core', [new MockGenerator('Gen1'), new MockGenerator('Gen2')]);
      registry.register('config', new MockGenerator('Gen3'));

      expect(registry.getCategoryCount('core')).toBe(2);
      expect(registry.getCategoryCount('config')).toBe(1);
    });

    test('should return 0 for missing category', () => {
      expect(registry.getCategoryCount('missing')).toBe(0);
    });
  });

  describe('hasCategory()', () => {
    test('should return true if category has generators', () => {
      registry.register('core', new MockGenerator('Gen1'));
      expect(registry.hasCategory('core')).toBe(true);
    });

    test('should return false if category is empty or missing', () => {
      expect(registry.hasCategory('missing')).toBe(false);
    });
  });

  describe('clearCategory()', () => {
    test('should remove all generators from category', () => {
      registry.register('core', [new MockGenerator('Gen1'), new MockGenerator('Gen2')]);
      
      const cleared = registry.clearCategory('core');
      
      expect(cleared).toBe(true);
      expect(registry.hasCategory('core')).toBe(false);
      expect(registry.getCount()).toBe(0);
    });

    test('should return false if category does not exist', () => {
      const cleared = registry.clearCategory('missing');
      expect(cleared).toBe(false);
    });
  });

  describe('clearAll()', () => {
    test('should remove all generators from all categories', () => {
      registry.register('core', new MockGenerator('Gen1'));
      registry.register('config', new MockGenerator('Gen2'));
      
      registry.clearAll();
      
      expect(registry.getCount()).toBe(0);
      expect(registry.getCategories()).toEqual([]);
    });
  });

  describe('execute()', () => {
    let mockLogger;

    beforeEach(() => {
      mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
    });

    test('should execute all generators in order', async () => {
      const gen1 = new MockGenerator('Gen1');
      const gen2 = new MockGenerator('Gen2');
      const gen3 = new MockGenerator('Gen3');

      registry.register('config', gen2);
      registry.register('core', gen1);
      registry.register('docs', gen3);

      const context = { serviceName: 'test-service' };
      const results = await registry.execute(context, { logger: mockLogger });

      expect(results.success).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
      expect(results.skipped).toHaveLength(0);

      // Verify execution order: core -> config -> docs
      expect(results.success[0].name).toBe('Gen1'); // core
      expect(results.success[1].name).toBe('Gen2'); // config
      expect(results.success[2].name).toBe('Gen3'); // docs
    });

    test('should pass context to generators', async () => {
      const gen = new MockGenerator('Gen1');
      registry.register('core', gen);

      const context = { serviceName: 'test-service', port: 8080 };
      await registry.execute(context, { logger: mockLogger });

      expect(gen.context).toEqual(context);
    });

    test('should skip generators where shouldGenerate() returns false', async () => {
      const gen1 = new MockGenerator('Gen1', true);
      const gen2 = new MockGenerator('Gen2', false);
      const gen3 = new MockGenerator('Gen3', true);

      registry.register('core', [gen1, gen2, gen3]);

      const results = await registry.execute({}, { logger: mockLogger });

      expect(results.success).toHaveLength(2);
      expect(results.skipped).toHaveLength(1);
      expect(results.skipped[0].name).toBe('Gen2');
    });

    test('should handle generator failures without stopping by default', async () => {
      const gen1 = new MockGenerator('Gen1');
      const failGen = new FailingGenerator('FailGen');
      const gen2 = new MockGenerator('Gen2');

      registry.register('core', [gen1, failGen, gen2]);

      const results = await registry.execute({}, { logger: mockLogger, stopOnError: false });

      expect(results.success).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].name).toBe('FailGen');
    });

    test('should stop execution on error if stopOnError is true', async () => {
      const gen1 = new MockGenerator('Gen1');
      const failGen = new FailingGenerator('FailGen');
      const gen2 = new MockGenerator('Gen2');

      registry.register('core', [gen1, failGen, gen2]);

      await expect(
        registry.execute({}, { logger: mockLogger, stopOnError: true })
      ).rejects.toThrow(/Generator execution stopped/);
    });

    test('should log execution summary', async () => {
      const gen = new MockGenerator('Gen1');
      registry.register('core', gen);

      await registry.execute({}, { logger: mockLogger });

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Generator Execution Summary'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Success: 1'));
    });

    test('should use console as default logger', async () => {
      const gen = new MockGenerator('Gen1');
      registry.register('core', gen);

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      
      await registry.execute({});
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getSummary()', () => {
    test('should return summary of all generators', () => {
      registry.register('core', [new MockGenerator('Gen1'), new MockGenerator('Gen2')]);
      registry.register('config', new MockGenerator('Gen3'));

      const summary = registry.getSummary();

      expect(summary.totalCategories).toBe(2);
      expect(summary.totalGenerators).toBe(3);
      expect(summary.categories.core.count).toBe(2);
      expect(summary.categories.core.generators).toEqual(['Gen1', 'Gen2']);
      expect(summary.categories.config.count).toBe(1);
      expect(summary.categories.config.generators).toEqual(['Gen3']);
    });

    test('should return empty summary for empty registry', () => {
      const summary = registry.getSummary();

      expect(summary.totalCategories).toBe(0);
      expect(summary.totalGenerators).toBe(0);
      expect(summary.categories).toEqual({});
    });
  });
});
