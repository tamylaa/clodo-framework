import { schemaManager } from '../schema/SchemaManager.js';

/**
 * Generic Data Service
 * Provides CRUD operations for any configured data model
 */
export class GenericDataService {
  /**
   * Create a new GenericDataService instance
   * @param {Object} d1Client - D1 database client
   * @param {string} modelName - Name of the model to work with
   * @param {Object} options - Configuration options
   */
  constructor(d1Client, modelName, options = {}) {
    this.d1Client = d1Client;
    this.modelName = modelName;
    this.schema = schemaManager.getModel(modelName);

    if (!this.schema) {
      throw new Error(`Model '${modelName}' not registered. Use schemaManager.registerModel() first.`);
    }

    // Query result caching
    this.queryCache = new Map();
    this.cacheEnabled = options.cacheEnabled !== false;
    this.defaultCacheTTL = options.defaultCacheTTL || 300; // 5 minutes default

    // Security configuration
    this.securityConfig = {
      maxQueryLimit: options.maxQueryLimit || 1000, // Maximum records per query
      defaultQueryLimit: options.defaultQueryLimit || 100, // Default records per query
      maxBulkOperationSize: options.maxBulkOperationSize || 100, // Maximum records in bulk operations
      enablePagination: options.enablePagination !== false, // Enable pagination by default
      ...options.securityConfig
    };
  }

  /**
   * Generate cache key for query
   * @param {string} operation - Operation type
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  generateCacheKey(operation, params = {}) {
    return `${this.modelName}:${operation}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached result if valid
   * @param {string} cacheKey - Cache key
   * @returns {any|null} Cached result or null if expired/not found
   */
  getCachedResult(cacheKey) {
    if (!this.cacheEnabled) return null;

    const cached = this.queryCache.get(cacheKey);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.queryCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  /**
   * Cache query result
   * @param {string} cacheKey - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  setCachedResult(cacheKey, data, ttl = null) {
    if (!this.cacheEnabled) return;

    const expiresAt = Date.now() + (ttl || this.defaultCacheTTL) * 1000;
    this.queryCache.set(cacheKey, {
      data,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Clear cache for specific operations or all cache
   * @param {string} operation - Optional: specific operation to clear
   * @param {Object} params - Optional: specific parameters to clear
   */
  clearCache(operation = null, params = null) {
    if (operation && params) {
      // Clear specific cache entry
      const cacheKey = this.generateCacheKey(operation, params);
      this.queryCache.delete(cacheKey);
    } else if (operation) {
      // Clear all cache entries for an operation
      for (const [key] of this.queryCache) {
        if (key.startsWith(`${this.modelName}:${operation}:`)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.queryCache.clear();
    }
  }
  
  /**
   * Format validation errors into a human-readable message
   * @param {Array} errors - Validation errors array
   * @returns {string} Formatted error message
   */
  formatValidationErrors(errors = []) {
    if (!Array.isArray(errors) || errors.length === 0) {
      return 'Unknown validation error';
    }

    const details = errors
      .map((error) => {
        if (!error) {
          return null;
        }

        if (typeof error === 'string') {
          return error;
        }

        if (Array.isArray(error)) {
          return error.map((item) => this.formatValidationErrors([item])).join('; ');
        }

        if (typeof error === 'object') {
          const field = error.field || error.path || error.name || 'field';

          if (error.message) {
            return `${field}: ${error.message}`;
          }

          if (error.reason) {
            return `${field}: ${error.reason}`;
          }

          if (error.code) {
            return `${field}: ${error.code}`;
          }

          try {
            return `${field}: ${JSON.stringify(error)}`;
          } catch {
            return `${field}: ${String(error)}`;
          }
        }

        return String(error);
      })
      .filter(Boolean);

    return details.length > 0 ? details.join('; ') : 'Unknown validation error';
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    // Validate data
    const validation = schemaManager.validateData(this.modelName, data);
    if (!validation.valid) {
      const errorMessage = this.formatValidationErrors(validation.errors);
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Generate ID if not provided
    const recordData = { ...validation.data };
    if (!recordData.id) {
      recordData.id = this.d1Client.generateId();
    }

    // Set timestamps
    const now = this.d1Client.getCurrentTimestamp();
    if (this.schema.columns.created_at && !recordData.created_at) {
      recordData.created_at = now;
    }
    if (this.schema.columns.updated_at && !recordData.updated_at) {
      recordData.updated_at = now;
    }

    // Generate SQL
    const { sql, params } = schemaManager.generateSQL(this.modelName, 'create', recordData);

    // Execute
    const result = await this.d1Client.run(sql, params);

    if (result.success) {
      // Clear relevant caches after successful creation
      this.clearCache('findAll');
      this.clearCache('find');
      
      return { ...recordData, id: recordData.id };
    }

    throw new Error('Failed to create record');
  }

  /**
   * Find records by criteria with advanced options
   * @param {Object} criteria - Search criteria
   * @param {Array} include - Relationships to include
   * @param {Array} fields - Fields to select
   * @returns {Promise<Array>} Found records
   */
  async find(criteria = {}, include = [], fields = null) {
    const cacheKey = this.generateCacheKey('find', { criteria, include, fields });
    const cached = this.getCachedResult(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    let result;
    if (include.length > 0) {
      result = await this.findWithRelations(criteria, include, fields);
    } else {
      const { sql, params } = schemaManager.generateSQL(this.modelName, 'read', { where: criteria, fields });
      result = await this.d1Client.all(sql, params);
    }
    
    // Cache the result
    this.setCachedResult(cacheKey, result);
    
    return result;
  }

  /**
   * Find all records with pagination and security limits
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum records to return (default: configured default, max: configured max)
   * @param {number} options.offset - Number of records to skip (default: 0)
   * @param {Object} options.orderBy - Sort options {field: 'asc'|'desc'}
   * @param {Object} options.where - Filter criteria
   * @returns {Promise<Object>} Paginated result with data, total, limit, offset
   */
  async findAll(options = {}) {
    // Apply security limits
    const requestedLimit = options.limit !== undefined ? options.limit : this.securityConfig.defaultQueryLimit;

    // Validate limit before applying security constraints
    if (requestedLimit <= 0) {
      throw new Error(`Invalid limit: ${requestedLimit}. Must be positive.`);
    }

    const limit = Math.min(requestedLimit, this.securityConfig.maxQueryLimit);
    const offset = Math.max(0, options.offset || 0);

    // Prevent excessive offset (basic protection against very large offsets)
    if (offset > 1000000) {
      throw new Error(`Offset too large: ${offset}. Maximum allowed offset is 1,000,000.`);
    }

    const queryOptions = {
      limit,
      offset,
      orderBy: options.orderBy,
      where: options.where || {}
    };

    const cacheKey = this.generateCacheKey('findAll', queryOptions);
    const cached = this.getCachedResult(cacheKey);

    if (cached !== null) {
      return cached;
    }

    // Build query with pagination
    let sql = `SELECT * FROM ${this.schema.tableName}`;
    let params = [];

    // Add WHERE clause if provided
    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = [];
      Object.entries(options.where).forEach(([key, value]) => {
        conditions.push(`${key} = ?`);
        params.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY if provided
    if (options.orderBy && Object.keys(options.orderBy).length > 0) {
      const orderClauses = [];
      Object.entries(options.orderBy).forEach(([field, direction]) => {
        orderClauses.push(`${field} ${direction.toUpperCase()}`);
      });
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Add LIMIT and OFFSET
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute the query
    const data = await this.d1Client.all(sql, params);

    // Get total count for pagination (without LIMIT/OFFSET)
    let countSql = `SELECT COUNT(*) as total FROM ${this.schema.tableName}`;
    let countParams = [];
    
    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = [];
      Object.entries(options.where).forEach(([key, value]) => {
        conditions.push(`${key} = ?`);
        countParams.push(value);
      });
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countResult = await this.d1Client.first(countSql, countParams);
    const total = countResult ? countResult.total : 0;

    const result = {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrev: offset > 0,
        totalPages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    };

    // Cache the result
    this.setCachedResult(cacheKey, result);
    
    return result;
  }

  /**
   * Update a record
   * @param {string} id - Record ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated record
   */
  async update(id, updates) {
    // Validate updates
    const validation = schemaManager.validateData(this.modelName, updates);
    if (!validation.valid) {
      const errorMessage = this.formatValidationErrors(validation.errors);

      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Set updated timestamp
    const updateData = { ...validation.data, id };
    if (this.schema.columns.updated_at) {
      updateData.updated_at = this.d1Client.getCurrentTimestamp();
    }

    // Generate SQL
    const { sql, params } = schemaManager.generateSQL(this.modelName, 'update', updateData);

    // Execute
    const result = await this.d1Client.run(sql, params);

    if (result.success) {
      // Return updated record
      return await this.findById(id);
    } else {
      throw new Error('Failed to update record');
    }
  }

  /**
   * Delete a record
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const { sql, params } = schemaManager.generateSQL(this.modelName, 'delete', { id });
    const result = await this.d1Client.run(sql, params);
    return result.success;
  }

  /**
   * Count records matching criteria
   * @param {Object} criteria - Count criteria
   * @returns {Promise<number>} Record count
   */
  async count(criteria = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.schema.tableName}`;
    let params = [];

    if (Object.keys(criteria).length > 0) {
      const conditions = [];
      Object.entries(criteria).forEach(([key, value]) => {
        conditions.push(`${key} = ?`);
        params.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.d1Client.first(sql, params);
    return result?.count || 0;
  }

  /**
   * Check if record exists
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} Existence status
   */
  async exists(id) {
    const record = await this.findById(id);
    return !!record;
  }

  /**
   * Get paginated results
   * @param {Object} criteria - Search criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async paginate(criteria = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    // Get total count
    const total = await this.count(criteria);

    // Get paginated results
    let sql = `SELECT * FROM ${this.schema.tableName}`;
    let params = [];

    if (Object.keys(criteria).length > 0) {
      const conditions = [];
      Object.entries(criteria).forEach(([key, value]) => {
        conditions.push(`${key} = ?`);
        params.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const records = await this.d1Client.all(sql, params);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}

/**
 * Factory function to create a data service for a model
 * @param {Object} d1Client - D1 database client
 * @param {string} modelName - Name of the model
 * @returns {GenericDataService} Data service instance
 */
/**
 * Factory function to create a data service for a model
 * @param {Object} d1Client - D1 database client
 * @param {string} modelName - Name of the model
 * @returns {GenericDataService} Data service instance
 */
export function createDataService(d1Client, modelName) {
  return new GenericDataService(d1Client, modelName);
}

/**
 * Get all available data services
 * @returns {Object} Map of model names to service instances
 */
export function getAllDataServices() {
  const services = {};
  // Note: This would require schemaManager to have getAllModels method
  // for (const [modelName] of schemaManager.getAllModels()) {
  //   services[modelName] = new GenericDataService(d1Client, modelName);
  // }
  return services;
}