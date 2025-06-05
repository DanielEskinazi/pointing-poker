import { db } from '../database';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface CreateStoryData {
  sessionId: string;
  title: string;
  description?: string;
}

export interface UpdateStoryData {
  title?: string;
  description?: string;
  isActive?: boolean;
  finalEstimate?: string;
}

export interface Story {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  finalEstimate?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export class StoryService {
  private eventEmitter = new EventEmitter();

  async createStory(data: CreateStoryData): Promise<Story> {
    try {
      // Get next order index
      const nextIndex = await this.getNextStoryIndex(data.sessionId);

      // Deactivate any currently active story
      await this.deactivateCurrentStory(data.sessionId);

      // Create new story as active
      const story = await db.getPrisma().story.create({
        data: {
          sessionId: data.sessionId,
          title: data.title,
          description: data.description,
          orderIndex: nextIndex,
          isActive: true
        }
      });

      // Emit story created event
      this.eventEmitter.emit('story:created', {
        sessionId: data.sessionId,
        story
      });

      logger.info('Story created successfully', { storyId: story.id, sessionId: data.sessionId });

      return {
        ...story,
        isActive: story.isActive ?? true,
        createdAt: story.createdAt ?? new Date(),
        description: story.description || undefined,
        finalEstimate: story.finalEstimate || undefined,
        completedAt: story.completedAt || undefined
      };
    } catch (error) {
      logger.error('Failed to create story:', error);
      throw new Error('Failed to create story');
    }
  }

  async getSessionStories(sessionId: string): Promise<Story[]> {
    try {
      const stories = await db.getPrisma().story.findMany({
        where: { sessionId },
        orderBy: { orderIndex: 'asc' }
      });

      return stories.map(story => ({
        ...story,
        isActive: story.isActive ?? true,
        createdAt: story.createdAt ?? new Date(),
        description: story.description || undefined,
        finalEstimate: story.finalEstimate || undefined,
        completedAt: story.completedAt || undefined
      }));
    } catch (error) {
      logger.error('Failed to get session stories:', error);
      throw new Error('Failed to retrieve stories');
    }
  }

  async getCurrentStory(sessionId: string): Promise<Story | null> {
    try {
      const story = await db.getPrisma().story.findFirst({
        where: {
          sessionId,
          isActive: true
        },
        orderBy: {
          orderIndex: 'desc'
        }
      });

      return story ? {
        ...story,
        isActive: story.isActive ?? true,
        createdAt: story.createdAt ?? new Date(),
        description: story.description || undefined,
        finalEstimate: story.finalEstimate || undefined,
        completedAt: story.completedAt || undefined
      } : null;
    } catch (error) {
      logger.error('Failed to get current story:', error);
      throw new Error('Failed to retrieve current story');
    }
  }

  async updateStory(storyId: string, data: UpdateStoryData): Promise<Story> {
    try {
      const story = await db.getPrisma().story.update({
        where: { id: storyId },
        data: {
          ...data,
          ...(data.finalEstimate && !data.isActive && { completedAt: new Date() })
        }
      });

      // Emit story updated event
      this.eventEmitter.emit('story:updated', {
        sessionId: story.sessionId,
        story
      });

      logger.info('Story updated successfully', { storyId });

      return {
        ...story,
        isActive: story.isActive ?? true,
        createdAt: story.createdAt ?? new Date(),
        description: story.description || undefined,
        finalEstimate: story.finalEstimate || undefined,
        completedAt: story.completedAt || undefined
      };
    } catch (error) {
      logger.error('Failed to update story:', error);
      throw new Error('Failed to update story');
    }
  }

  async deleteStory(storyId: string): Promise<void> {
    try {
      // Check if story has any votes
      const voteCount = await db.getPrisma().vote.count({
        where: { storyId }
      });

      if (voteCount > 0) {
        throw new Error('Cannot delete story with existing votes');
      }

      const story = await db.getPrisma().story.findUnique({
        where: { id: storyId }
      });

      if (!story) {
        throw new Error('Story not found');
      }

      await db.getPrisma().story.delete({
        where: { id: storyId }
      });

      // Emit story deleted event
      this.eventEmitter.emit('story:deleted', {
        sessionId: story.sessionId,
        storyId
      });

      logger.info('Story deleted successfully', { storyId });
    } catch (error) {
      logger.error('Failed to delete story:', error);
      throw error;
    }
  }

  async setActiveStory(storyId: string): Promise<Story> {
    try {
      const story = await db.getPrisma().story.findUnique({
        where: { id: storyId }
      });

      if (!story) {
        throw new Error('Story not found');
      }

      // Get the currently active story before deactivating it
      const previousActiveStory = await db.getPrisma().story.findFirst({
        where: {
          sessionId: story.sessionId,
          isActive: true
        }
      });

      // Deactivate all other stories in session
      await this.deactivateCurrentStory(story.sessionId);

      // Activate the selected story
      const updatedStory = await db.getPrisma().story.update({
        where: { id: storyId },
        data: { isActive: true }
      });

      // Reset session cards revealed state
      await this.resetSessionCardsRevealed(story.sessionId);

      // Emit story activated event
      this.eventEmitter.emit('story:activated', {
        sessionId: story.sessionId,
        story: updatedStory,
        previousActiveStoryId: previousActiveStory?.id
      });

      logger.info('Story activated', { storyId, sessionId: story.sessionId, previousActiveStoryId: previousActiveStory?.id });

      return {
        ...updatedStory,
        isActive: updatedStory.isActive ?? true,
        createdAt: updatedStory.createdAt ?? new Date(),
        description: updatedStory.description || undefined,
        finalEstimate: updatedStory.finalEstimate || undefined,
        completedAt: updatedStory.completedAt || undefined
      };
    } catch (error) {
      logger.error('Failed to set active story:', error);
      throw error;
    }
  }

  private async deactivateCurrentStory(sessionId: string): Promise<void> {
    await db.getPrisma().story.updateMany({
      where: {
        sessionId,
        isActive: true
      },
      data: {
        isActive: false,
        completedAt: new Date()
      }
    });
  }

  private async getNextStoryIndex(sessionId: string): Promise<number> {
    const lastStory = await db.getPrisma().story.findFirst({
      where: { sessionId },
      orderBy: { orderIndex: 'desc' }
    });

    return lastStory ? lastStory.orderIndex + 1 : 1;
  }

  private async resetSessionCardsRevealed(sessionId: string): Promise<void> {
    const session = await db.getPrisma().session.findUnique({
      where: { id: sessionId }
    });

    if (session) {
      const updatedConfig = {
        ...session.config as any,
        cardsRevealed: false
      };

      await db.getPrisma().session.update({
        where: { id: sessionId },
        data: { config: updatedConfig }
      });
    }
  }

  // Expose event emitter for external listening
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}