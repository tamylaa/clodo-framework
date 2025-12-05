// Utility Functions
// Common utilities used across the framework

export const deepMerge = (target, source) => {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
};

export const validateRequired = (obj, requiredFields) => {
  const missing = requiredFields.filter(field => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

export const createLogger = (prefix = 'ClodoFramework') => {
  return {
    info: (message, ...args) => console.log(`[${prefix}] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[${prefix}] ${message}`, ...args),
    error: (message, ...args) => console.error(`[${prefix}] ${message}`, ...args),
    debug: (message, ...args) => console.debug(`[${prefix}] ${message}`, ...args)
  };
};

// Health checking utilities
export * from './health-checker.js';

// Framework configuration
export * from './framework-config.js';

// Deployment utilities
export * from './deployment/index.js';
