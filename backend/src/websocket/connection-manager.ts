import { Socket, Server } from 'socket.io';
import { db } from '../database';
import { logger } from '../utils/logger';
import { RedisStateManager } from './redis-state';
import { WebSocketRateLimiter } from './rate-limiter';
import { 
  SocketConnection, 
  ClientEvents, 
  ServerEvents, 
  ClientEventPayloads,
  PlayerInfo,
  StoryInfo,
  VoteResult,
  ConsensusData
} from './events';

export class ConnectionManager {
  private redisState: RedisStateManager;
  private rateLimiter: WebSocketRateLimiter;

  constructor(redisState: RedisStateManager, rateLimiter: WebSocketRateLimiter) {
    this.redisState = redisState;
    this.rateLimiter = rateLimiter;
  }

  async handleConnection(socket: Socket, io: Server): Promise<void> {
    try {
      const { sessionId, playerId, playerName, avatar } = socket.data;

      // Create connection record
      const connection: SocketConnection = {
        socketId: socket.id,
        sessionId,
        playerId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        isAuthenticated: true
      };

      // Store connection in Redis
      await this.redisState.storeConnection(connection);

      // Join session room
      socket.join(`session:${sessionId}`);

      // Handle player joining/reconnecting
      let player: PlayerInfo | null = null;
      if (playerId) {
        player = await this.handlePlayerReconnection(socket, io, playerId, sessionId);
      } else if (playerName) {
        player = await this.handleNewPlayerJoin(socket, io, playerName, avatar, sessionId);
      }

      // Set up event handlers
      this.attachEventHandlers(socket, io, connection);

      // Get full session data including configuration
      const [sessionState, session] = await Promise.all([
        this.getSessionState(sessionId),
        db.getPrisma().session.findUnique({
          where: { id: sessionId },
          select: { config: true }
        })
      ]);

      const sessionJoinedData = {
        sessionId,
        player: player!,
        players: sessionState.players,
        currentStory: sessionState.currentStory,
        timer: sessionState.timer,
        config: session?.config || {}
      };

      logger.info('Sending SESSION_JOINED with data:', {
        sessionId,
        playerId: player?.id,
        playersCount: sessionState.players.length,
        hasConfig: !!session?.config,
        configData: session?.config,
        fullPayload: sessionJoinedData
      });

      // Send session joined confirmation with full session configuration
      socket.emit(ServerEvents.SESSION_JOINED, sessionJoinedData);

      logger.info('Player connected to session', { 
        socketId: socket.id, 
        sessionId, 
        playerId: player?.id 
      });

    } catch (error) {
      logger.error('Connection handling failed:', error);
      socket.emit(ServerEvents.SESSION_ERROR, {
        error: 'Failed to join session',
        code: 'CONNECTION_FAILED'
      });
      socket.disconnect();
    }
  }

  private async handlePlayerReconnection(
    socket: Socket, 
    _io: Server, 
    playerId: string, 
    sessionId: string
  ): Promise<PlayerInfo> {
    // Get player from database
    const player = await db.getPrisma().player.findUnique({
      where: { id: playerId }
    });

    if (!player || player.sessionId !== sessionId) {
      throw new Error('Player not found in session');
    }

    // Update player as active and last seen
    const updatedPlayer = await db.getPrisma().player.update({
      where: { id: playerId },
      data: { 
        isActive: true,
        lastSeenAt: new Date()
      }
    });

    // Update socket data
    socket.data.playerId = playerId;

    // Mark player as online
    await this.redisState.setPlayerOnline(playerId, socket.id);

    // Get current session state for reconnection
    const sessionState = await this.getSessionState(sessionId);

    // Notify player of reconnection with current state
    socket.emit(ServerEvents.PLAYER_RECONNECTED, {
      player: this.mapPlayerToInfo(updatedPlayer),
      sessionState: {
        players: sessionState.players,
        currentStory: sessionState.currentStory,
        timer: sessionState.timer,
        votesRevealed: sessionState.votesRevealed
      }
    });

    return this.mapPlayerToInfo(updatedPlayer);
  }

  private async handleNewPlayerJoin(
    socket: Socket, 
    _io: Server, 
    playerName: string, 
    avatar: string, 
    sessionId: string
  ): Promise<PlayerInfo> {
    // Check if player name already exists in session
    const existingPlayer = await db.getPrisma().player.findFirst({
      where: { 
        sessionId, 
        name: playerName, 
        isActive: true 
      }
    });

    if (existingPlayer) {
      throw new Error('Player name already exists in session');
    }

    // Create new player
    const newPlayer = await db.getPrisma().player.create({
      data: {
        sessionId,
        name: playerName,
        avatar: avatar || 'avatar-1',
        isSpectator: false,
        isActive: true,
        joinedAt: new Date(),
        lastSeenAt: new Date()
      }
    });

    // Update socket data
    socket.data.playerId = newPlayer.id;

    // Mark player as online
    await this.redisState.setPlayerOnline(newPlayer.id, socket.id);

    // Notify other players
    const playerInfo = this.mapPlayerToInfo(newPlayer);
    const playerCount = await this.getActivePlayerCount(sessionId);
    
    socket.to(`session:${sessionId}`).emit(ServerEvents.PLAYER_JOINED, {
      player: playerInfo,
      playerCount
    });

    return playerInfo;
  }

  private attachEventHandlers(socket: Socket, io: Server, connection: SocketConnection): void {
    // Vote submission
    socket.on(ClientEvents.VOTE_SUBMIT, async (data: ClientEventPayloads[ClientEvents.VOTE_SUBMIT]) => {
      await this.handleVoteSubmit(socket, io, connection, data);
    });

    // Vote change
    socket.on(ClientEvents.VOTE_CHANGE, async (data: ClientEventPayloads[ClientEvents.VOTE_CHANGE]) => {
      await this.handleVoteChange(socket, io, connection, data);
    });

    // Cards reveal
    socket.on(ClientEvents.CARDS_REVEAL, async (data: ClientEventPayloads[ClientEvents.CARDS_REVEAL]) => {
      await this.handleCardsReveal(socket, io, connection, data);
    });

    // Game reset
    socket.on(ClientEvents.GAME_RESET, async (data: ClientEventPayloads[ClientEvents.GAME_RESET]) => {
      await this.handleGameReset(socket, io, connection, data);
    });

    // Story updates
    socket.on(ClientEvents.STORY_UPDATE, async (data: ClientEventPayloads[ClientEvents.STORY_UPDATE]) => {
      await this.handleStoryUpdate(socket, io, connection, data);
    });

    // Story creation
    socket.on(ClientEvents.STORY_CREATE, async (data: ClientEventPayloads[ClientEvents.STORY_CREATE]) => {
      await this.handleStoryCreate(socket, io, connection, data);
    });

    // Story deletion
    socket.on(ClientEvents.STORY_DELETE, async (data: ClientEventPayloads[ClientEvents.STORY_DELETE]) => {
      await this.handleStoryDelete(socket, io, connection, data);
    });

    // Player updates
    socket.on(ClientEvents.PLAYER_UPDATE, async (data: ClientEventPayloads[ClientEvents.PLAYER_UPDATE]) => {
      await this.handlePlayerUpdate(socket, io, connection, data);
    });

    // Timer controls
    socket.on(ClientEvents.TIMER_START, async (data: ClientEventPayloads[ClientEvents.TIMER_START]) => {
      await this.handleTimerStart(socket, io, connection, data);
    });

    socket.on(ClientEvents.TIMER_STOP, async () => {
      await this.handleTimerStop(socket, io, connection);
    });
  }

  private async handleVoteSubmit(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.VOTE_SUBMIT]
  ): Promise<void> {
    try {
      if (!connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Player ID required' });
        return;
      }

      // Create or update vote
      await db.getPrisma().vote.upsert({
        where: {
          storyId_playerId: {
            storyId: data.storyId,
            playerId: connection.playerId
          }
        },
        update: {
          value: data.value,
          confidence: data.confidence
        },
        create: {
          storyId: data.storyId,
          playerId: connection.playerId,
          sessionId: connection.sessionId,
          value: data.value,
          confidence: data.confidence
        }
      });

      // Get vote counts
      const { voteCount, totalPlayers } = await this.getVoteCounts(data.storyId);

      // Notify session
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.VOTE_SUBMITTED, {
        playerId: connection.playerId,
        hasVoted: true,
        voteCount,
        totalPlayers
      });

    } catch (error) {
      logger.error('Vote submit error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to submit vote' });
    }
  }

  private async handleVoteChange(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.VOTE_CHANGE]
  ): Promise<void> {
    // Similar to vote submit but for vote changes
    await this.handleVoteSubmit(socket, io, connection, data);
    
    io.to(`session:${connection.sessionId}`).emit(ServerEvents.VOTE_CHANGED, {
      playerId: connection.playerId!,
      hasVoted: true
    });
  }

  private async handleCardsReveal(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.CARDS_REVEAL]
  ): Promise<void> {
    try {
      // Get all votes for the story
      const votes = await db.getPrisma().vote.findMany({
        where: { storyId: data.storyId },
        include: { player: true }
      });

      const voteResults: VoteResult[] = votes.map(vote => ({
        playerId: vote.playerId,
        playerName: vote.player.name,
        value: vote.value,
        confidence: vote.confidence || undefined
      }));

      // Calculate consensus
      const consensus = this.calculateConsensus(voteResults);

      // Notify session
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.CARDS_REVEALED, {
        storyId: data.storyId,
        votes: voteResults,
        consensus
      });

      // Update session state
      await this.redisState.updateSessionState(connection.sessionId, {
        votesRevealed: true
      });

    } catch (error) {
      logger.error('Cards reveal error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to reveal cards' });
    }
  }

  private async handleGameReset(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.GAME_RESET]
  ): Promise<void> {
    try {
      // Delete all votes for the story
      await db.getPrisma().vote.deleteMany({
        where: { storyId: data.storyId }
      });

      // Notify session
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.GAME_RESET, {
        storyId: data.storyId
      });

      // Update session state
      await this.redisState.updateSessionState(connection.sessionId, {
        votesRevealed: false
      });

    } catch (error) {
      logger.error('Game reset error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to reset game' });
    }
  }

  private async handleStoryUpdate(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.STORY_UPDATE]
  ): Promise<void> {
    try {
      const updatedStory = await db.getPrisma().story.update({
        where: { id: data.storyId },
        data: {
          title: data.title,
          description: data.description,
          finalEstimate: data.finalEstimate
        }
      });

      const storyInfo = this.mapStoryToInfo(updatedStory);
      
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.STORY_UPDATED, {
        story: storyInfo
      });

    } catch (error) {
      logger.error('Story update error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to update story' });
    }
  }

  private async handleStoryCreate(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.STORY_CREATE]
  ): Promise<void> {
    try {
      // Get next order index
      const maxOrder = await db.getPrisma().story.aggregate({
        where: { sessionId: connection.sessionId },
        _max: { orderIndex: true }
      });

      const newStory = await db.getPrisma().story.create({
        data: {
          sessionId: connection.sessionId,
          title: data.title,
          description: data.description,
          orderIndex: data.orderIndex ?? (maxOrder._max.orderIndex || 0) + 1
        }
      });

      const storyInfo = this.mapStoryToInfo(newStory);
      
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.STORY_CREATED, {
        story: storyInfo
      });

    } catch (error) {
      logger.error('Story create error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to create story' });
    }
  }

  private async handleStoryDelete(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.STORY_DELETE]
  ): Promise<void> {
    try {
      await db.getPrisma().story.delete({
        where: { id: data.storyId }
      });

      io.to(`session:${connection.sessionId}`).emit(ServerEvents.STORY_DELETED, {
        storyId: data.storyId
      });

    } catch (error) {
      logger.error('Story delete error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to delete story' });
    }
  }

  private async handlePlayerUpdate(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.PLAYER_UPDATE]
  ): Promise<void> {
    try {
      if (!connection.playerId) return;

      const updatedPlayer = await db.getPrisma().player.update({
        where: { id: connection.playerId },
        data: {
          name: data.name,
          avatar: data.avatar,
          isSpectator: data.isSpectator
        }
      });

      const playerInfo = this.mapPlayerToInfo(updatedPlayer);
      
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.PLAYER_UPDATED, {
        player: playerInfo
      });

    } catch (error) {
      logger.error('Player update error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to update player' });
    }
  }

  private async handleTimerStart(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.TIMER_START]
  ): Promise<void> {
    try {
      const timerState = {
        isRunning: true,
        duration: data.duration,
        remainingTime: data.duration,
        startedAt: new Date()
      };

      await this.redisState.updateSessionState(connection.sessionId, {
        timer: timerState
      });

      io.to(`session:${connection.sessionId}`).emit(ServerEvents.TIMER_UPDATED, {
        timer: timerState
      });

    } catch (error) {
      logger.error('Timer start error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to start timer' });
    }
  }

  private async handleTimerStop(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection
  ): Promise<void> {
    try {
      const timerState = {
        isRunning: false,
        duration: 0,
        remainingTime: 0
      };

      await this.redisState.updateSessionState(connection.sessionId, {
        timer: timerState
      });

      io.to(`session:${connection.sessionId}`).emit(ServerEvents.TIMER_UPDATED, {
        timer: timerState
      });

    } catch (error) {
      logger.error('Timer stop error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to stop timer' });
    }
  }

  async handleDisconnect(socket: Socket, io: Server): Promise<void> {
    try {
      const connection = await this.redisState.getConnection(socket.id);
      if (!connection) return;

      // Remove connection from Redis
      await this.redisState.removeConnection(socket.id);

      // Update player as offline if no other connections
      if (connection.playerId) {
        const isStillOnline = await this.redisState.isPlayerOnline(connection.playerId);
        if (!isStillOnline) {
          await db.getPrisma().player.update({
            where: { id: connection.playerId },
            data: { lastSeenAt: new Date() }
          });

          // Notify session
          const playerCount = await this.getActivePlayerCount(connection.sessionId);
          io.to(`session:${connection.sessionId}`).emit(ServerEvents.PLAYER_LEFT, {
            playerId: connection.playerId,
            playerCount
          });
        }
      }

      // Clean up rate limits
      await this.rateLimiter.reset(socket.id);

    } catch (error) {
      logger.error('Disconnect handling error:', error);
    }
  }

  // Helper methods
  private mapPlayerToInfo(player: { 
    id: string; 
    name: string; 
    avatar: string; 
    isSpectator: boolean; 
    isActive: boolean; 
    joinedAt: Date; 
    lastSeenAt: Date; 
  }): PlayerInfo {
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isSpectator: player.isSpectator,
      isActive: player.isActive,
      joinedAt: player.joinedAt,
      lastSeenAt: player.lastSeenAt
    };
  }

  private mapStoryToInfo(story: { 
    id: string; 
    title: string; 
    description: string | null; 
    finalEstimate: string | null; 
    orderIndex: number; 
    isActive: boolean; 
  }): StoryInfo {
    return {
      id: story.id,
      title: story.title,
      description: story.description || undefined,
      finalEstimate: story.finalEstimate || undefined,
      orderIndex: story.orderIndex,
      isActive: story.isActive
    };
  }

  private async getSessionState(sessionId: string) {
    const [players, stories] = await Promise.all([
      db.getPrisma().player.findMany({
        where: { sessionId, isActive: true }
      }),
      db.getPrisma().story.findMany({
        where: { sessionId, isActive: true },
        orderBy: { orderIndex: 'asc' }
      })
    ]);

    const currentStory = stories.find(s => s.isActive);
    const cachedState = await this.redisState.getSessionState(sessionId);

    return {
      players: players.map(p => this.mapPlayerToInfo(p)),
      currentStory: currentStory ? this.mapStoryToInfo(currentStory) : undefined,
      timer: cachedState?.timer,
      votesRevealed: cachedState?.votesRevealed || false
    };
  }

  private async getVoteCounts(storyId: string) {
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

  private async getActivePlayerCount(sessionId: string): Promise<number> {
    return db.getPrisma().player.count({
      where: { sessionId, isActive: true }
    });
  }

  private calculateConsensus(votes: VoteResult[]): ConsensusData {
    if (votes.length === 0) {
      return { hasConsensus: false };
    }

    const values = votes.map(v => v.value);
    const uniqueValues = [...new Set(values)];
    
    // Check for exact consensus
    if (uniqueValues.length === 1) {
      return {
        hasConsensus: true,
        suggestedValue: uniqueValues[0]
      };
    }

    // Try to calculate numeric consensus
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