import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useGameStore } from '../store';

export function usePlayerManagement() {
  const { client } = useWebSocket();
  const { players } = useGameStore();

  const removePlayer = useCallback((playerId: string) => {
    if (client?.isSocketConnected()) {
      client.removePlayer(playerId);
    }
  }, [client]);

  const promotePlayer = useCallback((playerId: string) => {
    if (client?.isSocketConnected()) {
      client.promotePlayer(playerId);
    }
  }, [client]);

  const toggleSpectator = useCallback(async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Use the API to update spectator status
    try {
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isSpectator: !player.isSpectator
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update player');
      }

      // The WebSocket will handle the update broadcast
    } catch (error) {
      console.error('Error toggling spectator status:', error);
    }
  }, [players]);

  const getCurrentPlayer = useCallback(() => {
    return players.find(p => p.id === localStorage.getItem('playerId'));
  }, [players]);

  const isCurrentUserHost = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    return currentPlayer?.isHost || false;
  }, [getCurrentPlayer]);

  const getOnlinePlayerCount = useCallback(() => {
    return players.filter(p => p.isOnline).length;
  }, [players]);

  const getVotingPlayerCount = useCallback(() => {
    return players.filter(p => !p.isSpectator).length;
  }, [players]);

  const getSpectatorCount = useCallback(() => {
    return players.filter(p => p.isSpectator).length;
  }, [players]);

  return {
    removePlayer,
    promotePlayer,
    toggleSpectator,
    getCurrentPlayer,
    isCurrentUserHost,
    getOnlinePlayerCount,
    getVotingPlayerCount,
    getSpectatorCount,
    players
  };
}