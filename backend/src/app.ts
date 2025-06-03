import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { validateContentType } from './middleware/validation';
import healthRoutes from './routes/health';
import websocketRoutes from './routes/websocket';
import sessionRoutes from './routes/sessions';
import playerRoutes from './routes/players';
import votingRoutes from './routes/voting';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Content-Type validation
  app.use(validateContentType);

  // Routes
  app.use('/api', healthRoutes);
  app.use('/api', websocketRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api', playerRoutes);
  app.use('/api', votingRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};