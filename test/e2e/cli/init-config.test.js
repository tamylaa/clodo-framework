/**
 * Real End-to-End Tests: Init-Config Command Complete Workflow
 *
 * These tests actually run the CLI commands and test real framework functionality
 * - Actually executes 'clodo init-config' commands
 * - Tests copying validation-config.json to service directories
 * - Tests force overwrite functionality
 * - Cleans up after each test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';

describe('Real End-to-End: Init-Config Command Complete Workflow', () => {
  let testDir;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `real-init-config-e2e-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Real Configuration Initialization Operations', () => {
    it('should actually copy validation-config.json to current directory', () => {
      // Change to test directory and run init-config
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${testDir} && node ${cliPath} init-config`;

      execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify validation-config.json was created
      const configPath = join(testDir, 'validation-config.json');
      expect(existsSync(configPath)).toBe(true);

      // Verify it's valid JSON and has expected structure
      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      expect(config).toHaveProperty('validation');
      expect(config).toHaveProperty('timing');
    });

    it('should warn when file already exists without force flag', () => {
      // First create a config file
      const configPath = join(testDir, 'validation-config.json');
      writeFileSync(configPath, '{"test": "existing"}');

      // Try to init-config without force
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${testDir} && node ${cliPath} init-config`;

      const result = execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('already exists');
      expect(output).toContain('Use --force to overwrite');

      // Verify original content is unchanged
      const configContent = readFileSync(configPath, 'utf8');
      expect(configContent).toBe('{"test": "existing"}');
    });

    it('should overwrite existing file with force flag', () => {
      // First create a config file
      const configPath = join(testDir, 'validation-config.json');
      writeFileSync(configPath, '{"test": "existing"}');

      // Init-config with force
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${testDir} && node ${cliPath} init-config --force`;

      execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify file was overwritten
      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      expect(config).toHaveProperty('validation');
      expect(config).not.toEqual({ test: 'existing' });
    });

    it('should display success message and usage information', () => {
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${testDir} && node ${cliPath} init-config`;

      const result = execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const output = result.toString();
      expect(output).toContain('Successfully initialized validation-config.json');
      expect(output).toContain('Location:');
      expect(output).toContain('Usage:');
      expect(output).toContain('Customize timing values');
      expect(output).toContain('Most services don\'t need this file');
    });

    it('should create valid JSON configuration file', () => {
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${testDir} && node ${cliPath} init-config`;

      execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      const configPath = join(testDir, 'validation-config.json');
      const configContent = readFileSync(configPath, 'utf8');

      // Should be valid JSON
      expect(() => JSON.parse(configContent)).not.toThrow();

      const config = JSON.parse(configContent);

      // Should have expected top-level properties (based on the framework's config)
      expect(config).toHaveProperty('validation');
      expect(config).toHaveProperty('timing');
      expect(config).toHaveProperty('networking');
    });

    it('should work from any directory structure', () => {
      // Create nested directory structure
      const nestedDir = join(testDir, 'deep', 'nested', 'service');
      mkdirSync(nestedDir, { recursive: true });

      // Run init-config from nested directory
      const cliPath = join(process.cwd(), 'cli', 'clodo-service.js');
      const initConfigCommand = `cd ${nestedDir} && node ${cliPath} init-config`;

      execSync(initConfigCommand, {
        cwd: join(process.cwd()),
        stdio: 'pipe',
        timeout: 30000
      });

      // Verify config was created in the nested directory
      const configPath = join(nestedDir, 'validation-config.json');
      expect(existsSync(configPath)).toBe(true);

      const configContent = readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      expect(config).toHaveProperty('validation');
    });
  });
});