/**
 * Routing module exports
 * 
 * Provides automatic route generation for Cloudflare Workers
 * from domain configuration metadata.
 * 
 * This is a CORE IDENTITY feature that completes multi-domain orchestration.
 * 
 * @module service-management/routing
 */

export { RouteGenerator } from './RouteGenerator.js';
export { DomainRouteMapper } from './DomainRouteMapper.js';
export { WranglerRoutesBuilder } from './WranglerRoutesBuilder.js';

