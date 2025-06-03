import { db } from '../database';
import { logger } from '../utils/logger';

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
  lastSeenAt: Date;
  currentVote: string | null;
}

export class PlayerService {

  async getSessionPlayers(sessionId: string): Promise<PlayerWithVote[]> {
    try {
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

      return players.map(player => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        isSpectator: player.isSpectator,
        isActive: player.isActive,
        lastSeenAt: player.lastSeenAt,
        currentVote: player.votes.length > 0 ? player.votes[0].value : null
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
}