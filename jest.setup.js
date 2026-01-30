/**
 * Cross-environment Jest setup
 *
 * Provide a `global.import.meta.url` value for tests. Use `process.cwd()` as a
 * safe fallback so this file can be loaded both as CommonJS and ESM without
 * referencing `require` or `import.meta` directly (avoids parse-time errors).
 */

const cwd = process.cwd();
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      url: `file://${cwd}/`
    }
  },
  writable: false
});

// Clean up environment variables that can cause test pollution
// Be aggressive about this since tests can pollute each other
const cleanupEnvironmentVariables = () => {
  delete process.env.CLODO_ENABLE_PERSISTENCE;
  process.env.CLODO_ENABLE_PERSISTENCE = undefined;
};

// Clean up immediately
cleanupEnvironmentVariables();

// Minimal common test setup (keep quiet)
