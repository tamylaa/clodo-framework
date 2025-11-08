/**
 * Service Config Manager
 * Centralized, reusable configuration loading for CLI commands
 *
 * Features:
 * - Standardized config file discovery across all commands
 * - Proper error handling with user-friendly messages
 * - Deep merging of nested configuration objects
 * - Config validation against schemas
 * - Debugging support with --show-config-sources
 * - Environment variable substitution
 */

import { existsSync } from 'fs';
import path from 'path';
import { ConfigLoader } from './config-loader.js';

export class ServiceConfigManager {
  constructor(options = {}) {
    this.configLoader = new ConfigLoader(options);
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
    this.json = options.json || false;
    this.showSources = options.showSources || false;
  }

  /**
   * Load and merge configuration for a service command
   * @param {string} servicePath - Path to the service directory
   * @param {Object} cliOptions - CLI options from commander
   * @param {Object} commandDefaults - Default options for this command
   * @returns {Object} Merged configuration
   */
  async loadServiceConfig(servicePath, cliOptions = {}, commandDefaults = {}) {
    const sources = [];

    // 1. Load framework defaults (always available)
    const frameworkConfig = this.loadFrameworkDefaults();
    sources.push({
      name: 'Framework Defaults',
      path: 'config/validation-config.json',
      config: frameworkConfig,
      priority: 4
    });

    // 2. Load service-specific config (highest priority for customization)
    const serviceConfig = await this.loadServiceConfigFile(servicePath);
    if (serviceConfig) {
      sources.push({
        name: 'Service Config',
        path: path.join(servicePath, 'validation-config.json'),
        config: serviceConfig,
        priority: 1
      });
    }

    // 3. Load current directory config (for deploy command compatibility)
    const cwdConfig = this.loadCwdConfigFile();
    if (cwdConfig) {
      sources.push({
        name: 'Current Directory Config',
        path: path.join(process.cwd(), 'validation-config.json'),
        config: cwdConfig,
        priority: 2
      });
    }

    // 4. Load explicitly specified config file
    let explicitConfig = {};
    if (cliOptions.configFile) {
      explicitConfig = this.configLoader.loadSafe(cliOptions.configFile, {});
      if (Object.keys(explicitConfig).length > 0) {
        sources.push({
          name: 'Explicit Config File',
          path: cliOptions.configFile,
          config: explicitConfig,
          priority: 0 // Highest priority
        });
      }
    }

    // Sort sources by priority (lower number = higher priority)
    sources.sort((a, b) => a.priority - b.priority);

    // Show config sources if requested
    if (this.showSources) {
      this.displayConfigSources(sources);
    }

    // Deep merge all configurations
    let mergedConfig = { ...commandDefaults };

    for (const source of sources) {
      mergedConfig = this.deepMerge(mergedConfig, source.config);
    }

    // CLI options override everything (except when showing sources)
    if (!this.showSources) {
      mergedConfig = this.deepMerge(mergedConfig, cliOptions);
    }

    // Substitute environment variables
    mergedConfig = this.configLoader.substituteEnvironmentVariables(mergedConfig);

    return mergedConfig;
  }

  /**
   * Load framework default configuration
   */
  loadFrameworkDefaults() {
    try {
      const frameworkConfigPath = path.join(process.cwd(), 'config', 'validation-config.json');
      return this.configLoader.loadSafe(frameworkConfigPath, {});
    } catch (error) {
      // Framework config is optional, return empty object
      return {};
    }
  }

  /**
   * Load service-specific configuration file
   */
  async loadServiceConfigFile(servicePath) {
    if (!servicePath) return null;

    const configPath = path.join(servicePath, 'validation-config.json');

    try {
      if (!existsSync(configPath)) {
        return null; // File doesn't exist, which is fine
      }

      const config = this.configLoader.load(configPath);

      if (this.verbose && !this.quiet) {
        console.log(`✅ Loaded service config: ${configPath}`);
      }

      return config;
    } catch (error) {
      // This is an actual error (file exists but can't be loaded)
      if (!this.quiet) {
        console.warn(`⚠️  Failed to load service config from ${configPath}: ${error.message}`);
        console.warn(`   Using framework defaults instead.`);
      }
      return null;
    }
  }

  /**
   * Load configuration from current working directory
   */
  loadCwdConfigFile() {
    const configPath = path.join(process.cwd(), 'validation-config.json');

    try {
      if (!existsSync(configPath)) {
        return null;
      }

      const config = this.configLoader.load(configPath);

      if (this.verbose && !this.quiet) {
        console.log(`✅ Loaded current directory config: ${configPath}`);
      }

      return config;
    } catch (error) {
      if (!this.quiet) {
        console.warn(`⚠️  Failed to load current directory config from ${configPath}: ${error.message}`);
        console.warn(`   Using framework defaults instead.`);
      }
      return null;
    }
  }

  /**
   * Deep merge two configuration objects
   */
  deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Deep merge nested objects
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        // Override with source value (including arrays and primitives)
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Display configuration sources for debugging
   */
  displayConfigSources(sources) {
    console.log('\n📋 Configuration Sources (in merge order):');

    for (const source of sources) {
      const status = Object.keys(source.config).length > 0 ? '✅ Loaded' : '❌ Empty';
      console.log(`  ${status} ${source.name}: ${source.path}`);
    }

    console.log('\n📋 Final merged configuration:');
    console.log(JSON.stringify(this.deepMerge({}, ...sources.map(s => s.config)), null, 2));
    console.log('');
  }

  /**
   * Validate service path exists and is accessible
   */
  async validateServicePath(servicePath, orchestrator) {
    if (!servicePath) {
      // Try auto-detection
      servicePath = await orchestrator.detectServicePath();
      if (!servicePath) {
        const error = new Error('No service path provided and could not auto-detect service directory');
        error.suggestions = [
          'Ensure you are in a service directory or specify --service-path',
          'Service directories must contain: package.json, src/config/domains.js, wrangler.toml',
          'Try: cd /path/to/your/service && clodo-service <command>'
        ];
        throw error;
      }
    }

    // Validate the path exists and is accessible
    try {
      await orchestrator.isServiceDirectory(servicePath);
    } catch (error) {
      const validationError = new Error(`Invalid service path: ${servicePath}`);
      validationError.suggestions = [
        'Ensure the directory exists and is accessible',
        'Service directories must contain: package.json, src/config/domains.js, wrangler.toml',
        `Check permissions for: ${servicePath}`
      ];
      throw validationError;
    }

    return servicePath;
  }
}