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

// Deployment components
export { DeploymentValidator } from './deployment/validator.js';
export { DeploymentAuditor } from './deployment/auditor.js';
// NOTE: WranglerDeployer has lib/ dependencies not available in npm distribution
// export { WranglerDeployer } from './deployment/wrangler-deployer.js';

// Security components
export { SecurityCLI } from './security/SecurityCLI.js';
export { ConfigurationValidator } from './security/ConfigurationValidator.js';
export { SecretGenerator } from './security/SecretGenerator.js';

// Service management components
export { ServiceCreator } from './service-management/ServiceCreator.js';
export { ServiceOrchestrator } from './service-management/ServiceOrchestrator.js';
export { InputCollector } from './service-management/InputCollector.js';

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
