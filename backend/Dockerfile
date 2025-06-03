# Backend Development Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install development tools
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Build TypeScript
RUN npm run build

# Expose ports
EXPOSE 3001 9229

# Start with debugging enabled
CMD ["npm", "run", "dev:debug"]