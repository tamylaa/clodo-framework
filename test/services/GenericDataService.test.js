import { jest } from '@jest/globals';
import { GenericDataService, createDataService } from '../../src/services/GenericDataService.js';
import { schemaManager } from '../../src/schema/SchemaManager.js';

// Mock D1 client
const mockD1Client = {
  generateId: jest.fn(() => 'test-id-123'),
  getCurrentTimestamp: jest.fn(() => '2024-01-01T00:00:00Z'),
  run: jest.fn(),
  all: jest.fn(),
  first: jest.fn()
};

// Test schema definition
const testSchema = {
  tableName: 'test_users',
  columns: {
    id: { type: 'string', primaryKey: true },
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    email: { type: 'string', required: true, format: 'email' },
    age: { type: 'number', minimum: 0, maximum: 150 },
    created_at: { type: 'datetime' },
    updated_at: { type: 'datetime' }
  },
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['created_at'] }
  ],
  validation: {
    customValidators: {}
  }
};

describe('GenericDataService', () => {
  let service;

  beforeAll(() => {
    // Register test schema
    schemaManager.registerModel('User', testSchema);
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new GenericDataService(mockD1Client, 'User', {
      cacheEnabled: true,
      defaultCacheTTL: 300,
      maxQueryLimit: 1000,
      defaultQueryLimit: 100
    });
  });

  afterAll(() => {
    // Clean up schema
    schemaManager.clearSchemaCache();
  });

  describe('constructor', () => {
    test('should initialize with valid parameters', () => {
      expect(service.d1Client).toBe(mockD1Client);
      expect(service.modelName).toBe('User');
      expect(service.schema).toBeDefined();
      expect(service.cacheEnabled).toBe(true);
      expect(service.defaultCacheTTL).toBe(300);
    });

    test('should throw error for unregistered model', () => {
      expect(() => {
        new GenericDataService(mockD1Client, 'NonExistentModel');
      }).toThrow("Model 'NonExistentModel' not registered");
    });

    test('should apply security configuration defaults', () => {
      const customService = new GenericDataService(mockD1Client, 'User', {
        maxQueryLimit: 500,
        defaultQueryLimit: 50
      });

      expect(customService.securityConfig.maxQueryLimit).toBe(500);
      expect(customService.securityConfig.defaultQueryLimit).toBe(50);
    });
  });

  describe('caching methods', () => {
    test('generateCacheKey should create consistent keys', () => {
      const key1 = service.generateCacheKey('find', { id: 1 });
      const key2 = service.generateCacheKey('find', { id: 1 });
      const key3 = service.generateCacheKey('find', { id: 2 });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toBe('User:find:{"id":1}');
    });

    test('setCachedResult and getCachedResult should work correctly', () => {
      const cacheKey = 'test:key';
      const testData = { id: 1, name: 'Test' };

      service.setCachedResult(cacheKey, testData, 60);

      const cached = service.getCachedResult(cacheKey);
      expect(cached).toEqual(testData);
    });

    test('getCachedResult should return null for expired cache', () => {
      const cacheKey = 'test:key';
      const testData = { id: 1, name: 'Test' };

      // Set cache with very short TTL (1ms)
      service.setCachedResult(cacheKey, testData, 0.001);

      // Wait for expiration
      setTimeout(() => {
        const cached = service.getCachedResult(cacheKey);
        expect(cached).toBeNull();
      }, 10);
    });

    test('clearCache should clear specific entries', () => {
      service.setCachedResult('User:find:{"id":1}', { id: 1 }, 60);
      service.setCachedResult('User:find:{"id":2}', { id: 2 }, 60);

      service.clearCache('find', { id: 1 });

      expect(service.getCachedResult('User:find:{"id":1}')).toBeNull();
      expect(service.getCachedResult('User:find:{"id":2}')).toEqual({ id: 2 });
    });

    test('clearCache should clear all entries for operation', () => {
      service.setCachedResult('User:find:{"id":1}', { id: 1 }, 60);
      service.setCachedResult('User:create:{}', { id: 3 }, 60);

      service.clearCache('find');

      expect(service.getCachedResult('User:find:{"id":1}')).toBeNull();
      expect(service.getCachedResult('User:create:{}')).toEqual({ id: 3 });
    });

    test('clearCache should clear all cache when no parameters', () => {
      service.setCachedResult('User:find:{"id":1}', { id: 1 }, 60);
      service.setCachedResult('User:create:{}', { id: 3 }, 60);

      service.clearCache();

      expect(service.queryCache.size).toBe(0);
    });
  });

  describe('formatValidationErrors', () => {
    test('should format string errors', () => {
      const errors = ['Name is required'];
      const result = service.formatValidationErrors(errors);
      expect(result).toBe('Name is required');
    });

    test('should format object errors', () => {
      const errors = [{ field: 'name', message: 'Name is required' }];
      const result = service.formatValidationErrors(errors);
      expect(result).toBe('name: Name is required');
    });

    test('should format multiple errors', () => {
      const errors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email format' }
      ];
      const result = service.formatValidationErrors(errors);
      expect(result).toBe('name: Name is required; email: Invalid email format');
    });

    test('should handle empty errors array', () => {
      const result = service.formatValidationErrors([]);
      expect(result).toBe('Unknown validation error');
    });
  });

  describe('create', () => {
    test('should create record successfully', async () => {
      const testData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      mockD1Client.run.mockResolvedValue({ success: true });

      const result = await service.create(testData);

      expect(mockD1Client.run).toHaveBeenCalled();
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.id).toBe('test-id-123');
      expect(result.created_at).toBe('2024-01-01T00:00:00Z');
      expect(result.updated_at).toBe('2024-01-01T00:00:00Z');
    });

    test('should generate ID if not provided', async () => {
      const testData = { name: 'Jane Doe', email: 'jane@example.com' };

      mockD1Client.run.mockResolvedValue({ success: true });

      await service.create(testData);

      expect(mockD1Client.generateId).toHaveBeenCalled();
    });

    test('should throw error on validation failure', async () => {
      const invalidData = { name: '', email: 'invalid-email' };

      await expect(service.create(invalidData)).rejects.toThrow('Validation failed');
    });

    test('should throw error on database failure', async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };

      mockD1Client.run.mockResolvedValue({ success: false });

      await expect(service.create(testData)).rejects.toThrow('Failed to create record');
    });

    test('should clear relevant caches after creation', async () => {
      const testData = { name: 'John Doe', email: 'john@example.com' };

      // Set some cache entries
      service.setCachedResult('User:findAll:{}', [], 60);
      service.setCachedResult('User:find:{"id":1}', {}, 60);

      mockD1Client.run.mockResolvedValue({ success: true });

      await service.create(testData);

      // findAll cache should be cleared
      expect(service.getCachedResult('User:findAll:{}')).toBeNull();
      // find cache should still exist
      expect(service.getCachedResult('User:find:{"id":1}')).toEqual({});
    });
  });

  describe('find', () => {
    test('should return cached result if available', async () => {
      const criteria = { id: 'test-id' };
      const cachedData = [{ id: 'test-id', name: 'Cached User' }];

      service.setCachedResult('User:find:{"criteria":{"id":"test-id"},"include":[],"fields":null}', cachedData, 60);

      const result = await service.find(criteria);

      expect(result).toEqual(cachedData);
      expect(mockD1Client.all).not.toHaveBeenCalled();
    });

    test('should execute query when not cached', async () => {
      const criteria = { id: 'test-id' };
      const queryResult = [{ id: 'test-id', name: 'John Doe' }];

      mockD1Client.all.mockResolvedValue(queryResult);

      const result = await service.find(criteria);

      expect(mockD1Client.all).toHaveBeenCalled();
      expect(result).toEqual(queryResult);
    });

    test('should cache query results', async () => {
      const criteria = { id: 'test-id' };
      const queryResult = [{ id: 'test-id', name: 'John Doe' }];

      mockD1Client.all.mockResolvedValue(queryResult);

      await service.find(criteria);

      const cached = service.getCachedResult('User:find:{"criteria":{"id":"test-id"},"include":[],"fields":null}');
      expect(cached).toEqual(queryResult);
    });
  });

  describe('findAll', () => {
    test('should apply security limits', async () => {
      const options = { limit: 2000 }; // Exceeds max limit

      mockD1Client.all.mockResolvedValue([]);
      mockD1Client.first.mockResolvedValue({ total: 0 });

      await service.findAll(options);

      // Should use maxQueryLimit instead of requested limit
      expect(mockD1Client.all).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([1000, 0]) // maxQueryLimit applied
      );
    });

    test('should validate limit parameter', async () => {
      await expect(service.findAll({ limit: 0 })).rejects.toThrow('Invalid limit: 0');
      await expect(service.findAll({ limit: -1 })).rejects.toThrow('Invalid limit: -1');
    });

    test('should validate offset parameter', async () => {
      await expect(service.findAll({ offset: 2000000 })).rejects.toThrow('Offset too large');
    });

    test('should return paginated results', async () => {
      const mockData = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ];

      mockD1Client.all.mockResolvedValue(mockData);
      mockD1Client.first.mockResolvedValue({ total: 25 });

      const result = await service.findAll({ limit: 10, offset: 10 });

      expect(result.data).toEqual(mockData);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.currentPage).toBe(2);
    });

    test('should handle WHERE clauses', async () => {
      const options = {
        where: { status: 'active', age: 25 },
        limit: 10
      };

      mockD1Client.all.mockResolvedValue([]);
      mockD1Client.first.mockResolvedValue({ total: 0 });

      await service.findAll(options);

      expect(mockD1Client.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ? AND age = ?'),
        expect.arrayContaining(['active', 25, 10, 0])
      );
    });

    test('should handle ORDER BY clauses', async () => {
      const options = {
        orderBy: { created_at: 'desc', name: 'asc' },
        limit: 10
      };

      mockD1Client.all.mockResolvedValue([]);
      mockD1Client.first.mockResolvedValue({ total: 0 });

      await service.findAll(options);

      expect(mockD1Client.all).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC, name ASC'),
        expect.any(Array)
      );
    });
  });

  describe('update', () => {
    test('should update record successfully', async () => {
      const updates = { name: 'Updated Name', age: 31 };
      const updatedRecord = { id: 'test-id', name: 'Updated Name', age: 31 };

      mockD1Client.run.mockResolvedValue({ success: true });
      mockD1Client.all.mockResolvedValue([updatedRecord]);

      const result = await service.update('test-id', updates);

      expect(mockD1Client.run).toHaveBeenCalled();
      expect(result).toEqual(updatedRecord);
    });

    test('should set updated_at timestamp', async () => {
      const updates = { name: 'Updated Name' };

      mockD1Client.run.mockResolvedValue({ success: true });
      mockD1Client.all.mockResolvedValue([{ id: 'test-id', name: 'Updated Name' }]);

      await service.update('test-id', updates);

      expect(mockD1Client.getCurrentTimestamp).toHaveBeenCalled();
    });

    test('should throw error on validation failure', async () => {
      const invalidUpdates = { name: '' };

      await expect(service.update('test-id', invalidUpdates)).rejects.toThrow('Validation failed');
    });

    test('should throw error on database failure', async () => {
      const updates = { name: 'Updated Name' };

      mockD1Client.run.mockResolvedValue({ success: false });

      await expect(service.update('test-id', updates)).rejects.toThrow('Failed to update record');
    });
  });

  describe('delete', () => {
    test('should delete record successfully', async () => {
      mockD1Client.run.mockResolvedValue({ success: true });

      const result = await service.delete('test-id');

      expect(result).toBe(true);
      expect(mockD1Client.run).toHaveBeenCalled();
    });

    test('should return false on delete failure', async () => {
      mockD1Client.run.mockResolvedValue({ success: false });

      const result = await service.delete('test-id');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    test('should count records without criteria', async () => {
      mockD1Client.first.mockResolvedValue({ count: 42 });

      const result = await service.count();

      expect(result).toBe(42);
      expect(mockD1Client.first).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_users',
        []
      );
    });

    test('should count records with criteria', async () => {
      const criteria = { status: 'active' };
      mockD1Client.first.mockResolvedValue({ count: 15 });

      const result = await service.count(criteria);

      expect(result).toBe(15);
      expect(mockD1Client.first).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_users WHERE status = ?',
        ['active']
      );
    });
  });

  describe('exists', () => {
    test('should return true for existing record', async () => {
      const mockRecord = { id: 'test-id', name: 'Test User' };
      mockD1Client.all.mockResolvedValue([mockRecord]);

      const result = await service.exists('test-id');

      expect(result).toBe(true);
    });

    test('should return false for non-existing record', async () => {
      mockD1Client.all.mockResolvedValue([]);

      const result = await service.exists('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('paginate', () => {
    test('should return paginated results', async () => {
      const criteria = { status: 'active' };
      const pagination = { page: 2, limit: 10 };

      const mockRecords = [
        { id: '11', name: 'User 11' },
        { id: '12', name: 'User 12' }
      ];

      mockD1Client.first.mockResolvedValue({ count: 25 });
      mockD1Client.all.mockResolvedValue(mockRecords);

      const result = await service.paginate(criteria, pagination);

      expect(result.data).toEqual(mockRecords);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  describe('createDataService factory', () => {
    test('should create data service instance', () => {
      const service = createDataService(mockD1Client, 'User');

      expect(service).toBeInstanceOf(GenericDataService);
      expect(service.modelName).toBe('User');
    });
  });
});
