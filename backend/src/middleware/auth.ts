import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth';
import { TokenPayload } from '../types/api';
import { db } from '../database';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}


export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication token required'
      });
      return;
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Verify session and player still exist
    const session = await db.getPrisma().session.findUnique({
      where: { id: payload.sessionId, isActive: true },
      include: { players: true }
    });

    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Session no longer exists'
      });
      return;
    }

    const player = session.players.find(p => p.id === payload.playerId && p.isActive);
    
    if (!player) {
      res.status(401).json({
        success: false,
        error: 'Player no longer exists in session'
      });
      return;
    }

    // Add user to request
    req.user = payload;
    next();
    
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

export async function authorizeHost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!req.user.isHost) {
      res.status(403).json({
        success: false,
        error: 'Host authorization required'
      });
      return;
    }

    // Verify the user is still the host of the session
    const sessionId = req.params.id || req.params.sessionId || req.user.sessionId;
    
    logger.debug('Host authorization check', {
      route: req.route?.path,
      paramId: req.params.id,
      paramSessionId: req.params.sessionId,
      userSessionId: req.user.sessionId,
      resolvedSessionId: sessionId,
      userId: req.user.playerId,
      userIsHost: req.user.isHost
    });
    
    const session = await db.getPrisma().session.findUnique({
      where: { id: sessionId, isActive: true }
    });

    if (!session) {
      logger.warn('Session not found during host authorization', { sessionId });
      res.status(403).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    if (session.hostId !== req.user.playerId) {
      logger.warn('User is not the host of the session', {
        sessionId,
        sessionHostId: session.hostId,
        userId: req.user.playerId
      });
      res.status(403).json({
        success: false,
        error: 'Not authorized to perform this action'
      });
      return;
    }

    next();
    
  } catch (error) {
    logger.error('Authorization middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
}

export async function authorizeVoter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Check if player is a spectator
    const player = await db.getPrisma().player.findUnique({
      where: { id: req.user.playerId },
      select: { isSpectator: true, isActive: true }
    });

    if (!player || !player.isActive) {
      res.status(403).json({
        success: false,
        error: 'Player not found or inactive'
      });
      return;
    }

    if (player.isSpectator) {
      res.status(403).json({
        success: false,
        error: 'Spectators cannot vote'
      });
      return;
    }

    next();
    
  } catch (error) {
    logger.error('Authorization middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
}

export async function authorizePlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const playerId = req.params.id;
    
    // Check if player is trying to modify their own data
    if (req.user.playerId !== playerId) {
      res.status(403).json({
        success: false,
        error: 'Can only modify your own player data'
      });
      return;
    }

    next();
    
  } catch (error) {
    logger.error('Authorization middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  
  next();
}