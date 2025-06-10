import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createServer } from 'http';
import { Application } from 'express';
import { db } from '../database';
import { logger } from '../utils/logger';
import { ConnectionManager } from './connection-manager';
import { RedisStateManager } from './redis-state';
import { WebSocketRateLimiter } from './rate-limiter';
import { VotingService } from '../services/voting.service';
import { StoryService } from '../services/story.service';
import { TimerService } from '../services/timer.service';
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
  private votingService: VotingService;
  private storyService: StoryService;
  private timerService: TimerService;
  private isInitialized = false;

  constructor() {
    this.redisStateManager = new RedisStateManager(db.getRedis());
    this.rateLimiter = new WebSocketRateLimiter(db.getRedis());
    this.votingService = new VotingService();
    this.storyService = StoryService.getInstance();
    this.timerService = TimerService.getInstance(this.redisStateManager);
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

      // Set up service event listeners
      this.setupServiceEventListeners();

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
    // Simplified authentication middleware - no token required
    this.io.use(async (socket, next) => {
      try {
        const { sessionId, playerId, playerName, avatar } = socket.handshake.auth;
        
        if (!sessionId) {
          return next(new Error('Session ID required'));
        }

        // Validate session exists in database
        const session = await db.getPrisma().session.findUnique({
          where: { id: sessionId, isActive: true }
        });

        if (!session) {
          return next(new Error('Session not found or inactive'));
        }

        // Check if session has expired
        if (session.expiresAt < new Date()) {
          return next(new Error('Session has expired'));
        }

        // Store session info in socket - playerId will be set during connection handling
        socket.data = {
          sessionId,
          playerId,
          playerName,
          avatar
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

  private setupServiceEventListeners(): void {
    // Listen to voting service events and broadcast to WebSocket clients
    this.votingService.on('vote:submitted', (data: { sessionId: string; playerId: string; storyId: string }) => {
      // Get vote counts and broadcast to session
      this.getVoteCounts(data.storyId).then(({ voteCount, totalPlayers }) => {
        this.emitToSession(data.sessionId, ServerEvents.VOTE_SUBMITTED, {
          playerId: data.playerId,
          hasVoted: true,
          voteCount,
          totalPlayers
        });
      }).catch(error => logger.error('Failed to get vote counts:', error));
    });

    this.votingService.on('cards:revealed', (data: { sessionId: string; votes: any[]; consensus: any; statistics: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Map votes to the expected format
      const voteResults = data.votes.map(vote => ({
        playerId: vote.playerId,
        playerName: vote.playerName,
        value: vote.value,
        confidence: vote.confidence
      }));

      // Map consensus to expected format
      const consensusData = {
        hasConsensus: data.consensus?.agreement > 0.8,
        suggestedValue: data.consensus?.value,
        averageValue: data.consensus?.average,
        deviation: data.statistics?.standardDeviation
      };

      this.emitToSession(data.sessionId, ServerEvents.CARDS_REVEALED, {
        storyId: '', // Will be filled by the current story
        votes: voteResults,
        consensus: consensusData
      });
    });

    this.votingService.on('game:reset', (data: { sessionId: string }) => {
      // Get current story and broadcast reset
      this.getCurrentStory(data.sessionId).then(story => {
        this.emitToSession(data.sessionId, ServerEvents.GAME_RESET, {
          storyId: story?.id || ''
        });
      }).catch(error => logger.error('Failed to get current story:', error));
    });

    // Listen to story service events and broadcast to WebSocket clients
    this.storyService.on('story:created', (data: { sessionId: string; story: any }) => {
      logger.info('WebSocket: story:created event received', { 
        sessionId: data.sessionId, 
        storyId: data.story.id,
        connectedSockets: this.io.sockets.sockets.size 
      });
      
      this.emitToSession(data.sessionId, ServerEvents.STORY_CREATED, {
        story: {
          id: data.story.id,
          title: data.story.title,
          description: data.story.description,
          isActive: data.story.isActive,
          orderIndex: data.story.orderIndex,
          finalEstimate: data.story.finalEstimate
        }
      });
      
      logger.info('WebSocket: STORY_CREATED event emitted to session', { 
        sessionId: data.sessionId,
        event: ServerEvents.STORY_CREATED 
      });
    });

    this.storyService.on('story:updated', (data: { sessionId: string; story: any }) => {
      this.emitToSession(data.sessionId, ServerEvents.STORY_UPDATED, {
        story: {
          id: data.story.id,
          title: data.story.title,
          description: data.story.description,
          isActive: data.story.isActive,
          orderIndex: data.story.orderIndex,
          finalEstimate: data.story.finalEstimate
        }
      });
    });

    this.storyService.on('story:deleted', (data: { sessionId: string; storyId: string }) => {
      this.emitToSession(data.sessionId, ServerEvents.STORY_DELETED, {
        storyId: data.storyId
      });
    });

    this.storyService.on('story:activated', (data: { sessionId: string; story: any; previousActiveStoryId?: string }) => {
      this.emitToSession(data.sessionId, ServerEvents.STORY_ACTIVATED, {
        story: {
          id: data.story.id,
          title: data.story.title,
          description: data.story.description,
          isActive: data.story.isActive,
          orderIndex: data.story.orderIndex,
          finalEstimate: data.story.finalEstimate
        },
        previousActiveStoryId: data.previousActiveStoryId
      });
    });

    // Listen to timer service events and broadcast to WebSocket clients
    this.timerService.on('timer:updated', (data: { sessionId: string; timer: any }) => {
      this.emitToSession(data.sessionId, ServerEvents.TIMER_UPDATED, {
        timer: data.timer
      });
    });

    this.timerService.on('timer:completed', (data: { sessionId: string; timer: any }) => {
      // When timer completes, emit update and optionally auto-reveal cards
      this.emitToSession(data.sessionId, ServerEvents.TIMER_UPDATED, {
        timer: data.timer
      });

      // If auto-reveal is enabled, reveal cards automatically
      if (data.timer.settings?.autoReveal) {
        // Get current story and reveal votes if there are any
        this.getCurrentStory(data.sessionId).then(story => {
          if (story) {
            // Trigger card reveal logic similar to handleCardsReveal
            db.getPrisma().vote.findMany({
              where: { storyId: story.id },
              include: { player: true }
            }).then(votes => {
              if (votes.length > 0) {
                const voteResults = votes.map(vote => ({
                  playerId: vote.playerId,
                  playerName: vote.player.name,
                  value: vote.value,
                  confidence: vote.confidence || undefined
                }));

                const consensus = this.calculateConsensus(voteResults);

                this.emitToSession(data.sessionId, ServerEvents.CARDS_REVEALED, {
                  storyId: story.id,
                  votes: voteResults,
                  consensus
                });
              }
            }).catch(error => logger.error('Failed to auto-reveal cards:', error));
          }
        }).catch(error => logger.error('Failed to get current story for auto-reveal:', error));
      }
    });

    logger.info('Service event listeners set up successfully');
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

  // Helper methods for service integration
  private async getVoteCounts(storyId: string): Promise<{ voteCount: number; totalPlayers: number }> {
    const [voteCount, story] = await Promise.all([
      db.getPrisma().vote.count({ where: { storyId } }),
      db.getPrisma().story.findUnique({
        where: { id: storyId },
        include: {
          session: {
            include: {
              players: { where: { isActive: true, isSpectator: false } }
            }
          }
        }
      })
    ]);

    return {
      voteCount,
      totalPlayers: story?.session.players.length || 0
    };
  }

  private async getCurrentStory(sessionId: string) {
    return db.getPrisma().story.findFirst({
      where: {
        sessionId,
        isActive: true
      },
      orderBy: {
        orderIndex: 'desc'
      }
    });
  }

  private calculateConsensus(votes: { value: string }[]): { hasConsensus: boolean; suggestedValue?: string; averageValue?: number; deviation?: number } {
    if (votes.length === 0) {
      return { hasConsensus: false };
    }

    const values = votes.map(vote => vote.value);
    const uniqueValues = [...new Set(values)];

    // If all votes are the same, we have consensus
    if (uniqueValues.length === 1) {
      return {
        hasConsensus: true,
        suggestedValue: uniqueValues[0]
      };
    }

    // For numeric values, calculate average and deviation
    const numericValues = values
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    if (numericValues.length > 0) {
      const average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / numericValues.length;
      const deviation = Math.sqrt(variance);

      return {
        hasConsensus: deviation < 2, // Low deviation indicates consensus
        averageValue: average,
        deviation,
        suggestedValue: Math.round(average).toString()
      };
    }

    return { hasConsensus: false };
  }
}