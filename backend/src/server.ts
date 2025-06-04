import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './database';
import { WebSocketServer } from './websocket';
import { setWebSocketServer } from './routes/websocket';
import { setWebSocketServerForSession } from './services/session.service';
import { setWebSocketServerForVoting } from './services/voting.service';

const startServer = async (): Promise<void> => {
  try {
    // Initialize database connections
    logger.info('Initializing database connections...');
    await db.initialize();
    logger.info('Database connections established');

    const app = createApp();

    // Initialize WebSocket server
    logger.info('Initializing WebSocket server...');
    const wsServer = new WebSocketServer();
    await wsServer.initialize(app);
    
    // Inject WebSocket server into routes and services
    setWebSocketServer(wsServer);
    setWebSocketServerForSession(wsServer);
    setWebSocketServerForVoting(wsServer);
    logger.info('WebSocket server initialized');

    // Start the server
    await wsServer.start(config.port);
    logger.info(`Server started with WebSocket support`, {
      port: config.port,
      environment: config.nodeEnv,
    });

    // Graceful shutdown
    const gracefulShutdown = async (): Promise<void> => {
      logger.info('Received shutdown signal, closing server...');
      
      try {
        // Close WebSocket server first
        await wsServer.stop();
        logger.info('WebSocket server closed');
        
        // Close database connections
        await db.disconnect();
        logger.info('Database connections closed');
        
        logger.info('Server closed gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Force shutdown after 10 seconds
    const forceShutdown = (): void => {
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => {
      forceShutdown();
      gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      forceShutdown();
      gracefulShutdown();
    });
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();