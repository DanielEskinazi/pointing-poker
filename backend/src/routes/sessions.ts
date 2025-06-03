import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { validateRequest } from '../middleware/validation';
import { authenticate, authorizeHost } from '../middleware/auth';
import {
  CreateSessionSchema,
  GetSessionSchema,
  JoinSessionSchema,
  UpdateSessionSchema,
  DeleteSessionSchema
} from '../validation/session.schemas';

const router = Router();
const controller = new SessionController();

// Public routes

// POST /api/sessions - Create new session
router.post(
  '/',
  validateRequest(CreateSessionSchema),
  controller.create
);

// GET /api/sessions/:id - Get session details
router.get(
  '/:id',
  validateRequest(GetSessionSchema),
  controller.get
);

// POST /api/sessions/:id/join - Join session
router.post(
  '/:id/join',
  validateRequest(JoinSessionSchema),
  controller.join
);

// Protected routes (host only)

// PUT /api/sessions/:id - Update session settings
router.put(
  '/:id',
  authenticate,
  authorizeHost,
  validateRequest(UpdateSessionSchema),
  controller.update
);

// DELETE /api/sessions/:id - Delete session
router.delete(
  '/:id',
  authenticate,
  authorizeHost,
  validateRequest(DeleteSessionSchema),
  controller.delete
);

export default router;