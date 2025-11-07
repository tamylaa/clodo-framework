/**
 * Memory Manager
 * Implements memory leak prevention and cleanup routines for long-running processes
 */

export class MemoryManager {
  constructor(options = {}) {
    this.config = {
      gcInterval: options.gcInterval || 300000, // 5 minutes
      memoryThreshold: options.memoryThreshold || 0.8, // 80% of heap
      maxHeapSize: options.maxHeapSize || 512 * 1024 * 1024, // 512MB
      enableGcHints: options.enableGcHints !== false,
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      leakDetection: options.leakDetection !== false,
      ...options
    };

    this.gcIntervalId = null;
    this.cleanupIntervalId = null;
    this.memoryStats = [];
    this.eventListeners = new Set();
    this.timers = new Set();
    this.intervals = new Set();
    this.isMonitoring = false;

    // Bind methods to preserve context
    this.gcCallback = this.gcCallback.bind(this);
    this.cleanupCallback = this.cleanupCallback.bind(this);
  }

  /**
   * Start memory monitoring and cleanup
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    if (this.config.enableGcHints) {
      this.gcIntervalId = setInterval(this.gcCallback, this.config.gcInterval);
      this.gcIntervalId.unref?.(); // Don't keep process alive
    }

    this.cleanupIntervalId = setInterval(this.cleanupCallback, this.config.cleanupInterval);
    this.cleanupIntervalId.unref?.();

    // Register process cleanup handlers
    this.registerProcessHandlers();

    // Only log if verbose mode or DEBUG is enabled
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log('🧠 Memory monitoring started');
    }
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.unregisterProcessHandlers();

    console.log('🧠 Memory monitoring stopped');
  }

  /**
   * Garbage collection callback
   */
  gcCallback() {
    const memUsage = process.memoryUsage();

    // Store memory stats for trend analysis
    this.memoryStats.push({
      timestamp: Date.now(),
      ...memUsage
    });

    // Keep only last 100 readings
    if (this.memoryStats.length > 100) {
      this.memoryStats.shift();
    }

    // Check memory thresholds
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsagePercent > this.config.memoryThreshold) {
      // Only warn if verbose/debug mode or if usage is critically high (>95%)
      if (process.env.DEBUG || process.env.VERBOSE || heapUsagePercent > 0.95) {
        console.warn(`⚠️  High memory usage detected: ${(heapUsagePercent * 100).toFixed(1)}%`);
      }

      // Force garbage collection if available
      if (global.gc && heapUsagePercent > 0.90) {
        if (process.env.DEBUG) {
          console.log('🗑️  Running forced garbage collection');
        }
        global.gc();
      }

      // Run cleanup routines only if critically high
      if (heapUsagePercent > 0.90) {
        this.runCleanupRoutines();
      }
    }

    // Check for memory leaks
    if (this.config.leakDetection) {
      this.detectMemoryLeaks();
    }
  }

  /**
   * Cleanup callback
   */
  cleanupCallback() {
    this.runCleanupRoutines();
  }

  /**
   * Run cleanup routines
   */
  runCleanupRoutines() {
    // Clear expired cache entries
    this.clearExpiredCache();

    // Clean up event listeners
    this.cleanupEventListeners();

    // Clean up timers and intervals
    this.cleanupTimers();

    // Force garbage collection hint
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    // This would integrate with cache managers
    // For now, just hint that caches should be cleaned
    if (typeof global !== 'undefined' && global.cacheManagers) {
      global.cacheManagers.forEach(manager => {
        if (typeof manager.cleanup === 'function') {
          manager.cleanup();
        }
      });
    }
  }

  /**
   * Clean up event listeners
   */
  cleanupEventListeners() {
    // Remove listeners that are no longer needed
    // This is a placeholder - actual implementation would track listeners
  }

  /**
   * Clean up timers and intervals
   */
  cleanupTimers() {
    // Clear any timers that may have been leaked
    // This is a placeholder - actual implementation would track timers
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    if (this.memoryStats.length < 10) return;

    const recent = this.memoryStats.slice(-10);
    const older = this.memoryStats.slice(-20, -10);

    if (recent.length === 0 || older.length === 0) return;

    const recentAvg = recent.reduce((sum, stat) => sum + stat.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + stat.heapUsed, 0) / older.length;

    const growthRate = (recentAvg - olderAvg) / olderAvg;

    if (growthRate > 0.1) { // 10% growth
      console.warn(`🚨 Potential memory leak detected: ${(growthRate * 100).toFixed(1)}% growth over time`);
    }
  }

  /**
   * Register process signal handlers
   */
  registerProcessHandlers() {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught exception:', error);
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Unregister process signal handlers
   */
  unregisterProcessHandlers() {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
  }

  /**
   * Graceful shutdown
   */
  gracefulShutdown(reason) {
    console.log(`🛑 Graceful shutdown initiated: ${reason}`);

    // Stop monitoring
    this.stopMonitoring();

    // Run final cleanup
    this.runCleanupRoutines();

    // Force final garbage collection
    if (global.gc) {
      global.gc();
    }

    // Exit gracefully
    process.exit(0);
  }

  /**
   * Track an event listener for cleanup
   */
  trackEventListener(emitter, event, listener) {
    const tracked = { emitter, event, listener };
    this.eventListeners.add(tracked);

    // Return cleanup function
    return () => {
      emitter.removeListener(event, listener);
      this.eventListeners.delete(tracked);
    };
  }

  /**
   * Track a timer for cleanup
   */
  trackTimer(timerId) {
    this.timers.add(timerId);

    // Return cleanup function
    return () => {
      clearTimeout(timerId);
      this.timers.delete(timerId);
    };
  }

  /**
   * Track an interval for cleanup
   */
  trackInterval(intervalId) {
    this.intervals.add(intervalId);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      this.intervals.delete(intervalId);
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const memUsage = process.memoryUsage();

    return {
      current: {
        rss: memUsage.rss / 1024 / 1024, // MB
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024, // MB
        heapUsagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      history: this.memoryStats.slice(-10), // Last 10 readings
      thresholds: {
        memoryThreshold: this.config.memoryThreshold * 100,
        maxHeapSize: this.config.maxHeapSize / 1024 / 1024
      },
      tracking: {
        eventListeners: this.eventListeners.size,
        timers: this.timers.size,
        intervals: this.intervals.size
      }
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGc() {
    if (global.gc) {
      console.log('🗑️  Forced garbage collection');
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Create a memory-safe interval
   */
  createSafeInterval(callback, delay) {
    const intervalId = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error('Error in safe interval:', error);
        // Could remove the interval if it keeps failing
      }
    }, delay);

    intervalId.unref?.();
    return this.trackInterval(intervalId);
  }

  /**
   * Create a memory-safe timeout
   */
  createSafeTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error('Error in safe timeout:', error);
      }
    }, delay);

    timeoutId.unref?.();
    return this.trackTimer(timeoutId);
  }
}

// Global memory manager instance
let globalMemoryManager = null;

/**
 * Get the global memory manager instance
 */
export function getMemoryManager(options = {}) {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager(options);
  }
  return globalMemoryManager;
}

/**
 * Start global memory monitoring
 */
export function startMemoryMonitoring(options = {}) {
  const manager = getMemoryManager(options);
  manager.startMonitoring();
  return manager;
}

/**
 * Stop global memory monitoring
 */
export function stopMemoryMonitoring() {
  if (globalMemoryManager) {
    globalMemoryManager.stopMonitoring();
  }
}