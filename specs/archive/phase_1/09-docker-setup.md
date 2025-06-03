# Story 9: Docker Development Environment

## Summary
Set up a complete Docker-based development environment for both frontend and backend services, including hot reloading, database initialization, and debugging support.

## Acceptance Criteria
- [ ] Docker Compose configuration for all services
- [ ] Hot reloading for both frontend and backend
- [ ] Database automatically initialized with schema
- [ ] Redis configured and accessible
- [ ] Environment variables properly managed
- [ ] Health checks for all services
- [ ] One-command startup (`docker-compose up`)
- [ ] Debugging support in containers
- [ ] Volume mounts for development

## Technical Details

### Project Structure
```
planning-poker/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── .dockerignore
└── database/
    ├── init.sql
    └── seed.sql
```

### Main Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend React App
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3000/api
      - VITE_WS_URL=ws://localhost:3000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - planning-poker-net
    command: npm run dev -- --host

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "9229:9229" # Debug port
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DATABASE_URL=postgresql://ppuser:pppass@postgres:5432/planning_poker
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-change-in-production
      - CLIENT_URL=http://localhost:5173
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - planning-poker-net
    command: npm run dev

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=ppuser
      - POSTGRES_PASSWORD=pppass
      - POSTGRES_DB=planning_poker
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ppuser -d planning_poker"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - planning-poker-net

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --replica-read-only no
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - planning-poker-net

  # pgAdmin (optional, for database management)
  pgadmin:
    image: dpage/pgadmin4:latest
    ports:
      - "8080:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@planningpoker.local
      - PGADMIN_DEFAULT_PASSWORD=admin
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres
    networks:
      - planning-poker-net
    profiles:
      - debug

  # Redis Commander (optional, for Redis management)
  redis-commander:
    image: rediscommander/redis-commander:latest
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
    depends_on:
      - redis
    networks:
      - planning-poker-net
    profiles:
      - debug

volumes:
  postgres_data:
  redis_data:
  pgadmin_data:

networks:
  planning-poker-net:
    driver: bridge
```

### Frontend Dockerfile (Development)
```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Backend Dockerfile (Development)
```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install development tools
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports
EXPOSE 3000 9229

# Start with debugging enabled
CMD ["npm", "run", "dev:debug"]
```

### Backend Development Scripts
```json
// backend/package.json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts,json --exec 'ts-node' src/server.ts",
    "dev:debug": "nodemon --watch src --ext ts,json --exec 'node --inspect=0.0.0.0:9229 -r ts-node/register' src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Database Initialization Script
```sql
-- database/init.sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database schema
CREATE SCHEMA IF NOT EXISTS app;

-- Switch to app schema
SET search_path TO app, public;

-- Create tables (from Story 2)
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

-- ... (rest of schema from Story 2) ...

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE
  ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Development Seed Data
```sql
-- database/seed.sql
-- Insert test data for development
INSERT INTO app.sessions (id, name, host_id, config, expires_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Test Session 1', 
   '550e8400-e29b-41d4-a716-446655440001', 
   '{"cardValues": ["1", "2", "3", "5", "8", "13", "21"], "timerSeconds": 60}',
   CURRENT_TIMESTAMP + INTERVAL '48 hours');

INSERT INTO app.players (id, session_id, name, avatar)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Test Host', '👨‍💼'),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Test Player', '👩‍💻');
```

### Environment Configuration
```bash
# .env.example
# Frontend
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000

# Backend
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://ppuser:pppass@localhost:5432/planning_poker
DB_HOST=postgres
DB_PORT=5432
DB_NAME=planning_poker
DB_USER=ppuser
DB_PASSWORD=pppass

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Auth
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# CORS
CLIENT_URL=http://localhost:5173
```

### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - planning-poker-net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - planning-poker-net
    restart: unless-stopped

  # Same postgres and redis configs but with restart policies
```

### Frontend Production Dockerfile
```dockerfile
# frontend/Dockerfile.prod
# Build stage
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration
```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Makefile for Common Commands
```makefile
# Makefile
.PHONY: up down build logs clean

# Start all services
up:
	docker-compose up -d

# Start with logs
up-logs:
	docker-compose up

# Stop all services
down:
	docker-compose down

# Build images
build:
	docker-compose build

# View logs
logs:
	docker-compose logs -f

# Clean everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Development database commands
db-migrate:
	docker-compose exec backend npm run migrate

db-seed:
	docker-compose exec backend npm run seed

db-reset:
	docker-compose exec postgres psql -U ppuser -d planning_poker -f /docker-entrypoint-initdb.d/01-init.sql

# Production build
prod-build:
	docker-compose -f docker-compose.prod.yml build

prod-up:
	docker-compose -f docker-compose.prod.yml up -d
```

## Implementation Steps
1. Create Docker configuration files
2. Set up development Dockerfiles
3. Configure docker-compose.yml
4. Create database initialization scripts
5. Set up volume mounts for hot reload
6. Configure networking
7. Add health checks
8. Create production configurations
9. Test complete setup

## Effort Estimate
**Story Points**: 5
**Time Estimate**: 4-6 hours

## Dependencies
- Docker and Docker Compose installed
- Basic project structure in place

## Testing Requirements
- All services start with `docker-compose up`
- Hot reloading works for both frontend and backend
- Database initializes with schema
- Services can communicate properly
- Health checks pass
- Debugging works in containers
- Production build completes successfully

## Definition of Done
- [ ] Docker Compose configuration complete
- [ ] All services start successfully
- [ ] Hot reloading functional
- [ ] Database initialized properly
- [ ] Health checks working
- [ ] Makefile with common commands
- [ ] Documentation updated
- [ ] Production config ready