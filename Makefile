.PHONY: up down build logs clean db-migrate db-seed db-reset prod-build prod-up help

# Default target
help:
	@echo "Available commands:"
	@echo "  make up          - Start all services in development mode"
	@echo "  make up-logs     - Start all services with logs"
	@echo "  make down        - Stop all services"
	@echo "  make build       - Build/rebuild all images"
	@echo "  make logs        - View logs from all services"
	@echo "  make clean       - Stop services and remove volumes"
	@echo "  make db-migrate  - Run database migrations"
	@echo "  make db-seed     - Seed the database"
	@echo "  make db-reset    - Reset the database"
	@echo "  make prod-build  - Build production images"
	@echo "  make prod-up     - Start production services"

# Start all services
up:
	docker-compose up -d

# Start with logs
up-logs:
	docker-compose up

# Stop all services
down:
	docker-compose down

# Build/rebuild images
build:
	docker-compose build

# View logs
logs:
	docker-compose logs -f

# Clean everything (including volumes)
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Development database commands
db-migrate:
	docker-compose exec backend npm run db:migrate

db-seed:
	docker-compose exec backend npm run db:seed

db-reset:
	docker-compose exec postgres psql -U ppuser -d planning_poker -f /docker-entrypoint-initdb.d/01-init.sql
	docker-compose exec postgres psql -U ppuser -d planning_poker -f /docker-entrypoint-initdb.d/02-seed.sql

# Production commands
prod-build:
	docker-compose -f docker-compose.prod.yml build

prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

# Debug services (pgAdmin and Redis Commander)
debug-up:
	docker-compose --profile debug up -d

# Individual service commands
backend-logs:
	docker-compose logs -f backend

frontend-logs:
	docker-compose logs -f frontend

postgres-logs:
	docker-compose logs -f postgres

redis-logs:
	docker-compose logs -f redis

# Shell access
backend-shell:
	docker-compose exec backend sh

frontend-shell:
	docker-compose exec frontend sh

postgres-shell:
	docker-compose exec postgres psql -U ppuser -d planning_poker

redis-shell:
	docker-compose exec redis redis-cli