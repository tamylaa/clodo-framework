/**
 * Clodo Framework - Service Creator
 * Programmatic API for creating services from templates
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { FrameworkConfig } from '../utils/framework-config.js';

const SERVICE_TYPES = ['data-service', 'auth-service', 'content-service', 'api-gateway', 'generic'];

export class ServiceCreator {
  constructor(options = {}) {
    const templatesDir = (() => {
      try {
        return join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');
      } catch (error) {
        // Fallback for test environments - use current working directory
        return join(process.cwd(), 'templates');
      }
    })();
    
    this.templatesDir = options.templatesDir || templatesDir;
    this.serviceTypes = options.serviceTypes || SERVICE_TYPES;
    
    // Load framework configuration
    this.frameworkConfig = options.frameworkConfig || new FrameworkConfig();
  }

  /**
   * Validate service name according to framework conventions
   * @param {string} name - Service name to validate
   * @throws {Error} If validation fails
   */
  validateServiceName(name) {
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error('Service name must contain only lowercase letters, numbers, and hyphens');
    }

    if (name.length < 3) {
      throw new Error('Service name must be at least 3 characters long');
    }

    if (name.length > 50) {
      throw new Error('Service name must be no more than 50 characters long');
    }
  }

  /**
   * Validate service type
   * @param {string} type - Service type to validate
   * @throws {Error} If type is invalid
   */
  validateServiceType(type) {
    if (!this.serviceTypes.includes(type)) {
      throw new Error(`Invalid service type. Must be one of: ${this.serviceTypes.join(', ')}`);
    }
  }

  /**
   * Create a service from a template
   * @param {string} serviceName - Name of the service to create
   * @param {Object} options - Creation options
   * @param {string} options.type - Service type (default: 'generic')
   * @param {string} options.output - Output directory (default: current directory)
   * @param {boolean} options.force - Overwrite existing directory (default: false)
   * @param {Object} options.variables - Additional template variables
   * @returns {Object} Creation result with success status and metadata
   */
  async createService(serviceName, options = {}) {
    const config = {
      type: 'generic',
      output: process.cwd(),
      force: false,
      variables: {},
      ...options
    };

    try {
      // Validate inputs
      this.validateServiceName(serviceName);
      this.validateServiceType(config.type);

      const templateDir = join(this.templatesDir, config.type);
      const serviceDir = join(config.output, serviceName);

      // Check if template exists, fall back to generic if not
      let actualTemplateDir = templateDir;
      if (!existsSync(templateDir)) {
        const genericTemplate = join(this.templatesDir, 'generic');
        if (existsSync(genericTemplate)) {
          console.log(`⚠️  Template for '${config.type}' not found, using 'generic' template as fallback`);
          actualTemplateDir = genericTemplate;
        } else {
          throw new Error(`Template not found: ${templateDir}. Available templates: ${this.serviceTypes.join(', ')}`);
        }
      }

      // Check if service directory already exists
      if (existsSync(serviceDir) && !config.force) {
        throw new Error(`Service directory already exists: ${serviceDir}. Use force option to overwrite.`);
      }

      // Copy template to service directory
      cpSync(actualTemplateDir, serviceDir, { recursive: true });

      // Load template defaults from config
      const templateDefaults = this.frameworkConfig.config?.templates?.defaults || {};
      
      // Prepare template variables
      const defaultVariables = {
        '{{SERVICE_NAME}}': serviceName,
        '{{SERVICE_TYPE}}': config.type,
        '{{SERVICE_DISPLAY_NAME}}': this.toTitleCase(serviceName.replace(/-/g, ' ')),
        '{{DOMAIN_NAME}}': config.domain || templateDefaults.DOMAIN_NAME || 'example.com',
        '{{WORKERS_DEV_DOMAIN}}': templateDefaults.WORKERS_DEV_DOMAIN || 'workers.dev',
        '{{CURRENT_DATE}}': new Date().toISOString().split('T')[0],
        '{{CURRENT_YEAR}}': new Date().getFullYear().toString(),
        '{{FRAMEWORK_VERSION}}': this.getFrameworkVersion()
      };

      const allVariables = { ...defaultVariables, ...config.variables };

      // Replace template variables
      this.replaceTemplateVariables(serviceDir, allVariables);

      return {
        success: true,
        serviceName,
        serviceType: config.type,
        serviceDir,
        templateDir,
        variables: allVariables
      };

    } catch (error) {
      return {
        success: false,
        serviceName,
        error: error.message
      };
    }
  }

  /**
   * Replace template variables in all files within a directory
   * @param {string} dir - Directory to process
   * @param {Object} variables - Variable mappings
   */
  replaceTemplateVariables(dir, variables) {
    const files = this.getAllFiles(dir);

    for (const file of files) {
      try {
        let content = readFileSync(file, 'utf8');
        let modified = false;

        for (const [placeholder, value] of Object.entries(variables)) {
          if (content.includes(placeholder)) {
            content = content.replace(new RegExp(this.escapeRegExp(placeholder), 'g'), value);
            modified = true;
          }
        }

        if (modified) {
          writeFileSync(file, content, 'utf8');
        }
      } catch (error) {
        // Skip binary files or files that can't be read
        if (error.code !== 'EISDIR') {
          // In programmatic usage, we might want to collect warnings
          // For now, we'll silently skip problematic files
        }
      }
    }
  }

  /**
   * Get all files in a directory recursively
   * @param {string} dir - Directory to traverse
   * @returns {string[]} Array of file paths
   */
  getAllFiles(dir) {
    const files = [];

    function traverse(currentDir) {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other unwanted directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
            traverse(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    }

    traverse(dir);
    return files;
  }

  /**
   * Escape special regex characters
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string} Title case string
   */
  toTitleCase(str) {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get framework version from package.json
   * @returns {string} Framework version
   */
  getFrameworkVersion() {
    try {
      const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
      return packageJson.version;
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Get available service types
   * @returns {string[]} Array of available service types
   */
  getServiceTypes() {
    return [...this.serviceTypes];
  }

  /**
   * Check if a service type is available
   * @param {string} type - Service type to check
   * @returns {boolean} True if type is available
   */
  isServiceTypeAvailable(type) {
    return this.serviceTypes.includes(type);
  }
}

// Convenience function for quick service creation
export async function createService(serviceName, options = {}) {
  const creator = new ServiceCreator();
  return await creator.createService(serviceName, options);
}