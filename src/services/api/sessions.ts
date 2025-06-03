import { apiClient } from './client';
import { Session, CreateSessionDto, JoinSessionDto } from '../../types';

export const sessionApi = {
  create: async (data: CreateSessionDto) => {
    return apiClient.post<{
      session: Session;
      joinUrl: string;
      hostToken: string;
    }>('/sessions', data);
  },
  
  get: async (sessionId: string) => {
    return apiClient.get<Session>(`/sessions/${sessionId}`);
  },
  
  join: async (sessionId: string, data: JoinSessionDto) => {
    return apiClient.post<{
      player: {
        id: string;
        name: string;
        avatar: string;
        isSpectator: boolean;
        isActive: boolean;
        joinedAt: string;
        lastSeenAt: string;
      };
      token: string;
    }>(`/sessions/${sessionId}/join`, data);
  },
  
  update: async (sessionId: string, data: Partial<Session>) => {
    return apiClient.put<Session>(`/sessions/${sessionId}`, data);
  },
  
  delete: async (sessionId: string) => {
    return apiClient.delete(`/sessions/${sessionId}`);
  }
};