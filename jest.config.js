export default {
  preset: null,
  testEnvironment: 'node',
  maxWorkers: 1,
  globals: {
    'ts-jest': {
      useESM: true,
    },
    // Ensure babel-jest transforms files as ESM for top-level await support
    'babel-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    // Map package imports to source files during testing
    '^@tamyla/clodo-framework/utils$': '<rootDir>/src/utils/index.js',
    // Map re-export wrapper imports to their actual implementations during testing
    '^../lib/shared/utils/file-manager.js$': '<rootDir>/lib/shared/utils/file-manager.js',
    '^../lib/shared/utils/formatters.js$': '<rootDir>/lib/shared/utils/formatters.js',
    '^../lib/shared/logging/Logger.js$': '<rootDir>/lib/shared/logging/Logger.js',
    '^../../lib/shared/cloudflare/ops.js$': '<rootDir>/lib/shared/cloudflare/ops.js',
    '^../../../shared/utils/ErrorHandler.js$': '<rootDir>/lib/shared/utils/ErrorHandler.js',
    // Removed .js extension stripping for ES modules
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@babel|@jest|uuid|chalk)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/lib'],
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
    '/generated/',
    '/clodo-dev-site/'
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testEnvironmentOptions: {
    customExportConditions: ['node']
  }
};