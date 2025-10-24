/**
 * Tests for StaticSiteGenerator
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { StaticSiteGenerator } from '../../../src/service-management/generators/service-types/StaticSiteGenerator.js';
import { BaseGenerator } from '../../../src/service-management/generators/BaseGenerator.js';

describe('StaticSiteGenerator', () => {
  let generator;
  let mockContext;

  beforeEach(() => {
    generator = new StaticSiteGenerator({
      templatesDir: 'templates/static-site'
    });

    mockContext = {
      coreInputs: {
        serviceType: 'static-site',
        serviceName: 'test-site',
        domain: 'test.example.com'
      },
      confirmedValues: {
        staticSite: {
          buildCommand: 'npm run build',
          buildOutputDir: 'dist',
          spaFallback: true
        }
      },
      servicePath: '/path/to/service'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(generator).toBeInstanceOf(StaticSiteGenerator);
      expect(generator).toBeInstanceOf(BaseGenerator);
      expect(generator.templatesPath).toBe('templates/static-site');
      expect(generator.serviceType).toBe('static-site');
    });

    test('should handle missing options', () => {
      const gen = new StaticSiteGenerator();
      expect(gen.templatesPath).toBeNull();
    });
  });

  describe('generate()', () => {
    test('should generate static site files', async () => {
      generator.loadTemplate = jest.fn().mockResolvedValue('template');
      generator.renderTemplate = jest.fn().mockReturnValue('rendered');
      const writeFileSpy = jest.spyOn(generator, 'writeFile').mockResolvedValue();

      await generator.generate(mockContext);

      expect(generator.loadTemplate).toHaveBeenCalledWith('src/worker/index.js');
      expect(generator.renderTemplate).toHaveBeenCalledWith('template', expect.any(Object));
      expect(writeFileSpy).toHaveBeenCalledWith('src/worker/index.js', 'rendered');

      writeFileSpy.mockRestore();
    });

    test('should skip generation for non-static-site services', async () => {
      const nonStaticContext = {
        ...mockContext,
        coreInputs: { serviceType: 'api-gateway' }
      };

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      await generator.generate(nonStaticContext);

      expect(consoleSpy).toHaveBeenCalledWith('[StaticSiteGenerator] Skipping static-site generation - service type is not static-site');

      consoleSpy.mockRestore();
    });
  });

  describe('generateHandlers()', () => {
    test('should generate handler files', async () => {
      const writeFileSpy = jest.spyOn(generator, 'writeFile').mockResolvedValue();

      await generator.generateHandlers(mockContext);

      expect(writeFileSpy).toHaveBeenCalledWith('src/worker/index.js', expect.any(String));
      expect(writeFileSpy).toHaveBeenCalledWith('src/config/domains.js', expect.any(String));

      writeFileSpy.mockRestore();
    });
  });

  describe('generateSchemas()', () => {
    test('should generate schema files', async () => {
      const writeFileSpy = jest.spyOn(generator, 'writeFile').mockResolvedValue();

      await generator.generateSchemas(mockContext);

      expect(writeFileSpy).toHaveBeenCalledWith('static-site-schema.json', expect.any(String));

      writeFileSpy.mockRestore();
    });
  });

  describe('generateMiddleware()', () => {
    test('should generate middleware files', async () => {
      const writeFileSpy = jest.spyOn(generator, 'writeFile').mockResolvedValue();

      await generator.generateMiddleware(mockContext);

      expect(writeFileSpy).toHaveBeenCalledWith('src/middleware/StaticSiteMiddleware.js', expect.any(String));

      writeFileSpy.mockRestore();
    });
  });

  describe('generateDocs()', () => {
    test('should generate documentation files', async () => {
      const writeFileSpy = jest.spyOn(generator, 'writeFile').mockResolvedValue();

      await generator.generateDocs(mockContext);

      expect(writeFileSpy).toHaveBeenCalledWith('README.md', expect.any(String));

      writeFileSpy.mockRestore();
    });
  });

  describe('Validation', () => {
    test('should validate static site configuration', () => {
      const validConfig = {
        serviceType: 'static-site',
        buildCommand: 'npm run build',
        buildOutputDir: 'dist',
        spaFallback: true
      };

      expect(() => generator.validateConfig(validConfig)).not.toThrow();
    });

    test('should throw on invalid configuration', () => {
      const invalidConfig = {
        buildCommand: null,
        buildOutputDir: '',
        spaFallback: 'invalid'
      };

      expect(() => generator.validateConfig(invalidConfig)).toThrow();
    });
  });

  describe('Context Handling', () => {
    test('should extract context correctly', () => {
      const extracted = generator.extractContext(mockContext);

      expect(extracted.coreInputs).toBe(mockContext.coreInputs);
      expect(extracted.confirmedValues).toBe(mockContext.confirmedValues);
      expect(extracted.servicePath).toBe(mockContext.servicePath);
    });

    test('should handle missing confirmedValues', () => {
      const contextWithoutConfirmed = {
        coreInputs: mockContext.coreInputs,
        servicePath: mockContext.servicePath
      };

      const extracted = generator.extractContext(contextWithoutConfirmed);

      expect(extracted.confirmedValues).toEqual({});
    });
  });

  describe('File Structure', () => {
    test('should generate correct file structure', async () => {
      generator.loadTemplate = jest.fn().mockResolvedValue('template');
      generator.renderTemplate = jest.fn().mockReturnValue('rendered');
      const writeFileSpy = jest.spyOn(generator, 'writeFile').mockResolvedValue();

      await generator.generate(mockContext);

      // Check that all expected files are generated
      expect(writeFileSpy).toHaveBeenCalledWith('src/worker/index.js', 'rendered');
      expect(writeFileSpy).toHaveBeenCalledWith('src/config/domains.js', 'rendered');
      expect(writeFileSpy).toHaveBeenCalledWith('static-site-schema.json', expect.any(String));
      expect(writeFileSpy).toHaveBeenCalledWith('src/middleware/StaticSiteMiddleware.js', expect.any(String));
      expect(writeFileSpy).toHaveBeenCalledWith('README.md', 'rendered');

      writeFileSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid context gracefully', async () => {
      const invalidContext = { coreInputs: null };

      // Should not throw, just skip generation
      await expect(generator.generate(invalidContext)).resolves.not.toThrow();
    });

    test('should log appropriate messages', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      const nonStaticContext = {
        ...mockContext,
        coreInputs: { serviceType: 'api-gateway' }
      };

      generator.setContext(nonStaticContext);

      await generator.generate(nonStaticContext);

      expect(consoleSpy).toHaveBeenCalledWith('[StaticSiteGenerator] Skipping static-site generation - service type is not static-site');

      consoleSpy.mockRestore();
    });
  });
});
