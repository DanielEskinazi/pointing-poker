import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../utils/logger';

export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        status: 'error',
        message: 'Content-Type must be application/json',
      });
      return;
    }
  }
  next();
};

export function validateRequest(schema: z.ZodSchema<{
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
}>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate the request against the schema
      const validatedData = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query
      });

      // Replace request data with validated and transformed data
      if (validatedData.body) req.body = validatedData.body;
      if (validatedData.params) req.params = validatedData.params;
      if (validatedData.query) {
        // Handle query object property update
        Object.assign(req.query, validatedData.query);
      }

      next();
      
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Request validation failed', { 
          errors: errorDetails, 
          path: req.path,
          method: req.method 
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorDetails
        });
        return;
      }

      logger.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}