/**
 * Rate Limiter Durable Object
 * Implements sliding window rate limiting
 * 
 * @example
 * // In wrangler.toml
 * [[durable_objects.bindings]]
 * name = "RATE_LIMITER"
 * class_name = "RateLimiter"
 * 
 * // Usage
 * const id = env.RATE_LIMITER.idFromName(clientIP);
 * const limiter = env.RATE_LIMITER.get(id);
 * const response = await limiter.fetch(request);
 */

import { DurableObjectBase } from './base.js';

export class RateLimiter extends DurableObjectBase {
  constructor(state, env) {
    super(state, env);
    this.defaultLimit = 100;
    this.defaultWindow = 60000; // 1 minute in ms
  }

  async fetch(request) {
    await this.ensureInitialized();
    
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'check':
        return this.checkLimit(request);
      case 'reset':
        return this.resetLimit();
      case 'status':
        return this.getStatus();
      default:
        return this.checkLimit(request);
    }
  }

  async checkLimit(request) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || this.defaultLimit;
    const window = parseInt(url.searchParams.get('window')) || this.defaultWindow;
    
    const now = Date.now();
    const windowStart = now - window;
    
    // Get current requests
    let requests = await this.getState('requests', []);
    
    // Filter to only requests within window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    const allowed = requests.length < limit;
    
    if (allowed) {
      requests.push(now);
      await this.setState('requests', requests);
    }
    
    return this.json({
      allowed,
      remaining: Math.max(0, limit - requests.length),
      reset: windowStart + window,
      limit,
      current: requests.length
    });
  }

  async resetLimit() {
    await this.setState('requests', []);
    return this.json({ success: true, message: 'Rate limit reset' });
  }

  async getStatus() {
    const requests = await this.getState('requests', []);
    return this.json({
      currentRequests: requests.length,
      oldestRequest: requests[0] || null,
      newestRequest: requests[requests.length - 1] || null
    });
  }
}

export default RateLimiter;
