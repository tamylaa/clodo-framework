/**
 * Configurable Schema System
 * Allows defining data models externally for maximum reusability
 */

export class SchemaManager {
  constructor() {
    this.schemas = new Map();
    this.relationships = new Map();
    
    // Schema caching for performance
    this.schemaCache = new Map();
    this.sqlCache = new Map();
    this.cacheEnabled = true;
    
    // Validation cache
    this.validationCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      validationHits: 0,
      validationMisses: 0
    };
  }

  /**
   * Register a data model schema
   * @param {string} modelName - Name of the model
   * @param {Object} schema - Schema definition
   */
  registerModel(modelName, schema) {
    // Clear caches when schema is updated
    this.clearSchemaCache(modelName);
    
    const processedSchema = {
      name: modelName,
      tableName: schema.tableName || modelName.toLowerCase(),
      columns: schema.columns || {},
      indexes: schema.indexes || [],
      relationships: schema.relationships || {},
      hooks: schema.hooks || {},
      validation: schema.validation || {},
      ...schema
    };
    
    this.schemas.set(modelName, processedSchema);
    this.schemaCache.set(modelName, processedSchema);

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
    // Check cache first
    if (this.cacheEnabled && this.schemaCache.has(modelName)) {
      return this.schemaCache.get(modelName);
    }
    
    // Get from main storage
    const schema = this.schemas.get(modelName);
    
    // Cache if found
    if (schema && this.cacheEnabled) {
      this.schemaCache.set(modelName, schema);
    }
    
    return schema;
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
   * Generate SQL for model operations
   * @param {string} modelName - Model name
   * @param {string} operation - Operation type (create, read, update, delete)
   * @param {Object} params - Operation parameters
   * @returns {Object} SQL query object with sql and params properties
   */
  generateSQL(modelName, operation, params = {}) {
    // Generate cache key for this operation
    const cacheKey = this.generateCacheKey(modelName, operation, params);
    
    // Check SQL cache first
    if (this.cacheEnabled && this.sqlCache.has(cacheKey)) {
      this.cacheStats.hits++;
      return this.sqlCache.get(cacheKey);
    }
    
    this.cacheStats.misses++;
    
    const schema = this.getModel(modelName);
    if (!schema) {
      throw new Error(`Model '${modelName}' not found`);
    }

    const tableName = schema.tableName;
    const columns = Object.keys(schema.columns);

    let result;
    let parameterMapping = [];

    switch (operation) {
      case 'create': {
        const insertColumns = columns.filter(col => params[col] !== undefined);
        const placeholders = insertColumns.map(() => '?');
        result = {
          sql: `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
          params: insertColumns.map(col => params[col])
        };
        parameterMapping = insertColumns;
        break;
      }

      case 'read': {
        let whereClause = '';
        let whereParams = [];

        if (params.id) {
          whereClause = 'WHERE id = ?';
          whereParams = [params.id];
          parameterMapping = ['id'];
        } else if (params.where) {
          const conditions = [];
          Object.entries(params.where).forEach(([key, value]) => {
            conditions.push(`${key} = ?`);
            whereParams.push(value);
            parameterMapping.push(`where.${key}`);
          });
          whereClause = `WHERE ${conditions.join(' AND ')}`;
        }

        const selectFields = params.fields ? params.fields.join(', ') : columns.join(', ');
        result = {
          sql: `SELECT ${selectFields} FROM ${tableName} ${whereClause}`,
          params: whereParams
        };
        break;
      }

      case 'update': {
        const updateColumns = columns.filter(col => params[col] !== undefined && col !== 'id');
        const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
        const updateParams = updateColumns.map(col => params[col]);

        result = {
          sql: `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
          params: [...updateParams, params.id]
        };
        parameterMapping = [...updateColumns, 'id'];
        break;
      }

      case 'delete': {
        result = {
          sql: `DELETE FROM ${tableName} WHERE id = ?`,
          params: [params.id]
        };
        parameterMapping = ['id'];
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Cache the SQL template for future use
    if (this.cacheEnabled) {
      this.sqlCache.set(cacheKey, {
        sql: result.sql,
        params: result.params,
        parameterMapping
      });
    }

    return result;
  }

  /**
   * Clear schema cache for specific model or all models
   * @param {string} modelName - Optional: specific model to clear
   */
  clearSchemaCache(modelName = null) {
    if (modelName) {
      this.schemaCache.delete(modelName);
      // Clear related SQL cache entries
      for (const [key] of this.sqlCache) {
        if (key.startsWith(`${modelName}:`)) {
          this.sqlCache.delete(key);
        }
      }
    } else {
      this.schemaCache.clear();
      this.sqlCache.clear();
    }
  }

  /**
   * Generate cache key for SQL queries
   * @param {string} modelName - Model name
   * @param {string} operation - Operation type
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(modelName, operation, params = {}) {
    return `${modelName}:${operation}:${JSON.stringify(params)}`;
  }

  /**
   * Enhanced validation with comprehensive error reporting
   * @param {string} modelName - Model name
   * @param {Object} data - Data to validate
   * @returns {Object} Detailed validation result
   */
  validateData(modelName, data) {
    const schema = this.getModel(modelName);
    if (!schema) {
      return {
        valid: false,
        errors: [{ field: '_model', message: `Model '${modelName}' not found`, code: 'MODEL_NOT_FOUND' }],
        fieldErrors: {},
        data: null
      };
    }

    const errors = [];
    const validatedData = { ...data };
    const fieldErrors = {};

    // Check required fields
    if (schema.validation?.required) {
      schema.validation.required.forEach(field => {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          const error = {
            field,
            message: `Field '${field}' is required`,
            code: 'REQUIRED_FIELD_MISSING',
            value: data[field]
          };
          errors.push(error);
          fieldErrors[field] = fieldErrors[field] || [];
          fieldErrors[field].push(error);
        }
      });
    }

    // Validate each field against schema
    Object.entries(schema.columns).forEach(([fieldName, fieldConfig]) => {
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        const value = data[fieldName];
        const validationResult = this._validateField(fieldName, value, fieldConfig, schema);

        if (!validationResult.valid) {
          validationResult.errors.forEach(error => {
            errors.push(error);
            fieldErrors[fieldName] = fieldErrors[fieldName] || [];
            fieldErrors[fieldName].push(error);
          });
        }

        // Apply transformations
        if (validationResult.transformed !== undefined) {
          validatedData[fieldName] = validationResult.transformed;
        }
      }
    });

    // Custom validation rules
    if (schema.validation?.custom) {
      Object.entries(schema.validation.custom).forEach(([ruleName, ruleConfig]) => {
        const result = this._validateCustomRule(ruleName, ruleConfig, data, validatedData);
        if (!result.valid) {
          result.errors.forEach(error => {
            errors.push(error);
            const field = error.field || '_custom';
            fieldErrors[field] = fieldErrors[field] || [];
            fieldErrors[field].push(error);
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      fieldErrors,
      data: validatedData
    };
  }

  /**
   * Validate individual field
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {Object} fieldConfig - Field configuration
   * @returns {Object} Field validation result
   * @private
   */
  _validateField(fieldName, value, fieldConfig) {
    const errors = [];
    let transformedValue = value;

    // Type validation
    if (fieldConfig.type) {
      const typeValidation = this._validateFieldType(fieldName, value, fieldConfig.type);
      if (!typeValidation.valid) {
        errors.push(...typeValidation.errors);
      } else if (typeValidation.transformed !== undefined) {
        transformedValue = typeValidation.transformed;
      }
    }

    // Length validation
    if (fieldConfig.minLength || fieldConfig.maxLength) {
      const lengthValidation = this._validateFieldLength(fieldName, transformedValue, fieldConfig);
      if (!lengthValidation.valid) {
        errors.push(...lengthValidation.errors);
      }
    }

    // Pattern validation
    if (fieldConfig.pattern) {
      const patternValidation = this._validateFieldPattern(fieldName, transformedValue, fieldConfig.pattern);
      if (!patternValidation.valid) {
        errors.push(...patternValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      transformed: transformedValue !== value ? transformedValue : undefined
    };
  }

  /**
   * Validate field type
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {string} expectedType - Expected type
   * @returns {Object} Type validation result
   * @private
   */
  _validateFieldType(fieldName, value, expectedType) {
    const errors = [];
    let transformedValue = value;

    switch (expectedType) {
      case 'text':
        if (typeof value !== 'string') {
          transformedValue = String(value);
        }
        // Trim whitespace for text fields
        if (typeof transformedValue === 'string') {
          transformedValue = transformedValue.trim();
        }
        break;

      case 'integer':
        if (!Number.isInteger(Number(value))) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be an integer`,
            code: 'INVALID_TYPE',
            value
          });
        } else {
          transformedValue = parseInt(value, 10);
        }
        break;

      case 'real':
        if (isNaN(Number(value))) {
          errors.push({
            field: fieldName,
            message: `Field '${fieldName}' must be a number`,
            code: 'INVALID_TYPE',
            value
          });
        } else {
          transformedValue = parseFloat(value);
        }
        break;

      case 'blob':
        // No specific validation for blob type
        break;

      default:
        console.warn(`Unknown field type: ${expectedType} for field ${fieldName}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      transformed: transformedValue !== value ? transformedValue : undefined
    };
  }

  /**
   * Validate field length constraints
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {Object} fieldConfig - Field configuration
   * @returns {Object} Length validation result
   * @private
   */
  _validateFieldLength(fieldName, value, fieldConfig) {
    const errors = [];
    const stringValue = String(value);

    if (fieldConfig.minLength && stringValue.length < fieldConfig.minLength) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be at least ${fieldConfig.minLength} characters`,
        code: 'MIN_LENGTH_VIOLATION',
        value
      });
    }

    if (fieldConfig.maxLength && stringValue.length > fieldConfig.maxLength) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' cannot exceed ${fieldConfig.maxLength} characters`,
        code: 'MAX_LENGTH_VIOLATION',
        value
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field pattern
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {RegExp|string} pattern - Pattern to match
   * @returns {Object} Pattern validation result
   * @private
   */
  _validateFieldPattern(fieldName, value, pattern) {
    const errors = [];
    const stringValue = String(value);
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

    if (!regex.test(stringValue)) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' does not match required pattern`,
        code: 'PATTERN_MISMATCH',
        value,
        pattern: pattern.toString()
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate custom rules
   * @param {string} ruleName - Rule name
   * @param {Object} ruleConfig - Rule configuration
   * @param {Object} originalData - Original data
   * @param {Object} validatedData - Validated data so far
   * @returns {Object} Custom validation result
   * @private
   */
  _validateCustomRule(ruleName, ruleConfig, originalData, validatedData) {
    const errors = [];

    try {
      if (typeof ruleConfig === 'function') {
        const result = ruleConfig(originalData, validatedData);
        if (result !== true) {
          errors.push({
            field: '_custom',
            message: typeof result === 'string' ? result : `Custom rule '${ruleName}' failed`,
            code: 'CUSTOM_RULE_VIOLATION',
            rule: ruleName
          });
        }
      } else if (ruleConfig.validator && typeof ruleConfig.validator === 'function') {
        const result = ruleConfig.validator(originalData, validatedData);
        if (result !== true) {
          errors.push({
            field: ruleConfig.field || '_custom',
            message: result || ruleConfig.message || `Custom rule '${ruleName}' failed`,
            code: 'CUSTOM_RULE_VIOLATION',
            rule: ruleName
          });
        }
      }
    } catch (error) {
      errors.push({
        field: '_custom',
        message: `Custom rule '${ruleName}' threw an error: ${error.message}`,
        code: 'CUSTOM_RULE_ERROR',
        rule: ruleName
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract template parameters for SQL caching
   * @param {Object} params - Full parameters
   * @param {string} operation - Operation type
   * @returns {Object} Template parameters for caching
   * @private
   */
  _extractTemplateParams(params, operation) {
    const templateParams = {};
    
    switch (operation) {
      case 'create':
        templateParams.columns = Object.keys(params).filter(key => key !== 'id');
        break;
      case 'read':
        templateParams.hasId = !!params.id;
        templateParams.hasWhere = !!params.where;
        templateParams.whereKeys = params.where ? Object.keys(params.where) : [];
        templateParams.fields = params.fields || null;
        break;
      case 'update':
        templateParams.columns = Object.keys(params).filter(key => key !== 'id');
        break;
      case 'delete':
        templateParams.hasId = !!params.id;
        break;
    }
    
    return templateParams;
  }

  /**
   * Bind actual parameter values to cached SQL template
   * @param {Object} template - Cached SQL template
   * @param {Object} params - Actual parameters
   * @returns {Array} Bound parameters
   * @private
   */
  _bindParametersToTemplate(template, params) {
    if (!template.parameterMapping) {
      return template.params || [];
    }
    
    return template.parameterMapping.map(paramPath => {
      if (paramPath.startsWith('where.')) {
        const key = paramPath.substring(6);
        return params.where[key];
      }
      return params[paramPath];
    });
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
