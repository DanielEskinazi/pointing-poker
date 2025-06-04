import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

export class SessionController {
  private sessionService = new SessionService();

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, hostName, hostAvatar, password, config } = req.body;
      
      // Create session with host as first player
      const result = await this.sessionService.createSession({
        name,
        password,
        config,
        host: {
          name: hostName,
          avatar: hostAvatar
        }
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.status(201).json(response);
      
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to create session');
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const session = await this.sessionService.getSession(id);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found or has expired'
        });
        return;
      }

      // Don't expose sensitive data in public endpoint
      const sanitizedSession = {
        ...session,
        // Remove any sensitive config if needed in the future
      };

      const response: ApiResponse = {
        success: true,
        data: sanitizedSession
      };

      res.json(response);
      
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to retrieve session');
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const session = await this.sessionService.updateSession(id, updateData);

      const response: ApiResponse = {
        success: true,
        data: session
      };

      res.json(response);
      
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to update session');
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.sessionService.deleteSession(id);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Session deleted successfully' }
      };

      res.json(response);
      
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to delete session');
    }
  };

  join = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      const { playerName, avatar, password, asSpectator } = req.body;

      const result = await this.sessionService.joinSession(sessionId, {
        name: playerName,
        avatar,
        password,
        isSpectator: asSpectator
      });

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
      
    } catch (error) {
      this.handleJoinError(error as Error, res);
    }
  };

  private handleError(error: Error, res: Response, defaultMessage: string): void {
    logger.error(defaultMessage, { error: error.message, stack: error.stack });
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: (error as any).details
      });
      return;
    }

    if (error.message === 'Session not found') {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: defaultMessage
    });
  }

  private handleJoinError(error: Error, res: Response): void {
    logger.error('Failed to join session', { error: error.message });

    const errorMessage = error.message;

    if (errorMessage === 'Session not found or inactive') {
      res.status(404).json({
        success: false,
        error: 'Session not found or inactive'
      });
      return;
    }

    if (errorMessage === 'Session has expired') {
      res.status(410).json({
        success: false,
        error: 'Session has expired'
      });
      return;
    }

    if (errorMessage === 'Invalid password' || errorMessage === 'Password required') {
      res.status(401).json({
        success: false,
        error: errorMessage
      });
      return;
    }

    if (errorMessage === 'Name already taken') {
      res.status(409).json({
        success: false,
        error: 'Player name already taken'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to join session'
    });
  }
}