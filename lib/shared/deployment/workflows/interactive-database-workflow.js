/**
 * Interactive Database Workflow Module
 * 
 * Provides reusable interactive database creation and configuration workflows.
 * Extracted from enterprise-deployment/master-deploy.js for modularity.
 * 
 * @module interactive-database-workflow
 */

import { askUser, askYesNo, askChoice } from '../../utils/interactive-prompts.js';
import { 
  databaseExists, 
  createDatabase, 
  deleteDatabase 
} from '../../cloudflare/ops.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Interactive Database Workflow
 * Handles database naming, existence checking, and creation with user interaction
 */
export class InteractiveDatabaseWorkflow {
  /**
   * @param {Object} options - Configuration options
   * @param {Array} options.rollbackActions - Array to track rollback actions
   * @param {boolean} options.dryRun - Dry run mode
   */
  constructor(options = {}) {
    this.rollbackActions = options.rollbackActions || [];
    this.dryRun = options.dryRun || false;
  }

  /**
   * Handle complete database setup workflow
   * 
   * @param {string} domain - Domain name for database
   * @param {string} environment - Deployment environment
   * @param {Object} options - Additional options
   * @param {string} [options.suggestedName] - Suggested database name
   * @param {boolean} [options.interactive=true] - Enable interactive prompts
   * @param {string} [options.apiToken] - Cloudflare API token for API-based operations
   * @param {string} [options.accountId] - Cloudflare account ID for API-based operations
   * @returns {Promise<Object>} Database configuration { name, id, created, reused }
   */
  async handleDatabaseSetup(domain, environment, options = {}) {
    console.log('\n🗄️ Database Configuration');
    console.log('=========================');

    // Generate default database name
    const suggestedName = options.suggestedName || `${domain}-auth-db`;
    
    // Get final database name
    const databaseName = await this.promptForDatabaseName(suggestedName, options.interactive);
    
    // Check if database exists
    const existingInfo = await this.checkExistingDatabase(databaseName);
    
    if (existingInfo.exists) {
      return await this.handleExistingDatabase(databaseName, existingInfo, options.interactive);
    } else {
      return await this.createNewDatabase(databaseName, options.interactive, {
        apiToken: options.apiToken,
        accountId: options.accountId
      });
    }
  }

  /**
   * Prompt user for database name
   * 
   * @param {string} suggested - Suggested database name
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<string>} Final database name
   */
  async promptForDatabaseName(suggested, interactive = true) {
    console.log(`\n📋 Generated database name: ${suggested}`);

    if (!interactive) {
      return suggested;
    }

    const useGeneratedName = await askYesNo(
      'Use this database name?',
      'y'
    );

    if (!useGeneratedName) {
      return await askUser(
        'Enter custom database name',
        suggested
      );
    }

    return suggested;
  }

  /**
   * Check if database exists and get its details
   * 
   * @param {string} name - Database name
   * @returns {Promise<Object>} { exists: boolean, id?: string, error?: string }
   */
  async checkExistingDatabase(name) {
    console.log('\n🔍 Checking for existing database...');
    
    try {
      const exists = await databaseExists(name);
      
      if (exists) {
        console.log(`   📋 Database '${name}' already exists`);
        
        // Extract database ID from the list command
        try {
          const dbListResult = await execAsync('npx wrangler d1 list');
          const lines = dbListResult.stdout.split('\n');
          
          for (const line of lines) {
            if (line.includes(name)) {
              const match = line.match(/([a-f0-9-]{36})/);
              if (match) {
                return {
                  exists: true,
                  id: match[1]
                };
              }
            }
          }
        } catch (error) {
          console.log('   ⚠️ Could not extract database ID');
        }
        
        return { exists: true };
      } else {
        console.log(`   ✅ Database '${name}' does not exist`);
        return { exists: false };
      }
    } catch (error) {
      console.log('   ⚠️ Could not check existing databases');
      return { 
        exists: false, 
        error: error.message 
      };
    }
  }

  /**
   * Handle workflow for existing database
   * 
   * @param {string} name - Database name
   * @param {Object} existingInfo - Information about existing database
   * @param {boolean} interactive - Enable interactive prompts
   * @returns {Promise<Object>} Database configuration
   */
  async handleExistingDatabase(name, existingInfo, interactive = true) {
    if (!interactive) {
      // Non-interactive mode: reuse existing
      console.log(`   ✅ Using existing database: ${name}`);
      return {
        name,
        id: existingInfo.id,
        created: false,
        reused: true
      };
    }

    const databaseChoice = await askChoice(
      'What would you like to do with the existing database?',
      [
        'Use the existing database (recommended)',
        'Create a new database with different name',
        'Delete existing and create new (DANGER: DATA LOSS)'
      ],
      0
    );

    switch (databaseChoice) {
      case 0: {
        // Use existing database
        if (existingInfo.id) {
          console.log(`   ✅ Using existing database ID: ${existingInfo.id}`);
        }
        return {
          name,
          id: existingInfo.id,
          created: false,
          reused: true
        };
      }
      
      case 1: {
        // Create new database with different name
        const newName = await askUser('Enter new database name');
        return await this.createNewDatabase(newName, interactive);
      }
      
      case 2: {
        // Delete and recreate
        const confirmDelete = await askYesNo(
          '⚠️ ARE YOU SURE? This will DELETE all data in the existing database!',
          'n'
        );
        
        if (!confirmDelete) {
          throw new Error('Database deletion cancelled');
        }

        console.log(`\n🗑️ Deleting existing database...`);
        await deleteDatabase(name);
        
        return await this.createNewDatabase(name, interactive);
      }
      
      default:
        throw new Error('Invalid database choice');
    }
  }

  /**
   * Create a new database
   * 
   * @param {string} name - Database name
   * @param {boolean} interactive - Enable interactive prompts
   * @param {Object} credentials - Cloudflare API credentials
   * @param {string} [credentials.apiToken] - API token for API-based creation
   * @param {string} [credentials.accountId] - Account ID for API-based creation
   * @returns {Promise<Object>} Database configuration
   */
  async createNewDatabase(name, interactive = true, credentials = {}) {
    console.log(`\n🆕 Creating new database: ${name}`);
    
    // Check dry-run mode
    if (this.dryRun) {
      console.log('   🔍 DRY RUN: Would create database but skipping actual creation');
      return {
        name,
        id: 'dry-run-database-id',
        created: false,
        reused: false,
        dryRun: true
      };
    }
    
    // Log which method will be used
    if (credentials.apiToken && credentials.accountId) {
      console.log('   ℹ️  Using Cloudflare API for database creation');
    } else {
      console.log('   ℹ️  Using Wrangler CLI for database creation (no API credentials provided)');
    }
    
    if (interactive) {
      const confirmCreate = await askYesNo(
        'Proceed with database creation?',
        'y'
      );
      
      if (!confirmCreate) {
        throw new Error('Database creation cancelled');
      }
    }

    try {
      const databaseId = await createDatabase(name, {
        apiToken: credentials.apiToken,
        accountId: credentials.accountId
      });
      console.log(`   ✅ Database created with ID: ${databaseId}`);
      
      // Add to rollback actions
      this.rollbackActions.push({
        type: 'delete-database',
        name: name,
        command: `npx wrangler d1 delete ${name} --skip-confirmation`,
        description: `Delete database '${name}' created during deployment`
      });

      return {
        name,
        id: databaseId,
        created: true,
        reused: false
      };
    } catch (error) {
      throw new Error(`Database creation failed: ${error.message}`);
    }
  }

  /**
   * Get database configuration summary
   * 
   * @param {Object} dbConfig - Database configuration
   * @returns {string} Summary message
   */
  getSummary(dbConfig) {
    if (dbConfig.created) {
      return `✅ Database configured: ${dbConfig.name} (${dbConfig.id}) - CREATED`;
    } else if (dbConfig.reused) {
      return `✅ Database configured: ${dbConfig.name} (${dbConfig.id}) - REUSED`;
    } else {
      return `✅ Database configured: ${dbConfig.name} (${dbConfig.id})`;
    }
  }
}
