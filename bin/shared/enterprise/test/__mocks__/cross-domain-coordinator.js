import { jest } from '@jest/globals';

export const CrossDomainCoordinator = jest.fn(() => ({
  initialize: jest.fn().mockResolvedValue(),
  coordinate: jest.fn().mockResolvedValue({ success: true })
}));
