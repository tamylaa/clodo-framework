/**
 * Tests for Interactive Database Workflow
 */

import { jest } from '@jest/globals';

// Mock the dependencies
const mockAskUser = jest.fn();
const mockAskYesNo = jest.fn();
const mockAskChoice = jest.fn();
const mockDatabaseExists = jest.fn();
const mockCreateDatabase = jest.fn();
const mockDeleteDatabase = jest.fn();
const mockExec = jest.fn();

await jest.unstable_mockModule('../../../lib/shared/utils/interactive-prompts.js', () => ({
  askUser: mockAskUser,
  askYesNo: mockAskYesNo,
  askChoice: mockAskChoice
}));

await jest.unstable_mockModule('../../../lib/shared/cloudflare/ops.js', () => ({
  databaseExists: mockDatabaseExists,
  createDatabase: mockCreateDatabase,
  deleteDatabase: mockDeleteDatabase
}));

await jest.unstable_mockModule('child_process', () => ({
  exec: mockExec
}));

// Import after mocking
const { InteractiveDatabaseWorkflow } = await import('../../../lib/shared/deployment/workflows/interactive-database-workflow.js');

// Re-export the mocks for use in tests
export { mockAskUser, mockAskYesNo, mockAskChoice, mockDatabaseExists, mockCreateDatabase, mockDeleteDatabase, mockExec };

describe('InteractiveDatabaseWorkflow', () => {
  let workflow;
  let rollbackActions;

  beforeEach(() => {
    rollbackActions = [];
    workflow = new InteractiveDatabaseWorkflow({ rollbackActions });
    
    // Reset mock implementations and set defaults
    mockAskUser.mockReset();
    mockAskYesNo.mockReset();
    mockAskChoice.mockReset().mockResolvedValue(0);
    mockDatabaseExists.mockReset().mockResolvedValue(false);
    mockCreateDatabase.mockReset().mockResolvedValue('test-db-id');
    mockDeleteDatabase.mockReset();
    mockExec.mockReset().mockImplementation((command, callback) => {
      callback(null, 'test-db-id-123 | example.com-auth-db | 2024-01-01T00:00:00.000Z', '');
    });
  });

  describe('handleDatabaseSetup', () => {
    it('should create new database when none exists', async () => {
      mockAskYesNo.mockResolvedValueOnce(true); // Use suggested name
      mockAskYesNo.mockResolvedValueOnce(true); // Confirm creation
      mockDatabaseExists.mockResolvedValue(false);
      mockCreateDatabase.mockResolvedValue('test-db-id-123');

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: true
      });

      expect(result).toEqual({
        name: 'example.com-auth-db',
        id: 'test-db-id-123',
        created: true,
        reused: false
      });

      expect(mockCreateDatabase).toHaveBeenCalledWith('example.com-auth-db');
      expect(rollbackActions).toHaveLength(1);
      expect(rollbackActions[0].type).toBe('delete-database');
    }, 30000);

    it('should reuse existing database', async () => {
      mockAskYesNo.mockResolvedValue(true); // Use suggested name
      mockAskChoice.mockResolvedValue(0); // Use existing
      mockDatabaseExists.mockResolvedValue(true);

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: true
      });

      expect(result.reused).toBe(true);
      expect(result.created).toBe(false);
      expect(mockCreateDatabase).not.toHaveBeenCalled();
    }, 15000); // Increased timeout for mock resolution

    it('should allow custom database name', async () => {
      mockAskYesNo.mockResolvedValueOnce(false); // Don't use suggested name
      mockAskUser.mockResolvedValueOnce('custom-db-name');
      mockAskYesNo.mockResolvedValueOnce(true); // Confirm creation
      mockDatabaseExists.mockResolvedValue(false);
      mockCreateDatabase.mockResolvedValue('custom-db-id');

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: true
      });

      expect(result.name).toBe('custom-db-name');
      expect(mockAskUser).toHaveBeenCalled();
    }, 30000);

    it('should handle database deletion and recreation', async () => {
      mockAskYesNo.mockResolvedValue(true); // Use suggested name, confirm deletion, confirm creation
      mockAskChoice.mockResolvedValue(2); // Delete and recreate
      mockDatabaseExists.mockResolvedValue(true);
      mockCreateDatabase.mockResolvedValue('new-db-id');

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: true
      });

      expect(mockDeleteDatabase).toHaveBeenCalledWith('example.com-auth-db');
      expect(mockCreateDatabase).toHaveBeenCalledWith('example.com-auth-db');
      expect(result.created).toBe(true);
    }, 15000); // Increased timeout for mock resolution

    it('should work in non-interactive mode', async () => {
      mockDatabaseExists.mockResolvedValue(false);
      mockCreateDatabase.mockResolvedValue('auto-db-id');

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: false
      });

      expect(result.created).toBe(true);
      expect(mockAskYesNo).not.toHaveBeenCalled();
      expect(mockAskChoice).not.toHaveBeenCalled();
    }, 30000);

    it('should throw error when creation is cancelled', async () => {
      mockAskYesNo.mockResolvedValueOnce(true); // Use suggested name
      mockAskYesNo.mockResolvedValueOnce(false); // Cancel creation
      mockDatabaseExists.mockResolvedValue(false);

      await expect(
        workflow.handleDatabaseSetup('example.com', 'production')
      ).rejects.toThrow('Database creation cancelled');
    }, 30000);
  });

  describe('getSummary', () => {
    it('should return summary for created database', () => {
      const summary = workflow.getSummary({
        name: 'test-db',
        id: 'test-id',
        created: true,
        reused: false
      });

      expect(summary).toContain('CREATED');
      expect(summary).toContain('test-db');
    });

    it('should return summary for reused database', () => {
      const summary = workflow.getSummary({
        name: 'test-db',
        id: 'test-id',
        created: false,
        reused: true
      });

      expect(summary).toContain('REUSED');
      expect(summary).toContain('test-db');
    });
  });
});
