/**
 * Database Testing Module
 * Specialized module for database connectivity and operations testing
 */

import { executeSql } from '../cloudflare-ops.js';

export class DatabaseTester {
  constructor(config) {
    this.config = config;
  }

  async runDatabaseTests(environment) {
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Database tests
    const tests = [
      { name: 'Connection Test', test: () => this.testConnection(environment) },
      { name: 'Basic Query Test', test: () => this.testBasicQuery(environment) },
      { name: 'Migration Status Test', test: () => this.testMigrationStatus(environment) }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        results.tests.push({
          name: test.name,
          success: result.success,
          details: result
        });

        if (result.success) {
          results.passed++;
        } else {
          results.failed++;
        }

      } catch (error) {
        results.tests.push({
          name: test.name,
          success: false,
          error: error.message
        });
        results.failed++;
      }
    }

    return results;
  }

  async testConnection(environment) {
    try {
      // Test basic database connectivity
      const result = await executeSql('test-db', 'SELECT 1 as test;', environment);
      return {
        success: true,
        result: result.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testBasicQuery(environment) {
    try {
      // Test a more complex query
      const result = await executeSql('test-db', 'SELECT COUNT(*) as count FROM sqlite_master;', environment);
      return {
        success: true,
        result: result.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMigrationStatus(environment) {
    try {
      // Check if migrations have been applied
      const result = await executeSql('test-db', 'SELECT name FROM sqlite_master WHERE type="table";', environment);
      const hasMigrations = result.includes('migrations') || result.includes('_cf_');

      return {
        success: true,
        hasMigrations,
        tables: result.split('\n').filter(line => line.trim()).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}