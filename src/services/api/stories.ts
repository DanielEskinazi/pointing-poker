import { apiClient } from './client';
import type { Story, CreateStoryDto, UpdateStoryDto, ApiResponse } from '../../types';

export const storiesApi = {
  /**
   * Create a new story in a session
   */
  async createStory(sessionId: string, storyData: CreateStoryDto): Promise<Story> {
    const response = await apiClient.post<Story>(
      `/sessions/${sessionId}/stories`,
      storyData
    );
    console.log('Story API response:', response);
    
    // The response is ApiResponse<Story>, so we need to access data
    if (!response || !response.data) {
      throw new Error('Invalid response from story creation API');
    }
    
    return response.data;
  },

  /**
   * Get all stories for a session
   */
  async getStories(sessionId: string): Promise<Story[]> {
    const response = await apiClient.get<Story[]>(
      `/sessions/${sessionId}/stories`
    );
    return response.data;
  },

  /**
   * Update a story
   */
  async updateStory(storyId: string, updates: UpdateStoryDto): Promise<Story> {
    const response = await apiClient.put<Story>(
      `/stories/${storyId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete a story
   */
  async deleteStory(storyId: string): Promise<void> {
    await apiClient.delete(`/stories/${storyId}`);
  },

  /**
   * Set a story as active
   */
  async setActiveStory(sessionId: string, storyId: string): Promise<Story> {
    const response = await apiClient.put<Story>(
      `/sessions/${sessionId}/stories/${storyId}/activate`,
      {} // Empty body to satisfy Content-Type requirement
    );
    return response.data;
  },

  /**
   * Complete a story with final estimate
   */
  async completeStory(storyId: string, finalEstimate: string): Promise<Story> {
    const response = await apiClient.put<Story>(
      `/stories/${storyId}/complete`,
      { finalEstimate }
    );
    return response.data;
  }
};