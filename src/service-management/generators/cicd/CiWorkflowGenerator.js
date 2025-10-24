import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * CI Workflow Generator
 * Generates GitHub Actions CI workflow for automated testing
 */
export class CiWorkflowGenerator extends BaseGenerator {
  /**
   * Generate CI workflow
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated CI workflow file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure .github/workflows directory exists
    const workflowsDir = join(servicePath, '.github', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });

    const ciWorkflow = this._generateCiWorkflow(coreInputs, confirmedValues);
    
    const filePath = join(workflowsDir, 'ci.yml');
    writeFileSync(filePath, ciWorkflow, 'utf8');
    return filePath;
  }

  /**
   * Generate CI workflow content
   * @private
   */
  _generateCiWorkflow(coreInputs, confirmedValues) {
    return `name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint code
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate CI workflow
  }
}
