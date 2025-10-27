export default {
  preset: null,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  transform: {},
  // Transform all JS files, including those in node_modules if needed
  transformIgnorePatterns: [
    'node_modules/(?!(@babel|@jest)/)'
  ],
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
    '/backups/',
    '/i-docs/',
    '/generated/'
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