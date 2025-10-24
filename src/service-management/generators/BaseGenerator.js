/**
 * BaseGenerator - Abstract base class for all file generators
 * 
 * Provides common functionality for loading templates, rendering content,
 * and writing files. All concrete generators should extend this class.
 * 
 * @abstract
 */
import { promises as fs } from 'fs';
import * as path from 'path';

export class BaseGenerator {
  /**
   * Create a new generator instance
   * @param {Object} options - Generator configuration options
   * @param {string} options.name - Generator name (for logging/debugging)
   * @param {string} options.templatesPath - Path to templates directory
   * @param {string} options.servicePath - Path to service being generated
   */
  constructor(options = {}) {
    if (new.target === BaseGenerator) {
      throw new Error('BaseGenerator is abstract and cannot be instantiated directly');
    }

    this.name = options.name || this.constructor.name;
    this.templatesPath = options.templatesPath || options.templatesDir || null;
    this.servicePath = options.servicePath || null;
    this.context = {};
    this.logger = options.logger || console;
  }

  /**
   * Main generation method - must be implemented by concrete generators
   * @abstract
   * @param {Object} context - Generation context with service configuration
   * @returns {Promise<void>}
   */
  async generate(context) {
    throw new Error(`generate() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Determine if this generator should run for the given context
   * Override this to conditionally skip generation
   * @param {Object} context - Generation context
   * @returns {boolean} - True if generator should run
   */
  shouldGenerate(context) {
    return true;
  }

  /**
   * Set the generation context
   * @param {Object} context - Generation context with service configuration
   */
  setContext(context) {
    this.context = { ...context };
    
    // Update paths if provided in context
    if (context.servicePath) {
      this.servicePath = context.servicePath;
    }
    if (context.templatesPath) {
      this.templatesPath = context.templatesPath;
    }
  }

  /**
   * Extract and normalize context into consistent format
   * @param {Object} context - Generation context
   * @returns {Object} - Normalized context with coreInputs, confirmedValues, servicePath
   */
  extractContext(context) {
    return {
      coreInputs: context.coreInputs || {},
      confirmedValues: context.confirmedValues || {},
      servicePath: context.servicePath || this.servicePath || this.outputDir
    };
  }

  /**
   * Get a value from the context
   * @param {string} key - Context key (supports dot notation: 'config.name')
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} - Context value or default
   */
  getContext(key, defaultValue = undefined) {
    if (!key) return this.context;

    const keys = key.split('.');
    let value = this.context;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Load a template file from the templates directory
   * Subclasses can override this to implement custom template loading
   * @param {string} templateName - Template filename or path relative to templatesPath
   * @returns {Promise<string>} - Template content
   */
  async loadTemplate(templateName) {
    if (!this.templatesPath) {
      throw new Error(`templatesPath not set for ${this.name}`);
    }

    const templatePath = path.join(this.templatesPath, templateName);
    
    try {
      const content = await fs.readFile(templatePath, 'utf8');
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load template '${templateName}' from '${templatePath}': ${errorMessage}`);
    }
  }

  /**
   * Render a template with variables
   * Replaces {{variable}} placeholders with values from the variables object
   * @param {string} template - Template string with {{placeholders}}
   * @param {Object} variables - Variable values to replace
   * @returns {string} - Rendered template
   */
  renderTemplate(template, variables = {}) {
    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }

    // Merge context with provided variables (variables take precedence)
    const mergedVars = { ...this.context, ...variables };

    // Replace {{variable}} placeholders
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      
      // Check provided variables first (priority), then context
      let value;
      if (trimmedKey in variables) {
        value = variables[trimmedKey];
      } else {
        // Support dot notation for context: {{config.name}}
        value = this.getContext(trimmedKey);
      }
      
      if (value === undefined || value === null) {
        this.logger.warn(`Template variable '${trimmedKey}' is undefined in ${this.name}`);
        return match; // Keep placeholder if variable not found
      }
      
      return String(value);
    });
  }

  /**
   * Write content to a file within the service directory
   * Creates parent directories if they don't exist
   * @param {string} relativePath - Path relative to servicePath
   * @param {string} content - File content to write
   * @param {Object} options - Write options
   * @param {boolean} options.overwrite - Whether to overwrite existing files (default: true)
   * @returns {Promise<void>}
   */
  async writeFile(relativePath, content, options = {}) {
    if (!this.servicePath) {
      throw new Error(`servicePath not set for ${this.name}`);
    }
    
    const fullPath = path.join(this.servicePath, relativePath);
    const overwrite = options.overwrite !== false; // Default to true

    // Check if file exists and overwrite is disabled
    try {
      await fs.access(fullPath);
      if (!overwrite) {
        this.logger.info(`Skipping existing file: ${relativePath}`);
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    // Ensure parent directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    try {
      await fs.writeFile(fullPath, content, 'utf8');
      this.logger.info(`Generated: ${relativePath}`);
    } catch (error) {
      throw new Error(`Failed to write file '${relativePath}': ${error.message}`);
    }
  }

  /**
   * Log a message at info level
   * @param {string} message - Message to log
   */
  log(message) {
    this.logger.info(`[${this.name}] ${message}`);
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    this.logger.warn(`[${this.name}] ${message}`);
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   */
  error(message) {
    this.logger.error(`[${this.name}] ${message}`);
  }
}

export default BaseGenerator;
