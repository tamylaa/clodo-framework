/**
 * Session Manager
 * Redis-based session management
 * 
 * @example
 * import { SessionManager, UpstashRedis } from '@tamyla/clodo-framework/utilities/cache';
 * 
 * const redis = new UpstashRedis(env.UPSTASH_URL, env.UPSTASH_TOKEN);
 * const sessions = new SessionManager(redis);
 * 
 * const sessionId = await sessions.create({ userId: '123' });
 * const session = await sessions.get(sessionId);
 */

export class SessionManager {
  constructor(client, options = {}) {
    // Accept either UpstashCache or UpstashRedis
    this.client = client.redis || client;
    this.prefix = options.prefix || 'session:';
    this.ttl = options.ttl || 86400; // 24 hours
  }

  async create(data) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      data,
      createdAt: Date.now(),
      lastAccess: Date.now()
    };

    await this.client.set(
      this.prefix + sessionId,
      JSON.stringify(session),
      { ex: this.ttl }
    );

    return sessionId;
  }

  async get(sessionId) {
    const value = await this.client.get(this.prefix + sessionId);
    if (!value) return null;

    const session = JSON.parse(value);
    
    // Update last access time
    session.lastAccess = Date.now();
    await this.client.set(
      this.prefix + sessionId,
      JSON.stringify(session),
      { ex: this.ttl }
    );

    return session;
  }

  async update(sessionId, data) {
    const session = await this.get(sessionId);
    if (!session) return null;

    session.data = { ...session.data, ...data };
    await this.client.set(
      this.prefix + sessionId,
      JSON.stringify(session),
      { ex: this.ttl }
    );

    return session;
  }

  async destroy(sessionId) {
    await this.client.del(this.prefix + sessionId);
  }

  async refresh(sessionId) {
    const exists = await this.client.exists(this.prefix + sessionId);
    if (!exists) return false;

    await this.client.expire(this.prefix + sessionId, this.ttl);
    return true;
  }
}

export default SessionManager;
