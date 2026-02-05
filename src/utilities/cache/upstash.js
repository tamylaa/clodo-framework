/**
 * Upstash Redis Client
 * REST-based Redis client for Cloudflare Workers
 * 
 * @example
 * import { UpstashRedis, UpstashCache } from '@tamyla/clodo-framework/utilities/cache';
 * 
 * const redis = new UpstashRedis(env.UPSTASH_URL, env.UPSTASH_TOKEN);
 * await redis.set('key', 'value', { ex: 3600 });
 * 
 * const cache = new UpstashCache(env.UPSTASH_URL, env.UPSTASH_TOKEN);
 * const data = await cache.getOrSet('user:123', () => fetchUser(123), 3600);
 */

/**
 * Upstash Redis REST client
 */
export class UpstashRedis {
  constructor(url, token) {
    if (!url || !token) {
      throw new Error('Upstash URL and token are required');
    }
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }

  async execute(command, ...args) {
    const response = await fetch(`${this.url}/${command}/${args.join('/')}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Upstash error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.result;
  }

  async pipeline(commands) {
    const response = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      throw new Error(`Upstash error: ${response.status}`);
    }

    const results = await response.json();
    return results.map(r => r.result);
  }

  // String commands
  async get(key) { return this.execute('get', key); }
  async set(key, value, options = {}) {
    const args = [key, value];
    if (options.ex) args.push('EX', options.ex);
    if (options.px) args.push('PX', options.px);
    if (options.nx) args.push('NX');
    if (options.xx) args.push('XX');
    return this.execute('set', ...args);
  }
  async del(...keys) { return this.execute('del', ...keys); }
  async exists(...keys) { return this.execute('exists', ...keys); }
  async expire(key, seconds) { return this.execute('expire', key, seconds); }
  async ttl(key) { return this.execute('ttl', key); }
  async incr(key) { return this.execute('incr', key); }
  async incrby(key, amount) { return this.execute('incrby', key, amount); }
  async decr(key) { return this.execute('decr', key); }

  // Hash commands
  async hget(key, field) { return this.execute('hget', key, field); }
  async hset(key, field, value) { return this.execute('hset', key, field, value); }
  async hgetall(key) { return this.execute('hgetall', key); }
  async hdel(key, ...fields) { return this.execute('hdel', key, ...fields); }

  // List commands
  async lpush(key, ...values) { return this.execute('lpush', key, ...values); }
  async rpush(key, ...values) { return this.execute('rpush', key, ...values); }
  async lpop(key) { return this.execute('lpop', key); }
  async rpop(key) { return this.execute('rpop', key); }
  async lrange(key, start, stop) { return this.execute('lrange', key, start, stop); }
  async llen(key) { return this.execute('llen', key); }

  // Set commands
  async sadd(key, ...members) { return this.execute('sadd', key, ...members); }
  async srem(key, ...members) { return this.execute('srem', key, ...members); }
  async smembers(key) { return this.execute('smembers', key); }
  async sismember(key, member) { return this.execute('sismember', key, member); }

  // Sorted set commands
  async zadd(key, score, member) { return this.execute('zadd', key, score, member); }
  async zrange(key, start, stop, withScores = false) {
    return withScores 
      ? this.execute('zrange', key, start, stop, 'WITHSCORES')
      : this.execute('zrange', key, start, stop);
  }
  async zrank(key, member) { return this.execute('zrank', key, member); }
  async zscore(key, member) { return this.execute('zscore', key, member); }
}

/**
 * High-level caching utilities
 */
export class UpstashCache {
  constructor(url, token, options = {}) {
    this.redis = new UpstashRedis(url, token);
    this.prefix = options.prefix || 'cache:';
    this.defaultTTL = options.defaultTTL || 3600;
  }

  async get(key) {
    const value = await this.redis.get(this.prefix + key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    const serialized = JSON.stringify(value);
    await this.redis.set(this.prefix + key, serialized, { ex: ttl });
  }

  async delete(key) {
    await this.redis.del(this.prefix + key);
  }

  async getOrSet(key, loader, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.set(key, value, ttl);
    return value;
  }

  wrap(fn, keyFn, ttl = this.defaultTTL) {
    return async (...args) => {
      const key = keyFn(...args);
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }
}

export default { UpstashRedis, UpstashCache };
