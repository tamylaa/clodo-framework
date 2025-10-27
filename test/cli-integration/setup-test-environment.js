/**
 * CLI Integration Test Environment Setup
 * 
 * Creates isolated test environments for real CLI testing
 * Manages cleanup, directory structures, and test isolation
 */

import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

export class TestEnvironment {
  constructor(options = {}) {
    this.name = options.name || `cli-test-${Date.now()}`;
    this.baseDir = options.baseDir || join(tmpdir(), 'clodo-cli-tests');
    this.testDir = join(this.baseDir, this.name);
    this.keepOnFailure = options.keepOnFailure !== false;
    this.verbose = options.verbose || false;
    this.frameworkVersion = options.frameworkVersion || '3.0.14';
    this.useLocalPackage = options.useLocalPackage !== false; // Default to true for local testing
    this.localPackagePath = options.localPackagePath || process.cwd();
  }

  /**
   * Create a fresh test environment
   */
  async setup() {
    if (this.verbose) {
      console.log(`\n🔧 Setting up test environment: ${this.name}`);
      console.log(`   Directory: ${this.testDir}`);
    }

    // Clean up existing directory
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }

    // Create fresh directory
    mkdirSync(this.testDir, { recursive: true });

    // Initialize package.json
    const packageJson = {
      name: `cli-test-${this.name}`,
      version: '1.0.0',
      type: 'module',
      private: true,
      description: 'CLI integration test environment',
    };

    writeFileSync(
      join(this.testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create .env file with required variables for CLI tests
    const envContent = `# CLI Integration Test Environment Variables
CLOUDFLARE_ACCOUNT_ID=acc_test_12345678901234567890
CLOUDFLARE_ZONE_ID=zone_test_12345678901234567890
CLOUDFLARE_API_TOKEN=test_token_abc123

SERVICE_NAME=test-service
SERVICE_TYPE=generic
DOMAIN_NAME=test.example.com
ENVIRONMENT=development

API_BASE_PATH=/api/v1
HEALTH_CHECK_PATH=/health

DATABASE_NAME=test_db

PRODUCTION_URL=https://api.example.com
STAGING_URL=https://staging.example.com
DEVELOPMENT_URL=http://localhost:3000
DOCUMENTATION_URL=https://docs.example.com
`;

    writeFileSync(join(this.testDir, '.env'), envContent, 'utf8');

    if (this.verbose) {
      console.log(`   Created .env with required variables`);
    }

    // Install framework
    await this.installFramework();

    if (this.verbose) {
      console.log(`✅ Test environment ready: ${this.testDir}\n`);
    }

    return this.testDir;
  }

  /**
   * Install the framework (local or npm)
   */
  async installFramework() {
    const installCmd = this.useLocalPackage
      ? `npm install "${this.localPackagePath}" --no-save`
      : `npm install @tamyla/clodo-framework@${this.frameworkVersion}`;

    if (this.verbose) {
      console.log(`   Installing: ${installCmd}`);
    }

    try {
      execSync(installCmd, {
        cwd: this.testDir,
        stdio: this.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8'
      });
    } catch (error) {
      throw new Error(`Failed to install framework: ${error.message}`);
    }
  }

  /**
   * Execute a CLI command in the test environment
   */
  async runCLI(commandWithArgs, options = {}) {
    const {
      expectFailure = false,
      timeout = 30000,
      env = {}
    } = options;

    const fullCommand = `npx ${commandWithArgs}`;
    
    if (this.verbose) {
      console.log(`\n💻 Running: ${fullCommand}`);
    }

    // Load .env variables into the environment
    let envVars = { ...process.env, ...env };
    
    // Add .env file variables
    const envFilePath = join(this.testDir, '.env');
    if (existsSync(envFilePath)) {
      const envFileContent = readFileSync(envFilePath, 'utf8');
      const envLines = envFileContent.split('\n');
      
      for (const line of envLines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          envVars[key.trim()] = value.trim();
        }
      }
    }

    try {
      const result = execSync(fullCommand, {
        cwd: this.testDir,
        encoding: 'utf8',
        timeout: timeout,
        env: envVars,
        stdio: 'pipe'
      });

      if (expectFailure) {
        throw new Error(`Command expected to fail but succeeded: ${fullCommand}`);
      }

      return {
        success: true,
        stdout: result,
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      if (expectFailure) {
        return {
          success: false,
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          exitCode: error.status || 1
        };
      }

      if (this.verbose) {
        console.error(`❌ Command failed: ${error.message}`);
        if (error.stdout) console.error(`   stdout: ${error.stdout}`);
        if (error.stderr) console.error(`   stderr: ${error.stderr}`);
      }

      throw new Error(`CLI command failed: ${fullCommand}\n${error.message}`);
    }
  }

  /**
   * Create a file in the test environment
   */
  createFile(relativePath, content) {
    const fullPath = join(this.testDir, relativePath);
    const dir = join(fullPath, '..');
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content, 'utf8');
    
    if (this.verbose) {
      console.log(`📝 Created file: ${relativePath}`);
    }

    return fullPath;
  }

  /**
   * Check if a file exists in the test environment
   */
  fileExists(relativePath) {
    const fullPath = join(this.testDir, relativePath);
    return existsSync(fullPath);
  }

  /**
   * Get the full path to a file in the test environment
   */
  getPath(relativePath = '') {
    return join(this.testDir, relativePath);
  }

  /**
   * Clean up the test environment
   */
  async cleanup(testFailed = false) {
    if (testFailed && this.keepOnFailure) {
      console.log(`\n⚠️  Test failed - keeping environment for inspection:`);
      console.log(`   ${this.testDir}`);
      return;
    }

    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
      
      if (this.verbose) {
        console.log(`🧹 Cleaned up test environment: ${this.name}`);
      }
    }
  }

  /**
   * List all files in the test environment
   */
  async listFiles(relativePath = '') {
    const { readdirSync, statSync } = await import('fs');
    const fullPath = join(this.testDir, relativePath);
    
    if (!existsSync(fullPath)) {
      return [];
    }

    const files = [];
    const entries = readdirSync(fullPath);

    for (const entry of entries) {
      const entryPath = join(fullPath, entry);
      const stat = statSync(entryPath);
      
      if (stat.isDirectory()) {
        files.push({ name: entry, type: 'directory', path: join(relativePath, entry) });
      } else {
        files.push({ name: entry, type: 'file', path: join(relativePath, entry) });
      }
    }

    return files;
  }

  /**
   * Read a file from the test environment
   */
  async readFile(relativePath) {
    const { readFileSync } = await import('fs');
    const fullPath = join(this.testDir, relativePath);
    
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    return readFileSync(fullPath, 'utf8');
  }
}

/**
 * Test Environment Manager
 * Manages multiple test environments and cleanup
 */
export class TestEnvironmentManager {
  constructor() {
    this.environments = [];
  }

  /**
   * Create a new test environment
   */
  async create(options = {}) {
    const env = new TestEnvironment(options);
    await env.setup();
    this.environments.push(env);
    return env;
  }

  /**
   * Clean up all test environments
   */
  async cleanupAll() {
    for (const env of this.environments) {
      await env.cleanup(false); // Force cleanup
    }
    this.environments = [];
  }
}
