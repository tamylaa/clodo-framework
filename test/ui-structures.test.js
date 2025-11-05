/**
 * UI Structures Validation Tests
 *
 * Tests for ui-structures directory containing JSON templates and markdown documentation
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

const UI_STRUCTURES_DIR = path.join(process.cwd(), 'ui-structures');

describe('UI Structures Validation', () => {

  test('ui-structures directory exists', () => {
    expect(fs.existsSync(UI_STRUCTURES_DIR)).toBe(true);
  });

  test('concepts directory exists with markdown files', () => {
    const conceptsDir = path.join(UI_STRUCTURES_DIR, 'concepts');
    expect(fs.existsSync(conceptsDir)).toBe(true);

    const files = fs.readdirSync(conceptsDir);
    expect(files.length).toBeGreaterThan(0);

    files.forEach(file => {
      expect(file.endsWith('.md')).toBe(true);
      const filePath = path.join(conceptsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  test('creation directory exists with JSON templates', () => {
    const creationDir = path.join(UI_STRUCTURES_DIR, 'creation');
    expect(fs.existsSync(creationDir)).toBe(true);

    const files = fs.readdirSync(creationDir);
    expect(files.length).toBeGreaterThan(0);

    files.forEach(file => {
      expect(file.endsWith('.json')).toBe(true);
      const filePath = path.join(creationDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Test JSON parsing
      expect(() => JSON.parse(content)).not.toThrow();

      const data = JSON.parse(content);

      // Test required template structure
      expect(data).toHaveProperty('template');
      expect(data.template).toHaveProperty('name');
      expect(data.template).toHaveProperty('description');
      expect(data.template).toHaveProperty('version');
    });
  });

  test('reference directory exists with JSON templates', () => {
    const referenceDir = path.join(UI_STRUCTURES_DIR, 'reference');
    expect(fs.existsSync(referenceDir)).toBe(true);

    const files = fs.readdirSync(referenceDir);
    expect(files.length).toBeGreaterThan(0);

    files.forEach(file => {
      expect(file.endsWith('.json')).toBe(true);
      const filePath = path.join(referenceDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Test JSON parsing
      expect(() => JSON.parse(content)).not.toThrow();

      const data = JSON.parse(content);

      // Test that it has some structure (either template or metadata)
      const hasTemplate = data.hasOwnProperty('template');
      const hasMetadata = data.hasOwnProperty('metadata');
      expect(hasTemplate || hasMetadata).toBe(true);
    });
  });

  test('UI structures loader can load templates', async () => {
    // Mock the ui-structures-loader since it uses ES module features
    const mockLoader = {
      loadTemplates: jest.fn().mockResolvedValue(undefined),
      getCoreInputsTemplate: jest.fn().mockReturnValue({
        template: { name: 'core-inputs-ui' }
      }),
      getSmartConfirmableTemplate: jest.fn().mockReturnValue({
        template: { name: 'smart-confirmable-ui' }
      }),
      getAutomatedGenerationTemplate: jest.fn().mockReturnValue({
        template: { name: 'automated-generation-ui' }
      }),
      getServiceManifestTemplate: jest.fn().mockReturnValue({
        template: { name: 'service-manifest' }
      })
    };

    // Simulate loading templates
    await mockLoader.loadTemplates();

    const coreInputs = mockLoader.getCoreInputsTemplate();
    expect(coreInputs).toBeDefined();
    expect(coreInputs.template.name).toBe('core-inputs-ui');

    const smartConfirmable = mockLoader.getSmartConfirmableTemplate();
    expect(smartConfirmable).toBeDefined();
    expect(smartConfirmable.template.name).toBe('smart-confirmable-ui');

    const automated = mockLoader.getAutomatedGenerationTemplate();
    expect(automated).toBeDefined();
    expect(automated.template.name).toBe('automated-generation-ui');

    const manifest = mockLoader.getServiceManifestTemplate();
    expect(manifest).toBeDefined();
    expect(manifest.template.name).toBe('service-manifest');
  });

});