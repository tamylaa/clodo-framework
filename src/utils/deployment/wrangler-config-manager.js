#!/usr/bin/env node

/**
 * Wrangler Configuration Manager
 * Manages wrangler.toml configuration files for Cloudflare Workers deployment
 * Handles environment sections, D1 database bindings, and other Cloudflare resources
 * 
 * @module WranglerConfigManager
 */

import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml';
import { constants } from 'fs';

export class WranglerConfigManager {
  constructor(options = {}) {
    // Handle both string path and options object
    if (typeof options === 'string') {
      this.configPath = options;
      this.projectRoot = dirname(options);
      this.dryRun = false;
      this.verbose = false;
      this.accountId = null;
    } else {
      this.projectRoot = options.projectRoot || process.cwd();
      this.configPath = options.configPath || join(this.projectRoot, 'wrangler.toml');
      this.dryRun = options.dryRun || false;
      this.verbose = options.verbose || false;
      this.accountId = options.accountId || null;
    }
  }

  /**
   * Read and parse wrangler.toml file
   * @returns {Promise<Object>} Parsed TOML configuration
   */
  async readConfig() {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      return parseToml(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - return minimal default config
        if (this.verbose) {
          console.log(`   ℹ️  wrangler.toml not found at ${this.configPath}`);
        }
        return {
          name: 'worker',
          main: 'src/index.js',
          compatibility_date: new Date().toISOString().split('T')[0],
          env: {}
        };
      }
      throw new Error(`Failed to read wrangler.toml: ${error.message}`);
    }
  }

  /**
   * Check if wrangler.toml file exists
   * @returns {Promise<boolean>} True if file exists, false otherwise
   */
  async exists() {
    try {
      await access(this.configPath, constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Write configuration back to wrangler.toml
   * @param {Object} config - Configuration object to write
   */
  async writeConfig(config) {
    if (this.dryRun) {
      console.log(`   🔍 DRY RUN: Would write wrangler.toml`);
      console.log(stringifyToml(config));
      return;
    }

    try {
      // Ensure directory exists
      await mkdir(dirname(this.configPath), { recursive: true });
      
      // Convert to TOML string
      const tomlContent = stringifyToml(config);
      
      // Write to file
      await writeFile(this.configPath, tomlContent, 'utf-8');
      
      if (this.verbose) {
        console.log(`   ✅ Updated wrangler.toml at ${this.configPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to write wrangler.toml: ${error.message}`);
    }
  }

  /**
   * Set account_id in wrangler.toml
   * @param {string} accountId - Cloudflare account ID
   * @returns {Promise<boolean>} True if account_id was set
   */
  async setAccountId(accountId) {
    if (!accountId) {
      return false;
    }

    const config = await this.readConfig();

    if (config.account_id === accountId) {
      if (this.verbose) {
        console.log(`   ✓ account_id already set to ${accountId}`);
      }
      return false;
    }

    console.log(`   📝 Setting account_id to ${accountId} in wrangler.toml`);
    config.account_id = accountId;

    await this.writeConfig(config);
    console.log(`   ✅ account_id updated in wrangler.toml`);
    return true;
  }

  /**
   * Ensure environment section exists in wrangler.toml
   * @param {string} environment - Environment name (development, staging, production)
   * @returns {Promise<boolean>} True if environment was added, false if already existed
   */
  async ensureEnvironment(environment) {
    const config = await this.readConfig();
    
    // For production, check top-level only
    if (environment === 'production') {
      // Production config is typically at top level
      if (!config.name) {
        console.log(`   ⚠️  wrangler.toml missing 'name' field`);
        return false;
      }
      return false; // Already exists (implicitly)
    }
    
    // For non-production environments, check env.{environment} section
    if (!config.env) {
      config.env = {};
    }
    
    if (!config.env[environment]) {
      console.log(`   📝 Adding [env.${environment}] section to wrangler.toml`);
      
      // Create environment section with basic structure
      config.env[environment] = {
        name: config.name || 'worker',
        // Don't add workers_dev by default - let wrangler decide
      };
      
      await this.writeConfig(config);
      return true;
    }
    
    if (this.verbose) {
      console.log(`   ✓ [env.${environment}] section already exists`);
    }
    return false;
  }

  /**
   * Add D1 database binding to wrangler.toml
   * @param {string} environment - Environment name
   * @param {Object} databaseInfo - Database information
   * @param {string} databaseInfo.binding - Binding name (e.g., 'DB')
   * @param {string} databaseInfo.database_name - Database name
   * @param {string} databaseInfo.database_id - Database ID
   * @returns {Promise<boolean>} True if binding was added
   */
  async addDatabaseBinding(environment, databaseInfo) {
    // Support both camelCase and snake_case for flexibility
    const binding = databaseInfo.binding || 'DB';
    const databaseName = databaseInfo.database_name || databaseInfo.databaseName;
    const databaseId = databaseInfo.database_id || databaseInfo.databaseId;
    
    if (!databaseName || !databaseId) {
      throw new Error('Database name and ID are required');
    }
    
    const config = await this.readConfig();
    
    console.log(`   📝 Adding D1 database binding to wrangler.toml`);
    console.log(`      Environment: ${environment}`);
    console.log(`      Binding: ${binding}`);
    console.log(`      Database: ${databaseName}`);
    console.log(`      ID: ${databaseId}`);
    
    const dbBinding = {
      binding,
      database_name: databaseName,
      database_id: databaseId
    };
    
    // Always add to environment-specific section for consistency
    // This ensures database bindings are scoped to their environment
    if (!config.env) {
      config.env = {};
    }
    
    if (!config.env[environment]) {
      // Create environment section with proper name
      const envName = environment === 'production' 
        ? `${config.name}-prod` 
        : config.name || 'worker';
      config.env[environment] = { name: envName };
    }
    
    if (!config.env[environment].d1_databases) {
      config.env[environment].d1_databases = [];
    }
    
    // Check if binding already exists
    const existingIndex = config.env[environment].d1_databases.findIndex(
      db => db.binding === binding || db.database_name === databaseName
    );
    
    if (existingIndex >= 0) {
      console.log(`   🔄 Updating existing database binding`);
      config.env[environment].d1_databases[existingIndex] = dbBinding;
    } else {
      console.log(`   ➕ Adding new database binding`);
      config.env[environment].d1_databases.push(dbBinding);
    }
    
    await this.writeConfig(config);
    console.log(`   ✅ D1 database binding added successfully`);
    return true;
  }

  /**
   * Remove D1 database binding from wrangler.toml
   * @param {string} environment - Environment name
   * @param {string} bindingOrName - Binding name or database name
   * @returns {Promise<boolean>} True if binding was removed
   */
  async removeDatabaseBinding(environment, bindingOrName) {
    const config = await this.readConfig();
    let removed = false;
    
    // Always remove from environment-specific section
    if (config.env?.[environment]?.d1_databases) {
      const initialLength = config.env[environment].d1_databases.length;
      config.env[environment].d1_databases = config.env[environment].d1_databases.filter(
        db => db.binding !== bindingOrName && db.database_name !== bindingOrName
      );
      removed = config.env[environment].d1_databases.length < initialLength;
    }
    
    if (removed) {
      await this.writeConfig(config);
      console.log(`   ✅ Removed database binding: ${bindingOrName}`);
    } else {
      console.log(`   ℹ️  Database binding not found: ${bindingOrName}`);
    }
    
    return removed;
  }

  /**
   * Get all database bindings for an environment
   * @param {string} environment - Environment name
   * @returns {Promise<Array>} Array of database bindings
   */
  async getDatabaseBindings(environment) {
    const config = await this.readConfig();
    
    if (environment === 'production') {
      return config.d1_databases || [];
    } else {
      return config.env?.[environment]?.d1_databases || [];
    }
  }

  /**
   * Create minimal wrangler.toml if it doesn't exist
   * @param {string} name - Worker name
   * @param {string} environment - Initial environment to create (optional)
   * @param {Object} options - Additional configuration options
   * @returns {Promise<Object>} The created config object
   */
  async createMinimalConfig(name = 'worker', environment = null, options = {}) {
    const exists = await this.exists();
    if (exists) {
      console.log(`   ✓ wrangler.toml already exists`);
      return await this.readConfig();
    }
    
    console.log(`   📝 Creating minimal wrangler.toml`);
    
    const today = new Date().toISOString().split('T')[0];
    
    const minimalConfig = {
      name: name,
      main: options.main || 'src/index.js',
      compatibility_date: options.compatibility_date || today,
      
      // Environment sections will be added as needed
      env: {}
    };

    // Add initial environment if specified
    if (environment && environment !== 'production') {
      minimalConfig.env[environment] = {};
    }
    
    await this.writeConfig(minimalConfig);
    console.log(`   ✅ Created wrangler.toml at ${this.configPath}`);
    return minimalConfig;
  }

  /**
   * Validate wrangler.toml configuration
   * @returns {Promise<Object>} Validation result with errors and warnings arrays
   */
  async validate() {
    const errors = [];
    const warnings = [];
    
    // Check if file exists
    const exists = await this.exists();
    if (!exists) {
      errors.push('wrangler.toml file not found');
      return { valid: false, errors, warnings };
    }
    
    try {
      const config = await this.readConfig();
      
      // Check required fields
      if (!config.name) {
        errors.push('Missing required field: name');
      }
      
      if (!config.main) {
        warnings.push('Missing main field (entry point)');
      }
      
      if (!config.compatibility_date) {
        warnings.push('Missing compatibility_date field');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        config
      };
    } catch (error) {
      errors.push(`Invalid TOML syntax: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Display configuration summary
   * @param {string} environment - Environment to display (optional)
   */
  async displaySummary(environment = null) {
    const config = await this.readConfig();
    
    console.log(`\n📋 Wrangler Configuration Summary`);
    console.log(`   File: ${this.configPath}`);
    console.log(`   Worker Name: ${config.name || 'N/A'}`);
    console.log(`   Entry Point: ${config.main || 'N/A'}`);
    console.log(`   Compatibility: ${config.compatibility_date || 'N/A'}`);
    
    if (environment) {
      console.log(`\n   Environment: ${environment}`);
      const bindings = await this.getDatabaseBindings(environment);
      if (bindings.length > 0) {
        console.log(`   D1 Databases (${bindings.length}):`);
        bindings.forEach(db => {
          console.log(`     • ${db.binding}: ${db.database_name} (${db.database_id})`);
        });
      } else {
        console.log(`   D1 Databases: None configured`);
      }
    } else {
      // Show all environments
      if (config.env && Object.keys(config.env).length > 0) {
        console.log(`\n   Environments: ${Object.keys(config.env).join(', ')}`);
      }
    }
    
    console.log('');
  }
}

export default WranglerConfigManager;
