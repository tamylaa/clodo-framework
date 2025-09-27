import { createDomainConfigSchema } from '@tamyla/lego-framework';

/**
 * Domain configuration for {{SERVICE_DISPLAY_NAME}}
 *
 * This file contains domain-specific configuration including:
 * - Cloudflare account and zone settings
 * - Domain URLs for different environments
 * - Feature flags and settings
 * - Database and service bindings
 */

export const domains = {
  '{{SERVICE_NAME}}': {
    ...createDomainConfigSchema(),
    name: '{{SERVICE_NAME}}',
    displayName: '{{SERVICE_DISPLAY_NAME}}',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '', // Configure in setup
    zoneId: process.env.CLOUDFLARE_ZONE_ID || '',       // Configure in setup
    domains: {
      production: process.env.PRODUCTION_DOMAIN || 'api.{{SERVICE_NAME}}.com',
      staging: process.env.STAGING_DOMAIN || 'staging-api.{{SERVICE_NAME}}.com',
      development: process.env.DEVELOPMENT_DOMAIN || 'dev-api.{{SERVICE_NAME}}.com'
    },
    services: [
      '{{SERVICE_NAME}}'
    ],
    databases: [
      {
        name: '{{SERVICE_NAME}}-db',
        type: 'd1'
      }
    ],
    features: {
      // Core features (always enabled)
      logging: true,
      monitoring: true,
      errorReporting: true,

      // Service-specific features (uncomment and modify based on SERVICE_TYPE)
      // Data service features
      // authentication: true,
      // authorization: true,
      // fileStorage: true,
      // search: true,
      // filtering: true,
      // pagination: true,

      // Auth service features
      // authentication: true,
      // authorization: true,
      // userProfiles: true,
      // emailNotifications: true,
      // magicLinkAuth: true,

      // Content service features
      // fileStorage: true,
      // search: true,
      // filtering: true,
      // pagination: true,
      // caching: true,

      // API Gateway features
      // authentication: true,
      // authorization: true,
      // rateLimiting: true,
      // caching: true,
      // monitoring: true,

      // Generic service features (customize as needed)
      // authentication: false,
      // caching: false,
    },
    settings: {
      environment: process.env.ENVIRONMENT || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
      rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100,
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      metricsEndpoint: process.env.METRICS_ENDPOINT
    }
  }
};

/**
 * Get domain configuration for current environment
 * @param {string} domainName - Name of the domain
 * @returns {Object} Domain configuration
 */
export function getDomainConfig(domainName = '{{SERVICE_NAME}}') {
  const config = domains[domainName];
  if (!config) {
    throw new Error(`Domain configuration not found: ${domainName}`);
  }
  return config;
}

/**
 * Get all available domains
 * @returns {string[]} Array of domain names
 */
export function getAvailableDomains() {
  return Object.keys(domains);
}