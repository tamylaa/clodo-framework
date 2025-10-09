// Lego Framework - Main Entry Point
// Reusable components for Lego-style software architecture

export * from './config/index.js';
export * from './worker/index.js';
export * from './utils/index.js';
export * from './orchestration/index.js';

// Core framework classes and utilities
export { FeatureFlagManager } from './config/features.js';
export { createDomainConfigSchema, validateDomainConfig, createDefaultDomainConfig } from './utils/domain-config.js';
export { initializeService, createFeatureGuard } from './worker/integration.js';

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

// Framework version info
export const FRAMEWORK_VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'Lego Framework';

// Helper for framework initialization
export const initializeFramework = (options = {}) => {
  console.log(`${FRAMEWORK_NAME} v${FRAMEWORK_VERSION} initialized`);

  return {
    version: FRAMEWORK_VERSION,
    name: FRAMEWORK_NAME,
    options
  };
};