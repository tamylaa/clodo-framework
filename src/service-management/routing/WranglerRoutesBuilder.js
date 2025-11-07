/**
 * WranglerRoutesBuilder - Builds TOML [[routes]] sections
 * 
 * Formats route patterns as valid TOML with proper syntax,
 * comments, and environment-specific sections.
 * 
 * @module service-management/routing/WranglerRoutesBuilder
 */

export class WranglerRoutesBuilder {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Build TOML [[routes]] section
   * 
   * @param {Array<string>} patterns - Array of route patterns
   * @param {string} environment - Target environment (production|staging|development)
   * @param {Object} options - Build options
   * @param {string} options.zoneId - Cloudflare zone ID (optional)
   * @param {boolean} options.includeComments - Include comments (default: true)
   * @param {string} options.domain - Domain name (for comments)
   * @param {string} options.serviceName - Service name (for comments)
   * 
   * @returns {string} TOML-formatted routes section
   * 
   * @example
   * const builder = new WranglerRoutesBuilder();
   * const toml = builder.buildRoutesSection(
   *   ['api.example.com/*', 'example.com/api/*'],
   *   'production',
   *   { zoneId: 'xyz789...', includeComments: true, domain: 'api.example.com' }
   * );
   */
  buildRoutesSection(patterns, environment, options = {}) {
    if (!patterns || patterns.length === 0) {
      return '';
    }

    const opts = {
      includeComments: options.includeComments !== false,
      ...options
    };

    let section = '';

    // Add environment comment
    if (opts.includeComments) {
      section += this.generateRouteComment(opts.domain || 'unknown', environment);
      section += '\n';
    }

    // Determine if routes should be nested under environment
    const isNested = environment === 'staging' || environment === 'development';
    const prefix = isNested ? `env.${environment}.` : '';

    // Build each route
    patterns.forEach((pattern, index) => {
      section += this.formatRoutePattern(pattern, opts.zoneId, prefix);
      
      // Add spacing between routes (but not after last one)
      if (index < patterns.length - 1) {
        section += '\n';
      }
    });

    return section;
  }

  /**
   * Format a single route pattern as TOML
   * 
   * @param {string} pattern - Route pattern (e.g., api.example.com/*)
   * @param {string} zoneId - Cloudflare zone ID (optional)
   * @param {string} prefix - Environment prefix (e.g., 'env.staging.')
   * @returns {string} TOML-formatted route
   * 
   * @example
   * formatRoutePattern('api.example.com/*', 'xyz789...')
   * // Returns:
   * // [[routes]]
   * // pattern = "api.example.com/*"
   * // zone_id = "xyz789..."
   */
  formatRoutePattern(pattern, zoneId = null, prefix = '') {
    let toml = `[[${prefix}routes]]\n`;
    toml += `pattern = "${this._escapeTomlString(pattern)}"\n`;
    
    if (zoneId) {
      toml += `zone_id = "${this._escapeTomlString(zoneId)}"\n`;
    }
    
    return toml;
  }

  /**
   * Generate descriptive comment for routes
   * 
   * @param {string} domain - Domain name
   * @param {string} environment - Environment name
   * @returns {string} Comment text
   * 
   * @example
   * generateRouteComment('api.example.com', 'production')
   * // Returns: "# Production environment routes\n# Domain: api.example.com"
   */
  generateRouteComment(domain, environment) {
    const envName = environment.charAt(0).toUpperCase() + environment.slice(1);
    
    let comment = `# ${envName} environment routes\n`;
    comment += `# Domain: ${domain}`;
    
    return comment;
  }

  /**
   * Generate development environment comment
   * 
   * Used when development uses workers.dev subdomain (no routes needed)
   * 
   * @param {string} workerName - Worker name
   * @returns {string} Comment explaining workers.dev usage
   */
  generateDevComment(workerName) {
    return `# Development environment\n` +
           `# Uses workers.dev subdomain: https://${workerName}-dev.<account>.workers.dev\n` +
           `# No custom domain routes needed for development\n`;
  }

  /**
   * Validate TOML syntax
   * 
   * Basic validation to catch common TOML errors
   * 
   * @param {string} tomlString - TOML string to validate
   * @returns {Object} Validation result
   * @returns {boolean} returns.valid - True if valid TOML syntax
   * @returns {Array<string>} returns.errors - Array of error messages
   * 
   * @example
   * const result = builder.validateTomlSyntax('[[routes]]\npattern = "api.example.com/*"');
   * // Returns: { valid: true, errors: [] }
   */
  validateTomlSyntax(tomlString) {
    const errors = [];

    if (!tomlString || typeof tomlString !== 'string') {
      return {
        valid: false,
        errors: ['TOML string is required']
      };
    }

    const lines = tomlString.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      // Check [[array]] syntax
      if (trimmed.startsWith('[[')) {
        if (!trimmed.endsWith(']]')) {
          errors.push(`Line ${lineNum}: Invalid [[array]] syntax - missing closing ]]`);
        }
        
        const arrayName = trimmed.slice(2, -2);
        if (!arrayName) {
          errors.push(`Line ${lineNum}: Empty [[array]] name`);
        }
      }

      // Check [section] syntax
      else if (trimmed.startsWith('[') && !trimmed.startsWith('[[')) {
        if (!trimmed.endsWith(']')) {
          errors.push(`Line ${lineNum}: Invalid [section] syntax - missing closing ]`);
        }
        
        const sectionName = trimmed.slice(1, -1);
        if (!sectionName) {
          errors.push(`Line ${lineNum}: Empty [section] name`);
        }
      }

      // Check key = value syntax
      else if (trimmed.includes('=')) {
        const parts = trimmed.split('=');
        
        if (parts.length !== 2) {
          errors.push(`Line ${lineNum}: Invalid key = value syntax - multiple equals signs`);
          return;
        }

        const key = parts[0].trim();
        const value = parts[1].trim();

        if (!key) {
          errors.push(`Line ${lineNum}: Missing key before =`);
        }

        if (!value) {
          errors.push(`Line ${lineNum}: Missing value after =`);
        }

        // Check string values are quoted
        if (value && !value.startsWith('"') && !value.match(/^[0-9]+$/)) {
          // Not a number and not quoted
          if (!value.startsWith('[') && !value.match(/^(true|false)$/)) {
            errors.push(`Line ${lineNum}: String values must be quoted (key: ${key})`);
          }
        }

        // Check for unescaped quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          const innerValue = value.slice(1, -1);
          if (innerValue.includes('"') && !innerValue.includes('\\"')) {
            errors.push(`Line ${lineNum}: Unescaped quote in string value (key: ${key})`);
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Escape special characters for TOML strings
   * @private
   * 
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  _escapeTomlString(str) {
    if (!str) return '';

    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/"/g, '\\"')     // Escape quotes
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/\t/g, '\\t');   // Escape tabs
  }

  /**
   * Build complete wrangler.toml routes configuration
   * 
   * High-level method that builds routes for all environments
   * 
   * @param {Object} routesByEnvironment - Routes grouped by environment
   * @param {Array<string>} routesByEnvironment.production - Production routes
   * @param {Array<string>} routesByEnvironment.staging - Staging routes
   * @param {Array<string>} routesByEnvironment.development - Development routes
   * @param {Object} options - Build options
   * 
   * @returns {string} Complete TOML routes configuration
   */
  buildCompleteRoutesConfig(routesByEnvironment, options = {}) {
    let config = '';

    // Add header
    if (options.includeComments !== false) {
      config += '# Cloudflare Workers Routes Configuration\n';
      config += '# Generated by Clodo Framework\n';
      config += `# Generated: ${new Date().toISOString()}\n\n`;
    }

    // Production routes (top-level)
    if (routesByEnvironment.production && routesByEnvironment.production.length > 0) {
      config += this.buildRoutesSection(
        routesByEnvironment.production,
        'production',
        options
      );
      config += '\n\n';
    }

    // Staging routes
    if (routesByEnvironment.staging && routesByEnvironment.staging.length > 0) {
      config += this.buildRoutesSection(
        routesByEnvironment.staging,
        'staging',
        options
      );
      config += '\n\n';
    }

    // Development routes
    if (routesByEnvironment.development && routesByEnvironment.development.length > 0) {
      config += this.buildRoutesSection(
        routesByEnvironment.development,
        'development',
        options
      );
      config += '\n\n';
    }

    return config.trim() + '\n';
  }
}

