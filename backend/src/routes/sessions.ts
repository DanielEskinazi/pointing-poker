import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { StoryController } from '../controllers/story.controller';
import { validateRequest } from '../middleware/validation';
import { authenticate, authorizeHost } from '../middleware/auth';
import {
  CreateSessionSchema,
  GetSessionSchema,
  JoinSessionSchema,
  UpdateSessionSchema,
  DeleteSessionSchema
} from '../validation/session.schemas';
import {
  CreateStorySchema,
  GetSessionStoriesSchema,
  SetActiveStorySchema
} from '../validation/story.schemas';

const router = Router();
const controller = new SessionController();
const storyController = new StoryController();

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

// Story routes for sessions

// GET /api/sessions/:sessionId/stories - Get all stories for a session
router.get(
  '/:sessionId/stories',
  validateRequest(GetSessionStoriesSchema),
  storyController.getSessionStories
);

// POST /api/sessions/:sessionId/stories - Create a new story
router.post(
  '/:sessionId/stories',
  authenticate,
  authorizeHost,
  validateRequest(CreateStorySchema),
  storyController.createStory
);

// PUT /api/sessions/:sessionId/stories/:storyId/activate - Set story as active
router.put(
  '/:sessionId/stories/:storyId/activate',
  authenticate,
  authorizeHost,
  validateRequest(SetActiveStorySchema),
  storyController.setActiveStory
);

export default router;