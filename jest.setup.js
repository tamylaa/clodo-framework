/**
 * Jest setup file for ES module compatibility
 */

// Mock import.meta for Jest
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      url: import.meta.url,
    },
  },
  writable: false,
});

// Basic setup for ES modules - keep it minimal
// Module mocking should be done in individual test files