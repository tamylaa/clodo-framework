/**
 * Validation utilities for Clodo Framework service creation
 */

/**
 * Validate service name format
 * - Only lowercase letters, numbers, and hyphens
 * - No leading/trailing hyphens
 * - At least 3 characters
 */
export function validateServiceName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Check length
  if (name.length < 3 || name.length > 50) {
    return false;
  }

  // Check format: lowercase, numbers, hyphens only
  if (!/^[a-z0-9-]+$/.test(name)) {
    return false;
  }

  // No leading or trailing hyphens
  if (name.startsWith('-') || name.endsWith('-')) {
    return false;
  }

  // No consecutive hyphens
  if (name.includes('--')) {
    return false;
  }

  return true;
}

/**
 * Validate domain name format
 * - Basic domain name validation
 * - Supports subdomains
 */
export function validateDomainName(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Remove trailing dot if present
  domain = domain.replace(/\.$/, '');

  // Check basic format
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Validate Cloudflare API token format
 * - Basic length and character validation
 */
export function validateCloudflareToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // API tokens are typically long alphanumeric strings
  return token.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(token);
}

/**
 * Validate Cloudflare Account/Zone ID format
 * - 32 hexadecimal characters
 */
export function validateCloudflareId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return /^[a-f0-9]{32}$/i.test(id);
}

/**
 * Validate service type
 */
export function validateServiceType(type) {
  const validTypes = ['data-service', 'auth-service', 'content-service', 'api-gateway', 'generic'];
  return validTypes.includes(type);
}

/**
 * Validate environment
 */
export function validateEnvironment(env) {
  const validEnvs = ['development', 'staging', 'production'];
  return validEnvs.includes(env);
}

/**
 * Validate feature configuration
 */
export function validateFeatures(features, serviceType) {
  if (!features || typeof features !== 'object') {
    return false;
  }

  // Ensure required base features are present
  const requiredBaseFeatures = ['logging', 'monitoring', 'errorReporting'];
  for (const feature of requiredBaseFeatures) {
    if (!(feature in features)) {
      return false;
    }
  }

  return true;
}
