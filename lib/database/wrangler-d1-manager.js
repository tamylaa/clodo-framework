/**
 * Wrangler D1 Database Manager
 * 
 * Specialized module for managing Cloudflare D1 database operations through wrangler CLI.
 * Extracted from WranglerDeployer to provide focused, reusable D1 database management.
 * 
 * Responsibilities:
 * - D1 database creation and management
 * - D1 binding validation and configuration
 * - D1 error detection and recovery
 * - Interactive D1 database selection flows
 * 
 * This module integrates with:
 * - deployment-db-manager.js (higher-level database operations)
 * - wrangler-deployer.js (deployment-time D1 validation)
 * - enterprise-db-manager.js (portfolio-wide database management)
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { askYesNo, askChoice, askUser } from '../shared/utils/interactive-prompts.js';

export class WranglerD1Manager {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.timeout = options.timeout || 60000; // 1 minute for D1 operations
    this.retryAttempts = options.retryAttempts || 2;
  }

  /**
   * Execute wrangler D1 command and capture output
   * @param {Array<string>} args - Command arguments starting with 'wrangler'
   * @returns {Promise<Object>} Command execution result
   */
  async executeWranglerCommand(args) {
    return new Promise((resolve, reject) => {
      const process = spawn(args[0], args.slice(1), {
        cwd: this.cwd,
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timed out after ${this.timeout}ms`));
      }, this.timeout);

      process.on('close', (code) => {
        clearTimeout(timer);
        
        const result = {
          success: code === 0,
          code,
          stdout,
          stderr,
          output: stdout || stderr
        };

        if (code === 0) {
          resolve(result);
        } else {
          const error = new Error(stderr || stdout || `Command failed with exit code ${code}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Extract D1 database bindings from wrangler.toml content
   * @param {string} configContent - Content of wrangler.toml file
   * @returns {Array<Object>} Array of D1 database bindings
   */
  extractD1Bindings(configContent) {
    const bindings = [];
    const lines = configContent.split('\n');
    let currentBinding = null;
    let inD1Section = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for D1 database section start
      if (line === '[[d1_databases]]') {
        inD1Section = true;
        currentBinding = {};
        continue;
      }

      // Check for end of D1 section (next section or empty line with next section)
      if (inD1Section && (line.startsWith('[') && !line.startsWith('[[d1_databases]]'))) {
        if (currentBinding && Object.keys(currentBinding).length > 0) {
          bindings.push(currentBinding);
        }
        inD1Section = false;
        currentBinding = null;
      }

      // Parse D1 binding properties
      if (inD1Section && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        const cleanKey = key.trim();

        if (cleanKey === 'binding') {
          currentBinding.binding = value;
        } else if (cleanKey === 'database_name') {
          currentBinding.database_name = value;
        } else if (cleanKey === 'database_id') {
          currentBinding.database_id = value;
        }
      }
    }

    // Handle last binding if file ends in D1 section
    if (inD1Section && currentBinding && Object.keys(currentBinding).length > 0) {
      bindings.push(currentBinding);
    }

    return bindings;
  }

  /**
   * Check if a D1 database exists by name or ID
   * @param {string} nameOrId - Database name or ID to check
   * @returns {Promise<Object>} Object with exists flag and database info
   */
  async checkD1DatabaseExists(nameOrId) {
    try {
      const result = await this.executeWranglerCommand(['wrangler', 'd1', 'list']);
      
      if (!result.success) {
        throw new Error(`Failed to list D1 databases: ${result.stderr}`);
      }

      const databases = [];
      const lines = result.stdout.split('\n');
      
      // Parse the database list output
      for (const line of lines) {
        // Look for database entries (skip headers and empty lines)
        if (line.trim() && !line.includes('Database ID') && !line.includes('---')) {
          // Try to parse database info from the line
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const dbId = parts[0];
            const dbName = parts[1];
            
            databases.push({
              id: dbId,
              name: dbName,
              exists: true
            });

            // Check if this matches what we're looking for
            if (dbId === nameOrId || dbName === nameOrId) {
              return {
                exists: true,
                database: {
                  id: dbId,
                  name: dbName
                }
              };
            }
          }
        }
      }

      return {
        exists: false,
        availableDatabases: databases
      };

    } catch (error) {
      throw new Error(`Failed to check D1 database existence: ${error.message}`);
    }
  }

  /**
   * Validate all D1 database bindings in wrangler configuration
   * @param {Object} deployConfig - Deployment configuration
   * @returns {Promise<Object>} Validation result with detailed information
   */
  async validateD1Bindings(deployConfig) {
    const validation = {
      valid: true,
      bindings: [],
      issues: [],
      missingDatabases: [],
      suggestions: []
    };

    try {
      // Read wrangler config
      const configPath = deployConfig.configPath || 'wrangler.toml';
      const configContent = readFileSync(configPath, 'utf8');
      
      // Extract D1 bindings
      const bindings = this.extractD1Bindings(configContent);
      validation.bindings = bindings;

      if (bindings.length === 0) {
        validation.suggestions.push('No D1 databases configured. Consider adding D1 bindings if your application uses databases.');
        return validation;
      }

      // Validate each binding
      for (const binding of bindings) {
        const bindingIssues = [];

        // Check required fields
        if (!binding.binding) {
          bindingIssues.push('Missing binding name');
        }
        if (!binding.database_name) {
          bindingIssues.push('Missing database_name');
        }

        // Check if database exists (by name or ID)
        let databaseExists = false;
        let existingDatabase = null;

        if (binding.database_name) {
          try {
            const existsResult = await this.checkD1DatabaseExists(binding.database_name);
            if (existsResult.exists) {
              databaseExists = true;
              existingDatabase = existsResult.database;
            }
          } catch (error) {
            bindingIssues.push(`Failed to verify database existence: ${error.message}`);
          }
        }

        if (binding.database_id && !databaseExists) {
          try {
            const existsResult = await this.checkD1DatabaseExists(binding.database_id);
            if (existsResult.exists) {
              databaseExists = true;
              existingDatabase = existsResult.database;
            }
          } catch (error) {
            bindingIssues.push(`Failed to verify database existence by ID: ${error.message}`);
          }
        }

        if (!databaseExists) {
          validation.missingDatabases.push({
            binding: binding.binding,
            database_name: binding.database_name,
            database_id: binding.database_id
          });
          bindingIssues.push(`Database '${binding.database_name || binding.database_id}' not found`);
        }

        // Check for ID/name consistency if both are provided
        if (binding.database_id && binding.database_name && existingDatabase) {
          if (existingDatabase.id !== binding.database_id) {
            bindingIssues.push(`Database ID mismatch: expected ${binding.database_id}, found ${existingDatabase.id}`);
          }
          if (existingDatabase.name !== binding.database_name) {
            bindingIssues.push(`Database name mismatch: expected ${binding.database_name}, found ${existingDatabase.name}`);
          }
        }

        if (bindingIssues.length > 0) {
          validation.valid = false;
          validation.issues.push({
            binding: binding.binding || 'unknown',
            issues: bindingIssues
          });
        }
      }

      // Add suggestions for missing databases
      if (validation.missingDatabases.length > 0) {
        validation.suggestions.push('Run database creation or update binding configuration to fix missing databases');
        validation.suggestions.push('Use wrangler d1 create <database-name> to create missing databases');
      }

    } catch (error) {
      validation.valid = false;
      validation.issues.push({
        binding: 'configuration',
        issues: [`Failed to validate D1 bindings: ${error.message}`]
      });
    }

    return validation;
  }

  /**
   * Extract database name/ID from D1 binding error message
   * @param {string} errorMessage - Error message from wrangler
   * @returns {string|null} Extracted database name or ID
   */
  extractDbNameFromError(errorMessage) {
    const patterns = [
      /Couldn't find a D1 DB with the name or binding '([^']+)'/,
      /Database '([^']+)' not found/,
      /Unknown database: ([^\s]+)/,
      /D1 database ([^\s]+) does not exist/,
      /Missing D1 database: ([^\s]+)/
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if error message indicates a D1 binding issue
   * @param {string} errorMessage - Error message to analyze
   * @returns {Object} Analysis result with error type and details
   */
  analyzeD1Error(errorMessage) {
    const analysis = {
      isD1Error: false,
      errorType: null,
      databaseName: null,
      bindingName: null,
      canRecover: false,
      suggestion: null
    };

    const errorLower = errorMessage.toLowerCase();

    // Check for D1-related keywords
    if (errorLower.includes('d1') || errorLower.includes('database')) {
      analysis.isD1Error = true;

      // Determine error type
      if (errorLower.includes("couldn't find") || errorLower.includes('not found')) {
        analysis.errorType = 'database_not_found';
        analysis.canRecover = true;
        analysis.suggestion = 'Create the database or update the binding configuration';
      } else if (errorLower.includes('binding')) {
        analysis.errorType = 'binding_configuration_error';
        analysis.canRecover = true;
        analysis.suggestion = 'Update the D1 binding configuration in wrangler.toml';
      } else if (errorLower.includes('permission') || errorLower.includes('access')) {
        analysis.errorType = 'permission_error';
        analysis.canRecover = false;
        analysis.suggestion = 'Check Cloudflare account permissions for D1 databases';
      }

      // Extract database/binding names
      analysis.databaseName = this.extractDbNameFromError(errorMessage);
      
      // Try to extract binding name if different from database name
      const bindingMatch = errorMessage.match(/binding '([^']+)'/);
      if (bindingMatch) {
        analysis.bindingName = bindingMatch[1];
      }
    }

    return analysis;
  }

  /**
   * Create a new D1 database
   * @param {string} databaseName - Name for the new database
   * @returns {Promise<Object>} Creation result
   */
  async createD1Database(databaseName) {
    try {
      console.log(`   🔨 Creating D1 database: ${databaseName}`);
      
      const result = await this.executeWranglerCommand([
        'wrangler', 'd1', 'create', databaseName
      ]);

      if (result.success) {
        // Extract database ID from output
        const dbIdMatch = result.stdout.match(/database_id = "([^"]+)"/);
        const databaseId = dbIdMatch ? dbIdMatch[1] : null;

        return {
          success: true,
          database: {
            name: databaseName,
            id: databaseId
          },
          output: result.stdout
        };
      } else {
        throw new Error(result.stderr || result.stdout);
      }
    } catch (error) {
      throw new Error(`Failed to create D1 database '${databaseName}': ${error.message}`);
    }
  }

  /**
   * Update wrangler.toml with correct database binding information
   * @param {string} bindingName - Binding name to update
   * @param {string} databaseName - Database name
   * @param {string} databaseId - Database ID
   * @param {string} configPath - Path to wrangler.toml
   * @returns {Promise<Object>} Update result
   */
  async updateWranglerD1Binding(bindingName, databaseName, databaseId, configPath = 'wrangler.toml') {
    try {
      console.log(`   📝 Updating D1 binding: ${bindingName} -> ${databaseName} (${databaseId})`);

      // Create backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${configPath}.backup.${timestamp}`;
      const originalContent = readFileSync(configPath, 'utf8');
      writeFileSync(backupPath, originalContent);

      let updatedContent = originalContent;
      const bindings = this.extractD1Bindings(originalContent);
      
      // Find existing binding or add new one
      const existingBinding = bindings.find(b => b.binding === bindingName);
      
      if (existingBinding) {
        // Update existing binding
        const bindingRegex = new RegExp(
          `(\\[\\[d1_databases\\]\\][\\s\\S]*?binding\\s*=\\s*["']${bindingName}["'][\\s\\S]*?)database_name\\s*=\\s*["'][^"']*["']`,
          'g'
        );
        updatedContent = updatedContent.replace(bindingRegex, `$1database_name = "${databaseName}"`);

        const idRegex = new RegExp(
          `(\\[\\[d1_databases\\]\\][\\s\\S]*?binding\\s*=\\s*["']${bindingName}["'][\\s\\S]*?)database_id\\s*=\\s*["'][^"']*["']`,
          'g'
        );
        updatedContent = updatedContent.replace(idRegex, `$1database_id = "${databaseId}"`);
      } else {
        // Add new binding
        const newBinding = `
[[d1_databases]]
binding = "${bindingName}"
database_name = "${databaseName}"
database_id = "${databaseId}"
`;
        updatedContent += newBinding;
      }

      writeFileSync(configPath, updatedContent);

      return {
        success: true,
        backupPath,
        binding: {
          name: bindingName,
          database_name: databaseName,
          database_id: databaseId
        }
      };

    } catch (error) {
      throw new Error(`Failed to update D1 binding: ${error.message}`);
    }
  }

  /**
   * Handle D1 binding errors with interactive recovery options
   * @param {string} error - Error message
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async handleD1BindingError(error, context = {}) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const analysis = this.analyzeD1Error(errorMessage);

    if (!analysis.isD1Error || !analysis.canRecover) {
      return {
        handled: false,
        reason: analysis.isD1Error ? 'Cannot recover from this D1 error type' : 'Not a D1 error'
      };
    }

    console.log('\n🔧 D1 Database Error Recovery');
    console.log('=============================');
    console.log(`   Error Type: ${analysis.errorType}`);
    console.log(`   Database: ${analysis.databaseName || 'Unknown'}`);
    console.log(`   Suggestion: ${analysis.suggestion}`);

    const databaseName = analysis.databaseName;
    if (!databaseName) {
      return {
        handled: true,
        action: 'cancelled',
        reason: 'Could not extract database name from error'
      };
    }

    // Check if database exists
    const existsResult = await this.checkD1DatabaseExists(databaseName);

    if (existsResult.exists) {
      return await this.updateBindingFlow(databaseName, context);
    } else {
      return await this.createMissingDatabaseFlow(databaseName, context);
    }
  }

  /**
   * Flow to create a missing database
   * @param {string} databaseName - Name of the database to create
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Creation flow result
   */
  async createMissingDatabaseFlow(databaseName, context) {
    console.log(`\n❌ Database '${databaseName}' not found`);
    
    const availableResult = await this.checkD1DatabaseExists('');
    
    if (availableResult.availableDatabases && availableResult.availableDatabases.length > 0) {
      console.log('\n📋 Available databases:');
      availableResult.availableDatabases.forEach((db, index) => {
        console.log(`   ${index + 1}. ${db.name} (${db.id})`);
      });

      const choices = [
        `Create new database '${databaseName}'`,
        'Select from existing databases',
        'Cancel and fix manually'
      ];

      const choice = await askChoice('What would you like to do?', choices, 0);

      switch (choice) {
        case 0:
          return await this.createNewDatabaseAndConfigure(databaseName, context);
        case 1:
          return await this.showAvailableDatabasesFlow(context);
        case 2:
          return { handled: true, action: 'cancelled' };
      }
    } else {
      const shouldCreate = await askYesNo(
        `Create new D1 database '${databaseName}'?`,
        true
      );

      if (shouldCreate) {
        return await this.createNewDatabaseAndConfigure(databaseName, context);
      } else {
        return { handled: true, action: 'cancelled' };
      }
    }
  }

  /**
   * Create new database and configure binding
   */
  async createNewDatabaseAndConfigure(databaseName, context) {
    try {
      const createResult = await this.createD1Database(databaseName);
      
      if (createResult.success && createResult.database.id) {
        // Update wrangler.toml with new database info
        const bindingName = databaseName; // Use database name as binding name
        await this.updateWranglerD1Binding(
          bindingName,
          databaseName,
          createResult.database.id,
          context.configPath || 'wrangler.toml'
        );

        return {
          handled: true,
          action: 'created_and_configured',
          databaseName,
          databaseId: createResult.database.id,
          bindingName
        };
      } else {
        throw new Error('Database creation did not return expected ID');
      }
    } catch (error) {
      return {
        handled: true,
        action: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Flow to show available databases for selection
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Selection flow result
   */
  async showAvailableDatabasesFlow(context) {
    try {
      const availableResult = await this.checkD1DatabaseExists('');
      
      if (!availableResult.availableDatabases || availableResult.availableDatabases.length === 0) {
        console.log('   ⚠️ No existing databases found');
        return { handled: true, action: 'no_databases_available' };
      }

      const dbChoices = availableResult.availableDatabases.map(db => 
        `${db.name} (${db.id})`
      );
      dbChoices.push('Cancel');

      const dbChoice = await askChoice(
        'Select a database to use:',
        dbChoices
      );

      if (dbChoice === dbChoices.length - 1) {
        return { handled: true, action: 'cancelled' };
      }

      const selectedDb = availableResult.availableDatabases[dbChoice];
      const bindingName = selectedDb.name; // Use database name as binding name

      // Update wrangler.toml
      await this.updateWranglerD1Binding(
        bindingName,
        selectedDb.name,
        selectedDb.id,
        context.configPath || 'wrangler.toml'
      );

      return {
        handled: true,
        action: 'database_selected_and_configured',
        databaseName: selectedDb.name,
        databaseId: selectedDb.id,
        bindingName
      };

    } catch (error) {
      return {
        handled: true,
        action: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Flow to update binding configuration
   * @param {string} originalName - Original database name from error
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Update flow result
   */
  async updateBindingFlow(originalName, context) {
    console.log(`\n✅ Database '${originalName}' exists but binding may be misconfigured`);

    const shouldUpdate = await askYesNo(
      'Update the wrangler.toml binding configuration?',
      true
    );

    if (!shouldUpdate) {
      return { handled: true, action: 'cancelled' };
    }

    try {
      const existsResult = await this.checkD1DatabaseExists(originalName);
      const database = existsResult.database;

      await this.updateWranglerD1Binding(
        originalName, // Use original name as binding name
        database.name,
        database.id,
        context.configPath || 'wrangler.toml'
      );

      return {
        handled: true,
        action: 'binding_updated',
        databaseName: database.name,
        databaseId: database.id,
        bindingName: originalName
      };

    } catch (error) {
      return {
        handled: true,
        action: 'failed',
        error: error.message
      };
    }
  }

  /**
   * List all available D1 databases
   * @returns {Promise<Array>} Array of database objects
   */
  async listD1Databases() {
    try {
      const result = await this.executeWranglerCommand(['wrangler', 'd1', 'list']);
      
      if (!result.success) {
        throw new Error(`Failed to list D1 databases: ${result.stderr}`);
      }

      const databases = [];
      const lines = result.stdout.split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.includes('Database ID') && !line.includes('---')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            databases.push({
              id: parts[0],
              name: parts[1]
            });
          }
        }
      }

      return databases;
    } catch (error) {
      throw new Error(`Failed to list D1 databases: ${error.message}`);
    }
  }

  /**
   * Get comprehensive D1 status for a configuration
   * @param {string} configPath - Path to wrangler.toml
   * @returns {Promise<Object>} D1 status information
   */
  async getD1Status(configPath = 'wrangler.toml') {
    try {
      const configContent = readFileSync(configPath, 'utf8');
      const bindings = this.extractD1Bindings(configContent);
      const validation = await this.validateD1Bindings({ configPath });
      const availableDatabases = await this.listD1Databases();

      return {
        bindings,
        validation,
        availableDatabases,
        summary: {
          totalBindings: bindings.length,
          validBindings: validation.valid ? bindings.length : bindings.length - validation.missingDatabases.length,
          missingDatabases: validation.missingDatabases.length,
          availableDatabases: availableDatabases.length
        }
      };
    } catch (error) {
      return {
        error: error.message,
        bindings: [],
        validation: { valid: false, issues: [error.message] },
        availableDatabases: []
      };
    }
  }
}