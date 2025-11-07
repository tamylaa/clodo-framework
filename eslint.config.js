import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-unreachable': 'error'
    }
  },
  // Browser environment for template JS files
  {
    files: ['templates/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-unreachable': 'error'
    }
  },
  // Ignore HTML files and other non-JS files
  {
    ignores: ['**/*.html', 'backups/**', 'dist/**']
  }
];