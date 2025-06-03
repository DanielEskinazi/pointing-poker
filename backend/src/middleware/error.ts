import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
  });
};

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const { statusCode = 500, message } = err;

  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    statusCode,
  });

  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : message,
  });
};