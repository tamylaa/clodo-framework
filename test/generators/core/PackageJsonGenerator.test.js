/**
 * Tests for PackageJsonGenerator
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PackageJsonGenerator } from '../../../src/service-management/generators/core/PackageJsonGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PackageJsonGenerator', () => {
  let tempDir;
  let generator;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', '..', 'tmp', `packagejson-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    generator = new PackageJsonGenerator({
      servicePath: tempDir
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('Constructor', () => {
    test('should create instance with default name', () => {
      expect(generator.name).toBe('PackageJsonGenerator');
    });
  });

  describe('generate()', () => {
    test('should generate package.json for generic service', async () => {
      const context = {
        coreInputs: {
          serviceType: 'generic'
        },
        confirmedValues: {
          packageName: 'my-test-service',
          version: '1.0.0',
          description: 'Test service',
          author: 'Test Author',
          gitRepositoryUrl: 'https://github.com/test/repo'
        }
      };

      await generator.generate(context);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      expect(packageJson.name).toBe('my-test-service');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.description).toBe('Test service');
      expect(packageJson.author).toBe('Test Author');
      expect(packageJson.type).toBe('module');
      expect(packageJson.main).toBe('src/worker/index.js');
    });

    test('should handle missing coreInputs gracefully', async () => {
      // With dual convention support, this should work (uses defaults)
      await generator.generate({ confirmedValues: { packageName: 'test-pkg' } });
      
      const packageJsonPath = path.join(tempDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      
      expect(packageJson.name).toBe('test-pkg');
      expect(packageJson.dependencies).toBeDefined();
    });

    test('should handle missing confirmedValues gracefully', async () => {
      // With dual convention support, this should work (uses defaults)
      await generator.generate({ coreInputs: { serviceType: 'generic' } });
      
      const packageJsonPath = path.join(tempDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
    });
  });

  describe('buildScripts()', () => {
    test('should include standard scripts', () => {
      const scripts = generator.buildScripts({ serviceType: 'generic' });

      expect(scripts).toHaveProperty('dev', 'wrangler dev');
      expect(scripts).toHaveProperty('test', 'jest');
      expect(scripts).toHaveProperty('deploy', 'clodo-service deploy');
      expect(scripts).toHaveProperty('lint', 'eslint src/ test/');
      expect(scripts).toHaveProperty('validate', 'clodo-service validate .');
    });

    test('should add static-site specific scripts', () => {
      const scripts = generator.buildScripts({ serviceType: 'static-site' });

      expect(scripts).toHaveProperty('build:assets');
      expect(scripts).toHaveProperty('preview', 'wrangler dev --local');
    });

    test('should not add static scripts for other service types', () => {
      const scripts = generator.buildScripts({ serviceType: 'data' });

      expect(scripts).not.toHaveProperty('build:assets');
      expect(scripts).not.toHaveProperty('preview');
    });
  });

  describe('buildDependencies()', () => {
    test('should include core dependencies for all types (including uuid)', () => {
      const deps = generator.buildDependencies({ serviceType: 'generic' });

      expect(deps).toHaveProperty('@tamyla/clodo-framework');
      expect(deps).toHaveProperty('wrangler');
      expect(deps).toHaveProperty('uuid'); // Always included (matches original GenerationEngine)
    });

    test('should add uuid and bcrypt for auth service', () => {
      const deps = generator.buildDependencies({ serviceType: 'auth' });

      expect(deps).toHaveProperty('uuid');
      expect(deps).toHaveProperty('bcrypt');
    });

    test('should include uuid for data service', () => {
      const deps = generator.buildDependencies({ serviceType: 'data' });

      expect(deps).toHaveProperty('uuid');
      expect(deps).not.toHaveProperty('bcrypt'); // Only auth needs bcrypt
    });

    test('should include uuid for content service', () => {
      const deps = generator.buildDependencies({ serviceType: 'content' });

      expect(deps).toHaveProperty('uuid');
    });

    test('should add uuid and mime-types for static-site', () => {
      const deps = generator.buildDependencies({ serviceType: 'static-site' });

      expect(deps).toHaveProperty('uuid'); // All services get uuid
      expect(deps).toHaveProperty('mime-types'); // static-site specific
    });

    test('should include uuid for api-gateway', () => {
      const deps = generator.buildDependencies({ serviceType: 'api-gateway' });

      expect(deps).toHaveProperty('uuid'); // For request tracking, correlation IDs
      expect(Object.keys(deps)).toHaveLength(3); // clodo-framework, wrangler, uuid
    });
  });

  describe('buildDevDependencies()', () => {
    test('should include standard dev dependencies', () => {
      const devDeps = generator.buildDevDependencies({ serviceType: 'generic' });

      expect(devDeps).toHaveProperty('@types/jest');
      expect(devDeps).toHaveProperty('@types/node');
      expect(devDeps).toHaveProperty('eslint');
      expect(devDeps).toHaveProperty('jest');
      expect(devDeps).toHaveProperty('prettier');
      expect(devDeps).toHaveProperty('rimraf');
    });

    test('should add mime-types types for static-site', () => {
      const devDeps = generator.buildDevDependencies({ serviceType: 'static-site' });

      expect(devDeps).toHaveProperty('@types/mime-types');
    });

    test('should not add mime-types types for other services', () => {
      const devDeps = generator.buildDevDependencies({ serviceType: 'data' });

      expect(devDeps).not.toHaveProperty('@types/mime-types');
    });
  });

  describe('buildRepository()', () => {
    test('should create repository object if URL provided', () => {
      const repo = generator.buildRepository({
        gitRepositoryUrl: 'https://github.com/test/repo'
      });

      expect(repo).toEqual({
        type: 'git',
        url: 'https://github.com/test/repo'
      });
    });

    test('should return undefined if no URL provided', () => {
      const repo = generator.buildRepository({});
      expect(repo).toBeUndefined();
    });
  });

  describe('buildKeywords()', () => {
    test('should include standard keywords', () => {
      const keywords = generator.buildKeywords(
        { serviceType: 'data' },
        {}
      );

      expect(keywords).toContain('clodo-framework');
      expect(keywords).toContain('data');
      expect(keywords).toContain('cloudflare');
      expect(keywords).toContain('serverless');
      // Note: 'workers' removed to match original GenerationEngine
      expect(keywords.length).toBe(4);
    });

    test('should include custom keywords if provided', () => {
      const keywords = generator.buildKeywords(
        { serviceType: 'auth' },
        { keywords: ['authentication', 'jwt', 'oauth'] }
      );

      expect(keywords).toContain('authentication');
      expect(keywords).toContain('jwt');
      expect(keywords).toContain('oauth');
    });

    test('should handle empty custom keywords', () => {
      const keywords = generator.buildKeywords(
        { serviceType: 'generic' },
        { keywords: [] }
      );

      expect(keywords.length).toBe(4); // Just standard keywords (no 'workers')
    });
  });

  describe('shouldGenerate()', () => {
    test('should always return true', () => {
      expect(generator.shouldGenerate({})).toBe(true);
      expect(generator.shouldGenerate({ coreInputs: { serviceType: 'data' } })).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should generate complete package.json for auth service', async () => {
      const context = {
        coreInputs: {
          serviceType: 'auth'
        },
        confirmedValues: {
          packageName: 'auth-service',
          version: '2.0.0',
          description: 'Authentication service',
          author: 'Clodo Team',
          license: 'Apache-2.0',
          gitRepositoryUrl: 'https://github.com/clodo/auth-service',
          keywords: ['jwt', 'oauth']
        }
      };

      await generator.generate(context);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      // Verify structure
      expect(packageJson.name).toBe('auth-service');
      expect(packageJson.version).toBe('2.0.0');
      expect(packageJson.license).toBe('Apache-2.0');
      expect(packageJson.type).toBe('module');
      expect(packageJson.engines.node).toBe('>=18.0.0');

      // Verify auth-specific dependencies
      expect(packageJson.dependencies.uuid).toBeDefined();
      expect(packageJson.dependencies.bcrypt).toBeDefined();

      // Verify scripts
      expect(packageJson.scripts.test).toBe('jest');
      expect(packageJson.scripts.deploy).toBe('clodo-service deploy');

      // Verify repository
      expect(packageJson.repository.url).toBe('https://github.com/clodo/auth-service');

      // Verify keywords
      expect(packageJson.keywords).toContain('auth');
      expect(packageJson.keywords).toContain('jwt');
      expect(packageJson.keywords).toContain('oauth');
    });

    test('should generate complete package.json for static-site', async () => {
      const context = {
        coreInputs: {
          serviceType: 'static-site'
        },
        confirmedValues: {
          packageName: 'my-static-site',
          version: '1.0.0',
          description: 'Static website'
        }
      };

      await generator.generate(context);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      // Verify static-site specific features
      expect(packageJson.dependencies['mime-types']).toBeDefined();
      expect(packageJson.devDependencies['@types/mime-types']).toBeDefined();
      expect(packageJson.scripts['build:assets']).toBeDefined();
      expect(packageJson.scripts.preview).toBe('wrangler dev --local');
    });

    test('should handle minimal input gracefully', async () => {
      const context = {
        coreInputs: {
          serviceType: 'generic'
        },
        confirmedValues: {
          packageName: 'minimal-service'
        }
      };

      await generator.generate(context);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      // Should have defaults
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.description).toContain('Clodo Framework');
      expect(packageJson.license).toBe('MIT');
      expect(packageJson.author).toBeUndefined(); // Match original - can be undefined
      expect(packageJson.repository).toBeUndefined();
    });
  });
});
