# Story 3: WebSocket Server Setup

## Summary
Implement WebSocket server using Socket.io for real-time communication, including connection management, room handling, and event system.

## Acceptance Criteria
- [ ] Socket.io server integrated with Express/Fastify
- [ ] Connection authentication and validation
- [ ] Room management for sessions
- [ ] Event handling system with TypeScript types
- [ ] Connection state tracking in Redis
- [ ] Reconnection support with session recovery
- [ ] Rate limiting for WebSocket events
- [ ] Connection metrics and monitoring
- [ ] Graceful shutdown handling

## Technical Details

### WebSocket Architecture
```typescript
// src/websocket/server.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

export class WebSocketServer {
  private io: Server;
  
  initialize(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL,
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Redis adapter for scaling
    const pubClient = createRedisClient();
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));

    this.setupMiddleware();
    this.setupEventHandlers();
  }
}
```

### Event Type System
```typescript
// src/websocket/events.ts
export enum ClientEvents {
  // Connection
  SESSION_JOIN = 'session:join',
  SESSION_LEAVE = 'session:leave',
  
  // Player actions
  PLAYER_UPDATE = 'player:update',
  VOTE_SUBMIT = 'vote:submit',
  VOTE_CHANGE = 'vote:change',
  
  // Game flow
  CARDS_REVEAL = 'cards:reveal',
  GAME_RESET = 'game:reset',
  STORY_UPDATE = 'story:update',
  TIMER_START = 'timer:start',
  TIMER_STOP = 'timer:stop'
}

export enum ServerEvents {
  // Connection
  SESSION_JOINED = 'session:joined',
  SESSION_ERROR = 'session:error',
  
  // Player updates
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_UPDATED = 'player:updated',
  
  // Game state
  VOTE_SUBMITTED = 'vote:submitted',
  CARDS_REVEALED = 'cards:revealed',
  GAME_RESET = 'game:reset',
  STORY_UPDATED = 'story:updated',
  TIMER_UPDATED = 'timer:updated',
  
  // System
  CONNECTION_ERROR = 'connection:error',
  RATE_LIMIT_EXCEEDED = 'rate:limit'
}

// Type-safe event payloads
export interface ClientEventPayloads {
  [ClientEvents.SESSION_JOIN]: {
    sessionId: string;
    playerId?: string;
    playerName?: string;
    avatar?: string;
  };
  [ClientEvents.VOTE_SUBMIT]: {
    storyId: string;
    value: string;
    confidence?: number;
  };
  [ClientEvents.STORY_UPDATE]: {
    title: string;
    description?: string;
  };
}

export interface ServerEventPayloads {
  [ServerEvents.PLAYER_JOINED]: {
    player: PlayerInfo;
    playerCount: number;
  };
  [ServerEvents.VOTE_SUBMITTED]: {
    playerId: string;
    hasVoted: boolean;
    voteCount: number;
  };
  [ServerEvents.CARDS_REVEALED]: {
    votes: VoteResult[];
    consensus: ConsensusData;
  };
}
```

### Connection Management
```typescript
// src/websocket/connection-manager.ts
export class ConnectionManager {
  private connections = new Map<string, SocketConnection>();
  
  async handleConnection(socket: Socket) {
    const { sessionId, playerId } = socket.handshake.auth;
    
    // Validate session exists
    const session = await this.validateSession(sessionId);
    if (!session) {
      socket.emit(ServerEvents.SESSION_ERROR, { 
        error: 'Session not found' 
      });
      socket.disconnect();
      return;
    }
    
    // Join session room
    socket.join(`session:${sessionId}`);
    
    // Track connection
    const connection: SocketConnection = {
      socketId: socket.id,
      sessionId,
      playerId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };
    
    this.connections.set(socket.id, connection);
    await this.storeConnectionInRedis(connection);
    
    // Set up event handlers
    this.attachEventHandlers(socket, connection);
    
    // Notify others
    socket.to(`session:${sessionId}`).emit(
      ServerEvents.PLAYER_JOINED,
      await this.getPlayerInfo(playerId)
    );
  }
  
  private attachEventHandlers(socket: Socket, connection: SocketConnection) {
    // Rate limiting middleware
    const rateLimiter = this.createRateLimiter(socket.id);
    
    socket.use(async ([event, ...args], next) => {
      if (!await rateLimiter.check(event)) {
        socket.emit(ServerEvents.RATE_LIMIT_EXCEEDED);
        return;
      }
      connection.lastActivity = new Date();
      next();
    });
    
    // Event handlers
    socket.on(ClientEvents.VOTE_SUBMIT, (data) => 
      this.handleVoteSubmit(socket, connection, data)
    );
    
    socket.on(ClientEvents.CARDS_REVEAL, () => 
      this.handleCardsReveal(socket, connection)
    );
    
    socket.on('disconnect', () => 
      this.handleDisconnect(socket, connection)
    );
  }
}
```

### Redis State Management
```typescript
// src/websocket/redis-state.ts
export class RedisStateManager {
  private redis: Redis;
  
  async storeConnection(socketId: string, data: ConnectionData) {
    const key = `connection:${socketId}`;
    await this.redis.setex(key, 3600, JSON.stringify(data));
    
    // Add to session set
    await this.redis.sadd(`session:${data.sessionId}:connections`, socketId);
  }
  
  async getSessionConnections(sessionId: string): Promise<string[]> {
    return this.redis.smembers(`session:${sessionId}:connections`);
  }
  
  async removeConnection(socketId: string, sessionId: string) {
    await this.redis.del(`connection:${socketId}`);
    await this.redis.srem(`session:${sessionId}:connections`, socketId);
  }
  
  async isPlayerOnline(playerId: string): Promise<boolean> {
    const connections = await this.redis.keys(`connection:*`);
    for (const key of connections) {
      const data = await this.redis.get(key);
      if (data) {
        const conn = JSON.parse(data);
        if (conn.playerId === playerId) return true;
      }
    }
    return false;
  }
}
```

### Rate Limiting
```typescript
// src/websocket/rate-limiter.ts
export class WebSocketRateLimiter {
  private limits = {
    [ClientEvents.VOTE_SUBMIT]: { points: 10, duration: 60 },
    [ClientEvents.STORY_UPDATE]: { points: 5, duration: 60 },
    [ClientEvents.PLAYER_UPDATE]: { points: 5, duration: 60 },
    default: { points: 30, duration: 60 }
  };
  
  async check(socketId: string, event: string): Promise<boolean> {
    const limit = this.limits[event] || this.limits.default;
    const key = `rate:${socketId}:${event}`;
    
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, limit.duration);
    }
    
    return current <= limit.points;
  }
}
```

## Implementation Steps
1. Install Socket.io and Redis adapter
2. Create WebSocket server class
3. Implement event type system
4. Build connection manager
5. Add Redis state persistence
6. Implement rate limiting
7. Create event handlers
8. Add monitoring/metrics
9. Test real-time features

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 8-10 hours

## Dependencies
- Story 1: Backend API Setup
- Story 2: Database Setup (Redis required)

## Testing Requirements
- WebSocket connections establish successfully
- Room joining/leaving works correctly
- Events propagate to correct recipients
- Rate limiting prevents abuse
- Reconnection restores state
- Redis adapter enables scaling
- Graceful shutdown works

## Definition of Done
- [ ] Socket.io server running
- [ ] Type-safe event system
- [ ] Connection tracking in Redis
- [ ] Rate limiting functional
- [ ] All events implemented
- [ ] Integration tests passing
- [ ] Performance benchmarked
- [ ] Documentation complete