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
export { autoConfigureFramework } from './version/VersionDetector.js';

// ─── NEW: Middleware Factories & Composition ─────────────────────────
export {
  createCorsMiddleware,
  createErrorHandler,
  createRateLimitGuard,
  createLogger,
  createBearerAuth,
  createApiKeyAuth,
  composeMiddleware
} from './middleware/factories.js';

// ─── NEW: Environment Guard ──────────────────────────────────────────
export {
  EnvironmentGuard,
  createEnvironmentGuard
} from './validation/environmentGuard.js';

// ─── NEW: RequestContext (Hono-style) ────────────────────────────────
export {
  RequestContext,
  createRequestContext
} from './routing/RequestContext.js';

// ─── NEW: Feature-to-binding mapping ─────────────────────────────────
export { FEATURE_BINDING_MAP } from './config/service-schema-config.js';

// Core data and schema components
export * from './services/GenericDataService.js';
export * from './schema/SchemaManager.js';
export * from './modules/ModuleManager.js';
export * from './routing/EnhancedRouter.js';
export * from './handlers/GenericRouteHandler.js';
export { ServiceClient } from './services/ServiceClient.js';

// Deployment components
export { DeploymentValidator } from './deployment/validator.js';
export { DeploymentAuditor } from './deployment/auditor.js';
// NOTE: WranglerDeployer has lib/ dependencies not available in npm distribution
// export { WranglerDeployer } from './deployment/wrangler-deployer.js';

// Security components
export { SecurityCLI } from './security/SecurityCLI.js';
export { ConfigurationValidator } from './security/ConfigurationValidator.js';
export { SecretGenerator } from './security/SecretGenerator.js';
export { EnvironmentValidator } from './utils/EnvironmentValidator.js';

// Service management components
export { ServiceCreator } from './service-management/ServiceCreator.js';
export { ServiceOrchestrator } from './service-management/ServiceOrchestrator.js';
export { InputCollector } from './service-management/InputCollector.js';

// Programmatic APIs
export { createServiceProgrammatic } from './programmatic/createService.js';
export { deployServiceProgrammatic } from './programmatic/deployService.js';
export { validateServiceProgrammatic } from './programmatic/validateService.js';
export { getFrameworkCapabilities, getFrameworkVersion } from './api/frameworkCapabilities.js';
export { getAcceptedParameters, validateServicePayload } from './validation/payloadValidation.js';
export {
  IntegrationError,
  PayloadValidationError,
  ParameterNotSupportedError,
  VersionCompatibilityError
} from './errors/integrationErrors.js';
export { MockServiceOrchestrator, createMockFramework } from './testing/mockFramework.js';

// CLI utilities (for framework CLI commands)
export { StandardOptions } from '../lib/shared/utils/cli-options.js';
export { ConfigLoader } from '../lib/shared/utils/config-loader.js';
export { ServiceConfigManager } from '../lib/shared/utils/service-config-manager.js';
export { InteractiveDeploymentCoordinator } from '../lib/shared/deployment/workflows/interactive-deployment-coordinator.js';
export { OutputFormatter } from '../lib/shared/utils/output-formatter.js';
export { verifyWorkerDeployment, healthCheckWithBackoff, checkHealth } from '../lib/shared/monitoring/health-checker.js';
export { classifyError, getRecoverySuggestions } from '../lib/shared/error-handling/error-classifier.js';

// Framework version info
export { FrameworkInfo } from './version/FrameworkInfo.js';
export { TemplateRuntime } from './utils/TemplateRuntime.js';
export { HealthChecker } from './monitoring/HealthChecker.js';

export const FRAMEWORK_VERSION = '4.4.1';
export const FRAMEWORK_NAME = 'Clodo Framework';

// ─── Compatibility Constants (for consistent wrangler.toml generation) ──
export const RECOMMENDED_COMPATIBILITY_DATE = '2024-12-01';
export const MINIMUM_COMPATIBILITY_DATE = '2023-06-01';
export const RECOMMENDED_COMPATIBILITY_FLAGS = ['nodejs_compat'];

// Helper for framework initialization (silent by default, verbose with DEBUG)
export const initializeFramework = (options = {}) => {
  if (options.verbose || (typeof process !== 'undefined' && process.env?.DEBUG)) {
    console.log(`${FRAMEWORK_NAME} v${FRAMEWORK_VERSION} initialized`);
  }

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
