/**
 * End-to-End Tests: Secrets Command
 *
 * Tests for the `clodo-service secrets` CLI command group:
 * - secrets scan
 * - secrets validate
 * - secrets baseline show
 * - secrets baseline update
 * - secrets patterns
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const CLI_PATH = join(process.cwd(), 'cli', 'clodo-service.js');

describe('End-to-End: Secrets Command', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `secrets-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper: run the CLI and capture output
   */
  function runCLI(args, options = {}) {
    const cmd = `node "${CLI_PATH}" ${args}`;
    try {
      const output = execSync(cmd, {
        cwd: options.cwd || process.cwd(),
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf8'
      });
      return { exitCode: 0, stdout: output, stderr: '' };
    } catch (error) {
      return {
        exitCode: error.status || 1,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || ''
      };
    }
  }

  /**
   * Helper: extract JSON from CLI output (other commands may print init messages before JSON)
   */
  function extractJSON(stdout) {
    // Find the first [ or { that starts a JSON value
    const jsonStart = stdout.search(/^[\[{]/m);
    if (jsonStart === -1) throw new Error(`No JSON found in output: ${stdout.substring(0, 200)}`);
    return JSON.parse(stdout.substring(jsonStart));
  }

  // ─── secrets patterns ──────────────────────────────────────

  describe('secrets patterns', () => {
    it('lists detection patterns in text format', () => {
      const result = runCLI('secrets patterns');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Secret Detection Patterns');
      expect(result.stdout).toContain('CRITICAL');
      expect(result.stdout).toContain('HIGH');
    });

    it('lists detection patterns in JSON format', () => {
      const result = runCLI('secrets patterns --json');
      expect(result.exitCode).toBe(0);
      const patterns = extractJSON(result.stdout);
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('severity');
    });
  });

  // ─── secrets scan ──────────────────────────────────────────

  describe('secrets scan', () => {
    it('reports no secrets for clean directory', () => {
      writeFileSync(join(testDir, 'clean.js'), 'const x = 42;\n');

      const result = runCLI(`secrets scan --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No potential secrets');
    });

    it('detects secrets in files', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        'const password = "SuperSecretP@ssw0rd123!";\n'
      );

      const result = runCLI(`secrets scan --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('potential secret');
    });

    it('outputs JSON format with --json', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        'const password = "SuperSecretP@ssw0rd123!";\n'
      );

      const result = runCLI(`secrets scan --json --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      const parsed = extractJSON(result.stdout);
      expect(parsed).toHaveProperty('findings');
      expect(parsed).toHaveProperty('total');
      expect(parsed.total).toBeGreaterThan(0);
    });

    it('filters by severity', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        '-----BEGIN PRIVATE KEY-----\ndata\n'
      );

      const result = runCLI(`secrets scan --json --severity critical --service-path "${testDir}"`);
      const parsed = extractJSON(result.stdout);
      parsed.findings.forEach(f => {
        expect(f.severity).toBe('critical');
      });
    });

    it('skips test/example values by default', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        'const apiKey = "example_key_abcdefghijklmnopqrst";\n'
      );

      const result = runCLI(`secrets scan --json --service-path "${testDir}"`);
      const parsed = extractJSON(result.stdout);
      expect(parsed.total).toBe(0);
    });

    it('includes test values with --include-tests', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        'const apiKey = "example_key_abcdefghijklmnopqrst";\n'
      );

      const result = runCLI(`secrets scan --json --include-tests --service-path "${testDir}"`);
      const parsed = extractJSON(result.stdout);
      expect(parsed.total).toBeGreaterThan(0);
    });
  });

  // ─── secrets validate ──────────────────────────────────────

  describe('secrets validate', () => {
    it('passes for clean directory', () => {
      writeFileSync(join(testDir, 'clean.js'), 'const x = 42;\n');

      const result = runCLI(`secrets validate --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No potential secrets');
    });

    it('passes when all secrets are baselined', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        '-----BEGIN PRIVATE KEY-----\ndata\n'
      );
      writeFileSync(
        join(testDir, '.secrets.baseline'),
        JSON.stringify([
          { file: 'config.js', line: 1, pattern: 'private_key', match: '-----BEGIN PRIVATE KEY-----...' }
        ])
      );

      const result = runCLI(`secrets validate --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('baseline');
    });

    it('fails when new secrets are not baselined', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        '-----BEGIN PRIVATE KEY-----\ndata\n'
      );

      const result = runCLI(`secrets validate --service-path "${testDir}"`);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('new potential secret');
    });

    it('outputs JSON with --json', () => {
      writeFileSync(join(testDir, 'clean.js'), 'const x = 42;\n');

      const result = runCLI(`secrets validate --json --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      const parsed = extractJSON(result.stdout);
      expect(parsed).toHaveProperty('passed');
      expect(parsed.passed).toBe(true);
    });
  });

  // ─── secrets baseline show ─────────────────────────────────

  describe('secrets baseline show', () => {
    it('shows empty state when no baseline exists', () => {
      const result = runCLI(`secrets baseline show --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No baseline entries');
    });

    it('shows existing baseline entries', () => {
      writeFileSync(
        join(testDir, '.secrets.baseline'),
        JSON.stringify([
          { file: 'config.js', line: 5, pattern: 'api_key', match: 'api_key = ...' }
        ])
      );

      const result = runCLI(`secrets baseline show --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('config.js');
      expect(result.stdout).toContain('api_key');
    });

    it('shows baseline in JSON with --json', () => {
      const baseline = [{ file: 'a.js', line: 1, pattern: 'password', match: '...' }];
      writeFileSync(join(testDir, '.secrets.baseline'), JSON.stringify(baseline));

      const result = runCLI(`secrets baseline show --json --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      const parsed = extractJSON(result.stdout);
      expect(parsed).toEqual(baseline);
    });
  });

  // ─── secrets baseline update ───────────────────────────────

  describe('secrets baseline update', () => {
    it('adds findings with --add-all', () => {
      writeFileSync(
        join(testDir, 'config.js'),
        '-----BEGIN PRIVATE KEY-----\ndata\n'
      );

      const result = runCLI(`secrets baseline update --add-all --reason "reviewed" --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added');

      // Verify baseline file was created
      const baseline = JSON.parse(readFileSync(join(testDir, '.secrets.baseline'), 'utf8'));
      expect(baseline.length).toBeGreaterThan(0);
      expect(baseline[0]).toHaveProperty('addedAt');
      expect(baseline[0].reason).toBe('reviewed');
    });

    it('prunes stale entries with --prune', () => {
      writeFileSync(join(testDir, 'clean.js'), 'const x = 1;\n');
      writeFileSync(
        join(testDir, '.secrets.baseline'),
        JSON.stringify([
          { file: 'old.js', line: 99, pattern: 'api_key', match: 'old...' }
        ])
      );

      const result = runCLI(`secrets baseline update --prune --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Pruned');

      const baseline = JSON.parse(readFileSync(join(testDir, '.secrets.baseline'), 'utf8'));
      expect(baseline).toHaveLength(0);
    });

    it('reports no changes when baseline is current', () => {
      writeFileSync(join(testDir, 'clean.js'), 'const x = 1;\n');

      const result = runCLI(`secrets baseline update --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('up to date');
    });

    it('outputs JSON with --json', () => {
      writeFileSync(join(testDir, 'clean.js'), 'const x = 1;\n');

      const result = runCLI(`secrets baseline update --json --service-path "${testDir}"`);
      expect(result.exitCode).toBe(0);
      const parsed = extractJSON(result.stdout);
      expect(parsed).toHaveProperty('added');
      expect(parsed).toHaveProperty('pruned');
      expect(parsed).toHaveProperty('total');
    });
  });
});
