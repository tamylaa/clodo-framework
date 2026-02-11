export { MiddlewareRegistry } from './Registry.js';
export { MiddlewareComposer } from './Composer.js';
export * as Shared from './shared/index.js';

// High-level middleware factories (recommended API)
export {
  createCorsMiddleware,
  createErrorHandler,
  createRateLimitGuard,
  createLogger,
  createBearerAuth,
  createApiKeyAuth,
  composeMiddleware
} from './factories.js';
