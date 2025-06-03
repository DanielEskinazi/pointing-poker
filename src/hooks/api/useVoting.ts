import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { votingApi } from '../../services/api/voting';
import { SubmitVoteDto, StoryData, ApiError } from '../../types';

export const useVotes = (sessionId: string, storyId?: string) => {
  return useQuery({
    queryKey: ['votes', sessionId, storyId],
    queryFn: () => votingApi.getVotes(sessionId, storyId),
    enabled: !!sessionId,
    staleTime: 10000,
    gcTime: 60000
  });
};

export const useSubmitVote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, ...data }: SubmitVoteDto & { sessionId: string }) =>
      votingApi.submitVote(sessionId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['votes', variables.sessionId] 
      });
    },
    onError: (error: ApiError) => {
      console.error('Vote submission failed:', error.message);
    }
  });
};

export const useRevealCards = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: votingApi.revealCards,
    onSuccess: (data, sessionId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['votes', sessionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['session', sessionId] 
      });
    }
  });
};

export const useResetGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, newStory }: { sessionId: string; newStory?: StoryData }) =>
      votingApi.resetGame(sessionId, newStory),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['votes', variables.sessionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['session', variables.sessionId] 
      });
    }
  });
};