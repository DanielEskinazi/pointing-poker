import { db } from '../database';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { Prisma } from '@prisma/client';
import type { WebSocketServer } from '../websocket/server';
import { ServerEvents } from '../websocket/events';

// Event payload types for the voting service
interface VotingServiceEvents {
  'vote:submitted': { sessionId: string; playerId: string; storyId: string };
  'cards:revealed': { sessionId: string; votes: Vote[]; consensus: ConsensusResult | null; statistics: StatisticsResult | null };
  'game:reset': { sessionId: string };
}

// WebSocket integration
let wsServer: WebSocketServer | null = null;

export const setWebSocketServerForVoting = (server: WebSocketServer) => {
  wsServer = server;
  logger.info('WebSocket server injected into VotingService');
};

export interface SubmitVoteDto {
  sessionId: string;
  storyId: string;
  playerId: string;
  value: string;
  confidence?: number;
}

export interface Vote {
  id: string;
  playerId: string;
  playerName: string;
  value: string;
  confidence?: number;
  timestamp: Date;
}

export interface VoteResult {
  success: boolean;
  voteId?: string;
  timestamp?: Date;
  error?: string;
}

export interface StoryData {
  title: string;
  description?: string;
}

export interface ConsensusResult {
  value: string;
  agreement: number;
  average: number | null;
  distribution: Record<string, number>;
  totalVotes: number;
}

export interface StatisticsResult {
  min: number;
  max: number;
  median: number;
  standardDeviation: number;
  confidenceAverage: number;
}

export class VotingService {
  private eventEmitter = new EventEmitter();

  async submitVote(data: SubmitVoteDto): Promise<VoteResult> {
    try {
      // Validate story exists and is active
      const story = await db.getPrisma().story.findUnique({
        where: { id: data.storyId },
        include: { session: true }
      });

      if (!story || !story.isActive) {
        return {
          success: false,
          error: 'Invalid or completed story'
        };
      }

      // Check if cards already revealed
      const sessionConfig = story.session.config as Prisma.JsonValue;
      if (sessionConfig && typeof sessionConfig === 'object' && sessionConfig !== null && 
          'cardsRevealed' in sessionConfig && (sessionConfig as { cardsRevealed?: boolean }).cardsRevealed) {
        return {
          success: false,
          error: 'Voting closed - cards already revealed'
        };
      }

      // Create or update vote
      const vote = await db.getPrisma().vote.upsert({
        where: {
          storyId_playerId: {
            storyId: data.storyId,
            playerId: data.playerId
          }
        },
        update: {
          value: data.value,
          confidence: data.confidence
        },
        create: {
          storyId: data.storyId,
          playerId: data.playerId,
          sessionId: data.sessionId,
          value: data.value,
          confidence: data.confidence
        }
      });

      // Emit vote event and broadcast to WebSocket
      this.eventEmitter.emit('vote:submitted', {
        sessionId: data.sessionId,
        playerId: data.playerId,
        storyId: data.storyId
      });

      // Broadcast to WebSocket if available
      if (wsServer) {
        const { voteCount, totalPlayers } = await this.getVoteCounts(data.storyId);
        
        logger.info('Broadcasting vote submitted event', {
          sessionId: data.sessionId,
          playerId: data.playerId,
          voteCount,
          totalPlayers,
          storyId: data.storyId
        });
        
        wsServer.emitToSession(data.sessionId, ServerEvents.VOTE_SUBMITTED, {
          playerId: data.playerId,
          hasVoted: true,
          voteCount,
          totalPlayers
        });
      }

      logger.info('Vote submitted successfully', { voteId: vote.id, playerId: data.playerId });

      return {
        success: true,
        voteId: vote.id,
        timestamp: vote.createdAt ?? new Date()
      };
    } catch (error) {
      logger.error('Failed to submit vote:', error);
      throw new Error('Failed to submit vote');
    }
  }

  async getVotes(sessionId: string, storyId?: string): Promise<Vote[]> {
    try {
      let currentStoryId = storyId;
      
      if (!currentStoryId) {
        const currentStory = await this.getCurrentStory(sessionId);
        if (!currentStory) return [];
        currentStoryId = currentStory.id;
      }

      const votes = await db.getPrisma().vote.findMany({
        where: {
          storyId: currentStoryId
        },
        include: {
          player: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return votes.map(vote => ({
        id: vote.id,
        playerId: vote.playerId,
        playerName: vote.player.name,
        value: vote.value,
        confidence: vote.confidence || undefined,
        timestamp: vote.createdAt ?? new Date()
      }));
    } catch (error) {
      logger.error('Failed to get votes:', error);
      throw new Error('Failed to retrieve votes');
    }
  }

  async revealCards(sessionId: string) {
    try {
      // Get current story votes
      const currentStory = await this.getCurrentStory(sessionId);
      if (!currentStory) {
        throw new Error('No active story found');
      }

      const votes = await this.getVotes(sessionId, currentStory.id);

      // Update session config to mark cards as revealed
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const currentConfig = session.config as Prisma.JsonValue;
      const updatedConfig = {
        ...(typeof currentConfig === 'object' && currentConfig !== null ? currentConfig : {}),
        cardsRevealed: true
      };

      await db.getPrisma().session.update({
        where: { id: sessionId },
        data: { config: updatedConfig }
      });

      // Calculate consensus
      const consensus = this.calculateConsensus(votes);
      const statistics = this.calculateStatistics(votes);
      
      logger.info('Consensus calculation result', { 
        consensus,
        votesCount: votes.length,
        agreement: consensus?.agreement,
        hasHighAgreement: consensus ? consensus.agreement >= 0.8 : false
      });

      // Update story with final estimate if consensus is high
      if (consensus && consensus.agreement >= 0.8) {
        const updatedStory = await db.getPrisma().story.update({
          where: { id: currentStory.id },
          data: { finalEstimate: consensus.value }
        });
        
        // Emit story update event so UI updates immediately
        if (wsServer) {
          wsServer.emitToSession(sessionId, ServerEvents.STORY_UPDATED, {
            story: {
              id: updatedStory.id,
              title: updatedStory.title,
              description: updatedStory.description || undefined,
              finalEstimate: updatedStory.finalEstimate || undefined,
              orderIndex: updatedStory.orderIndex,
              isActive: updatedStory.isActive ?? true
            }
          });
        }
      }

      // Emit reveal event
      this.eventEmitter.emit('cards:revealed', {
        sessionId,
        votes,
        consensus,
        statistics
      });

      // Broadcast to WebSocket if available
      if (wsServer) {
        const voteResults = votes.map(vote => ({
          playerId: vote.playerId,
          playerName: vote.playerName,
          value: vote.value,
          confidence: vote.confidence
        }));

        const consensusData = {
          hasConsensus: consensus?.agreement ? consensus.agreement >= 0.8 : false,
          suggestedValue: consensus?.value,
          averageValue: consensus?.average || undefined,
          deviation: statistics?.standardDeviation
        };

        wsServer.emitToSession(sessionId, ServerEvents.CARDS_REVEALED, {
          storyId: currentStory.id,
          votes: voteResults,
          consensus: consensusData
        });
      }

      logger.info('Cards revealed successfully', { sessionId, storyId: currentStory.id });

      return { votes, consensus, statistics };
    } catch (error) {
      logger.error('Failed to reveal cards:', error);
      throw new Error('Failed to reveal cards');
    }
  }

  async resetRound(sessionId: string, newStory?: StoryData): Promise<void> {
    try {
      // Mark current story as completed
      const currentStory = await this.getCurrentStory(sessionId);
      if (currentStory) {
        await db.getPrisma().story.update({
          where: { id: currentStory.id },
          data: {
            isActive: false,
            completedAt: new Date()
          }
        });
      }

      // Create new story if provided
      if (newStory) {
        const nextIndex = await this.getNextStoryIndex(sessionId);
        await db.getPrisma().story.create({
          data: {
            sessionId,
            title: newStory.title,
            description: newStory.description,
            orderIndex: nextIndex
          }
        });
      }

      // Reset session state
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId }
      });

      if (session) {
        const currentConfig = session.config as Prisma.JsonValue;
        const updatedConfig = {
          ...(typeof currentConfig === 'object' && currentConfig !== null ? currentConfig : {}),
          cardsRevealed: false
        };

        await db.getPrisma().session.update({
          where: { id: sessionId },
          data: { config: updatedConfig }
        });
      }

      // Emit reset event
      this.eventEmitter.emit('game:reset', { sessionId });

      // Broadcast to WebSocket if available
      if (wsServer) {
        const story = await this.getCurrentStory(sessionId);
        wsServer.emitToSession(sessionId, ServerEvents.GAME_RESET, {
          storyId: story?.id || ''
        });
      }

      logger.info('Game round reset successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to reset round:', error);
      throw new Error('Failed to reset round');
    }
  }

  async resetVoting(sessionId: string): Promise<void> {
    try {
      // Reset session voting state without deactivating story
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId }
      });

      if (session) {
        const currentConfig = session.config as Prisma.JsonValue;
        const updatedConfig = {
          ...(typeof currentConfig === 'object' && currentConfig !== null ? currentConfig : {}),
          cardsRevealed: false
        };

        await db.getPrisma().session.update({
          where: { id: sessionId },
          data: { config: updatedConfig }
        });
      }

      // Clear all votes for current story
      const currentStory = await this.getCurrentStory(sessionId);
      if (currentStory) {
        await db.getPrisma().vote.deleteMany({
          where: { storyId: currentStory.id }
        });
      }

      // Emit reset event
      this.eventEmitter.emit('game:reset', { sessionId });

      // Broadcast to WebSocket if available
      if (wsServer) {
        wsServer.emitToSession(sessionId, ServerEvents.GAME_RESET, {
          storyId: currentStory?.id || ''
        });
      }

      logger.info('Voting reset successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to reset voting:', error);
      throw new Error('Failed to reset voting');
    }
  }

  calculateConsensus(votes: Vote[]): ConsensusResult | null {
    if (!votes.length) return null;

    // Group votes by value
    const groups = votes.reduce((acc, vote) => {
      acc[vote.value] = (acc[vote.value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most common value
    const sorted = Object.entries(groups)
      .sort(([,a], [,b]) => b - a);
    
    const [mostCommon, count] = sorted[0];
    const agreement = count / votes.length;

    // Calculate average for numeric values
    const numericVotes = votes
      .filter(v => !isNaN(Number(v.value)))
      .map(v => Number(v.value));
    
    const average = numericVotes.length
      ? numericVotes.reduce((a, b) => a + b) / numericVotes.length
      : null;

    return {
      value: mostCommon,
      agreement,
      average,
      distribution: groups,
      totalVotes: votes.length
    };
  }

  calculateStatistics(votes: Vote[]): StatisticsResult | null {
    const values = votes
      .filter(v => !isNaN(Number(v.value)))
      .map(v => Number(v.value))
      .sort((a, b) => a - b);

    if (!values.length) return null;

    const confidenceValues = votes
      .filter(v => v.confidence !== undefined)
      .map(v => v.confidence!);

    return {
      min: values[0],
      max: values[values.length - 1],
      median: values[Math.floor(values.length / 2)],
      standardDeviation: this.calculateStdDev(values),
      confidenceAverage: confidenceValues.length 
        ? confidenceValues.reduce((sum, v) => sum + v, 0) / confidenceValues.length
        : 0
    };
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
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

  private async getNextStoryIndex(sessionId: string): Promise<number> {
    const lastStory = await db.getPrisma().story.findFirst({
      where: { sessionId },
      orderBy: { orderIndex: 'desc' }
    });

    return lastStory ? lastStory.orderIndex + 1 : 1;
  }

  // Helper method for vote counts
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

  // Expose event emitter for external listening
  on<K extends keyof VotingServiceEvents>(event: K, listener: (data: VotingServiceEvents[K]) => void): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  on(event: string, listener: (...args: unknown[]) => void) {
    this.eventEmitter.on(event, listener);
  }

  off<K extends keyof VotingServiceEvents>(event: K, listener: (data: VotingServiceEvents[K]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void) {
    this.eventEmitter.off(event, listener);
  }
}