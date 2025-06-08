import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { db } from '../database';
import { generateToken } from '../utils/auth';
import { logger } from '../utils/logger';
import { WebSocketServer } from '../websocket';
import { ServerEvents } from '../websocket/events';
import {
  CreateSessionDto,
  JoinSessionDto,
  UpdateSessionDto,
  SessionResponse,
  PlayerResponse,
  CreateSessionResponse,
  JoinSessionResponse,
  SessionConfig
} from '../types/api';
import { Prisma, Player } from '@prisma/client';

// Extended session config to include runtime state
interface ExtendedSessionConfig extends SessionConfig {
  cardsRevealed?: boolean;
}


type SessionUpdateData = {
  name?: string;
  config?: Prisma.InputJsonValue;
};

// Global WebSocket server instance (injected from main server)
let wsServer: WebSocketServer | null = null;

export const setWebSocketServerForSession = (server: WebSocketServer): void => {
  wsServer = server;
};

export class SessionService {
  private readonly SALT_ROUNDS = 10;
  private readonly SESSION_EXPIRY_HOURS = 48;

  async createSession(data: CreateSessionDto): Promise<CreateSessionResponse> {
    try {
      const sessionId = uuidv4();
      const hostId = uuidv4();
      
      // Hash password if provided
      const passwordHash = data.password 
        ? await bcrypt.hash(data.password, this.SALT_ROUNDS)
        : null;

      // Calculate expiry date
      const expiresAt = new Date(Date.now() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

      // Create session in database (without hostId first)
      const session = await db.getPrisma().session.create({
        data: {
          id: sessionId,
          name: data.name,
          passwordHash,
          config: data.config as unknown as Prisma.InputJsonValue,
          expiresAt,
          isActive: true
        }
      });

      // Add host as first player
      const host = await db.getPrisma().player.create({
        data: {
          id: hostId,
          sessionId,
          name: data.host.name,
          avatar: data.host.avatar || '👤',
          isSpectator: false,
          isActive: true
        }
      });

      // Update session with hostId
      await db.getPrisma().session.update({
        where: { id: sessionId },
        data: { hostId }
      });

      // Generate host token
      const hostToken = generateToken({
        sessionId,
        playerId: hostId,
        isHost: true
      });

      const sessionResponse: SessionResponse = {
        id: session.id,
        name: session.name,
        hostId: hostId,
        config: session.config as unknown as ExtendedSessionConfig,
        isActive: session.isActive ?? true,
        createdAt: session.createdAt ?? new Date(),
        expiresAt: session.expiresAt,
        players: [this.mapPlayerToResponse(host)],
        playerCount: 1
      };

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      
      logger.info('Session created successfully', { sessionId, hostId });

      return {
        session: sessionResponse,
        joinUrl: `${clientUrl}/game/${sessionId}`,
        hostToken
      };

    } catch (error) {
      logger.error('Failed to create session:', error);
      console.error('Session creation error details:', error);
      throw new Error('Failed to create session');
    }
  }

  async getSession(sessionId: string): Promise<SessionResponse | null> {
    try {
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId, isActive: true },
        include: {
          players: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' }
          }
        }
      });

      if (!session) {
        return null;
      }

      // Check if expired
      if (new Date() > session.expiresAt) {
        await this.deleteSession(sessionId);
        return null;
      }

      return {
        id: session.id,
        name: session.name,
        hostId: session.hostId!,
        config: session.config as unknown as ExtendedSessionConfig,
        isActive: session.isActive ?? true,
        cardsRevealed: (session.config as unknown as ExtendedSessionConfig)?.cardsRevealed || false,
        createdAt: session.createdAt ?? new Date(),
        expiresAt: session.expiresAt,
        players: session.players.map(this.mapPlayerToResponse),
        playerCount: session.players.length
      };

    } catch (error) {
      logger.error('Failed to get session:', error);
      throw new Error('Failed to retrieve session');
    }
  }

  async updateSession(sessionId: string, data: UpdateSessionDto): Promise<SessionResponse> {
    try {
      const updateData: SessionUpdateData = {};

      if (data.name) {
        updateData.name = data.name;
      }

      if (data.config) {
        // Get current config and merge with updates
        const currentSession = await db.getPrisma().session.findUnique({
          where: { id: sessionId }
        });

        if (!currentSession) {
          throw new Error('Session not found');
        }

        updateData.config = {
          ...currentSession.config as unknown as ExtendedSessionConfig,
          ...data.config
        } as unknown as Prisma.InputJsonValue;
      }

      const session = await db.getPrisma().session.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          players: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' }
          }
        }
      });

      logger.info('Session updated successfully', { sessionId });

      return {
        id: session.id,
        name: session.name,
        hostId: session.hostId!,
        config: session.config as unknown as ExtendedSessionConfig,
        isActive: session.isActive ?? true,
        cardsRevealed: (session.config as unknown as ExtendedSessionConfig)?.cardsRevealed || false,
        createdAt: session.createdAt ?? new Date(),
        expiresAt: session.expiresAt,
        players: session.players.map(this.mapPlayerToResponse),
        playerCount: session.players.length
      };

    } catch (error) {
      logger.error('Failed to update session:', error);
      throw new Error('Failed to update session');
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await db.getPrisma().session.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      logger.info('Session deleted successfully', { sessionId });

    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }

  async joinSession(sessionId: string, data: JoinSessionDto): Promise<JoinSessionResponse> {
    try {
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId, isActive: true }
      });

      if (!session) {
        throw new Error('Session not found or inactive');
      }

      // Check if session has expired
      if (new Date() > session.expiresAt) {
        await this.deleteSession(sessionId);
        throw new Error('Session has expired');
      }

      // Verify password if required
      if (session.passwordHash && data.password) {
        const validPassword = await bcrypt.compare(data.password, session.passwordHash);
        if (!validPassword) {
          throw new Error('Invalid password');
        }
      } else if (session.passwordHash && !data.password) {
        throw new Error('Password required');
      }

      // Create new player - duplicates names are allowed, avatars provide visual distinction
      logger.info('Creating new player in database', { sessionId, name: data.name });
      
      const player = await db.getPrisma().player.create({
        data: {
          sessionId,
          name: data.name,
          avatar: data.avatar,
          isSpectator: data.isSpectator || false,
          isActive: true
        }
      });
        
      logger.info('Player created successfully', { 
        sessionId, 
        playerId: player.id,
        name: player.name
      });

      // Generate player token
      const token = generateToken({
        sessionId,
        playerId: player.id,
        isHost: player.id === session.hostId
      });

      logger.info('Player joined session', { sessionId, playerId: player.id });

      // Notify existing WebSocket connections about the new player
      if (wsServer) {
        const playerInfo = {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          isSpectator: player.isSpectator ?? false,
          isActive: player.isActive ?? true,
          isHost: session.hostId === player.id,
          joinedAt: player.joinedAt ?? new Date(),
          lastSeenAt: player.lastSeenAt ?? new Date()
        };

        // Get current player count
        const playerCount = await db.getPrisma().player.count({
          where: { sessionId, isActive: true }
        });

        // Emit to all connected sockets in this session (except the new player who isn't connected yet)
        wsServer.emitToSession(sessionId, ServerEvents.PLAYER_JOINED, {
          player: playerInfo,
          playerCount
        });

        logger.debug('Sent PLAYER_JOINED event via WebSocket', { sessionId, playerId: player.id });
      }

      return {
        playerId: player.id,
        sessionId,
        token
      };

    } catch (error) {
      logger.error('Failed to join session:', error);
      throw error;
    }
  }

  private mapPlayerToResponse(player: Player): PlayerResponse {
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isSpectator: player.isSpectator ?? false,
      isActive: player.isActive ?? true,
      joinedAt: player.joinedAt ?? new Date(),
      lastSeenAt: player.lastSeenAt ?? new Date()
    };
  }

  // Cleanup expired sessions (can be called periodically)
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db.getPrisma().session.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          isActive: true
        },
        data: { isActive: false }
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired sessions`);
      }

      return result.count;

    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }
}