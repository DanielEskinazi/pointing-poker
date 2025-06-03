# Technical Architecture - Planning Poker Application

## Overview

This document defines the target technical architecture for the Planning Poker application, covering both frontend and backend systems, infrastructure, and deployment strategies.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Client   │────▶│   API Gateway   │────▶│  Backend API    │
│   (Browser)     │     │  (WebSocket)    │     │   (Node.js)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                         │
                                │                         ▼
                                │                 ┌─────────────────┐
                                │                 │                 │
                                └────────────────▶│   PostgreSQL    │
                                                  │   + Redis       │
                                                  │                 │
                                                  └─────────────────┘
```

### Component Architecture

```
Frontend (React SPA)
├── Presentation Layer
│   ├── Pages (Route components)
│   ├── Components (Reusable UI)
│   └── Layouts (Page templates)
├── State Management
│   ├── Zustand Store
│   ├── React Query (Server state)
│   └── Context (UI state)
├── Service Layer
│   ├── API Client
│   ├── WebSocket Client
│   └── Local Storage
└── Infrastructure
    ├── Routing
    ├── Auth
    └── Error Handling

Backend (Node.js API)
├── API Layer
│   ├── REST Controllers
│   ├── WebSocket Handlers
│   └── GraphQL (future)
├── Business Logic
│   ├── Session Service
│   ├── Player Service
│   ├── Voting Service
│   └── Statistics Service
├── Data Access Layer
│   ├── Repositories
│   ├── Database Models
│   └── Cache Manager
└── Infrastructure
    ├── Authentication
    ├── Logging
    ├── Monitoring
    └── Queue System
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.4
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + CSS Modules
- **Animation**: Framer Motion
- **Testing**: Jest + React Testing Library + Playwright
- **Code Quality**: ESLint + Prettier + TypeScript

### Application Structure

```
src/
├── app/                    # Application core
│   ├── App.tsx
│   ├── Router.tsx
│   └── Providers.tsx
├── pages/                  # Route components
│   ├── Home/
│   ├── Game/
│   └── Statistics/
├── features/              # Feature modules
│   ├── session/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── voting/
│   └── player/
├── shared/                # Shared resources
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── constants/
├── services/              # External services
│   ├── api/
│   ├── websocket/
│   └── storage/
└── types/                 # Global types
```

### State Management Strategy

#### Server State (React Query)
```typescript
// src/services/api/sessions.ts
export const useSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId),
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSession,
    onSuccess: (data) => {
      queryClient.setQueryData(['session', data.id], data);
    },
  });
};
```

#### Client State (Zustand)
```typescript
// src/store/index.ts
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
}

const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  sidebarOpen: false,
  notifications: [],
  
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
}));
```

#### Real-time State (WebSocket)
```typescript
// src/services/websocket/client.ts
export class WebSocketClient {
  private socket: Socket;
  private reconnectAttempts = 0;
  
  connect(sessionId: string) {
    this.socket = io(WS_URL, {
      query: { sessionId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.socket.on('player:joined', this.handlePlayerJoined);
    this.socket.on('vote:submitted', this.handleVoteSubmitted);
    this.socket.on('cards:revealed', this.handleCardsRevealed);
  }
}
```

### Component Design Patterns

#### Container/Presenter Pattern
```typescript
// Container Component
const GameContainer = () => {
  const { sessionId } = useParams();
  const { data: session } = useSession(sessionId);
  const { submitVote } = useVoting();
  
  return (
    <GameBoard
      session={session}
      onVoteSubmit={submitVote}
    />
  );
};

// Presenter Component
const GameBoard = ({ session, onVoteSubmit }) => {
  // Pure presentation logic
};
```

#### Compound Components
```typescript
// src/components/Card/index.tsx
const Card = ({ children }) => { /* ... */ };
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

// Usage
<Card>
  <Card.Header>Story Title</Card.Header>
  <Card.Body>Story description...</Card.Body>
  <Card.Footer>
    <VoteButton />
  </Card.Footer>
</Card>
```

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js / Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL 15 + Redis 7
- **ORM**: Prisma / TypeORM
- **WebSocket**: Socket.io
- **Authentication**: JWT + OAuth2
- **Testing**: Jest + Supertest
- **Documentation**: OpenAPI 3.0

### API Design

#### RESTful Endpoints
```yaml
openapi: 3.0.0
paths:
  /api/v1/sessions:
    post:
      summary: Create new session
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSession'
      responses:
        201:
          description: Session created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Session'
                
  /api/v1/sessions/{sessionId}:
    get:
      summary: Get session details
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
```

#### WebSocket Events
```typescript
// src/websocket/events.ts
export enum ClientEvents {
  JOIN_SESSION = 'session:join',
  SUBMIT_VOTE = 'vote:submit',
  REVEAL_CARDS = 'cards:reveal',
  UPDATE_STORY = 'story:update',
}

export enum ServerEvents {
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  VOTE_SUBMITTED = 'vote:submitted',
  CARDS_REVEALED = 'cards:revealed',
  SESSION_UPDATED = 'session:updated',
}
```

### Database Design

#### Entity Relationship Diagram
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Session   │      │    Player    │      │    Vote     │
├─────────────┤      ├──────────────┤      ├─────────────┤
│ id (PK)     │◄─────│ id (PK)      │      │ id (PK)     │
│ name        │      │ session_id   │◄─────│ player_id   │
│ config      │      │ name         │      │ story_id    │
│ host_id     │      │ avatar       │      │ value       │
│ created_at  │      │ joined_at    │      │ created_at  │
└─────────────┘      └──────────────┘      └─────────────┘
       │                                           │
       │                                           ▼
       │                                    ┌─────────────┐
       └───────────────────────────────────▶│    Story    │
                                            ├─────────────┤
                                            │ id (PK)     │
                                            │ session_id  │
                                            │ title       │
                                            │ description │
                                            │ estimate    │
                                            └─────────────┘
```

#### Data Models
```typescript
// prisma/schema.prisma
model Session {
  id         String   @id @default(uuid())
  name       String
  config     Json
  hostId     String
  password   String?
  createdAt  DateTime @default(now())
  expiresAt  DateTime
  
  players    Player[]
  stories    Story[]
  
  @@index([createdAt])
}

model Player {
  id         String   @id @default(uuid())
  sessionId  String
  name       String
  avatar     String
  isActive   Boolean  @default(true)
  joinedAt   DateTime @default(now())
  
  session    Session  @relation(fields: [sessionId], references: [id])
  votes      Vote[]
  
  @@index([sessionId])
}
```

### Service Layer Architecture

```typescript
// src/services/SessionService.ts
export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private cache: CacheService,
    private events: EventEmitter
  ) {}
  
  async createSession(data: CreateSessionDto): Promise<Session> {
    const session = await this.sessionRepo.create({
      ...data,
      id: generateId(),
      expiresAt: addDays(new Date(), 2),
    });
    
    await this.cache.set(`session:${session.id}`, session);
    this.events.emit('session:created', session);
    
    return session;
  }
  
  async joinSession(sessionId: string, player: Player): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (session.password && !await this.verifyPassword(session, player.password)) {
      throw new UnauthorizedException('Invalid password');
    }
    
    await this.sessionRepo.addPlayer(sessionId, player);
    await this.cache.invalidate(`session:${sessionId}`);
    
    this.events.emit('player:joined', { sessionId, player });
  }
}
```

## Infrastructure

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CloudFlare                          │
│                      (CDN + DDoS Protection)                │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                    (AWS ALB / Nginx)                        │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
        ┌──────────────────┐     ┌──────────────────┐
        │   Web Server 1   │     │   Web Server 2   │
        │   (Node.js PM2)  │     │   (Node.js PM2)  │
        └──────────────────┘     └──────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌──────────────────┐     ┌──────────────────┐
        │   PostgreSQL     │     │      Redis       │
        │   (Primary)      │     │    (Cluster)     │
        └──────────────────┘     └──────────────────┘
                    │
                    ▼
        ┌──────────────────┐
        │   PostgreSQL     │
        │   (Replica)      │
        └──────────────────┘
```

### Container Strategy

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/planning_poker
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=planning_poker
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### Monitoring & Observability

#### Metrics Collection
```typescript
// src/monitoring/metrics.ts
import { register, Counter, Histogram } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

export const activeSessionsGauge = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of active sessions',
});

export const websocketConnections = new Gauge({
  name: 'websocket_connections_total',
  help: 'Number of active WebSocket connections',
});
```

#### Logging Strategy
```typescript
// src/logging/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
```

### Security Architecture

#### Authentication Flow
```
┌────────┐      ┌────────┐      ┌────────┐      ┌────────┐
│ Client │      │  API   │      │  Auth  │      │   DB   │
└───┬────┘      └───┬────┘      └───┬────┘      └───┬────┘
    │               │               │               │
    │  Login        │               │               │
    ├──────────────▶│               │               │
    │               │  Validate     │               │
    │               ├──────────────▶│               │
    │               │               │  Check User   │
    │               │               ├──────────────▶│
    │               │               │◄──────────────┤
    │               │  JWT Token    │               │
    │               │◄──────────────┤               │
    │  Token        │               │               │
    │◄──────────────┤               │               │
    │               │               │               │
    │  API Request  │               │               │
    ├──────────────▶│               │               │
    │               │  Verify Token │               │
    │               ├──────────────▶│               │
    │               │◄──────────────┤               │
    │  Response     │               │               │
    │◄──────────────┤               │               │
```

#### Security Headers
```typescript
// src/middleware/security.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Performance Optimization

#### Caching Strategy
```typescript
// src/cache/strategy.ts
export class CacheStrategy {
  // Cache Levels
  // L1: In-memory (Node.js process)
  // L2: Redis
  // L3: PostgreSQL
  
  async get(key: string): Promise<any> {
    // Check L1 cache
    const memoryCache = this.memory.get(key);
    if (memoryCache) return memoryCache;
    
    // Check L2 cache
    const redisCache = await this.redis.get(key);
    if (redisCache) {
      this.memory.set(key, redisCache);
      return redisCache;
    }
    
    // Fetch from database
    const data = await this.fetchFromDB(key);
    await this.set(key, data);
    return data;
  }
}
```

#### CDN Configuration
```javascript
// CDN paths for static assets
const CDN_URL = process.env.CDN_URL || 'https://cdn.planningpoker.app';

// Webpack configuration
module.exports = {
  output: {
    publicPath: CDN_URL,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  },
};
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Session affinity for WebSocket connections
- Redis pub/sub for cross-server communication
- Database read replicas for queries

### Vertical Scaling
- Connection pooling optimization
- Memory management for large sessions
- Efficient data structures
- Query optimization

### Auto-scaling Rules
```yaml
# AWS Auto Scaling Policy
scaling_policy:
  target_value: 70
  scale_up_threshold: 80
  scale_down_threshold: 50
  metrics:
    - CPU utilization
    - Memory usage
    - Request count
    - WebSocket connections
```

## Development Workflow

### Git Branching Strategy
```
main
├── develop
│   ├── feature/backend-setup
│   ├── feature/websocket-integration
│   └── feature/statistics-dashboard
├── release/v1.0.0
└── hotfix/session-bug
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: planningpoker:latest
      - run: kubectl apply -f k8s/
```

## Conclusion

This architecture provides a scalable, maintainable foundation for the Planning Poker application. It separates concerns appropriately, allows for independent scaling of components, and provides clear patterns for future development. The use of modern technologies and best practices ensures the application can grow with user needs while maintaining performance and reliability.