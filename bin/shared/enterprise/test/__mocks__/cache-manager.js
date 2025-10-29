import { jest } from '@jest/globals';

export const ConfigurationCacheManager = jest.fn(() => ({
  initialize: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue()
}));
