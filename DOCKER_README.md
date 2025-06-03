# Docker Setup for Planning Poker

This project uses Docker and Docker Compose for development and production environments.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Make (optional, for using Makefile commands)

## Quick Start

1. Clone the repository
2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
3. Start all services:
   ```bash
   docker-compose up
   # or
   make up
   ```

## Available Services

- **Frontend**: React app on http://localhost:5173
- **Backend**: Node.js API on http://localhost:3001
- **PostgreSQL**: Database on localhost:5432
- **Redis**: Cache/pub-sub on localhost:6379
- **pgAdmin**: Database UI on http://localhost:8080 (debug profile only)
- **Redis Commander**: Redis UI on http://localhost:8081 (debug profile only)

## Common Commands

### Using Docker Compose directly:
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build
```

### Using Make:
```bash
# Start services
make up

# Stop services
make down

# View logs
make logs

# Clean everything
make clean

# Access backend shell
make backend-shell

# Access PostgreSQL
make postgres-shell
```

## Debug Tools

To start with debug tools (pgAdmin and Redis Commander):
```bash
docker-compose --profile debug up -d
# or
make debug-up
```

- pgAdmin: http://localhost:8080
  - Email: admin@planningpoker.local
  - Password: admin
  
- Redis Commander: http://localhost:8081

## Production Mode

Build and run production images:
```bash
# Build production images
make prod-build

# Start production services
make prod-up
```

## Troubleshooting

1. **Port conflicts**: Ensure ports 5173, 3001, 5432, 6379 are not in use
2. **Database connection issues**: Check if PostgreSQL health check is passing
3. **Hot reload not working**: Ensure volume mounts are correct in docker-compose.yml
4. **Permission issues**: Check file ownership and Docker Desktop file sharing settings

## Development Workflow

1. Code changes in `src/` directories are automatically reloaded
2. Database changes require rebuilding: `docker-compose down -v && docker-compose up`
3. Package changes require rebuilding: `docker-compose build`