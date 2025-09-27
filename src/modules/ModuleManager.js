/**
 * Pluggable Business Logic Modules
 * Allows domain-specific logic to be added as optional modules
 */

export class ModuleManager {
  constructor() {
    this.modules = new Map();
    this.hooks = new Map();
  }

  /**
   * Register a business logic module
   * @param {string} moduleName - Name of the module
   * @param {Object} module - Module definition
   */
  registerModule(moduleName, module) {
    this.modules.set(moduleName, {
      name: moduleName,
      ...module
    });

    // Register hooks
    if (module.hooks) {
      Object.entries(module.hooks).forEach(([hookName, hookFn]) => {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({
          module: moduleName,
          fn: hookFn
        });
      });
    }

    console.log(`✅ Registered module: ${moduleName}`);
  }

  /**
   * Get a registered module
   * @param {string} moduleName - Name of the module
   * @returns {Object} Module definition
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Check if a module is registered
   * @param {string} moduleName - Name of the module
   * @returns {boolean}
   */
  hasModule(moduleName) {
    return this.modules.has(moduleName);
  }

  /**
   * Execute hooks for a specific event
   * @param {string} hookName - Name of the hook
   * @param {Object} context - Execution context
   * @param {...any} args - Additional arguments
   * @returns {Promise<Array>} Hook results
   */
  async executeHooks(hookName, context, ...args) {
    const hooks = this.hooks.get(hookName) || [];
    const results = [];

    for (const hook of hooks) {
      try {
        const result = await hook.fn(context, ...args);
        results.push({
          module: hook.module,
          result,
          success: true
        });
      } catch (error) {
        console.error(`Hook execution failed for ${hook.module}:${hookName}:`, error);
        results.push({
          module: hook.module,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Get all registered modules
   * @returns {Map} All modules
   */
  getAllModules() {
    return this.modules;
  }
}

// Create singleton instance
export const moduleManager = new ModuleManager();

// Pre-register existing modules for backward compatibility

// Authentication Module
moduleManager.registerModule('auth', {
  name: 'auth',
  description: 'Authentication and user management',

  // Custom methods
  methods: {
    async createMagicLink(dataService, email, userId, expiresMinutes = 15) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresMinutes);

      return await dataService.create({
        token: crypto.randomUUID(),
        user_id: userId,
        email,
        expires_at: expiresAt.toISOString()
      });
    },

    async verifyMagicLink(dataService, token) {
      const magicLink = await dataService.findById(token);
      if (!magicLink) {
        throw new Error('Magic link not found');
      }

      if (new Date() > new Date(magicLink.expires_at)) {
        throw new Error('Magic link expired');
      }

      if (magicLink.used) {
        throw new Error('Magic link already used');
      }

      // Mark as used
      await dataService.update(token, { used: 1 });

      return magicLink;
    },

    async createAuthToken(dataService, userId, type = 'access', expiresHours = 24) {
      const expiresAt = expiresHours ? new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString() : null;

      return await dataService.create({
        token: crypto.randomUUID(),
        user_id: userId,
        type,
        expires_at: expiresAt
      });
    },

    async validateToken(dataService, token, type = null) {
      const tokenRecord = await dataService.find({ token })[0];
      if (!tokenRecord) {
        return null;
      }

      if (type && tokenRecord.type !== type) {
        return null;
      }

      if (tokenRecord.expires_at && new Date() > new Date(tokenRecord.expires_at)) {
        return null;
      }

      return tokenRecord;
    }
  },

  // Hooks
  hooks: {
    'user.created': async (context, userData) => {
      console.log(`Auth module: User created: ${userData.email}`);
      // Could send welcome email, create default settings, etc.
    },

    'user.deleted': async (context, userId) => {
      console.log(`Auth module: User deleted: ${userId}`);
      // Could clean up related data, revoke sessions, etc.
    }
  }
});

// File Management Module
moduleManager.registerModule('files', {
  name: 'files',
  description: 'File upload and management',

  methods: {
    async createFileRecord(dataService, fileData) {
      return await dataService.create({
        ...fileData,
        status: fileData.status || 'uploaded'
      });
    },

    async updateFileStatus(dataService, fileId, status) {
      return await dataService.update(fileId, {
        status,
        updated_at: new Date().toISOString()
      });
    },

    async getUserFiles(dataService, userId, status = null) {
      const criteria = { user_id: userId };
      if (status) {
        criteria.status = status;
      }
      return await dataService.find(criteria);
    },

    async getFileStats(dataService, userId) {
      const allFiles = await dataService.find({ user_id: userId });
      const stats = {
        total: allFiles.length,
        byStatus: {},
        totalSize: 0
      };

      allFiles.forEach(file => {
        stats.byStatus[file.status] = (stats.byStatus[file.status] || 0) + 1;
        stats.totalSize += file.size || 0;
      });

      return stats;
    }
  },

  hooks: {
    'file.uploaded': async (context, fileData) => {
      console.log(`Files module: File uploaded: ${fileData.filename}`);
      // Could trigger processing, virus scanning, etc.
    },

    'file.deleted': async (context, fileId) => {
      console.log(`Files module: File deleted: ${fileId}`);
      // Could clean up physical files, update storage quotas, etc.
    }
  }
});

// Logging Module
moduleManager.registerModule('logging', {
  name: 'logging',
  description: 'Centralized logging and audit trails',

  methods: {
    async logActivity(dataService, level, message, userId = null, metadata = {}) {
      return await dataService.create({
        level: level.toUpperCase(),
        message,
        user_id: userId,
        metadata: JSON.stringify(metadata)
      });
    },

    async getUserActivity(dataService, userId, limit = 50) {
      return await dataService.find(
        { user_id: userId },
        { limit, orderBy: 'timestamp DESC' }
      );
    },

    async getRecentLogs(dataService, level = null, limit = 100) {
      const criteria = {};
      if (level) {
        criteria.level = level.toUpperCase();
      }
      return await dataService.find(criteria, { limit, orderBy: 'timestamp DESC' });
    }
  },

  hooks: {
    'system.cleanup': async (context, cleanupData) => {
      await context.loggingService.logActivity(
        'INFO',
        `Data cleanup performed: ${cleanupData.operation}`,
        null,
        cleanupData
      );
    }
  }
});

console.log('✅ Module Manager initialized with core modules');