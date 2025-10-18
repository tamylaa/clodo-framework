#!/usr/bin/env node

/**
 * Data Cleanup CLI Tool
 * Provides command-line access to data cleanup operations
 */

import { initD1Client } from '../../src/shared/clients/d1/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  ...process.env
};

// Initialize D1 client
let d1Client;
try {
  // For local development, we need to handle the database binding
  if (env.NODE_ENV === 'development') {
    // Create a mock database binding for development
    env.DB = {}; // This will trigger in-memory database creation
  }

  d1Client = await initD1Client(env);

  // Wait for the client to be fully initialized
  await new Promise((resolve) => {
    const checkInit = () => {
      if (d1Client._isInitialized || d1Client.db) {
        resolve();
      } else {
        setTimeout(checkInit, 10);
      }
    };
    checkInit();
  });

} catch (error) {
  console.error('Failed to initialize D1 client:', error.message);
  process.exit(1);
}

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case 'stats': {
        console.log('📊 Getting database statistics...');
        const stats = await d1Client.getDatabaseStats();
        console.log(JSON.stringify(stats, null, 2));
        break;
      }

      case 'backup': {
        console.log('💾 Creating database backup...');
        const backup = await d1Client.createBackup({ reason: args[0] || 'CLI backup' });

        const filename = `backup_${backup.id}.sql`;
        writeFileSync(filename, backup.content);
        console.log(`✅ Backup saved to: ${filename}`);
        console.log(`📊 Records backed up: ${backup.totalRecords}`);
        break;
      }

      case 'clear-old': {
        const days = parseInt(args[0]);
        if (!days || days < 1) {
          console.error('❌ Please specify number of days (e.g., clear-old 90)');
          process.exit(1);
        }

        console.log(`🗑️ Clearing data older than ${days} days...`);
        const oldResult = await d1Client.safeCleanup('CLEAR_OLD', { daysOld: days });
        console.log('✅ Old data cleared:', JSON.stringify(oldResult, null, 2));
        break;
      }

      case 'clear-user': {
        const userId = args[0];
        if (!userId) {
          console.error('❌ Please specify user ID (e.g., clear-user user123)');
          process.exit(1);
        }

        console.log(`🗑️ Clearing data for user: ${userId}`);
        const userResult = await d1Client.safeCleanup('CLEAR_USER', { userId });
        console.log('✅ User data cleared:', JSON.stringify(userResult, null, 2));
        break;
      }

      case 'clear-all': {
        if (env.NODE_ENV === 'production') {
          console.error('❌ CLEAR ALL operation blocked in production environment');
          console.log('💡 Use selective cleanup operations instead');
          process.exit(1);
        }

        console.log('🗑️ Clearing ALL data (this will delete everything!)...');
        const confirm = args.includes('--confirm');
        if (!confirm) {
          console.log('⚠️ This operation will delete ALL data permanently');
          console.log('💡 Add --confirm flag to proceed');
          process.exit(1);
        }

        const allResult = await d1Client.safeCleanup('CLEAR_ALL');
        console.log('✅ All data cleared:', JSON.stringify(allResult, null, 2));
        break;
      }

      case 'validate': {
        const operation = args[0];
        const params = {};

        if (operation === 'CLEAR_OLD') params.daysOld = parseInt(args[1]);
        if (operation === 'CLEAR_USER') params.userId = args[1];

        console.log(`🔍 Validating operation: ${operation}`);
        const validation = await d1Client.validateCleanupOperation(operation, params);
        console.log(JSON.stringify(validation, null, 2));
        break;
      }

      default:
        console.log('🧹 Data Cleanup CLI Tool');
        console.log('');
        console.log('Usage: node scripts/cleanup-cli.js <command> [args...]');
        console.log('');
        console.log('Commands:');
        console.log('  stats                    Show database statistics');
        console.log('  backup [reason]          Create database backup');
        console.log('  clear-old <days>         Clear data older than X days');
        console.log('  clear-user <userId>      Clear all data for a user');
        console.log('  clear-all --confirm      Clear ALL data (dangerous!)');
        console.log('  validate <op> [params]   Validate if operation is safe');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/cleanup-cli.js stats');
        console.log('  node scripts/cleanup-cli.js backup "Pre-deployment backup"');
        console.log('  node scripts/cleanup-cli.js clear-old 90');
        console.log('  node scripts/cleanup-cli.js clear-user user123');
        console.log('  node scripts/cleanup-cli.js validate CLEAR_OLD 90');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});