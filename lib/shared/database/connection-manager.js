/**
 * Database Connection Manager
 * Implements connection pooling, timeout handling, and retry logic for D1 operations
 */

import { executeSql } from '../cloudflare/ops.js';
import { ErrorRecoveryManager } from '../utils/index.js';

export class DatabaseConnectionManager {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.connectionPool = new Map();
    this.activeConnections = 0;
    this.errorRecovery = null; // Will be initialized after framework config is loaded
  }

  /**
   * Initialize with framework configuration
   */
  async initialize() {
    // Import framework config for consistent database connection settings
    const { frameworkConfig } = await import('../utils/framework-config.js');
    const timing = frameworkConfig.getTiming();
    const database = frameworkConfig.getDatabaseConfig();
    
    this.config = {
      maxRetries: this.options.maxRetries || timing.retryAttempts,
      retryDelay: this.options.retryDelay || timing.retryDelay,
      connectionTimeout: this.options.connectionTimeout || database.connectionTimeout,
      queryTimeout: this.options.queryTimeout || database.queryTimeout,
      enableConnectionPooling: this.options.enableConnectionPooling !== false,
      maxPoolSize: this.options.maxPoolSize || database.maxPoolSize,
      connectionIdleTimeout: this.options.connectionIdleTimeout || database.connectionIdleTimeout,
      ...this.options
    };

    // Initialize error recovery with loaded config
    const { ErrorRecoveryManager } = await import('../utils/index.js');
    this.errorRecovery = new ErrorRecoveryManager({
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      gracefulDegradation: true
    });
    await this.errorRecovery.initialize();
  }

  /**
   * Execute a database query with connection management
   */
  async executeQuery(databaseName, sql, options = {}) {
    if (!this.config) {
      throw new Error('ConnectionManager must be initialized before use. Call initialize() first.');
    }
    
    const config = {
      env: 'production',
      timeout: this.config.queryTimeout,
      usePool: this.config.enableConnectionPooling,
      ...options
    };

    return await this.errorRecovery.executeWithRecovery(async () => {
      return await this.executeQueryInternal(databaseName, sql, config);
    }, { operationId: `db_query_${databaseName}` });
  }

  /**
   * Execute query with timeout and connection handling
   */
  async executeQueryInternal(databaseName, sql, config) {
    const startTime = Date.now();

    try {
      // Get or create connection
      const connection = await this.getConnection(databaseName, config);

      // Execute query with timeout
      const result = await this.executeWithTimeout(
        () => executeSql(databaseName, sql, config.env),
        config.timeout
      );

      const duration = Date.now() - startTime;

      // Release connection back to pool
      if (config.usePool) {
        this.releaseConnection(databaseName, connection);
      }

      return {
        success: true,
        result,
        duration,
        connectionId: connection.id
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle connection errors
      if (this.isConnectionError(error)) {
        await this.handleConnectionError(databaseName, error);
      }

      throw new Error(`Database query failed: ${error.message} (duration: ${duration}ms)`);
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(databaseName, queries, options = {}) {
    const config = {
      env: 'production',
      timeout: this.config.queryTimeout * queries.length, // Longer timeout for transactions
      ...options
    };

    return await this.errorRecovery.executeWithRecovery(async () => {
      return await this.executeTransactionInternal(databaseName, queries, config);
    }, { operationId: `db_transaction_${databaseName}` });
  }

  /**
   * Execute transaction with proper error handling
   */
  async executeTransactionInternal(databaseName, queries, config) {
    const startTime = Date.now();
    const results = [];

    try {
      const connection = await this.getConnection(databaseName, config);

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];

        try {
          const result = await this.executeWithTimeout(
            () => executeSql(databaseName, query, config.env),
            config.timeout / queries.length // Divide timeout among queries
          );

          results.push({
            index: i,
            success: true,
            result,
            query
          });

        } catch (queryError) {
          // Transaction failed, all previous queries should be rolled back
          // Note: D1 doesn't support explicit transactions, so we need to handle this at application level
          results.push({
            index: i,
            success: false,
            error: queryError.message,
            query
          });

          throw new Error(`Transaction failed at query ${i}: ${queryError.message}`);
        }
      }

      const duration = Date.now() - startTime;

      if (config.usePool) {
        this.releaseConnection(databaseName, connection);
      }

      return {
        success: true,
        results,
        duration,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      throw new Error(`Database transaction failed: ${error.message} (duration: ${duration}ms)`);
    }
  }

  /**
   * Get a connection from the pool or create a new one
   */
  async getConnection(databaseName, config) {
    if (!config.usePool) {
      return this.createConnection(databaseName);
    }

    const poolKey = databaseName;
    let pool = this.connectionPool.get(poolKey);

    if (!pool) {
      pool = [];
      this.connectionPool.set(poolKey, pool);
    }

    // Find an available connection
    let connection = pool.find(conn => !conn.inUse && !this.isConnectionExpired(conn));

    if (!connection && pool.length < this.config.maxPoolSize) {
      connection = this.createConnection(databaseName);
      pool.push(connection);
    }

    if (!connection) {
      // Wait for an available connection
      connection = await this.waitForAvailableConnection(pool, config.timeout);
    }

    if (!connection) {
      throw new Error('No available database connections');
    }

    connection.inUse = true;
    connection.lastUsed = Date.now();
    this.activeConnections++;

    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(databaseName, connection) {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    this.activeConnections--;
  }

  /**
   * Create a new database connection
   */
  createConnection(databaseName) {
    return {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      databaseName,
      created: Date.now(),
      lastUsed: Date.now(),
      inUse: false
    };
  }

  /**
   * Wait for an available connection
   */
  async waitForAvailableConnection(pool, timeout) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const connection = pool.find(conn => !conn.inUse && !this.isConnectionExpired(conn));
      if (connection) {
        return connection;
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  }

  /**
   * Check if a connection is expired
   */
  isConnectionExpired(connection) {
    const now = Date.now();
    return (now - connection.lastUsed) > this.config.connectionIdleTimeout;
  }

  /**
   * Handle connection errors
   */
  async handleConnectionError(databaseName, error) {
    // Clean up any bad connections from the pool
    const poolKey = databaseName;
    const pool = this.connectionPool.get(poolKey);

    if (pool) {
      const validConnections = pool.filter(conn => !this.isConnectionExpired(conn));
      this.connectionPool.set(poolKey, validConnections);
    }

    // Could implement connection health checks here
    console.warn(`Database connection error for ${databaseName}:`, error.message);
  }

  /**
   * Check if error is connection-related
   */
  isConnectionError(error) {
    const connectionErrorPatterns = [
      'connection',
      'timeout',
      'network',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];

    const errorMessage = error.message.toLowerCase();
    return connectionErrorPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Execute a function with timeout
   */
  async executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      fn().then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(databaseName) {
    const pool = this.connectionPool.get(databaseName) || [];

    return {
      databaseName,
      totalConnections: pool.length,
      activeConnections: pool.filter(conn => conn.inUse).length,
      idleConnections: pool.filter(conn => !conn.inUse).length,
      expiredConnections: pool.filter(conn => this.isConnectionExpired(conn)).length,
      globalActiveConnections: this.activeConnections
    };
  }

  /**
   * Get all pool statistics
   */
  getAllPoolStats() {
    const stats = {};
    for (const [databaseName, pool] of this.connectionPool) {
      stats[databaseName] = this.getPoolStats(databaseName);
    }
    return stats;
  }

  /**
   * Clean up expired connections
   */
  cleanupExpiredConnections() {
    for (const [databaseName, pool] of this.connectionPool) {
      const validConnections = pool.filter(conn => !this.isConnectionExpired(conn));
      this.connectionPool.set(databaseName, validConnections);
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections() {
    for (const [databaseName, pool] of this.connectionPool) {
      // In a real implementation, you'd close actual connections
      pool.length = 0;
    }
    this.connectionPool.clear();
    this.activeConnections = 0;
  }
}