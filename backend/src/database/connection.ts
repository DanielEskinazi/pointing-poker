import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private prisma: PrismaClient;
  private redisClient: Redis;
  private redisPubClient: Redis;
  private redisSubClient: Redis;
  private pgPool: Pool | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });

    this.redisClient = this.createRedisClient('main');
    this.redisPubClient = this.createRedisClient('pub');
    this.redisSubClient = this.createRedisClient('sub');
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Test Prisma connection
      await this.prisma.$connect();
      logger.info('Prisma connected to PostgreSQL');

      // Test Redis connections
      await Promise.all([
        this.redisClient.ping(),
        this.redisPubClient.ping(),
        this.redisSubClient.ping(),
      ]);
      logger.info('Redis connections established');

      // Initialize raw PostgreSQL pool for complex queries
      this.pgPool = await this.createPgPool();
      logger.info('PostgreSQL pool created');

      this.retryCount = 0;
    } catch (error) {
      logger.error('Database initialization failed:', error);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
        logger.info(`Retrying database connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.initialize();
      }
      throw error;
    }
  }

  private createRedisClient(name: string): Redis {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis ${name} reconnecting... attempt ${times}`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      name,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      logger.error(`Redis ${name} error:`, err);
    });

    client.on('connect', () => {
      logger.info(`Redis ${name} connected`);
    });

    client.on('ready', () => {
      logger.info(`Redis ${name} ready`);
    });

    return client;
  }

  private async createPgPool(): Promise<Pool> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    // Test connection
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      logger.info('PostgreSQL pool connection test successful');
    } finally {
      client.release();
    }

    return pool;
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.prisma.$disconnect(),
        this.redisClient.quit(),
        this.redisPubClient.quit(),
        this.redisSubClient.quit(),
        this.pgPool?.end(),
      ]);
      logger.info('All database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }

  getRedis(): Redis {
    return this.redisClient;
  }

  getRedisPub(): Redis {
    return this.redisPubClient;
  }

  getRedisSub(): Redis {
    return this.redisSubClient;
  }

  getPgPool(): Pool | null {
    return this.pgPool;
  }

  async healthCheck(): Promise<{
    postgres: boolean;
    redis: boolean;
    details: {
      postgres?: string;
      redis?: string;
    };
  }> {
    const health = {
      postgres: false,
      redis: false,
      details: {} as { postgres?: string; redis?: string },
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.postgres = true;
    } catch (error) {
      health.details.postgres = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      const pong = await this.redisClient.ping();
      health.redis = pong === 'PONG';
    } catch (error) {
      health.details.redis = error instanceof Error ? error.message : 'Unknown error';
    }

    return health;
  }
}

export const db = DatabaseConnection.getInstance();