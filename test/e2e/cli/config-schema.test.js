/**
 * End-to-End Tests: Config Schema Command
 *
 * Tests for the `clodo-service config-schema` CLI command group:
 * - config-schema types
 * - config-schema show <type>
 * - config-schema validate <file>
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const CLI_PATH = join(process.cwd(), 'cli', 'clodo-service.js');

describe('End-to-End: Config Schema Command', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `config-schema-e2e-${Date.now()}`);
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
   * Helper: extract JSON from CLI output
   */
  function extractJSON(stdout) {
    const match = stdout.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }

  // ─── types ─────────────────────────────────────────────────

  describe('config-schema types', () => {
    it('lists all config types', () => {
      const result = runCLI('config-schema types');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('create');
      expect(result.stdout).toContain('deploy');
      expect(result.stdout).toContain('validate');
      expect(result.stdout).toContain('update');
    });

    it('outputs JSON when --json flag is used', () => {
      const result = runCLI('config-schema types --json');
      expect(result.exitCode).toBe(0);
      const json = extractJSON(result.stdout);
      expect(json).not.toBeNull();
      expect(json.create).toBeDefined();
      expect(json.deploy).toBeDefined();
      expect(json.validate).toBeDefined();
      expect(json.update).toBeDefined();
    });
  });

  // ─── show ──────────────────────────────────────────────────

  describe('config-schema show', () => {
    it('shows schema for create type', () => {
      const result = runCLI('config-schema show create');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Config Schema: create');
      expect(result.stdout).toContain('projectName');
      expect(result.stdout).toContain('serviceType');
    });

    it('shows schema for deploy type', () => {
      const result = runCLI('config-schema show deploy');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Config Schema: deploy');
      expect(result.stdout).toContain('deployment');
    });

    it('shows schema for validate type', () => {
      const result = runCLI('config-schema show validate');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Config Schema: validate');
      expect(result.stdout).toContain('checks');
    });

    it('shows schema for update type', () => {
      const result = runCLI('config-schema show update');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Config Schema: update');
      expect(result.stdout).toContain('updates');
    });

    it('outputs JSON when --json flag is used', () => {
      const result = runCLI('config-schema show create --json');
      expect(result.exitCode).toBe(0);
      const json = extractJSON(result.stdout);
      expect(json).not.toBeNull();
      expect(json.commandType).toBe('create');
      expect(json.fields).toBeDefined();
      expect(json.validServiceTypes).toBeDefined();
      expect(json.validFeatures).toBeDefined();
    });

    it('shows valid service types', () => {
      const result = runCLI('config-schema show create');
      expect(result.stdout).toContain('api-service');
      expect(result.stdout).toContain('data-service');
      expect(result.stdout).toContain('worker');
    });

    it('shows valid features', () => {
      const result = runCLI('config-schema show create');
      expect(result.stdout).toContain('d1');
      expect(result.stdout).toContain('kv');
      expect(result.stdout).toContain('r2');
    });

    it('fails for unknown type', () => {
      const result = runCLI('config-schema show nonexistent');
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown config type');
    });
  });

  // ─── validate ──────────────────────────────────────────────

  describe('config-schema validate', () => {
    it('validates a valid create config file', () => {
      const configPath = join(testDir, 'test-create.json');
      writeFileSync(configPath, JSON.stringify({
        projectName: 'my-service',
        serviceType: 'api-service',
        environment: 'production',
        features: ['d1', 'kv']
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}" --type create`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Valid configuration');
    });

    it('detects errors in invalid config', () => {
      const configPath = join(testDir, 'test-invalid.json');
      writeFileSync(configPath, JSON.stringify({
        serviceName: 'Invalid Name!',
        serviceType: 'not-a-type'
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}" --type create`);
      expect(result.stdout).toContain('Invalid configuration');
      expect(result.stdout + result.stderr).toMatch(/error/i);
    });

    it('auto-detects type from filename', () => {
      const configPath = join(testDir, 'my-create-config.json');
      writeFileSync(configPath, JSON.stringify({
        projectName: 'test-auto'
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Valid configuration');
    });

    it('auto-detects deploy type from filename', () => {
      const configPath = join(testDir, 'deploy-settings.json');
      writeFileSync(configPath, JSON.stringify({
        domain: 'api.example.com',
        dryRun: true
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}"`);
      expect(result.exitCode).toBe(0);
    });

    it('reports warnings for env var placeholders', () => {
      const configPath = join(testDir, 'deploy-envvar.json');
      writeFileSync(configPath, JSON.stringify({
        cloudflareToken: '${CLOUDFLARE_TOKEN}'
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}" --type deploy`);
      expect(result.exitCode).toBe(0);
      // Warnings are shown in output
      expect(result.stdout).toContain('Valid configuration');
    });

    it('exits with error code when --strict and invalid', () => {
      const configPath = join(testDir, 'strict-test.json');
      writeFileSync(configPath, JSON.stringify({
        serviceName: 'Invalid Name!',
        serviceType: 'not-a-type'
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}" --type create --strict`);
      expect(result.exitCode).toBe(1);
    });

    it('outputs JSON when --json flag is used', () => {
      const configPath = join(testDir, 'json-test.json');
      writeFileSync(configPath, JSON.stringify({
        projectName: 'test-json'
      }, null, 2));

      const result = runCLI(`config-schema validate "${configPath}" --type create --json`);
      expect(result.exitCode).toBe(0);
      const json = extractJSON(result.stdout);
      expect(json).not.toBeNull();
      expect(json.valid).toBe(true);
    });

    it('fails for non-existent file', () => {
      const result = runCLI('config-schema validate /nonexistent/path.json --type create');
      expect(result.exitCode).not.toBe(0);
    });

    it('validates example config files from config directory', () => {
      const result = runCLI('config-schema validate config/clodo-create.example.json --type create');
      expect(result.exitCode).toBe(0);
    });

    it('validates deploy example config', () => {
      const result = runCLI('config-schema validate config/clodo-deploy.example.json --type deploy');
      expect(result.exitCode).toBe(0);
    });

    it('validates update example config', () => {
      const result = runCLI('config-schema validate config/clodo-update.example.json --type update');
      expect(result.exitCode).toBe(0);
    });
  });
});
