import { Request, Response } from 'express';
import { StoryService } from '../services/story.service';
import { ApiResponse } from '../types/api';
import { logger } from '../utils/logger';

export class StoryController {
  private storyService = StoryService.getInstance();

  createStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { title, description } = req.body;

      const story = await this.storyService.createStory({
        sessionId,
        title,
        description
      });

      const response: ApiResponse = {
        success: true,
        data: story
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to create story');
    }
  };

  getSessionStories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const stories = await this.storyService.getSessionStories(sessionId);

      const response: ApiResponse = {
        success: true,
        data: stories
      };

      res.json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to get stories');
    }
  };

  getCurrentStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const story = await this.storyService.getCurrentStory(sessionId);

      const response: ApiResponse = {
        success: true,
        data: story
      };

      res.json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to get current story');
    }
  };

  updateStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storyId } = req.params;
      const updateData = req.body;

      const story = await this.storyService.updateStory(storyId, updateData);

      const response: ApiResponse = {
        success: true,
        data: story
      };

      res.json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to update story');
    }
  };

  deleteStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storyId } = req.params;
      await this.storyService.deleteStory(storyId);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Story deleted successfully' }
      };

      res.json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to delete story');
    }
  };

  setActiveStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storyId } = req.params;
      const story = await this.storyService.setActiveStory(storyId);

      const response: ApiResponse = {
        success: true,
        data: story
      };

      res.json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to set active story');
    }
  };

  completeStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storyId } = req.params;
      const { finalEstimate } = req.body;

      const story = await this.storyService.updateStory(storyId, {
        finalEstimate,
        isActive: false
      });

      const response: ApiResponse = {
        success: true,
        data: story
      };

      res.json(response);
    } catch (error) {
      this.handleError(error as Error, res, 'Failed to complete story');
    }
  };

  private handleError(error: Error, res: Response, defaultMessage: string): void {
    logger.error(defaultMessage, { error: error.message, stack: error.stack });

    if (error.message === 'Story not found') {
      res.status(404).json({
        success: false,
        error: 'Story not found'
      });
      return;
    }

    if (error.message === 'Cannot delete story with existing votes') {
      res.status(400).json({
        success: false,
        error: 'Cannot delete story that has votes'
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: (error as any).details
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: defaultMessage
    });
  }
}