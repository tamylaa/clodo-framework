// Centralized configuration for service payload schema values
// Allows runtime overrides for enums and features to keep validation flexible and configurable

let config = {
  serviceTypes: [
    'api-service',
    'data-service',
    'worker',
    'pages',
    'gateway',
    'generic',
    // New real-world Cloudflare Worker patterns
    'ai-worker',
    'queue-processor',
    'cron-worker',
    'edge-proxy'
  ],
  features: [
    // Storage & Databases
    'd1', 'kv', 'r2',
    // AI & ML
    'ai', 'vectorize',
    // Messaging & Events
    'queues', 'cron',
    // Compute
    'durableObject', 'durableObjects',
    // Communication
    'email', 'ws',
    // Networking
    'hyperdrive', 'browser',
    // Observability
    'metrics', 'analytics',
    // Infrastructure
    'pages',
    // Legacy (kept for backward compatibility)
    'upstash'
  ]
};

export function getConfig() {
  return { ...config };
}

export function setConfig(updates = {}) {
  if (updates.serviceTypes) config.serviceTypes = [...updates.serviceTypes];
  if (updates.features) config.features = [...updates.features];
}

export function resetConfig() {
  config = {
    serviceTypes: [
      'api-service',
      'data-service',
      'worker',
      'pages',
      'gateway',
      'generic',
      'ai-worker',
      'queue-processor',
      'cron-worker',
      'edge-proxy'
    ],
    features: [
      'd1', 'kv', 'r2',
      'ai', 'vectorize',
      'queues', 'cron',
      'durableObject', 'durableObjects',
      'email', 'ws',
      'hyperdrive', 'browser',
      'metrics', 'analytics',
      'pages',
      'upstash'
    ]
  };
}

/**
 * Maps feature names to their wrangler.toml binding configuration.
 * Used by scaffold generators to produce correct wrangler.toml output.
 */
export const FEATURE_BINDING_MAP = {
  ai: {
    toml: '[ai]\nbinding = "AI"',
    envType: 'Ai',
    binding: 'AI'
  },
  vectorize: {
    toml: '[[vectorize]]\nbinding = "VECTORIZE_INDEX"\nindex_name = "my-index"',
    envType: 'VectorizeIndex',
    binding: 'VECTORIZE_INDEX'
  },
  kv: {
    toml: '[[kv_namespaces]]\nbinding = "KV_DATA"\nid = ""',
    envType: 'KVNamespace',
    binding: 'KV_DATA'
  },
  d1: {
    toml: '[[d1_databases]]\nbinding = "DB"\ndatabase_name = ""\ndatabase_id = ""',
    envType: 'D1Database',
    binding: 'DB'
  },
  r2: {
    toml: '[[r2_buckets]]\nbinding = "R2_STORAGE"\nbucket_name = ""',
    envType: 'R2Bucket',
    binding: 'R2_STORAGE'
  },
  queues: {
    toml: '[[queues.producers]]\nbinding = "QUEUE"\nqueue = "my-queue"\n\n[[queues.consumers]]\nqueue = "my-queue"\nmax_batch_size = 10\nmax_batch_timeout = 30',
    envType: 'Queue',
    binding: 'QUEUE'
  },
  durableObject: {
    toml: '[[durable_objects.bindings]]\nname = "MY_DURABLE_OBJECT"\nclass_name = "MyDurableObject"',
    envType: 'DurableObjectNamespace',
    binding: 'MY_DURABLE_OBJECT'
  },
  durableObjects: {
    toml: '[[durable_objects.bindings]]\nname = "MY_DURABLE_OBJECT"\nclass_name = "MyDurableObject"',
    envType: 'DurableObjectNamespace',
    binding: 'MY_DURABLE_OBJECT'
  },
  email: {
    toml: '[send_email]\nname = "EMAIL"\ndestination_address = ""',
    envType: 'SendEmail',
    binding: 'EMAIL'
  },
  hyperdrive: {
    toml: '[[hyperdrive]]\nbinding = "HYPERDRIVE"\nid = ""',
    envType: 'Hyperdrive',
    binding: 'HYPERDRIVE'
  },
  browser: {
    toml: '[browser]\nbinding = "BROWSER"',
    envType: 'Fetcher',
    binding: 'BROWSER'
  },
  analytics: {
    toml: '[[analytics_engine_datasets]]\nbinding = "ANALYTICS"\ndataset = "my-dataset"',
    envType: 'AnalyticsEngineDataset',
    binding: 'ANALYTICS'
  },
  cron: {
    // Cron doesn't add bindings, it adds triggers
    toml: '[triggers]\ncrons = ["*/5 * * * *"]',
    envType: null,
    binding: null
  }
};