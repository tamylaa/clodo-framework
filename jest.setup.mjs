/**
 * ESM Jest setup file for ESM test environment
 *
 * This file is imported as an ES module by Jest when ESM setup files are used.
 */

// Expose import.meta.url to tests via global.import.meta.url
globalThis.import = {
  meta: {
    url: import.meta.url
  }
};

// Minimal ESM test setup can go here
