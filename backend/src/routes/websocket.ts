import { Router, Request, Response } from 'express';
import { WebSocketServer } from '../websocket';

const router = Router();

// This will be injected when the WebSocket server is created
let wsServer: WebSocketServer;

export const setWebSocketServer = (server: WebSocketServer): void => {
  wsServer = server;
};

router.get('/websocket/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!wsServer) {
      res.status(503).json({
        error: 'WebSocket server not initialized'
      });
      return;
    }

    const stats = await wsServer.getStats();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      websocket: {
        server: {
          connectedSockets: stats.connectedSockets,
          totalRooms: stats.totalRooms
        },
        redis: stats.redisStats
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get WebSocket stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/websocket/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!wsServer) {
      res.status(503).json({
        status: 'down',
        error: 'WebSocket server not initialized'
      });
      return;
    }

    const stats = await wsServer.getStats();
    const isHealthy = stats.connectedSockets >= 0; // Basic health check
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'up' : 'down',
      connectedSockets: stats.connectedSockets,
      activeSessions: stats.redisStats.activeSessions,
      onlinePlayers: stats.redisStats.onlinePlayers
    });
  } catch (error) {
    res.status(503).json({
      status: 'down',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;