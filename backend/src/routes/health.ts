import { Router, Request, Response } from 'express';
import { db } from '../database';

const router = Router();

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await db.healthCheck();
    const isHealthy = dbHealth.postgres && dbHealth.redis;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        database: {
          postgres: {
            status: dbHealth.postgres ? 'up' : 'down',
            error: dbHealth.details.postgres,
          },
          redis: {
            status: dbHealth.redis ? 'up' : 'down',
            error: dbHealth.details.redis,
          },
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/health/db', async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await db.healthCheck();
    res.status(health.postgres && health.redis ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      postgres: false,
      redis: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;