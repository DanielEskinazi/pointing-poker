import { Router } from 'express';
import { StoryController } from '../controllers/story.controller';
import { validateRequest } from '../middleware/validation';
import { authenticate, authorizeHost } from '../middleware/auth';
import {
  UpdateStorySchema,
  DeleteStorySchema,
  CompleteStorySchema
} from '../validation/story.schemas';

const router = Router();
const controller = new StoryController();

// All story routes require authentication and host authorization

// PUT /api/stories/:storyId - Update story
router.put(
  '/:storyId',
  authenticate,
  authorizeHost,
  validateRequest(UpdateStorySchema),
  controller.updateStory
);

// DELETE /api/stories/:storyId - Delete story
router.delete(
  '/:storyId',
  authenticate,
  authorizeHost,
  validateRequest(DeleteStorySchema),
  controller.deleteStory
);

// PUT /api/stories/:storyId/complete - Complete story with final estimate
router.put(
  '/:storyId/complete',
  authenticate,
  authorizeHost,
  validateRequest(CompleteStorySchema),
  controller.completeStory
);

export default router;