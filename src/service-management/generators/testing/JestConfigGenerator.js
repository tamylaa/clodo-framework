import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

/**
 * Jest Configuration Generator
 * Generates Jest test runner configuration
 */
export class JestConfigGenerator extends BaseGenerator {
  /**
   * Generate Jest configuration
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated config file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    const jestConfig = this._generateJestConfig(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, 'jest.config.js');
    writeFileSync(filePath, jestConfig, 'utf8');
    return filePath;
  }

  /**
   * Generate Jest configuration content
   * @private
   */
  _generateJestConfig(coreInputs, confirmedValues) {
    return `/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/worker/index.js' // Worker code runs in different environment
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 10000,
  verbose: true,
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate Jest config
  }
}
