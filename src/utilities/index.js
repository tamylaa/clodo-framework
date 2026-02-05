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
