import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../../services/api/sessions';
import { JoinSessionDto, ApiError } from '../../types';
import { authTokenManager } from '../../services/auth/tokenManager';
import { apiClient } from '../../services/api/client';

export const useSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.get(sessionId),
    enabled: !!sessionId,
    staleTime: 30000,
    gcTime: 300000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sessionApi.create,
    onSuccess: (data) => {
      const sessionId = data.data.session.id;
      
      queryClient.setQueryData(
        ['session', sessionId], 
        data.data.session
      );
      
      // Set session context
      apiClient.setSessionContext(sessionId);
      authTokenManager.setSessionContext(sessionId);
      
      // Store host token with tab specificity
      authTokenManager.setToken(data.data.hostToken, true);
    },
    onError: (error: ApiError) => {
      console.error('Session creation failed:', error.message);
    }
  });
};

export const useJoinSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, ...data }: JoinSessionDto & { sessionId: string }) => 
      sessionApi.join(sessionId, data),
    onSuccess: (data, variables) => {
      const sessionId = variables.sessionId;
      
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      
      // Set session context
      apiClient.setSessionContext(sessionId);
      authTokenManager.setSessionContext(sessionId);
      
      // Store player token with tab specificity (not a host)
      authTokenManager.setToken(data.data.token, false);
    },
    onError: (error: ApiError) => {
      console.error('Join session failed:', error.message);
    }
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, ...data }: { sessionId: string } & Partial<Parameters<typeof sessionApi.update>[1]>) =>
      sessionApi.update(sessionId, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['session', variables.sessionId], data.data);
    }
  });
};