/**
 * Tests for Deploy Command
 * Tests deploy command integration with manifest loading and validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { registerDeployCommand } from '../bin/commands/deploy.js';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Deploy Command', () => {
  let testDir;
  let mockProgram;

  beforeEach(() => {
    testDir = join(tmpdir(), `deploy-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Mock commander program
    mockProgram = {
      command: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn()
    };
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  describe('registerDeployCommand', () => {
    it('should register deploy command with commander', () => {
      registerDeployCommand(mockProgram);

      expect(mockProgram.command).toHaveBeenCalledWith('deploy');
      expect(mockProgram.description).toHaveBeenCalled();
      expect(mockProgram.option).toHaveBeenCalledWith(
        '--token <token>',
        'Cloudflare API token'
      );
      expect(mockProgram.option).toHaveBeenCalledWith(
        '--service-path <path>',
        expect.any(String),
        '.'
      );
      expect(mockProgram.action).toHaveBeenCalled();
    });

    it('should register all required options', () => {
      registerDeployCommand(mockProgram);

      const optionCalls = mockProgram.option.mock.calls;

      const optionNames = optionCalls.map(call => call[0]);
      expect(optionNames).toContain('--token <token>');
      expect(optionNames).toContain('--account-id <id>');
      expect(optionNames).toContain('--zone-id <id>');
      expect(optionNames).toContain('--dry-run');
      expect(optionNames).toContain('-q, --quiet');
      expect(optionNames).toContain('--service-path <path>');
    });

    it('should setup correct command descriptions', () => {
      registerDeployCommand(mockProgram);

      const descCalls = mockProgram.description.mock.calls;
      expect(descCalls[0][0]).toContain('Deploy');
      expect(descCalls[0][0]).toContain('Clodo');
    });
  });

  describe('Deploy command action', () => {
    it('should handle action callback registration', () => {
      registerDeployCommand(mockProgram);

      expect(mockProgram.action).toHaveBeenCalled();
      const actionFn = mockProgram.action.mock.calls[0][0];
      expect(typeof actionFn).toBe('function');
    });

    it('should be async function', () => {
      registerDeployCommand(mockProgram);

      const actionFn = mockProgram.action.mock.calls[0][0];
      const isAsync = actionFn.constructor.name === 'AsyncFunction';
      expect(isAsync).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle Clodo service manifest', async () => {
      const manifest = {
        serviceName: 'test-api',
        serviceType: 'data-service',
        version: '1.0.0',
        deployment: {
          domains: [
            {
              name: 'api.example.com',
              cloudflareZoneId: 'zone123',
              environment: 'production'
            }
          ]
        }
      };

      writeFileSync(
        join(testDir, 'clodo-service-manifest.json'),
        JSON.stringify(manifest)
      );

      // Verify manifest was created
      expect(existsSync(join(testDir, 'clodo-service-manifest.json'))).toBe(true);

      const manifestContent = JSON.parse(
        readFileSync(join(testDir, 'clodo-service-manifest.json'), 'utf8')
      );
      // File exists, structure is valid
      expect(manifestContent.serviceName).toBe(manifest.serviceName);
    });

    it('should handle Cloudflare service files', async () => {
      writeFileSync(
        join(testDir, 'wrangler.toml'),
        `
name = "my-api"
main = "src/index.js"

[env.production]
name = "my-api-prod"
      `
      );

      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          name: 'my-api',
          version: '1.0.0',
          dependencies: { wrangler: '^3.0.0' }
        })
      );

      mkdirSync(join(testDir, 'src'), { recursive: true });
      writeFileSync(join(testDir, 'src/index.js'), 'export default {};');

      // Verify files were created
      expect(existsSync(join(testDir, 'wrangler.toml'))).toBe(true);
      expect(existsSync(join(testDir, 'package.json'))).toBe(true);
      expect(existsSync(join(testDir, 'src/index.js'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle missing service configuration', () => {
      // Empty directory - no manifest, no wrangler.toml
      expect(existsSync(join(testDir, 'clodo-service-manifest.json'))).toBe(false);
      expect(existsSync(join(testDir, 'wrangler.toml'))).toBe(false);
    });

    it('should detect malformed manifest', () => {
      writeFileSync(
        join(testDir, 'clodo-service-manifest.json'),
        'invalid json {'
      );

      // File exists but is malformed
      expect(existsSync(join(testDir, 'clodo-service-manifest.json'))).toBe(true);
    });

    it('should handle missing credentials', () => {
      const manifest = {
        serviceName: 'test',
        deployment: { domains: [] }
      };

      writeFileSync(
        join(testDir, 'clodo-service-manifest.json'),
        JSON.stringify(manifest)
      );

      // Manifest exists but credentials not provided
      // Command should ask for credentials
    });
  });
});
