import { Router } from 'express';
import { VotingController } from '../controllers/voting.controller';
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
  validateRequest(SubmitVoteSchema),
  controller.submitVote
);

// Get current voting state
router.get('/sessions/:sessionId/votes',
  validateRequest(GetVotesSchema),
  controller.getVotes
);

// Game flow controls (host only)
router.post('/sessions/:sessionId/reveal',
  validateRequest(RevealCardsSchema),
  controller.revealCards
);

router.post('/sessions/:sessionId/reset',
  validateRequest(ResetGameSchema),
  controller.resetGame
);

export default router;