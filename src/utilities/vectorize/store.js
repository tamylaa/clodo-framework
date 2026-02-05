/**
 * Vectorize Store Utilities
 * Vector database operations for semantic search and RAG applications
 * 
 * @example
 * import { VectorStore, EmbeddingHelper } from '@tamyla/clodo-framework/utilities/vectorize';
 * import { AIClient } from '@tamyla/clodo-framework/utilities/ai';
 * 
 * const ai = new AIClient(env.AI);
 * const vectors = new VectorStore(env.VECTORIZE_INDEX);
 * const helper = new EmbeddingHelper(ai);
 * 
 * // Store a document
 * const embedding = await helper.embed('Document text...');
 * await vectors.insert([{ id: 'doc-1', values: embedding, metadata: { title: 'Doc 1' } }]);
 * 
 * // Search
 * const queryEmbedding = await helper.embed('Search query');
 * const results = await vectors.query(queryEmbedding, { topK: 10 });
 */

/**
 * Vector Store wrapper for Cloudflare Vectorize
 */
export class VectorStore {
  /**
   * @param {VectorizeIndex} index - Vectorize index binding
   */
  constructor(index) {
    if (!index) {
      throw new Error('Vectorize index binding is required');
    }
    this.index = index;
  }

  /**
   * Insert vectors into the index
   * @param {Array<{id: string, values: number[], metadata?: Object}>} vectors
   * @returns {Promise<{count: number}>}
   */
  async insert(vectors) {
    const formatted = vectors.map(v => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata || {}
    }));
    
    return this.index.insert(formatted);
  }

  /**
   * Upsert vectors (insert or update)
   * @param {Array<{id: string, values: number[], metadata?: Object}>} vectors
   * @returns {Promise<{count: number}>}
   */
  async upsert(vectors) {
    const formatted = vectors.map(v => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata || {}
    }));
    
    return this.index.upsert(formatted);
  }

  /**
   * Query for similar vectors
   * @param {number[]} vector - Query vector
   * @param {Object} options - Query options
   * @param {number} options.topK - Number of results (default: 10)
   * @param {Object} options.filter - Metadata filter
   * @param {boolean} options.returnValues - Include vector values in response
   * @param {boolean} options.returnMetadata - Include metadata in response
   * @returns {Promise<{matches: Array}>}
   */
  async query(vector, options = {}) {
    return this.index.query(vector, {
      topK: options.topK || 10,
      filter: options.filter,
      returnValues: options.returnValues ?? false,
      returnMetadata: options.returnMetadata ?? true
    });
  }

  /**
   * Get vectors by IDs
   * @param {string[]} ids - Vector IDs to retrieve
   * @returns {Promise<Array>}
   */
  async getByIds(ids) {
    return this.index.getByIds(ids);
  }

  /**
   * Delete vectors by IDs
   * @param {string[]} ids - Vector IDs to delete
   * @returns {Promise<{count: number}>}
   */
  async deleteByIds(ids) {
    return this.index.deleteByIds(ids);
  }

  /**
   * Get index info
   * @returns {Promise<Object>}
   */
  async describe() {
    return this.index.describe();
  }
}

/**
 * Semantic search helper combining AI embeddings with Vectorize
 */
export class VectorSearch {
  /**
   * @param {VectorStore} vectorStore - Vector store instance
   * @param {AIClient} aiClient - AI client for embeddings
   */
  constructor(vectorStore, aiClient) {
    this.store = vectorStore;
    this.ai = aiClient;
  }

  /**
   * Search with natural language query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    // Generate embedding for query
    const embeddings = await this.ai.embed(query);
    const queryVector = embeddings[0];
    
    // Query vector store
    const results = await this.store.query(queryVector, {
      topK: options.topK || 10,
      filter: options.filter,
      returnMetadata: true
    });
    
    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));
  }

  /**
   * Index a document
   * @param {string} id - Document ID
   * @param {string} text - Document text
   * @param {Object} metadata - Additional metadata
   */
  async indexDocument(id, text, metadata = {}) {
    const embeddings = await this.ai.embed(text);
    
    await this.store.upsert([{
      id,
      values: embeddings[0],
      metadata: {
        ...metadata,
        textPreview: text.slice(0, 200)
      }
    }]);
  }

  /**
   * Index multiple documents
   * @param {Array<{id: string, text: string, metadata?: Object}>} documents
   */
  async indexDocuments(documents) {
    // Batch embed all texts
    const texts = documents.map(d => d.text);
    const embeddings = await this.ai.embed(texts);
    
    const vectors = documents.map((doc, i) => ({
      id: doc.id,
      values: embeddings[i],
      metadata: {
        ...doc.metadata,
        textPreview: doc.text.slice(0, 200)
      }
    }));
    
    await this.store.upsert(vectors);
  }

  /**
   * Find similar documents
   * @param {string} documentId - Source document ID
   * @param {Object} options - Search options
   */
  async findSimilar(documentId, options = {}) {
    const [doc] = await this.store.getByIds([documentId]);
    if (!doc) return [];
    
    const results = await this.store.query(doc.values, {
      topK: (options.topK || 10) + 1, // +1 to exclude self
      filter: options.filter
    });
    
    // Filter out the source document
    return results.matches
      .filter(m => m.id !== documentId)
      .slice(0, options.topK || 10);
  }
}

/**
 * Helper for managing embeddings
 */
export class EmbeddingHelper {
  constructor(aiClient, options = {}) {
    this.ai = aiClient;
    this.model = options.model || '@cf/baai/bge-base-en-v1.5';
    this.dimensions = options.dimensions || 768;
  }

  /**
   * Generate embedding for text
   * @param {string|string[]} text - Text to embed
   * @returns {Promise<number[]|number[][]>}
   */
  async embed(text) {
    const embeddings = await this.ai.embed(text, { model: this.model });
    return Array.isArray(text) ? embeddings : embeddings[0];
  }

  /**
   * Chunk text for long documents
   * @param {string} text - Text to chunk
   * @param {Object} options - Chunking options
   */
  chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || 500;
    const overlap = options.overlap || 50;
    
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push({
        text: text.slice(start, end),
        start,
        end
      });
      start = end - overlap;
      if (start >= text.length - overlap) break;
    }
    
    return chunks;
  }

  /**
   * Embed long document with chunking
   * @param {string} documentId - Document ID
   * @param {string} text - Document text
   * @param {Object} options - Options
   */
  async embedDocument(documentId, text, options = {}) {
    const chunks = this.chunkText(text, options);
    
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embedding = await this.embed(chunk.text);
        return {
          id: `${documentId}#chunk-${i}`,
          values: embedding,
          metadata: {
            documentId,
            chunkIndex: i,
            start: chunk.start,
            end: chunk.end,
            text: chunk.text
          }
        };
      })
    );
    
    return vectors;
  }
}

export default VectorStore;
