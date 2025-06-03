import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../../services/api/sessions';
import { JoinSessionDto, ApiError } from '../../types';

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
      queryClient.setQueryData(
        ['session', data.data.session.id], 
        data.data.session
      );
      
      localStorage.setItem('auth_token', data.data.hostToken);
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
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
      
      localStorage.setItem('auth_token', data.data.token);
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