# Database Setup

This directory contains the database configuration and setup files for the Planning Poker application.

## Architecture

- **PostgreSQL 15**: Primary database for persistent data storage
- **Redis 7**: Caching and pub/sub for real-time features
- **Prisma**: ORM for type-safe database operations
- **Docker Compose**: Containerized database services

## Quick Start

1. **Start database services:**
   ```bash
   npm run docker:up
   ```

2. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

3. **Push schema to database:**
   ```bash
   npm run db:push
   ```

4. **Seed development data:**
   ```bash
   npm run db:seed
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start PostgreSQL and Redis containers |
| `npm run docker:down` | Stop and remove containers |
| `npm run docker:logs` | View container logs |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed` | Seed database with development data |
| `npm run db:reset` | Reset database and run migrations |

## Database Schema

### Tables

- **sessions**: Planning poker sessions
- **players**: Session participants
- **stories**: User stories to be estimated
- **votes**: Player votes on stories

### Key Features

- UUID primary keys for all tables
- Proper foreign key relationships with cascade deletes
- Performance indexes on frequently queried columns
- Automatic timestamp tracking with triggers
- JSONB configuration storage for flexibility

## Connection Details

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: planning_poker
- **User**: ppuser
- **Password**: Set via `DB_PASSWORD` env var

### Redis
- **Host**: localhost
- **Port**: 6379
- **Configuration**: Persistence enabled with AOF

## Health Checks

The application includes comprehensive health checks:

- `GET /health` - Overall application health including database status
- `GET /health/db` - Detailed database connection status

## Development Workflow

1. Make schema changes in `prisma/schema.prisma`
2. Generate client: `npm run db:generate`
3. Push to database: `npm run db:push`
4. For production, create migrations: `npm run db:migrate`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `DB_PASSWORD`: Database password for Docker Compose

## Troubleshooting

### Database Connection Issues
1. Ensure Docker containers are running: `docker ps`
2. Check container logs: `npm run docker:logs`
3. Verify environment variables in `.env`
4. Test connection with health endpoint: `curl http://localhost:3001/health/db`

### Schema Issues
1. Reset database: `npm run db:reset`
2. Regenerate client: `npm run db:generate`
3. Re-seed data: `npm run db:seed`

### Performance
- Monitor slow queries in application logs
- Use Prisma Studio to inspect data
- Check database indexes in `init.sql`