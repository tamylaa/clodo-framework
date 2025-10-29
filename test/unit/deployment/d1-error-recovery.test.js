/**
 * Tests for D1 Error Recovery Manager
 */

import { jest } from '@jest/globals';
import { D1ErrorRecoveryManager } from '../../../bin/shared/deployment/utilities/d1-error-recovery.js';

// Mock WranglerDeployer
const mockHandleD1BindingError = jest.fn();
const mockWranglerDeployer = jest.fn().mockImplementation(() => ({
  handleD1BindingError: mockHandleD1BindingError
}));

jest.unstable_mockModule('../../../dist/deployment/wrangler-deployer.js', () => ({
  WranglerDeployer: mockWranglerDeployer
}));

describe('D1ErrorRecoveryManager', () => {
  let manager;
  let rollbackActions;

  beforeEach(() => {
    rollbackActions = [];
    manager = new D1ErrorRecoveryManager({ rollbackActions });
    jest.clearAllMocks();
  });

  describe('handleD1BindingError', () => {
    it('should handle D1 error with successful recovery', async () => {
      const mockError = new Error('D1 binding error');
      mockHandleD1BindingError.mockResolvedValue({
        handled: true,
        action: 'created_and_configured',
        databaseName: 'test-db',
        databaseId: 'test-id',
        backupPath: '/tmp/backup.toml'
      });

      const result = await manager.handleD1BindingError(mockError, {
        environment: 'production'
      });

      expect(result.handled).toBe(true);
      expect(result.retry).toBe(true);
      expect(result.action).toBe('created_and_configured');
      expect(result.message).toContain('Created D1 database');
      expect(rollbackActions).toHaveLength(1);
      expect(rollbackActions[0].type).toBe('restore-wrangler-config');
    });

    it('should handle database selection recovery', async () => {
      const mockError = new Error('D1 binding error');
      mockHandleD1BindingError.mockResolvedValue({
        handled: true,
        action: 'database_selected_and_configured',
        databaseName: 'selected-db'
      });

      const result = await manager.handleD1BindingError(mockError, {
        environment: 'production'
      });

      expect(result.retry).toBe(true);
      expect(result.message).toContain('Selected existing database');
    });

    it('should handle cancelled recovery', async () => {
      const mockError = new Error('D1 binding error');
      mockHandleD1BindingError.mockResolvedValue({
        handled: true,
        action: 'cancelled'
      });

      const result = await manager.handleD1BindingError(mockError, {
        environment: 'production'
      });

      expect(result.retry).toBe(false);
      expect(result.message).toContain('cancelled by user');
    });

    it('should handle non-D1 errors', async () => {
      const mockError = new Error('Some other error');
      mockHandleD1BindingError.mockResolvedValue({
        handled: false
      });

      const result = await manager.handleD1BindingError(mockError, {
        environment: 'production'
      });

      expect(result.handled).toBe(false);
      expect(result.retry).toBe(false);
    });

    it('should handle recovery failures gracefully', async () => {
      const mockError = new Error('D1 binding error');
      mockHandleD1BindingError.mockRejectedValue(new Error('Recovery failed'));

      const result = await manager.handleD1BindingError(mockError, {
        environment: 'production'
      });

      expect(result.handled).toBe(true);
      expect(result.retry).toBe(false);
      expect(result.message).toContain('D1 error recovery failed');
    });
  });

  describe('shouldRetryAfterRecovery', () => {
    it('should return true for retryable actions', () => {
      expect(manager.shouldRetryAfterRecovery('created_and_configured')).toBe(true);
      expect(manager.shouldRetryAfterRecovery('database_selected_and_configured')).toBe(true);
      expect(manager.shouldRetryAfterRecovery('binding_updated')).toBe(true);
    });

    it('should return false for non-retryable actions', () => {
      expect(manager.shouldRetryAfterRecovery('cancelled')).toBe(false);
      expect(manager.shouldRetryAfterRecovery('creation_failed')).toBe(false);
      expect(manager.shouldRetryAfterRecovery('manual')).toBe(false);
    });
  });

  describe('deployWithRecovery', () => {
    it('should deploy successfully without errors', async () => {
      const mockDeploy = jest.fn().mockResolvedValue();

      await manager.deployWithRecovery(mockDeploy, {
        environment: 'production'
      });

      expect(mockDeploy).toHaveBeenCalledTimes(1);
    });

    it('should retry after successful recovery', async () => {
      const mockDeploy = jest.fn()
        .mockRejectedValueOnce(new Error('D1 binding error'))
        .mockResolvedValueOnce();

      mockHandleD1BindingError.mockResolvedValue({
        handled: true,
        action: 'created_and_configured',
        databaseName: 'test-db'
      });

      await manager.deployWithRecovery(mockDeploy, {
        environment: 'production'
      });

      expect(mockDeploy).toHaveBeenCalledTimes(2);
    });

    it('should throw if retry fails', async () => {
      const mockDeploy = jest.fn()
        .mockRejectedValueOnce(new Error('D1 binding error'))
        .mockRejectedValueOnce(new Error('Still failing'));

      mockHandleD1BindingError.mockResolvedValue({
        handled: true,
        action: 'created_and_configured',
        databaseName: 'test-db'
      });

      await expect(
        manager.deployWithRecovery(mockDeploy, { environment: 'production' })
      ).rejects.toThrow('Still failing');
    });

    it('should throw non-D1 errors immediately', async () => {
      const mockDeploy = jest.fn().mockRejectedValue(new Error('Network error'));

      mockHandleD1BindingError.mockResolvedValue({
        handled: false
      });

      await expect(
        manager.deployWithRecovery(mockDeploy, { environment: 'production' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics with recoveries', () => {
      rollbackActions.push({
        type: 'restore-wrangler-config',
        backupPath: '/tmp/backup1.toml'
      });
      rollbackActions.push({
        type: 'restore-wrangler-config',
        backupPath: '/tmp/backup2.toml'
      });

      const stats = manager.getStatistics();

      expect(stats.totalRecoveries).toBe(2);
      expect(stats.hasBackups).toBe(true);
      expect(stats.latestBackup).toBe('/tmp/backup1.toml');
    });

    it('should return empty statistics', () => {
      const stats = manager.getStatistics();

      expect(stats.totalRecoveries).toBe(0);
      expect(stats.hasBackups).toBe(false);
      expect(stats.latestBackup).toBeUndefined();
    });
  });
});
