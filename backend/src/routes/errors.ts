import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

interface ClientError {
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  sessionId?: string;
  playerId?: string;
  level: 'error' | 'warn' | 'info';
}

router.post('/errors', (req, res) => {
  try {
    const errors: ClientError[] = Array.isArray(req.body) ? req.body : [req.body];
    
    errors.forEach((error) => {
      const logData = {
        type: 'client-error',
        message: error.message,
        stack: error.stack,
        userAgent: error.userAgent,
        url: error.url,
        timestamp: error.timestamp,
        sessionId: error.sessionId,
        playerId: error.playerId,
        ip: req.ip,
      };

      switch (error.level) {
        case 'error':
          logger.error('Client error reported', logData);
          break;
        case 'warn':
          logger.warn('Client warning reported', logData);
          break;
        case 'info':
          logger.info('Client info reported', logData);
          break;
        default:
          logger.error('Client error reported', logData);
      }
    });

    res.status(200).json({ success: true, logged: errors.length });
  } catch (err) {
    logger.error('Failed to process client error reports', { error: err });
    res.status(500).json({ success: false, error: 'Failed to log errors' });
  }
});

export default router;