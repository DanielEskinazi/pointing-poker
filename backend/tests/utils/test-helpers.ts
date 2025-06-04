import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/database';
import { generateToken } from '../../src/utils/auth';
import { SessionConfig } from '../../src/types/api';

export interface TestSession {
  id: string;
  name: string;
  hostId: string;
  config: SessionConfig;
  passwordHash?: string;
}

export interface TestPlayer {
  id: string;
  sessionId: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
}

export interface TestStory {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  isActive: boolean;
}

export class TestDataFactory {
  static async createTestSession(overrides: Partial<TestSession> = {}): Promise<TestSession> {
    const sessionId = uuidv4();
    const hostId = uuidv4();
    
    const sessionData = {
      id: sessionId,
      name: 'Test Session',
      hostId,
      config: {
        cardValues: ['1', '2', '3', '5', '8', '13', '?'],
        allowSpectators: true,
        autoRevealCards: false,
        timerSeconds: 60
      },
      ...overrides
    };

    const session = await db.getPrisma().session.create({
      data: {
        id: sessionData.id,
        name: sessionData.name,
        hostId: sessionData.hostId,
        config: sessionData.config as SessionConfig,
        passwordHash: sessionData.passwordHash,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        isActive: true
      }
    });

    return {
      id: session.id,
      name: session.name,
      hostId: session.hostId!,
      config: session.config as SessionConfig,
      passwordHash: session.passwordHash || undefined
    };
  }

  static async createTestPlayer(sessionId: string, overrides: Partial<TestPlayer> = {}): Promise<TestPlayer> {
    const playerData = {
      id: uuidv4(),
      sessionId,
      name: 'Test Player',
      avatar: '👤',
      isSpectator: false,
      isActive: true,
      ...overrides
    };

    const player = await db.getPrisma().player.create({
      data: playerData
    });

    return {
      id: player.id,
      sessionId: player.sessionId,
      name: player.name,
      avatar: player.avatar,
      isSpectator: player.isSpectator,
      isActive: player.isActive
    };
  }

  static async createTestStory(sessionId: string, overrides: Partial<TestStory> = {}): Promise<TestStory> {
    const storyData = {
      id: uuidv4(),
      sessionId,
      title: 'Test Story',
      description: 'Test story description',
      isActive: true,
      orderIndex: 1,
      ...overrides
    };

    const story = await db.getPrisma().story.create({
      data: storyData
    });

    return {
      id: story.id,
      sessionId: story.sessionId,
      title: story.title,
      description: story.description || undefined,
      isActive: story.isActive
    };
  }

  static async createTestVote(storyId: string, playerId: string, sessionId: string, value: string = '5') {
    return await db.getPrisma().vote.create({
      data: {
        storyId,
        playerId,
        sessionId,
        value,
        confidence: 80
      }
    });
  }

  static generateTestToken(playerId: string, sessionId: string, isHost: boolean = false): string {
    return generateToken({
      playerId,
      sessionId,
      isHost
    });
  }

  static async createHostSession(): Promise<{session: TestSession, host: TestPlayer, hostToken: string}> {
    const session = await this.createTestSession();
    const host = await this.createTestPlayer(session.id, { 
      id: session.hostId,
      name: 'Host Player'
    });
    const hostToken = this.generateTestToken(host.id, session.id, true);

    return { session, host, hostToken };
  }

  static async createPlayerSession(): Promise<{session: TestSession, player: TestPlayer, playerToken: string}> {
    const session = await this.createTestSession();
    await this.createTestPlayer(session.id, { id: session.hostId });
    const player = await this.createTestPlayer(session.id, { name: 'Regular Player' });
    const playerToken = this.generateTestToken(player.id, session.id, false);

    return { session, player, playerToken };
  }

  static async createSpectatorSession(): Promise<{session: TestSession, spectator: TestPlayer, spectatorToken: string}> {
    const session = await this.createTestSession();
    await this.createTestPlayer(session.id, { id: session.hostId });
    const spectator = await this.createTestPlayer(session.id, { 
      name: 'Spectator Player',
      isSpectator: true 
    });
    const spectatorToken = this.generateTestToken(spectator.id, session.id, false);

    return { session, spectator, spectatorToken };
  }
}