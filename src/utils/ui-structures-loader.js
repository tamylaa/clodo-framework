/**
 * UI Structures Loader
 *
 * Loads and provides access to UI templates from ui-structures directory
 * These templates define the interactive data collection workflows
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class UIStructuresLoader {
  constructor() {
    this.templates = new Map();
    this.loaded = false;
  }

  /**
   * Load all UI structure templates
   */
  async loadTemplates() {
    if (this.loaded) return;

    const uiStructuresDir = path.join(__dirname, '..', '..', 'ui-structures');

    // Load creation templates
    const creationDir = path.join(uiStructuresDir, 'creation');
    if (fs.existsSync(creationDir)) {
      const creationFiles = fs.readdirSync(creationDir).filter(f => f.endsWith('.json'));
      for (const file of creationFiles) {
        const filePath = path.join(creationDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const template = JSON.parse(content);
        this.templates.set(template.template.name, template);
      }
    }

    // Load reference templates
    const referenceDir = path.join(uiStructuresDir, 'reference');
    if (fs.existsSync(referenceDir)) {
      const referenceFiles = fs.readdirSync(referenceDir).filter(f => f.endsWith('.json'));
      for (const file of referenceFiles) {
        const filePath = path.join(referenceDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const template = JSON.parse(content);
        // Use template.name if available, otherwise filename
        const name = template.template?.name || path.basename(file, '.json');
        this.templates.set(name, template);
      }
    }

    this.loaded = true;
  }

  /**
   * Get a specific template by name
   */
  getTemplate(name) {
    return this.templates.get(name);
  }

  /**
   * Get all templates
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category) {
    return Array.from(this.templates.values()).filter(template =>
      template.template?.category === category
    );
  }

  /**
   * Get core inputs UI template
   */
  getCoreInputsTemplate() {
    return this.getTemplate('core-inputs-ui');
  }

  /**
   * Get smart confirmable UI template
   */
  getSmartConfirmableTemplate() {
    return this.getTemplate('smart-confirmable-ui');
  }

  /**
   * Get automated generation UI template
   */
  getAutomatedGenerationTemplate() {
    return this.getTemplate('automated-generation-ui');
  }

  /**
   * Get service manifest template
   */
  getServiceManifestTemplate() {
    return this.getTemplate('service-manifest');
  }

  /**
   * Get absolutely required inputs reference
   */
  getAbsolutelyRequiredInputs() {
    return this.getTemplate('absolutely-required-inputs');
  }
}

// Export singleton instance
export const uiStructuresLoader = new UIStructuresLoader();
export default uiStructuresLoader;