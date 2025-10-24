/**
 * TemplateEngine - Handles template loading and rendering
 * 
 * Provides centralized template management with variable replacement,
 * partial support, and future support for conditionals and loops.
 * 
 * NOTE: This class uses Node.js filesystem APIs and is designed for
 * build-time usage during service generation, not runtime in Cloudflare Workers.
 */
import { promises as fs } from 'fs';
import path from 'path';

export class TemplateEngine {
  /**
   * Create a new template engine instance
   * @param {Object} options - Configuration options
   * @param {string} options.templatesPath - Root path to templates directory
   * @param {string} options.partialsPath - Path to partials directory (optional)
   */
  constructor(options = {}) {
    this.templatesPath = options.templatesPath;
    this.partialsPath = options.partialsPath || (this.templatesPath ? path.join(this.templatesPath, 'partials') : null);
    this.cache = new Map();
    this.cacheEnabled = options.cache !== false; // Default to true
  }

  /**
   * Load a template file from the templates directory
   * @param {string} templateName - Template filename or path relative to templatesPath
   * @returns {Promise<string>} - Template content
   */
  async loadTemplate(templateName) {
    if (!this.templatesPath) {
      throw new Error('templatesPath not configured');
    }

    // Check cache first
    if (this.cacheEnabled && this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    const templatePath = path.join(this.templatesPath, templateName);

    try {
      const content = await fs.readFile(templatePath, 'utf8');
      
      // Cache the template
      if (this.cacheEnabled) {
        this.cache.set(templateName, content);
      }
      
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Template not found: ${templateName} (looked in ${templatePath})`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load template '${templateName}': ${errorMessage}`);
    }
  }

  /**
   * Load a partial template
   * @param {string} partialName - Partial filename or path relative to partialsPath
   * @returns {Promise<string>} - Partial content
   */
  async loadPartial(partialName) {
    if (!this.partialsPath) {
      throw new Error('partialsPath not configured');
    }

    const cacheKey = `partial:${partialName}`;
    
    // Check cache first
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const partialPath = path.join(this.partialsPath, partialName);

    try {
      const content = await fs.readFile(partialPath, 'utf8');
      
      // Cache the partial
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, content);
      }
      
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Partial not found: ${partialName} (looked in ${partialPath})`);
      }
      throw new Error(`Failed to load partial '${partialName}': ${error.message}`);
    }
  }

  /**
   * Render a template with variables
   * Replaces {{variable}} placeholders with values from the variables object
   * Supports dot notation: {{config.name}}
   * @param {string} template - Template string with {{placeholders}}
   * @param {Object} variables - Variable values to replace
   * @param {Object} options - Rendering options
   * @param {boolean} options.strict - Throw error on missing variables (default: false)
   * @returns {string} - Rendered template
   */
  render(template, variables = {}, options = {}) {
    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }

    const strict = options.strict === true;

    // Replace {{variable}} placeholders
    let result = template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      
      // Get value using dot notation
      const value = this.getNestedValue(variables, trimmedKey);
      
      if (value === undefined || value === null) {
        if (strict) {
          throw new Error(`Missing variable: ${trimmedKey}`);
        }
        return match; // Keep placeholder if variable not found
      }
      
      return String(value);
    });

    return result;
  }

  /**
   * Render a template with partial support
   * Replaces {{> partialName}} with the content of the partial
   * @param {string} template - Template string
   * @param {Object} variables - Variable values
   * @param {Object} options - Rendering options
   * @returns {Promise<string>} - Rendered template
   */
  async renderWithPartials(template, variables = {}, options = {}) {
    // First, replace partials
    const partialRegex = /\{\{>\s*([^}]+)\}\}/g;
    const partialMatches = [...template.matchAll(partialRegex)];

    let result = template;
    for (const match of partialMatches) {
      const partialName = match[1].trim();
      const partial = await this.loadPartial(partialName);
      result = result.replace(match[0], partial);
    }

    // Then render variables
    return this.render(result, variables, options);
  }

  /**
   * Get a nested value from an object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-notation path (e.g., 'config.server.port')
   * @returns {*} - Value or undefined
   */
  getNestedValue(obj, path) {
    if (!path) return obj;

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Clear the template cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default TemplateEngine;
