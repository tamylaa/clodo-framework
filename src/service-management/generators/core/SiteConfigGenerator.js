/**
 * SiteConfigGenerator - Generates Workers Sites [site] configuration
 * 
 * Creates the [site] section for wrangler.toml for static-site services.
 * Only generates for static-site template, not for other service types.
 */
import { BaseGenerator } from '../BaseGenerator.js';

export class SiteConfigGenerator extends BaseGenerator {
  /**
   * Create a new SiteConfigGenerator instance
   * @param {Object} options - Generator options
   */
  constructor(options = {}) {
    super({
      name: 'SiteConfigGenerator',
      ...options
    });
  }

  /**
   * Generate Workers Sites configuration
   * Returns TOML [site] section as a string
   * 
   * Supports two calling conventions:
   * 1. New: context = { coreInputs: { serviceType }, siteConfig: {...} }
   * 2. Old: context = { serviceType, siteConfig: {...} }
   * 
   * @param {Object} context - Generation context
   * @param {Object} context.coreInputs - Core service inputs (serviceType, etc.) [new convention]
   * @param {string} context.serviceType - Service type [old convention - deprecated]
   * @param {Object} context.siteConfig - Optional site configuration overrides
   * @returns {Promise<string>} - TOML [site] section or empty string
   */
  async generate(context) {
    this.setContext(context);

    // Support both old and new calling conventions
    // Old: { serviceType: 'static-site', siteConfig: {...} }
    // New: { coreInputs: { serviceType: 'static-site' }, siteConfig: {...} }
    const serviceType = context.coreInputs?.serviceType || context.serviceType;
    const siteConfig = context.siteConfig || {};

    // Handle undefined/null serviceType gracefully (like original)
    if (!serviceType) {
      this.log('No service type provided - skipping [site] config');
      return '';
    }

    // Only generate for static-site template
    if (serviceType !== 'static-site') {
      this.log('Skipping [site] config - not a static-site service');
      return '';
    }

    return this.buildSiteConfig(siteConfig);
  }

  /**
   * Build the [site] configuration section
   * @param {Object} siteConfig - Site configuration overrides
   * @returns {string} - TOML [site] section
   */
  buildSiteConfig(siteConfig = {}) {
    const bucket = siteConfig.bucket || './public';
    const include = siteConfig.include || ['**/*'];
    const exclude = siteConfig.exclude || this.getDefaultExcludes();

    // Build TOML [site] section
    const lines = [
      '',
      '# Workers Sites configuration',
      '# Serves static assets from the bucket directory',
      '[site]',
      `bucket = "${bucket}"`,
      `include = ${JSON.stringify(include)}`,
      `exclude = ${JSON.stringify(exclude)}`,
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Get default file exclusions for Workers Sites
   * @returns {string[]} - Array of glob patterns to exclude
   */
  getDefaultExcludes() {
    return [
      'node_modules/**',
      '.git/**',
      '.*',
      '*.md',
      '.env*',
      'secrets/**',
      'wrangler.toml',
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml'
    ];
  }

  /**
   * Determine if this generator should run
   * 
   * Supports both calling conventions for backward compatibility.
   * 
   * @param {Object} context - Generation context
   * @returns {boolean} - True if service type is static-site
   */
  shouldGenerate(context) {
    const serviceType = context?.coreInputs?.serviceType || context?.serviceType;
    return serviceType === 'static-site';
  }

  /**
   * Validate site configuration
   * @param {Object} siteConfig - Site config to validate
   * @returns {Object} - Validation result { valid: boolean, errors: string[] }
   */
  validateSiteConfig(siteConfig) {
    const errors = [];

    if (siteConfig.bucket && typeof siteConfig.bucket !== 'string') {
      errors.push('bucket must be a string path');
    }

    if (siteConfig.include && !Array.isArray(siteConfig.include)) {
      errors.push('include must be an array of glob patterns');
    }

    if (siteConfig.exclude && !Array.isArray(siteConfig.exclude)) {
      errors.push('exclude must be an array of glob patterns');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default SiteConfigGenerator;

