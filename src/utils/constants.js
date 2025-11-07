/**
 * Centralized Constants
 * Loads constants from validation-config.json to avoid duplication
 * Provides easy access to domain templates, timeouts, and other config
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load validation config
let validationConfig;
try {
  const configPath = join(__dirname, '..', '..', 'config', 'validation-config.json');
  validationConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (error) {
  console.warn('⚠️  Could not load validation-config.json, using fallback constants');
  validationConfig = null;
}

/**
 * Get domain template for environment
 * @param {string} environment - Environment name (development, staging, production)
 * @returns {string} Domain template pattern
 */
export function getDomainTemplate(environment = 'production') {
  if (validationConfig?.environments?.[environment]?.domainTemplate) {
    return validationConfig.environments[environment].domainTemplate;
  }
  
  // Fallback templates if config not available
  const fallbacks = {
    production: '{service}.{domain}',
    staging: 'staging-{service}.{domain}',
    development: 'dev-{service}.{domain}'
  };
  
  return fallbacks[environment] || fallbacks.production;
}

/**
 * Build custom domain URL from template
 * @param {string} serviceName - Service name
 * @param {string} domain - Base domain (e.g., clodo.dev)
 * @param {string} environment - Environment name
 * @returns {string} Full custom domain URL
 */
export function buildCustomDomain(serviceName, domain, environment = 'production') {
  const template = getDomainTemplate(environment);
  const subdomain = template
    .replace('{service}', serviceName)
    .replace('{domain}', domain);
  
  return `https://${subdomain}`;
}

/**
 * Get environment-specific worker suffix
 * @param {string} environment - Environment name
 * @returns {string} Worker suffix (e.g., '-dev', '-staging', '')
 */
export function getWorkerSuffix(environment = 'production') {
  return validationConfig?.environments?.[environment]?.workerSuffix || '';
}

/**
 * Get environment-specific database suffix
 * @param {string} environment - Environment name
 * @returns {string} Database suffix (e.g., '-dev', '-staging', '')
 */
export function getDatabaseSuffix(environment = 'production') {
  return validationConfig?.environments?.[environment]?.databaseSuffix || '';
}

/**
 * Get timing configuration
 * @param {string} key - Timing key
 * @returns {number} Timeout in milliseconds
 */
export function getTimeout(key) {
  return validationConfig?.timing?.[key] || 30000; // Default 30s
}

/**
 * Get all service types
 * @returns {string[]} Array of valid service types
 */
export function getServiceTypes() {
  return validationConfig?.validation?.serviceTypes || [
    'data-service',
    'auth-service',
    'content-service',
    'api-gateway',
    'static-site',
    'generic'
  ];
}

/**
 * Export full config for direct access if needed
 */
export const VALIDATION_CONFIG = validationConfig;

/**
 * Common constants
 */
export const CONSTANTS = {
  DEFAULT_ENVIRONMENT: 'production',
  SUPPORTED_ENVIRONMENTS: ['development', 'staging', 'production'],
  WORKERS_DEV_SUFFIX: '.workers.dev'
};

