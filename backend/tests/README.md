# Backend Test Suite

This directory contains comprehensive tests for the Planning Poker Backend API, with focus on the Player and Voting endpoints implemented in phase 1.

## Test Structure

```
tests/
├── setup.ts                   # Global test setup and teardown
├── utils/
│   ├── test-helpers.ts        # Test data factory and utilities
│   └── mock-database.ts       # Database mocking utilities
├── services/
│   ├── player.service.test.ts # Unit tests for PlayerService
│   └── voting.service.test.ts # Unit tests for VotingService
├── routes/
│   ├── players.test.ts        # Integration tests for player endpoints
│   └── voting.test.ts         # Integration tests for voting endpoints
├── middleware/
│   └── auth.test.ts           # Authentication middleware tests
└── validation/
    └── voting.schemas.test.ts # Validation schema tests
```

## Test Coverage

### ✅ **Player Endpoints**
- `GET /api/sessions/:id/players` - List session players
- `PUT /api/players/:id` - Update player details
- `DELETE /api/players/:id` - Remove player (host only)

### ✅ **Voting Endpoints**
- `POST /api/sessions/:id/vote` - Submit/update vote
- `GET /api/sessions/:id/votes` - Get voting state
- `POST /api/sessions/:id/reveal` - Reveal cards (host only)
- `POST /api/sessions/:id/reset` - Start new round (host only)

### ✅ **Authentication & Authorization**
- JWT token validation
- Host authorization for admin actions
- Voter authorization (non-spectators only)
- Player self-modification authorization

### ✅ **Business Logic**
- Vote consensus calculation
- Statistics computation (min, max, median, std dev)
- Spectator restrictions
- Name conflict handling
- Story lifecycle management

### ✅ **Validation**
- Request schema validation
- Card value restrictions
- Confidence level ranges
- UUID format validation
- Field length limits

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/validation/voting.schemas.test.ts

# Run tests for specific endpoint
npm test -- --testNamePattern="Voting Routes"
```

## Test Data Factory

The `TestDataFactory` provides convenient methods for creating test data:

```typescript
// Create session with host
const { session, host, hostToken } = await TestDataFactory.createHostSession();

// Create regular player
const { player, playerToken } = await TestDataFactory.createPlayerSession();

// Create spectator
const { spectator, spectatorToken } = await TestDataFactory.createSpectatorSession();

// Create story and votes
const story = await TestDataFactory.createTestStory(sessionId);
await TestDataFactory.createTestVote(storyId, playerId, sessionId, '5');
```

## Database Setup

Tests use the actual database connection but clean up after each test:

- **Before All**: Initialize database connection
- **After Each**: Clean all test data (votes → stories → players → sessions)
- **After All**: Close database connections

## Key Test Scenarios

### Authentication Flow
- Valid/invalid JWT tokens
- Session/player existence validation
- Host vs player vs spectator permissions

### Voting Flow
- Submit → Hide values → Reveal → Calculate consensus → Reset
- Spectator vote rejection
- Vote updates and validation
- Consensus calculation accuracy

### Player Management
- Name uniqueness within sessions
- Host protection from removal
- Player self-modification only
- Active/inactive player handling

### Error Handling
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Business logic errors (409)

## Coverage Goals

Current test suite achieves:
- **100% endpoint coverage** for new player/voting APIs
- **Comprehensive validation** of all input schemas
- **Authentication/authorization** testing for all protected routes
- **Business logic testing** for consensus and statistics
- **Error case coverage** for common failure scenarios

## Running Specific Test Types

```bash
# Unit tests only
npm test -- tests/services/

# Integration tests only  
npm test -- tests/routes/

# Validation tests only
npm test -- tests/validation/

# Middleware tests only
npm test -- tests/middleware/
```