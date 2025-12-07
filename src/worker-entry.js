/**
 * Worker Entry Point
 * Minimal exports for Cloudflare Workers - excludes CLI/Node.js dependencies
 * 
 * This is the entry point for wrangler.toml
 * Only exports worker-compatible code (no fs, path, child_process, etc.)
 */

// Worker integration (no Node.js dependencies)
export { initializeService, configManager } from './worker/integration.js';

// Domain configuration (pure JS, no fs dependencies)
export { getDomainFromEnv, createEnvironmentConfig } from './config/domains.js';

// Framework version
export const FRAMEWORK_VERSION = '1.0.0';

// Default export for module worker format
export default {
  async fetch(request, env, ctx) {
    return new Response('Clodo Framework Worker - Use initializeService() to set up your worker', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
  }
};
