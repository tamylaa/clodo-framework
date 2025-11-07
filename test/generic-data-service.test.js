import { schemaManager } from '../src/schema/SchemaManager.js';
import { GenericDataService } from '../src/services/GenericDataService.js';

describe('GenericDataService', () => {
  beforeEach(() => {
    // Register test model
    schemaManager.registerModel('test', {
      tableName: 'test',
      columns: {
        id: { type: 'integer', primaryKey: true },
        name: { type: 'text', required: true },
        email: { type: 'text', required: true }
      },
      validation: {
        required: ['name', 'email']
      }
    });
  });

  test('should validate required fields correctly', async () => {
    const mockD1Client = {
      generateId: () => 123,
      getCurrentTimestamp: () => '2025-01-01T00:00:00Z',
      run: async () => ({ success: true }),
      first: async () => null
    };

    const service = new GenericDataService(mockD1Client, 'test');
    
    // Test missing required field
    await expect(service.create({ email: 'test@example.com' })).rejects.toThrow('name');
  });

  test('should create service successfully with valid data', async () => {
    const mockD1Client = {
      generateId: () => 123,
      getCurrentTimestamp: () => '2025-01-01T00:00:00Z',
      run: async () => ({ success: true }),
      first: async () => null
    };

    const service = new GenericDataService(mockD1Client, 'test');
    expect(service).toBeDefined();
  });
});
