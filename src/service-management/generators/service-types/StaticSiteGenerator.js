/**
 * StaticSiteGenerator - Service-type generator for static-site services
 *
 * Generates static-site specific files and configurations:
 * - Static file serving handlers
 * - Site configuration schemas
 * - Asset optimization middleware
 * - SPA fallback routing
 *
 * Extends BaseServiceTypeGenerator to provide static-site specific generation logic.
 */
import { BaseGenerator } from '../BaseGenerator.js';

export class StaticSiteGenerator extends BaseGenerator {
  /**
   * Create a new StaticSiteGenerator instance
   * @param {Object} options - Generator options
   */
  constructor(options = {}) {
    super({
      name: 'StaticSiteGenerator',
      ...options
    });
    this.serviceType = 'static-site';
  }

  /**
   * Main generation method for static-site services
   * Generates all static-site specific files and configurations
   *
   * @param {Object} context - Generation context
   * @param {Object} context.coreInputs - Core service inputs
   * @param {Object} context.confirmedValues - Confirmed configuration values
   * @param {string} context.servicePath - Path to generate service in
   * @returns {Promise<void>}
   */
  async generate(context) {
    this.setContext(context);
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);

    // Validate service type
    if (coreInputs.serviceType !== 'static-site') {
      this.log('Skipping static-site generation - service type is not static-site');
      return;
    }

    this.log('Generating static-site service files...');

    // Generate static-site specific handlers
    await this.generateHandlers(context);

    // Generate configuration schemas
    await this.generateSchemas(context);

    // Generate middleware
    await this.generateMiddleware(context);

    // Generate documentation
    await this.generateDocs(context);

    this.log('Static-site service generation complete');
  }

  /**
   * Generate static-site specific request handlers
   * Creates handlers for static file serving, SPA routing, and health checks
   *
   * @param {Object} context - Generation context
   * @returns {Promise<void>}
   */
  async generateHandlers(context) {
    const { coreInputs, confirmedValues } = this.extractContext(context);

    // Load the base worker template
    const workerTemplate = await this.loadTemplate('src/worker/index.js');

    // Prepare template variables
    const templateVars = {
      SERVICE_NAME: coreInputs.serviceName || 'static-site',
      SERVICE_DISPLAY_NAME: confirmedValues.displayName || coreInputs.serviceName || 'Static Site',
      SERVICE_TYPE: 'static-site',
      DOMAIN_NAME: coreInputs.domainName || 'example.com',
      CURRENT_DATE: new Date().toISOString().split('T')[0],
      ENVIRONMENT: context.environment || 'development'
    };

    // Render the worker
    const workerContent = this.renderTemplate(workerTemplate, templateVars);
    await this.writeFile('src/worker/index.js', workerContent);

    // Generate domain configuration
    const domainTemplate = await this.loadTemplate('src/config/domains.js');
    const domainContent = this.renderTemplate(domainTemplate, templateVars);
    await this.writeFile('src/config/domains.js', domainContent);

    this.log('Generated static-site handlers and configuration');
  }

  /**
   * Generate static-site specific configuration schemas
   * Creates validation schemas for static-site configuration
   *
   * @param {Object} context - Generation context
   * @returns {Promise<void>}
   */
  async generateSchemas(context) {
    const { coreInputs } = this.extractContext(context);

    // Create a basic schema for static-site configuration validation
    const schemaContent = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Static Site Configuration Schema",
      description: "Configuration schema for static-site services",

      type: "object",
      properties: {
        serviceType: {
          type: "string",
          enum: ["static-site"],
          description: "Must be 'static-site' for this schema"
        },
        publicDir: {
          type: "string",
          default: "public",
          description: "Directory containing static files"
        },
        indexFile: {
          type: "string",
          default: "index.html",
          description: "Default index file for directory requests"
        },
        errorFile: {
          type: "string",
          default: "404.html",
          description: "Error page for 404 responses"
        },
        spaFallback: {
          type: "boolean",
          default: true,
          description: "Enable SPA fallback to index.html for client-side routing"
        },
        cleanUrls: {
          type: "boolean",
          default: true,
          description: "Serve .html files without extension"
        },
        compressText: {
          type: "boolean",
          default: true,
          description: "Enable gzip compression for text files"
        },
        corsEnabled: {
          type: "boolean",
          default: true,
          description: "Enable CORS headers"
        }
      },
      required: ["serviceType"]
    };

    await this.writeFile('static-site-schema.json', JSON.stringify(schemaContent, null, 2));
    this.log('Generated static-site configuration schema');
  }

  /**
   * Generate static-site specific middleware
   * Creates middleware for asset optimization, caching, and security
   *
   * @param {Object} context - Generation context
   * @returns {Promise<void>}
   */
  async generateMiddleware(context) {
    const middlewareContent = `/**
 * Static Site Middleware
 * Generated by Clodo Framework for ${context.coreInputs?.serviceName || 'static-site'}
 *
 * Provides middleware for:
 * - Asset optimization
 * - Cache headers
 * - Security headers
 * - Compression
 */

export class StaticSiteMiddleware {
  constructor(options = {}) {
    this.options = {
      cacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
      compressText: options.compressText !== false,
      corsEnabled: options.corsEnabled !== false,
      ...options
    };
  }

  /**
   * Apply static site middleware to a response
   * @param {Response} response - The response to modify
   * @param {Request} request - The original request
   * @returns {Response} - Modified response
   */
  apply(response, request) {
    const newResponse = new Response(response.body, response);

    // Add cache control for static assets
    if (this.isStaticAsset(request.url)) {
      newResponse.headers.set('Cache-Control', this.options.cacheControl);
    }

    // Add CORS headers if enabled
    if (this.options.corsEnabled) {
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Add compression if enabled and response is text-based
    if (this.options.compressText && this.shouldCompress(newResponse)) {
      newResponse.headers.set('Content-Encoding', 'gzip');
    }

    // Add security headers
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return newResponse;
  }

  /**
   * Check if URL is a static asset
   * @param {string} url - Request URL
   * @returns {boolean} - True if static asset
   */
  isStaticAsset(url) {
    const pathname = new URL(url).pathname;
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.webp'];

    return staticExtensions.some(ext => pathname.endsWith(ext));
  }

  /**
   * Check if response should be compressed
   * @param {Response} response - Response to check
   * @returns {boolean} - True if should compress
   */
  shouldCompress(response) {
    const contentType = response.headers.get('Content-Type') || '';
    return contentType.includes('text/') ||
           contentType.includes('application/json') ||
           contentType.includes('application/javascript') ||
           contentType.includes('application/xml');
  }
}

export default StaticSiteMiddleware;`;

    await this.writeFile('src/middleware/StaticSiteMiddleware.js', middlewareContent);
    this.log('Generated static-site middleware');
  }

  /**
   * Generate static-site specific documentation
   * Creates README and configuration guides
   *
   * @param {Object} context - Generation context
   * @returns {Promise<void>}
   */
  async generateDocs(context) {
    const { coreInputs, confirmedValues } = this.extractContext(context);

    // Load the README template
    const readmeTemplate = await this.loadTemplate('README.md');

    // Prepare template variables
    const templateVars = {
      SERVICE_NAME: coreInputs.serviceName || 'static-site',
      SERVICE_DISPLAY_NAME: confirmedValues.displayName || coreInputs.serviceName || 'Static Site',
      SERVICE_TYPE: 'static-site',
      DOMAIN_NAME: coreInputs.domainName || 'example.com',
      CURRENT_DATE: new Date().toISOString().split('T')[0],
      CURRENT_YEAR: new Date().getFullYear(),
      FRAMEWORK_VERSION: '1.0.0',
      ENVIRONMENT: context.environment || 'development'
    };

    // Render and write README
    const readmeContent = this.renderTemplate(readmeTemplate, templateVars);
    await this.writeFile('README.md', readmeContent);

    this.log('Generated static-site documentation');
  }

  /**
   * Determine if this generator should run
   * Only runs for static-site service type
   *
   * @param {Object} context - Generation context
   * @returns {boolean} - True if service type is static-site
   */
  shouldGenerate(context) {
    const serviceType = context?.coreInputs?.serviceType || context?.serviceType;
    return serviceType === 'static-site';
  }

  /**
   * Validate static-site specific configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validation result { valid: boolean, errors: string[] }
   */
  validateConfig(config) {
    const errors = [];

    if (config.serviceType !== 'static-site') {
      errors.push('Service type must be "static-site"');
    }

    if (config.publicDir && typeof config.publicDir !== 'string') {
      errors.push('publicDir must be a string path');
    }

    if (config.indexFile && typeof config.indexFile !== 'string') {
      errors.push('indexFile must be a string filename');
    }

    if (config.spaFallback !== undefined && typeof config.spaFallback !== 'boolean') {
      errors.push('spaFallback must be a boolean');
    }

    if (config.buildCommand !== undefined && (typeof config.buildCommand !== 'string' || !config.buildCommand.trim())) {
      errors.push('buildCommand must be a non-empty string');
    }

    if (config.buildOutputDir !== undefined && (typeof config.buildOutputDir !== 'string' || !config.buildOutputDir.trim())) {
      errors.push('buildOutputDir must be a non-empty string');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid static-site configuration: ${errors.join(', ')}`);
    }

    return {
      valid: true,
      errors: []
    };
  }
}

export default StaticSiteGenerator;
