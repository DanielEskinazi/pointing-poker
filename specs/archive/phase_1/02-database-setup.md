# Story 2: Database Setup and Schema

## Summary
Set up PostgreSQL and Redis databases with Docker, create initial schema, and implement database connection management.

## Acceptance Criteria
- [ ] Docker Compose configuration for PostgreSQL and Redis
- [ ] Database connection pooling configured
- [ ] Initial database schema created and migrations set up
- [ ] Redis client configured for caching and pub/sub
- [ ] Database health checks implemented
- [ ] Connection retry logic with exponential backoff
- [ ] Database seeding scripts for development
- [ ] TypeScript types generated from schema

## Technical Details

### Database Technologies
- PostgreSQL 15 for persistent data
- Redis 7 for caching and real-time features
- Prisma ORM or TypeORM for database access
- Database migrations tool configured

### Docker Compose Setup
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: planning_poker
      POSTGRES_USER: ppuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ppuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Initial Database Schema
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  host_id UUID,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(50) NOT NULL,
  is_spectator BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, name)
);

-- Stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  final_estimate VARCHAR(10),
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  value VARCHAR(10) NOT NULL,
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_id, player_id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_active ON sessions(is_active, expires_at);
CREATE INDEX idx_players_session ON players(session_id, is_active);
CREATE INDEX idx_stories_session ON stories(session_id, order_index);
CREATE INDEX idx_votes_story ON votes(story_id);
CREATE INDEX idx_votes_session ON votes(session_id);
```

### Database Connection Manager
```typescript
// src/database/connection.ts
import { Pool } from 'pg';
import Redis from 'ioredis';

export class DatabaseConnection {
  private pgPool: Pool;
  private redisClient: Redis;
  private redisPubClient: Redis;
  private redisSubClient: Redis;

  async initialize() {
    // PostgreSQL connection with retry
    this.pgPool = await this.createPgPool();
    
    // Redis connections
    this.redisClient = await this.createRedisClient('main');
    this.redisPubClient = await this.createRedisClient('pub');
    this.redisSubClient = await this.createRedisClient('sub');
  }

  private async createPgPool(): Promise<Pool> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    await pool.query('SELECT 1');
    return pool;
  }

  private async createRedisClient(name: string): Promise<Redis> {
    const client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      name,
    });

    await client.ping();
    return client;
  }
}
```

## Implementation Steps
1. Create Docker Compose configuration
2. Set up PostgreSQL with initial schema
3. Configure Redis for caching and pub/sub
4. Implement database connection manager
5. Set up ORM (Prisma/TypeORM)
6. Create migration system
7. Add seed data for development
8. Implement connection health checks
9. Test database operations

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 6-8 hours

## Dependencies
- Story 1: Backend API Setup (for integration)

## Testing Requirements
- Database containers start successfully
- Schema creates without errors
- Connections establish with retry logic
- Health checks pass
- Basic CRUD operations work
- Redis pub/sub functions correctly

## Definition of Done
- [ ] Docker Compose runs all services
- [ ] Database schema applied successfully
- [ ] Connection manager handles failures gracefully
- [ ] Migrations system functional
- [ ] Development seeds available
- [ ] All tests passing
- [ ] Documentation updated