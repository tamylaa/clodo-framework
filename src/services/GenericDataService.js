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
   */
  constructor(d1Client, modelName) {
    this.d1Client = d1Client;
    this.modelName = modelName;
    this.schema = schemaManager.getModel(modelName);

    if (!this.schema) {
      throw new Error(`Model '${modelName}' not registered. Use schemaManager.registerModel() first.`);
    }
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
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
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
      return { ...recordData, id: recordData.id };
    } else {
      throw new Error('Failed to create record');
    }
  }

  /**
   * Find a record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Found record or null
   */
  async findById(id) {
    const { sql, params } = schemaManager.generateSQL(this.modelName, 'read', { id });
    return await this.d1Client.first(sql, params);
  }

  /**
   * Find records by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Found records
   */
  async find(criteria = {}, options = {}) {
    const { sql, params } = schemaManager.generateSQL(this.modelName, 'read', { where: criteria });
    return await this.d1Client.all(sql, params);
  }

  /**
   * Find all records
   * @param {Object} options - Query options
   * @returns {Promise<Array>} All records
   */
  async findAll(options = {}) {
    const { sql, params } = schemaManager.generateSQL(this.modelName, 'read', {});
    return await this.d1Client.all(sql, params);
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
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
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
export function createDataService(d1Client, modelName) {
  return new GenericDataService(d1Client, modelName);
}

/**
 * Get all available data services
 * @param {Object} d1Client - D1 database client
 * @returns {Object} Map of model names to service instances
 */
export function getAllDataServices(d1Client) {
  const services = {};
  for (const [modelName] of schemaManager.getAllModels()) {
    services[modelName] = new GenericDataService(d1Client, modelName);
  }
  return services;
}