export const WranglerD1Manager = jest.fn().mockImplementation(() => ({
  validateDatabase: jest.fn(),
  createDatabase: jest.fn(),
  getDatabaseInfo: jest.fn()
}));