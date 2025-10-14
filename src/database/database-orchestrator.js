#!/usr/bin/env node

/**
 * Database Orchestrator Module
 * Enterprise-grade database management across multiple environments
 * 
 * Extracted from manage-migrations.ps1 and manage-data-cleanup.ps1 with enhancements
 */

import { exec } from 'child_process';
import { writeFile, access, mkdir, stat, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { databaseExists, createDatabase } from '../utils/cloudflare/index.js';

const execAsync = promisify(exec);

// ESM-compatible __dirname and __filename
let __dirname;
let __filename;

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = dirname(__filename);
} catch {
  // Fallback for test environments
  __dirname = process.cwd();
  __filename = __filename || 'database-orchestrator.js';
}

/**
 * Advanced Database Orchestrator
 * Manages database operations across development, staging, and production environments
 */
export class DatabaseOrchestrator {
  constructor(options = {}) {
    // Enhanced project root detection
    this.projectRoot = this.detectProjectRoot(options.projectRoot);
    this.dryRun = options.dryRun || false;
    this.options = options;
    this.config = null;
    
    // Environment configurations
    this.environments = {
      development: {
        name: 'development',
        isRemote: false,
        description: 'Local development database',
        defaultDatabase: 'local-db'
      },
      staging: {
        name: 'staging',
        isRemote: true,
        description: 'Staging environment database',
        requiresConfirmation: true
      },
      production: {
        name: 'production',
        isRemote: true,
        description: 'PRODUCTION environment database - USE WITH EXTREME CAUTION',
        requiresConfirmation: true,
        requiresBackup: true
      }
    };

    // Backup and audit configuration - only set paths if not running as dependency
    if (this.projectRoot) {
      // Use configurable paths from options or defaults
      const baseLogsDir = options.logsDir || 'logs';
      const baseBackupDir = options.backupDir || 'backups';
      
      this.backupPaths = {
        root: join(this.projectRoot, baseBackupDir, 'database'),
        migrations: join(this.projectRoot, baseBackupDir, 'migrations'),
        audit: join(this.projectRoot, baseLogsDir, 'database-audit.log')
      };

      this.migrationPaths = {
        root: join(this.projectRoot, 'migrations'),
        templates: join(this.projectRoot, 'migration-templates')
      };
    } else {
      // When used as dependency, disable file-based logging
      this.backupPaths = null;
      this.migrationPaths = null;
      console.log('📦 Running as dependency - file logging disabled');
    }

    this.initializeOrchestrator();
  }

  /**
   * Initialize database orchestrator
   */
  initializeOrchestrator() {
    console.log('🗄️ Database Orchestrator v1.0');
    console.log('==============================');
    if (this.projectRoot) {
      console.log(`📁 Project Root: ${this.projectRoot}`);
    } else {
      console.log('📦 Running as dependency - limited functionality');
    }
    console.log(`🔍 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE OPERATIONS'}`);
    console.log(`🔄 Retry Attempts: ${this.config ? this.config.retryAttempts : 3}`);
    console.log('');

    // Create necessary directories (only if not running as dependency)
    if (this.backupPaths && this.migrationPaths) {
      Object.values(this.backupPaths).forEach(path => {
        if (!path.endsWith('.log')) {
          this.ensureDirectory(path);
        }
      });

      this.ensureDirectory(this.migrationPaths.root);
      this.ensureDirectory(dirname(this.backupPaths.audit));
    }

    this.logAuditEvent('ORCHESTRATOR_INITIALIZED', 'SYSTEM', {
      mode: this.dryRun ? 'DRY_RUN' : 'LIVE',
      environments: Object.keys(this.environments)
    }).catch(err => console.warn('⚠️ Audit logging failed:', err.message));
  }

  /**
   * Initialize with framework configuration
   */
  async initialize() {
    try {
      // Import framework config for consistent timing and database settings
      const { frameworkConfig } = await import('../utils/framework-config.js');
      const timing = frameworkConfig.getTiming();
      const database = frameworkConfig.getDatabaseConfig();
      const configPaths = frameworkConfig.getPaths();
      
      this.config = {
        retryAttempts: this.options.retryAttempts || timing.retryAttempts,
        retryDelay: this.options.retryDelay || timing.retryDelay,
        executionTimeout: this.options.executionTimeout || database.executionTimeout,
        ...this.options
      };

      // Update paths if framework config is available and we have project root
      if (this.projectRoot) {
        this.backupPaths = {
          root: join(this.projectRoot, configPaths.backups, 'database'),
          migrations: join(this.projectRoot, configPaths.backups, 'migrations'),
          audit: join(this.projectRoot, configPaths.logs, 'database-audit.log')
        };
        
        console.log(`📁 Database orchestrator paths updated with framework config`);
        console.log(`   Backups: ${this.backupPaths.root}`);
        console.log(`   Audit: ${this.backupPaths.audit}`);
      }
      
    } catch (error) {
      console.warn(`⚠️  Could not load framework config: ${error.message}. Using existing paths.`);
    }

    // Ensure directories exist for logging and backups
    if (this.projectRoot && this.backupPaths) {
      await this.ensureDirectoryExists(this.backupPaths.root);
      await this.ensureDirectoryExists(this.backupPaths.migrations);
      await this.ensureDirectoryExists(dirname(this.backupPaths.audit));
    }
  }

  /**
   * Detect project root with enhanced logic
   */
  detectProjectRoot(providedRoot) {
    if (providedRoot) {
      console.log(`📁 Using provided project root: ${providedRoot}`);
      return providedRoot;
    }

    // Check if running as dependency (in node_modules)
    const isDependency = __dirname.includes('node_modules');
    
    if (isDependency) {
      console.log('📦 Running as dependency - limited functionality mode');
      return null;
    }

    // Try multiple strategies to detect project root
    let candidates = [
      // Standard clodo-framework structure
      join(__dirname, '..', '..'),
      // Alternative if running from dist/
      join(__dirname, '..', '..', '..'),
      // Current working directory
      process.cwd(),
      // Environment variable override
      process.env.FRAMEWORK_PROJECT_ROOT
    ];

    // Filter out null/undefined candidates
    candidates = candidates.filter(Boolean);

    for (const candidate of candidates) {
      if (this.isValidProjectRoot(candidate)) {
        console.log(`📁 Detected project root: ${candidate}`);
        return candidate;
      }
    }

    console.warn('⚠️  Could not detect project root. Some features may be limited.');
    return null;
  }

  /**
   * Check if a directory appears to be a valid project root
   */
  isValidProjectRoot(path) {
    try {
      // Check for common project indicators
      const indicators = [
        'package.json',
        'validation-config.json',
        'src',
        'bin'
      ];

      const hasIndicators = indicators.some(indicator => 
        existsSync(join(path, indicator))
      );

      return hasIndicators;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`❌ Failed to create directory ${dirPath}: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Apply migrations across multiple environments with coordination
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration results
   */
  async applyMigrationsAcrossEnvironments(options = {}) {
    const {
      environments = ['development', 'staging', 'production'],
      domainConfigs = [],
      skipBackup = false,
      continueOnError = false
    } = options;

    console.log('🔄 Cross-Environment Migration Orchestration');
    console.log('===========================================');
    console.log(`🌍 Environments: ${environments.join(', ')}`);
    console.log(`📋 Domains: ${domainConfigs.length} configured`);
    console.log('');

    const results = {
      orchestrationId: this.generateOrchestrationId(),
      environments: {},
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      startTime: new Date()
    };

    try {
      for (const env of environments) {
        if (!this.environments[env]) {
          console.log(`⚠️ Unknown environment: ${env}, skipping`);
          continue;
        }

        console.log(`\n🌍 Processing ${env} environment...`);
        results.summary.total++;

        try {
          // Create backup if required
          if (this.environments[env].requiresBackup && !skipBackup) {
            await this.createEnvironmentBackup(env, domainConfigs);
          }

          // Apply migrations for environment
          const envResult = await this.applyEnvironmentMigrations(env, domainConfigs, options);
          
          results.environments[env] = {
            status: 'completed',
            ...envResult
          };
          
          results.summary.successful++;
          console.log(`✅ ${env} environment completed successfully`);

        } catch (error) {
          console.error(`❌ ${env} environment failed: ${error.message}`);
          
          results.environments[env] = {
            status: 'failed',
            error: error.message,
            timestamp: new Date()
          };
          
          results.summary.failed++;

          if (!continueOnError) {
            throw new Error(`Migration failed in ${env} environment: ${error.message}`);
          }
        }
      }

      results.endTime = new Date();
      results.summary.duration = (results.endTime - results.startTime) / 1000;

      await this.logAuditEvent('MIGRATION_ORCHESTRATION_COMPLETED', 'ALL', results.summary);

      console.log('\n📊 MIGRATION ORCHESTRATION SUMMARY');
      console.log('==================================');
      console.log(`✅ Successful: ${results.summary.successful}`);
      console.log(`❌ Failed: ${results.summary.failed}`);
      console.log(`⏸️ Skipped: ${results.summary.skipped}`);
      console.log(`⏱️ Duration: ${results.summary.duration.toFixed(1)}s`);

      return results;

    } catch (error) {
      await this.logAuditEvent('MIGRATION_ORCHESTRATION_FAILED', 'ALL', { error: error.message });
      throw error;
    }
  }

  /**
   * Apply migrations to specific environment
   * @param {string} environment - Environment name
   * @param {Array} domainConfigs - Domain configurations
   * @returns {Promise<Object>} Environment migration result
   */
  async applyEnvironmentMigrations(environment, domainConfigs) {
    const envConfig = this.environments[environment];
    const results = {
      environment,
      databases: {},
      migrationsApplied: 0,
      startTime: new Date()
    };

    console.log(`   📋 Environment: ${envConfig.description}`);
    console.log(`   🌐 Remote: ${envConfig.isRemote ? 'Yes' : 'No'}`);

    // Process each domain's databases
    if (domainConfigs.length > 0) {
      for (const domainConfig of domainConfigs) {
        const dbConfig = domainConfig.databases?.[environment];
        if (!dbConfig) {
          console.log(`   ⚠️ No ${environment} database config for ${domainConfig.name}`);
          continue;
        }

        try {
          const dbResult = await this.applyDatabaseMigrations(
            dbConfig.name,
            'DB', // bindingName
            environment,
            envConfig.isRemote
          );
          
          results.databases[dbConfig.name] = dbResult;
          results.migrationsApplied += dbResult.migrationsApplied || 0;
          
        } catch (error) {
          console.error(`   ❌ Database ${dbConfig.name} migration failed: ${error.message}`);
          results.databases[dbConfig.name] = {
            status: 'failed',
            error: error.message
          };
          throw error;
        }
      }
    } else {
      // Apply to default database
      const defaultDb = envConfig.defaultDatabase || 'default-db';
      const dbResult = await this.applyDatabaseMigrations(
        defaultDb,
        'DB', // bindingName
        environment,
        envConfig.isRemote
      );
      
      results.databases[defaultDb] = dbResult;
      results.migrationsApplied = dbResult.migrationsApplied || 0;
    }

    results.endTime = new Date();
    results.duration = (results.endTime - results.startTime) / 1000;

    await this.logAuditEvent('ENVIRONMENT_MIGRATION_COMPLETED', environment, {
      databases: Object.keys(results.databases),
      migrationsApplied: results.migrationsApplied,
      duration: results.duration
    });

    return results;
  }

  /**
   * Apply migrations to specific database
   * @param {string} databaseName - Database name (for display/logging)
   * @param {string} bindingName - Wrangler binding name (from wrangler.toml, default 'DB')
   * @param {string} environment - Environment
   * @param {boolean} isRemote - Whether database is remote
   * @returns {Promise<Object>} Database migration result
   */
  async applyDatabaseMigrations(databaseName, bindingName = 'DB', environment, isRemote) {
    console.log(`   � Applying migrations to ${databaseName}...`);

    if (this.dryRun) {
      console.log(`     🔍 DRY RUN: Would apply migrations to ${databaseName} (binding: ${bindingName})`);
      return {
        status: 'dry-run',
        databaseName,
        bindingName,
        environment,
        migrationsApplied: 0
      };
    }

    try {
      // Validate database exists before attempting migrations
      const exists = await databaseExists(databaseName);
      if (!exists) {
        throw new Error(
          `Database ${databaseName} does not exist. ` +
          `Database must be created before applying migrations.`
        );
      }
      
      console.log(`     ✅ Database ${databaseName} validated`);

      // Use DATABASE name for wrangler command
      const command = this.buildMigrationCommand(databaseName, environment, isRemote);
      console.log(`     📋 Migration command: ${command}`);
      console.log(`     📁 Command will run from: ${this.projectRoot}`);
      console.log(`     📁 Current working directory: ${process.cwd()}`);

      const output = await this.executeWithRetry(command, 120000, this.projectRoot); // 2 minute timeout
      
      // Parse migration output
      const migrationsApplied = this.parseMigrationOutput(output);
      
      console.log(`     ✅ Applied ${migrationsApplied} migrations to ${databaseName}`);
      
      await this.logAuditEvent('DATABASE_MIGRATION_APPLIED', environment, {
        databaseName,
        bindingName,
        migrationsApplied,
        isRemote
      });

      return {
        status: 'completed',
        databaseName,
        bindingName,
        environment,
        migrationsApplied,
        output: output.substring(0, 500) // Truncate for storage
      };

    } catch (error) {
      await this.logAuditEvent('DATABASE_MIGRATION_FAILED', environment, {
        databaseName,
        bindingName,
        error: error.message
      });
      
      throw new Error(`Migration failed for ${databaseName}: ${error.message}`);
    }
  }

  /**
   * Create comprehensive backup across environments
   * @param {string} environment - Environment to backup
   * @param {Array} domainConfigs - Domain configurations
   * @returns {Promise<Object>} Backup results
   */
  async createEnvironmentBackup(environment, domainConfigs) {
    console.log(`   💾 Creating ${environment} environment backup...`);
    
    const backupId = this.generateBackupId(environment);
    const backupDir = join(this.backupPaths.root, environment, backupId);
    this.ensureDirectory(backupDir);

    const backupResults = {
      backupId,
      environment,
      backupDir,
      databases: {},
      startTime: new Date()
    };

    try {
      if (domainConfigs.length > 0) {
        for (const domainConfig of domainConfigs) {
          const dbConfig = domainConfig.databases?.[environment];
          if (dbConfig && dbConfig.id) {
            try {
              const dbBackup = await this.createDatabaseBackup(
                dbConfig.name,
                environment,
                backupDir
              );
              backupResults.databases[dbConfig.name] = dbBackup;
            } catch (error) {
              console.log(`     ⚠️ Backup failed for ${dbConfig.name}: ${error.message}`);
              backupResults.databases[dbConfig.name] = {
                status: 'failed',
                error: error.message
              };
            }
          }
        }
      }

      backupResults.endTime = new Date();
      backupResults.duration = (backupResults.endTime - backupResults.startTime) / 1000;

      // Save backup manifest
      const manifestPath = join(backupDir, 'backup-manifest.json');
      await writeFile(manifestPath, JSON.stringify(backupResults, null, 2));

      await this.logAuditEvent('ENVIRONMENT_BACKUP_CREATED', environment, {
        backupId,
        databases: Object.keys(backupResults.databases),
        duration: backupResults.duration
      });

      console.log(`     ✅ Environment backup completed: ${backupId}`);
      return backupResults;

    } catch (error) {
      await this.logAuditEvent('ENVIRONMENT_BACKUP_FAILED', environment, {
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create backup of specific database
   * @param {string} databaseName - Database name
   * @param {string} environment - Environment
   * @param {string} backupDir - Backup directory
   * @returns {Promise<Object>} Database backup result
   */
  async createDatabaseBackup(databaseName, environment, backupDir) {
    const backupFile = join(backupDir, `${databaseName}-${environment}.sql`);
    
    if (this.dryRun) {
      console.log(`     🔍 DRY RUN: Would backup ${databaseName} to ${backupFile}`);
      return { status: 'dry-run', backupFile };
    }

    try {
      const isRemote = this.environments[environment].isRemote;
      const command = this.buildBackupCommand(databaseName, environment, backupFile, isRemote);
      
      await this.executeWithRetry(command, 300000, this.projectRoot); // 5 minute timeout for backups
      
      if (existsSync(backupFile)) {
        const stats = await stat(backupFile);
        console.log(`     💾 Backup created: ${backupFile} (${(stats.size / 1024).toFixed(1)}KB)`);
        
        return {
          status: 'completed',
          backupFile,
          sizeKB: (stats.size / 1024).toFixed(1),
          timestamp: new Date()
        };
      } else {
        throw new Error('Backup file was not created');
      }

    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  /**
   * Perform safe data cleanup with backup and confirmation
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup results
   */
  async performSafeDataCleanup(options = {}) {
    const {
      environment = 'development',
      domainConfigs = [],
      cleanupType = 'partial', // 'partial', 'full', 'logs-only'
      skipBackup = false,
      force = false
    } = options;

    console.log('🧹 Safe Data Cleanup Operation');
    console.log('==============================');
    console.log(`🌍 Environment: ${environment}`);
    console.log(`🧽 Cleanup Type: ${cleanupType}`);
    console.log(`💾 Skip Backup: ${skipBackup}`);
    console.log('');

    const envConfig = this.environments[environment];
    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    // Safety confirmation for production
    if (environment === 'production' && !force) {
      const confirmed = await this.confirmDangerousOperation(
        `${cleanupType} data cleanup in PRODUCTION`,
        'This will permanently delete data and cannot be undone'
      );
      
      if (!confirmed) {
        console.log('❌ Operation cancelled by user');
        return { status: 'cancelled', reason: 'User declined confirmation' };
      }
    }

    const cleanupResults = {
      cleanupId: this.generateCleanupId(environment),
      environment,
      cleanupType,
      operations: {},
      startTime: new Date()
    };

    try {
      // Create backup if required
      if (!skipBackup && envConfig.requiresBackup) {
        const backupResult = await this.createEnvironmentBackup(environment, domainConfigs);
        cleanupResults.backup = backupResult;
      }

      // Perform cleanup operations
      for (const domainConfig of domainConfigs) {
        const dbConfig = domainConfig.databases?.[environment];
        if (dbConfig) {
          try {
            const cleanupResult = await this.performDatabaseCleanup(
              dbConfig.name,
              environment,
              cleanupType
            );
            cleanupResults.operations[dbConfig.name] = cleanupResult;
          } catch (error) {
            console.error(`❌ Cleanup failed for ${dbConfig.name}: ${error.message}`);
            cleanupResults.operations[dbConfig.name] = {
              status: 'failed',
              error: error.message
            };
          }
        }
      }

      cleanupResults.endTime = new Date();
      cleanupResults.duration = (cleanupResults.endTime - cleanupResults.startTime) / 1000;

      await this.logAuditEvent('DATA_CLEANUP_COMPLETED', environment, {
        cleanupId: cleanupResults.cleanupId,
        cleanupType,
        operations: Object.keys(cleanupResults.operations),
        duration: cleanupResults.duration
      });

      console.log('\n✅ Data cleanup completed successfully');
      return cleanupResults;

    } catch (error) {
      await this.logAuditEvent('DATA_CLEANUP_FAILED', environment, {
        cleanupId: cleanupResults.cleanupId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform cleanup on specific database
   * @param {string} databaseName - Database name
   * @param {string} environment - Environment
   * @param {string} cleanupType - Type of cleanup
   * @returns {Promise<Object>} Cleanup result
   */
  async performDatabaseCleanup(databaseName, environment, cleanupType) {
    console.log(`   🧹 Cleaning ${databaseName} (${cleanupType})...`);

    if (this.dryRun) {
      console.log(`     🔍 DRY RUN: Would perform ${cleanupType} cleanup on ${databaseName}`);
      return { status: 'dry-run', cleanupType };
    }

    const commands = this.getCleanupCommands(cleanupType, environment);
    let executedCommands = 0;

    try {
      for (const command of commands) {
        const fullCommand = this.buildDatabaseCommand(command, databaseName, environment);
        await this.executeWithRetry(fullCommand, 60000, this.projectRoot);
        executedCommands++;
      }

      console.log(`     ✅ Cleanup completed: ${executedCommands} operations`);
      
      return {
        status: 'completed',
        cleanupType,
        operationsExecuted: executedCommands,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Database cleanup failed after ${executedCommands} operations: ${error.message}`);
    }
  }

  // Command builders and utility methods

  buildMigrationCommand(databaseName, environment, isRemote) {
    // Use DATABASE name, NOT binding name
    // Wrangler expects: "npx wrangler d1 migrations apply database-name --local"
    // NOT: "npx wrangler d1 migrations apply binding-name --local"
    let command = `npx wrangler d1 migrations apply ${databaseName}`;
    
    // For remote environments, add --remote flag
    // For local development, use --local
    if (isRemote) {
      command += ` --remote`;
    } else {
      command += ` --local`;
    }
    
    return command;
  }

  buildBackupCommand(databaseName, environment, backupFile, isRemote) {
    const remoteFlag = isRemote ? '--remote' : '--local';
    return `npx wrangler d1 export ${databaseName} --env ${environment} ${remoteFlag} --output ${backupFile}`;
  }

  buildDatabaseCommand(sqlCommand, databaseName, environment) {
    const envConfig = this.environments[environment];
    const remoteFlag = envConfig.isRemote ? '--remote' : '--local';
    return `npx wrangler d1 execute ${databaseName} --env ${environment} ${remoteFlag} --command "${sqlCommand}"`;
  }

  getCleanupCommands(cleanupType) {
    const commands = {
      'logs-only': [
        'DELETE FROM logs WHERE created_at < datetime("now", "-30 days");'
      ],
      'partial': [
        'DELETE FROM logs WHERE created_at < datetime("now", "-7 days");',
        'DELETE FROM sessions WHERE expires_at < datetime("now");',
        'UPDATE users SET last_cleanup = datetime("now") WHERE last_cleanup IS NULL;'
      ],
      'full': [
        'DELETE FROM logs;',
        'DELETE FROM sessions;',
        'DELETE FROM files;',
        'DELETE FROM user_profiles;',
        'DELETE FROM users;'
      ]
    };

    return commands[cleanupType] || commands['partial'];
  }

  parseMigrationOutput(output) {
    // Parse wrangler migration output to count applied migrations
    const matches = output.match(/Applied (\d+) migration/);
    return matches ? parseInt(matches[1]) : 0;
  }

  async executeWithRetry(command, timeout = null, workingDir = null) {
    const actualTimeout = timeout || (this.config ? this.config.executionTimeout : 30000);
    const maxAttempts = this.config ? this.config.retryAttempts : 3;
    const retryDelay = this.config ? this.config.retryDelay : 1000;
    const cwd = workingDir || this.projectRoot;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { stdout } = await execAsync(command, {
          encoding: 'utf8',
          timeout: actualTimeout,
          stdio: 'pipe',
          cwd: cwd
        });
        return stdout;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        console.log(`     ⚠️ Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async confirmDangerousOperation(operation, impact) {
    // In a real implementation, this would use a proper input library
    console.log(`\n⚠️ DANGER: ${operation}`);
    console.log(`Impact: ${impact}`);
    console.log('Type "YES" to confirm this operation:');
    
    // For now, return false to prevent accidental execution
    return false;
  }

  // Utility methods

  generateOrchestrationId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `orchestration-${timestamp}`;
  }

  generateBackupId(environment) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${environment}-${timestamp}`;
  }

  generateCleanupId(environment) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `cleanup-${environment}-${timestamp}`;
  }

  async ensureDirectory(path) {
    try {
      await access(path);
    } catch {
      await mkdir(path, { recursive: true });
    }
  }

  async logAuditEvent(event, environment, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      environment,
      details,
      user: process.env.USER || process.env.USERNAME || 'system'
    };

    // Skip logging if running as dependency (no file access)
    if (!this.backupPaths) {
      console.log(`📊 Audit: ${event} (${environment})`);
      return;
    }

    try {
      // Ensure the audit log directory exists
      await this.ensureDirectory(dirname(this.backupPaths.audit));
      
      const logLine = JSON.stringify(logEntry) + '\n';
      
      if (existsSync(this.backupPaths.audit)) {
        await appendFile(this.backupPaths.audit, logLine);
      } else {
        await writeFile(this.backupPaths.audit, logLine);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to log audit event: ${error.message}`);
    }
  }
}

export default DatabaseOrchestrator;