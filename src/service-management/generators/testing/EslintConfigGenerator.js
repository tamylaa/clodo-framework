import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

/**
 * ESLint Configuration Generator
 * Generates ESLint linting configuration for code quality
 */
export class EslintConfigGenerator extends BaseGenerator {
  /**
   * Generate ESLint configuration
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated config file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    const eslintConfig = this._generateEslintConfig(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, '.eslintrc.js');
    writeFileSync(filePath, eslintConfig, 'utf8');
    return filePath;
  }

  /**
   * Generate ESLint configuration content
   * @private
   */
  _generateEslintConfig(coreInputs, confirmedValues) {
    return `export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        Headers: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Cloudflare Workers use console
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 0 }],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'never'],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      'eol-last': ['error', 'always']
    }
  }
];
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate ESLint config
  }
}

