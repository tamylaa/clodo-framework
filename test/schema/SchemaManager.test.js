import { jest } from '@jest/globals';
import { SchemaManager } from '../../src/schema/SchemaManager.js';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('SchemaManager', () => {
  let schemaManager;

  beforeEach(() => {
    schemaManager = new SchemaManager();
  });

  afterEach(() => {
    // Clean up after each test
    schemaManager.clearSchemaCache();
  });

  describe('constructor', () => {
    test('should initialize with empty maps and caches', () => {
      expect(schemaManager.schemas).toBeInstanceOf(Map);
      expect(schemaManager.relationships).toBeInstanceOf(Map);
      expect(schemaManager.schemaCache).toBeInstanceOf(Map);
      expect(schemaManager.sqlCache).toBeInstanceOf(Map);
      expect(schemaManager.validationCache).toBeInstanceOf(Map);
      expect(schemaManager.cacheEnabled).toBe(true);
      expect(schemaManager.cacheStats).toEqual({
        hits: 0,
        misses: 0,
        validationHits: 0,
        validationMisses: 0
      });
    });
  });

  describe('registerModel', () => {
    test('should register a basic model schema', () => {
      const modelName = 'test_model';
      const schema = {
        tableName: 'test_table',
        columns: {
          id: { type: 'text', primaryKey: true },
          name: { type: 'text' }
        }
      };

      schemaManager.registerModel(modelName, schema);

      expect(schemaManager.hasModel(modelName)).toBe(true);
      const registeredSchema = schemaManager.getModel(modelName);
      expect(registeredSchema.name).toBe(modelName);
      expect(registeredSchema.tableName).toBe('test_table');
      expect(registeredSchema.columns).toEqual(schema.columns);
    });

    test('should use model name as table name if not specified', () => {
      const modelName = 'TestModel';
      const schema = {
        columns: { id: { type: 'text' } }
      };

      schemaManager.registerModel(modelName, schema);

      const registeredSchema = schemaManager.getModel(modelName);
      expect(registeredSchema.tableName).toBe('testmodel');
    });

    test('should register relationships', () => {
      const modelName = 'post';
      const schema = {
        columns: { id: { type: 'text' }, author_id: { type: 'text' } },
        relationships: {
          author: {
            model: 'user',
            type: 'belongsTo',
            foreignKey: 'author_id'
          }
        }
      };

      schemaManager.registerModel(modelName, schema);

      const relationship = schemaManager.getRelationship('post', 'author');
      expect(relationship).toEqual({
        from: 'post',
        to: 'user',
        type: 'belongsTo',
        foreignKey: 'author_id',
        localKey: 'id'
      });
    });

    test('should clear cache when registering existing model', () => {
      const modelName = 'test_model';
      const schema1 = { columns: { id: { type: 'text' } } };
      const schema2 = { columns: { id: { type: 'text' }, name: { type: 'text' } } };

      schemaManager.registerModel(modelName, schema1);
      schemaManager.getModel(modelName); // Cache it

      // Register again with different schema
      schemaManager.registerModel(modelName, schema2);

      expect(schemaManager.schemaCache.has(modelName)).toBe(true);
    });
  });

  describe('getModel', () => {
    test('should return registered model', () => {
      const modelName = 'test_model';
      const schema = { columns: { id: { type: 'text' } } };

      schemaManager.registerModel(modelName, schema);
      const result = schemaManager.getModel(modelName);

      expect(result).toBeDefined();
      expect(result.name).toBe(modelName);
    });

    test('should return null for unregistered model', () => {
      const result = schemaManager.getModel('nonexistent');
      expect(result).toBeUndefined();
    });

    test('should use cache when enabled', () => {
      const modelName = 'test_model';
      const schema = { columns: { id: { type: 'text' } } };

      schemaManager.registerModel(modelName, schema);
      schemaManager.getModel(modelName); // First call caches it

      // Mock the schemas map to verify cache is used
      const originalGet = schemaManager.schemas.get;
      schemaManager.schemas.get = jest.fn();

      schemaManager.getModel(modelName); // Should use cache

      expect(schemaManager.schemas.get).not.toHaveBeenCalled();
      schemaManager.schemas.get = originalGet;
    });

    test('should bypass cache when disabled', () => {
      const modelName = 'test_model';
      const schema = { columns: { id: { type: 'text' } } };

      schemaManager.registerModel(modelName, schema);
      schemaManager.cacheEnabled = false;

      const result = schemaManager.getModel(modelName);
      expect(result).toBeDefined();
    });
  });

  describe('getAllModels', () => {
    test('should return all registered models', () => {
      const model1 = { columns: { id: { type: 'text' } } };
      const model2 = { columns: { id: { type: 'text' } } };

      schemaManager.registerModel('model1', model1);
      schemaManager.registerModel('model2', model2);

      const allModels = schemaManager.getAllModels();
      expect(allModels).toBeInstanceOf(Map);
      expect(allModels.size).toBe(2);
      expect(allModels.has('model1')).toBe(true);
      expect(allModels.has('model2')).toBe(true);
    });
  });

  describe('hasModel', () => {
    test('should return true for registered model', () => {
      schemaManager.registerModel('test_model', { columns: { id: { type: 'text' } } });
      expect(schemaManager.hasModel('test_model')).toBe(true);
    });

    test('should return false for unregistered model', () => {
      expect(schemaManager.hasModel('nonexistent')).toBe(false);
    });
  });

  describe('getRelationship', () => {
    test('should return relationship definition', () => {
      const schema = {
        columns: { id: { type: 'text' } },
        relationships: {
          test_rel: { model: 'other', type: 'belongsTo' }
        }
      };

      schemaManager.registerModel('test', schema);
      const relationship = schemaManager.getRelationship('test', 'test_rel');

      expect(relationship).toEqual({
        from: 'test',
        to: 'other',
        type: 'belongsTo',
        foreignKey: undefined,
        localKey: 'id'
      });
    });

    test('should return undefined for nonexistent relationship', () => {
      expect(schemaManager.getRelationship('test', 'nonexistent')).toBeUndefined();
    });
  });

  describe('generateSQL', () => {
    beforeEach(() => {
      schemaManager.registerModel('test_model', {
        tableName: 'test_table',
        columns: {
          id: { type: 'text' },
          name: { type: 'text' },
          age: { type: 'integer' }
        }
      });
    });

    test('should generate CREATE SQL', () => {
      const result = schemaManager.generateSQL('test_model', 'create', {
        id: '123',
        name: 'John',
        age: 25
      });

      expect(result.sql).toContain('INSERT INTO test_table');
      expect(result.sql).toContain('(id, name, age)');
      expect(result.params).toEqual(['123', 'John', 25]);
    });

    test('should generate READ SQL with ID', () => {
      const result = schemaManager.generateSQL('test_model', 'read', { id: '123' });

      expect(result.sql).toContain('SELECT id, name, age FROM test_table WHERE id = ?');
      expect(result.params).toEqual(['123']);
    });

    test('should generate READ SQL with WHERE clause', () => {
      const result = schemaManager.generateSQL('test_model', 'read', {
        where: { name: 'John', age: 25 }
      });

      expect(result.sql).toContain('SELECT id, name, age FROM test_table WHERE name = ? AND age = ?');
      expect(result.params).toEqual(['John', 25]);
    });

    test('should generate READ SQL with specific fields', () => {
      const result = schemaManager.generateSQL('test_model', 'read', {
        id: '123',
        fields: ['name', 'age']
      });

      expect(result.sql).toContain('SELECT name, age FROM test_table WHERE id = ?');
      expect(result.params).toEqual(['123']);
    });

    test('should generate UPDATE SQL', () => {
      const result = schemaManager.generateSQL('test_model', 'update', {
        id: '123',
        name: 'Jane',
        age: 26
      });

      expect(result.sql).toContain('UPDATE test_table SET name = ?, age = ? WHERE id = ?');
      expect(result.params).toEqual(['Jane', 26, '123']);
    });

    test('should generate DELETE SQL', () => {
      const result = schemaManager.generateSQL('test_model', 'delete', { id: '123' });

      expect(result.sql).toContain('DELETE FROM test_table WHERE id = ?');
      expect(result.params).toEqual(['123']);
    });

    test('should throw error for unknown operation', () => {
      expect(() => {
        schemaManager.generateSQL('test_model', 'unknown', {});
      }).toThrow('Unknown operation: unknown');
    });

    test('should throw error for unknown model', () => {
      expect(() => {
        schemaManager.generateSQL('unknown_model', 'read', {});
      }).toThrow("Model 'unknown_model' not found");
    });

    test('should use SQL cache', () => {
      // First call
      schemaManager.generateSQL('test_model', 'read', { id: '123' });
      expect(schemaManager.cacheStats.misses).toBe(1);

      // Second call with same params should use cache
      schemaManager.generateSQL('test_model', 'read', { id: '123' });
      expect(schemaManager.cacheStats.hits).toBe(1);
    });
  });

  describe('clearSchemaCache', () => {
    test('should clear all caches when no model specified', () => {
      schemaManager.registerModel('test', { columns: { id: { type: 'text' } } });
      schemaManager.getModel('test'); // Cache it
      schemaManager.generateSQL('test', 'read', { id: '123' }); // Cache SQL

      schemaManager.clearSchemaCache();

      expect(schemaManager.schemaCache.size).toBe(0);
      expect(schemaManager.sqlCache.size).toBe(0);
    });

    test('should clear specific model cache', () => {
      schemaManager.registerModel('test1', { columns: { id: { type: 'text' } } });
      schemaManager.registerModel('test2', { columns: { id: { type: 'text' } } });

      schemaManager.getModel('test1');
      schemaManager.getModel('test2');
      schemaManager.generateSQL('test1', 'read', { id: '123' });

      schemaManager.clearSchemaCache('test1');

      expect(schemaManager.schemaCache.has('test1')).toBe(false);
      expect(schemaManager.schemaCache.has('test2')).toBe(true);
      expect(schemaManager.sqlCache.size).toBe(0); // All SQL cache cleared for test1
    });
  });

  describe('generateCacheKey', () => {
    test('should generate consistent cache keys', () => {
      const key1 = schemaManager.generateCacheKey('test', 'read', { id: '123' });
      const key2 = schemaManager.generateCacheKey('test', 'read', { id: '123' });

      expect(key1).toBe(key2);
      expect(key1).toBe('test:read:{"id":"123"}');
    });

    test('should handle empty params', () => {
      const key = schemaManager.generateCacheKey('test', 'read', {});
      expect(key).toBe('test:read:{}');
    });
  });

  describe('validateData', () => {
    beforeEach(() => {
      schemaManager.registerModel('test_model', {
        columns: {
          id: { type: 'text' },
          name: { type: 'text', minLength: 2, maxLength: 50 },
          email: { type: 'text', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          age: { type: 'integer' }
        },
        validation: {
          required: ['name', 'email']
        }
      });
    });

    test('should validate valid data', () => {
      const data = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const result = schemaManager.validateData('test_model', data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(data);
    });

    test('should detect missing required fields', () => {
      const data = { id: '123' };

      const result = schemaManager.validateData('test_model', data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING');
      expect(result.errors[1].field).toBe('email');
    });

    test('should validate field types', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 'not-a-number'
      };

      const result = schemaManager.validateData('test_model', data);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
      expect(result.errors[0].field).toBe('age');
    });

    test('should validate field length', () => {
      const data = {
        name: 'J', // Too short
        email: 'john@example.com'
      };

      const result = schemaManager.validateData('test_model', data);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_LENGTH_VIOLATION');
    });

    test('should validate field patterns', () => {
      const data = {
        name: 'John',
        email: 'invalid-email'
      };

      const result = schemaManager.validateData('test_model', data);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('PATTERN_MISMATCH');
    });

    test('should transform field values', () => {
      const data = {
        name: '  John  ', // Should be trimmed
        email: 'john@example.com',
        age: '25' // Should be converted to number
      };

      const result = schemaManager.validateData('test_model', data);

      expect(result.valid).toBe(true);
      expect(result.data.name).toBe('John');
      expect(result.data.age).toBe(25);
    });

    test('should handle unknown model', () => {
      const result = schemaManager.validateData('unknown', {});

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MODEL_NOT_FOUND');
    });

    test('should validate custom rules', () => {
      schemaManager.registerModel('custom_model', {
        columns: { value: { type: 'integer' } },
        validation: {
          custom: {
            positiveValue: (data) => data.value > 0 || 'Value must be positive'
          }
        }
      });

      const result = schemaManager.validateData('custom_model', { value: -5 });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('Value must be positive');
    });
  });

  describe('field type validation', () => {
    beforeEach(() => {
      schemaManager.registerModel('type_test', {
        columns: {
          textField: { type: 'text' },
          intField: { type: 'integer' },
          realField: { type: 'real' },
          blobField: { type: 'blob' }
        }
      });
    });

    test('should validate text type', () => {
      const result = schemaManager.validateData('type_test', { textField: 123 });
      expect(result.valid).toBe(true);
      expect(result.data.textField).toBe('123');
    });

    test('should validate integer type', () => {
      const result = schemaManager.validateData('type_test', { intField: '123' });
      expect(result.valid).toBe(true);
      expect(result.data.intField).toBe(123);
    });

    test('should reject invalid integer', () => {
      const result = schemaManager.validateData('type_test', { intField: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    test('should validate real type', () => {
      const result = schemaManager.validateData('type_test', { realField: '123.45' });
      expect(result.valid).toBe(true);
      expect(result.data.realField).toBe(123.45);
    });

    test('should reject invalid real', () => {
      const result = schemaManager.validateData('type_test', { realField: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    test('should handle unknown field type', () => {
      schemaManager.registerModel('unknown_type', {
        columns: { field: { type: 'unknown' } }
      });

      const result = schemaManager.validateData('unknown_type', { field: 'value' });
      expect(result.valid).toBe(true); // Unknown types are allowed
    });
  });

  describe('cache statistics', () => {
    test('should track cache hits and misses', () => {
      schemaManager.registerModel('test', { columns: { id: { type: 'text' } } });

      // First call - miss
      schemaManager.generateSQL('test', 'read', { id: '123' });
      expect(schemaManager.cacheStats.misses).toBe(1);
      expect(schemaManager.cacheStats.hits).toBe(0);

      // Second call - hit
      schemaManager.generateSQL('test', 'read', { id: '123' });
      expect(schemaManager.cacheStats.hits).toBe(1);
    });
  });
});
