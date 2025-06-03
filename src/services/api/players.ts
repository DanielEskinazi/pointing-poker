import { apiClient } from './client';
import { Player, UpdatePlayerDto } from '../../types';

export const playerApi = {
  getAll: async (sessionId: string) => {
    return apiClient.get<Player[]>(`/sessions/${sessionId}/players`);
  },
  
  update: async (playerId: string, data: UpdatePlayerDto) => {
    return apiClient.put<Player>(`/players/${playerId}`, data);
  },
  
  remove: async (playerId: string) => {
    return apiClient.delete(`/players/${playerId}`);
  }
};