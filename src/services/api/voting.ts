import { apiClient } from './client';
import { Vote, VotingState, RevealResult, SubmitVoteDto, StoryData } from '../../types';

export const votingApi = {
  submitVote: async (sessionId: string, data: SubmitVoteDto) => {
    return apiClient.post<Vote>(`/sessions/${sessionId}/vote`, data);
  },
  
  getVotes: async (sessionId: string, storyId?: string) => {
    const params = storyId ? { storyId } : {};
    return apiClient.get<VotingState>(`/sessions/${sessionId}/votes`, { params });
  },
  
  revealCards: async (sessionId: string) => {
    return apiClient.post<RevealResult>(`/sessions/${sessionId}/reveal`);
  },
  
  resetGame: async (sessionId: string, newStory?: StoryData) => {
    return apiClient.post(`/sessions/${sessionId}/reset`, { newStory });
  }
};