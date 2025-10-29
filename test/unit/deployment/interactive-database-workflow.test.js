/**
 * Tests for Interactive Database Workflow
 */

import { jest } from '@jest/globals';

// Mock dependencies before importing the module
const mockAskUser = jest.fn();
const mockAskYesNo = jest.fn();
const mockAskChoice = jest.fn();
const mockDatabaseExists = jest.fn();
const mockCreateDatabase = jest.fn();
const mockDeleteDatabase = jest.fn();
const mockExec = jest.fn();

jest.unstable_mockModule('../../../bin/shared/utils/interactive-prompts.js', () => ({
  askUser: mockAskUser,
  askYesNo: mockAskYesNo,
  askChoice: mockAskChoice
}));

jest.unstable_mockModule('../../../bin/shared/cloudflare/ops.js', () => ({
  databaseExists: mockDatabaseExists,
  createDatabase: mockCreateDatabase,
  deleteDatabase: mockDeleteDatabase
}));

jest.unstable_mockModule('child_process', () => ({
  exec: mockExec
}));

const { InteractiveDatabaseWorkflow } = await import('../../../bin/shared/deployment/workflows/interactive-database-workflow.js');

describe('InteractiveDatabaseWorkflow', () => {
  let workflow;
  let rollbackActions;

  beforeEach(() => {
    rollbackActions = [];
    workflow = new InteractiveDatabaseWorkflow({ rollbackActions });
    jest.clearAllMocks();
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
    });

    it('should reuse existing database', async () => {
      mockAskYesNo.mockResolvedValueOnce(true); // Use suggested name
      mockAskChoice.mockResolvedValueOnce(0); // Use existing
      mockDatabaseExists.mockResolvedValue(true);

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: true
      });

      expect(result.reused).toBe(true);
      expect(result.created).toBe(false);
      expect(mockCreateDatabase).not.toHaveBeenCalled();
    });

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
    });

    it('should handle database deletion and recreation', async () => {
      mockAskYesNo.mockResolvedValueOnce(true); // Use suggested name
      mockAskChoice.mockResolvedValueOnce(2); // Delete and recreate
      mockAskYesNo.mockResolvedValueOnce(true); // Confirm deletion
      mockAskYesNo.mockResolvedValueOnce(true); // Confirm creation
      mockDatabaseExists.mockResolvedValue(true);
      mockCreateDatabase.mockResolvedValue('new-db-id');

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: true
      });

      expect(mockDeleteDatabase).toHaveBeenCalledWith('example.com-auth-db');
      expect(mockCreateDatabase).toHaveBeenCalledWith('example.com-auth-db');
      expect(result.created).toBe(true);
    });

    it('should work in non-interactive mode', async () => {
      mockDatabaseExists.mockResolvedValue(false);
      mockCreateDatabase.mockResolvedValue('auto-db-id');

      const result = await workflow.handleDatabaseSetup('example.com', 'production', {
        interactive: false
      });

      expect(result.created).toBe(true);
      expect(mockAskYesNo).not.toHaveBeenCalled();
      expect(mockAskChoice).not.toHaveBeenCalled();
    });

    it('should throw error when creation is cancelled', async () => {
      mockAskYesNo.mockResolvedValueOnce(true); // Use suggested name
      mockAskYesNo.mockResolvedValueOnce(false); // Cancel creation
      mockDatabaseExists.mockResolvedValue(false);

      await expect(
        workflow.handleDatabaseSetup('example.com', 'production')
      ).rejects.toThrow('Database creation cancelled');
    });
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
