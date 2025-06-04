import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';
import { authenticate, authorizePlayer } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  GetSessionPlayersSchema,
  UpdatePlayerSchema,
  RemovePlayerSchema
} from '../validation/voting.schemas';

const router = Router();
const controller = new PlayerController();

// Get all players in session
router.get('/sessions/:sessionId/players',
  validateRequest(GetSessionPlayersSchema),
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
  validateRequest(RemovePlayerSchema),
  controller.remove
);

// Promote player to host (host only)
router.post('/players/:id/promote',
  authenticate,
  controller.promote
);

// Update player activity heartbeat
router.put('/players/:id/activity',
  authenticate,
  controller.updateActivity
);

export default router;