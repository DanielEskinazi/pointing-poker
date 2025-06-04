import { client } from './client';
import type { Story, CreateStoryDto, UpdateStoryDto, ApiResponse } from '../../types';

export const storiesApi = {
  /**
   * Create a new story in a session
   */
  async createStory(sessionId: string, storyData: CreateStoryDto): Promise<Story> {
    const response = await client.post<ApiResponse<Story>>(
      `/sessions/${sessionId}/stories`,
      storyData
    );
    return response.data.data;
  },

  /**
   * Get all stories for a session
   */
  async getStories(sessionId: string): Promise<Story[]> {
    const response = await client.get<ApiResponse<Story[]>>(
      `/sessions/${sessionId}/stories`
    );
    return response.data.data;
  },

  /**
   * Update a story
   */
  async updateStory(storyId: string, updates: UpdateStoryDto): Promise<Story> {
    const response = await client.put<ApiResponse<Story>>(
      `/stories/${storyId}`,
      updates
    );
    return response.data.data;
  },

  /**
   * Delete a story
   */
  async deleteStory(storyId: string): Promise<void> {
    await client.delete(`/stories/${storyId}`);
  },

  /**
   * Set a story as active
   */
  async setActiveStory(sessionId: string, storyId: string): Promise<Story> {
    const response = await client.put<ApiResponse<Story>>(
      `/sessions/${sessionId}/stories/${storyId}/activate`
    );
    return response.data.data;
  },

  /**
   * Complete a story with final estimate
   */
  async completeStory(storyId: string, finalEstimate: string): Promise<Story> {
    const response = await client.put<ApiResponse<Story>>(
      `/stories/${storyId}/complete`,
      { finalEstimate }
    );
    return response.data.data;
  }
};