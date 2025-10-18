/**
 * Graceful Shutdown Manager
 * Implements SIGTERM/SIGINT handlers and cleanup routines for CLI tools
 */

export class GracefulShutdownManager {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.isShuttingDown = false;
    this.shutdownHandlers = [];
    this.shutdownPromise = null;
    this.registered = false;
  }

  /**
   * Initialize with framework configuration
   */
  async initialize() {
    // Import framework config for consistent timing
    const { frameworkConfig } = await import('./framework-config.js');
    const timing = frameworkConfig.getTiming();
    
    this.config = {
      shutdownTimeout: this.options.shutdownTimeout || timing.shutdownTimeout, 
      forceShutdownTimeout: this.options.forceShutdownTimeout || timing.forceShutdownTimeout,
      enableLogging: this.options.enableLogging !== false,
      ...this.options
    };
  }

  /**
   * Register the shutdown manager
   */
  register() {
    if (this.registered) return;

    this.registered = true;

    // Register signal handlers
    process.on('SIGTERM', () => this.initiateShutdown('SIGTERM'));
    process.on('SIGINT', () => this.initiateShutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', error);
      this.initiateShutdown('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
      this.initiateShutdown('unhandledRejection', reason);
    });

    if (this.config.enableLogging) {
      console.log('🛑 Graceful shutdown manager registered');
    }
  }

  /**
   * Unregister the shutdown manager
   */
  unregister() {
    if (!this.registered) return;

    this.registered = false;

    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    if (this.config.enableLogging) {
      console.log('🛑 Graceful shutdown manager unregistered');
    }
  }

  /**
   * Add a shutdown handler
   */
  addShutdownHandler(handler, priority = 0) {
    this.shutdownHandlers.push({
      handler,
      priority,
      id: `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Sort by priority (higher priority first)
    this.shutdownHandlers.sort((a, b) => b.priority - a.priority);

    // Return removal function
    return () => {
      const index = this.shutdownHandlers.findIndex(h => h.id === this.id);
      if (index !== -1) {
        this.shutdownHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Remove a shutdown handler
   */
  removeShutdownHandler(handlerId) {
    const index = this.shutdownHandlers.findIndex(h => h.id === handlerId);
    if (index !== -1) {
      this.shutdownHandlers.splice(index, 1);
    }
  }

  /**
   * Initiate graceful shutdown
   */
  async initiateShutdown(signal, error = null) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    if (this.config.enableLogging) {
      console.log(`🛑 Initiating graceful shutdown: ${signal}`);
      if (error) {
        console.error('Shutdown triggered by error:', error);
      }
    }

    // Prevent new work from starting
    this.preventNewWork();

    // Execute shutdown handlers
    await this.executeShutdownHandlers(signal, error);

    // Force exit if handlers don't complete in time
    this.forceExitIfNeeded(signal);

    // Exit with appropriate code
    const exitCode = error ? 1 : 0;
    process.exit(exitCode);
  }

  /**
   * Prevent new work from starting
   */
  preventNewWork() {
    // Set global shutdown flag
    if (typeof global !== 'undefined') {
      global.isShuttingDown = true;
    }

    // Prevent new database connections
    if (typeof global !== 'undefined' && global.dbManagers) {
      global.dbManagers.forEach(manager => {
        if (typeof manager.preventNewConnections === 'function') {
          manager.preventNewConnections();
        }
      });
    }
  }

  /**
   * Execute shutdown handlers
   */
  async executeShutdownHandlers(signal, error) {
    const shutdownPromises = [];

    for (const { handler } of this.shutdownHandlers) {
      try {
        const promise = handler(signal, error);
        if (promise && typeof promise.then === 'function') {
          shutdownPromises.push(promise);
        }
      } catch (handlerError) {
        console.error('Error in shutdown handler:', handlerError);
      }
    }

    // Wait for all handlers to complete or timeout
    if (shutdownPromises.length > 0) {
      try {
        await Promise.race([
          Promise.all(shutdownPromises),
          new Promise(resolve => setTimeout(resolve, this.config.shutdownTimeout))
        ]);
      } catch (timeoutError) {
        console.error('Shutdown handlers timed out:', timeoutError);
      }
    }
  }

  /**
   * Force exit if needed
   */
  forceExitIfNeeded(signal) {
    setTimeout(() => {
      console.error(`💥 Force exiting after ${this.config.forceShutdownTimeout}ms`);
      process.exit(1);
    }, this.config.forceShutdownTimeout).unref();
  }

  /**
   * Create a shutdown-aware interval
   */
  createShutdownAwareInterval(callback, delay) {
    const intervalId = setInterval(() => {
      if (this.isShuttingDown) {
        clearInterval(intervalId);
        return;
      }

      try {
        callback();
      } catch (error) {
        console.error('Error in shutdown-aware interval:', error);
        clearInterval(intervalId);
      }
    }, delay);

    intervalId.unref?.();

    // Add cleanup handler
    this.addShutdownHandler(() => {
      clearInterval(intervalId);
    }, 100); // High priority

    return intervalId;
  }

  /**
   * Create a shutdown-aware timeout
   */
  createShutdownAwareTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      if (this.isShuttingDown) return;

      try {
        callback();
      } catch (error) {
        console.error('Error in shutdown-aware timeout:', error);
      }
    }, delay);

    timeoutId.unref?.();

    // Add cleanup handler
    this.addShutdownHandler(() => {
      clearTimeout(timeoutId);
    }, 100); // High priority

    return timeoutId;
  }

  /**
   * Wait for shutdown signal
   */
  async waitForShutdownSignal() {
    return new Promise((resolve) => {
      const handler = (signal) => {
        resolve(signal);
      };

      process.once('SIGTERM', () => handler('SIGTERM'));
      process.once('SIGINT', () => handler('SIGINT'));
    });
  }

  /**
   * Get shutdown status
   */
  getShutdownStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      handlerCount: this.shutdownHandlers.length,
      registered: this.registered,
      config: this.config
    };
  }

  /**
   * Create database cleanup handler
   */
  createDatabaseCleanupHandler(dbManager) {
    return async (signal) => {
      if (dbManager && typeof dbManager.closeAllConnections === 'function') {
        console.log('🗃️  Closing database connections...');
        await dbManager.closeAllConnections();
        console.log('✅ Database connections closed');
      }
    };
  }

  /**
   * Create monitoring cleanup handler
   */
  createMonitoringCleanupHandler(monitor) {
    return async (signal) => {
      if (monitor && typeof monitor.stopMonitoring === 'function') {
        console.log('📊 Stopping monitoring...');
        await monitor.stopMonitoring();
        console.log('✅ Monitoring stopped');
      }
    };
  }

  /**
   * Create token cleanup handler
   */
  createTokenCleanupHandler(tokenManager) {
    return async (signal) => {
      // Token manager doesn't need special cleanup, but we could log the event
      console.log('🔐 Token manager cleanup completed');
    };
  }

  /**
   * Setup standard handlers for common services
   */
  setupStandardHandlers(services = {}) {
    const { dbManager, monitor, tokenManager, memoryManager } = services;

    // Database cleanup (high priority)
    if (dbManager) {
      this.addShutdownHandler(this.createDatabaseCleanupHandler(dbManager), 1000);
    }

    // Monitoring cleanup (medium priority)
    if (monitor) {
      this.addShutdownHandler(this.createMonitoringCleanupHandler(monitor), 500);
    }

    // Memory cleanup (medium priority)
    if (memoryManager) {
      this.addShutdownHandler(async (signal) => {
        console.log('🧠 Stopping memory monitoring...');
        memoryManager.stopMonitoring();
        console.log('✅ Memory monitoring stopped');
      }, 500);
    }

    // Token cleanup (low priority)
    if (tokenManager) {
      this.addShutdownHandler(this.createTokenCleanupHandler(tokenManager), 100);
    }

    // Final cleanup (lowest priority)
    this.addShutdownHandler(async (signal) => {
      console.log('🧹 Running final cleanup...');
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      console.log('✅ Final cleanup completed');
    }, 1);
  }
}

// Global shutdown manager instance
let globalShutdownManager = null;

/**
 * Get the global shutdown manager instance
 */
export function getShutdownManager(options = {}) {
  if (!globalShutdownManager) {
    globalShutdownManager = new GracefulShutdownManager(options);
  }
  return globalShutdownManager;
}

/**
 * Initialize graceful shutdown handling
 */
export function initializeGracefulShutdown(services = {}, options = {}) {
  const manager = getShutdownManager(options);
  manager.setupStandardHandlers(services);
  manager.register();
  return manager;
}

/**
 * Quick shutdown for simple scripts
 */
export async function withGracefulShutdown(callback, services = {}, options = {}) {
  const manager = initializeGracefulShutdown(services, options);

  try {
    await callback();
  } catch (error) {
    console.error('Error in main execution:', error);
    await manager.initiateShutdown('error', error);
  }
}