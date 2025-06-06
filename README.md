# Planning Poker

A modern, full-stack Planning Poker application for agile software development teams to estimate story points through collaborative voting sessions. Features real-time synchronization, secure state persistence, and flexible deployment options.

## ✨ Features

### Core Functionality
- 🎯 **Session Management** - Create/join sessions with unique IDs and optional passwords
- 👥 **Multi-Player Support** - Player avatars, spectator mode, and host controls
- 📝 **Story Management** - Create, edit, and manage user stories for estimation
- 🃏 **Voting System** - Card-based estimation with customizable values
- ⚡ **Real-time Sync** - Live updates across all connected clients
- ⏱️ **Timer System** - Optional countdown timer for voting rounds
- 📊 **Results & Analytics** - Voting statistics and consensus detection

### Advanced Features
- 🔐 **Encrypted Storage** - Secure state persistence with Web Crypto API
- 📱 **Multi-tab Support** - Different players from the same browser
- 🌐 **Offline Resilience** - Graceful network disconnection handling
- 📱 **Mobile Responsive** - Optimized for all device sizes
- 🛡️ **Error Boundaries** - Comprehensive error handling and recovery
- 🔄 **Session Recovery** - Automatic restoration of interrupted sessions

## 🏗️ Architecture

### Hybrid Design
The application supports two deployment modes:

1. **Frontend-Only Mode**: React with Zustand (legacy client-side only mode)
2. **Full-Stack Mode**: React frontend + Node.js backend with PostgreSQL/Redis + WebSocket real-time communication

### Technology Stack

#### Frontend
- **React 18.3** with TypeScript 5.5
- **Vite 5.4** for fast builds and HMR
- **Tailwind CSS** for styling
- **Zustand 4.5** for state management
- **Framer Motion 11** for animations
- **React Query (TanStack)** for server state
- **Socket.io Client** for real-time communication

#### Backend
- **Node.js 20 LTS** with Express.js
- **TypeScript** for type safety
- **PostgreSQL 15** with Prisma ORM
- **Redis 7** for caching and pub/sub
- **Socket.io** for WebSocket connections
- **JWT** for authentication
- **Winston** for logging

## 🚀 Quick Start

### Prerequisites
- Node.js 20 LTS or higher
- Docker & Docker Compose (for full-stack mode)

### Frontend-Only Mode
```bash
# Clone the repository
git clone <repository-url>
cd planning-poker

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:5173 to use the application.

### Full-Stack Mode with Docker
```bash
# Copy environment configuration
cp .env.example .env

# Start all services
docker-compose up -d

# Or using Make
make up
```

**Available Services:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📂 Project Structure

```
planning-poker/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   │   ├── errors/        # Error boundary components
│   │   ├── forms/         # Form components
│   │   ├── loading/       # Loading state components
│   │   └── toast/         # Toast notification system
│   ├── hooks/             # Custom React hooks
│   │   └── api/           # API-specific hooks
│   ├── services/          # External service integrations
│   │   ├── api/           # HTTP API client
│   │   ├── persistence/   # Local storage management
│   │   ├── sync/          # State synchronization
│   │   └── websocket/     # WebSocket client
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript definitions
│   └── validation/        # Form validation schemas
├── backend/               # Node.js backend API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API route definitions
│   │   ├── websocket/     # WebSocket event handlers
│   │   ├── database/      # Database connection & models
│   │   ├── middleware/    # Express middleware
│   │   └── validation/    # Request validation schemas
│   ├── prisma/           # Database schema & migrations
│   └── tests/            # Backend test suites
├── specs/                # Technical specifications
├── docker-compose.yml    # Development services
└── Makefile             # Development commands
```

## 💻 Development

### Available Commands

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend
```bash
cd backend
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run test         # Run tests
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database
npm run db:reset     # Reset database
```

#### Docker Commands
```bash
make up             # Start all services
make down           # Stop all services
make logs           # View service logs
make clean          # Clean containers and volumes
make debug-up       # Start with debug tools (pgAdmin, Redis Commander)
make prod-build     # Build production images
make prod-up        # Start production services
```

### Debug Tools (Development)
When running `make debug-up`, additional tools are available:
- **pgAdmin**: http://localhost:8080 (PostgreSQL admin)
- **Redis Commander**: http://localhost:8081 (Redis admin)

## 🗄️ Database Schema

### Core Entities
- **Sessions**: Game sessions with configuration and metadata
- **Players**: Session participants with authentication
- **Stories**: User stories for estimation
- **Votes**: Player votes for specific stories

### Key Relationships
- Sessions → Players (1:many)
- Sessions → Stories (1:many)  
- Players → Votes (1:many)
- Stories → Votes (1:many)

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/planning_poker

# Redis  
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-secret-key

# CORS
CLIENT_URL=http://localhost:5173

# Server
PORT=3001
NODE_ENV=development
```

#### Frontend
```bash
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

## 🔒 Security Features

- **Encrypted Local Storage**: Uses Web Crypto API for client-side encryption
- **Session Expiry**: Automatic cleanup (48-hour TTL)
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: WebSocket connection rate limiting
- **CORS Protection**: Configurable origin restrictions

## 🏭 Production Deployment

### Docker Production
```bash
# Build production images
make prod-build

# Deploy production services  
make prod-up
```

### Production Features
- Multi-stage Docker builds for optimized images
- Nginx reverse proxy for static assets
- PostgreSQL with persistent volumes
- Redis cluster support
- Health checks and auto-restart policies
- Comprehensive logging and monitoring

## 🧪 Testing

- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest  
- **Integration**: Docker-based test environments
- **E2E**: Playwright automation (via MCP tools)

Run tests:
```bash
# Frontend tests
npm test

# Backend tests  
cd backend && npm test

# All tests
make test
```

## 🌐 Browser Compatibility

- **Modern browsers** with Web Crypto API support
- **Progressive enhancement** - graceful degradation without persistence
- **Mobile optimized** for iOS and Android
- **WebSocket fallback** for older browsers

## 📊 Current Status

✅ **Completed Features:**
- Core session and player management
- Real-time voting and synchronization  
- Story management with CRUD operations
- State persistence with encryption
- Multi-tab support
- Comprehensive error handling
- Docker containerization
- Production deployment configuration

🚧 **In Progress:**
- Advanced timer functionality
- Data export and statistics
- Mobile app optimization
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use ESLint configuration
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: Additional docs in `/specs` directory
- **Architecture**: See `/specs/technical-architecture.md`

---

Built with ❤️ for agile teams worldwide.