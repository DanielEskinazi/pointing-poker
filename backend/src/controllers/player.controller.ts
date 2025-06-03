import { Request, Response } from 'express';
import { PlayerService } from '../services/player.service';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

export class PlayerController {
  private playerService = new PlayerService();

  getSessionPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const players = await this.playerService.getSessionPlayers(sessionId);
      
      const response: ApiResponse = {
        success: true,
        data: players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isSpectator: p.isSpectator,
          isActive: p.isActive,
          hasVoted: p.currentVote !== null,
          lastSeenAt: p.lastSeenAt
        }))
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to get session players');
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, avatar, isSpectator } = req.body;
      
      // Verify player owns this ID
      if (req.user?.playerId !== id) {
        res.status(403).json({
          success: false,
          error: 'Cannot update other players'
        });
        return;
      }

      const updated = await this.playerService.updatePlayer(id, {
        name,
        avatar,
        isSpectator
      });

      const response: ApiResponse = {
        success: true,
        data: updated
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to update player');
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      await this.playerService.removePlayer(id);
      
      const response: ApiResponse = {
        success: true,
        data: { message: 'Player removed' }
      };

      res.json(response);
    } catch (error) {
      this.handleError(error, res, 'Failed to remove player');
    }
  };

  private handleError(error: any, res: Response, defaultMessage: string): void {
    logger.error(defaultMessage, { error: error.message, stack: error.stack });
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details
      });
      return;
    }

    if (error.message === 'Player not found') {
      res.status(404).json({
        success: false,
        error: 'Player not found'
      });
      return;
    }

    if (error.message === 'Name already taken') {
      res.status(409).json({
        success: false,
        error: 'Player name already taken'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: defaultMessage
    });
  }
}