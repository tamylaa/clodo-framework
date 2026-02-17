/**
 * Jest Setup File
 * Configures Jest for ES modules and test environment
 */

// Mock import.meta for ES modules
global.importMeta = {
  url: 'file://' + __filename
};

// Mock fetch for tests
global.fetch = jest.fn();

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});