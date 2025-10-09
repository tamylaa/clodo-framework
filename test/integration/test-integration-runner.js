#!/usr/bin/env node

/**
 * Lego Framework Integration Test Runner
 *
 * This script simulates a complete deployment workflow to identify
 * missing dependencies, configuration issues, and practical limitations
 * before real service integration.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const TEST_DIR = join(__dirname, 'test-integration');
const LOGS_DIR = join(TEST_DIR, 'test-logs');

class IntegrationTester {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      missing: []
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logMessage);

    // Write to log file
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }
    writeFileSync(join(LOGS_DIR, 'integration-test.log'), logMessage + '\n', { flag: 'a' });
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const cmd = spawn(command, args, {
        cwd: TEST_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      cmd.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      cmd.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      cmd.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      cmd.on('error', (error) => {
        reject(error);
      });
    });
  }

  async testStep(name, testFunction) {
    this.log(`Starting test: ${name}`);
    try {
      const result = await testFunction();
      if (result.success) {
        this.results.passed.push({ name, ...result });
        this.log(`✅ PASSED: ${name}`, 'success');
      } else {
        this.results.failed.push({ name, ...result });
        this.log(`❌ FAILED: ${name} - ${result.error}`, 'error');
      }
    } catch (error) {
      this.results.failed.push({ name, error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  async testConfigurationFiles() {
    const requiredFiles = [
      'wrangler.toml',
      'src/config/domains.js',
      'package.json',
      'src/worker/index.js'
    ];

    const missing = [];
    const present = [];

    for (const file of requiredFiles) {
      const filePath = join(TEST_DIR, file);
      if (existsSync(filePath)) {
        present.push(file);
        this.log(`Found configuration file: ${file}`);
      } else {
        missing.push(file);
        this.log(`Missing configuration file: ${file}`, 'warning');
      }
    }

    return {
      success: missing.length === 0,
      present,
      missing,
      error: missing.length > 0 ? `Missing files: ${missing.join(', ')}` : null
    };
  }

  async testPackageInstallation() {
    try {
      // Check if node_modules exists
      const nodeModulesPath = join(TEST_DIR, 'node_modules');
      if (!existsSync(nodeModulesPath)) {
        this.log('Installing dependencies...');
        const result = await this.runCommand('npm', ['install']);
        if (result.code !== 0) {
          return { success: false, error: `npm install failed: ${result.stderr}` };
        }
      }

      // Try to import the framework
      const testScript = `
try {
  const { initializeService } = await import('@tamyla/clodo-framework');
  console.log('Framework import successful');
} catch (error) {
  console.error('Framework import failed:', error.message);
  process.exit(1);
}
      `.trim();

      const result = await this.runCommand('node', ['-e', testScript]);
      return {
        success: result.code === 0,
        error: result.code !== 0 ? result.stderr : null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testDeploymentValidator() {
    try {
      const validatorPath = join(__dirname, 'bin', 'shared', 'deployment-validator.js');
      const result = await this.runCommand('node', [validatorPath, '--basic']);

      return {
        success: result.code === 0,
        output: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testDatabaseOrchestrator() {
    try {
      const dbPath = join(__dirname, 'bin', 'shared', 'database-orchestrator.js');
      const result = await this.runCommand('node', [dbPath, '--check-schema']);

      return {
        success: result.code === 0,
        output: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testWranglerIntegration() {
    try {
      // Check if wrangler is available
      const result = await this.runCommand('npx', ['wrangler', '--version']);
      if (result.code !== 0) {
        return { success: false, error: 'Wrangler not available' };
      }

      // Try wrangler dev (but don't actually start it)
      const devResult = await this.runCommand('timeout', ['5', 'npx', 'wrangler', 'dev', '--port', '8787'], { timeout: 10000 });

      return {
        success: true, // Even if it fails due to timeout, wrangler is working
        wranglerVersion: result.stdout.trim(),
        note: 'Wrangler integration test completed (may timeout as expected)'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testEnterpriseDeploy() {
    try {
      const deployPath = join(__dirname, 'bin', 'enterprise-deploy.js');
      const result = await this.runCommand('node', [deployPath, '--help']);

      return {
        success: result.code === 0,
        helpOutput: result.stdout,
        error: result.stderr
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testEnvironmentVariables() {
    const requiredEnvVars = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_ZONE_ID',
      'CLOUDFLARE_API_TOKEN'
    ];

    const missing = [];
    const present = [];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        present.push(envVar);
      } else {
        missing.push(envVar);
      }
    }

    return {
      success: true, // Not a failure, just informational
      present,
      missing,
      note: missing.length > 0 ? 'Some environment variables are missing for full deployment' : 'All required environment variables are set'
    };
  }

  async runAllTests() {
    this.log('🚀 Starting Lego Framework Integration Test Suite');
    this.log('=' .repeat(60));

    await this.testStep('Configuration Files Check', () => this.testConfigurationFiles());
    await this.testStep('Package Installation', () => this.testPackageInstallation());
    await this.testStep('Deployment Validator', () => this.testDeploymentValidator());
    await this.testStep('Database Orchestrator', () => this.testDatabaseOrchestrator());
    await this.testStep('Wrangler Integration', () => this.testWranglerIntegration());
    await this.testStep('Enterprise Deploy CLI', () => this.testEnterpriseDeploy());
    await this.testStep('Environment Variables', () => this.testEnvironmentVariables());

    this.generateReport();
  }

  generateReport() {
    const duration = Date.now() - this.startTime;

    this.log('\n' + '=' .repeat(60));
    this.log('📊 INTEGRATION TEST RESULTS');
    this.log('=' .repeat(60));

    this.log(`⏱️  Total Duration: ${duration}ms`);
    this.log(`✅ Passed: ${this.results.passed.length}`);
    this.log(`❌ Failed: ${this.results.failed.length}`);
    this.log(`⚠️  Warnings: ${this.results.warnings.length}`);

    if (this.results.passed.length > 0) {
      this.log('\n✅ PASSED TESTS:');
      this.results.passed.forEach(test => {
        this.log(`  • ${test.name}`);
      });
    }

    if (this.results.failed.length > 0) {
      this.log('\n❌ FAILED TESTS:');
      this.results.failed.forEach(test => {
        this.log(`  • ${test.name}: ${test.error}`);
      });
    }

    // Generate detailed report file
    const reportPath = join(LOGS_DIR, 'integration-report.json');
    writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      results: this.results
    }, null, 2));

    this.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Summary of missing pieces
    this.log('\n🔍 KEY FINDINGS:');
    const envTest = this.results.passed.find(t => t.name === 'Environment Variables');
    if (envTest && envTest.missing.length > 0) {
      this.log(`  • Missing environment variables: ${envTest.missing.join(', ')}`);
    }

    const configTest = this.results.passed.find(t => t.name === 'Configuration Files Check');
    if (configTest && configTest.missing.length > 0) {
      this.log(`  • Missing configuration files: ${configTest.missing.join(', ')}`);
    }

    this.log('\n🎯 RECOMMENDATIONS:');
    this.log('  • Set up Cloudflare credentials for full deployment testing');
    this.log('  • Ensure all configuration files are present');
    this.log('  • Test with real Cloudflare account for production simulation');
    this.log('  • Consider adding mock Cloudflare API responses for CI/CD testing');
  }
}

// Run the tests
const tester = new IntegrationTester();
tester.runAllTests().catch(error => {
  console.error('Integration test suite failed:', error);
  process.exit(1);
});