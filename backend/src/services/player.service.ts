import { db } from '../database';
import { logger } from '../utils/logger';
import type { Player } from '@prisma/client';

export interface UpdatePlayerDto {
  name?: string;
  avatar?: string;
  isSpectator?: boolean;
}

export interface PlayerWithVote {
  id: string;
  name: string;
  avatar: string;
  isSpectator: boolean;
  isActive: boolean;
  isHost: boolean;
  isOnline: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  currentVote: string | null;
  votedInCurrentRound: boolean;
}

export class PlayerService {

  async getSessionPlayers(sessionId: string): Promise<PlayerWithVote[]> {
    try {
      const session = await db.getPrisma().session.findUnique({
        where: { id: sessionId },
        select: { hostId: true }
      });

      const players = await db.getPrisma().player.findMany({
        where: {
          sessionId,
          isActive: true
        },
        include: {
          votes: {
            include: {
              story: true
            },
            where: {
              story: {
                isActive: true
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          joinedAt: 'asc'
        }
      });

      const now = new Date();
      const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

      return players.map(player => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isSpectator: player.isSpectator ?? false,
        isActive: player.isActive ?? true,
        isHost: session?.hostId === player.id,
        isOnline: now.getTime() - (player.lastSeenAt?.getTime() ?? now.getTime()) < ONLINE_THRESHOLD,
        joinedAt: player.joinedAt ?? new Date(),
        lastSeenAt: player.lastSeenAt ?? new Date(),
        currentVote: player.votes.length > 0 ? player.votes[0].value : null,
        votedInCurrentRound: player.votes.length > 0
      }));
    } catch (error) {
      logger.error('Failed to get session players:', error);
      throw new Error('Failed to retrieve session players');
    }
  }

  async updatePlayer(playerId: string, data: UpdatePlayerDto) {
    try {
      // Check if name is being changed and if it's already taken
      if (data.name) {
        const player = await db.getPrisma().player.findUnique({
          where: { id: playerId },
          include: { session: true }
        });

        if (!player) {
          throw new Error('Player not found');
        }

        const existingPlayer = await db.getPrisma().player.findFirst({
          where: {
            sessionId: player.sessionId,
            name: data.name,
            isActive: true,
            id: { not: playerId }
          }
        });

        if (existingPlayer) {
          throw new Error('Name already taken');
        }
      }

      const updatedPlayer = await db.getPrisma().player.update({
        where: { id: playerId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.avatar && { avatar: data.avatar }),
          ...(typeof data.isSpectator === 'boolean' && { isSpectator: data.isSpectator }),
          lastSeenAt: new Date()
        }
      });

      logger.info('Player updated successfully', { playerId });

      return {
        id: updatedPlayer.id,
        name: updatedPlayer.name,
        avatar: updatedPlayer.avatar,
        isSpectator: updatedPlayer.isSpectator,
        isActive: updatedPlayer.isActive,
        lastSeenAt: updatedPlayer.lastSeenAt
      };
    } catch (error) {
      logger.error('Failed to update player:', error);
      throw error;
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    try {
      const player = await db.getPrisma().player.findUnique({
        where: { id: playerId },
        include: { session: true }
      });

      if (!player) {
        throw new Error('Player not found');
      }

      // Don't allow removing the host
      if (player.session.hostId === playerId) {
        throw new Error('Cannot remove session host');
      }

      // Soft delete by setting isActive to false
      await db.getPrisma().player.update({
        where: { id: playerId },
        data: { isActive: false }
      });

      logger.info('Player removed successfully', { playerId, sessionId: player.sessionId });
    } catch (error) {
      logger.error('Failed to remove player:', error);
      throw error;
    }
  }

  async isPlayerSpectator(playerId: string): Promise<boolean> {
    try {
      const player = await db.getPrisma().player.findUnique({
        where: { id: playerId },
        select: { isSpectator: true }
      });

      return player?.isSpectator || false;
    } catch (error) {
      logger.error('Failed to check if player is spectator:', error);
      return false;
    }
  }

  async updateLastSeen(playerId: string): Promise<void> {
    try {
      await db.getPrisma().player.update({
        where: { id: playerId },
        data: { lastSeenAt: new Date() }
      });
    } catch (error) {
      logger.error('Failed to update player last seen:', error);
      // Don't throw here as this is not critical
    }
  }

  async canRemovePlayer(currentPlayerId: string, targetPlayerId: string): Promise<boolean> {
    try {
      const currentPlayer = await db.getPrisma().player.findUnique({
        where: { id: currentPlayerId },
        include: { session: true }
      });

      return currentPlayer?.session.hostId === currentPlayerId && 
             currentPlayerId !== targetPlayerId;
    } catch (error) {
      logger.error('Failed to check if player can be removed:', error);
      return false;
    }
  }

  async canPromotePlayer(currentPlayerId: string): Promise<boolean> {
    try {
      const currentPlayer = await db.getPrisma().player.findUnique({
        where: { id: currentPlayerId },
        include: { session: true }
      });

      return currentPlayer?.session.hostId === currentPlayerId;
    } catch (error) {
      logger.error('Failed to check if player can be promoted:', error);
      return false;
    }
  }

  async promoteToHost(playerId: string): Promise<{ newHost: Player | null; previousHost: Player | null }> {
    try {
      const player = await db.getPrisma().player.findUnique({
        where: { id: playerId },
        include: { session: true }
      });

      if (!player) {
        throw new Error('Player not found');
      }

      const previousHostId = player.session.hostId;

      // Update session to set new host
      await db.getPrisma().session.update({
        where: { id: player.sessionId },
        data: { hostId: playerId }
      });

      // Get the updated data
      const newHost = await db.getPrisma().player.findUnique({
        where: { id: playerId }
      });

      const previousHost = previousHostId ? await db.getPrisma().player.findUnique({
        where: { id: previousHostId }
      }) : null;

      logger.info('Player promoted to host successfully', { 
        playerId, 
        sessionId: player.sessionId,
        previousHostId 
      });

      return { newHost, previousHost };
    } catch (error) {
      logger.error('Failed to promote player to host:', error);
      throw error;
    }
  }

  async autoPromoteHost(sessionId: string): Promise<string | null> {
    try {
      const oldestPlayer = await db.getPrisma().player.findFirst({
        where: {
          sessionId,
          isActive: true
        },
        orderBy: {
          joinedAt: 'asc'
        }
      });

      if (!oldestPlayer) {
        return null;
      }

      await db.getPrisma().session.update({
        where: { id: sessionId },
        data: { hostId: oldestPlayer.id }
      });

      logger.info('Auto-promoted player to host', { 
        playerId: oldestPlayer.id, 
        sessionId 
      });

      return oldestPlayer.id;
    } catch (error) {
      logger.error('Failed to auto-promote host:', error);
      return null;
    }
  }
}