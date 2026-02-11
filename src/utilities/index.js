/**
 * Clodo Framework Utilities
 * 
 * Runtime utilities for Cloudflare Workers services.
 * All utilities are Worker-compatible (no Node.js dependencies).
 * 
 * @module @tamyla/clodo-framework/utilities
 */

// ============================================================
// STORAGE UTILITIES
// ============================================================

// R2 Storage
export { R2Storage, handleFileUpload, serveFile } from './storage/index.js';

// KV Storage
export { KVStorage, KVCache, KVWithMetadata } from './kv/index.js';

// ============================================================
// COMPUTE UTILITIES
// ============================================================

// Durable Objects
export { 
  DurableObjectBase,
  RateLimiter,
  SessionStore,
  Counter,
  WebSocketRoom
} from './durable-objects/index.js';

// Queues
export {
  QueueProducer,
  QueueConsumer,
  MessageBuilder,
  createMessage,
  MessageTypes
} from './queues/index.js';

// Scheduled/Cron
export {
  ScheduledHandler,
  CronJob,
  JobScheduler,
  ScheduledJobRegistry
} from './scheduled/index.js';

// ============================================================
// AI & DATA UTILITIES
// ============================================================

// Workers AI
export {
  AIClient,
  Models,
  createSSEStream,
  streamResponse
} from './ai/index.js';

// Vectorize (Vector Database)
export {
  VectorStore,
  VectorSearch,
  EmbeddingHelper
} from './vectorize/index.js';

// ============================================================
// CACHE & DATA UTILITIES
// ============================================================

// Upstash Redis
export {
  UpstashRedis,
  UpstashCache,
  SessionManager,
  RateLimiter as RedisRateLimiter,
  Leaderboard
} from './cache/index.js';

// ============================================================
// COMMUNICATION UTILITIES
// ============================================================

// Email Workers
export {
  EmailHandler,
  EmailParser,
  EmailBuilder
} from './email/index.js';

// Service Bindings (inter-service communication)
export {
  ServiceBindingClient,
  RPCClient,
  ServiceRouter
} from './bindings/index.js';

// ============================================================
// OBSERVABILITY UTILITIES
// ============================================================

// Analytics Engine
export {
  AnalyticsWriter,
  EventTracker,
  MetricsCollector
} from './analytics/index.js';

// ============================================================
// STANDALONE UTILITY FUNCTIONS
// ============================================================

// AI Utilities
/**
 * Run an AI model directly
 * @param {Object} aiBinding - AI binding from env
 * @param {string} model - Model name
 * @param {Object} inputs - Model inputs
 * @returns {Promise<Object>} Model response
 */
export async function runAIModel(aiBinding, model, inputs) {
  const { AIClient } = await import('./ai/index.js');
  const ai = new AIClient(aiBinding);
  return ai.run(model, inputs);
}

/**
 * Stream AI response
 * @param {Object} aiBinding - AI binding from env
 * @param {string} model - Model name
 * @param {Object} inputs - Model inputs
 * @returns {Promise<Response>} Streaming response
 */
export async function streamAIResponse(aiBinding, model, inputs) {
  const { AIClient, streamResponse } = await import('./ai/index.js');
  const ai = new AIClient(aiBinding);
  const stream = await ai.run(model, { ...inputs, stream: true });
  return streamResponse(stream);
}

/**
 * Format AI prompt with context
 * @param {string} prompt - Base prompt
 * @param {Object} context - Context data
 * @returns {string} Formatted prompt
 */
export function formatAIPrompt(prompt, context = {}) {
  let formatted = prompt;
  
  // Replace placeholders like {{key}} with context values
  for (const [key, value] of Object.entries(context)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    formatted = formatted.replace(placeholder, String(value));
  }
  
  return formatted;
}

// Vectorize Utilities
/**
 * Query vectors from Vectorize index
 * @param {Object} vectorizeBinding - Vectorize binding from env
 * @param {number[]} vector - Query vector
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Query results
 */
export async function queryVectors(vectorizeBinding, vector, options = {}) {
  const { VectorStore } = await import('./vectorize/index.js');
  const store = new VectorStore(vectorizeBinding);
  return store.query(vector, options);
}

/**
 * Upsert vectors to Vectorize index
 * @param {Object} vectorizeBinding - Vectorize binding from env
 * @param {Array} vectors - Vectors to upsert
 * @returns {Promise<Object>} Upsert results
 */
export async function upsertVectors(vectorizeBinding, vectors) {
  const { VectorStore } = await import('./vectorize/index.js');
  const store = new VectorStore(vectorizeBinding);
  return store.upsert(vectors);
}

// KV Utilities
/**
 * Get value from KV storage
 * @param {Object} kvBinding - KV binding from env
 * @param {string} key - Key to retrieve
 * @param {Object} options - Get options
 * @returns {Promise<*>} Retrieved value
 */
export async function getKV(kvBinding, key, options = {}) {
  const { KVStorage } = await import('./kv/index.js');
  const kv = new KVStorage(kvBinding);
  return kv.get(key, options);
}

/**
 * Put value in KV storage
 * @param {Object} kvBinding - KV binding from env
 * @param {string} key - Key to set
 * @param {*} value - Value to store
 * @param {Object} options - Put options
 * @returns {Promise<void>}
 */
export async function putKV(kvBinding, key, value, options = {}) {
  const { KVStorage } = await import('./kv/index.js');
  const kv = new KVStorage(kvBinding);
  return kv.set(key, value, options);
}

/**
 * List keys from KV storage
 * @param {Object} kvBinding - KV binding from env
 * @param {Object} options - List options
 * @returns {Promise<Object>} List results
 */
export async function listKV(kvBinding, options = {}) {
  const { KVStorage } = await import('./kv/index.js');
  const kv = new KVStorage(kvBinding);
  return kv.list(options);
}
