/**
 * Utilities Module
 * Exports all general utility functions and managers
 */

// Interactive prompts utilities
export { askUser, askYesNo, askChoice, askMultiChoice, closePrompts, showProgress, askPassword } from './interactive-prompts.js';

// Error recovery and handling
export { ErrorRecoveryManager, withRetry, withCircuitBreaker } from './error-recovery.js';

// Graceful shutdown
export { GracefulShutdownManager, getShutdownManager, initializeGracefulShutdown, withGracefulShutdown } from './graceful-shutdown-manager.js';

// Rate limiting
export { executeWithRateLimit, queueRequest, getRateLimitStatus, clearQueues, RATE_LIMITS } from './rate-limiter.js';

// Unified error handling module (Phase 3.2.3d - consolidated from 5 sources)
export { default as ErrorHandler, createErrorResponse, createContextualError, createErrorHandler } from './ErrorHandler.js';