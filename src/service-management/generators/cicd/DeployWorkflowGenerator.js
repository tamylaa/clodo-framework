import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Deploy Workflow Generator
 * Generates GitHub Actions deployment workflow for staging and production
 */
export class DeployWorkflowGenerator extends BaseGenerator {
  /**
   * Generate deployment workflow
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated deploy workflow file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure .github/workflows directory exists
    const workflowsDir = join(servicePath, '.github', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });

    const deployWorkflow = this._generateDeployWorkflow(coreInputs, confirmedValues);
    
    const filePath = join(workflowsDir, 'deploy.yml');
    writeFileSync(filePath, deployWorkflow, 'utf8');
    return filePath;
  }

  /**
   * Generate deployment workflow content
   * @private
   */
  _generateDeployWorkflow(coreInputs, confirmedValues) {
    return `name: Deploy

on:
  push:
    branches: [ main, master ]
  workflow_run:
    workflows: ["CI"]
    types:
      - completed

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    environment: staging

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Deploy to staging
      run: npx wrangler deploy --env staging
      env:
        CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    environment: production

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Deploy to production
      run: npx wrangler deploy --env production
      env:
        CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate deployment workflow
  }
}

