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
import { TimerService } from '../services/timer.service';

export class ConnectionManager {
  private redisState: RedisStateManager;
  private rateLimiter: WebSocketRateLimiter;
  private timerService: TimerService;

  constructor(redisState: RedisStateManager, rateLimiter: WebSocketRateLimiter) {
    this.redisState = redisState;
    this.rateLimiter = rateLimiter;
    this.timerService = TimerService.getInstance(redisState);
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
        stories: sessionState.stories,
        currentStory: sessionState.currentStory,
        timer: sessionState.timer,
        config: session?.config || {}
      };

      logger.info('Sending SESSION_JOINED with data:', {
        sessionId,
        playerId: player?.id,
        playersCount: sessionState.players.length,
        storiesCount: sessionState.stories.length,
        hasConfig: !!session?.config,
        configData: session?.config,
        stories: sessionState.stories.map(s => ({ id: s.id, title: s.title, isActive: s.isActive })),
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

    // Update player as active and last seen, and get session host
    const [updatedPlayer, session] = await Promise.all([
      db.getPrisma().player.update({
        where: { id: playerId },
        data: { 
          isActive: true,
          lastSeenAt: new Date()
        }
      }),
      db.getPrisma().session.findUnique({
        where: { id: sessionId },
        select: { hostId: true }
      })
    ]);

    // Update socket data
    socket.data.playerId = playerId;

    // Mark player as online
    await this.redisState.setPlayerOnline(playerId, socket.id);

    // Get current session state for reconnection
    const sessionState = await this.getSessionState(sessionId);

    // Notify player of reconnection with current state
    socket.emit(ServerEvents.PLAYER_RECONNECTED, {
      player: this.mapPlayerToInfo(updatedPlayer, session?.hostId),
      sessionState: {
        players: sessionState.players,
        currentStory: sessionState.currentStory,
        timer: sessionState.timer,
        votesRevealed: sessionState.votesRevealed
      }
    });

    return this.mapPlayerToInfo(updatedPlayer, session?.hostId);
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

    // Create new player and get session host
    const [newPlayer, session] = await Promise.all([
      db.getPrisma().player.create({
        data: {
          sessionId,
          name: playerName,
          avatar: avatar || 'avatar-1',
          isSpectator: false,
          isActive: true,
          joinedAt: new Date(),
          lastSeenAt: new Date()
        }
      }),
      db.getPrisma().session.findUnique({
        where: { id: sessionId },
        select: { hostId: true }
      })
    ]);

    // Update socket data
    socket.data.playerId = newPlayer.id;

    // Mark player as online
    await this.redisState.setPlayerOnline(newPlayer.id, socket.id);

    // Notify other players
    const playerInfo = this.mapPlayerToInfo(newPlayer, session?.hostId);
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

    // Story activation
    socket.on(ClientEvents.STORY_ACTIVATE, async (data: ClientEventPayloads[ClientEvents.STORY_ACTIVATE]) => {
      await this.handleStoryActivate(socket, io, connection, data);
    });

    // Player updates
    socket.on(ClientEvents.PLAYER_UPDATE, async (data: ClientEventPayloads[ClientEvents.PLAYER_UPDATE]) => {
      await this.handlePlayerUpdate(socket, io, connection, data);
    });

    // Player removal (host only)
    socket.on(ClientEvents.PLAYER_REMOVE, async (data: ClientEventPayloads[ClientEvents.PLAYER_REMOVE]) => {
      await this.handlePlayerRemove(socket, io, connection, data);
    });

    // Player promotion (host only)
    socket.on(ClientEvents.PLAYER_PROMOTE, async (data: ClientEventPayloads[ClientEvents.PLAYER_PROMOTE]) => {
      await this.handlePlayerPromote(socket, io, connection, data);
    });

    // Player activity heartbeat
    socket.on(ClientEvents.PLAYER_ACTIVITY, async () => {
      await this.handlePlayerActivity(socket, io, connection);
    });

    // Timer controls
    socket.on(ClientEvents.TIMER_START, async (data: ClientEventPayloads[ClientEvents.TIMER_START]) => {
      await this.handleTimerStart(socket, io, connection, data);
    });

    socket.on(ClientEvents.TIMER_STOP, async () => {
      await this.handleTimerStop(socket, io, connection);
    });

    socket.on(ClientEvents.TIMER_PAUSE, async () => {
      await this.handleTimerPause(socket, io, connection);
    });

    socket.on(ClientEvents.TIMER_RESUME, async () => {
      await this.handleTimerResume(socket, io, connection);
    });

    socket.on(ClientEvents.TIMER_RESET, async () => {
      await this.handleTimerReset(socket, io, connection);
    });

    socket.on(ClientEvents.TIMER_ADD_TIME, async (data: ClientEventPayloads[ClientEvents.TIMER_ADD_TIME]) => {
      await this.handleTimerAddTime(socket, io, connection, data);
    });

    socket.on(ClientEvents.TIMER_ADJUST, async (data: ClientEventPayloads[ClientEvents.TIMER_ADJUST]) => {
      await this.handleTimerAdjust(socket, io, connection, data);
    });

    socket.on(ClientEvents.TIMER_CONFIGURE, async (data: ClientEventPayloads[ClientEvents.TIMER_CONFIGURE]) => {
      await this.handleTimerConfigure(socket, io, connection, data);
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

  private async handleStoryActivate(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.STORY_ACTIVATE]
  ): Promise<void> {
    try {
      // Get the currently active story before deactivating it
      const previousActiveStory = await db.getPrisma().story.findFirst({
        where: {
          sessionId: connection.sessionId,
          isActive: true
        }
      });

      // Deactivate all stories in session
      await db.getPrisma().story.updateMany({
        where: {
          sessionId: connection.sessionId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      // Activate the selected story
      const updatedStory = await db.getPrisma().story.update({
        where: { id: data.storyId },
        data: { isActive: true }
      });

      const storyInfo = this.mapStoryToInfo(updatedStory);

      io.to(`session:${connection.sessionId}`).emit(ServerEvents.STORY_ACTIVATED, {
        story: storyInfo,
        previousActiveStoryId: previousActiveStory?.id
      });

    } catch (error) {
      logger.error('Story activate error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to activate story' });
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

      const [updatedPlayer, session] = await Promise.all([
        db.getPrisma().player.update({
          where: { id: connection.playerId },
          data: {
            name: data.name,
            avatar: data.avatar,
            isSpectator: data.isSpectator
          }
        }),
        db.getPrisma().session.findUnique({
          where: { id: connection.sessionId },
          select: { hostId: true }
        })
      ]);

      const playerInfo = this.mapPlayerToInfo(updatedPlayer, session?.hostId);
      
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
    _io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.TIMER_START]
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.startTimer(
        connection.sessionId, 
        data.duration, 
        data.mode || 'countdown'
      );

      // Timer service will emit timer:updated event, but we also update session state
      await this.redisState.updateSessionState(connection.sessionId, {
        timer: timerState
      });

    } catch (error) {
      logger.error('Timer start error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to start timer' });
    }
  }

  private async handleTimerStop(
    socket: Socket, 
    _io: Server, 
    connection: SocketConnection
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.stopTimer(connection.sessionId);
      
      if (timerState) {
        await this.redisState.updateSessionState(connection.sessionId, {
          timer: timerState
        });
      }

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

  private async handlePlayerRemove(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.PLAYER_REMOVE]
  ): Promise<void> {
    try {
      const { sessionId, playerId } = connection;
      const { playerId: targetPlayerId } = data;

      if (!playerId) {
        socket.emit(ServerEvents.SESSION_ERROR, {
          error: 'Player ID required for player removal'
        });
        return;
      }

      // Check if current player is host
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId }
      });

      if (session?.hostId !== playerId) {
        socket.emit(ServerEvents.SESSION_ERROR, {
          error: 'Only session host can remove players'
        });
        return;
      }

      if (targetPlayerId === playerId) {
        socket.emit(ServerEvents.SESSION_ERROR, {
          error: 'Cannot remove yourself as host'
        });
        return;
      }

      // Remove the player
      await db.getPrisma().player.update({
        where: { id: targetPlayerId },
        data: { isActive: false }
      });

      // Remove from online players
      await this.redisState.setPlayerOffline(targetPlayerId);

      // Get updated player count
      const playerCount = await this.getActivePlayerCount(sessionId);

      // Notify all players in session
      io.to(`session:${sessionId}`).emit(ServerEvents.PLAYER_REMOVED, {
        playerId: targetPlayerId,
        removedBy: playerId,
        playerCount
      });

      // Disconnect the removed player
      const targetSockets = await this.redisState.getPlayerSockets(targetPlayerId);
      for (const socketId of targetSockets) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          targetSocket.emit(ServerEvents.SESSION_ERROR, {
            error: 'You have been removed from the session',
            code: 'PLAYER_REMOVED'
          });
          targetSocket.disconnect();
        }
      }

      logger.info('Player removed from session', {
        sessionId,
        removedPlayerId: targetPlayerId,
        removedBy: playerId
      });

    } catch (error) {
      logger.error('Player removal failed:', error);
      socket.emit(ServerEvents.SESSION_ERROR, {
        error: 'Failed to remove player'
      });
    }
  }

  private async handlePlayerPromote(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.PLAYER_PROMOTE]
  ): Promise<void> {
    try {
      const { sessionId, playerId } = connection;
      const { playerId: targetPlayerId } = data;

      if (!playerId) {
        socket.emit(ServerEvents.SESSION_ERROR, {
          error: 'Player ID required for player promotion'
        });
        return;
      }

      // Check if current player is host
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId }
      });

      if (session?.hostId !== playerId) {
        socket.emit(ServerEvents.SESSION_ERROR, {
          error: 'Only session host can promote players'
        });
        return;
      }

      // Get players info
      const [newHost, previousHost] = await Promise.all([
        db.getPrisma().player.findUnique({
          where: { id: targetPlayerId }
        }),
        db.getPrisma().player.findUnique({
          where: { id: playerId }
        })
      ]);

      if (!newHost || newHost.sessionId !== sessionId) {
        socket.emit(ServerEvents.SESSION_ERROR, {
          error: 'Target player not found in session'
        });
        return;
      }

      // Update session host
      await db.getPrisma().session.update({
        where: { id: sessionId },
        data: { hostId: targetPlayerId }
      });

      // Notify all players in session
      io.to(`session:${sessionId}`).emit(ServerEvents.PLAYER_PROMOTED, {
        newHost: this.mapPlayerToInfo(newHost, newHost.id), // newHost is now the host
        previousHost: previousHost ? this.mapPlayerToInfo(previousHost) : undefined // previousHost is no longer host
      });

      logger.info('Player promoted to host', {
        sessionId,
        newHostId: targetPlayerId,
        previousHostId: playerId
      });

    } catch (error) {
      logger.error('Player promotion failed:', error);
      socket.emit(ServerEvents.SESSION_ERROR, {
        error: 'Failed to promote player'
      });
    }
  }

  private async handlePlayerActivity(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection
  ): Promise<void> {
    try {
      const { playerId } = connection;

      if (!playerId) {
        return;
      }

      // Update last seen timestamp
      const updatedPlayer = await db.getPrisma().player.update({
        where: { id: playerId },
        data: { lastSeenAt: new Date() }
      });

      // Update connection activity
      await this.redisState.updateConnectionActivity(socket.id);

      // Check if player status changed (online/offline)
      const isOnline = new Date().getTime() - (updatedPlayer.lastSeenAt?.getTime() ?? new Date().getTime()) < 5 * 60 * 1000;

      // Broadcast status change to session
      io.to(`session:${connection.sessionId}`).emit(ServerEvents.PLAYER_STATUS_CHANGED, {
        playerId,
        isOnline,
        lastSeenAt: updatedPlayer.lastSeenAt
      });

    } catch (error) {
      logger.error('Player activity update failed:', error);
      // Don't emit error for activity updates as they're not critical
    }
  }

  // Helper methods
  private mapPlayerToInfo(player: { 
    id: string; 
    name: string; 
    avatar: string; 
    isSpectator: boolean | null; 
    isActive: boolean | null; 
    joinedAt: Date | null; 
    lastSeenAt: Date | null; 
  }, hostId?: string | null): PlayerInfo {
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isSpectator: player.isSpectator ?? false,
      isActive: player.isActive ?? true,
      isHost: hostId ? player.id === hostId : false,
      joinedAt: player.joinedAt ?? new Date(),
      lastSeenAt: player.lastSeenAt ?? new Date()
    };
  }

  private mapStoryToInfo(story: { 
    id: string; 
    title: string; 
    description: string | null; 
    finalEstimate: string | null; 
    orderIndex: number; 
    isActive: boolean | null; 
  }): StoryInfo {
    return {
      id: story.id,
      title: story.title,
      description: story.description || undefined,
      finalEstimate: story.finalEstimate || undefined,
      orderIndex: story.orderIndex,
      isActive: story.isActive ?? true
    };
  }

  private async getSessionState(sessionId: string) {
    const [players, stories, session] = await Promise.all([
      db.getPrisma().player.findMany({
        where: { sessionId, isActive: true }
      }),
      db.getPrisma().story.findMany({
        where: { sessionId },
        orderBy: { orderIndex: 'asc' }
      }),
      db.getPrisma().session.findUnique({
        where: { id: sessionId },
        select: { hostId: true }
      })
    ]);

    const currentStory = stories.find(s => s.isActive);
    const cachedState = await this.redisState.getSessionState(sessionId);

    // Ensure timer state is loaded and cached
    let timerState = cachedState?.timer;
    if (!timerState) {
      timerState = await this.timerService.loadTimerState(sessionId) || undefined;
    }

    return {
      players: players.map(p => this.mapPlayerToInfo(p, session?.hostId)),
      stories: stories.map(s => this.mapStoryToInfo(s)),
      currentStory: currentStory ? this.mapStoryToInfo(currentStory) : undefined,
      timer: timerState,
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

  private async handleTimerPause(
    socket: Socket, 
    _io: Server, 
    connection: SocketConnection
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.pauseTimer(connection.sessionId);
      
      if (timerState) {
        await this.redisState.updateSessionState(connection.sessionId, {
          timer: timerState
        });
      }

    } catch (error) {
      logger.error('Timer pause error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to pause timer' });
    }
  }

  private async handleTimerResume(
    socket: Socket, 
    _io: Server, 
    connection: SocketConnection
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.resumeTimer(connection.sessionId);
      
      if (timerState) {
        await this.redisState.updateSessionState(connection.sessionId, {
          timer: timerState
        });
      }

    } catch (error) {
      logger.error('Timer resume error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to resume timer' });
    }
  }

  private async handleTimerReset(
    socket: Socket, 
    _io: Server, 
    connection: SocketConnection
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.resetTimer(connection.sessionId);
      
      if (timerState) {
        await this.redisState.updateSessionState(connection.sessionId, {
          timer: timerState
        });
      }

    } catch (error) {
      logger.error('Timer reset error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to reset timer' });
    }
  }

  private async handleTimerAddTime(
    socket: Socket, 
    _io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.TIMER_ADD_TIME]
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.addTime(connection.sessionId, data.seconds);
      
      if (timerState) {
        await this.redisState.updateSessionState(connection.sessionId, {
          timer: timerState
        });
      }

    } catch (error) {
      logger.error('Timer add time error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to add time to timer' });
    }
  }

  private async handleTimerAdjust(
    socket: Socket, 
    io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.TIMER_ADJUST]
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (!session || session.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only the host can adjust the timer' });
        return;
      }

      // Rate limiting check
      const rateLimitResult = await this.rateLimiter.check(connection.socketId, ClientEvents.TIMER_ADJUST);
      if (!rateLimitResult.allowed) {
        socket.emit(ServerEvents.RATE_LIMIT_EXCEEDED, { 
          event: 'timer:adjust', 
          retryAfter: rateLimitResult.retryAfter || 10 
        });
        return;
      }

      // Adjust timer
      const updatedTimer = await this.timerService.adjustTimer(connection.sessionId, data.adjustmentSeconds);
      
      if (updatedTimer) {
        // Broadcast to all session members
        io.to(`session:${connection.sessionId}`).emit(ServerEvents.TIMER_UPDATED, {
          timer: updatedTimer
        });

        logger.info('Timer adjusted', { 
          sessionId: connection.sessionId,
          playerId: connection.playerId,
          adjustmentSeconds: data.adjustmentSeconds,
          newTimeRemaining: updatedTimer.remainingTime
        });
      }

    } catch (error) {
      logger.error('Timer adjust error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to adjust timer' });
    }
  }

  private async handleTimerConfigure(
    socket: Socket, 
    _io: Server, 
    connection: SocketConnection, 
    data: ClientEventPayloads[ClientEvents.TIMER_CONFIGURE]
  ): Promise<void> {
    try {
      // Check if user is host (only host can control timer)
      const session = await db.getPrisma().session.findUnique({
        where: { id: connection.sessionId },
        select: { hostId: true }
      });

      if (session?.hostId !== connection.playerId) {
        socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Only host can control timer' });
        return;
      }

      const timerState = await this.timerService.configureTimer(connection.sessionId, data.settings);
      
      if (timerState) {
        await this.redisState.updateSessionState(connection.sessionId, {
          timer: timerState
        });
      }

    } catch (error) {
      logger.error('Timer configure error:', error);
      socket.emit(ServerEvents.CONNECTION_ERROR, { error: 'Failed to configure timer' });
    }
  }
}