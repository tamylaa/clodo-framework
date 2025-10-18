/**
 * Deployment Database Manager Module
 * Handles D1 database operations specifically during service deployment context.
 * 
 * This module is focused on single-service deployment operations and works in coordination
 * with the enterprise-db-manager.js for broader portfolio management tasks.
 * 
 * Scope:
 * - D1 database validation during deployment
 * - Database configuration for specific service deployments  
 * - Deployment-time migrations and health checks
 * - Integration with deployment orchestration
 * 
 * For broader database management (monitoring, backups, multi-domain operations),
 * use the enterprise-db-manager.js CLI tool.
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import { askYesNo, askChoice, askUser } from '../shared/utils/interactive-prompts.js';
import { 
  databaseExists, 
  createDatabase, 
  getDatabaseId, 
  runMigrations,
  executeSql,
  listDatabases,
  deleteDatabase 
} from '../shared/cloudflare/ops.js';

const execAsync = promisify(exec);

/**
 * Manages all D1 database operations including creation, validation,
 * migration management, and health checks
 */
export class DeploymentDatabaseManager {
  constructor(options = {}) {
    this.options = options;
    this.state = {
      databasesChecked: [],
      migrationsRun: false,
      validationComplete: false
    };
  }

  /**
   * Handle comprehensive database setup and configuration
   */
  async handleDatabase(config) {
    console.log('\n🗄️ Database Configuration');
    console.log('=========================');

    // Generate database name if not provided
    if (!config.database.name) {
      config.database.name = `${config.domain}-auth-db`;
    }

    console.log(`\n📋 Database name: ${config.database.name}`);

    const useGeneratedName = await askYesNo('Use this database name?', true);
    if (!useGeneratedName) {
      config.database.name = await askUser(
        'Enter custom database name',
        config.database.name
      );
    }

    // Check for existing database
    console.log('\n🔍 Checking for existing database...');
    
    try {
      const dbExists = await databaseExists(config.database.name);
      
      if (dbExists) {
        return await this.handleExistingDatabase(config);
      } else {
        return await this.handleNewDatabase(config);
      }
    } catch (error) {
      throw new Error(`Database check failed: ${error.message}`);
    }
  }

  /**
   * Handle existing database scenario
   */
  async handleExistingDatabase(config) {
    console.log(`   📋 Database '${config.database.name}' already exists`);
    
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
        return await this.useExistingDatabase(config);
      }
      case 1: {
        // Create new database with different name
        return await this.createNewDatabaseWithDifferentName(config);
      }
      case 2: {
        // Delete existing and create new
        return await this.deleteAndRecreateDatabase(config);
      }
    }
  }

  /**
   * Use existing database
   */
  async useExistingDatabase(config) {
    try {
      // Extract database ID from the list command output
      const dbListResult = await execAsync('npx wrangler d1 list');
      const lines = dbListResult.stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes(config.database.name)) {
          const match = line.match(/([a-f0-9-]{36})/);
          if (match) {
            config.database.id = match[1];
            console.log(`   ✅ Using existing database ID: ${config.database.id}`);
            break;
          }
        }
      }

      if (!config.database.id) {
        throw new Error('Could not extract database ID from existing database');
      }

      // Check if migrations should be run
      if (config.database.enableMigrations) {
        const runMigs = await askYesNo(
          'Run pending migrations on existing database?',
          true
        );
        
        if (runMigs) {
          await this.runDatabaseMigrations(config);
        }
      }

      return config.database;
    } catch (error) {
      throw new Error(`Failed to use existing database: ${error.message}`);
    }
  }

  /**
   * Create new database with different name
   */
  async createNewDatabaseWithDifferentName(config) {
    const newName = await askUser('Enter new database name');
    config.database.name = newName;
    config.database.createNew = true;
    
    return await this.handleNewDatabase(config);
  }

  /**
   * Delete existing database and create new one
   */
  async deleteAndRecreateDatabase(config) {
    const confirmDelete = await askYesNo(
      '⚠️ Are you ABSOLUTELY SURE? This will permanently delete ALL data!',
      false
    );
    
    if (!confirmDelete) {
      console.log('   ✅ Database deletion cancelled');
      return await this.handleExistingDatabase(config);
    }

    // Additional confirmation
    const doubleConfirm = await askUser(
      `Type "${config.database.name}" to confirm deletion`
    );
    
    if (doubleConfirm !== config.database.name) {
      console.log('   ❌ Database name mismatch. Deletion cancelled for safety.');
      return await this.handleExistingDatabase(config);
    }

    try {
      console.log('   🗑️ Deleting existing database...');
      await deleteDatabase(config.database.name);
      console.log('   ✅ Database deleted');
      
      // Now create new database
      return await this.handleNewDatabase(config);
    } catch (error) {
      throw new Error(`Database deletion failed: ${error.message}`);
    }
  }

  /**
   * Handle new database creation
   */
  async handleNewDatabase(config) {
    console.log(`   ✅ Database name '${config.database.name}' is available`);
    
    const shouldCreate = await askYesNo(
      `Create new D1 database '${config.database.name}'?`,
      true
    );

    if (!shouldCreate) {
      throw new Error('Database creation cancelled by user');
    }

    try {
      console.log('   🔨 Creating database...');
      const createResult = await createDatabase(config.database.name);
      
      if (createResult && createResult.success) {
        config.database.id = createResult.id || await getDatabaseId(config.database.name);
        console.log(`   ✅ Database created successfully: ${config.database.id}`);
        
        // Run initial migrations if enabled
        if (config.database.enableMigrations) {
          const runInitialMigrations = await askYesNo(
            'Run initial database migrations?',
            true
          );
          
          if (runInitialMigrations) {
            await this.runDatabaseMigrations(config);
          }
        }
        
        return config.database;
      } else {
        throw new Error('Database creation returned unsuccessful result');
      }
    } catch (error) {
      console.log(`   ❌ Database creation failed: ${error.message}`);
      throw new Error(`Database creation failed: ${error.message}`);
    }
  }

  /**
   * Run database migrations
   */
  async runDatabaseMigrations(config) {
    console.log('\n🔄 Running database migrations...');
    
    try {
      await runMigrations(config.database.name);
      console.log('   ✅ Database migrations completed');
      this.state.migrationsRun = true;
    } catch (error) {
      console.log(`   ⚠️ Migration warning: ${error.message}`);
      
      const continueAnyway = await askYesNo(
        'Continue deployment despite migration issues?',
        false
      );
      
      if (!continueAnyway) {
        throw new Error(`Migration failed: ${error.message}`);
      }
      
      console.log('   ⚠️ Continuing with migration warnings');
    }
  }

  /**
   * Validate database configuration and connectivity
   */
  async validateDatabaseConfiguration(config) {
    console.log('\n🔍 Validating database configuration...');
    
    const validationResults = {
      exists: false,
      accessible: false,
      migrationsApplied: false,
      issues: []
    };

    try {
      // Check if database exists
      const exists = await databaseExists(config.database.name);
      validationResults.exists = exists;
      
      if (!exists) {
        validationResults.issues.push(`Database '${config.database.name}' does not exist`);
        return validationResults;
      }

      console.log(`   ✅ Database '${config.database.name}' exists`);

      // Test basic connectivity
      try {
        await executeSql(config.database.name, 'SELECT 1 as test');
        validationResults.accessible = true;
        console.log('   ✅ Database is accessible');
      } catch (error) {
        validationResults.issues.push(`Database connectivity test failed: ${error.message}`);
      }

      // Check migrations status if enabled
      if (config.database.enableMigrations) {
        try {
          const migrationsResult = await execAsync(
            `npx wrangler d1 migrations list ${config.database.name}`
          );
          
          if (migrationsResult.stdout.includes('Applied')) {
            validationResults.migrationsApplied = true;
            console.log('   ✅ Migrations are applied');
          } else {
            validationResults.issues.push('No migrations have been applied');
          }
        } catch (error) {
          validationResults.issues.push(`Migration status check failed: ${error.message}`);
        }
      }

    } catch (error) {
      validationResults.issues.push(`Database validation failed: ${error.message}`);
    }

    this.state.validationComplete = true;
    this.state.databasesChecked.push({
      name: config.database.name,
      results: validationResults,
      timestamp: new Date().toISOString()
    });

    return validationResults;
  }

  /**
   * Perform database health check
   */
  async performHealthCheck(config) {
    console.log('\n🏥 Database Health Check');
    console.log('========================');

    const healthResults = {
      overall: 'unknown',
      connectivity: false,
      responseTime: 0,
      tableCount: 0,
      issues: []
    };

    const startTime = Date.now();

    try {
      // Test basic query
      await executeSql(config.database.name, 'SELECT 1 as health_check');
      healthResults.connectivity = true;
      healthResults.responseTime = Date.now() - startTime;
      
      console.log(`   ✅ Database responding (${healthResults.responseTime}ms)`);

      // Count tables
      try {
        const tablesResult = await executeSql(
          config.database.name, 
          "SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table'"
        );
        
        // Parse table count from result
        if (tablesResult && tablesResult.results && tablesResult.results.length > 0) {
          healthResults.tableCount = tablesResult.results[0].table_count || 0;
          console.log(`   📊 Database contains ${healthResults.tableCount} tables`);
        }
      } catch (error) {
        healthResults.issues.push(`Table count check failed: ${error.message}`);
      }

      // Overall health determination
      if (healthResults.connectivity && healthResults.responseTime < 5000) {
        healthResults.overall = 'healthy';
      } else if (healthResults.connectivity) {
        healthResults.overall = 'slow';
      } else {
        healthResults.overall = 'unhealthy';
      }

    } catch (error) {
      healthResults.overall = 'unhealthy';
      healthResults.responseTime = Date.now() - startTime;
      healthResults.issues.push(`Health check failed: ${error.message}`);
      console.log(`   ❌ Database health check failed: ${error.message}`);
    }

    return healthResults;
  }

  /**
   * Get database management summary
   */
  getDatabaseSummary() {
    return {
      databasesManaged: this.state.databasesChecked.length,
      migrationsRun: this.state.migrationsRun,
      validationComplete: this.state.validationComplete,
      lastCheck: this.state.databasesChecked.length > 0 
        ? this.state.databasesChecked[this.state.databasesChecked.length - 1].timestamp
        : null
    };
  }

  /**
   * List all available databases
   */
  async listAvailableDatabases() {
    try {
      console.log('\n📋 Available D1 Databases:');
      const databases = await listDatabases();
      
      if (databases && databases.length > 0) {
        databases.forEach((db, index) => {
          console.log(`   ${index + 1}. ${db.name} (${db.id})`);
        });
        return databases;
      } else {
        console.log('   ℹ️ No D1 databases found in your account');
        return [];
      }
    } catch (error) {
      console.log(`   ❌ Failed to list databases: ${error.message}`);
      return [];
    }
  }

  /**
   * Interactive database selection from existing databases
   */
  async selectFromExistingDatabases(config) {
    const databases = await this.listAvailableDatabases();
    
    if (databases.length === 0) {
      const createNew = await askYesNo(
        'No existing databases found. Create a new one?',
        true
      );
      
      if (createNew) {
        return await this.handleNewDatabase(config);
      } else {
        throw new Error('Database selection cancelled');
      }
    }

    const dbOptions = databases.map(db => `${db.name} (${db.id})`);
    dbOptions.push('Create new database');

    const choice = await askChoice(
      'Select a database to use:',
      dbOptions
    );

    if (choice === dbOptions.length - 1) {
      // Create new database option selected
      return await this.handleNewDatabase(config);
    }

    // Existing database selected
    const selectedDb = databases[choice];
    config.database.name = selectedDb.name;
    config.database.id = selectedDb.id;
    
    console.log(`   ✅ Selected database: ${selectedDb.name} (${selectedDb.id})`);
    
    // Check if migrations should be run
    if (config.database.enableMigrations) {
      const runMigrations = await askYesNo(
        'Run migrations on selected database?',
        false
      );
      
      if (runMigrations) {
        await this.runDatabaseMigrations(config);
      }
    }

    return config.database;
  }

  /**
   * Cleanup and rollback database operations
   */
  async rollbackDatabaseChanges(rollbackActions) {
    console.log('\n🔄 Rolling back database changes...');
    
    const databaseRollbacks = rollbackActions.filter(action => 
      action.type.includes('database') || action.type.includes('migration')
    );

    for (const action of databaseRollbacks) {
      try {
        console.log(`   🔄 ${action.description}`);
        
        switch (action.type) {
          case 'delete-database':
            await deleteDatabase(action.name);
            console.log(`     ✅ Database '${action.name}' deleted`);
            break;
            
          case 'rollback-migration':
            // Note: D1 doesn't support migration rollback, so we log this
            console.log(`     ⚠️ Migration rollback not supported by D1: ${action.migration}`);
            break;
            
          default:
            console.log(`     ⚠️ Unknown rollback action: ${action.type}`);
        }
      } catch (error) {
        console.log(`     ❌ Rollback failed: ${error.message}`);
      }
    }
  }
}