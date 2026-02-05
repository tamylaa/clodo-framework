/**
 * R2 Storage Utilities
 * Provides convenient methods for working with Cloudflare R2 buckets
 * 
 * @example
 * import { R2Storage } from '@tamyla/clodo-framework/utilities/storage';
 * 
 * export default {
 *   async fetch(request, env) {
 *     const storage = new R2Storage(env.BUCKET);
 *     
 *     // Upload a file
 *     await storage.upload('images/photo.jpg', imageData, {
 *       contentType: 'image/jpeg',
 *       metadata: { uploadedBy: 'user-123' }
 *     });
 *     
 *     // Get a file
 *     const file = await storage.get('images/photo.jpg');
 *     
 *     // List files
 *     const files = await storage.list('images/', { limit: 100 });
 *   }
 * }
 */

/**
 * R2 Storage wrapper class
 */
export class R2Storage {
  /**
   * @param {R2Bucket} bucket - The R2 bucket binding
   */
  constructor(bucket) {
    if (!bucket) {
      throw new Error('R2 bucket binding is required');
    }
    this.bucket = bucket;
  }

  /**
   * Upload a file to R2
   * @param {string} key - Object key (path)
   * @param {ReadableStream|ArrayBuffer|string|Blob} data - File data
   * @param {Object} options - Upload options
   * @param {string} options.contentType - MIME type
   * @param {Object} options.metadata - Custom metadata
   * @param {string} options.cacheControl - Cache-Control header
   * @returns {Promise<R2Object>}
   */
  async upload(key, data, options = {}) {
    const httpMetadata = {};
    
    if (options.contentType) {
      httpMetadata.contentType = options.contentType;
    }
    if (options.cacheControl) {
      httpMetadata.cacheControl = options.cacheControl;
    }
    if (options.contentDisposition) {
      httpMetadata.contentDisposition = options.contentDisposition;
    }
    if (options.contentEncoding) {
      httpMetadata.contentEncoding = options.contentEncoding;
    }
    if (options.contentLanguage) {
      httpMetadata.contentLanguage = options.contentLanguage;
    }

    return this.bucket.put(key, data, {
      httpMetadata,
      customMetadata: options.metadata || {}
    });
  }

  /**
   * Get a file from R2
   * @param {string} key - Object key
   * @returns {Promise<R2ObjectBody|null>}
   */
  async get(key) {
    return this.bucket.get(key);
  }

  /**
   * Get only object metadata (head)
   * @param {string} key - Object key
   * @returns {Promise<R2Object|null>}
   */
  async head(key) {
    return this.bucket.head(key);
  }

  /**
   * Delete a file from R2
   * @param {string} key - Object key
   * @returns {Promise<void>}
   */
  async delete(key) {
    return this.bucket.delete(key);
  }

  /**
   * Delete multiple files
   * @param {string[]} keys - Array of object keys
   * @returns {Promise<void>}
   */
  async deleteMany(keys) {
    return this.bucket.delete(keys);
  }

  /**
   * List objects in the bucket
   * @param {string} prefix - Key prefix to filter by
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.cursor - Pagination cursor
   * @param {string} options.delimiter - Delimiter for hierarchy
   * @returns {Promise<R2Objects>}
   */
  async list(prefix = '', options = {}) {
    return this.bucket.list({
      prefix,
      limit: options.limit || 1000,
      cursor: options.cursor,
      delimiter: options.delimiter,
      include: options.include || ['httpMetadata', 'customMetadata']
    });
  }

  /**
   * List all objects (handles pagination automatically)
   * @param {string} prefix - Key prefix to filter by
   * @returns {AsyncGenerator<R2Object>}
   */
  async *listAll(prefix = '') {
    let cursor;
    
    do {
      const result = await this.list(prefix, { cursor });
      
      for (const object of result.objects) {
        yield object;
      }
      
      cursor = result.truncated ? result.cursor : null;
    } while (cursor);
  }

  /**
   * Check if an object exists
   * @param {string} key - Object key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const head = await this.head(key);
    return head !== null;
  }

  /**
   * Copy an object within the bucket
   * @param {string} sourceKey - Source object key
   * @param {string} destKey - Destination object key
   * @returns {Promise<R2Object>}
   */
  async copy(sourceKey, destKey) {
    const source = await this.get(sourceKey);
    if (!source) {
      throw new Error(`Source object not found: ${sourceKey}`);
    }

    return this.upload(destKey, source.body, {
      contentType: source.httpMetadata?.contentType,
      metadata: source.customMetadata
    });
  }

  /**
   * Move an object within the bucket
   * @param {string} sourceKey - Source object key
   * @param {string} destKey - Destination object key
   * @returns {Promise<R2Object>}
   */
  async move(sourceKey, destKey) {
    const result = await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
    return result;
  }

  /**
   * Get a signed URL info for temporary access
   * Note: R2 doesn't have built-in signed URLs, this returns info for custom implementation
   * @param {string} key - Object key
   * @param {Object} options - Signing options
   * @returns {Object} URL info object
   */
  createSignedUrlInfo(key, options = {}) {
    const expiresIn = options.expiresIn || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;
    
    return {
      key,
      bucket: this.bucket,
      expiresAt,
      expiresIn,
      // Implement custom signing logic in your application
      // This is a placeholder for the signing parameters
      signatureParams: {
        key,
        expires: expiresAt,
        ...options
      }
    };
  }
}

/**
 * Handle file upload from multipart form data
 * @param {Request} request - Incoming request
 * @param {R2Storage} storage - R2Storage instance
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export async function handleFileUpload(request, storage, options = {}) {
  const {
    fieldName = 'file',
    keyPrefix = '',
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = null,
    generateKey = null
  } = options;

  const formData = await request.formData();
  const file = formData.get(fieldName);

  if (!file || !(file instanceof File)) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize} bytes`);
  }

  // Check content type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }

  // Generate key
  const key = generateKey 
    ? generateKey(file)
    : `${keyPrefix}${Date.now()}-${file.name}`;

  // Upload
  const result = await storage.upload(key, file, {
    contentType: file.type,
    metadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString()
    }
  });

  return {
    key,
    size: file.size,
    type: file.type,
    name: file.name,
    etag: result.etag
  };
}

/**
 * Serve a file from R2 with proper headers
 * @param {R2Storage} storage - R2Storage instance
 * @param {string} key - Object key
 * @param {Request} request - Original request (for range headers)
 * @returns {Promise<Response>}
 */
export async function serveFile(storage, key, request) {
  const object = await storage.get(key);
  
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  
  // Set content type
  if (object.httpMetadata?.contentType) {
    headers.set('Content-Type', object.httpMetadata.contentType);
  }
  
  // Set cache control
  if (object.httpMetadata?.cacheControl) {
    headers.set('Cache-Control', object.httpMetadata.cacheControl);
  } else {
    headers.set('Cache-Control', 'public, max-age=31536000');
  }
  
  // Set ETag
  headers.set('ETag', object.etag);
  
  // Set content length
  headers.set('Content-Length', object.size.toString());

  // Handle range requests
  const range = request.headers.get('Range');
  if (range) {
    const [start, end] = range.replace('bytes=', '').split('-').map(Number);
    const actualEnd = end || object.size - 1;
    
    headers.set('Content-Range', `bytes ${start}-${actualEnd}/${object.size}`);
    headers.set('Content-Length', (actualEnd - start + 1).toString());
    
    return new Response(object.body, {
      status: 206,
      headers
    });
  }

  return new Response(object.body, { headers });
}

export default R2Storage;
