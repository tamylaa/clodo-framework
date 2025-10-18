import { schemaManager } from '../schema/SchemaManager.js';
import { createDataService } from '../services/GenericDataService.js';
import { moduleManager } from '../modules/ModuleManager.js';

/**
 * Generic Route Handlers
 * Provides reusable CRUD handlers for any configured data model
 */

export class GenericRouteHandler {
  /**
   * Create a new GenericRouteHandler instance
   * @param {Object} d1Client - D1 database client
   * @param {string} modelName - Name of the model
   * @param {Object} options - Handler options
   */
  constructor(d1Client, modelName, options = {}) {
    this.d1Client = d1Client;
    this.modelName = modelName;
    this.dataService = createDataService(d1Client, modelName);
    this.options = {
      requireAuth: options.requireAuth !== false, // Default to requiring auth
      allowPublicRead: options.allowPublicRead || false,
      customValidators: options.customValidators || {},
      hooks: options.hooks || {},
      ...options
    };
  }

  /**
   * Handle GET /:model - List all records
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async handleList(request) {
    try {
      // Check authentication if required
      if (this.options.requireAuth && !this.options.allowPublicRead) {
        const authResult = await this._checkAuth(request);
        if (!authResult.authenticated) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Parse query parameters
      const url = new URL(request.url);
      const criteria = this._parseQueryCriteria(url.searchParams);
      const pagination = this._parsePagination(url.searchParams);

      // Execute hooks
      await moduleManager.executeHooks('before.list', {
        model: this.modelName,
        request,
        criteria,
        pagination
      });

      // Get data
      let result;
      if (pagination.limit) {
        result = await this.dataService.paginate(criteria, pagination);
      } else {
        const data = await this.dataService.find(criteria);
        result = { data, pagination: null };
      }

      // Execute hooks
      await moduleManager.executeHooks('after.list', {
        model: this.modelName,
        request,
        result
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: result.data,
          pagination: result.pagination
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error(`Error in ${this.modelName} list:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to retrieve records',
          message: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Handle GET /:model/:id - Get single record
   * @param {Request} request - HTTP request
   * @param {string} id - Record ID
   * @returns {Promise<Response>} HTTP response
   */
  async handleGet(request, id) {
    try {
      // Check authentication if required
      if (this.options.requireAuth && !this.options.allowPublicRead) {
        const authResult = await this._checkAuth(request);
        if (!authResult.authenticated) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Execute hooks
      await moduleManager.executeHooks('before.get', {
        model: this.modelName,
        request,
        id
      });

      // Get data
      const record = await this.dataService.findById(id);

      if (!record) {
        return new Response(
          JSON.stringify({ success: false, error: 'Record not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Execute hooks
      await moduleManager.executeHooks('after.get', {
        model: this.modelName,
        request,
        record
      });

      return new Response(
        JSON.stringify({ success: true, data: record }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error(`Error in ${this.modelName} get:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to retrieve record',
          message: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Handle POST /:model - Create new record
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async handleCreate(request) {
    try {
      // Check authentication if required
      if (this.options.requireAuth) {
        const authResult = await this._checkAuth(request);
        if (!authResult.authenticated) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Parse request body
      const data = await request.json();

      // Execute hooks
      await moduleManager.executeHooks('before.create', {
        model: this.modelName,
        request,
        data
      });

      // Custom validation
      if (this.options.customValidators.create) {
        const validation = await this.options.customValidators.create(data, request);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Validation failed',
              details: validation.errors
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create record
      const record = await this.dataService.create(data);

      // Execute hooks
      await moduleManager.executeHooks('after.create', {
        model: this.modelName,
        request,
        record
      });

      return new Response(
        JSON.stringify({ success: true, data: record }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error(`Error in ${this.modelName} create:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create record',
          message: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Handle PATCH /:model/:id - Update record
   * @param {Request} request - HTTP request
   * @param {string} id - Record ID
   * @returns {Promise<Response>} HTTP response
   */
  async handleUpdate(request, id) {
    try {
      // Check authentication if required
      if (this.options.requireAuth) {
        const authResult = await this._checkAuth(request);
        if (!authResult.authenticated) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Parse request body
      const updates = await request.json();

      // Check if record exists
      const existing = await this.dataService.findById(id);
      if (!existing) {
        return new Response(
          JSON.stringify({ success: false, error: 'Record not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Execute hooks
      await moduleManager.executeHooks('before.update', {
        model: this.modelName,
        request,
        id,
        updates,
        existing
      });

      // Custom validation
      if (this.options.customValidators.update) {
        const validation = await this.options.customValidators.update(updates, request, existing);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Validation failed',
              details: validation.errors
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update record
      const record = await this.dataService.update(id, updates);

      // Execute hooks
      await moduleManager.executeHooks('after.update', {
        model: this.modelName,
        request,
        record
      });

      return new Response(
        JSON.stringify({ success: true, data: record }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error(`Error in ${this.modelName} update:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update record',
          message: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Handle DELETE /:model/:id - Delete record
   * @param {Request} request - HTTP request
   * @param {string} id - Record ID
   * @returns {Promise<Response>} HTTP response
   */
  async handleDelete(request, id) {
    try {
      // Check authentication if required
      if (this.options.requireAuth) {
        const authResult = await this._checkAuth(request);
        if (!authResult.authenticated) {
          return new Response(
            JSON.stringify({ success: false, error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check if record exists
      const existing = await this.dataService.findById(id);
      if (!existing) {
        return new Response(
          JSON.stringify({ success: false, error: 'Record not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Execute hooks
      await moduleManager.executeHooks('before.delete', {
        model: this.modelName,
        request,
        id,
        existing
      });

      // Delete record
      const success = await this.dataService.delete(id);

      if (success) {
        // Execute hooks
        await moduleManager.executeHooks('after.delete', {
          model: this.modelName,
          request,
          id
        });

        return new Response(
          JSON.stringify({ success: true, data: { id } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error('Delete operation failed');
      }

    } catch (error) {
      console.error(`Error in ${this.modelName} delete:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete record',
          message: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Check authentication (placeholder - integrate with your auth system)
   * @param {Request} request - HTTP request
   * @returns {Promise<Object>} Auth result
   * @private
   */
  async _checkAuth(request) {
    // This should integrate with your existing auth middleware
    // For now, return authenticated if there's an authorization header
    const authHeader = request.headers.get('authorization');
    return {
      authenticated: !!authHeader,
      user: authHeader ? { id: 'user-from-token' } : null
    };
  }

  /**
   * Parse query parameters into search criteria
   * @param {URLSearchParams} params - Query parameters
   * @returns {Object} Search criteria
   * @private
   */
  _parseQueryCriteria(params) {
    const criteria = {};

    for (const [key, value] of params.entries()) {
      // Skip pagination params
      if (['page', 'limit', 'offset'].includes(key)) continue;

      // Handle different query types
      if (key.endsWith('_gt')) {
        const field = key.slice(0, -3);
        criteria[field] = { $gt: value };
      } else if (key.endsWith('_lt')) {
        const field = key.slice(0, -3);
        criteria[field] = { $lt: value };
      } else if (key.endsWith('_like')) {
        const field = key.slice(0, -5);
        criteria[field] = { $like: value };
      } else {
        criteria[key] = value;
      }
    }

    return criteria;
  }

  /**
   * Parse pagination parameters
   * @param {URLSearchParams} params - Query parameters
   * @returns {Object} Pagination options
   * @private
   */
  _parsePagination(params) {
    return {
      page: parseInt(params.get('page')) || 1,
      limit: parseInt(params.get('limit')) || null,
      offset: parseInt(params.get('offset')) || null
    };
  }
}

/**
 * Factory function to create route handlers for all models
 * @param {Object} d1Client - D1 database client
 * @param {Object} options - Global options
 * @returns {Object} Map of model names to handler instances
 */
export function createRouteHandlers(d1Client, options = {}) {
  const handlers = {};

  for (const [modelName] of schemaManager.getAllModels()) {
    handlers[modelName] = new GenericRouteHandler(d1Client, modelName, options);
  }

  return handlers;
}