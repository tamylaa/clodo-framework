// Centralized configuration for service payload schema values
// Allows runtime overrides for enums and features to keep validation flexible and configurable

let config = {
  serviceTypes: [
    'api-service',
    'data-service',
    'worker',
    'pages',
    'gateway',
    'generic'
  ],
  features: ['d1', 'upstash', 'kv', 'r2', 'pages', 'ws', 'durableObject', 'cron', 'metrics']
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
      'generic'
    ],
    features: ['d1', 'upstash', 'kv', 'r2', 'pages', 'ws', 'durableObject', 'cron', 'metrics']
  };
}