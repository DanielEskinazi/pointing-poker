import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';
import { authenticate, authorizePlayer, authorizeHost } from '../middleware/auth';
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
  authorizeHost,
  validateRequest(RemovePlayerSchema),
  controller.remove
);

export default router;