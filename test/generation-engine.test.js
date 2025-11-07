/**
 * GenerationEngine Integration Test Suite
 *
 * Tests the GenerationEngine through CLI integration
 * is blocked by ES module issues in Jest environment.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Use process.cwd() and path resolution instead of import.meta.url
const __dirname = path.resolve();

describe('GenerationEngine CLI Integration Tests', () => {
  const cliPath = path.join(__dirname, 'dist', 'cli', 'clodo-service.js');
  const testServiceName = 'test-service-integration';
  const testOutputDir = path.join(__dirname, 'test-output', testServiceName);

  // Clean up before and after tests
  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  test('CLI shows help information', (done) => {
    const child = spawn('node', [cliPath, '--help'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('--help');
      expect(stdout).toContain('--version');
      done();
    });
  });

  test('CLI shows version information', (done) => {
    const child = spawn('node', [cliPath, '--version'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Version pattern
      done();
    });
  });

  test('CLI validates required parameters', (done) => {
    const child = spawn('node', [cliPath, '--non-interactive'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1); // Should fail with missing parameters
      expect(stderr).toContain('error');
      done();
    });
  });

  // NOTE: CLI service creation is not implemented - use ServiceOrchestrator API instead
  // Service creation is tested in e2e-test/e2e-test.js

  test.skip('CLI generates correct directory structure', (done) => {
    const child = spawn('node', [
      cliPath,
      'create',
      '--service-name', testServiceName,
      '--service-type', 'data-service',
      '--environment', 'production',
      '--domain-name', 'prod.example.com',
      '--cloudflare-token', 'prod-token-789',
      '--cloudflare-account-id', 'prod-account-101',
      '--cloudflare-zone-id', 'prod-zone-112',
      '--output-path', path.resolve(testOutputDir),
      '--non-interactive'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      const actualServiceDir = path.join(testOutputDir, testServiceName);
      expect(fs.existsSync(actualServiceDir)).toBe(true);

      // Check for expected directories
      const expectedDirs = [
        'src',
        'config',
        'test',
        'docs'
      ];

      expectedDirs.forEach(dir => {
        expect(fs.existsSync(path.join(actualServiceDir, dir))).toBe(true);
      });

      // Check for key files
      const expectedFiles = [
        'README.md',
        'clodo-service-manifest.json',
        'jest.config.js',
        '.eslintrc.js'
      ];

      expectedFiles.forEach(file => {
        expect(fs.existsSync(path.join(actualServiceDir, file))).toBe(true);
      });

      done();
    });
  }, 30000);

  test.skip('CLI handles invalid service type', (done) => {
    const child = spawn('node', [
      cliPath,
      'create',
      '--service-name', testServiceName,
      '--service-type', 'invalid-type',
      '--environment', 'development',
      '--domain-name', 'test.example.com',
      '--cloudflare-token', 'test-token-123',
      '--cloudflare-account-id', 'test-account-456',
      '--cloudflare-zone-id', 'test-zone-789',
      '--output-path', testOutputDir,
      '--non-interactive'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      expect(stderr).toContain('Invalid service type');
      done();
    });
  });
});
