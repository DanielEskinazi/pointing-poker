import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { statisticsCalculator } from '../services/statistics/calculator';
import type { RealTimeStats } from '../services/statistics/calculator';

export const useRealtimeStats = () => {
  const { voting, players, getCurrentStory } = useGameStore();
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  
  const currentStory = useMemo(() => getCurrentStory(), [getCurrentStory]);
  
  useEffect(() => {
    // Only calculate stats if we have a current story and votes
    if (!currentStory || Object.keys(voting.votes).length === 0) {
      setStats(null);
      return;
    }
    
    // Filter to active (non-spectator) players
    const activePlayers = players.filter(p => !p.isSpectator && p.isOnline !== false);
    const totalPlayers = activePlayers.length;
    
    try {
      const newStats = statisticsCalculator.calculateRealTimeStats(voting.votes, totalPlayers);
      setStats(newStats);
    } catch (error) {
      console.error('Error calculating real-time stats:', error);
      setStats(null);
    }
  }, [voting.votes, currentStory, players]);
  
  return stats;
};

// Hook for session-level statistics
export const useSessionStats = () => {
  const { sessionId, stories, players } = useGameStore();
  const [sessionStats, setSessionStats] = useState(null);
  
  useEffect(() => {
    if (!sessionId || stories.length === 0) {
      setSessionStats(null);
      return;
    }
    
    // This would typically fetch from an API endpoint
    // For now, we'll calculate basic stats from available data
    const completedStories = stories.filter(s => s.finalEstimate);
    
    const basicStats = {
      totalStories: stories.length,
      completedStories: completedStories.length,
      averagePoints: completedStories.length > 0 
        ? completedStories.reduce((sum, story) => {
            const estimate = parseFloat(story.finalEstimate || '0');
            return sum + (isNaN(estimate) ? 0 : estimate);
          }, 0) / completedStories.length
        : 0,
      totalPlayers: players.length,
      activePlayers: players.filter(p => !p.isSpectator).length
    };
    
    setSessionStats(basicStats);
  }, [sessionId, stories, players]);
  
  return sessionStats;
};

// Hook to determine if we should show real-time stats
export const useShouldShowStats = () => {
  const { voting, players } = useGameStore();
  
  return useMemo(() => {
    const hasVotes = Object.keys(voting.votes).length > 0;
    const hasActivePlayers = players.some(p => !p.isSpectator);
    
    return hasVotes && hasActivePlayers;
  }, [voting.votes, players]);
};