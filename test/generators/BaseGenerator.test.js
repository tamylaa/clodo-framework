/**
 * Tests for BaseGenerator abstract class
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BaseGenerator } from '../../src/service-management/generators/BaseGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Concrete implementation for testing
class TestGenerator extends BaseGenerator {
  async generate(context) {
    this.setContext(context);
    return 'Generated!';
  }
}

describe('BaseGenerator', () => {
  let tempDir;
  let templatesDir;
  let generator;

  beforeEach(async () => {
    // Create temp directories for testing
    tempDir = path.join(__dirname, '..', '..', 'tmp', `test-${Date.now()}`);
    templatesDir = path.join(tempDir, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });

    generator = new TestGenerator({
      name: 'TestGenerator',
      templatesPath: templatesDir,
      servicePath: tempDir
    });
  });

  afterEach(async () => {
    // Cleanup temp directory with retry logic
    if (tempDir) {
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
          break;
        } catch (error) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }
  });

  describe('Constructor', () => {
    test('should create instance with options', () => {
      expect(generator.name).toBe('TestGenerator');
      expect(generator.templatesPath).toBe(templatesDir);
      expect(generator.servicePath).toBe(tempDir);
      expect(generator.context).toEqual({});
    });

    test('should use constructor name if name not provided', () => {
      const gen = new TestGenerator();
      expect(gen.name).toBe('TestGenerator');
    });

    test('should throw error when instantiating BaseGenerator directly', () => {
      expect(() => new BaseGenerator()).toThrow('BaseGenerator is abstract and cannot be instantiated directly');
    });
  });

  describe('Context Management', () => {
    test('should set and get context', () => {
      const context = { serviceName: 'my-service', config: { port: 8080 } };
      generator.setContext(context);

      expect(generator.getContext('serviceName')).toBe('my-service');
      expect(generator.getContext('config.port')).toBe(8080);
      expect(generator.getContext()).toEqual(context);
    });

    test('should return default value for missing keys', () => {
      generator.setContext({ foo: 'bar' });
      expect(generator.getContext('missing', 'default')).toBe('default');
      expect(generator.getContext('nested.missing', 'default')).toBe('default');
    });

    test('should update paths from context', () => {
      const newServicePath = '/new/service/path';
      const newTemplatesPath = '/new/templates/path';

      generator.setContext({
        servicePath: newServicePath,
        templatesPath: newTemplatesPath
      });

      expect(generator.servicePath).toBe(newServicePath);
      expect(generator.templatesPath).toBe(newTemplatesPath);
    });
  });

  describe('Template Loading', () => {
    test('should load template file', async () => {
      const templatePath = path.join(templatesDir, 'test.txt');
      await fs.writeFile(templatePath, 'Hello {{name}}!', 'utf8');

      const content = await generator.loadTemplate('test.txt');
      expect(content).toBe('Hello {{name}}!');
    });

    test('should throw error if templatesPath not set', async () => {
      const gen = new TestGenerator();
      await expect(gen.loadTemplate('test.txt')).rejects.toThrow('templatesPath not set');
    });

    test('should throw error if template file not found', async () => {
      await expect(generator.loadTemplate('missing.txt')).rejects.toThrow(/Failed to load template/);
    });
  });

  describe('Template Rendering', () => {
    test('should replace simple placeholders', () => {
      const template = 'Hello {{name}}!';
      const result = generator.renderTemplate(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    test('should replace multiple placeholders', () => {
      const template = '{{greeting}} {{name}}, you are {{age}} years old.';
      const result = generator.renderTemplate(template, {
        greeting: 'Hello',
        name: 'Alice',
        age: 30
      });
      expect(result).toBe('Hello Alice, you are 30 years old.');
    });

    test('should handle dot notation for nested values', () => {
      generator.setContext({
        config: {
          server: {
            host: 'localhost',
            port: 8080
          }
        }
      });

      const template = 'Server: {{config.server.host}}:{{config.server.port}}';
      const result = generator.renderTemplate(template);
      expect(result).toBe('Server: localhost:8080');
    });

    test('should prioritize provided variables over context', () => {
      generator.setContext({ name: 'Context' });
      const template = 'Hello {{name}}!';
      const result = generator.renderTemplate(template, { name: 'Variable' });
      expect(result).toBe('Hello Variable!');
    });

    test('should keep placeholder if variable is undefined', () => {
      const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
      const gen = new TestGenerator({ logger: mockLogger });
      
      const template = 'Hello {{missing}}!';
      const result = gen.renderTemplate(template, {});
      
      expect(result).toBe('Hello {{missing}}!');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("'missing' is undefined"));
    });

    test('should convert values to strings', () => {
      const template = 'Count: {{count}}, Active: {{active}}';
      const result = generator.renderTemplate(template, {
        count: 42,
        active: true
      });
      expect(result).toBe('Count: 42, Active: true');
    });

    test('should throw error if template is not a string', () => {
      expect(() => generator.renderTemplate(null, {})).toThrow('Template must be a string');
      expect(() => generator.renderTemplate(123, {})).toThrow('Template must be a string');
    });

    test('should handle whitespace in placeholders', () => {
      const template = 'Hello {{ name }}!';
      const result = generator.renderTemplate(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });
  });

  describe('File Writing', () => {
    test('should write file to service directory', async () => {
      await generator.writeFile('test.txt', 'Hello World!');
      
      const filePath = path.join(tempDir, 'test.txt');
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('Hello World!');
    });

    test('should create parent directories', async () => {
      await generator.writeFile('nested/deep/test.txt', 'Hello!');
      
      const filePath = path.join(tempDir, 'nested', 'deep', 'test.txt');
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('Hello!');
    });

    test('should overwrite existing files by default', async () => {
      const filePath = 'test.txt';
      await generator.writeFile(filePath, 'First');
      await generator.writeFile(filePath, 'Second');
      
      const content = await fs.readFile(path.join(tempDir, filePath), 'utf8');
      expect(content).toBe('Second');
    });

    test('should skip existing files if overwrite is false', async () => {
      const filePath = 'test.txt';
      await generator.writeFile(filePath, 'First');
      await generator.writeFile(filePath, 'Second', { overwrite: false });
      
      const content = await fs.readFile(path.join(tempDir, filePath), 'utf8');
      expect(content).toBe('First'); // Should not be overwritten
    });

    test('should throw error if servicePath not set', async () => {
      const gen = new TestGenerator();
      await expect(gen.writeFile('test.txt', 'content')).rejects.toThrow('servicePath not set');
    });
  });

  describe('Abstract Methods', () => {
    test('should throw error if generate() not implemented', async () => {
      class AbstractGenerator extends BaseGenerator {}
      const gen = new AbstractGenerator();
      
      await expect(gen.generate({})).rejects.toThrow('generate() must be implemented');
    });
  });

  describe('Conditional Generation', () => {
    test('should return true by default for shouldGenerate()', () => {
      expect(generator.shouldGenerate({})).toBe(true);
    });

    test('should allow override of shouldGenerate()', () => {
      class ConditionalGenerator extends BaseGenerator {
        async generate() { return 'Generated'; }
        
        shouldGenerate(context) {
          return context.enabled === true;
        }
      }

      const gen = new ConditionalGenerator();
      expect(gen.shouldGenerate({ enabled: true })).toBe(true);
      expect(gen.shouldGenerate({ enabled: false })).toBe(false);
    });
  });

  describe('Logging', () => {
    test('should log messages with generator name', () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      const gen = new TestGenerator({ name: 'MyGen', logger: mockLogger });
      
      gen.log('Info message');
      gen.warn('Warning message');
      gen.error('Error message');

      expect(mockLogger.info).toHaveBeenCalledWith('[MyGen] Info message');
      expect(mockLogger.warn).toHaveBeenCalledWith('[MyGen] Warning message');
      expect(mockLogger.error).toHaveBeenCalledWith('[MyGen] Error message');
    });
  });

  describe('Integration', () => {
    test('should complete full generation workflow', async () => {
      // Create a template file
      await fs.writeFile(
        path.join(templatesDir, 'config.json'),
        JSON.stringify({ name: '{{serviceName}}', port: '{{port}}' }, null, 2),
        'utf8'
      );

      // Create a generator that uses template
      class ConfigGenerator extends BaseGenerator {
        async generate(context) {
          this.setContext(context);
          const template = await this.loadTemplate('config.json');
          const content = this.renderTemplate(template);
          await this.writeFile('config.json', content);
        }
      }

      const gen = new ConfigGenerator({
        templatesPath: templatesDir,
        servicePath: tempDir
      });

      // Generate
      await gen.generate({ serviceName: 'my-app', port: 3000 });

      // Verify output
      const outputPath = path.join(tempDir, 'config.json');
      const output = await fs.readFile(outputPath, 'utf8');
      const config = JSON.parse(output);

      expect(config.name).toBe('my-app');
      expect(config.port).toBe('3000'); // Note: rendered as string
    });
  });
});
