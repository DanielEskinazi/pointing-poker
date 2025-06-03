import Redis from 'ioredis';
import { SocketConnection, PlayerInfo, StoryInfo, TimerState } from './events';
import { logger } from '../utils/logger';

export interface SessionState {
  sessionId: string;
  players: PlayerInfo[];
  currentStory?: StoryInfo;
  timer?: TimerState;
  votesRevealed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class RedisStateManager {
  private redis: Redis;
  private readonly CONNECTION_TTL = 3600; // 1 hour
  private readonly SESSION_STATE_TTL = 86400; // 24 hours
  private readonly PLAYER_ONLINE_TTL = 300; // 5 minutes

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Connection management
  async storeConnection(connection: SocketConnection): Promise<void> {
    try {
      const key = `connection:${connection.socketId}`;
      const data = {
        ...connection,
        connectedAt: connection.connectedAt.toISOString(),
        lastActivity: connection.lastActivity.toISOString()
      };
      
      await this.redis.setex(key, this.CONNECTION_TTL, JSON.stringify(data));
      
      // Add to session connections set
      if (connection.sessionId) {
        await this.redis.sadd(`session:${connection.sessionId}:connections`, connection.socketId);
        await this.redis.expire(`session:${connection.sessionId}:connections`, this.CONNECTION_TTL);
      }
      
      // Track player online status
      if (connection.playerId) {
        await this.redis.setex(
          `player:${connection.playerId}:online`, 
          this.PLAYER_ONLINE_TTL, 
          connection.socketId
        );
      }
      
      logger.debug('Connection stored in Redis', { socketId: connection.socketId, sessionId: connection.sessionId });
    } catch (error) {
      logger.error('Failed to store connection in Redis:', error);
      throw error;
    }
  }

  async getConnection(socketId: string): Promise<SocketConnection | null> {
    try {
      const key = `connection:${socketId}`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        connectedAt: new Date(parsed.connectedAt),
        lastActivity: new Date(parsed.lastActivity)
      };
    } catch (error) {
      logger.error('Failed to get connection from Redis:', error);
      return null;
    }
  }

  async updateConnectionActivity(socketId: string): Promise<void> {
    try {
      const connection = await this.getConnection(socketId);
      if (connection) {
        connection.lastActivity = new Date();
        await this.storeConnection(connection);
      }
    } catch (error) {
      logger.error('Failed to update connection activity:', error);
    }
  }

  async removeConnection(socketId: string): Promise<void> {
    try {
      const connection = await this.getConnection(socketId);
      
      if (connection) {
        // Remove from session connections
        if (connection.sessionId) {
          await this.redis.srem(`session:${connection.sessionId}:connections`, socketId);
        }
        
        // Remove player online status if this was the last connection
        if (connection.playerId) {
          const onlineSocketId = await this.redis.get(`player:${connection.playerId}:online`);
          if (onlineSocketId === socketId) {
            await this.redis.del(`player:${connection.playerId}:online`);
          }
        }
      }
      
      // Remove connection record
      await this.redis.del(`connection:${socketId}`);
      
      logger.debug('Connection removed from Redis', { socketId });
    } catch (error) {
      logger.error('Failed to remove connection from Redis:', error);
    }
  }

  async getSessionConnections(sessionId: string): Promise<string[]> {
    try {
      return await this.redis.smembers(`session:${sessionId}:connections`);
    } catch (error) {
      logger.error('Failed to get session connections:', error);
      return [];
    }
  }

  async getSessionConnectionCount(sessionId: string): Promise<number> {
    try {
      return await this.redis.scard(`session:${sessionId}:connections`);
    } catch (error) {
      logger.error('Failed to get session connection count:', error);
      return 0;
    }
  }

  // Player status management
  async isPlayerOnline(playerId: string): Promise<boolean> {
    try {
      const socketId = await this.redis.get(`player:${playerId}:online`);
      return socketId !== null;
    } catch (error) {
      logger.error('Failed to check player online status:', error);
      return false;
    }
  }

  async getPlayerSocketId(playerId: string): Promise<string | null> {
    try {
      return await this.redis.get(`player:${playerId}:online`);
    } catch (error) {
      logger.error('Failed to get player socket ID:', error);
      return null;
    }
  }

  async setPlayerOnline(playerId: string, socketId: string): Promise<void> {
    try {
      await this.redis.setex(`player:${playerId}:online`, this.PLAYER_ONLINE_TTL, socketId);
    } catch (error) {
      logger.error('Failed to set player online:', error);
    }
  }

  // Session state management
  async storeSessionState(sessionState: SessionState): Promise<void> {
    try {
      const key = `session:${sessionState.sessionId}:state`;
      const data = {
        ...sessionState,
        createdAt: sessionState.createdAt.toISOString(),
        updatedAt: sessionState.updatedAt.toISOString()
      };
      
      await this.redis.setex(key, this.SESSION_STATE_TTL, JSON.stringify(data));
      logger.debug('Session state stored', { sessionId: sessionState.sessionId });
    } catch (error) {
      logger.error('Failed to store session state:', error);
      throw error;
    }
  }

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    try {
      const key = `session:${sessionId}:state`;
      const data = await this.redis.get(key);
      
      if (!data) {
        return null;
      }
      
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt)
      };
    } catch (error) {
      logger.error('Failed to get session state:', error);
      return null;
    }
  }

  async updateSessionState(sessionId: string, updates: Partial<SessionState>): Promise<void> {
    try {
      const currentState = await this.getSessionState(sessionId);
      if (!currentState) {
        logger.warn('Attempted to update non-existent session state', { sessionId });
        return;
      }
      
      const updatedState: SessionState = {
        ...currentState,
        ...updates,
        updatedAt: new Date()
      };
      
      await this.storeSessionState(updatedState);
    } catch (error) {
      logger.error('Failed to update session state:', error);
      throw error;
    }
  }

  async removeSessionState(sessionId: string): Promise<void> {
    try {
      await this.redis.del(`session:${sessionId}:state`);
      logger.debug('Session state removed', { sessionId });
    } catch (error) {
      logger.error('Failed to remove session state:', error);
    }
  }

  // Utility methods
  async cleanupExpiredConnections(): Promise<number> {
    try {
      const pattern = 'connection:*';
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no TTL - clean it up
          await this.redis.del(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired connections`);
      }
      
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired connections:', error);
      return 0;
    }
  }

  async getConnectionStats(): Promise<{
    totalConnections: number;
    activeSessions: number;
    onlinePlayers: number;
  }> {
    try {
      const [connectionKeys, sessionKeys, playerKeys] = await Promise.all([
        this.redis.keys('connection:*'),
        this.redis.keys('session:*:connections'),
        this.redis.keys('player:*:online')
      ]);
      
      return {
        totalConnections: connectionKeys.length,
        activeSessions: sessionKeys.length,
        onlinePlayers: playerKeys.length
      };
    } catch (error) {
      logger.error('Failed to get connection stats:', error);
      return {
        totalConnections: 0,
        activeSessions: 0,
        onlinePlayers: 0
      };
    }
  }
}