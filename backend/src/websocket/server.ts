import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createServer } from 'http';
import { Application } from 'express';
import { db } from '../database';
import { logger } from '../utils/logger';
import { ConnectionManager } from './connection-manager';
import { RedisStateManager } from './redis-state';
import { WebSocketRateLimiter } from './rate-limiter';
import { 
  ClientEvents, 
  ServerEvents, 
  ClientEventPayloads, 
  ServerEventPayloads 
} from './events';

export class WebSocketServer {
  private io!: Server;
  private httpServer!: ReturnType<typeof createServer>;
  private connectionManager: ConnectionManager;
  private redisStateManager: RedisStateManager;
  private rateLimiter: WebSocketRateLimiter;
  private isInitialized = false;

  constructor() {
    this.redisStateManager = new RedisStateManager(db.getRedis());
    this.rateLimiter = new WebSocketRateLimiter(db.getRedis());
    this.connectionManager = new ConnectionManager(
      this.redisStateManager, 
      this.rateLimiter
    );
  }

  async initialize(app: Application): Promise<void> {
    try {
      // Create HTTP server
      this.httpServer = createServer(app);

      // Initialize Socket.io
      this.io = new Server(this.httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
          credentials: true,
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        allowEIO3: true
      });

      // Set up Redis adapter for scaling
      await this.setupRedisAdapter();

      // Set up middleware
      this.setupMiddleware();

      // Set up event handlers
      this.setupEventHandlers();

      // Set up cleanup interval
      this.setupCleanupInterval();

      this.isInitialized = true;
      logger.info('WebSocket server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  private async setupRedisAdapter(): Promise<void> {
    try {
      const pubClient = db.getRedisPub();
      const subClient = db.getRedisSub();
      
      this.io.adapter(createAdapter(pubClient, subClient));
      logger.info('Redis adapter configured for Socket.io');
    } catch (error) {
      logger.error('Failed to setup Redis adapter:', error);
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const { sessionId, playerId, playerName, avatar } = socket.handshake.auth;
        
        if (!sessionId) {
          return next(new Error('Session ID required'));
        }

        // Validate session exists in database
        const session = await db.getPrisma().session.findUnique({
          where: { id: sessionId, isActive: true },
          include: { players: true }
        });

        if (!session) {
          return next(new Error('Session not found or inactive'));
        }

        // Check if session has expired
        if (session.expiresAt < new Date()) {
          return next(new Error('Session has expired'));
        }

        // Store session info in socket
        socket.data = {
          sessionId,
          playerId,
          playerName,
          avatar,
          session
        };

        logger.debug('Socket authenticated', { 
          socketId: socket.id, 
          sessionId, 
          playerId 
        });

        next();
      } catch (error) {
        logger.error('Authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket, next) => {
      socket.use(async ([event], next) => {
        try {
          const { allowed, retryAfter } = await this.rateLimiter.check(socket.id, event);
          
          if (!allowed) {
            socket.emit(ServerEvents.RATE_LIMIT_EXCEEDED, {
              event,
              retryAfter: retryAfter || 60
            });
            return;
          }

          // Update connection activity
          await this.redisStateManager.updateConnectionActivity(socket.id);
          
          next();
        } catch (error) {
          logger.error('Rate limiting error:', error);
          next();
        }
      });

      next();
    });

    // Logging middleware
    this.io.use((socket, next) => {
      socket.onAny((event) => {
        logger.debug('WebSocket event received', {
          socketId: socket.id,
          event,
          sessionId: socket.data?.sessionId,
          playerId: socket.data?.playerId
        });
      });

      next();
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      try {
        logger.info('Client connected', { 
          socketId: socket.id,
          sessionId: socket.data?.sessionId 
        });

        // Handle connection through connection manager
        await this.connectionManager.handleConnection(socket, this.io);

        // Set up disconnect handler
        socket.on('disconnect', async (reason) => {
          logger.info('Client disconnected', { 
            socketId: socket.id, 
            reason,
            sessionId: socket.data?.sessionId 
          });
          
          await this.connectionManager.handleDisconnect(socket, this.io);
        });

        // Handle heartbeat
        socket.on(ClientEvents.HEARTBEAT, (data: ClientEventPayloads[ClientEvents.HEARTBEAT]) => {
          socket.emit(ServerEvents.HEARTBEAT_RESPONSE, {
            timestamp: data.timestamp,
            serverTime: Date.now()
          });
        });

      } catch (error) {
        logger.error('Connection handler error:', error);
        socket.emit(ServerEvents.CONNECTION_ERROR, {
          error: 'Connection failed',
          code: 'CONNECTION_ERROR'
        });
        socket.disconnect();
      }
    });
  }

  private setupCleanupInterval(): void {
    // Clean up expired connections every 5 minutes
    setInterval(async () => {
      try {
        const cleaned = await this.redisStateManager.cleanupExpiredConnections();
        if (cleaned > 0) {
          logger.info(`Cleaned up ${cleaned} expired connections`);
        }
      } catch (error) {
        logger.error('Cleanup interval error:', error);
      }
    }, 5 * 60 * 1000);
  }

  async start(port: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('WebSocket server not initialized');
    }

    return new Promise((resolve, reject) => {
      this.httpServer.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          logger.info(`WebSocket server listening on port ${port}`);
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (this.io) {
      // Notify all clients of shutdown
      this.io.emit(ServerEvents.CONNECTION_ERROR, {
        error: 'Server shutting down',
        code: 'SERVER_SHUTDOWN'
      });

      // Close all connections
      this.io.close();
      logger.info('WebSocket server stopped');
    }

    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }
  }

  getServer(): Server {
    return this.io;
  }

  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  getRedisStateManager(): RedisStateManager {
    return this.redisStateManager;
  }

  async getStats(): Promise<{
    connectedSockets: number;
    totalRooms: number;
    redisStats: {
      totalConnections: number;
      activeSessions: number;
      onlinePlayers: number;
    };
  }> {
    const [redisStats] = await Promise.all([
      this.redisStateManager.getConnectionStats()
    ]);

    return {
      connectedSockets: this.io.sockets.sockets.size,
      totalRooms: this.io.sockets.adapter.rooms.size,
      redisStats
    };
  }

  // Helper method to emit to a specific session
  emitToSession<T extends keyof ServerEventPayloads>(
    sessionId: string, 
    event: T, 
    data: ServerEventPayloads[T]
  ): void {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  // Helper method to emit to a specific socket
  emitToSocket<T extends keyof ServerEventPayloads>(
    socketId: string, 
    event: T, 
    data: ServerEventPayloads[T]
  ): void {
    this.io.to(socketId).emit(event, data);
  }
}