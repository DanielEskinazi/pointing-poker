# Story 5: Player and Voting API

## Summary
Implement API endpoints for player management and voting functionality, including vote submission, retrieval, and game flow control.

## Acceptance Criteria
- [ ] GET /api/sessions/:id/players - List all players
- [ ] PUT /api/players/:id - Update player details
- [ ] DELETE /api/players/:id - Remove player (host only)
- [ ] POST /api/sessions/:id/vote - Submit vote
- [ ] GET /api/sessions/:id/votes - Get current votes
- [ ] POST /api/sessions/:id/reveal - Reveal all cards
- [ ] POST /api/sessions/:id/reset - Start new round
- [ ] Vote state properly tracked and validated
- [ ] Spectators cannot vote

## Technical Details

### Player Routes
```typescript
// src/routes/players.ts
import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';
import { authenticate, authorizePlayer } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const controller = new PlayerController();

// Get all players in session
router.get('/sessions/:sessionId/players',
  controller.getSessionPlayers
);

// Update own player details
router.put('/players/:id',
  authenticate,
  authorizePlayer,
  validateRequest(UpdatePlayerSchema),
  controller.update
);

// Remove player (host only)
router.delete('/players/:id',
  authenticate,
  authorizeHost,
  controller.remove
);

export default router;
```

### Voting Routes
```typescript
// src/routes/voting.ts
import { Router } from 'express';
import { VotingController } from '../controllers/voting.controller';
import { authenticate, authorizeVoter } from '../middleware/auth';

const router = Router();
const controller = new VotingController();

// Submit or update vote
router.post('/sessions/:sessionId/vote',
  authenticate,
  authorizeVoter, // Checks if not spectator
  validateRequest(SubmitVoteSchema),
  controller.submitVote
);

// Get current voting state
router.get('/sessions/:sessionId/votes',
  authenticate,
  controller.getVotes
);

// Game flow controls (host only)
router.post('/sessions/:sessionId/reveal',
  authenticate,
  authorizeHost,
  controller.revealCards
);

router.post('/sessions/:sessionId/reset',
  authenticate,
  authorizeHost,
  controller.resetGame
);

export default router;
```

### Player Controller
```typescript
// src/controllers/player.controller.ts
export class PlayerController {
  private playerService = new PlayerService();

  getSessionPlayers = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      const players = await this.playerService.getSessionPlayers(sessionId);
      
      res.json({
        success: true,
        data: players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isSpectator: p.isSpectator,
          isActive: p.isActive,
          hasVoted: p.currentVote !== null,
          lastSeenAt: p.lastSeenAt
        }))
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, avatar, isSpectator } = req.body;
      
      // Verify player owns this ID
      if (req.user.playerId !== id) {
        return res.status(403).json({
          success: false,
          error: 'Cannot update other players'
        });
      }

      const updated = await this.playerService.updatePlayer(id, {
        name,
        avatar,
        isSpectator
      });

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await this.playerService.removePlayer(id);
      
      res.json({
        success: true,
        message: 'Player removed'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
```

### Voting Controller
```typescript
// src/controllers/voting.controller.ts
export class VotingController {
  private votingService = new VotingService();

  submitVote = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { storyId, value, confidence } = req.body;
      const { playerId } = req.user;

      const result = await this.votingService.submitVote({
        sessionId,
        storyId,
        playerId,
        value,
        confidence
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          voteId: result.voteId,
          timestamp: result.timestamp
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  getVotes = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { storyId } = req.query;

      const votes = await this.votingService.getVotes(
        sessionId,
        storyId as string
      );

      // Hide vote values if not revealed
      const session = await this.sessionService.getSession(sessionId);
      const sanitizedVotes = votes.map(v => ({
        playerId: v.playerId,
        playerName: v.playerName,
        hasVoted: true,
        value: session.cardsRevealed ? v.value : null,
        confidence: session.cardsRevealed ? v.confidence : null,
        timestamp: v.timestamp
      }));

      res.json({
        success: true,
        data: {
          votes: sanitizedVotes,
          revealed: session.cardsRevealed,
          consensus: session.cardsRevealed 
            ? this.votingService.calculateConsensus(votes)
            : null
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  revealCards = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      const result = await this.votingService.revealCards(sessionId);
      
      res.json({
        success: true,
        data: {
          votes: result.votes,
          consensus: result.consensus,
          statistics: result.statistics
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  resetGame = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { newStory } = req.body;

      await this.votingService.resetRound(sessionId, newStory);

      res.json({
        success: true,
        message: 'New round started'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
```

### Voting Service
```typescript
// src/services/voting.service.ts
export class VotingService {
  constructor(
    private voteRepo = new VoteRepository(),
    private storyRepo = new StoryRepository(),
    private eventEmitter = new EventEmitter()
  ) {}

  async submitVote(data: SubmitVoteDto) {
    // Validate story exists and is active
    const story = await this.storyRepo.findById(data.storyId);
    if (!story || !story.isActive) {
      return {
        success: false,
        error: 'Invalid or completed story'
      };
    }

    // Check if cards already revealed
    const session = await this.sessionRepo.findById(data.sessionId);
    if (session.cardsRevealed) {
      return {
        success: false,
        error: 'Voting closed - cards already revealed'
      };
    }

    // Create or update vote
    const vote = await this.voteRepo.upsert({
      storyId: data.storyId,
      playerId: data.playerId,
      sessionId: data.sessionId,
      value: data.value,
      confidence: data.confidence
    });

    // Emit vote event
    this.eventEmitter.emit('vote:submitted', {
      sessionId: data.sessionId,
      playerId: data.playerId,
      storyId: data.storyId
    });

    return {
      success: true,
      voteId: vote.id,
      timestamp: vote.createdAt
    };
  }

  async getVotes(sessionId: string, storyId?: string) {
    const currentStory = storyId || 
      await this.storyRepo.getCurrentStory(sessionId);
    
    if (!currentStory) return [];

    return this.voteRepo.findByStory(currentStory);
  }

  async revealCards(sessionId: string) {
    // Get current story votes
    const currentStory = await this.storyRepo.getCurrentStory(sessionId);
    const votes = await this.voteRepo.findByStory(currentStory.id);

    // Update session state
    await this.sessionRepo.update(sessionId, {
      cardsRevealed: true
    });

    // Calculate consensus
    const consensus = this.calculateConsensus(votes);
    const statistics = this.calculateStatistics(votes);

    // Update story with final estimate
    if (consensus.agreement > 0.8) {
      await this.storyRepo.update(currentStory.id, {
        finalEstimate: consensus.value
      });
    }

    // Emit reveal event
    this.eventEmitter.emit('cards:revealed', {
      sessionId,
      votes,
      consensus,
      statistics
    });

    return { votes, consensus, statistics };
  }

  async resetRound(sessionId: string, newStory?: StoryData) {
    // Mark current story as completed
    const currentStory = await this.storyRepo.getCurrentStory(sessionId);
    if (currentStory) {
      await this.storyRepo.update(currentStory.id, {
        isActive: false,
        completedAt: new Date()
      });
    }

    // Create new story if provided
    if (newStory) {
      await this.storyRepo.create({
        sessionId,
        title: newStory.title,
        description: newStory.description,
        orderIndex: await this.storyRepo.getNextIndex(sessionId)
      });
    }

    // Reset session state
    await this.sessionRepo.update(sessionId, {
      cardsRevealed: false
    });

    // Clear active votes from cache
    await this.cache.del(`votes:${sessionId}:active`);

    // Emit reset event
    this.eventEmitter.emit('game:reset', { sessionId });
  }

  calculateConsensus(votes: Vote[]) {
    if (!votes.length) return null;

    // Group votes by value
    const groups = votes.reduce((acc, vote) => {
      acc[vote.value] = (acc[vote.value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most common value
    const sorted = Object.entries(groups)
      .sort(([,a], [,b]) => b - a);
    
    const [mostCommon, count] = sorted[0];
    const agreement = count / votes.length;

    // Calculate average for numeric values
    const numericVotes = votes
      .filter(v => !isNaN(Number(v.value)))
      .map(v => Number(v.value));
    
    const average = numericVotes.length
      ? numericVotes.reduce((a, b) => a + b) / numericVotes.length
      : null;

    return {
      value: mostCommon,
      agreement,
      average,
      distribution: groups,
      totalVotes: votes.length
    };
  }

  calculateStatistics(votes: Vote[]) {
    const values = votes
      .filter(v => !isNaN(Number(v.value)))
      .map(v => Number(v.value))
      .sort((a, b) => a - b);

    if (!values.length) return null;

    return {
      min: values[0],
      max: values[values.length - 1],
      median: values[Math.floor(values.length / 2)],
      standardDeviation: this.calculateStdDev(values),
      confidenceAverage: votes
        .filter(v => v.confidence)
        .reduce((sum, v) => sum + v.confidence, 0) / votes.length
    };
  }
}
```

### Validation Schemas
```typescript
// src/validation/voting.schemas.ts
export const SubmitVoteSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid()
  }),
  body: z.object({
    storyId: z.string().uuid(),
    value: z.string().min(1).max(10),
    confidence: z.number().min(1).max(5).optional()
  })
});

export const UpdatePlayerSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    avatar: z.string().emoji().optional(),
    isSpectator: z.boolean().optional()
  })
});
```

## Implementation Steps
1. Create player routes and controller
2. Create voting routes and controller
3. Implement player service
4. Implement voting service
5. Add validation schemas
6. Create consensus calculation
7. Add statistics calculation
8. Write tests for all endpoints
9. Test voting flow end-to-end

## Effort Estimate
**Story Points**: 13
**Time Estimate**: 10-12 hours

## Dependencies
- Story 1: Backend API Setup
- Story 2: Database Setup
- Story 4: Session Management API

## Testing Requirements
- Vote submission validates input
- Spectators cannot vote
- Votes hidden until reveal
- Consensus calculation accurate
- Statistics calculated correctly
- Reset clears appropriate state
- Host-only endpoints protected

## Definition of Done
- [ ] All endpoints implemented
- [ ] Validation complete
- [ ] Business logic tested
- [ ] Consensus algorithm working
- [ ] WebSocket events emitted
- [ ] Integration tests passing
- [ ] API documentation updated