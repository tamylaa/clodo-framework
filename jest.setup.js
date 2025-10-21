/**
 * Jest setup file for ES module compatibility
 */

// Mock the url module
jest.mock('url', () => ({
  ...jest.requireActual('url'),
  fileURLToPath: (url) => {
    // For Jest compatibility, return a path relative to the project root
    if (url && url.startsWith && url.startsWith('file://')) {
      return url.replace('file://', '');
    }
    // Return a default path for Jest
    return process.cwd() + '/src/database/database-orchestrator.js';
  }
}));

// Mock child_process module globally
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Also mock the dirname function to work with our mocked paths
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  dirname: (path) => {
    if (path.includes('database-orchestrator.js')) {
      return process.cwd() + '/src/database';
    }
    return jest.requireActual('path').dirname(path);
  }
}));