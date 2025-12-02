// Clodo Framework - Main Entry Point
// Reusable components for Clodo-style software architecture

export * from './config/index.js';
export * from './worker/index.js';
export * from './utils/index.js';
export * from './orchestration/index.js';

// Simple API - Recommended for most users
export { default as Clodo, createService, deploy, validate, initialize, getInfo } from './simple-api.js';

// Core framework classes and utilities
export { FeatureFlagManager } from './config/features.js';
export { createDomainConfigSchema, validateDomainConfig, createDefaultDomainConfig } from './utils/domain-config.js';
export { initializeService } from './worker/integration.js';

// Core data and schema components
export * from './services/GenericDataService.js';
export * from './schema/SchemaManager.js';
export * from './modules/ModuleManager.js';
export * from './routing/EnhancedRouter.js';
export * from './handlers/GenericRouteHandler.js';

// Deployment components (build-time only)
export { WranglerDeployer } from './deployment/wrangler-deployer.js';

// Security components
export * from './security/index.js';

// Service management components
export { ServiceCreator } from './service-management/ServiceCreator.js';
export { ServiceOrchestrator } from './service-management/ServiceOrchestrator.js';
export { InputHandler } from './service-management/handlers/InputHandler.js';
export { ConfirmationHandler } from './service-management/handlers/ConfirmationHandler.js';
export { GenerationHandler } from './service-management/handlers/GenerationHandler.js';
export { ValidationHandler } from './service-management/handlers/ValidationHandler.js';

// Framework version info
export const FRAMEWORK_VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'Clodo Framework';

// Helper for framework initialization
export const initializeFramework = (options = {}) => {
  console.log(`${FRAMEWORK_NAME} v${FRAMEWORK_VERSION} initialized`);

  return {
    version: FRAMEWORK_VERSION,
    name: FRAMEWORK_NAME,
    options
  };
};

// Default worker export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    // Default handler - can be overridden by specific implementations
    return new Response('CLODO Framework Worker', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
