#!/usr/bin/env node

/**
 * Enterprise Database Manager CLI
 * 
 * Advanced database operations and management system for multi-environment 
 * database coordination across the entire portfolio using database orchestrator.
 * 
 * Database Features:
 * - Multi-environment database operations and coordination
 * - Safe migration execution with rollback capabilities
 * - Cross-domain database synchronization
 * - Advanced backup and restore operations
 * - Database health monitoring and performance tracking
 * - Schema validation and consistency checks
 * - Data integrity verification and repair
 * - Automated maintenance and optimization
 * - Comprehensive audit and compliance reporting
 * - Database disaster recovery management
 * 
 * @version 2.0.0 - Enterprise Edition
 */

import { program } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Enterprise module imports
import { DatabaseOrchestrator } from '@tamyla/lego-framework/database';
import { DeploymentAuditor } from '@tamyla/lego-framework/deployment';
import { CrossDomainCoordinator } from '@tamyla/lego-framework/orchestration';
import { ConfigurationCacheManager } from '@tamyla/lego-framework/utils/deployment';

class EnterpriseDatabaseManagerCLI {
  constructor() {
    this.version = '2.0.0';
    this.modules = {};
    this.dbConfig = this.loadDatabaseConfig();
  }

  /**
   * Initialize the CLI asynchronously
   */
  async initialize() {
    await this.initializeModules();
    this.setupCommands();
  }

  /**
   * Load database configuration
   */
  loadDatabaseConfig() {
    const configPath = join(process.cwd(), 'database.config.json');
    
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Failed to load database config, using defaults');
      }
    }

    return {
      environments: ['development', 'staging', 'production'],
      defaultEnvironment: 'production',
      safeMode: true,
      backupBeforeMigration: true,
      maxConcurrentOperations: 3,
      migrationTimeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      retentionPeriod: 90, // days
      auditLevel: 'detailed',
      complianceMode: false
    };
  }

  /**
   * Initialize enterprise modules
   */
  async initializeModules() {
    this.modules = {
      databaseOrchestrator: new DatabaseOrchestrator({
        enableSafeMode: this.dbConfig.safeMode,
        portfolioMode: true,
        maxConcurrentOperations: this.dbConfig.maxConcurrentOperations,
        migrationTimeout: this.dbConfig.migrationTimeout
      }),
      auditor: new DeploymentAuditor({
        auditLevel: this.dbConfig.auditLevel,
        databaseAudit: true
      }),
      coordinator: new CrossDomainCoordinator({
        portfolioName: 'database-portfolio'
      }),
      configCache: new ConfigurationCacheManager({
        enableRuntimeDiscovery: true,
        databaseTemplates: true
      })
    };

    // Initialize async components
    await this.modules.auditor.initialize();
    await this.modules.configCache.initialize();
  }

  /**
   * Setup CLI commands
   */
  setupCommands() {
    program
      .name('enterprise-db-manager')
      .description('Enterprise Database Management System - Advanced multi-environment database operations')
      .version(this.version);

    // Migration commands
    program
      .command('migrate <domain>')
      .description('Run database migrations for specific domain')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--create-db', 'create database if it doesn\'t exist')
      .option('--backup', 'create backup before migration')
      .option('--dry-run', 'show migrations without executing')
      .option('--force', 'force migration even with validation failures')
      .option('--rollback', 'rollback previous migration')
      .option('--target <version>', 'migrate to specific version')
      .action((domain, options) => this.migrateDomain(domain, options));

    program
      .command('migrate-all')
      .description('Run database migrations across entire portfolio')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('-f, --filter <pattern>', 'filter domains by pattern')
      .option('--exclude <pattern>', 'exclude domains matching pattern')
      .option('--parallel', 'run migrations in parallel')
      .option('--batch-size <size>', 'batch size for parallel operations', '3')
      .option('--safe-mode', 'enable extra safety checks')
      .option('--dry-run', 'show migrations without executing')
      .option('--rollback', 'rollback all migrations')
      .action((options) => this.migrateAll(options));

    program
      .command('migration-status [domain]')
      .description('Check migration status for domain or entire portfolio')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--format <format>', 'output format (table|json|yaml)', 'table')
      .option('--pending', 'show only pending migrations')
      .action((domain, options) => this.migrationStatus(domain, options));

    // Schema management
    program
      .command('schema-validate <domain>')
      .description('Validate database schema for domain')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--fix', 'attempt to fix schema issues')
      .option('--compare <env>', 'compare schema with another environment')
      .option('--report <format>', 'generate validation report (json|html)', 'json')
      .action((domain, options) => this.validateSchema(domain, options));

    program
      .command('schema-sync')
      .description('Synchronize database schemas across environments')
      .option('--source <env>', 'source environment', 'production')
      .option('--target <env>', 'target environment for sync')
      .option('-f, --filter <pattern>', 'filter domains by pattern')
      .option('--schema-only', 'sync schema only, not data')
      .option('--dry-run', 'show sync plan without executing')
      .option('--force', 'force sync even with conflicts')
      .action((options) => this.syncSchemas(options));

    program
      .command('schema-diff')
      .description('Compare database schemas between environments')
      .option('--source <env>', 'source environment', 'production')
      .option('--target <env>', 'target environment', 'staging')
      .option('-d, --domain <domain>', 'specific domain to compare')
      .option('--format <format>', 'output format (text|json|html)', 'text')
      .action((options) => this.schemaDiff(options));

    // Backup and restore
    program
      .command('backup <domain>')
      .description('Create database backup for domain')
      .option('-e, --env <environment>', 'source environment', this.dbConfig.defaultEnvironment)
      .option('--compress', 'compress backup files')
      .option('--encrypt', 'encrypt backup data')
      .option('--remote', 'store backup remotely')
      .option('--type <type>', 'backup type (full|schema|data)', 'full')
      .action((domain, options) => this.backupDomain(domain, options));

    program
      .command('backup-all')
      .description('Create backups for entire portfolio')
      .option('-e, --env <environment>', 'source environment', this.dbConfig.defaultEnvironment)
      .option('-f, --filter <pattern>', 'filter domains by pattern')
      .option('--parallel', 'run backups in parallel')
      .option('--compress', 'compress backup files')
      .option('--encrypt', 'encrypt backup data')
      .option('--type <type>', 'backup type (full|schema|data)', 'full')
      .action((options) => this.backupAll(options));

    program
      .command('restore <domain>')
      .description('Restore database from backup for domain')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--backup-id <id>', 'specific backup ID to restore')
      .option('--backup-file <file>', 'backup file to restore from')
      .option('--type <type>', 'restore type (full|schema|data)', 'full')
      .option('--force', 'force restore without confirmation')
      .action((domain, options) => this.restoreDomain(domain, options));

    program
      .command('list-backups [domain]')
      .description('List available backups for domain or entire portfolio')
      .option('-e, --env <environment>', 'environment filter')
      .option('--format <format>', 'output format (table|json)', 'table')
      .option('--days <days>', 'show backups from last N days', '30')
      .action((domain, options) => this.listBackups(domain, options));

    // Health and monitoring
    program
      .command('health [domain]')
      .description('Check database health for domain or entire portfolio')
      .option('-e, --env <environment>', 'environment to check', this.dbConfig.defaultEnvironment)
      .option('--detailed', 'show detailed health information')
      .option('--format <format>', 'output format (table|json|yaml)', 'table')
      .option('--performance', 'include performance metrics')
      .action((domain, options) => this.checkHealth(domain, options));

    program
      .command('monitor')
      .description('Start continuous database monitoring')
      .option('-e, --env <environment>', 'environment to monitor', this.dbConfig.defaultEnvironment)
      .option('--interval <ms>', 'monitoring interval', this.dbConfig.healthCheckInterval.toString())
      .option('--alert-webhook <url>', 'webhook URL for alerts')
      .option('--log-file <path>', 'log monitoring results to file')
      .option('--performance', 'include performance monitoring')
      .action((options) => this.startMonitoring(options));

    program
      .command('stats [domain]')
      .description('Get database statistics and metrics')
      .option('-e, --env <environment>', 'environment to analyze', this.dbConfig.defaultEnvironment)
      .option('--period <days>', 'analysis period in days', '7')
      .option('--format <format>', 'output format (table|json|html)', 'table')
      .option('--export <file>', 'export statistics to file')
      .action((domain, options) => this.getStats(domain, options));

    // Data management
    program
      .command('cleanup <domain>')
      .description('Clean up old data from domain database')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--days <days>', 'retention period in days', this.dbConfig.retentionPeriod.toString())
      .option('--table <table>', 'specific table to clean')
      .option('--dry-run', 'show what would be cleaned')
      .option('--backup', 'create backup before cleanup')
      .action((domain, options) => this.cleanupDomain(domain, options));

    program
      .command('cleanup-all')
      .description('Clean up old data across entire portfolio')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--days <days>', 'retention period in days', this.dbConfig.retentionPeriod.toString())
      .option('-f, --filter <pattern>', 'filter domains by pattern')
      .option('--parallel', 'run cleanup in parallel')
      .option('--dry-run', 'show what would be cleaned')
      .action((options) => this.cleanupAll(options));

    program
      .command('optimize <domain>')
      .description('Optimize database performance for domain')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--analyze', 'analyze query performance')
      .option('--reindex', 'rebuild indexes')
      .option('--vacuum', 'vacuum database')
      .option('--dry-run', 'show optimization plan')
      .action((domain, options) => this.optimizeDomain(domain, options));

    // Data integrity and validation
    program
      .command('validate <domain>')
      .description('Validate data integrity for domain')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--fix', 'attempt to fix data integrity issues')
      .option('--report <format>', 'generate validation report (json|html)', 'json')
      .option('--deep', 'perform deep validation checks')
      .action((domain, options) => this.validateData(domain, options));

    program
      .command('validate-all')
      .description('Validate data integrity across entire portfolio')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('-f, --filter <pattern>', 'filter domains by pattern')
      .option('--parallel', 'run validation in parallel')
      .option('--report <format>', 'generate consolidated report (json|html)', 'html')
      .action((options) => this.validateAll(options));

    // Connection and access management
    program
      .command('connections [domain]')
      .description('Manage database connections for domain or portfolio')
      .option('-e, --env <environment>', 'environment', this.dbConfig.defaultEnvironment)
      .option('--show', 'show active connections')
      .option('--kill <connection-id>', 'kill specific connection')
      .option('--format <format>', 'output format (table|json)', 'table')
      .action((domain, options) => this.manageConnections(domain, options));

    program
      .command('access')
      .description('Manage database access and permissions')
      .option('--grant <user>', 'grant access to user')
      .option('--revoke <user>', 'revoke access from user')
      .option('--list-users', 'list database users')
      .option('--audit', 'audit access permissions')
      .action((options) => this.manageAccess(options));

    // Disaster recovery
    program
      .command('disaster-recovery')
      .description('Execute disaster recovery procedures')
      .option('--mode <mode>', 'recovery mode (full|partial|test)', 'test')
      .option('--backup-id <id>', 'backup ID for recovery')
      .option('--target-env <env>', 'target environment for recovery')
      .option('--force', 'force recovery without confirmation')
      .action((options) => this.disasterRecovery(options));

    // Audit and compliance
    program
      .command('audit [domain]')
      .description('Generate database audit report')
      .option('-e, --env <environment>', 'environment to audit', this.dbConfig.defaultEnvironment)
      .option('--period <days>', 'audit period in days', '30')
      .option('--format <format>', 'report format (json|html|csv)', 'html')
      .option('--compliance', 'include compliance checks')
      .option('--operations', 'include operation history')
      .action((domain, options) => this.generateAudit(domain, options));

    program
      .command('compliance')
      .description('Run compliance checks on database portfolio')
      .option('--standard <standard>', 'compliance standard (gdpr|hipaa|sox)', 'gdpr')
      .option('--format <format>', 'report format (json|html|pdf)', 'html')
      .option('--fix', 'attempt to fix compliance issues')
      .action((options) => this.complianceCheck(options));

    // Configuration and setup
    program
      .command('config')
      .description('Manage database configuration')
      .option('--show', 'show current configuration')
      .option('--edit', 'edit configuration interactively')
      .option('--validate', 'validate configuration')
      .option('--template <name>', 'apply configuration template')
      .action((options) => this.manageConfig(options));

    program
      .command('init <domain>')
      .description('Initialize database for new domain')
      .option('-e, --env <environment>', 'target environment', this.dbConfig.defaultEnvironment)
      .option('--template <template>', 'database template to use')
      .option('--seed', 'seed with sample data')
      .option('--force', 'force initialization even if database exists')
      .action((domain, options) => this.initializeDomain(domain, options));

    // Information and status
    program
      .command('list')
      .description('List all database domains and their status')
      .option('-e, --env <environment>', 'environment filter')
      .option('--format <format>', 'output format (table|json|yaml)', 'table')
      .option('--show-size', 'include database sizes')
      .option('--show-health', 'include health status')
      .action((options) => this.listDomains(options));

    program
      .command('info <domain>')
      .description('Get detailed information about domain database')
      .option('-e, --env <environment>', 'environment', this.dbConfig.defaultEnvironment)
      .option('--format <format>', 'output format (table|json|yaml)', 'table')
      .option('--schema', 'include schema information')
      .option('--connections', 'include connection information')
      .action((domain, options) => this.getDomainInfo(domain, options));

    // Global options
    program
      .option('--verbose', 'verbose output')
      .option('--quiet', 'quiet mode - minimal output')
      .option('--no-color', 'disable colored output')
      .option('--config <file>', 'custom database configuration file');

    // Parse CLI arguments
    program.parse();
  }

  /**
   * Migrate specific domain
   */
  async migrateDomain(domain, options) {
    try {
      this.logOutput(`🗄️ Running database migration: ${domain}`, 'info');
      
      const migrationId = this.generateOperationId('migration');
      
      // Start audit
      const auditContext = this.modules.auditor.startDeploymentAudit(migrationId, domain, {
        operation: 'database_migration',
        environment: options.env,
        options
      });

      const migrationOptions = {
        environment: options.env,
        createDatabase: options.createDb,
        backupBeforeMigration: options.backup !== false,
        dryRun: options.dryRun,
        force: options.force,
        rollback: options.rollback,
        targetVersion: options.target
      };

      const result = await this.modules.databaseOrchestrator.executeMigration(
        domain, 
        migrationOptions
      );

      this.modules.auditor.endDeploymentAudit(migrationId, 'success', {
        migrationsApplied: result.migrationsApplied,
        duration: result.duration
      });

      this.logOutput(`✅ Migration completed: ${result.migrationsApplied} migrations applied`, 'success');
      
      if (result.warnings?.length > 0) {
        this.logOutput('⚠️  Migration warnings:', 'warn');
        result.warnings.forEach(warning => this.logOutput(`   - ${warning}`, 'warn'));
      }
      
    } catch (error) {
      this.logOutput(`❌ Migration failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Migrate all domains
   */
  async migrateAll(options) {
    try {
      this.logOutput('🌍 Running portfolio-wide database migrations...', 'info');
      
      // Discover portfolio
      const portfolio = await this.modules.coordinator.discoverPortfolio();
      let domains = portfolio.domains.map(d => d.name || d.domain);

      // Apply filters
      if (options.filter) {
        const filterRegex = new RegExp(options.filter);
        domains = domains.filter(domain => filterRegex.test(domain));
      }
      
      if (options.exclude) {
        const excludeRegex = new RegExp(options.exclude);
        domains = domains.filter(domain => !excludeRegex.test(domain));
      }

      this.logOutput(`📊 Migrating ${domains.length} domains`, 'info');

      const migrationOptions = {
        environment: options.env,
        parallel: options.parallel,
        batchSize: parseInt(options.batchSize || '3'),
        safeMode: options.safeMode !== false,
        dryRun: options.dryRun,
        rollback: options.rollback
      };

      const results = await this.modules.databaseOrchestrator.coordinateMigrations(
        domains,
        migrationOptions
      );

      this.logOutput('✅ Portfolio migration completed', 'success');
      console.log(`   ✅ Successful: ${results.successful.length}`);
      console.log(`   ❌ Failed: ${results.failed.length}`);
      console.log(`   ⏱️  Total Duration: ${results.totalDuration}s`);
      
      if (results.failed.length > 0) {
        console.log('\\n❌ Failed Migrations:');
        results.failed.forEach(failure => {
          console.log(`   - ${failure.domain}: ${failure.error}`);
        });
      }
      
    } catch (error) {
      this.logOutput(`❌ Portfolio migration failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Check database health
   */
  async checkHealth(domain, options) {
    try {
      if (domain) {
        this.logOutput(`❤️  Checking database health: ${domain}`, 'info');
        
        const health = await this.modules.databaseOrchestrator.checkDatabaseHealth(domain, {
          environment: options.env,
          detailed: options.detailed,
          includePerformance: options.performance
        });

        this.displayHealthResults(health, options);
        
      } else {
        this.logOutput('❤️  Checking portfolio database health...', 'info');
        
        const portfolioHealth = await this.modules.databaseOrchestrator.checkPortfolioHealth({
          environment: options.env,
          detailed: options.detailed,
          includePerformance: options.performance
        });

        this.displayPortfolioHealthResults(portfolioHealth, options);
      }
      
    } catch (error) {
      this.logOutput(`❌ Health check failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  /**
   * Display health results
   */
  displayHealthResults(health, options) {
    if (options.format === 'table') {
      console.log(`\\n📊 Database Health: ${health.status}`);
      console.log(`   🔗 Connection: ${health.connection ? '✅' : '❌'}`);
      console.log(`   📊 Size: ${health.size || 'N/A'}`);
      console.log(`   🔢 Tables: ${health.tableCount || 'N/A'}`);
      
      if (options.detailed && health.details) {
        console.log('\\n📋 Detailed Information:');
        Object.entries(health.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      
      if (options.performance && health.performance) {
        console.log('\\n⚡ Performance Metrics:');
        Object.entries(health.performance).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
    } else {
      console.log(JSON.stringify(health, null, 2));
    }
  }

  /**
   * Display portfolio health results
   */
  displayPortfolioHealthResults(portfolioHealth, options) {
    if (options.format === 'table') {
      console.log('\\n📊 Portfolio Database Health Summary:');
      console.log(`   📊 Total Databases: ${portfolioHealth.summary.total}`);
      console.log(`   ✅ Healthy: ${portfolioHealth.summary.healthy}`);
      console.log(`   ⚠️  Warnings: ${portfolioHealth.summary.warnings || 0}`);
      console.log(`   ❌ Unhealthy: ${portfolioHealth.summary.unhealthy}`);
      
      if (options.detailed) {
        console.log('\\n📋 Database Details:');
        portfolioHealth.databases.forEach(db => {
          const status = db.healthy ? '✅' : '❌';
          console.log(`   ${status} ${db.domain} (${db.environment})`);
          if (db.issues?.length > 0) {
            db.issues.forEach(issue => console.log(`      - ${issue}`));
          }
        });
      }
    } else {
      console.log(JSON.stringify(portfolioHealth, null, 2));
    }
  }

  /**
   * Generate operation ID
   */
  generateOperationId(operation) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${operation}_${timestamp}_${random}`;
  }

  /**
   * Log output with different levels
   */
  logOutput(message, level = 'info') {
    if (program.opts().quiet && level !== 'error') return;
    
    const colors = {
      info: '\\x1b[36m',    // Cyan
      success: '\\x1b[32m', // Green  
      warn: '\\x1b[33m',    // Yellow
      error: '\\x1b[31m',   // Red
      reset: '\\x1b[0m'     // Reset
    };
    
    const useColor = !program.opts().noColor;
    const colorCode = useColor ? (colors[level] || colors.info) : '';
    const resetCode = useColor ? colors.reset : '';
    
    console.log(`${colorCode}${message}${resetCode}`);
  }

  /**
   * Placeholder implementations for remaining methods
   */
  async migrationStatus(domain, options) {
    this.logOutput(`📊 Migration status for ${domain || 'portfolio'} not yet implemented`, 'warn');
  }

  async validateSchema(domain, options) {
    this.logOutput(`🔍 Schema validation for ${domain} not yet implemented`, 'warn');
  }

  async syncSchemas(options) {
    this.logOutput(`🔄 Schema synchronization not yet implemented`, 'warn');
  }

  async schemaDiff(options) {
    this.logOutput(`📊 Schema diff between ${options.source} and ${options.target} not yet implemented`, 'warn');
  }

  async backupDomain(domain, options) {
    this.logOutput(`💾 Database backup for ${domain} not yet implemented`, 'warn');
  }

  async backupAll(options) {
    this.logOutput(`💾 Portfolio backup not yet implemented`, 'warn');
  }

  async restoreDomain(domain, options) {
    this.logOutput(`🔄 Database restore for ${domain} not yet implemented`, 'warn');
  }

  async listBackups(domain, options) {
    this.logOutput(`📋 Backup listing for ${domain || 'portfolio'} not yet implemented`, 'warn');
  }

  async startMonitoring(options) {
    this.logOutput(`📊 Database monitoring not yet implemented`, 'warn');
  }

  async getStats(domain, options) {
    this.logOutput(`📊 Database statistics for ${domain || 'portfolio'} not yet implemented`, 'warn');
  }

  async cleanupDomain(domain, options) {
    this.logOutput(`🧹 Database cleanup for ${domain} not yet implemented`, 'warn');
  }

  async cleanupAll(options) {
    this.logOutput(`🧹 Portfolio database cleanup not yet implemented`, 'warn');
  }

  async optimizeDomain(domain, options) {
    this.logOutput(`⚡ Database optimization for ${domain} not yet implemented`, 'warn');
  }

  async validateData(domain, options) {
    this.logOutput(`🔍 Data validation for ${domain} not yet implemented`, 'warn');
  }

  async validateAll(options) {
    this.logOutput(`🔍 Portfolio data validation not yet implemented`, 'warn');
  }

  async manageConnections(domain, options) {
    this.logOutput(`🔗 Connection management for ${domain || 'portfolio'} not yet implemented`, 'warn');
  }

  async manageAccess(options) {
    this.logOutput(`🔐 Access management not yet implemented`, 'warn');
  }

  async disasterRecovery(options) {
    this.logOutput(`🚨 Disaster recovery (${options.mode} mode) not yet implemented`, 'warn');
  }

  async generateAudit(domain, options) {
    this.logOutput(`📋 Database audit for ${domain || 'portfolio'} not yet implemented`, 'warn');
  }

  async complianceCheck(options) {
    this.logOutput(`📋 Compliance check (${options.standard}) not yet implemented`, 'warn');
  }

  async manageConfig(options) {
    this.logOutput(`⚙️ Configuration management not yet implemented`, 'warn');
  }

  async initializeDomain(domain, options) {
    this.logOutput(`🚀 Database initialization for ${domain} not yet implemented`, 'warn');
  }

  async listDomains(options) {
    this.logOutput(`📋 Database domain listing not yet implemented`, 'warn');
  }

  async getDomainInfo(domain, options) {
    this.logOutput(`📊 Domain information for ${domain} not yet implemented`, 'warn');
  }
}

// Initialize and run CLI
const cli = new EnterpriseDatabaseManagerCLI();
cli.initialize().catch(error => {
  console.error('❌ Failed to initialize CLI:', error.message);
  process.exit(1);
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { EnterpriseDatabaseManagerCLI };