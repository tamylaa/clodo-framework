/**
 * Durable Object Base Class
 * Provides a foundation for building stateful Durable Objects
 * 
 * @example
 * import { DurableObjectBase } from '@tamyla/clodo-framework/utilities/durable-objects';
 * 
 * export class MyCounter extends DurableObjectBase {
 *   async increment() {
 *     const current = await this.getState('count', 0);
 *     const newCount = current + 1;
 *     await this.setState('count', newCount);
 *     return newCount;
 *   }
 * }
 */

/**
 * Base class for Durable Objects with common patterns
 */
export class DurableObjectBase {
  /**
   * @param {DurableObjectState} state - DO state
   * @param {Object} env - Environment bindings
   */
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    this.id = state.id;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Override this method for async initialization
   * Called once when the DO is first accessed
   */
  async initialize() {
    // Override in subclass
  }

  /**
   * Ensure initialization is complete
   */
  async ensureInitialized() {
    if (this.initialized) return;
    
    if (!this.initPromise) {
      this.initPromise = this.state.blockConcurrencyWhile(async () => {
        if (!this.initialized) {
          await this.initialize();
          this.initialized = true;
        }
      });
    }
    
    await this.initPromise;
  }

  /**
   * Get a value from storage with optional default
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default if key doesn't exist
   * @returns {Promise<*>}
   */
  async getState(key, defaultValue = undefined) {
    const value = await this.storage.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<void>}
   */
  async setState(key, value) {
    await this.storage.put(key, value);
  }

  /**
   * Delete a key from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>}
   */
  async deleteState(key) {
    return this.storage.delete(key);
  }

  /**
   * Get multiple values from storage
   * @param {string[]} keys - Storage keys
   * @returns {Promise<Map<string, *>>}
   */
  async getMany(keys) {
    return this.storage.get(keys);
  }

  /**
   * Set multiple values in storage
   * @param {Object} entries - Key-value pairs
   * @returns {Promise<void>}
   */
  async setMany(entries) {
    return this.storage.put(entries);
  }

  /**
   * List all keys with a prefix
   * @param {Object} options - List options
   * @returns {Promise<Map<string, *>>}
   */
  async listState(options = {}) {
    return this.storage.list(options);
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<*>}
   */
  async transaction(callback) {
    return this.state.blockConcurrencyWhile(callback);
  }

  /**
   * Set an alarm for future execution
   * @param {Date|number} time - When to trigger (Date or ms from now)
   * @returns {Promise<void>}
   */
  async setAlarm(time) {
    const alarmTime = typeof time === 'number' 
      ? Date.now() + time 
      : time.getTime();
    
    await this.storage.setAlarm(alarmTime);
  }

  /**
   * Get the current alarm time
   * @returns {Promise<Date|null>}
   */
  async getAlarm() {
    const alarm = await this.storage.getAlarm();
    return alarm ? new Date(alarm) : null;
  }

  /**
   * Delete the current alarm
   * @returns {Promise<void>}
   */
  async deleteAlarm() {
    await this.storage.deleteAlarm();
  }

  /**
   * Default alarm handler - override in subclass
   */
  async alarm() {
    // Override in subclass
  }

  /**
   * Handle HTTP requests - override in subclass
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    await this.ensureInitialized();
    
    // Default implementation - override for custom behavior
    return new Response('Not implemented', { status: 501 });
  }

  /**
   * JSON response helper
   * @param {*} data - Data to serialize
   * @param {number} status - HTTP status
   * @returns {Response}
   */
  json(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Error response helper
   * @param {string} message - Error message
   * @param {number} status - HTTP status
   * @returns {Response}
   */
  error(message, status = 500) {
    return this.json({ error: message }, status);
  }
}

export default DurableObjectBase;
