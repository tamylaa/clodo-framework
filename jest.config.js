export default {
  preset: null,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transform: {
    // Transform source files in src/ with Babel for coverage instrumentation
    '^src/.*\\.(js|jsx|mjs)$': ['babel-jest', {
      presets: [['@babel/preset-env', {
        targets: { node: 'current' },
        modules: false // Ensure Babel outputs ESM
      }]]
    }],
    // Don't transform test files - let them run as native ESM
  },
  // Only ignore node_modules, not test files
  moduleNameMapper: {},
  moduleDirectories: ['node_modules', '<rootDir>'],
  forceExit: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test-output/',
    '/coverage/',
    '/backups/'
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  // ESM-specific settings
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testEnvironmentOptions: {
    // Ensure Node.js ESM support
    customExportConditions: ['node']
  }
};