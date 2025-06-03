import { Router } from 'express';
import { VotingController } from '../controllers/voting.controller';
import { authenticate, authorizeVoter, authorizeHost } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  SubmitVoteSchema,
  GetVotesSchema,
  RevealCardsSchema,
  ResetGameSchema
} from '../validation/voting.schemas';

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
  validateRequest(GetVotesSchema),
  controller.getVotes
);

// Game flow controls (host only)
router.post('/sessions/:sessionId/reveal',
  authenticate,
  authorizeHost,
  validateRequest(RevealCardsSchema),
  controller.revealCards
);

router.post('/sessions/:sessionId/reset',
  authenticate,
  authorizeHost,
  validateRequest(ResetGameSchema),
  controller.resetGame
);

export default router;