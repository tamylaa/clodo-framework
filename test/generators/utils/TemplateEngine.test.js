/**
 * Tests for TemplateEngine
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { TemplateEngine } from '../../../src/service-management/generators/utils/TemplateEngine.js';

describe('TemplateEngine', () => {
  let tempDir;
  let templatesDir;
  let partialsDir;
  let engine;

  beforeEach(async () => {
    // Create temp directories using system temp directory
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    tempDir = path.join(os.tmpdir(), `clodo-template-test-${uniqueId}`);
    templatesDir = path.join(tempDir, 'templates');
    partialsDir = path.join(tempDir, 'templates', 'partials');
    
    await fs.mkdir(partialsDir, { recursive: true });

    engine = new TemplateEngine({
      templatesPath: templatesDir,
      partialsPath: partialsDir
    });
  });

  afterEach(async () => {
    // Add delay to ensure file operations complete before cleanup
    await new Promise(resolve => setTimeout(resolve, 200));
    // Cleanup
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('Constructor', () => {
    test('should create instance with options', () => {
      expect(engine.templatesPath).toBe(templatesDir);
      expect(engine.partialsPath).toBe(partialsDir);
      expect(engine.cacheEnabled).toBe(true);
    });

    test('should disable cache if specified', () => {
      const eng = new TemplateEngine({ cache: false });
      expect(eng.cacheEnabled).toBe(false);
    });
  });

  describe('loadTemplate()', () => {
    test('should load template file', async () => {
      await fs.writeFile(path.join(templatesDir, 'test.txt'), 'Hello {{name}}!', 'utf8');
      
      const content = await engine.loadTemplate('test.txt');
      expect(content).toBe('Hello {{name}}!');
    });

    test('should throw error if templatesPath not configured', async () => {
      const eng = new TemplateEngine();
      await expect(eng.loadTemplate('test.txt')).rejects.toThrow('templatesPath not configured');
    });

    test('should throw error if template not found', async () => {
      await expect(engine.loadTemplate('missing.txt')).rejects.toThrow(/Template not found/);
    });

    test('should cache templates by default', async () => {
      await fs.writeFile(path.join(templatesDir, 'cached.txt'), 'Original', 'utf8');
      
      const first = await engine.loadTemplate('cached.txt');
      
      // Modify file on disk
      await fs.writeFile(path.join(templatesDir, 'cached.txt'), 'Modified', 'utf8');
      
      const second = await engine.loadTemplate('cached.txt');
      
      expect(first).toBe('Original');
      expect(second).toBe('Original'); // Should be cached
    });

    test('should not cache if caching disabled', async () => {
      const eng = new TemplateEngine({
        templatesPath: templatesDir,
        cache: false
      });

      await fs.writeFile(path.join(templatesDir, 'nocache.txt'), 'Original', 'utf8');
      
      const first = await eng.loadTemplate('nocache.txt');
      
      await fs.writeFile(path.join(templatesDir, 'nocache.txt'), 'Modified', 'utf8');
      
      const second = await eng.loadTemplate('nocache.txt');
      
      expect(first).toBe('Original');
      expect(second).toBe('Modified'); // Should not be cached
    });
  });

  describe('loadPartial()', () => {
    test('should load partial file', async () => {
      await fs.writeFile(path.join(partialsDir, 'header.html'), '<header>{{title}}</header>', 'utf8');
      
      const content = await engine.loadPartial('header.html');
      expect(content).toBe('<header>{{title}}</header>');
    });

    test('should throw error if partialsPath not configured', async () => {
      const eng = new TemplateEngine({ templatesPath: templatesDir });
      eng.partialsPath = null;
      
      await expect(eng.loadPartial('test.html')).rejects.toThrow('partialsPath not configured');
    });

    test('should throw error if partial not found', async () => {
      await expect(engine.loadPartial('missing.html')).rejects.toThrow(/Partial not found/);
    });

    test('should cache partials separately from templates', async () => {
      await fs.writeFile(path.join(partialsDir, 'footer.html'), '<footer>Original</footer>', 'utf8');
      
      const first = await engine.loadPartial('footer.html');
      await fs.writeFile(path.join(partialsDir, 'footer.html'), '<footer>Modified</footer>', 'utf8');
      const second = await engine.loadPartial('footer.html');
      
      expect(first).toBe('<footer>Original</footer>');
      expect(second).toBe('<footer>Original</footer>'); // Cached
    });
  });

  describe('render()', () => {
    test('should replace simple variables', () => {
      const result = engine.render('Hello {{name}}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    test('should replace multiple variables', () => {
      const result = engine.render('{{greeting}} {{name}}, you are {{age}} years old.', {
        greeting: 'Hello',
        name: 'Alice',
        age: 30
      });
      expect(result).toBe('Hello Alice, you are 30 years old.');
    });

    test('should handle dot notation', () => {
      const result = engine.render('Server: {{config.host}}:{{config.port}}', {
        config: { host: 'localhost', port: 8080 }
      });
      expect(result).toBe('Server: localhost:8080');
    });

    test('should keep placeholder if variable missing (non-strict mode)', () => {
      const result = engine.render('Hello {{missing}}!', {});
      expect(result).toBe('Hello {{missing}}!');
    });

    test('should throw error if variable missing (strict mode)', () => {
      expect(() => {
        engine.render('Hello {{missing}}!', {}, { strict: true });
      }).toThrow(/Missing variable: missing/);
    });

    test('should convert values to strings', () => {
      const result = engine.render('Count: {{count}}, Active: {{active}}', {
        count: 42,
        active: true
      });
      expect(result).toBe('Count: 42, Active: true');
    });

    test('should throw error if template is not a string', () => {
      expect(() => engine.render(null, {})).toThrow('Template must be a string');
      expect(() => engine.render(123, {})).toThrow('Template must be a string');
    });

    test('should handle whitespace in placeholders', () => {
      const result = engine.render('Hello {{ name }}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });
  });

  describe('renderWithPartials()', () => {
    test('should render template with partials', async () => {
      await fs.writeFile(path.join(partialsDir, 'greeting.txt'), 'Hello, {{name}}!', 'utf8');
      
      const template = 'Message: {{> greeting.txt}}';
      const result = await engine.renderWithPartials(template, { name: 'World' });
      
      expect(result).toBe('Message: Hello, World!');
    });

    test('should handle multiple partials', async () => {
      await fs.writeFile(path.join(partialsDir, 'header.html'), '<h1>{{title}}</h1>', 'utf8');
      await fs.writeFile(path.join(partialsDir, 'footer.html'), '<footer>©{{year}}</footer>', 'utf8');
      
      const template = '{{> header.html}}\n<body>Content</body>\n{{> footer.html}}';
      const result = await engine.renderWithPartials(template, { title: 'My Site', year: 2025 });
      
      expect(result).toBe('<h1>My Site</h1>\n<body>Content</body>\n<footer>©2025</footer>');
    });
  });

  describe('getNestedValue()', () => {
    test('should get nested value', () => {
      const obj = { config: { server: { host: 'localhost' } } };
      expect(engine.getNestedValue(obj, 'config.server.host')).toBe('localhost');
    });

    test('should return undefined for missing path', () => {
      const obj = { config: { server: {} } };
      expect(engine.getNestedValue(obj, 'config.server.port')).toBeUndefined();
    });

    test('should return object if no path provided', () => {
      const obj = { foo: 'bar' };
      expect(engine.getNestedValue(obj, '')).toBe(obj);
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', async () => {
      await fs.writeFile(path.join(templatesDir, 'cached.txt'), 'Original', 'utf8');
      
      await engine.loadTemplate('cached.txt');
      expect(engine.getCacheStats().size).toBe(1);
      
      engine.clearCache();
      expect(engine.getCacheStats().size).toBe(0);
    });

    test('should provide cache statistics', async () => {
      await fs.writeFile(path.join(templatesDir, 'test1.txt'), 'Test1', 'utf8');
      await fs.writeFile(path.join(templatesDir, 'test2.txt'), 'Test2', 'utf8');
      
      await engine.loadTemplate('test1.txt');
      await engine.loadTemplate('test2.txt');
      
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.enabled).toBe(true);
      expect(stats.keys).toContain('test1.txt');
      expect(stats.keys).toContain('test2.txt');
    });
  });
});
