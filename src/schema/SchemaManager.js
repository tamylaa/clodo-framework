/**
 * Configurable Schema System
 * Allows defining data models externally for maximum reusability
 */

export class SchemaManager {
  constructor() {
    this.schemas = new Map();
    this.relationships = new Map();
  }

  /**
   * Register a data model schema
   * @param {string} modelName - Name of the model
   * @param {Object} schema - Schema definition
   */
  registerModel(modelName, schema) {
    this.schemas.set(modelName, {
      name: modelName,
      tableName: schema.tableName || modelName.toLowerCase(),
      columns: schema.columns || {},
      indexes: schema.indexes || [],
      relationships: schema.relationships || {},
      hooks: schema.hooks || {},
      validation: schema.validation || {},
      ...schema
    });

    // Register relationships
    if (schema.relationships) {
      Object.entries(schema.relationships).forEach(([relName, relConfig]) => {
        this.relationships.set(`${modelName}.${relName}`, {
          from: modelName,
          to: relConfig.model,
          type: relConfig.type || 'belongsTo',
          foreignKey: relConfig.foreignKey,
          localKey: relConfig.localKey || 'id'
        });
      });
    }

    console.log(`✅ Registered model: ${modelName}`);
  }

  /**
   * Get a registered model schema
   * @param {string} modelName - Name of the model
   * @returns {Object} Schema definition
   */
  getModel(modelName) {
    return this.schemas.get(modelName);
  }

  /**
   * Get all registered models
   * @returns {Map} All schemas
   */
  getAllModels() {
    return this.schemas;
  }

  /**
   * Check if a model exists
   * @param {string} modelName - Name of the model
   * @returns {boolean}
   */
  hasModel(modelName) {
    return this.schemas.has(modelName);
  }

  /**
   * Get relationship definition
   * @param {string} modelName - Source model
   * @param {string} relationshipName - Relationship name
   * @returns {Object} Relationship definition
   */
  getRelationship(modelName, relationshipName) {
    return this.relationships.get(`${modelName}.${relationshipName}`);
  }

  /**
   * Validate data against schema
   * @param {string} modelName - Model name
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  validateData(modelName, data) {
    const schema = this.getModel(modelName);
    if (!schema) {
      return { valid: false, errors: [`Model '${modelName}' not found`] };
    }

    const errors = [];
    const validatedData = { ...data };

    // Check required fields
    if (schema.validation?.required) {
      schema.validation.required.forEach(field => {
        if (data[field] === undefined || data[field] === null) {
          errors.push(`Field '${field}' is required`);
        }
      });
    }

    // Type validation
    Object.entries(schema.columns).forEach(([fieldName, fieldConfig]) => {
      if (data[fieldName] !== undefined) {
        const value = data[fieldName];
        const expectedType = fieldConfig.type;

        if (expectedType === 'integer' && typeof value !== 'number') {
          errors.push(`Field '${fieldName}' must be a number`);
        } else if (expectedType === 'text' && typeof value !== 'string') {
          errors.push(`Field '${fieldName}' must be a string`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${fieldName}' must be a boolean`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      data: validatedData
    };
  }

  /**
   * Generate SQL for model operations
   * @param {string} modelName - Model name
   * @param {string} operation - Operation type (create, read, update, delete)
   * @param {Object} params - Operation parameters
   * @returns {Object} SQL query object with sql and params properties
   */
  generateSQL(modelName, operation, params = {}) {
    const schema = this.getModel(modelName);
    if (!schema) {
      throw new Error(`Model '${modelName}' not found`);
    }

    const tableName = schema.tableName;
    const columns = Object.keys(schema.columns);

    switch (operation) {
      case 'create': {
        const insertColumns = columns.filter(col => params[col] !== undefined);
        const placeholders = insertColumns.map(() => '?');
        return {
          sql: `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
          params: insertColumns.map(col => params[col])
        };
      }

      case 'read': {
        let whereClause = '';
        let whereParams = [];

        if (params.id) {
          whereClause = 'WHERE id = ?';
          whereParams = [params.id];
        } else if (params.where) {
          // Simple where clause support
          const conditions = [];
          Object.entries(params.where).forEach(([key, value]) => {
            conditions.push(`${key} = ?`);
            whereParams.push(value);
          });
          whereClause = `WHERE ${conditions.join(' AND ')}`;
        }

        return {
          sql: `SELECT ${columns.join(', ')} FROM ${tableName} ${whereClause}`,
          params: whereParams
        };
      }

      case 'update': {
        const updateColumns = columns.filter(col => params[col] !== undefined && col !== 'id');
        const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
        const updateParams = updateColumns.map(col => params[col]);

        return {
          sql: `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
          params: [...updateParams, params.id]
        };
      }

      case 'delete': {
        return {
          sql: `DELETE FROM ${tableName} WHERE id = ?`,
          params: [params.id]
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

// Create singleton instance
export const schemaManager = new SchemaManager();

// Pre-register existing models for backward compatibility
schemaManager.registerModel('users', {
  tableName: 'users',
  columns: {
    id: { type: 'text', primaryKey: true },
    email: { type: 'text', unique: true, required: true },
    name: { type: 'text' },
    is_email_verified: { type: 'integer', default: 0 },
    created_at: { type: 'text', required: true },
    updated_at: { type: 'text', required: true }
  },
  indexes: ['email'],
  validation: {
    required: ['email']
  }
});

schemaManager.registerModel('magic_links', {
  tableName: 'magic_links',
  columns: {
    id: { type: 'text', primaryKey: true },
    token: { type: 'text', unique: true, required: true },
    user_id: { type: 'text', required: true },
    email: { type: 'text', required: true },
    expires_at: { type: 'text', required: true },
    used: { type: 'integer', default: 0 },
    created_at: { type: 'text', required: true }
  },
  relationships: {
    user: {
      model: 'users',
      type: 'belongsTo',
      foreignKey: 'user_id'
    }
  },
  indexes: ['token', 'user_id', 'expires_at']
});

schemaManager.registerModel('tokens', {
  tableName: 'tokens',
  columns: {
    id: { type: 'text', primaryKey: true },
    token: { type: 'text', unique: true, required: true },
    user_id: { type: 'text', required: true },
    type: { type: 'text', required: true },
    expires_at: { type: 'text' },
    created_at: { type: 'text', required: true }
  },
  relationships: {
    user: {
      model: 'users',
      type: 'belongsTo',
      foreignKey: 'user_id'
    }
  },
  indexes: ['token', 'user_id', 'type']
});

schemaManager.registerModel('files', {
  tableName: 'files',
  columns: {
    id: { type: 'text', primaryKey: true },
    filename: { type: 'text', required: true },
    original_name: { type: 'text', required: true },
    mime_type: { type: 'text', required: true },
    size: { type: 'integer', required: true },
    user_id: { type: 'text', required: true },
    path: { type: 'text', required: true },
    status: { type: 'text', default: 'uploaded' },
    created_at: { type: 'text', required: true },
    updated_at: { type: 'text', required: true }
  },
  relationships: {
    user: {
      model: 'users',
      type: 'belongsTo',
      foreignKey: 'user_id'
    }
  },
  indexes: ['user_id', 'status']
});

schemaManager.registerModel('logs', {
  tableName: 'logs',
  columns: {
    id: { type: 'text', primaryKey: true },
    level: { type: 'text', required: true },
    message: { type: 'text', required: true },
    user_id: { type: 'text' },
    timestamp: { type: 'text', required: true },
    metadata: { type: 'text' }
  },
  indexes: ['level', 'user_id', 'timestamp']
});

console.log('✅ Schema Manager initialized with existing models');