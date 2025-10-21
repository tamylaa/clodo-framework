import { jest } from '@jest/globals';

// Mock dependencies before importing the module under test
const mockSchemaManager = {
  getAllModels: jest.fn(() => new Map([
    ['users', { fields: { id: 'integer', name: 'text' } }],
    ['posts', { fields: { id: 'integer', title: 'text', content: 'text' } }]
  ]))
};

jest.mock('../../src/schema/SchemaManager.js', () => ({
  schemaManager: mockSchemaManager
}));

// Mock the data service creation
const mockDataService = {
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  paginate: jest.fn()
};

jest.mock('../../src/services/GenericDataService.js', () => ({
  createDataService: jest.fn(() => mockDataService)
}));

import { GenericRouteHandler, createRouteHandlers } from '../../src/handlers/GenericRouteHandler.js';
import { moduleManager } from '../../src/modules/ModuleManager.js';

describe('GenericRouteHandler', () => {
  let mockD1Client;
  let handler;
  let mockRequest;
  let mockExecuteHooks;
  let mockGetAllModels;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Spy on the moduleManager.executeHooks method
    mockExecuteHooks = jest.spyOn(moduleManager, 'executeHooks').mockResolvedValue();
    
    // Set up mock behaviors
    
    // Register test models
    const { schemaManager } = await import('../../src/schema/SchemaManager.js');
    schemaManager.registerModel('users', {
      tableName: 'users',
      columns: {
        id: { type: 'text', primaryKey: true },
        name: { type: 'text' },
        email: { type: 'text', required: true, unique: true },
        created_at: { type: 'text', required: true },
        updated_at: { type: 'text', required: true }
      },
      validation: { required: ['email'] }
    });
    schemaManager.registerModel('posts', {
      tableName: 'posts',
      columns: {
        id: { type: 'text', primaryKey: true },
        title: { type: 'text' },
        content: { type: 'text' },
        created_at: { type: 'text', required: true },
        updated_at: { type: 'text', required: true }
      },
      validation: {}
    });
    
    mockD1Client = {};
    handler = new GenericRouteHandler(mockD1Client, 'users', {
      requireAuth: true,
      allowPublicRead: false,
      customValidators: {},
      hooks: {}
    });

    // Override the dataService with our mock
    handler.dataService = mockDataService;
    
    mockRequest = {
      url: 'http://example.com/api/users',
      headers: new Map([['authorization', 'Bearer token123']]),
      json: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct properties', async () => {
      expect(handler.d1Client).toBe(mockD1Client);
      expect(handler.modelName).toBe('users');
      expect(handler.dataService).toBeDefined();
      expect(handler.options.requireAuth).toBe(true);
      expect(handler.options.allowPublicRead).toBe(false);
    });

    test('should set default options', () => {
      const defaultHandler = new GenericRouteHandler(mockD1Client, 'posts');
      expect(defaultHandler.options.requireAuth).toBe(true);
      expect(defaultHandler.options.allowPublicRead).toBe(false);
      expect(defaultHandler.options.customValidators).toEqual({});
      expect(defaultHandler.options.hooks).toEqual({});
    });

    test('should merge provided options with defaults', () => {
      const customHandler = new GenericRouteHandler(mockD1Client, 'posts', {
        requireAuth: false,
        allowPublicRead: true,
        customValidators: { create: jest.fn() }
      });
      expect(customHandler.options.requireAuth).toBe(false);
      expect(customHandler.options.allowPublicRead).toBe(true);
      expect(customHandler.options.customValidators.create).toBeDefined();
    });
  });

  describe('handleList', () => {
    test('should return records successfully', async () => {
      const mockData = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
      mockDataService.find.mockResolvedValue(mockData);

      const response = await handler.handleList(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.pagination).toBeNull();
      expect(mockDataService.find).toHaveBeenCalledWith({});
    });

    test('should handle pagination', async () => {
      const mockRequestWithPagination = {
        ...mockRequest,
        url: 'http://example.com/api/users?page=2&limit=10'
      };
      const mockPaginatedResult = {
        data: [{ id: 11, name: 'User11' }],
        pagination: { page: 2, limit: 10, total: 25 }
      };
      mockDataService.paginate.mockResolvedValue(mockPaginatedResult);

      const response = await handler.handleList(mockRequestWithPagination);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPaginatedResult.data);
      expect(result.pagination).toEqual(mockPaginatedResult.pagination);
      expect(mockDataService.paginate).toHaveBeenCalledWith({}, { page: 2, limit: 10, offset: null });
    });

    test('should parse query criteria', async () => {
      const mockRequestWithQuery = {
        ...mockRequest,
        url: 'http://example.com/api/users?name=John&age_gt=18'
      };
      const mockData = [{ id: 1, name: 'John', age: 25 }];
      mockDataService.find.mockResolvedValue(mockData);

      const response = await handler.handleList(mockRequestWithQuery);
      const result = await response.json();

      expect(mockDataService.find).toHaveBeenCalledWith({
        name: 'John',
        age: { $gt: '18' }
      });
    });

    test('should require authentication when configured', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map()
      };

      const response = await handler.handleList(requestWithoutAuth);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should allow public read when configured', async () => {
      const publicHandler = new GenericRouteHandler(mockD1Client, 'posts', {
        requireAuth: true,
        allowPublicRead: true
      });
      publicHandler.dataService = handler.dataService; // Use the same mock
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map()
      };
      mockDataService.find.mockResolvedValue([]);

      const response = await publicHandler.handleList(requestWithoutAuth);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    test('should execute hooks', async () => {
      mockDataService.find.mockResolvedValue([]);

      await handler.handleList(mockRequest);

      expect(mockExecuteHooks).toHaveBeenCalledWith('before.list', {
        model: 'users',
        request: mockRequest,
        criteria: {},
        pagination: { page: 1, limit: null, offset: null }
      });
      expect(mockExecuteHooks).toHaveBeenCalledWith('after.list', {
        model: 'users',
        request: mockRequest,
        result: { data: [], pagination: null }
      });
    });

    test('should handle errors', async () => {
      mockDataService.find.mockRejectedValue(new Error('Database error'));

      const response = await handler.handleList(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve records');
      expect(result.message).toBe('Database error');
    });
  });

  describe('handleGet', () => {
    test('should return record successfully', async () => {
      const mockRecord = { id: '123', name: 'John' };
      mockDataService.findById.mockResolvedValue(mockRecord);

      const response = await handler.handleGet(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
      expect(mockDataService.findById).toHaveBeenCalledWith('123');
    });

    test('should return 404 for non-existent record', async () => {
      mockDataService.findById.mockResolvedValue(null);

      const response = await handler.handleGet(mockRequest, '999');
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });

    test('should require authentication when configured', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map()
      };

      const response = await handler.handleGet(requestWithoutAuth, '123');
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should allow public read when configured', async () => {
      const publicHandler = new GenericRouteHandler(mockD1Client, 'posts', {
        requireAuth: true,
        allowPublicRead: true
      });
      publicHandler.dataService = handler.dataService; // Use the same mock
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map()
      };
      mockDataService.findById.mockResolvedValue({ id: '123', title: 'Post' });

      const response = await publicHandler.handleGet(requestWithoutAuth, '123');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    test('should execute hooks', async () => {
      const mockRecord = { id: '123', name: 'John' };
      mockDataService.findById.mockResolvedValue(mockRecord);

      await handler.handleGet(mockRequest, '123');

      expect(mockExecuteHooks).toHaveBeenCalledWith('before.get', {
        model: 'users',
        request: mockRequest,
        id: '123'
      });
      expect(mockExecuteHooks).toHaveBeenCalledWith('after.get', {
        model: 'users',
        request: mockRequest,
        record: mockRecord
      });
    });

    test('should handle errors', async () => {
      mockDataService.findById.mockRejectedValue(new Error('Database error'));

      const response = await handler.handleGet(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve record');
      expect(result.message).toBe('Database error');
    });
  });

  describe('handleCreate', () => {
    test('should create record successfully', async () => {
      const inputData = { name: 'John', email: 'john@example.com' };
      const createdRecord = { id: '123', ...inputData };
      mockRequest.json.mockResolvedValue(inputData);
      mockDataService.create.mockResolvedValue(createdRecord);

      const response = await handler.handleCreate(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdRecord);
      expect(mockDataService.create).toHaveBeenCalledWith(inputData);
    });

    test('should require authentication', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map(),
        json: jest.fn()
      };

      const response = await handler.handleCreate(requestWithoutAuth);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should validate with custom validator', async () => {
      const customHandler = new GenericRouteHandler(mockD1Client, 'users', {
        customValidators: {
          create: jest.fn().mockResolvedValue({ valid: false, errors: ['Invalid data'] })
        }
      });
      const inputData = { name: 'John' };
      customHandler.dataService = handler.dataService;
      mockRequest.json.mockResolvedValue(inputData);

      const response = await customHandler.handleCreate(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual(['Invalid data']);
    });

    test('should execute hooks', async () => {
      const inputData = { name: 'John' };
      const createdRecord = { id: '123', ...inputData };
      mockRequest.json.mockResolvedValue(inputData);
      handler.dataService.create.mockResolvedValue(createdRecord);

      await handler.handleCreate(mockRequest);

      expect(mockExecuteHooks).toHaveBeenCalledWith('before.create', {
        model: 'users',
        request: mockRequest,
        data: inputData
      });
      expect(mockExecuteHooks).toHaveBeenCalledWith('after.create', {
        model: 'users',
        request: mockRequest,
        record: createdRecord
      });
    });

    test('should handle errors', async () => {
      mockRequest.json.mockResolvedValue({ name: 'John' });
      handler.dataService.create.mockRejectedValue(new Error('Database error'));

      const response = await handler.handleCreate(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create record');
      expect(result.message).toBe('Database error');
    });
  });

  describe('handleUpdate', () => {
    test('should update record successfully', async () => {
      const updateData = { name: 'John Updated' };
      const existingRecord = { id: '123', name: 'John' };
      const updatedRecord = { id: '123', ...updateData };
      mockRequest.json.mockResolvedValue(updateData);
      handler.dataService.findById.mockResolvedValue(existingRecord);
      handler.dataService.update.mockResolvedValue(updatedRecord);

      const response = await handler.handleUpdate(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedRecord);
      expect(handler.dataService.update).toHaveBeenCalledWith('123', updateData);
    });

    test('should return 404 for non-existent record', async () => {
      mockRequest.json.mockResolvedValue({ name: 'John' });
      handler.dataService.findById.mockResolvedValue(null);

      const response = await handler.handleUpdate(mockRequest, '999');
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });

    test('should require authentication', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map(),
        json: jest.fn()
      };

      const response = await handler.handleUpdate(requestWithoutAuth, '123');
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should validate with custom validator', async () => {
      const customHandler = new GenericRouteHandler(mockD1Client, 'users', {
        customValidators: {
          update: jest.fn().mockResolvedValue({ valid: false, errors: ['Invalid update'] })
        }
      });
      const updateData = { name: 'John' };
      const existingRecord = { id: '123', name: 'Jane' };
      customHandler.dataService = handler.dataService;
      mockRequest.json.mockResolvedValue(updateData);
      handler.dataService.findById.mockResolvedValue(existingRecord);

      const response = await customHandler.handleUpdate(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual(['Invalid update']);
    });

    test('should execute hooks', async () => {
      const updateData = { name: 'John Updated' };
      const existingRecord = { id: '123', name: 'John' };
      const updatedRecord = { id: '123', name: 'John Updated' };
      mockRequest.json.mockResolvedValue(updateData);
      handler.dataService.findById.mockResolvedValue(existingRecord);
      handler.dataService.update.mockResolvedValue(updatedRecord);

      await handler.handleUpdate(mockRequest, '123');

      expect(mockExecuteHooks).toHaveBeenCalledWith('before.update', {
        model: 'users',
        request: mockRequest,
        id: '123',
        updates: updateData,
        existing: existingRecord
      });
      expect(mockExecuteHooks).toHaveBeenCalledWith('after.update', {
        model: 'users',
        request: mockRequest,
        record: updatedRecord
      });
    });

    test('should handle errors', async () => {
      mockRequest.json.mockResolvedValue({ name: 'John' });
      handler.dataService.findById.mockResolvedValue({ id: '123', name: 'Jane' });
      handler.dataService.update.mockRejectedValue(new Error('Database error'));

      const response = await handler.handleUpdate(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update record');
      expect(result.message).toBe('Database error');
    });
  });

  describe('handleDelete', () => {
    test('should delete record successfully', async () => {
      const existingRecord = { id: '123', name: 'John' };
      handler.dataService.findById.mockResolvedValue(existingRecord);
      handler.dataService.delete.mockResolvedValue(true);

      const response = await handler.handleDelete(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
      expect(handler.dataService.delete).toHaveBeenCalledWith('123');
    });

    test('should return 404 for non-existent record', async () => {
      handler.dataService.findById.mockResolvedValue(null);

      const response = await handler.handleDelete(mockRequest, '999');
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });

    test('should require authentication', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map()
      };

      const response = await handler.handleDelete(requestWithoutAuth, '123');
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    test('should execute hooks', async () => {
      const existingRecord = { id: '123', name: 'John' };
      handler.dataService.findById.mockResolvedValue(existingRecord);
      handler.dataService.delete.mockResolvedValue(true);

      await handler.handleDelete(mockRequest, '123');

      expect(mockExecuteHooks).toHaveBeenCalledWith('before.delete', {
        model: 'users',
        request: mockRequest,
        id: '123',
        existing: existingRecord
      });
      expect(mockExecuteHooks).toHaveBeenCalledWith('after.delete', {
        model: 'users',
        request: mockRequest,
        id: '123'
      });
    });

    test('should handle delete failure', async () => {
      const existingRecord = { id: '123', name: 'John' };
      handler.dataService.findById.mockResolvedValue(existingRecord);
      handler.dataService.delete.mockResolvedValue(false);

      const response = await handler.handleDelete(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete record');
      expect(result.message).toBe('Delete operation failed');
    });

    test('should handle errors', async () => {
      const existingRecord = { id: '123', name: 'John' };
      handler.dataService.findById.mockResolvedValue(existingRecord);
      handler.dataService.delete.mockRejectedValue(new Error('Database error'));

      const response = await handler.handleDelete(mockRequest, '123');
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete record');
      expect(result.message).toBe('Database error');
    });
  });

  describe('_checkAuth', () => {
    test('should return authenticated when authorization header exists', async () => {
      const result = await handler._checkAuth(mockRequest);
      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual({ id: 'user-from-token' });
    });

    test('should return not authenticated when no authorization header', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map()
      };

      const result = await handler._checkAuth(requestWithoutAuth);
      expect(result.authenticated).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe('_parseQueryCriteria', () => {
    test('should parse simple criteria', () => {
      const params = new URLSearchParams('name=John&email=john@example.com');
      const criteria = handler._parseQueryCriteria(params);

      expect(criteria).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
    });

    test('should parse comparison operators', () => {
      const params = new URLSearchParams('age_gt=18&score_lt=100&name_like=John');
      const criteria = handler._parseQueryCriteria(params);

      expect(criteria).toEqual({
        age: { $gt: '18' },
        score: { $lt: '100' },
        name: { $like: 'John' }
      });
    });

    test('should skip pagination parameters', () => {
      const params = new URLSearchParams('name=John&page=2&limit=10&offset=20');
      const criteria = handler._parseQueryCriteria(params);

      expect(criteria).toEqual({
        name: 'John'
      });
    });
  });

  describe('_parsePagination', () => {
    test('should parse pagination parameters', () => {
      const params = new URLSearchParams('page=2&limit=20&offset=40');
      const pagination = handler._parsePagination(params);

      expect(pagination).toEqual({
        page: 2,
        limit: 20,
        offset: 40
      });
    });

    test('should provide defaults', () => {
      const params = new URLSearchParams();
      const pagination = handler._parsePagination(params);

      expect(pagination).toEqual({
        page: 1,
        limit: null,
        offset: null
      });
    });
  });
});

describe('createRouteHandlers', () => {
  test('should create handlers for all models', async () => {
    mockSchemaManager.getAllModels.mockReturnValue(new Map([
      ['users', { fields: { id: 'integer', name: 'text' } }],
      ['posts', { fields: { id: 'integer', title: 'text', content: 'text' } }]
    ]));

    const mockD1Client = {};
    const handlers = createRouteHandlers(mockD1Client, { requireAuth: false });

    expect(handlers.users).toBeInstanceOf(GenericRouteHandler);
    expect(handlers.posts).toBeInstanceOf(GenericRouteHandler);
    expect(handlers.users.modelName).toBe('users');
    expect(handlers.posts.modelName).toBe('posts');
    expect(handlers.users.options.requireAuth).toBe(false);
  });
});
