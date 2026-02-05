/**
 * Redis-based Rate Limiter
 * Sliding window rate limiting using Upstash Redis
 * 
 * @example
 * import { RateLimiter, UpstashRedis } from '@tamyla/clodo-framework/utilities/cache';
 * 
 * const redis = new UpstashRedis(env.UPSTASH_URL, env.UPSTASH_TOKEN);
 * const limiter = new RateLimiter(redis, { limit: 100, window: 60 });
 * 
 * const { allowed, remaining } = await limiter.check(clientIP);
 */

export class RateLimiter {
  constructor(redis, options = {}) {
    this.redis = redis;
    this.prefix = options.prefix || 'ratelimit:';
    this.limit = options.limit || 100;
    this.window = options.window || 60; // seconds
  }

  async check(identifier) {
    const key = this.prefix + identifier;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - this.window;

    // Use pipeline for atomic operations
    const results = await this.redis.pipeline([
      ['zremrangebyscore', key, '-inf', windowStart],
      ['zadd', key, now, `${now}-${Math.random()}`],
      ['zcard', key],
      ['expire', key, this.window]
    ]);

    const count = results[2];
    const allowed = count <= this.limit;

    return {
      allowed,
      remaining: Math.max(0, this.limit - count),
      reset: now + this.window
    };
  }

  middleware(onLimit) {
    return async (request, env, ctx, next) => {
      const identifier = request.headers.get('CF-Connecting-IP') || 'unknown';
      const result = await this.check(identifier);

      if (!result.allowed) {
        return onLimit ? onLimit(result) : new Response('Rate limited', {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': this.window.toString()
          }
        });
      }

      const response = await next();
      
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());
      
      return response;
    };
  }
}

export default RateLimiter;
