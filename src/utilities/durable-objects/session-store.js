/**
 * Session Store Durable Object
 * Manages user sessions with automatic expiry
 * 
 * @example
 * const id = env.SESSION_STORE.idFromName(sessionId);
 * const store = env.SESSION_STORE.get(id);
 * await store.fetch(new Request('https://session/set', {
 *   method: 'POST',
 *   body: JSON.stringify({ userId: '123', data: { role: 'admin' } })
 * }));
 */

import { DurableObjectBase } from './base.js';

export class SessionStore extends DurableObjectBase {
  constructor(state, env) {
    super(state, env);
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  async fetch(request) {
    await this.ensureInitialized();
    
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    switch (request.method) {
      case 'GET':
        return this.getSession();
      case 'POST':
        return this.setSession(request);
      case 'PATCH':
        return this.updateSession(request);
      case 'DELETE':
        return this.deleteSession();
      default:
        return this.error('Method not allowed', 405);
    }
  }

  async getSession() {
    const session = await this.getState('session');
    
    if (!session) {
      return this.json({ exists: false, session: null });
    }

    // Check expiry
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await this.deleteState('session');
      return this.json({ exists: false, expired: true, session: null });
    }

    // Update last accessed
    session.lastAccessed = Date.now();
    await this.setState('session', session);

    return this.json({ exists: true, session });
  }

  async setSession(request) {
    const body = await request.json();
    const ttl = body.ttl || this.defaultTTL;
    
    const session = {
      data: body.data || {},
      userId: body.userId,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl,
      metadata: body.metadata || {}
    };

    await this.setState('session', session);
    
    // Set alarm for cleanup
    await this.setAlarm(ttl);

    return this.json({ success: true, session });
  }

  async updateSession(request) {
    const session = await this.getState('session');
    
    if (!session) {
      return this.error('Session not found', 404);
    }

    const body = await request.json();
    
    // Merge data
    session.data = { ...session.data, ...body.data };
    session.lastAccessed = Date.now();
    
    // Optionally extend expiry
    if (body.extend) {
      const ttl = body.ttl || this.defaultTTL;
      session.expiresAt = Date.now() + ttl;
      await this.setAlarm(ttl);
    }

    await this.setState('session', session);
    return this.json({ success: true, session });
  }

  async deleteSession() {
    await this.deleteState('session');
    await this.deleteAlarm();
    return this.json({ success: true, message: 'Session deleted' });
  }

  async alarm() {
    // Clean up expired session
    const session = await this.getState('session');
    if (session && session.expiresAt && Date.now() > session.expiresAt) {
      await this.deleteState('session');
    }
  }
}

export default SessionStore;
