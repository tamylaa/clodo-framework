export default {
  preset: null,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transform: {
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', {
      presets: [['@babel/preset-env', {
        targets: { node: 'current' },
        modules: 'auto'
      }]]
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@babel|babel-jest|chalk)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: [],
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
};