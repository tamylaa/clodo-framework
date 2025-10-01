#!/usr/bin/env node

/**
 * Rollback Manager Module
 * Enterprise-grade rollback system for safe deployment recovery
 * 
 * Extracted from bulletproof-deploy.js with enhancements
 */

import { access, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
import { join, dirname } from 'path';

/**
 * Advanced Rollback Manager
 * Provides comprehensive rollback capabilities for deployment failures
 */
export class RollbackManager {
  constructor(options = {}) {
    this.deploymentId = options.deploymentId || this.generateRollbackId();
    this.environment = options.environment || 'production';
    this.dryRun = options.dryRun || false;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 2000;
    
    // Rollback state tracking
    this.rollbackPlan = {
      id: this.deploymentId,
      created: new Date(),
      actions: [],
      backups: new Map(),
      status: 'initialized',
      executedActions: [],
      failedActions: [],
      totalActions: 0
    };

    // Backup directories
    this.backupPaths = {
      root: 'backups',
      deployment: join('backups', 'deployments', this.deploymentId),
      configs: join('backups', 'configs', this.deploymentId),
      secrets: join('backups', 'secrets', this.deploymentId),
      database: join('backups', 'database', this.deploymentId)
    };

    // Note: Async initialization required - call initialize() after construction
  }

  /**
   * Initialize the rollback manager asynchronously
   */
  async initialize() {
    await this.initializeRollbackSystem();
  }

  /**
   * Generate unique rollback identifier
   * @returns {string} Rollback ID
   */
  generateRollbackId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `rollback-${timestamp}-${random}`;
  }

  /**
   * Initialize rollback system and create backup directories
   */
  async initializeRollbackSystem() {
    console.log('🔄 Rollback System v1.0');
    console.log('========================');
    console.log(`🆔 Rollback ID: ${this.rollbackPlan.id}`);
    console.log(`🌍 Environment: ${this.environment}`);
    console.log(`🔍 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE ROLLBACK'}`);
    console.log('');

    // Create backup directories
    for (const path of Object.values(this.backupPaths)) {
      try {
        await access(path);
      } catch {
        await mkdir(path, { recursive: true });
      }
    }

    this.logRollbackEvent('SYSTEM_INITIALIZED', { 
      backupPaths: this.backupPaths,
      environment: this.environment
    });
  }

  /**
   * Add rollback action to the plan
   * @param {Object} action - Rollback action configuration
   */
  addRollbackAction(action) {
    const rollbackAction = {
      id: `action-${this.rollbackPlan.actions.length + 1}`,
      timestamp: new Date(),
      ...action
    };

    this.rollbackPlan.actions.push(rollbackAction);
    this.rollbackPlan.totalActions++;

    this.logRollbackEvent('ACTION_ADDED', rollbackAction);
    
    console.log(`📝 Rollback action added: ${action.type} - ${action.description || 'No description'}`);
  }

  /**
   * Create backup of current state before deployment
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup manifest
   */
  async createStateBackup(options = {}) {
    console.log('💾 Creating deployment state backup...');
    
    const backupManifest = {
      id: this.deploymentId,
      timestamp: new Date(),
      environment: this.environment,
      files: [],
      cloudflareState: {},
      databaseState: {}
    };

    try {
      // Backup configuration files
      await this.backupConfigurationFiles(backupManifest);
      
      // Backup Cloudflare state
      if (options.includeCloudflare !== false) {
        await this.backupCloudflareState(backupManifest);
      }
      
      // Backup database state
      if (options.includeDatabase !== false) {
        await this.backupDatabaseState(backupManifest);
      }

      // Save backup manifest
      const manifestPath = join(this.backupPaths.deployment, 'backup-manifest.json');
      await writeFile(manifestPath, JSON.stringify(backupManifest, null, 2));
      
      this.rollbackPlan.backups.set('state', backupManifest);
      this.logRollbackEvent('BACKUP_CREATED', { 
        files: backupManifest.files.length,
        manifestPath
      });

      console.log(`✅ State backup created: ${backupManifest.files.length} files backed up`);
      return backupManifest;

    } catch (error) {
      this.logRollbackEvent('BACKUP_FAILED', { error: error.message });
      throw new Error(`State backup failed: ${error.message}`);
    }
  }

  /**
   * Backup configuration files
   * @param {Object} manifest - Backup manifest to update
   */
  async backupConfigurationFiles(manifest) {
    const configFiles = [
      'package.json',
      'wrangler.toml',
      '.env',
      'src/config/domains.js'
    ];

    for (const file of configFiles) {
      try {
        await access(file);
        const backupPath = join(this.backupPaths.configs, file.replace(/[/\\]/g, '_'));
        const backupDir = dirname(backupPath);
        
        try {
          await access(backupDir);
        } catch {
          await mkdir(backupDir, { recursive: true });
        }
        
        await copyFile(file, backupPath);
        
        manifest.files.push({
          original: file,
          backup: backupPath,
          timestamp: new Date()
        });
        
        console.log(`   📄 Backed up: ${file}`);
        
        // Add restoration action
        this.addRollbackAction({
          type: 'restore-file',
          description: `Restore ${file}`,
          original: file,
          backup: backupPath,
          command: `copy "${backupPath}" "${file}"`,
          priority: 1
        });
      } catch (error) {
        console.warn(`   ⚠️ Failed to backup ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Backup Cloudflare worker and secrets state
   * @param {Object} manifest - Backup manifest to update
   */
  async backupCloudflareState(manifest) {
    try {
      console.log('   ☁️ Backing up Cloudflare state...');
      
      // Get current worker list
      const workerList = await this.executeCommand('npx wrangler list', { timeout: 30000 });
      manifest.cloudflareState.workers = workerList;
      
      // Get current secrets (we can't read values, but we can list keys)
      try {
        const secretsList = await this.executeCommand('npx wrangler secret list', { timeout: 30000 });
        manifest.cloudflareState.secrets = secretsList;
      } catch (error) {
        console.log(`   ⚠️ Could not backup secrets list: ${error.message}`);
      }

      // Save Cloudflare state
      const cloudflareBackupPath = join(this.backupPaths.deployment, 'cloudflare-state.json');
      await writeFile(cloudflareBackupPath, JSON.stringify(manifest.cloudflareState, null, 2));
      
      console.log('   ✅ Cloudflare state backed up');

    } catch (error) {
      console.log(`   ⚠️ Cloudflare backup failed: ${error.message}`);
    }
  }

  /**
   * Backup database state
   * @param {Object} manifest - Backup manifest to update
   */
  async backupDatabaseState(manifest) {
    try {
      console.log('   🗄️ Backing up database state...');
      
      // Get D1 database list
      const dbList = await this.executeCommand('npx wrangler d1 list', { timeout: 30000 });
      manifest.databaseState.databases = dbList;
      
      // Save database state
      const dbBackupPath = join(this.backupPaths.database, 'database-state.json');
      await writeFile(dbBackupPath, JSON.stringify(manifest.databaseState, null, 2));
      
      console.log('   ✅ Database state backed up');

    } catch (error) {
      console.log(`   ⚠️ Database backup failed: ${error.message}`);
    }
  }

  /**
   * Execute rollback plan
   * @returns {Promise<Object>} Rollback results
   */
  async executeRollback() {
    console.log('\n🔄 EXECUTING ROLLBACK PLAN');
    console.log('===========================');
    console.log(`📊 Total Actions: ${this.rollbackPlan.totalActions}`);
    console.log(`🆔 Rollback ID: ${this.rollbackPlan.id}`);
    console.log('');

    this.rollbackPlan.status = 'executing';
    this.rollbackPlan.startTime = new Date();

    const results = {
      rollbackId: this.rollbackPlan.id,
      successful: [],
      failed: [],
      skipped: [],
      totalActions: this.rollbackPlan.totalActions
    };

    try {
      // Sort actions by priority (higher priority first)
      const sortedActions = this.rollbackPlan.actions.sort((a, b) => 
        (b.priority || 0) - (a.priority || 0)
      );

      for (const action of sortedActions) {
        const actionResult = await this.executeRollbackAction(action);
        
        if (actionResult.success) {
          results.successful.push(actionResult);
          this.rollbackPlan.executedActions.push(action);
        } else {
          results.failed.push(actionResult);
          this.rollbackPlan.failedActions.push(action);
          
          // Stop on critical failures unless forced to continue
          if (action.critical !== false && !action.continueOnFailure) {
            console.log(`❌ Critical rollback action failed: ${action.type}`);
            break;
          }
        }
      }

      this.rollbackPlan.status = results.failed.length === 0 ? 'completed' : 'partial';
      this.rollbackPlan.endTime = new Date();

      const duration = (this.rollbackPlan.endTime - this.rollbackPlan.startTime) / 1000;

      console.log('\n📊 ROLLBACK SUMMARY');
      console.log('===================');
      console.log(`✅ Successful: ${results.successful.length}`);
      console.log(`❌ Failed: ${results.failed.length}`);
      console.log(`⏸️ Skipped: ${results.skipped.length}`);
      console.log(`⏱️ Duration: ${duration.toFixed(1)}s`);
      console.log(`🏁 Status: ${this.rollbackPlan.status.toUpperCase()}`);

      if (results.failed.length > 0) {
        console.log('\n❌ Failed Actions:');
        results.failed.forEach(failure => {
          console.log(`   - ${failure.action.type}: ${failure.error}`);
        });
      }

      // Save rollback report
      await this.saveRollbackReport(results);

      this.logRollbackEvent('ROLLBACK_COMPLETED', {
        status: this.rollbackPlan.status,
        successful: results.successful.length,
        failed: results.failed.length,
        duration
      });

      return results;

    } catch (error) {
      this.rollbackPlan.status = 'failed';
      this.rollbackPlan.endTime = new Date();
      
      this.logRollbackEvent('ROLLBACK_FAILED', { error: error.message });
      throw new Error(`Rollback execution failed: ${error.message}`);
    }
  }

  /**
   * Execute individual rollback action
   * @param {Object} action - Action to execute
   * @returns {Promise<Object>} Action result
   */
  async executeRollbackAction(action) {
    console.log(`🔄 Rolling back: ${action.type} - ${action.description || action.id}`);

    const result = {
      actionId: action.id,
      action: action,
      success: false,
      error: null,
      timestamp: new Date()
    };

    try {
      if (this.dryRun) {
        console.log(`   🔍 DRY RUN: Would execute ${action.type}`);
        result.success = true;
        result.dryRun = true;
        return result;
      }

      // Execute based on action type
      switch (action.type) {
        case 'restore-file':
          await this.restoreFile(action);
          break;
          
        case 'delete-secret':
          await this.deleteSecret(action);
          break;
          
        case 'delete-database':
          await this.deleteDatabase(action);
          break;
          
        case 'delete-worker':
          await this.deleteWorker(action);
          break;
          
        case 'custom-command':
          await this.executeCustomCommand(action);
          break;
          
        default:
          if (action.command) {
            await this.executeCommand(action.command, { timeout: action.timeout || 30000 });
          } else {
            throw new Error(`Unknown rollback action type: ${action.type}`);
          }
      }

      result.success = true;
      console.log(`   ✅ Rollback completed: ${action.type}`);

    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ Rollback failed: ${action.type} - ${error.message}`);
    }

    return result;
  }

  // Individual rollback action implementations

  async restoreFile(action) {
    try {
      await access(action.backup);
    } catch {
      throw new Error(`Backup file not found: ${action.backup}`);
    }
    
    await copyFile(action.backup, action.original);
    console.log(`     📄 Restored ${action.original}`);
  }

  async deleteSecret(action) {
    const command = action.command || 
      `npx wrangler secret delete ${action.key} --env ${this.environment}`;
    
    await this.executeCommand(command, { timeout: 30000 });
    console.log(`     🔐 Deleted secret: ${action.key}`);
  }

  async deleteDatabase(action) {
    const command = action.command || 
      `npx wrangler d1 delete ${action.name} --skip-confirmation`;
    
    await this.executeCommand(command, { timeout: 60000 });
    console.log(`     🗄️ Deleted database: ${action.name}`);
  }

  async deleteWorker(action) {
    const command = action.command || 
      `npx wrangler delete ${action.name} --env ${this.environment}`;
    
    await this.executeCommand(command, { timeout: 60000 });
    console.log(`     ⚡ Deleted worker: ${action.name}`);
  }

  async executeCustomCommand(action) {
    await this.executeCommand(action.command, { 
      timeout: action.timeout || 30000 
    });
    console.log(`     🔧 Executed: ${action.description}`);
  }

  // Utility methods

  async executeCommand(command, options = {}) {
    const timeout = options.timeout || 30000;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const { stdout } = await execAsync(command, {
          encoding: 'utf8',
          stdio: options.stdio || 'pipe',
          timeout
        });
        return stdout;
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        console.log(`     ⚠️ Attempt ${attempt}/${this.retryAttempts} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async saveRollbackReport(results) {
    const report = {
      rollbackId: this.rollbackPlan.id,
      environment: this.environment,
      timestamp: new Date(),
      plan: this.rollbackPlan,
      results,
      summary: {
        totalActions: results.totalActions,
        successful: results.successful.length,
        failed: results.failed.length,
        successRate: ((results.successful.length / results.totalActions) * 100).toFixed(1)
      }
    };

    const reportPath = join(this.backupPaths.deployment, 'rollback-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Rollback report saved: ${reportPath}`);
  }

  logRollbackEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      rollbackId: this.rollbackPlan.id,
      event,
      details
    };

    // Log to file if not in dry run mode (fire and forget)
    if (!this.dryRun) {
      (async () => {
        try {
          const logPath = join(this.backupPaths.deployment, 'rollback-log.json');
          let logs = [];
          
          try {
            const logData = await readFile(logPath, 'utf8');
            logs = JSON.parse(logData);
          } catch {
            // File doesn't exist, start with empty logs
          }
          
          logs.push(logEntry);
          await writeFile(logPath, JSON.stringify(logs, null, 2));
        } catch (error) {
          console.warn(`⚠️ Failed to log rollback event: ${error.message}`);
        }
      })();
    }
  }

  /**
   * Get rollback plan status
   * @returns {Object} Current rollback plan status
   */
  getStatus() {
    return {
      id: this.rollbackPlan.id,
      status: this.rollbackPlan.status,
      totalActions: this.rollbackPlan.totalActions,
      executedActions: this.rollbackPlan.executedActions.length,
      failedActions: this.rollbackPlan.failedActions.length,
      created: this.rollbackPlan.created,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear rollback plan (use with caution)
   */
  clearRollbackPlan() {
    this.rollbackPlan.actions = [];
    this.rollbackPlan.totalActions = 0;
    this.rollbackPlan.executedActions = [];
    this.rollbackPlan.failedActions = [];
    
    this.logRollbackEvent('PLAN_CLEARED');
    console.log('🧹 Rollback plan cleared');
  }
}

export default RollbackManager;