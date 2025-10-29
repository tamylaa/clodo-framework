import { jest } from '@jest/globals';

export const ProductionTestingCoordinator = jest.fn(() => ({
  initialize: jest.fn().mockResolvedValue(),
  executeProductionTesting: jest.fn().mockResolvedValue({ success: true })
}));
