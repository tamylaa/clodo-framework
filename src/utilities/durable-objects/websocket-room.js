/**
 * WebSocket Room Durable Object
 * Manages real-time WebSocket connections for a room/channel
 * 
 * @example
 * const id = env.WEBSOCKET_ROOM.idFromName('room-123');
 * const room = env.WEBSOCKET_ROOM.get(id);
 * return room.fetch(request); // WebSocket upgrade
 */

import { DurableObjectBase } from './base.js';

export class WebSocketRoom extends DurableObjectBase {
  constructor(state, env) {
    super(state, env);
    this.sessions = new Map();
  }

  async fetch(request) {
    await this.ensureInitialized();
    
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // HTTP API endpoints
    const action = url.pathname.split('/').pop();
    
    switch (action) {
      case 'broadcast':
        return this.handleBroadcast(request);
      case 'members':
        return this.getMembers();
      case 'state':
        return this.getRoomState();
      default:
        return this.error('Use WebSocket connection or API endpoints', 400);
    }
  }

  async handleWebSocket(request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || crypto.randomUUID();
    const username = url.searchParams.get('username') || `User-${userId.slice(0, 8)}`;
    
    // WebSocketPair is a Cloudflare Workers global
    // eslint-disable-next-line no-undef
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    this.state.acceptWebSocket(server, [userId]);

    // Create session
    const session = {
      id: userId,
      username,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(userId, session);

    // Notify others
    this.broadcast({
      type: 'user_joined',
      user: { id: userId, username },
      memberCount: this.sessions.size
    }, userId);

    // Send welcome message
    server.send(JSON.stringify({
      type: 'connected',
      userId,
      username,
      memberCount: this.sessions.size
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const [userId] = this.state.getTags(ws);
    const session = this.sessions.get(userId);
    
    if (!session) return;

    session.lastActivity = Date.now();

    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'message':
          this.broadcast({
            type: 'message',
            from: { id: userId, username: session.username },
            content: data.content,
            timestamp: Date.now()
          });
          break;

        case 'typing':
          this.broadcast({
            type: 'typing',
            user: { id: userId, username: session.username }
          }, userId);
          break;

        case 'presence':
          session.status = data.status;
          this.broadcast({
            type: 'presence_update',
            user: { id: userId, username: session.username },
            status: data.status
          }, userId);
          break;

        case 'sync_state':
          // Sync shared state
          if (data.state) {
            await this.setState('sharedState', data.state);
            this.broadcast({
              type: 'state_sync',
              state: data.state,
              updatedBy: userId
            }, userId);
          }
          break;

        case 'get_state': {
          const state = await this.getState('sharedState', {});
          ws.send(JSON.stringify({
            type: 'state_sync',
            state
          }));
          break;
        }

        default:
          // Forward custom message types
          this.broadcast({
            ...data,
            from: userId
          }, userId);
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  async webSocketClose(ws, code, reason) {
    const [userId] = this.state.getTags(ws);
    const session = this.sessions.get(userId);
    
    if (session) {
      this.sessions.delete(userId);
      
      this.broadcast({
        type: 'user_left',
        user: { id: userId, username: session.username },
        memberCount: this.sessions.size
      });
    }
  }

  async webSocketError(ws, error) {
    const [userId] = this.state.getTags(ws);
    console.error(`WebSocket error for ${userId}:`, error);
    ws.close(1011, 'Internal error');
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message to broadcast
   * @param {string} excludeUserId - Optional user ID to exclude
   */
  broadcast(message, excludeUserId = null) {
    const messageStr = JSON.stringify(message);
    
    for (const ws of this.state.getWebSockets()) {
      const [userId] = this.state.getTags(ws);
      
      if (excludeUserId && userId === excludeUserId) continue;
      
      try {
        ws.send(messageStr);
      } catch (error) {
        // Socket might be closed
      }
    }
  }

  async handleBroadcast(request) {
    const body = await request.json();
    this.broadcast(body);
    return this.json({ success: true, recipients: this.sessions.size });
  }

  async getMembers() {
    const members = Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      username: s.username,
      connectedAt: s.connectedAt,
      status: s.status
    }));
    
    return this.json({ members, count: members.length });
  }

  async getRoomState() {
    const sharedState = await this.getState('sharedState', {});
    return this.json({
      memberCount: this.sessions.size,
      members: Array.from(this.sessions.keys()),
      sharedState
    });
  }
}

export default WebSocketRoom;
