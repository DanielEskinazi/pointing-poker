# Story 4: Session Management API

## Summary
Implement RESTful API endpoints for session creation, retrieval, updating, and deletion with proper validation and error handling.

## Acceptance Criteria
- [ ] POST /api/sessions - Create new session
- [ ] GET /api/sessions/:id - Get session details
- [ ] PUT /api/sessions/:id - Update session settings
- [ ] DELETE /api/sessions/:id - Delete session
- [ ] POST /api/sessions/:id/join - Join session endpoint
- [ ] Request validation using middleware
- [ ] Proper error responses with status codes
- [ ] Session expiration logic implemented
- [ ] Host authorization for admin actions

## Technical Details

### API Routes Definition
```typescript
// src/routes/sessions.ts
import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { validateRequest } from '../middleware/validation';
import { authenticate, authorizeHost } from '../middleware/auth';

const router = Router();
const controller = new SessionController();

// Public routes
router.post('/sessions', 
  validateRequest(CreateSessionSchema),
  controller.create
);

router.get('/sessions/:id',
  validateRequest(GetSessionSchema),
  controller.get
);

router.post('/sessions/:id/join',
  validateRequest(JoinSessionSchema),
  controller.join
);

// Protected routes (host only)
router.put('/sessions/:id',
  authenticate,
  authorizeHost,
  validateRequest(UpdateSessionSchema),
  controller.update
);

router.delete('/sessions/:id',
  authenticate,
  authorizeHost,
  controller.delete
);

export default router;
```

### Validation Schemas
```typescript
// src/validation/session.schemas.ts
import { z } from 'zod';

export const CreateSessionSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    hostName: z.string().min(1).max(50),
    hostAvatar: z.string().emoji().optional(),
    password: z.string().min(4).max(50).optional(),
    config: z.object({
      cardValues: z.array(z.string()).min(2).max(20),
      allowSpectators: z.boolean().default(true),
      autoRevealCards: z.boolean().default(false),
      timerSeconds: z.number().min(0).max(3600).default(60)
    })
  })
});

export const JoinSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    playerName: z.string().min(1).max(50),
    avatar: z.string().emoji(),
    password: z.string().optional(),
    asSpectator: z.boolean().default(false)
  })
});

export const UpdateSessionSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    config: z.object({
      cardValues: z.array(z.string()).optional(),
      allowSpectators: z.boolean().optional(),
      autoRevealCards: z.boolean().optional(),
      timerSeconds: z.number().min(0).max(3600).optional()
    }).optional()
  })
});
```

### Session Controller
```typescript
// src/controllers/session.controller.ts
import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { ApiResponse } from '../types/api';

export class SessionController {
  private sessionService = new SessionService();

  create = async (req: Request, res: Response) => {
    try {
      const { name, hostName, hostAvatar, password, config } = req.body;
      
      // Create session with host as first player
      const session = await this.sessionService.createSession({
        name,
        password,
        config,
        host: {
          name: hostName,
          avatar: hostAvatar || '👤'
        }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          session,
          joinUrl: `${process.env.CLIENT_URL}/game/${session.id}`,
          hostToken: session.hostToken
        }
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const session = await this.sessionService.getSession(id);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Don't expose sensitive data
      const sanitizedSession = {
        ...session,
        password: undefined,
        hostToken: undefined
      };

      res.json({
        success: true,
        data: sanitizedSession
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  join = async (req: Request, res: Response) => {
    try {
      const { id: sessionId } = req.params;
      const { playerName, avatar, password, asSpectator } = req.body;

      const result = await this.sessionService.joinSession(sessionId, {
        name: playerName,
        avatar,
        password,
        isSpectator: asSpectator
      });

      if (!result.success) {
        return res.status(result.error?.code || 400).json({
          success: false,
          error: result.error?.message
        });
      }

      res.json({
        success: true,
        data: {
          playerId: result.player.id,
          sessionId,
          token: result.token
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: any, res: Response) {
    console.error('Session controller error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
```

### Session Service
```typescript
// src/services/session.service.ts
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { SessionRepository } from '../repositories/session.repository';
import { PlayerRepository } from '../repositories/player.repository';
import { generateToken } from '../utils/auth';

export class SessionService {
  constructor(
    private sessionRepo = new SessionRepository(),
    private playerRepo = new PlayerRepository()
  ) {}

  async createSession(data: CreateSessionDto) {
    const sessionId = uuidv4();
    const hostId = uuidv4();
    
    // Hash password if provided
    const passwordHash = data.password 
      ? await bcrypt.hash(data.password, 10)
      : null;

    // Create session
    const session = await this.sessionRepo.create({
      id: sessionId,
      name: data.name,
      passwordHash,
      hostId,
      config: data.config,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    });

    // Add host as first player
    const host = await this.playerRepo.create({
      id: hostId,
      sessionId,
      name: data.host.name,
      avatar: data.host.avatar,
      isSpectator: false
    });

    // Generate host token
    const hostToken = generateToken({
      sessionId,
      playerId: hostId,
      isHost: true
    });

    return {
      ...session,
      players: [host],
      hostToken
    };
  }

  async getSession(sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    
    if (!session) return null;
    
    // Check if expired
    if (new Date() > session.expiresAt) {
      await this.sessionRepo.delete(sessionId);
      return null;
    }

    // Get active players
    const players = await this.playerRepo.findBySession(sessionId);
    
    return {
      ...session,
      players: players.filter(p => p.isActive),
      playerCount: players.length
    };
  }

  async joinSession(sessionId: string, data: JoinSessionDto) {
    const session = await this.sessionRepo.findById(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: { code: 404, message: 'Session not found' }
      };
    }

    // Verify password if required
    if (session.passwordHash && data.password) {
      const valid = await bcrypt.compare(data.password, session.passwordHash);
      if (!valid) {
        return {
          success: false,
          error: { code: 401, message: 'Invalid password' }
        };
      }
    }

    // Check if name already taken
    const existingPlayer = await this.playerRepo.findByName(
      sessionId, 
      data.name
    );
    
    if (existingPlayer && existingPlayer.isActive) {
      return {
        success: false,
        error: { code: 409, message: 'Name already taken' }
      };
    }

    // Create or reactivate player
    const player = existingPlayer 
      ? await this.playerRepo.reactivate(existingPlayer.id)
      : await this.playerRepo.create({
          sessionId,
          name: data.name,
          avatar: data.avatar,
          isSpectator: data.isSpectator
        });

    // Generate player token
    const token = generateToken({
      sessionId,
      playerId: player.id,
      isHost: false
    });

    return {
      success: true,
      player,
      token
    };
  }
}
```

### Repository Pattern
```typescript
// src/repositories/session.repository.ts
import { Pool } from 'pg';

export class SessionRepository {
  constructor(private db: Pool) {}

  async create(data: CreateSessionData) {
    const query = `
      INSERT INTO sessions (
        id, name, password_hash, host_id, config, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      data.id,
      data.name,
      data.passwordHash,
      data.hostId,
      JSON.stringify(data.config),
      data.expiresAt
    ];

    const result = await this.db.query(query, values);
    return this.mapToSession(result.rows[0]);
  }

  async findById(id: string) {
    const query = 'SELECT * FROM sessions WHERE id = $1 AND is_active = true';
    const result = await this.db.query(query, [id]);
    
    return result.rows[0] ? this.mapToSession(result.rows[0]) : null;
  }

  private mapToSession(row: any) {
    return {
      id: row.id,
      name: row.name,
      passwordHash: row.password_hash,
      hostId: row.host_id,
      config: row.config,
      isActive: row.is_active,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }
}
```

## Implementation Steps
1. Create route definitions
2. Implement validation schemas
3. Build session controller
4. Create session service
5. Implement repositories
6. Add authentication middleware
7. Write integration tests
8. Test all endpoints
9. Document API

## Effort Estimate
**Story Points**: 8
**Time Estimate**: 8-10 hours

## Dependencies
- Story 1: Backend API Setup
- Story 2: Database Setup

## Testing Requirements
- All endpoints return correct status codes
- Validation rejects invalid data
- Session creation generates unique IDs
- Password protection works
- Host authorization enforced
- Expired sessions cleaned up
- Join endpoint handles edge cases

## Definition of Done
- [ ] All endpoints implemented
- [ ] Validation schemas complete
- [ ] Error handling consistent
- [ ] Integration tests passing
- [ ] API documented
- [ ] Performance acceptable
- [ ] Security review complete