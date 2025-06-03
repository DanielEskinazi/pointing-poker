import Redis from 'ioredis';
import { ClientEvents } from './events';
import { logger } from '../utils/logger';

export interface RateLimitConfig {
  points: number;
  duration: number;
}

export class WebSocketRateLimiter {
  private redis: Redis;
  private limits: Record<string, RateLimitConfig> = {
    [ClientEvents.VOTE_SUBMIT]: { points: 10, duration: 60 },
    [ClientEvents.VOTE_CHANGE]: { points: 15, duration: 60 },
    [ClientEvents.STORY_UPDATE]: { points: 5, duration: 60 },
    [ClientEvents.STORY_CREATE]: { points: 3, duration: 60 },
    [ClientEvents.STORY_DELETE]: { points: 3, duration: 60 },
    [ClientEvents.PLAYER_UPDATE]: { points: 5, duration: 60 },
    [ClientEvents.CARDS_REVEAL]: { points: 5, duration: 60 },
    [ClientEvents.GAME_RESET]: { points: 5, duration: 60 },
    [ClientEvents.TIMER_START]: { points: 10, duration: 60 },
    [ClientEvents.TIMER_STOP]: { points: 10, duration: 60 },
    [ClientEvents.SESSION_JOIN]: { points: 3, duration: 60 },
    [ClientEvents.HEARTBEAT]: { points: 120, duration: 60 },
    default: { points: 30, duration: 60 }
  };

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async check(socketId: string, event: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    try {
      const limit = this.limits[event] || this.limits.default;
      const key = `rate:${socketId}:${event}`;
      
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, limit.duration);
      }
      
      if (current <= limit.points) {
        return { allowed: true };
      }
      
      // Get TTL for retry-after header
      const ttl = await this.redis.ttl(key);
      logger.warn(`Rate limit exceeded for socket ${socketId} on event ${event}`, {
        current,
        limit: limit.points,
        retryAfter: ttl
      });
      
      return { 
        allowed: false, 
        retryAfter: ttl > 0 ? ttl : limit.duration 
      };
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Fail open - allow the request if Redis is down
      return { allowed: true };
    }
  }

  async reset(socketId: string, event?: string): Promise<void> {
    try {
      if (event) {
        const key = `rate:${socketId}:${event}`;
        await this.redis.del(key);
      } else {
        // Reset all rate limits for this socket
        const pattern = `rate:${socketId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      logger.error('Rate limiter reset error:', error);
    }
  }

  async getUsage(socketId: string, event: string): Promise<{ current: number; limit: number; resetTime: number }> {
    try {
      const limit = this.limits[event] || this.limits.default;
      const key = `rate:${socketId}:${event}`;
      
      const [current, ttl] = await Promise.all([
        this.redis.get(key),
        this.redis.ttl(key)
      ]);
      
      return {
        current: current ? parseInt(current, 10) : 0,
        limit: limit.points,
        resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : 0
      };
    } catch (error) {
      logger.error('Rate limiter usage check error:', error);
      const limit = this.limits[event] || this.limits.default;
      return {
        current: 0,
        limit: limit.points,
        resetTime: 0
      };
    }
  }

  setCustomLimit(event: string, config: RateLimitConfig): void {
    this.limits[event] = config;
  }

  getLimit(event: string): RateLimitConfig {
    return this.limits[event] || this.limits.default;
  }
}