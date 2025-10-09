/**
 * Configuration Mutator Module
 * Focused module for safe configuration file mutations
 */

import fs from 'fs/promises';
import path from 'path';

export class ConfigMutator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
  }

  /**
   * Safely update domain configuration
   */
  async updateDomainConfig(servicePath, currentConfig, updates) {
    const domainConfigPath = path.join(servicePath, 'src/config/domains.js');
    let domainConfig = await fs.readFile(domainConfigPath, 'utf8');

    if (updates.domainName) {
      // Use regex-based replacement for safety
      domainConfig = domainConfig.replace(
        new RegExp(`name: ['"]${this.escapeRegExp(currentConfig.domainName)}['"]`, 'g'),
        `name: '${updates.domainName}'`
      );

      // Update domain URLs
      domainConfig = domainConfig.replace(
        new RegExp(`https://[^'"]*${this.escapeRegExp(currentConfig.domainName)}[^'"]*`, 'g'),
        (match) => match.replace(currentConfig.domainName, updates.domainName)
      );
    }

    if (!this.dryRun) {
      await fs.writeFile(domainConfigPath, domainConfig, 'utf8');
    }

    return { updated: true, path: domainConfigPath };
  }

  /**
   * Update Cloudflare configuration
   */
  async updateCloudflareConfig(servicePath, currentConfig, updates) {
    const domainConfigPath = path.join(servicePath, 'src/config/domains.js');
    let domainConfig = await fs.readFile(domainConfigPath, 'utf8');

    if (updates.accountId) {
      domainConfig = domainConfig.replace(
        new RegExp(`accountId:\\s*['"]${this.escapeRegExp(currentConfig.cloudflareAccountId || '')}['"]`, 'g'),
        `accountId: '${updates.accountId}'`
      );
    }

    if (updates.zoneId) {
      domainConfig = domainConfig.replace(
        new RegExp(`zoneId:\\s*['"]${this.escapeRegExp(currentConfig.cloudflareZoneId || '')}['"]`, 'g'),
        `zoneId: '${updates.zoneId}'`
      );
    }

    if (!this.dryRun) {
      await fs.writeFile(domainConfigPath, domainConfig, 'utf8');
    }

    return { updated: true, path: domainConfigPath };
  }

  /**
   * Update environment configuration
   */
  async updateEnvironmentConfig(servicePath, currentConfig, updates) {
    const wranglerConfigPath = path.join(servicePath, 'wrangler.toml');
    let wranglerConfig = await fs.readFile(wranglerConfigPath, 'utf8');

    if (updates.environment) {
      // Update environment-specific names
      wranglerConfig = wranglerConfig.replace(
        new RegExp(`name\\s*=\\s*['"].*${this.escapeRegExp(currentConfig.environment)}.*['"]`, 'g'),
        `name = "${currentConfig.serviceName}-${updates.environment}"`
      );

      wranglerConfig = wranglerConfig.replace(
        new RegExp(`\\[env\\.${this.escapeRegExp(currentConfig.environment)}\\]`, 'g'),
        `[env.${updates.environment}]`
      );
    }

    if (!this.dryRun) {
      await fs.writeFile(wranglerConfigPath, wranglerConfig, 'utf8');
    }

    return { updated: true, path: wranglerConfigPath };
  }

  /**
   * Update feature configuration
   */
  async updateFeatureConfig(servicePath, action, feature) {
    const domainConfigPath = path.join(servicePath, 'src/config/domains.js');
    let domainConfig = await fs.readFile(domainConfigPath, 'utf8');

    if (action === 'add') {
      // Add feature flag
      const featureLine = `    ${feature}: true,`;
      domainConfig = domainConfig.replace(
        /(\s+)(cors:\s*(?:true|false),?)(\n)/,
        `$1$2$3$1${featureLine}$3`
      );
    } else if (action === 'remove') {
      // Remove feature flag
      const featureLinePattern = new RegExp(`\\s+${this.escapeRegExp(feature)}:\\s*(?:true|false),?\\n`, 'g');
      domainConfig = domainConfig.replace(featureLinePattern, '');
    }

    if (!this.dryRun) {
      await fs.writeFile(domainConfigPath, domainConfig, 'utf8');
    }

    return { updated: true, path: domainConfigPath };
  }

  /**
   * Validate configuration file exists and is writable
   */
  async validateConfigFile(filePath) {
    try {
      await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Configuration file not accessible: ${filePath}` 
      };
    }
  }

  /**
   * Escape special regex characters for safe replacement
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Enable/disable dry run mode
   */
  setDryRun(enabled) {
    this.dryRun = enabled;
  }
}