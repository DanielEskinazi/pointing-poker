import { EventEmitter } from 'events';
import { TimerState } from '../websocket/events';
import { logger } from '../utils/logger';
import { RedisStateManager } from '../websocket/redis-state';

export interface TimerServiceEvents {
  'timer:updated': (data: { sessionId: string; timer: TimerState }) => void;
  'timer:completed': (data: { sessionId: string; timer: TimerState }) => void;
}

export class TimerService extends EventEmitter {
  private static instance: TimerService;
  private redisState: RedisStateManager;
  private activeTimers = new Map<string, NodeJS.Timeout>(); // sessionId -> interval
  private sessionTimers = new Map<string, TimerState>(); // sessionId -> timer state

  constructor(redisState: RedisStateManager) {
    super();
    this.redisState = redisState;
  }

  static getInstance(redisState?: RedisStateManager): TimerService {
    if (!TimerService.instance) {
      if (!redisState) {
        throw new Error('RedisStateManager required for first TimerService instantiation');
      }
      TimerService.instance = new TimerService(redisState);
    }
    return TimerService.instance;
  }

  /**
   * Start a timer for a session
   */
  async startTimer(sessionId: string, duration: number, mode: 'countdown' | 'stopwatch' = 'countdown'): Promise<TimerState> {
    logger.info('Starting timer', { sessionId, duration, mode });

    // Stop any existing timer for this session
    await this.stopTimer(sessionId);

    const now = new Date();
    const timerState: TimerState = {
      mode,
      isRunning: true,
      isPaused: false,
      duration,
      remainingTime: mode === 'countdown' ? duration : 0,
      startedAt: now,
      pausedAt: undefined,
      pausedDuration: 0,
      settings: {
        enableWarning: true,
        warningThreshold: 60, // 1 minute warning
        enableSound: true,
        autoReveal: false
      }
    };

    // Store timer state
    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    // Start interval for this timer
    const interval = setInterval(async () => {
      await this.updateTimer(sessionId);
    }, 1000); // Update every second

    this.activeTimers.set(sessionId, interval);

    // Emit initial timer state
    this.emit('timer:updated', { sessionId, timer: timerState });

    return timerState;
  }

  /**
   * Pause a running timer
   */
  async pauseTimer(sessionId: string): Promise<TimerState | null> {
    const timerState = this.sessionTimers.get(sessionId);
    if (!timerState || !timerState.isRunning || timerState.isPaused) {
      return null;
    }

    const now = new Date();
    timerState.isPaused = true;
    timerState.pausedAt = now;

    // Update state
    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    logger.info('Timer paused', { sessionId, remainingTime: timerState.remainingTime });

    this.emit('timer:updated', { sessionId, timer: timerState });
    return timerState;
  }

  /**
   * Resume a paused timer
   */
  async resumeTimer(sessionId: string): Promise<TimerState | null> {
    const timerState = this.sessionTimers.get(sessionId);
    if (!timerState || !timerState.isRunning || !timerState.isPaused || !timerState.pausedAt) {
      return null;
    }

    const now = new Date();
    const pauseDuration = (now.getTime() - timerState.pausedAt.getTime()) / 1000;
    
    timerState.isPaused = false;
    timerState.pausedDuration += pauseDuration;
    timerState.pausedAt = undefined;

    // Update state
    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    logger.info('Timer resumed', { sessionId, pauseDuration, totalPausedDuration: timerState.pausedDuration });

    this.emit('timer:updated', { sessionId, timer: timerState });
    return timerState;
  }

  /**
   * Stop a timer
   */
  async stopTimer(sessionId: string): Promise<TimerState | null> {
    const interval = this.activeTimers.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.activeTimers.delete(sessionId);
    }

    const timerState = this.sessionTimers.get(sessionId);
    if (timerState) {
      timerState.isRunning = false;
      timerState.isPaused = false;
      timerState.pausedAt = undefined;

      this.sessionTimers.set(sessionId, timerState);
      await this.persistTimerState(sessionId, timerState);

      logger.info('Timer stopped', { sessionId });

      this.emit('timer:updated', { sessionId, timer: timerState });
      return timerState;
    }

    return null;
  }

  /**
   * Reset a timer
   */
  async resetTimer(sessionId: string): Promise<TimerState | null> {
    const timerState = this.sessionTimers.get(sessionId);
    if (!timerState) {
      return null;
    }

    // Stop the timer first
    await this.stopTimer(sessionId);

    // Reset to initial state
    timerState.remainingTime = timerState.mode === 'countdown' ? timerState.duration : 0;
    timerState.startedAt = undefined;
    timerState.pausedAt = undefined;
    timerState.pausedDuration = 0;

    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    logger.info('Timer reset', { sessionId, mode: timerState.mode });

    this.emit('timer:updated', { sessionId, timer: timerState });
    return timerState;
  }

  /**
   * Add time to a running timer
   */
  async addTime(sessionId: string, seconds: number): Promise<TimerState | null> {
    const timerState = this.sessionTimers.get(sessionId);
    if (!timerState) {
      return null;
    }

    timerState.duration += seconds;
    if (timerState.mode === 'countdown') {
      timerState.remainingTime += seconds;
    }

    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    logger.info('Time added to timer', { sessionId, secondsAdded: seconds, newDuration: timerState.duration });

    this.emit('timer:updated', { sessionId, timer: timerState });
    return timerState;
  }

  /**
   * Configure timer settings
   */
  async configureTimer(sessionId: string, settings: TimerState['settings']): Promise<TimerState | null> {
    const timerState = this.sessionTimers.get(sessionId);
    if (!timerState) {
      return null;
    }

    timerState.settings = { ...timerState.settings, ...settings };

    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    logger.info('Timer settings updated', { sessionId, settings });

    this.emit('timer:updated', { sessionId, timer: timerState });
    return timerState;
  }

  /**
   * Get current timer state for a session
   */
  getTimerState(sessionId: string): TimerState | null {
    return this.sessionTimers.get(sessionId) || null;
  }

  /**
   * Load timer state from Redis when service starts
   */
  async loadTimerState(sessionId: string): Promise<TimerState | null> {
    try {
      const redisKey = `timer:${sessionId}`;
      const timerData = await this.redisState.getRedis().get(redisKey);
      
      if (timerData) {
        const timerState = JSON.parse(timerData);
        // Convert date strings back to Date objects
        if (timerState.startedAt) {
          timerState.startedAt = new Date(timerState.startedAt);
        }
        if (timerState.pausedAt) {
          timerState.pausedAt = new Date(timerState.pausedAt);
        }

        this.sessionTimers.set(sessionId, timerState);

        // If timer was running, restart the interval
        if (timerState.isRunning && !timerState.isPaused) {
          const interval = setInterval(async () => {
            await this.updateTimer(sessionId);
          }, 1000);
          this.activeTimers.set(sessionId, interval);
        }

        return timerState;
      }
    } catch (error) {
      logger.error('Failed to load timer state from Redis', { sessionId, error });
    }

    return null;
  }

  /**
   * Clean up timer when session ends
   */
  async cleanupTimer(sessionId: string): Promise<void> {
    await this.stopTimer(sessionId);
    this.sessionTimers.delete(sessionId);
    
    // Remove from Redis
    const redisKey = `timer:${sessionId}`;
    await this.redisState.getRedis().del(redisKey);

    logger.info('Timer cleaned up', { sessionId });
  }

  /**
   * Update timer calculation (called every second)
   */
  private async updateTimer(sessionId: string): Promise<void> {
    const timerState = this.sessionTimers.get(sessionId);
    if (!timerState || !timerState.isRunning || timerState.isPaused || !timerState.startedAt) {
      return;
    }

    const now = new Date();
    const elapsedTime = (now.getTime() - timerState.startedAt.getTime()) / 1000 - timerState.pausedDuration;

    if (timerState.mode === 'countdown') {
      timerState.remainingTime = Math.max(0, timerState.duration - elapsedTime);
      
      // Check if timer completed
      if (timerState.remainingTime <= 0) {
        timerState.remainingTime = 0;
        timerState.isRunning = false;
        
        // Stop the interval
        const interval = this.activeTimers.get(sessionId);
        if (interval) {
          clearInterval(interval);
          this.activeTimers.delete(sessionId);
        }

        await this.persistTimerState(sessionId, timerState);
        
        logger.info('Timer completed', { sessionId });
        this.emit('timer:completed', { sessionId, timer: timerState });
        return;
      }
    } else if (timerState.mode === 'stopwatch') {
      timerState.remainingTime = elapsedTime;
    }

    // Update state
    this.sessionTimers.set(sessionId, timerState);
    await this.persistTimerState(sessionId, timerState);

    // Emit update
    this.emit('timer:updated', { sessionId, timer: timerState });
  }

  /**
   * Persist timer state to Redis
   */
  private async persistTimerState(sessionId: string, timerState: TimerState): Promise<void> {
    try {
      const redisKey = `timer:${sessionId}`;
      await this.redisState.getRedis().setex(redisKey, 86400, JSON.stringify(timerState)); // 24 hour expiry
    } catch (error) {
      logger.error('Failed to persist timer state', { sessionId, error });
    }
  }
}