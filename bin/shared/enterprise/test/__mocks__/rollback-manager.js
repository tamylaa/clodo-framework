import { jest } from '@jest/globals';

export const RollbackManager = jest.fn(() => ({
  initialize: jest.fn().mockResolvedValue(),
  prepareRollback: jest.fn().mockResolvedValue({ success: true }),
  executeRollback: jest.fn().mockResolvedValue({ success: true })
}));
